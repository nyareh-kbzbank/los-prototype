import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
	type LoanApplicationStatus,
	useLoanApplicationStore,
} from "@/lib/loan-application-store";
import {
	type DisbursementDestinationType,
	getLoanSetupList,
	type LoanWorkflowSnapshot,
	useLoanSetupStore,
} from "@/lib/loan-setup-store";
import { evaluateScoreCard, type RiskGrade } from "@/lib/scorecard-engine";
import { useScoreCardStore } from "@/lib/scorecard-store";

export const Route = createFileRoute("/loan/applications/create")({
	component: LoanApplicationCreate,
});

type DocumentUploadField = {
	documentTypeId: string;
	isMandatory: boolean;
};

type OtherDocumentUpload = {
	id: string;
	file: File | null;
};

type Token =
	| { type: "number"; value: number }
	| { type: "identifier"; value: string }
	| { type: "operator"; value: "+" | "-" | "*" | "/" | "^" }
	| { type: "lparen" }
	| { type: "rparen" }
	| { type: "comma" };

type ExpressionNode =
	| { type: "number"; value: number }
	| { type: "variable"; name: string }
	| { type: "unary"; operator: "+" | "-"; operand: ExpressionNode }
	| {
			type: "binary";
			operator: "+" | "-" | "*" | "/" | "^";
			left: ExpressionNode;
			right: ExpressionNode;
	  }
	| { type: "function"; name: string; args: ExpressionNode[] };

type FormulaContext = Record<string, number>;

type ScheduleRow = {
	period: number;
	date: Date;
	payment: number;
	principal: number;
	interest: number;
	balance: number;
};

type PaymentScheduleType = "fixed-day" | "month-end" | "daily-accrual";
type MonthEndFirstPayment = "this-month-end" | "next-month-end";

type SchedulePreview = {
	schedule: ScheduleRow[];
	error: string | null;
};

const ELIGIBILITY_EMI_RATIO = 0.5;

const convertTenureToMonths = (
	tenureValue: number | null,
	tenureUnit: LoanWorkflowSnapshot["product"]["loanTenor"]["TenorUnit"] | null | undefined,
) => {
	if (!tenureValue || tenureValue <= 0) return 0;
	if (tenureUnit === "Year") return tenureValue * 12;
	if (tenureUnit === "Day") return Math.max(1, Math.round(tenureValue / 30));
	return tenureValue;
};

const calculateReducingEmi = (
	principal: number,
	annualRatePercent: number,
	tenureMonths: number,
) => {
	if (principal <= 0 || tenureMonths <= 0) return 0;
	const monthlyRate = annualRatePercent / 12 / 100;
	if (monthlyRate <= 0) {
		return principal / tenureMonths;
	}
	const factor = (1 + monthlyRate) ** tenureMonths;
	return (principal * monthlyRate * factor) / (factor - 1);
};

const estimatePrincipalFromEmi = (
	emi: number,
	annualRatePercent: number,
	tenureMonths: number,
) => {
	if (emi <= 0 || tenureMonths <= 0) return 0;
	const monthlyRate = annualRatePercent / 12 / 100;
	if (monthlyRate <= 0) {
		return emi * tenureMonths;
	}
	const factor = (1 + monthlyRate) ** tenureMonths;
	return (emi * (factor - 1)) / (monthlyRate * factor);
};

const formatAmount = (value: number) => {
	if (!Number.isFinite(value)) return "0";
	return value.toLocaleString(undefined, {
		maximumFractionDigits: 0,
	});
};

