import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import DocumentRequirementsSection, {
	createDocumentRequirementDocument,
	createDocumentRequirementItem,
	type DocumentRequirementItem,
} from "@/components/loan/DocumentRequirementsSection";
import TenorInterestSection from "@/components/loan/TenorInterestSection";
import {
	type ChannelConfig,
	cloneLoanProduct,
	DEFAULT_REQUIRED_DOCUMENTS,
	type DisbursementDestination,
	type DisbursementDestinationType,
	type InterestRatePlan,
	type LoanProduct,
	TenorUnit,
	useLoanSetupStore,
} from "@/lib/loan-setup-store";
import {
	getRepaymentPlanList,
	useRepaymentSetupStore,
} from "@/lib/repayment-setup-store";
import { getWorkflowList, useWorkflowStore } from "@/lib/workflow-store";
import {
	evaluateScoreCard,
	inferFieldKind,
	type ScoreEngineResult,
} from "../../../lib/scorecard-engine";
import { type Rule, useScoreCardStore } from "../../../lib/scorecard-store";

export const Route = createFileRoute("/loan/setup/")({
	component: LoanSetup,
});

// --------------------
// Loan Product Setup
// --------------------
const loanProductSetup: LoanProduct = {
	productCode: "",
	productName: "",
	minAmount: 500000,
	maxAmount: 10000000,
	loanTenor: {
		id: "default-tenor",
		TenorUnit: TenorUnit.MONTH,
		TenorValue: [6, 12, 18, 24],
	},
	baseInterestRate: 18.5,
	interestRatePlans: [
		{
			interestType: "REDUCING",
			rateType: "FIXED",
			baseRate: 18.5,
			config: {
				parameters: [
					{ name: "DOWN_PAYMENT", value: 30, interestRate: 12 },
					{ name: "DOWN_PAYMENT", value: 40, interestRate: 10 },
				],
			},
			policies: [{ interestCategory: "OUTSTANDING", interestRate: 1.9 }],
		},
	],
};

const collateralDocumentType = "COLLATERAL";
const collateralDocumentTypeId = `DOC-${collateralDocumentType}`;

const ensureSecuredCollateralDocuments = (
	items: DocumentRequirementItem[],
	isSecured: boolean,
	isMandatory: boolean,
) => {
	if (!isSecured) return items;
	let changed = false;
	const nextItems = items.map((item) => {
		const docIndex = item.documents.findIndex(
			(doc) => doc.documentTypeId === collateralDocumentTypeId,
		);
		if (docIndex === -1) {
			changed = true;
			return {
				...item,
				documents: [
					...item.documents,
					createDocumentRequirementDocument(collateralDocumentType, {
						collateralRequired: true,
						isMandatory,
					}),
				],
			};
		}

		const existing = item.documents[docIndex];
		const needsUpdate =
			existing.collateralRequired !== true ||
			(isMandatory && !existing.isMandatory);
		if (!needsUpdate) return item;
		changed = true;
		return {
			...item,
			documents: item.documents.map((doc, idx) =>
				idx === docIndex
					? {
							...doc,
							collateralRequired: true,
							isMandatory: isMandatory ? true : doc.isMandatory,
						}
					: doc,
			),
		};
	});
	return changed ? nextItems : items;
};

type FieldDefinition = {
	id: string;
	key: string;
	label: string;
	description: string;
	defaultValue: number;
};