const formatAmountWithTwoDecimals = (value: number) => {
	if (!Number.isFinite(value)) return "0.00";
	return value.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

const isValidFieldKey = (key: string) => /^[A-Za-z_]\w*$/.test(key);

const tokenizeFormula = (input: string): Token[] => {
	const tokens: Token[] = [];
	let i = 0;

	while (i < input.length) {
		const ch = input[i];
		if (/\s/.test(ch)) {
			i += 1;
			continue;
		}

		if (/[0-9.]/.test(ch)) {
			let value = ch;
			i += 1;
			while (i < input.length && /[0-9.]/.test(input[i])) {
				value += input[i];
				i += 1;
			}
			const parsed = Number(value);
			if (Number.isNaN(parsed)) {
				throw new TypeError(`Invalid number: ${value}`);
			}
			tokens.push({ type: "number", value: parsed });
			continue;
		}

		if (/[A-Za-z_]/.test(ch)) {
			let value = ch;
			i += 1;
			while (i < input.length && /\w/.test(input[i])) {
				value += input[i];
				i += 1;
			}
			tokens.push({ type: "identifier", value });
			continue;
		}

		if (ch === "+" || ch === "-" || ch === "*" || ch === "/" || ch === "^") {
			tokens.push({
				type: "operator",
				value: ch,
			});
			i += 1;
			continue;
		}

		if (ch === "(") {
			tokens.push({ type: "lparen" });
			i += 1;
			continue;
		}
		if (ch === ")") {
			tokens.push({ type: "rparen" });
			i += 1;
			continue;
		}
		if (ch === ",") {
			tokens.push({ type: "comma" });
			i += 1;
			continue;
		}

		throw new Error(`Unsupported token: ${ch}`);
	}

	return tokens;
};

const parseFormula = (input: string): ExpressionNode => {
	const tokens = tokenizeFormula(input);
	let cursor = 0;

	const peek = () => tokens[cursor];
	const consume = () => {
		const token = tokens[cursor];
		cursor += 1;
		return token;
	};

	const parseExpression = (): ExpressionNode => parseAddSub();

	const parseAddSub = (): ExpressionNode => {
		let node = parseMulDiv();
		while (true) {
			const token = peek();
			if (
				token?.type === "operator" &&
				(token.value === "+" || token.value === "-")
			) {
				consume();
				const right = parseMulDiv();
				node = {
					type: "binary",
					operator: token.value,
					left: node,
					right,
				};
				continue;
			}
			break;
		}
		return node;
	};

	const parseMulDiv = (): ExpressionNode => {
		let node = parsePow();
		while (true) {
			const token = peek();
			if (
				token?.type === "operator" &&
				(token.value === "*" || token.value === "/")
			) {
				consume();
				const right = parsePow();
				node = {
					type: "binary",
					operator: token.value,
					left: node,
					right,
				};
				continue;
			}
			break;
		}
		return node;
	};

	const parsePow = (): ExpressionNode => {
		let node = parseUnary();
		const token = peek();
		if (token?.type === "operator" && token.value === "^") {
			consume();
			const right = parsePow();
			node = {
				type: "binary",
				operator: "^",
				left: node,
				right,
			};
		}
		return node;
	};

	const parseUnary = (): ExpressionNode => {
		const token = peek();
		if (
			token?.type === "operator" &&
			(token.value === "+" || token.value === "-")
		) {
			consume();
			const operand = parseUnary();
			return {
				type: "unary",
				operator: token.value,
				operand,
			};
		}
		return parsePrimary();
	};

	const parsePrimary = (): ExpressionNode => {
		const token = peek();
		if (!token) {
			throw new Error("Unexpected end of formula");
		}

		if (token.type === "number") {
			consume();
			return { type: "number", value: token.value };
		}

		if (token.type === "identifier") {
			consume();
			if (peek()?.type === "lparen") {
				consume();
				const args: ExpressionNode[] = [];
				if (peek()?.type !== "rparen") {
					while (true) {
						args.push(parseExpression());
						if (peek()?.type === "comma") {
							consume();
							continue;
						}
						break;
					}
				}
				if (peek()?.type !== "rparen") {
					throw new Error("Expected closing parenthesis");
				}
				consume();
				return {
					type: "function",
					name: token.value,
					args,
				};
			}
			return { type: "variable", name: token.value };
		}

		if (token.type === "lparen") {
			consume();
			const node = parseExpression();
			if (peek()?.type !== "rparen") {
				throw new Error("Expected closing parenthesis");
			}
			consume();
			return node;
		}

		throw new Error("Invalid formula expression");
	};

	const root = parseExpression();
	if (cursor < tokens.length) {
		throw new Error("Invalid trailing expression");
	}
	return root;
};

const evalFormulaNode = (node: ExpressionNode, context: FormulaContext): number => {
	switch (node.type) {
		case "number":
			return node.value;
		case "variable": {
			if (Object.hasOwn(context, node.name)) {
				return context[node.name] ?? 0;
			}
			throw new Error(`Unknown variable: ${node.name}`);
		}
		case "unary": {
			const value = evalFormulaNode(node.operand, context);
			return node.operator === "-" ? -value : value;
		}
		case "binary": {
			const left = evalFormulaNode(node.left, context);
			const right = evalFormulaNode(node.right, context);
			switch (node.operator) {
				case "+":
					return left + right;
				case "-":
					return left - right;
				case "*":
					return left * right;
				case "/":
					return right === 0 ? 0 : left / right;
				case "^":
					return left ** right;
				default:
					return 0;
			}
		}
		case "function": {
			const args = node.args.map((arg) => evalFormulaNode(arg, context));
			switch (node.name) {
				case "min":
					return Math.min(...args);
				case "max":
					return Math.max(...args);
				case "abs":
					return Math.abs(args[0] ?? 0);
				case "round":
					return Math.round(args[0] ?? 0);
				case "floor":
					return Math.floor(args[0] ?? 0);
				case "ceil":
					return Math.ceil(args[0] ?? 0);
				case "pow":
					return (args[0] ?? 0) ** (args[1] ?? 0);
				case "sqrt":
					return Math.sqrt(args[0] ?? 0);
				case "log":
					return Math.log(args[0] ?? 1);
				case "exp":
					return Math.exp(args[0] ?? 0);
				default:
					throw new Error(`Unsupported function: ${node.name}`);
			}
		}
		default:
			return 0;
	}
};

const daysBetween = (start: Date, end: Date) => {
	const msPerDay = 24 * 60 * 60 * 1000;
	const utcStart = Date.UTC(
		start.getFullYear(),
		start.getMonth(),
		start.getDate(),
	);
	const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
	return Math.max(1, Math.round((utcEnd - utcStart) / msPerDay));
};

const buildPaymentDate = (
	startDate: Date,
	period: number,
	scheduleType: PaymentScheduleType,
	monthEndFirstPayment: MonthEndFirstPayment,
) => {
	if (scheduleType === "month-end") {
		const year = startDate.getFullYear();
		const monthEndOffset =
			startDate.getDate() > 15 && monthEndFirstPayment === "next-month-end"
				? 1
				: 0;
		const month = startDate.getMonth() + monthEndOffset + (period - 1);
		return new Date(year, month + 1, 0);
	}

	if (scheduleType === "daily-accrual") {
		const targetYear = startDate.getFullYear();
		const targetMonth = startDate.getMonth() + (period - 1);
		const fixedDay = startDate.getDate();
		const lastDayInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
		return new Date(
			targetYear,
			targetMonth,
			Math.min(fixedDay, lastDayInMonth),
		);
	}

	const targetYear = startDate.getFullYear();
	const targetMonth = startDate.getMonth() + period;
	const fixedDay = startDate.getDate();
	const lastDayInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
	return new Date(targetYear, targetMonth, Math.min(fixedDay, lastDayInMonth));
};

const buildCustomEmiSchedule = (
	amount: number,
	rateAnnual: number,
	tenureMonths: number,
	principalFormula: string | null,
	interestFormula: string | null,
	customFieldValues: Record<string, number> | null,
	startDate: Date,
	paymentScheduleType: PaymentScheduleType,
	monthEndFirstPayment: MonthEndFirstPayment,
): SchedulePreview => {
	if (!principalFormula || !principalFormula.trim()) {
		return { schedule: [], error: "Principal formula is required." };
	}
	if (!interestFormula || !interestFormula.trim()) {
		return { schedule: [], error: "Interest formula is required." };
	}
	if (amount <= 0 || tenureMonths <= 0) {
		return { schedule: [], error: "Enter a valid amount and tenure." };
	}

	let parsedFormulaNodes: {
		principalNode: ExpressionNode;
		interestNode: ExpressionNode;
	};
	try {
		parsedFormulaNodes = {
			principalNode: parseFormula(principalFormula),
			interestNode: parseFormula(interestFormula),
		};
	} catch (error) {
		return {
			schedule: [],
			error: error instanceof Error ? error.message : "Invalid formula.",
		};
	}

	const rateMonthly = rateAnnual / 12 / 100;
	const rateAnnualDecimal = rateAnnual / 100;
	const rateDaily = rateAnnualDecimal / 365;
	const baseEmi =
		rateMonthly <= 0
			? amount / tenureMonths
			: (amount * rateMonthly * (1 + rateMonthly) ** tenureMonths) /
				((1 + rateMonthly) ** tenureMonths - 1);

	let remainingBalance = amount;
	let prevPayment = 0;
	let prevPrincipal = 0;
	let prevInterest = 0;
	let previousDate = startDate;
	const schedule: ScheduleRow[] = [];

	for (let i = 1; i <= tenureMonths; i++) {
		const paymentDate = buildPaymentDate(
			startDate,
			i,
			paymentScheduleType,
			monthEndFirstPayment,
		);
		const periodDays = daysBetween(previousDate, paymentDate);
		const scheduleRate =
			paymentScheduleType === "daily-accrual"
				? (rateAnnualDecimal * periodDays) / 365
				: rateMonthly;

		const context: FormulaContext = {
			principal: amount,
			balance: remainingBalance,
			rateMonthly: scheduleRate,
			rateAnnual: rateAnnualDecimal,
			rateDaily,
			ratePeriod: scheduleRate,
			daysInPeriod: periodDays,
			period: i,
			tenureMonths,
			remainingMonths: tenureMonths - i + 1,
			baseEmi,
			prevPayment,
			prevPrincipal,
			prevInterest,
		};

		for (const [key, value] of Object.entries(customFieldValues ?? {})) {
			if (!isValidFieldKey(key)) {
				continue;
			}
			context[key] = value;
		}

		let interest = evalFormulaNode(parsedFormulaNodes.interestNode, context);
		if (!Number.isFinite(interest)) {
			interest = 0;
		}
		interest = Math.max(0, interest);

		let principal = evalFormulaNode(parsedFormulaNodes.principalNode, context);
		if (!Number.isFinite(principal)) {
			principal = 0;
		}
		principal = Math.max(0, principal);

		let payment = principal + interest;
		if (principal > remainingBalance) {
			principal = remainingBalance;
			payment = principal + interest;
		}

		if (i === tenureMonths && remainingBalance - principal > 0) {
			const residual = remainingBalance - principal;
			principal += residual;
			payment += residual;
		}

		remainingBalance -= principal;
		schedule.push({
			period: i,
			date: paymentDate,
			payment,
			principal,
			interest,
			balance: Math.max(0, remainingBalance),
		});
		prevPayment = payment;
		prevPrincipal = principal;
		prevInterest = interest;
		previousDate = paymentDate;
	}

	return { schedule, error: null };
};

const formatDocumentTypeLabel = (documentTypeId: string) => {
	const value = documentTypeId.startsWith("DOC-")
		? documentTypeId.slice(4)
		: documentTypeId;
	return value.replaceAll("_", " ");
};

const normalizeScoreFieldKey = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.replaceAll(/[^a-z0-9]/g, "");

const includesAny = (value: string, parts: string[]) =>
	parts.some((part) => value.includes(part));

const buildScoreInputsFromApplication = (
	fields: Array<{ field: string }>,
	input: {
		beneficiaryName: string;
		nationalId: string;
		phone: string;
		bankAccountNo: string;
		age: number | null;
		monthlyIncome: number | null;
		requestedAmount: number | null;
		tenureValue: number | null;
		channelCode: string;
		destinationType: DisbursementDestinationType;
		bureauProvider: string;
		bureauPurpose: string;
		bureauConsent: boolean;
		notes: string;
	},
) => {
	const resolveFieldValue = (normalizedField: string): string => {
		if (
			normalizedField === "age" ||
			(normalizedField.includes("age") && !normalizedField.includes("average"))
		) {
			return input.age === null ? "" : String(input.age);
		}
		if (includesAny(normalizedField, ["monthlyincome", "income", "salary"])) {
			return input.monthlyIncome === null ? "" : String(input.monthlyIncome);
		}
		if (includesAny(normalizedField, ["requestedamount", "loanamount", "amount", "principal"])) {
			return input.requestedAmount === null ? "" : String(input.requestedAmount);
		}
		if (includesAny(normalizedField, ["tenure", "term", "duration"])) {
			return input.tenureValue === null ? "" : String(input.tenureValue);
		}
		if (includesAny(normalizedField, ["beneficiaryname", "customername", "applicantname", "name"])) {
			return input.beneficiaryName.trim();
		}
		if (includesAny(normalizedField, ["nationalid", "nrc", "idno", "identityno", "idnumber"])) {
			return input.nationalId.trim();
		}
		if (includesAny(normalizedField, ["mobile", "phone", "phoneno", "mobileno"])) {
			return input.phone.trim();
		}
		if (includesAny(normalizedField, ["bankaccount", "accountno", "accountnumber"])) {
			return input.bankAccountNo.trim();
		}
		if (includesAny(normalizedField, ["channelcode", "channel"])) {
			return input.channelCode.trim();
		}
		if (includesAny(normalizedField, ["disbursement", "destination"])) {
			return input.destinationType;
		}
		if (includesAny(normalizedField, ["bureauprovider", "creditbureauprovider"])) {
			return input.bureauProvider.trim();
		}
		if (includesAny(normalizedField, ["bureaupurpose", "creditbureaupurpose", "purpose"])) {
			return input.bureauPurpose.trim();
		}
		if (includesAny(normalizedField, ["bureauconsent", "consent"])) {
			return String(input.bureauConsent);
		}
		if (includesAny(normalizedField, ["remark", "remarks", "note", "notes"])) {
			return input.notes.trim();
		}
		return "";
	};

	return fields.reduce<Record<string, string>>((acc, field) => {
		const normalizedKey = normalizeScoreFieldKey(field.field);
		acc[field.field] = resolveFieldValue(normalizedKey);
		return acc;
	}, {});
};

const getApplicationStatusFromRiskGrade = (
	riskGrade: RiskGrade | null,
): LoanApplicationStatus => {
	if (riskGrade === "LOW") return "APPROVED";
	if (riskGrade === "HIGH") return "REJECTED";
	return "SUBMITTED";
};

function LoanApplicationCreate() {
	const navigate = useNavigate();
	const bureauPurposeListId = useId();
	const channelOptionsListId = useId();
	const setups = useLoanSetupStore((s) => s.setups);
	const scoreCards = useScoreCardStore((s) => s.scoreCards);
	const addApplication = useLoanApplicationStore((s) => s.addApplication);
	const setupList = useMemo(() => getLoanSetupList(setups), [setups]);
	const [selectedSetupId, setSelectedSetupId] = useState(
		setupList[0]?.id ?? "",
	);

	const activeSetup = useMemo<LoanWorkflowSnapshot | null>(() => {
		return (
			setupList.find((s) => s.id === selectedSetupId) ?? setupList[0] ?? null
		);
	}, [setupList, selectedSetupId]);

	useEffect(() => {
		if (setupList.length === 0) return;
		if (!activeSetup) {
			setSelectedSetupId(setupList[0].id);
		}
	}, [activeSetup, setupList]);

	const tenureOptions = activeSetup?.product.loanTenor?.TenorValue ?? [];
	const channelOptions = activeSetup?.channels ?? [];
	const destinationChoices: DisbursementDestinationType[] = (
		activeSetup?.disbursementDestinations ?? []
	).map((d) => d.type);
	const defaultBureauProvider = "Myanmar Credit Bureau";
	const defaultBureauPurpose = "Credit assessment";

	const activeScoreCard = useMemo(() => {
		if (!activeSetup?.scorecardId) return null;
		return scoreCards[activeSetup.scorecardId] ?? null;
	}, [activeSetup?.scorecardId, scoreCards]);

	const bureauProviders = useMemo(() => {
		const set = new Set<string>();
		set.add(defaultBureauProvider);
		if (activeSetup?.bureauProvider?.trim()) {
			set.add(activeSetup.bureauProvider.trim());
		}
		return Array.from(set);
	}, [activeSetup?.bureauProvider]);

	const bureauPurposes = useMemo(() => {
		const set = new Set<string>();
		set.add(defaultBureauPurpose);
		set.add("Pre-approval");
		set.add("Account review");
		set.add("Regulatory reporting");
		if (activeSetup?.bureauPurpose?.trim()) {
			set.add(activeSetup.bureauPurpose.trim());
		}
		return Array.from(set);
	}, [activeSetup?.bureauPurpose]);


	const [beneficiaryName, setBeneficiaryName] = useState("");
	const [nationalId, setNationalId] = useState("");
	const [phone, setPhone] = useState("");
	const [bankAccountNo, setBankAccountNo] = useState("");
	const [ageInput, setAgeInput] = useState("");
	const [monthlyIncomeInput, setMonthlyIncomeInput] = useState("");
	const [amountInput, setAmountInput] = useState("");
	const [tenureValue, setTenureValue] = useState<number | null>(
		tenureOptions[0] ?? null,
	);
	const [channelCode, setChannelCode] = useState(channelOptions[0]?.code ?? "");
	const [destinationType, setDestinationType] =
		useState<DisbursementDestinationType>(destinationChoices[0] ?? "BANK");
	const [bureauProvider, setBureauProvider] = useState(defaultBureauProvider);
	const [bureauPurpose, setBureauPurpose] = useState(defaultBureauPurpose);
	const [bureauConsent, setBureauConsent] = useState(false);
	const [bureauReference, setBureauReference] = useState("");
	const [bureauRequestedAt, setBureauRequestedAt] = useState("");
	const [notes, setNotes] = useState("");
	const [formError, setFormError] = useState<string | null>(null);
	const [currentStep, setCurrentStep] = useState<1 | 2>(1);
	const [documentFiles, setDocumentFiles] = useState<Record<string, File | null>>(
		{},
	);
	const otherDocumentCounterRef = useRef(1);
	const createOtherDocumentUpload = (): OtherDocumentUpload => ({
		id: `other-document-${otherDocumentCounterRef.current++}`,
		file: null,
	});
	const [otherDocumentFiles, setOtherDocumentFiles] = useState<
		Array<OtherDocumentUpload>
	>(() => [createOtherDocumentUpload()]);

	const computedScoreInputs = useMemo(() => {
		if (!activeScoreCard) return null;
		const parsedAge = Number(ageInput);
		const parsedMonthlyIncome = Number(monthlyIncomeInput);
		const parsedRequestedAmount = Number(amountInput);
		return buildScoreInputsFromApplication(activeScoreCard.fields, {
			beneficiaryName,
			nationalId,
			phone: destinationType === "WALLET" ? phone : "",
			bankAccountNo: destinationType === "BANK" ? bankAccountNo : "",
			age: Number.isFinite(parsedAge) ? parsedAge : null,
			monthlyIncome: Number.isFinite(parsedMonthlyIncome)
				? parsedMonthlyIncome
				: null,
			requestedAmount: Number.isFinite(parsedRequestedAmount)
				? parsedRequestedAmount
				: null,
			tenureValue,
			channelCode,
			destinationType,
			bureauProvider,
			bureauPurpose,
			bureauConsent,
			notes,
		});
	}, [
		activeScoreCard,
		ageInput,
		amountInput,
		beneficiaryName,
		bankAccountNo,
		bureauConsent,
		bureauProvider,
		bureauPurpose,
		channelCode,
		destinationType,
		monthlyIncomeInput,
		nationalId,
		notes,
		phone,
		tenureValue,
	]);

	const riskEvaluationReady = useMemo(() => {
		if (!activeSetup) return false;
		const parsedAge = Number(ageInput);
		const parsedMonthlyIncome = Number(monthlyIncomeInput);
		const parsedRequestedAmount = Number(amountInput);
		if (!beneficiaryName.trim()) return false;
		if (!nationalId.trim()) return false;
		if (!Number.isFinite(parsedAge) || parsedAge <= 0) return false;
		if (!Number.isFinite(parsedMonthlyIncome) || parsedMonthlyIncome < 0) {
			return false;
		}
		if (!Number.isFinite(parsedRequestedAmount)) return false;
		if (tenureValue === null || tenureValue <= 0) return false;
		if (activeSetup.bureauConsentRequired) {
			if (!bureauProvider.trim()) return false;
			if (!bureauPurpose.trim()) return false;
			if (!bureauConsent) return false;
		}
		return true;
	}, [
		activeSetup,
		ageInput,
		amountInput,
		beneficiaryName,
		bureauConsent,
		bureauProvider,
		bureauPurpose,
		monthlyIncomeInput,
		nationalId,
		tenureValue,
	]);

	const computedRiskResult = useMemo(() => {
		if (!activeScoreCard || !computedScoreInputs || !riskEvaluationReady) {
			return null;
		}
		return evaluateScoreCard(activeScoreCard, computedScoreInputs);
	}, [activeScoreCard, computedScoreInputs, riskEvaluationReady]);

	const computedRiskGrade: RiskGrade | null = computedRiskResult?.riskGrade ?? null;

	const documentUploadFields = useMemo<DocumentUploadField[]>(() => {
		if (!activeSetup) return [];
		if (!riskEvaluationReady) return [];

		const parsedAmount = Number(amountInput);
		const hasAmount = Number.isFinite(parsedAmount) && parsedAmount >= 0;
		const byType = new Map<string, DocumentUploadField>();
		for (const requirement of activeSetup.documentRequirements) {
			if (requirement.documentTypeId === "DOC-OTHER") {
				continue;
			}
			const collateralAlwaysRequired =
				activeSetup.isSecuredLoan && requirement.collateralRequired;
			if (
				computedRiskGrade &&
				requirement.riskGrade &&
				requirement.riskGrade !== computedRiskGrade &&
				!collateralAlwaysRequired
			) {
				continue;
			}
			if (
				hasAmount &&
				(parsedAmount < requirement.minAmount ||
					parsedAmount > requirement.maxAmount)
			) {
				continue;
			}
			const existing = byType.get(requirement.documentTypeId);
			if (existing) {
				existing.isMandatory =
					existing.isMandatory ||
					requirement.isMandatory ||
					collateralAlwaysRequired;
				continue;
			}
			byType.set(requirement.documentTypeId, {
				documentTypeId: requirement.documentTypeId,
				isMandatory: requirement.isMandatory || collateralAlwaysRequired,
			});
		}

		const requiredByScore = Array.from(byType.values()).sort((a, b) =>
			a.documentTypeId.localeCompare(b.documentTypeId),
		);
		return requiredByScore;
	}, [activeSetup, amountInput, computedRiskGrade, riskEvaluationReady]);

	useEffect(() => {
		setTenureValue(tenureOptions[0] ?? null);
	}, [tenureOptions]);

	useEffect(() => {
		setChannelCode(channelOptions[0]?.code ?? "");
	}, [channelOptions]);

	useEffect(() => {
		setDestinationType(destinationChoices[0] ?? "BANK");
	}, [destinationChoices]);

	useEffect(() => {
		const nextProvider =
			activeSetup?.bureauProvider?.trim() || defaultBureauProvider;
		const nextPurpose =
			activeSetup?.bureauPurpose?.trim() || defaultBureauPurpose;
		setBureauProvider(nextProvider);
		setBureauPurpose(nextPurpose);
		setBureauConsent(false);
		setBureauReference("");
		setBureauRequestedAt("");
	}, [activeSetup?.bureauProvider, activeSetup?.bureauPurpose]);

	useEffect(() => {
		const validIds = new Set(
			documentUploadFields.map((field) => field.documentTypeId),
		);
		setDocumentFiles((prev) => {
			const next: Record<string, File | null> = {};
			for (const [documentTypeId, file] of Object.entries(prev)) {
				if (validIds.has(documentTypeId)) {
					next[documentTypeId] = file;
				}
			}
			return next;
		});
	}, [documentUploadFields]);

	const handleOtherDocumentChange = (uploadId: string, file: File | null) => {
		setDocumentFiles((prev) => {
			if (!("DOC-OTHER" in prev)) {
				return prev;
			}
			const next = { ...prev };
			delete next["DOC-OTHER"];
			return next;
		});

		setOtherDocumentFiles((prev) => {
			const next = prev.map((upload) =>
				upload.id === uploadId ? { ...upload, file } : upload,
			);

			const changedIndex = next.findIndex((upload) => upload.id === uploadId);
			const isLastRow = changedIndex === next.length - 1;
			if (file && isLastRow) {
				next.push(createOtherDocumentUpload());
			}

			if (next.length === 0) {
				next.push(createOtherDocumentUpload());
			}

			return next;
		});
	};

	const handleRemoveOtherDocument = (uploadId: string) => {
		setOtherDocumentFiles((prev) => {
			if (prev.length <= 1) {
				return [createOtherDocumentUpload()];
			}

			const next = prev.filter((upload) => upload.id !== uploadId);
			if (next.length === 0 || next.at(-1)?.file !== null) {
				next.push(createOtherDocumentUpload());
			}
			return next;
		});
	};

	const schedulePreview = useMemo((): SchedulePreview | null => {
		if (!activeSetup) return null;
		if (!activeSetup.customEmiPrincipalFormula || !activeSetup.customEmiInterestFormula) {
			return {
				schedule: [],
				error: "No custom EMI formula selected in the loan setup.",
			};
		}

		const parsedAmount = Number(amountInput);
		const tenureMonths = convertTenureToMonths(
			tenureValue,
			activeSetup.product.loanTenor?.TenorUnit,
		);
		const annualRate =
			activeSetup.product.interestRatePlans?.[0]?.baseRate ??
			activeSetup.product.baseInterestRate ??
			0;
		const startDate = new Date();

		return buildCustomEmiSchedule(
			parsedAmount,
			annualRate,
			tenureMonths,
			activeSetup.customEmiPrincipalFormula,
			activeSetup.customEmiInterestFormula,
			activeSetup.customEmiFieldValues ?? {},
			startDate,
			"fixed-day",
			"this-month-end",
		);
	}, [activeSetup, amountInput, tenureValue]);

	const disabled = setupList.length === 0;
	const statusBadge: LoanApplicationStatus | "" = activeSetup
		? getApplicationStatusFromRiskGrade(computedRiskGrade)
		: "";

	const validateStepOne = () => {
		if (disabled || !activeSetup) return null;

		if (!beneficiaryName.trim()) {
			setFormError("Beneficiary name is required.");
			return null;
		}
		if (!nationalId.trim()) {
			setFormError("National ID is required.");
			return null;
		}

		const parsedAge = Number(ageInput);
		if (!Number.isFinite(parsedAge) || parsedAge <= 0) {
			setFormError("Enter a valid age.");
			return null;
		}

		const parsedMonthlyIncome = Number(monthlyIncomeInput);
		if (!Number.isFinite(parsedMonthlyIncome) || parsedMonthlyIncome < 0) {
			setFormError("Enter a valid monthly income.");
			return null;
		}

		const parsedAmount = Number(amountInput);
		if (!Number.isFinite(parsedAmount)) {
			setFormError("Enter a valid amount.");
			return null;
		}
		if (
			activeSetup.product.minAmount &&
			parsedAmount < activeSetup.product.minAmount
		) {
			setFormError(
				`Amount must be at least ${activeSetup.product.minAmount.toLocaleString()}.`,
			);
			return null;
		}
		if (
			activeSetup.product.maxAmount &&
			parsedAmount > activeSetup.product.maxAmount
		) {
			setFormError(
				`Amount must be at most ${activeSetup.product.maxAmount.toLocaleString()}.`,
			);
			return null;
		}

		if (activeSetup.bureauConsentRequired) {
			if (!bureauProvider.trim()) {
				setFormError("Select a credit bureau provider.");
				return null;
			}

			if (!bureauPurpose.trim()) {
				setFormError("Enter the purpose for the bureau check.");
				return null;
			}

			if (!bureauConsent) {
				setFormError(
					"Beneficiary consent is required before checking the bureau.",
				);
				return null;
			}
		}

		if (destinationType === "BANK" && !bankAccountNo.trim()) {
			setFormError("Bank account no is required for bank disbursement.");
			return null;
		}

		if (destinationType === "WALLET" && !phone.trim()) {
			setFormError("Phone no is required for KPay disbursement.");
			return null;
		}

		const parsedBureauRequestedAt = bureauRequestedAt
			? Date.parse(bureauRequestedAt)
			: null;
		if (bureauRequestedAt && Number.isNaN(parsedBureauRequestedAt)) {
			setFormError("Enter a valid requested-at date/time.");
			return null;
		}

		setFormError(null);
		return {
			parsedAge,
			parsedMonthlyIncome,
			parsedAmount,
			parsedBureauRequestedAt,
		};
	};

	const handleNextStep = () => {
		const validated = validateStepOne();
		if (!validated) return;
		setCurrentStep(2);
	};

	const handleSubmit = () => {
		if (disabled || !activeSetup) return;
		const validated = validateStepOne();
		if (!validated) return;

		if (activeScoreCard && !riskEvaluationReady) {
			setFormError(
				"Complete all required application inputs before risk and document status can be determined.",
			);
			return;
		}

		const missingRequiredDocuments = documentUploadFields
			.filter((field) => field.isMandatory && !documentFiles[field.documentTypeId])
			.map((field) => formatDocumentTypeLabel(field.documentTypeId));
		if (missingRequiredDocuments.length > 0) {
			setFormError(
				`Upload required documents before saving: ${missingRequiredDocuments.join(", ")}.`,
			);
			return;
		}

		setFormError(null);
		const submitScoreInputs = activeScoreCard
			? buildScoreInputsFromApplication(activeScoreCard.fields, {
					beneficiaryName,
					nationalId,
					phone: destinationType === "WALLET" ? phone : "",
					bankAccountNo: destinationType === "BANK" ? bankAccountNo : "",
					age: validated.parsedAge,
					monthlyIncome: validated.parsedMonthlyIncome,
					requestedAmount: validated.parsedAmount,
					tenureValue,
					channelCode,
					destinationType,
					bureauProvider,
					bureauPurpose,
					bureauConsent,
					notes,
				})
			: null;
		const submitRiskResult =
			activeScoreCard && submitScoreInputs && riskEvaluationReady
				? evaluateScoreCard(activeScoreCard, submitScoreInputs)
				: null;
		const creditScoreToSave = submitRiskResult?.totalScore ?? null;
		const creditMaxToSave = submitRiskResult?.maxScore ?? null;
		const status = getApplicationStatusFromRiskGrade(
			submitRiskResult?.riskGrade ?? null,
		);

		addApplication({
			status,
			beneficiaryName,
			nationalId,
			phone: destinationType === "WALLET" ? phone : "",
			bankAccountNo: destinationType === "BANK" ? bankAccountNo : "",
			kpayPhoneNo: destinationType === "WALLET" ? phone : "",
			age: validated.parsedAge,
			monthlyIncome: validated.parsedMonthlyIncome,
			requestedAmount: validated.parsedAmount,
			tenureValue: tenureValue,
			tenureUnit: activeSetup?.product.loanTenor?.TenorUnit ?? null,
			channelCode,
			destinationType,
			bureauProvider,
			bureauPurpose,
			bureauConsent,
			bureauReference,
			bureauRequestedAt: validated.parsedBureauRequestedAt,
			notes,
			setupId: activeSetup.id,
			productCode: activeSetup.product.productCode,
			productName: activeSetup.product.productName,
			creditScore: creditScoreToSave,
			creditMax: creditMaxToSave,
			workflowId: activeSetup.workflowId,
			workflowName: activeSetup.workflowName,
		});

		navigate({ to: "/loan/applications" });
	};

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="space-y-6">
				<div>
					<div className="text-sm text-gray-600">Loan applications</div>
					<h1 className="text-2xl font-semibold">Create application</h1>
				</div>

				{disabled ? (
					<div className="border rounded p-4 bg-yellow-50 text-sm text-gray-800">
						You need at least one saved loan setup before creating applications.
						<div className="mt-2">
							<Link to="/loan/setup" className="text-blue-600 hover:underline">
								Go to Loan Setup
							</Link>
						</div>
					</div>
				) : (
					<div className="space-y-4 border rounded p-4">
						<div className="flex items-center gap-3 text-sm">
							<button
								type="button"
								onClick={() => setCurrentStep(1)}
								className={`px-3 py-1.5 rounded border ${
									currentStep === 1
										? "bg-gray-900 text-white border-gray-900"
										: "bg-white text-gray-700"
								}`}
							>
								1. Application details
							</button>
							<button
								type="button"
								onClick={() => {
									if (currentStep === 1) {
										handleNextStep();
										return;
									}
									setCurrentStep(2);
								}}
								className={`px-3 py-1.5 rounded border ${
									currentStep === 2
										? "bg-gray-900 text-white border-gray-900"
										: "bg-white text-gray-700"
								}`}
							>
								2. Document uploads
							</button>
						</div>

						{currentStep === 1 ? (
							<>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<label className="flex flex-col gap-1 text-sm">
								<span>Loan setup (product)</span>
								<select
									className="border px-2 py-2 rounded"
									value={selectedSetupId}
									onChange={(e) => {
										setSelectedSetupId(e.target.value);
										setCurrentStep(1);
										setFormError(null);
										setDocumentFiles({});
										setOtherDocumentFiles([createOtherDocumentUpload()]);
									}}
								>
									{setupList.map((setup) => (
										<option key={setup.id} value={setup.id}>
											{setup.product.productName} ({setup.product.productCode})
										</option>
									))}
								</select>
								<span className="text-xs text-gray-600">
									Tenure options: {tenureOptions.join(", ") || "—"} months ·
									Range: {activeSetup?.product.minAmount.toLocaleString()} -{" "}
									{activeSetup?.product.maxAmount.toLocaleString()}
								</span>
							</label>

							<label className="flex flex-col gap-1 text-sm">
								<span>Status</span>
								<input
									readOnly
									value={riskEvaluationReady ? statusBadge : ""}
									placeholder="Complete inputs to determine"
									className="border px-2 py-2 rounded bg-gray-50"
								/>
								<span className="text-xs text-gray-600">
									{riskEvaluationReady
										? "Status is calculated from scorecard inputs."
										: "Status appears after all scoring inputs are filled."}
								</span>
							</label>
						</div>

						<div className="space-y-3 border rounded p-4">
							<div>
								<div className="text-sm text-gray-600">Quick eligibility input</div>
								<div className="text-base font-semibold">
									Enter these first to estimate EMI and eligible amount
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<label className="flex flex-col gap-1 text-sm">
									<span>Beneficiary name</span>
									<input
										type="text"
										className="border px-2 py-2 rounded"
										value={beneficiaryName}
										onChange={(e) => setBeneficiaryName(e.target.value)}
										disabled={disabled}
									/>
								</label>

								<label className="flex flex-col gap-1 text-sm">
									<span>Age</span>
									<input
										type="number"
										min={0}
										className="border px-2 py-2 rounded"
										value={ageInput}
										onChange={(e) => setAgeInput(e.target.value)}
										disabled={disabled}
									/>
								</label>

								<label className="flex flex-col gap-1 text-sm">
									<span>Monthly income</span>
									<input
										type="number"
										min={0}
										className="border px-2 py-2 rounded"
										value={monthlyIncomeInput}
										onChange={(e) => setMonthlyIncomeInput(e.target.value)}
										disabled={disabled}
									/>
								</label>

								<label className="flex flex-col gap-1 text-sm">
									<span>Requested amount</span>
									<input
										type="number"
										min={activeSetup?.product.minAmount ?? 0}
										max={activeSetup?.product.maxAmount ?? undefined}
										className="border px-2 py-2 rounded"
										value={amountInput}
										onChange={(e) => setAmountInput(e.target.value)}
										disabled={disabled}
									/>
									<span className="text-xs text-gray-600">
										{activeSetup
											? `Allowed: ${activeSetup.product.minAmount.toLocaleString()} - ${activeSetup.product.maxAmount.toLocaleString()}`
											: "Save a loan setup first."}
									</span>
								</label>

								<label className="flex flex-col gap-1 text-sm">
									<span>Tenure</span>
									<select
										className="border px-2 py-2 rounded"
										value={tenureValue ?? ""}
										onChange={(e) =>
											setTenureValue(
												e.target.value ? Number(e.target.value) : null,
											)
										}
										disabled={disabled || tenureOptions.length === 0}
									>
										{tenureOptions.map((months) => {
											const baseUnit =
												activeSetup?.product.loanTenor?.TenorUnit ?? "month";
											const unit =
												baseUnit.endsWith("s") || months === 1
													? baseUnit
													: `${baseUnit}s`;
											return (
												<option key={months} value={months}>
													{months} {unit}
												</option>
											);
										})}
									</select>
								</label>
							</div>

							<div className="space-y-3 border rounded p-3 bg-gray-50 text-sm text-gray-700">
								<div>
									<div className="text-xs text-gray-600">Payment schedule (custom EMI)</div>
									<div className="text-base font-semibold">Upcoming installments preview</div>
								</div>
								{schedulePreview?.error ? (
									<div className="text-xs text-red-700">{schedulePreview.error}</div>
								) : null}
								{schedulePreview && schedulePreview.schedule.length > 0 ? (
									<div className="border rounded bg-white overflow-x-auto">
										<table className="min-w-full text-xs text-left">
											<thead className="bg-gray-100 text-gray-700 font-semibold border-b">
												<tr>
													<th className="px-3 py-2 whitespace-nowrap">#</th>
													<th className="px-3 py-2 whitespace-nowrap">Date</th>
													<th className="px-3 py-2 text-right whitespace-nowrap">Payment</th>
													<th className="px-3 py-2 text-right whitespace-nowrap">Principal</th>
													<th className="px-3 py-2 text-right whitespace-nowrap">Interest</th>
													<th className="px-3 py-2 text-right whitespace-nowrap">Balance</th>
												</tr>
											</thead>
											<tbody className="divide-y divide-gray-200">
												{schedulePreview.schedule.map((row) => (
													<tr key={row.period} className="hover:bg-gray-50">
														<td className="px-3 py-2 text-gray-500">{row.period}</td>
														<td className="px-3 py-2">
															{new Intl.DateTimeFormat("en-US", {
																year: "numeric",
																month: "short",
																day: "numeric",
															}).format(row.date)}
														</td>
														<td className="px-3 py-2 text-right font-medium">
															{formatAmountWithTwoDecimals(row.payment)}
														</td>
														<td className="px-3 py-2 text-right text-gray-600">
															{formatAmountWithTwoDecimals(row.principal)}
														</td>
														<td className="px-3 py-2 text-right text-orange-600">
															{formatAmountWithTwoDecimals(row.interest)}
														</td>
														<td className="px-3 py-2 text-right text-gray-500">
															{formatAmountWithTwoDecimals(row.balance)}
														</td>
													</tr>
												))}
											</tbody>
										</table>
									</div>
								) : (
									<div className="text-xs text-gray-600">
										Enter amount and tenure to preview the schedule.
									</div>
								)}
								<div className="text-xs text-gray-500">
									Schedule preview uses the custom EMI formula saved in the loan setup.
								</div>
							</div>
						</div>

						<div className="space-y-4 border rounded p-4">
							<div>
								<div className="text-sm text-gray-600">Additional details</div>
								<div className="text-base font-semibold">Complete remaining application fields</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<label className="flex flex-col gap-1 text-sm">
									<span>Channel code</span>
									<input
										type="text"
										className="border px-2 py-2 rounded"
										value={channelCode}
										onChange={(e) => setChannelCode(e.target.value)}
										list={channelOptionsListId}
										disabled={disabled}
									/>
									<datalist id={channelOptionsListId}>
										{channelOptions.map((ch) => (
											<option
												key={`${ch.code}-${ch.name}`}
												value={ch.code || ch.name}
											>
												{ch.name}
											</option>
										))}
									</datalist>
								</label>

								<label className="flex flex-col gap-1 text-sm">
									<span>Disbursement destination</span>
									<select
										className="border px-2 py-2 rounded"
										value={destinationType}
										onChange={(e) =>
											setDestinationType(
												e.target.value as DisbursementDestinationType,
											)
										}
										disabled={disabled}
									>
										{(destinationChoices.length
											? destinationChoices
											: ["BANK"]
										).map((dest) => (
											<option key={dest} value={dest}>
												{dest}
											</option>
										))}
									</select>
								</label>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<label className="flex flex-col gap-1 text-sm">
									<span>National ID</span>
									<input
										type="text"
										className="border px-2 py-2 rounded"
										value={nationalId}
                    placeholder="12/XXX(X)123456"
										onChange={(e) => setNationalId(e.target.value)}
										disabled={disabled}
									/>
								</label>

								<label className="flex flex-col gap-1 text-sm">
									<span>
										{destinationType === "BANK" ? "Bank account no" : "Phone no (KPay)"}
									</span>
									<input
										type={destinationType === "BANK" ? "text" : "tel"}
										className="border px-2 py-2 rounded"
										value={destinationType === "BANK" ? bankAccountNo : phone}
										onChange={(e) => {
											if (destinationType === "BANK") {
												setBankAccountNo(e.target.value);
												return;
											}
											setPhone(e.target.value);
										}}
										disabled={disabled}
									/>
								</label>
							</div>

							{activeSetup?.bureauCheckRequired ? (
								<div className="space-y-3 border rounded p-4">
									<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
										<div>
											<div className="text-sm text-gray-600">
												Credit bureau check
											</div>
											<div className="text-base font-semibold">
												Capture consent and request details
											</div>
										</div>
										{bureauConsent ? (
											<span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
												Consent ready
											</span>
										) : (
											<span className="text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">
												Consent required
											</span>
										)}
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<label className="flex flex-col gap-1 text-sm">
											<span>Bureau provider</span>
											<select
												className="border px-2 py-2 rounded"
												value={bureauProvider}
												onChange={(e) => setBureauProvider(e.target.value)}
												disabled={disabled}
											>
												{bureauProviders.map((provider) => (
													<option key={provider} value={provider}>
														{provider}
													</option>
												))}
											</select>
										</label>

										<label className="flex flex-col gap-1 text-sm">
											<span>Purpose</span>
											<input
												type="text"
												className="border px-2 py-2 rounded"
												value={bureauPurpose}
												onChange={(e) => setBureauPurpose(e.target.value)}
												list={bureauPurposeListId}
												disabled={disabled}
											/>
											<datalist id={bureauPurposeListId}>
												{bureauPurposes.map((purpose) => (
													<option key={purpose} value={purpose}>
														{purpose}
													</option>
												))}
											</datalist>
										</label>

										<label className="flex flex-col gap-2 text-sm">
											<div className="flex items-center gap-2">
												<input
													type="checkbox"
													className="h-4 w-4"
													checked={bureauConsent}
													onChange={(e) => setBureauConsent(e.target.checked)}
													disabled={disabled}
												/>
												<span>Beneficiary consent captured</span>
											</div>
											<span className="text-xs text-gray-600">
												Consent must be obtained before requesting a bureau
												report.
											</span>
										</label>

										<label className="flex flex-col gap-1 text-sm">
											<span>Bureau reference (case ID)</span>
											<input
												type="text"
												className="border px-2 py-2 rounded"
												value={bureauReference}
												onChange={(e) => setBureauReference(e.target.value)}
												disabled={disabled}
												placeholder="e.g. REF-12345"
											/>
										</label>

										<label className="flex flex-col gap-1 text-sm">
											<span>Bureau requested at</span>
											<input
												type="datetime-local"
												className="border px-2 py-2 rounded"
												value={bureauRequestedAt}
												onChange={(e) => setBureauRequestedAt(e.target.value)}
												disabled={disabled}
											/>
											<span className="text-xs text-gray-600">
												Optional timestamp to track when the bureau request was
												sent.
											</span>
										</label>
									</div>
								</div>
							) : null}

							<label className="flex flex-col gap-1 text-sm">
								<span>Notes</span>
								<textarea
									className="border px-2 py-2 rounded min-h-24"
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									disabled={disabled}
								/>
							</label>
						</div>
							</>
						) : (
							<div className="space-y-4">
								<div className="border rounded p-4 bg-gray-50 text-sm text-gray-700">
									<div>
										Upload requirements are derived from the configured score outcome.
									</div>
									<div>
										Risk grade: {computedRiskGrade?? "Not available"}
									</div>
								</div>

								<div className="space-y-3 border rounded p-4">
									{documentUploadFields.map((document) => {
										const label = formatDocumentTypeLabel(
											document.documentTypeId,
										);
										const selectedFile =
											documentFiles[document.documentTypeId] ?? null;
										return (
											<label
												key={document.documentTypeId}
												className="flex flex-col gap-2 text-sm border rounded p-3"
											>
												<div className="flex items-center justify-between gap-2">
													<span className="font-medium">{label}</span>
													<span
														className={`text-xs px-2 py-0.5 rounded-full border ${
															document.isMandatory
																? "bg-red-50 text-red-700 border-red-100"
																: "bg-gray-100 text-gray-700 border-gray-200"
														}`}
													>
														{document.isMandatory ? "Required" : "Optional"}
													</span>
												</div>
												<input
													type="file"
													onChange={(e) => {
														const file = e.target.files?.[0] ?? null;
														setDocumentFiles((prev) => ({
															...prev,
															[document.documentTypeId]: file,
														}));
													}}
													disabled={disabled}
												/>
												{selectedFile ? (
													<span className="text-xs text-gray-600">
														Selected: {selectedFile.name}
													</span>
												) : null}
											</label>
										);
									})}
								</div>

								<div className="space-y-3 border rounded p-4">
									<div className="text-sm font-medium">Other documents (optional)</div>
									<div className="text-xs text-gray-600">
										These uploads are optional and not tied to risk grade or document rules.
									</div>
									{otherDocumentFiles.map((upload) => {
										const showRemove =
											otherDocumentFiles.length > 1 && upload.file !== null;
										return (
											<div
												key={upload.id}
												className="flex flex-col gap-2 text-sm border rounded p-3"
											>
												<div className="flex items-center justify-between gap-2">
													<span className="font-medium">Other document</span>
													<span className="text-xs px-2 py-0.5 rounded-full border bg-gray-100 text-gray-700 border-gray-200">
														Optional
													</span>
												</div>
												<input
													type="file"
													onChange={(e) => {
														const file = e.target.files?.[0] ?? null;
														handleOtherDocumentChange(upload.id, file);
													}}
													disabled={disabled}
												/>
												{upload.file ? (
													<span className="text-xs text-gray-600">
														Selected: {upload.file.name}
													</span>
												) : null}
												{showRemove ? (
													<button
														type="button"
														onClick={() => handleRemoveOtherDocument(upload.id)}
														className="self-start text-xs px-2 py-1 rounded border hover:bg-gray-50"
													>
														Remove
													</button>
												) : null}
											</div>
										);
									})}
								</div>
							</div>
						)}

						{formError ? (
							<div className="text-sm text-red-700">{formError}</div>
						) : null}

						<div className="flex gap-3">
							{currentStep === 1 ? (
								<button
									type="button"
									onClick={handleNextStep}
									className="px-4 py-2 rounded bg-blue-600 text-white shadow hover:bg-blue-700"
									disabled={disabled}
								>
									Next: Upload documents
								</button>
							) : (
								<>
									<button
										type="button"
										onClick={() => setCurrentStep(1)}
										className="px-4 py-2 rounded border text-sm hover:bg-gray-50"
									>
										Back
									</button>
									<button
										type="button"
										onClick={handleSubmit}
										className="px-4 py-2 rounded bg-emerald-600 text-white shadow hover:bg-emerald-700"
										disabled={disabled}
									>
                    Submit Application
									</button>
								</>
							)}
							<Link
								to="/loan/applications"
								className="px-4 py-2 rounded border text-sm hover:bg-gray-50"
							>
								Cancel
							</Link>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