type CustomEmiType = {
	id: string;
	name: string;
	principalFormula: string;
	interestFormula: string;
	fieldDefinitions: FieldDefinition[];
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

type CustomEmiPreview = {
	emi: number;
	totalPayment: number;
	totalInterest: number;
	error: string | null;
};

type PaymentScheduleType = "fixed-day" | "month-end" | "daily-accrual";
type MonthEndFirstPayment = "this-month-end" | "next-month-end";

const customEmiTypesStorageKey = "loan-custom-emi-types";

const formatCurrency = (val: number) =>
	new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "MMK",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(val);

const isValidFieldKey = (key: string) => /^[A-Za-z_]\w*$/.test(key);

const toTenureMonths = (unit: TenorUnit, value: number) => {
	if (unit === TenorUnit.YEAR) return value * 12;
	if (unit === TenorUnit.DAY) return Math.max(1, Math.round(value / 30));
	return value;
};

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

const evalFormulaNode = (
	node: ExpressionNode,
	context: FormulaContext,
): number => {
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

const calculateCustomEmi = (
	amount: number,
	rateAnnual: number,
	tenureMonths: number,
	customType: CustomEmiType | null,
	customFieldValues: Record<string, number>,
	startDate: Date,
	paymentScheduleType: PaymentScheduleType,
	monthEndFirstPayment: MonthEndFirstPayment,
): CustomEmiPreview => {
	if (!customType) {
		return {
			emi: 0,
			totalPayment: 0,
			totalInterest: 0,
			error: "Select a custom EMI type.",
		};
	}
	if (amount <= 0 || tenureMonths <= 0) {
		return {
			emi: 0,
			totalPayment: 0,
			totalInterest: 0,
			error: "Loan amount and tenure must be positive.",
		};
	}
	if (!customType.principalFormula.trim()) {
		return {
			emi: 0,
			totalPayment: 0,
			totalInterest: 0,
			error: "Principal formula is required.",
		};
	}
	if (!customType.interestFormula.trim()) {
		return {
			emi: 0,
			totalPayment: 0,
			totalInterest: 0,
			error: "Interest formula is required.",
		};
	}

	let parsedFormulaNodes: {
		principalNode: ExpressionNode;
		interestNode: ExpressionNode;
	};
	try {
		parsedFormulaNodes = {
			principalNode: parseFormula(customType.principalFormula),
			interestNode: parseFormula(customType.interestFormula),
		};
	} catch (error) {
		return {
			emi: 0,
			totalPayment: 0,
			totalInterest: 0,
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
	let totalPaid = 0;
	let totalInterestPaid = 0;
	let prevPayment = 0;
	let prevPrincipal = 0;
	let prevInterest = 0;
	let previousDate = startDate;
	let firstPayment = 0;

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

		for (const field of customType.fieldDefinitions) {
			if (!isValidFieldKey(field.key)) {
				continue;
			}
			context[field.key] = customFieldValues[field.key] ?? field.defaultValue;
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
		totalPaid += payment;
		totalInterestPaid += interest;
		prevPayment = payment;
		prevPrincipal = principal;
		prevInterest = interest;
		previousDate = paymentDate;
		if (i === 1) {
			firstPayment = payment;
		}
	}

	return {
		emi: firstPayment,
		totalPayment: totalPaid,
		totalInterest: totalInterestPaid,
		error: null,
	};
};

function LoanSetup() {
	const navigate = useNavigate();

	const scoreCards = useScoreCardStore((s) => s.scoreCards);
	const selectedScoreCardId = useScoreCardStore((s) => s.selectedScoreCardId);
	const selectScoreCard = useScoreCardStore((s) => s.selectScoreCard);
	const workflows = useWorkflowStore((s) => s.workflows);
	const selectedWorkflowId = useWorkflowStore((s) => s.selectedWorkflowId);
	const selectWorkflow = useWorkflowStore((s) => s.selectWorkflow);
	const addLoanSetup = useLoanSetupStore((s) => s.addSetup);
	const repaymentPlans = useRepaymentSetupStore((s) => s.plans);
	const selectedRepaymentPlanId = useRepaymentSetupStore(
		(s) => s.selectedPlanId,
	);
	const selectRepaymentPlan = useRepaymentSetupStore((s) => s.selectPlan);
	const configuredScoreCard = scoreCards[selectedScoreCardId];
	const configuredScoreCardFallback = useMemo(() => {
		return Object.values(scoreCards)[0];
	}, [scoreCards]);
	const activeScoreCard = configuredScoreCard ?? configuredScoreCardFallback;

	const [product, setProduct] = useState<LoanProduct>(() =>
		cloneLoanProduct(loanProductSetup),
	);
	const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
	const [riskResult, setRiskResult] = useState<ScoreEngineResult | null>(null);
	const [documentRequirements, setDocumentRequirements] = useState<
		DocumentRequirementItem[]
	>(() => [createDocumentRequirementItem("LOW", DEFAULT_REQUIRED_DOCUMENTS)]);
	const [isSecuredLoan, setIsSecuredLoan] = useState(false);
	const [customEmiTypes, setCustomEmiTypes] = useState<CustomEmiType[]>([]);
	const [selectedCustomEmiTypeId, setSelectedCustomEmiTypeId] =
		useState<string>("");
	const [customEmiFieldValues, setCustomEmiFieldValues] = useState<
		Record<string, number>
	>({});
	const [customEmiAmount, setCustomEmiAmount] = useState<number>(
		loanProductSetup.minAmount,
	);
	const [customEmiTenorValue, setCustomEmiTenorValue] = useState<number>(
		loanProductSetup.loanTenor.TenorValue[0] ?? 0,
	);
	const [customEmiLoadError, setCustomEmiLoadError] = useState<string | null>(
		null,
	);
	const [channels, setChannels] = useState<ChannelConfig[]>([
		{ name: "", code: "" },
	]);
	const [destinationTypes, setDestinationTypes] = useState<
		DisbursementDestinationType[]
	>(["BANK", "WALLET"]);
	const destinationOptions: Array<{
		type: DisbursementDestinationType;
		label: string;
		hint: string;
	}> = [
		{
			type: "BANK",
			label: "Bank transfer",
			hint: "Send to any linked bank account. Details captured later in the journey.",
		},
		{
			type: "WALLET",
			label: "Mobile wallet",
			hint: "Push to KBZpay or other supported wallets without collecting account numbers here.",
		},
	];
	const workflowList = useMemo(() => getWorkflowList(workflows), [workflows]);
	const repaymentPlanList = useMemo(
		() => getRepaymentPlanList(repaymentPlans),
		[repaymentPlans],
	);
	const activeRepaymentPlan = useMemo(() => {
		if (selectedRepaymentPlanId && repaymentPlans[selectedRepaymentPlanId]) {
			return repaymentPlans[selectedRepaymentPlanId];
		}
		return repaymentPlanList[0];
	}, [repaymentPlanList, repaymentPlans, selectedRepaymentPlanId]);

	const [bureauRequired, setBureauRequired] = useState(false);
	const [bureauProvider, setBureauProvider] = useState("MMCB");
	const [bureauPurpose, setBureauPurpose] = useState("Credit assessment");
	const [bureauConsentRequired, setBureauConsentRequired] = useState(true);

	const handleTextChange =
		(field: "productCode" | "productName") =>
		(e: ChangeEvent<HTMLInputElement>) => {
			const { value } = e.target;
			setProduct((prev) => ({ ...prev, [field]: value }));
		};

	const handleNumberChange =
		(field: "minAmount" | "maxAmount") =>
		(e: ChangeEvent<HTMLInputElement>) => {
			const { value } = e.target;
			const parsed = Number(value);
			setProduct((prev) => ({
				...prev,
				[field]: Number.isFinite(parsed) ? parsed : prev[field],
			}));
		};

	const updateTenureUnit = (e: ChangeEvent<HTMLSelectElement>) => {
		const unit = e.target.value as TenorUnit;
		setProduct((prev) => ({
			...prev,
			loanTenor: {
				...prev.loanTenor,
				TenorUnit: unit,
			},
		}));
	};

	const addTenureValue = () => {
		setProduct((prev) => ({
			...prev,
			loanTenor: {
				...prev.loanTenor,
				TenorValue: [...prev.loanTenor.TenorValue, 0],
			},
		}));
	};

	const updateTenureValue =
		(index: number) => (e: ChangeEvent<HTMLInputElement>) => {
			const val = Number(e.target.value);
			setProduct((prev) => {
				const nextValues = [...prev.loanTenor.TenorValue];
				nextValues[index] = Number.isFinite(val) ? val : nextValues[index];
				return {
					...prev,
					loanTenor: {
						...prev.loanTenor,
						TenorValue: nextValues,
					},
				};
			});
		};

	const removeTenureValue = (index: number) => {
		setProduct((prev) => {
			const nextValues = prev.loanTenor.TenorValue.filter(
				(_, i) => i !== index,
			);
			return {
				...prev,
				loanTenor: {
					...prev.loanTenor,
					TenorValue: nextValues,
				},
			};
		});
	};

	const updateInterestPlans = (plans: InterestRatePlan[]) => {
		setProduct((prev) => ({
			...prev,
			interestRatePlans: plans,
			baseInterestRate: plans[0]?.baseRate ?? prev.baseInterestRate,
		}));
	};

	const primaryInterestPlan = product.interestRatePlans?.[0];

	const scoreCardList = useMemo(() => {
		return Object.values(scoreCards).sort((a, b) =>
			(a.name || a.scoreCardId).localeCompare(b.name || b.scoreCardId),
		);
	}, [scoreCards]);

	const configuredFields = useMemo(() => {
		return activeScoreCard
			? [...activeScoreCard.fields.map((f) => f.field)].sort((a, b) =>
					a.localeCompare(b),
				)
			: [];
	}, [activeScoreCard]);

	const rulesByField = useMemo<Record<string, Rule[]>>(() => {
		if (!activeScoreCard) return {};
		const acc: Record<string, Rule[]> = {};
		for (const field of activeScoreCard.fields) {
			acc[field.field] = [...(field.rules ?? [])];
		}
		return acc;
	}, [activeScoreCard]);

	useEffect(() => {
		try {
			const stored = localStorage.getItem(customEmiTypesStorageKey);
			if (!stored) {
				return;
			}
			const parsed: unknown = JSON.parse(stored);
			if (!Array.isArray(parsed) || parsed.length === 0) {
				return;
			}

			const restoredTypes = parsed
				.filter(
					(item): item is Record<string, unknown> =>
						!!item && typeof item === "object",
				)
				.map((item) => {
					const rawFields = item.fieldDefinitions;
					const fieldDefinitions = Array.isArray(rawFields)
						? rawFields
								.filter(
									(field): field is Record<string, unknown> =>
										!!field && typeof field === "object",
								)
								.map((field) => ({
									id:
										typeof field.id === "string" && field.id
											? field.id
											: `${Date.now().toString(36)}-${Math.random()
													.toString(36)
													.slice(2, 8)}`,
									key: typeof field.key === "string" ? field.key : "",
									label: typeof field.label === "string" ? field.label : "",
									description:
										typeof field.description === "string"
											? field.description
											: "",
									defaultValue:
										typeof field.defaultValue === "number"
											? field.defaultValue
											: Number(field.defaultValue) || 0,
								}))
						: [];

					return {
						id:
							typeof item.id === "string" && item.id
								? item.id
								: `${Date.now().toString(36)}-${Math.random()
										.toString(36)
										.slice(2, 8)}`,
						name: typeof item.name === "string" ? item.name : "Custom Type",
						principalFormula:
							typeof item.principalFormula === "string"
								? item.principalFormula
								: "0",
						interestFormula:
							typeof item.interestFormula === "string"
								? item.interestFormula
								: "0",
						fieldDefinitions,
					} as CustomEmiType;
				});

			if (restoredTypes.length > 0) {
				setCustomEmiTypes(restoredTypes);
			}
		} catch {
			setCustomEmiLoadError("Failed to load saved custom EMI types.");
		}
	}, []);

	useEffect(() => {
		if (customEmiTypes.length === 0) {
			setSelectedCustomEmiTypeId("");
			return;
		}
		if (
			!selectedCustomEmiTypeId ||
			!customEmiTypes.some((item) => item.id === selectedCustomEmiTypeId)
		) {
			setSelectedCustomEmiTypeId(customEmiTypes[0]?.id ?? "");
		}
	}, [customEmiTypes, selectedCustomEmiTypeId]);

	const selectedCustomEmiType = useMemo(
		() =>
			customEmiTypes.find((item) => item.id === selectedCustomEmiTypeId) ??
			null,
		[customEmiTypes, selectedCustomEmiTypeId],
	);

	const customEmiStartDate = useMemo(() => new Date(), []);
	const customEmiRate =
		primaryInterestPlan?.baseRate ?? product.baseInterestRate ?? 0;
	const customEmiPreview = useMemo(() => {
		const tenureMonths = toTenureMonths(
			product.loanTenor.TenorUnit,
			customEmiTenorValue,
		);
		return calculateCustomEmi(
			customEmiAmount,
			customEmiRate,
			tenureMonths,
			selectedCustomEmiType,
			customEmiFieldValues,
			customEmiStartDate,
			"fixed-day",
			"this-month-end",
		);
	}, [
		customEmiAmount,
		customEmiFieldValues,
		customEmiRate,
		customEmiStartDate,
		customEmiTenorValue,
		product.loanTenor.TenorUnit,
		selectedCustomEmiType,
	]);

	useEffect(() => {
		if (!selectedCustomEmiType) {
			setCustomEmiFieldValues({});
			return;
		}
		setCustomEmiFieldValues((prev) => {
			const next: Record<string, number> = {};
			for (const def of selectedCustomEmiType.fieldDefinitions) {
				next[def.key] = prev[def.key] ?? def.defaultValue;
			}
			return next;
		});
	}, [selectedCustomEmiType]);

	useEffect(() => {
		const values = product.loanTenor.TenorValue;
		if (values.length === 0) {
			setCustomEmiTenorValue(0);
			return;
		}
		if (!values.includes(customEmiTenorValue)) {
			setCustomEmiTenorValue(values[0] ?? 0);
		}
	}, [customEmiTenorValue, product.loanTenor.TenorValue]);

	useEffect(() => {
		setCustomEmiAmount((prev) => (prev > 0 ? prev : product.minAmount));
	}, [product.minAmount]);

	useEffect(() => {
		setScoreInputs((prev) => {
			const next: Record<string, string> = {};
			for (const field of configuredFields) {
				next[field] = prev[field] ?? "";
			}
			return next;
		});
		setRiskResult(null);
	}, [configuredFields]);

	useEffect(() => {
		setDocumentRequirements((prev) =>
			ensureSecuredCollateralDocuments(prev, isSecuredLoan, true),
		);
	}, [documentRequirements, isSecuredLoan]);

	const resetProduct = () => {
		setProduct(cloneLoanProduct(loanProductSetup));
	};

	const addChannelRow = () => {
		setChannels((prev) => [...prev, { name: "", code: "" }]);
	};

	const updateChannel =
		(index: number, field: "name" | "code") =>
		(e: ChangeEvent<HTMLInputElement>) => {
			const { value } = e.target;
			setChannels((prev) => {
				const next = [...prev];
				const current = next[index] ?? { name: "", code: "" };
				next[index] = { ...current, [field]: value };
				return next;
			});
		};

	const removeChannelRow = (index: number) => {
		setChannels((prev) => {
			if (prev.length === 1) return [{ name: "", code: "" }];
			return prev.filter((_, idx) => idx !== index);
		});
	};

	const toggleDestination = (type: DisbursementDestinationType) => {
		setDestinationTypes((prev) => {
			if (prev.includes(type)) return prev.filter((item) => item !== type);
			return [...prev, type];
		});
	};

	const onEvaluateScore = () => {
		if (!activeScoreCard) return;
		const result = evaluateScoreCard(activeScoreCard, scoreInputs);
		setRiskResult(result);
	};

	const onSaveLoanSetup = () => {
		const mappedDestinations = destinationTypes.map((type) =>
			type === "BANK"
				? ({ type: "BANK" } satisfies DisbursementDestination)
				: ({ type: "WALLET" } satisfies DisbursementDestination),
		);

		const effectiveRequirements = ensureSecuredCollateralDocuments(
			documentRequirements,
			isSecuredLoan,
			true,
		);

		const normalizedRequirements = effectiveRequirements.flatMap(
			(requirement) =>
				requirement.documents.map((document) => ({
					documentTypeId: document.documentTypeId,
					minAmount: document.minAmount,
					maxAmount: document.maxAmount,
					employmentType: document.employmentType,
					collateralRequired: document.collateralRequired,
					riskGrade: requirement.grade,
					isMandatory: document.isMandatory,
				})),
		);

		addLoanSetup({
			product,
			channels,
			isSecuredLoan,
			scorecardId: activeScoreCard?.scoreCardId ?? null,
			scorecardName: activeScoreCard?.name ?? null,
			workflowId: selectedWorkflowId,
			workflowName: selectedWorkflowId
				? (workflows[selectedWorkflowId]?.name ?? "(unnamed workflow)")
				: null,
			customEmiTypeId: selectedCustomEmiType?.id ?? null,
			customEmiTypeName: selectedCustomEmiType?.name ?? null,
			customEmiPrincipalFormula:
				selectedCustomEmiType?.principalFormula ?? null,
			customEmiInterestFormula: selectedCustomEmiType?.interestFormula ?? null,
			customEmiFieldValues: selectedCustomEmiType
				? { ...customEmiFieldValues }
				: null,
			riskResult,
			documentRequirements: normalizedRequirements,
			disbursementType: "FULL",
			partialInterestRate: null,
			disbursementDestinations: mappedDestinations,
			repaymentPlan: activeRepaymentPlan ?? null,
			bureauProvider: bureauRequired ? bureauProvider : undefined,
			bureauPurpose: bureauRequired ? bureauPurpose : undefined,
			bureauConsentRequired: bureauRequired ? bureauConsentRequired : undefined,
			bureauCheckRequired: bureauRequired,
		});
		navigate({ to: "/loan" });
	};

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold">
					Loan Product Setup & Workflow (React)
				</h1>
				<div className="flex justify-end gap-2">
					<Link
						to="/loan/scorecard-setup"
						className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
					>
						Configure Scorecard
					</Link>
					<Link
						to="/workflow"
						className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
					>
						Configure workflow
					</Link>
				</div>
			</div>

			{/* Product Setup */}
			<section className="border p-4 rounded mb-6">
				<div className="flex items-center justify-between mb-3">
					<h2 className="font-semibold">Loan Product</h2>
					<button
						onClick={resetProduct}
						type="button"
						className="text-sm border px-2 py-1 rounded hover:bg-gray-100"
					>
						Reset
					</button>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label className="flex flex-col gap-1 text-sm">
						<span>Product Code</span>
						<input
							type="text"
							value={product.productCode}
							onChange={handleTextChange("productCode")}
							className="border px-2 py-1 rounded"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Product Name</span>
						<input
							type="text"
							value={product.productName}
							onChange={handleTextChange("productName")}
							className="border px-2 py-1 rounded"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Minimum Amount</span>
						<input
							type="number"
							min={0}
							value={product.minAmount}
							onChange={handleNumberChange("minAmount")}
							className="border px-2 py-1 rounded"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Maximum Amount</span>
						<input
							type="number"
							min={0}
							value={product.maxAmount}
							onChange={handleNumberChange("maxAmount")}
							className="border px-2 py-1 rounded"
						/>
					</label>

					<section className="border p-4 rounded mb-6 col-span-2">
						<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-3">
							<div>
								<h2 className="font-semibold">Loan Security</h2>
								<div className="text-xs text-gray-600">
									Choose whether the loan is secured by collateral.
								</div>
							</div>
						</div>
						<div className="flex flex-wrap gap-6 text-sm">
							<label className="flex items-center gap-2">
								<input
									type="radio"
									name="loan-security"
									checked={isSecuredLoan}
									onChange={() => setIsSecuredLoan(true)}
								/>
								<span>Secured</span>
							</label>
							<label className="flex items-center gap-2">
								<input
									type="radio"
									name="loan-security"
									checked={!isSecuredLoan}
									onChange={() => setIsSecuredLoan(false)}
								/>
								<span>Unsecured</span>
							</label>
						</div>
						<p className="text-xs text-gray-600 mt-2">
							Secured loans require collateral document types for all risk
							grades.
						</p>
					</section>

					<TenorInterestSection
						product={product}
						onUpdateTenureUnit={updateTenureUnit}
						onAddTenureValue={addTenureValue}
						onUpdateTenureValue={updateTenureValue}
						onRemoveTenureValue={removeTenureValue}
						onInterestPlansChange={updateInterestPlans}
					/>
				</div>

				<div className="bg-gray-50 border rounded p-3 text-sm mt-4">
					<div className="font-semibold mb-2">Preview</div>
					<dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
						<div>
							<dt className="text-gray-600">Code</dt>
							<dd className="font-mono">{product.productCode}</dd>
						</div>
						<div>
							<dt className="text-gray-600">Name</dt>
							<dd>{product.productName}</dd>
						</div>
						<div>
							<dt className="text-gray-600">Amount Range</dt>
							<dd className="font-mono">
								{product.minAmount.toLocaleString()} -{" "}
								{product.maxAmount.toLocaleString()}
							</dd>
						</div>
						<div>
							<dt className="text-gray-600">Tenure</dt>
							<dd className="font-mono">
								{product.loanTenor.TenorValue.length
									? `${product.loanTenor.TenorValue.join(", ")} ${product.loanTenor.TenorUnit}`
									: "None"}
							</dd>
						</div>
						<div>
							<dt className="text-gray-600">Base Rate</dt>
							<dd className="font-mono">
								{primaryInterestPlan
									? `${primaryInterestPlan.baseRate}% (${primaryInterestPlan.interestType} · ${primaryInterestPlan.rateType})`
									: "—"}
							</dd>
						</div>
					</dl>
				</div>
			</section>

			<section className="border p-4 rounded mb-6">
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-3">
					<div>
						<h2 className="font-semibold">Custom Calculation Formula</h2>
						<div className="text-xs text-gray-600">
							Pick a saved formula to preview the EMI calculation here.
						</div>
					</div>
					<Link
						to="/loan/emi-custom-calculator"
						className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
					>
						Manage formulas
					</Link>
				</div>

				{customEmiLoadError && (
					<div className="text-sm text-red-700 border rounded p-3 bg-red-50">
						{customEmiLoadError}
					</div>
				)}

				{customEmiTypes.length === 0 ? (
					<div className="text-sm text-gray-700 border rounded p-3 bg-gray-50">
						No saved custom EMI types yet. Create one in the custom EMI
						calculator to use it here.
					</div>
				) : (
					<div className="space-y-4">
						<label className="flex flex-col gap-1 text-sm">
							<span>Custom Calculation Type</span>
							<select
								value={selectedCustomEmiTypeId}
								onChange={(e) => setSelectedCustomEmiTypeId(e.target.value)}
								className="border px-2 py-2 rounded"
							>
								{customEmiTypes.map((type) => (
									<option key={type.id} value={type.id}>
										{type.name}
									</option>
								))}
							</select>
						</label>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<label className="flex flex-col gap-1 text-sm">
								<span>Sample Amount</span>
								<input
									type="number"
									min={0}
									value={customEmiAmount}
									onChange={(e) =>
										setCustomEmiAmount(Number(e.target.value) || 0)
									}
									className="border px-2 py-2 rounded"
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>Tenure ({product.loanTenor.TenorUnit})</span>
								<select
									value={customEmiTenorValue}
									onChange={(e) =>
										setCustomEmiTenorValue(Number(e.target.value) || 0)
									}
									className="border px-2 py-2 rounded"
									disabled={product.loanTenor.TenorValue.length === 0}
								>
									{product.loanTenor.TenorValue.length === 0 ? (
										<option value={0}>No tenure options</option>
									) : (
										product.loanTenor.TenorValue.map((value) => (
											<option key={value} value={value}>
												{value}
											</option>
										))
									)}
								</select>
							</label>
							<div className="flex flex-col gap-1 text-sm">
								<span>Base Rate</span>
								<div className="border px-2 py-2 rounded bg-gray-50 text-gray-700">
									{customEmiRate}%
								</div>
							</div>
						</div>

						{(selectedCustomEmiType?.fieldDefinitions.length ?? 0) > 0 && (
							<div className="space-y-3">
								<h3 className="font-medium text-sm text-gray-800">
									Custom Field Values
								</h3>
								<div className="grid gap-3 sm:grid-cols-2">
									{selectedCustomEmiType?.fieldDefinitions.map((field) => (
										<div key={field.id}>
											<label
												className="block text-sm font-medium mb-1 text-gray-700"
												htmlFor="testing"
											>
												{field.label || field.key}
											</label>
											<input
												type="number"
												value={
													customEmiFieldValues[field.key] ?? field.defaultValue
												}
												onChange={(e) =>
													setCustomEmiFieldValues((prev) => ({
														...prev,
														[field.key]: Number(e.target.value) || 0,
													}))
												}
												className="w-full border p-2 rounded"
											/>
											{field.description && (
												<p className="text-xs text-gray-500 mt-1">
													{field.description}
												</p>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						<div className="bg-gray-50 border rounded p-3 text-sm">
							<div className="font-semibold mb-2">Preview</div>
							<dl className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-700">
								<div>
									<dt>First Period EMI</dt>
									<dd className="font-semibold">
										{formatCurrency(customEmiPreview.emi)}
									</dd>
								</div>
								<div>
									<dt>Total Interest</dt>
									<dd>{formatCurrency(customEmiPreview.totalInterest)}</dd>
								</div>
								<div>
									<dt>Total Payment</dt>
									<dd>{formatCurrency(customEmiPreview.totalPayment)}</dd>
								</div>
							</dl>
							{customEmiPreview.error && (
								<div className="mt-2 text-xs text-red-700">
									{customEmiPreview.error}
								</div>
							)}
						</div>
					</div>
				)}
			</section>

			{/* Scorecard */}
			<section className="border p-4 rounded mb-6">
				<div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between mb-3">
					<div>
						<h2 className="font-semibold">
							Scorecard Engine — {activeScoreCard?.name ?? "(none)"}
							{activeScoreCard ? ` (Max: ${activeScoreCard.maxScore})` : ``}
						</h2>
						<div className="text-xs text-gray-600">
							Select a saved scorecard to drive the inputs.
						</div>
					</div>
					<label className="flex flex-col gap-1 text-sm">
						<span>Scorecard</span>
						<select
							value={selectedScoreCardId}
							onChange={(e: ChangeEvent<HTMLSelectElement>) =>
								selectScoreCard(e.target.value)
							}
							className="border px-2 py-2 rounded"
						>
							{scoreCardList.map((c) => (
								<option key={c.scoreCardId} value={c.scoreCardId}>
									{c.name || c.scoreCardId}
								</option>
							))}
						</select>
					</label>
				</div>

				{configuredFields.length === 0 ? (
					<div className="text-sm text-gray-700 border rounded p-3 bg-gray-50">
						No fields configured in this scorecard yet. Add fields/conditions in
						the setup page.
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						{configuredFields.map((field) => {
							const kind = inferFieldKind(rulesByField[field] ?? []);
							const inputId = `score-${field}`;
							return (
								<div key={field} className="flex flex-col gap-1 text-sm">
									<label htmlFor={inputId}>
										<span>{field}</span>
									</label>
									{kind === "boolean" ? (
										<select
											id={inputId}
											value={scoreInputs[field] ?? ""}
											onChange={(e: ChangeEvent<HTMLSelectElement>) =>
												setScoreInputs((prev) => ({
													...prev,
													[field]: e.target.value,
												}))
											}
											className="border px-2 py-2 rounded"
										>
											<option value="">(not set)</option>
											<option value="true">true</option>
											<option value="false">false</option>
										</select>
									) : (
										<input
											id={inputId}
											type={kind === "number" ? "number" : "text"}
											value={scoreInputs[field] ?? ""}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												setScoreInputs((prev) => ({
													...prev,
													[field]: e.target.value,
												}))
											}
											className="border px-2 py-2 rounded"
											placeholder={
												(rulesByField[field] ?? []).some(
													(r) => r.operator === "between",
												)
													? "For between: e.g. 25,45"
													: ""
											}
										/>
									)}
								</div>
							);
						})}
					</div>
				)}

				<div className="flex gap-2 items-center">
					<button
						onClick={onEvaluateScore}
						className="bg-blue-600 text-white px-3 py-1 rounded"
						type="button"
					>
						Evaluate Score
					</button>
					<button
						onClick={() =>
							setScoreInputs((prev) => {
								const next: Record<string, string> = { ...prev };
								for (const f of configuredFields) {
									next[f] = "";
								}
								return next;
							})
						}
						type="button"
						className="text-sm border px-2 py-1 rounded hover:bg-gray-100"
					>
						Reset Inputs
					</button>
					{riskResult && (
						<span className="text-sm text-gray-700">
							Score: {riskResult.totalScore} / {riskResult.maxScore} —{" "}
							{riskResult.riskGrade}
						</span>
					)}
				</div>

				{riskResult && (
					<div className="mt-4 space-y-3">
						<div className="bg-green-50 border rounded p-3 text-sm">
							<div className="font-semibold">Score Breakdown</div>
							<div className="text-gray-700 mb-2">
								Matched {riskResult.matchedRules} of{" "}
								{riskResult.breakdown.length} rules
							</div>
							<ul className="space-y-1">
								{riskResult.breakdown.map((item, idx) => (
									<li
										key={"${item.field}-${idx}"}
										className={`flex justify-between gap-2 ${
											item.matched ? "text-green-700" : "text-gray-500"
										}`}
									>
										<span>
											{item.fieldDescription} ({item.field}) {item.operator}{" "}
											{item.value}
										</span>
										<span>{item.matched ? `+${item.score}` : `0`}</span>
									</li>
								))}
							</ul>
						</div>
						<div className="bg-gray-50 border rounded p-3 text-sm">
							<div className="font-semibold mb-2">Decision Engine</div>
							{riskResult.riskGrade === "LOW" ? (
								<div className="p-3 rounded bg-green-100 border-green-300 text-green-800">
									<h3 className="font-bold">Auto-Approved</h3>
									<p>
										The application meets all criteria for automatic approval.
										Proceed to the next step.
									</p>
								</div>
							) : riskResult.riskGrade === "MEDIUM" ? (
								<div className="p-3 rounded bg-yellow-100 border-yellow-300 text-yellow-800">
									<h3 className="font-bold">Manual Review Required</h3>
									<p>
										The application requires manual review by an underwriter.
										Additional documents may be requested.
									</p>
								</div>
							) : (
								<div className="p-3 rounded bg-red-100 border-red-300 text-red-800">
									<h3 className="font-bold">Auto-Rejected</h3>
									<p>
										The application does not meet the minimum criteria for a
										loan.
									</p>
								</div>
							)}
						</div>
					</div>
				)}
			</section>

			<DocumentRequirementsSection
				riskResult={riskResult}
				requirements={documentRequirements}
				onChangeRequirements={setDocumentRequirements}
			/>

			{/* Bureau */}
			<section className="border p-4 rounded mb-6">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-3">
					<div>
						<h2 className="font-semibold">Bureau</h2>
						<div className="text-xs text-gray-600">
							Configure credit bureau integration settings.
						</div>
					</div>
					<label className="flex items-center gap-2 text-sm">
						<span>Bureau check required</span>
						<input
							type="checkbox"
							className="h-4 w-4"
							checked={bureauRequired}
							onChange={(e) => setBureauRequired(e.target.checked)}
						/>
					</label>
				</div>

				{bureauRequired && (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
						<label className="flex flex-col gap-1 text-sm">
							<span>Bureau provider</span>
							<input
								type="text"
								name="bureauProvider"
								value={bureauProvider}
								onChange={(e) => setBureauProvider(e.target.value)}
								className="border px-2 py-1 rounded"
								placeholder="e.g., MMCB"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span>Bureau purpose</span>
							<input
								type="text"
								name="bureauPurpose"
								value={bureauPurpose}
								onChange={(e) => setBureauPurpose(e.target.value)}
								className="border px-2 py-1 rounded"
								placeholder="e.g., Credit assessment"
							/>
						</label>
						<label className="flex flex-col gap-2 text-sm">
							<span>Bureau consent required</span>
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									className="h-4 w-4"
									checked={bureauConsentRequired}
									onChange={(e) => setBureauConsentRequired(e.target.checked)}
								/>
								<span className="text-xs text-gray-700">
									Indicates whether beneficiary consent must be captured before
									bureau pulls.
								</span>
							</div>
						</label>
					</div>
				)}
			</section>

			{/* Workflow selection */}
			<section className="border p-4 rounded mb-6">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="font-semibold">Workflow</h2>
						<div className="text-xs text-gray-600">
							Choose a saved workflow to visualize/apply.
						</div>
					</div>
					<select
						className="border px-2 py-2 rounded"
						value={selectedWorkflowId ?? ""}
						onChange={(e) => selectWorkflow(e.target.value || null)}
					>
						<option value="">(none selected)</option>
						{workflowList.map((wf) => (
							<option key={wf.workflowId} value={wf.workflowId}>
								{wf.name}
							</option>
						))}
					</select>
				</div>
				{selectedWorkflowId && workflows[selectedWorkflowId] ? (
					<div className="mt-3 text-xs text-gray-700">
						<span className="font-semibold">Selected:</span>{" "}
						{workflows[selectedWorkflowId].name}
					</div>
				) : null}
			</section>

			{/* Repayment */}
			<section className="border p-4 rounded mb-6">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-3">
					<div>
						<h2 className="font-semibold">Repayment</h2>
						<div className="text-xs text-gray-600">
							Choose a repayment plan configured in Repayment Setup.
						</div>
					</div>
					<div className="flex gap-2 flex-wrap">
						<select
							className="border px-2 py-2 rounded min-w-50"
							value={
								selectedRepaymentPlanId ?? activeRepaymentPlan?.planId ?? ""
							}
							onChange={(e) => selectRepaymentPlan(e.target.value || null)}
						>
							{repaymentPlanList.map((plan) => (
								<option key={plan.planId} value={plan.planId}>
									{plan.name}
								</option>
							))}
						</select>
						<Link
							to="/loan/repayment-setup"
							className="text-sm border px-3 py-2 rounded hover:bg-gray-100"
						>
							Manage plans
						</Link>
					</div>
				</div>

				{activeRepaymentPlan ? (
					<div className="bg-gray-50 border rounded p-3 text-sm">
						<div className="font-semibold mb-1">{activeRepaymentPlan.name}</div>
						<div className="text-xs text-gray-700 mb-2">
							{activeRepaymentPlan.method} · {activeRepaymentPlan.frequency}
						</div>
						<dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-700">
							<div>
								<dt>Due day</dt>
								<dd>{activeRepaymentPlan.dueDayOfMonth ?? "—"}</dd>
							</div>
							<div>
								<dt>Grace period</dt>
								<dd>{activeRepaymentPlan.gracePeriodDays} days</dd>
							</div>
							<div>
								<dt>Late fee</dt>
								<dd>
									{activeRepaymentPlan.lateFeeFlat.toLocaleString()} +{" "}
									{activeRepaymentPlan.lateFeePct}%
								</dd>
							</div>
							<div>
								<dt>Prepayment</dt>
								<dd>{activeRepaymentPlan.prepaymentPenaltyPct}%</dd>
							</div>
							<div>
								<dt>Autopay</dt>
								<dd>
									{activeRepaymentPlan.autopayRequired
										? "Required"
										: "Optional"}
								</dd>
							</div>
							<div>
								<dt>Rounding step</dt>
								<dd>{activeRepaymentPlan.roundingStep}</dd>
							</div>
						</dl>
						{activeRepaymentPlan.description ? (
							<p className="text-xs text-gray-700 mt-2">
								{activeRepaymentPlan.description}
							</p>
						) : null}
					</div>
				) : (
					<div className="text-sm text-gray-700">
						No repayment plans yet. Create one in Repayment Setup.
					</div>
				)}
			</section>

			{/* Channel configuration */}
			<section className="border p-4 rounded mb-6">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-3">
					<div>
						<h2 className="font-semibold">Channel Configuration</h2>
						<div className="text-xs text-gray-600">
							Add delivery channels with a display name and code.
						</div>
					</div>
					<button
						type="button"
						onClick={addChannelRow}
						className="text-sm border px-3 py-1 rounded hover:bg-gray-100"
					>
						Add channel
					</button>
				</div>

				<div className="space-y-3">
					{channels.map((channel, idx) => {
						const nameId = `channel-name-${idx}`;
						const codeId = `channel-code-${idx}`;
						return (
							<div
								key={`${channel.code || `code`}-${idx}`}
								className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
							>
								<label className="flex flex-col gap-1 text-sm" htmlFor={nameId}>
									<span>Channel name</span>
									<input
										id={nameId}
										type="text"
										value={channel.name}
										onChange={updateChannel(idx, "name")}
										className="border px-2 py-2 rounded"
										placeholder="e.g. WhatsApp"
									/>
								</label>
								<label className="flex flex-col gap-1 text-sm" htmlFor={codeId}>
									<span>Channel code</span>
									<input
										id={codeId}
										type="text"
										value={channel.code}
										onChange={updateChannel(idx, "code")}
										className="border px-2 py-2 rounded"
										placeholder="e.g. WA-01"
									/>
								</label>
								<button
									type="button"
									onClick={() => removeChannelRow(idx)}
									className="text-sm border px-3 py-2 rounded hover:bg-gray-100"
								>
									Remove
								</button>
							</div>
						);
					})}
				</div>
			</section>

			{/* Disbursement */}
			{/* <section className="border p-4 rounded mb-6">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-3">
					<div>
						<h2 className="font-semibold">Disbursement</h2>
						<div className="text-xs text-gray-600">
							Pick every destination you want to enable. We will collect account
							and wallet details later in the flow.
						</div>
					</div>
					<div className="text-xs text-gray-600">
						Multi-select — no bank setup here.
					</div>
				</div>

				<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
					{destinationOptions.map((option) => {
						const checked = destinationTypes.includes(option.type);
						return (
							<label
								key={option.type}
								className={`flex gap-3 border rounded p-3 text-sm transition hover:border-blue-300 ${
									checked ? "border-blue-500 bg-blue-50" : "border-gray-200"
								}`}
							>
								<input
									type="checkbox"
									className="mt-1 accent-blue-600"
									checked={checked}
									onChange={() => toggleDestination(option.type)}
								/>
								<div className="flex flex-col gap-1">
									<span className="font-semibold">{option.label}</span>
									<span className="text-xs text-gray-700">{option.hint}</span>
								</div>
							</label>
						);
					})}
				</div>

				{destinationTypes.length === 0 ? (
					<p className="text-xs text-red-700 mt-3">
						Choose at least one payout rail to proceed.
					</p>
				) : (
					<div className="mt-3 text-xs text-gray-700">
						Enabled: {destinationTypes.join(", ")}
					</div>
				)}
			</section> */}

			<section className="mt-8">
				<div className="flex flex-col gap-2">
					<button
						onClick={onSaveLoanSetup}
						type="button"
						className="w-full py-4 text-lg font-semibold bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700"
					>
						Save Product Setup
					</button>
					<div className="flex flex-col gap-1 text-sm text-gray-700 md:flex-row md:items-center md:justify-between"></div>
				</div>
			</section>
		</div>
	);
}
