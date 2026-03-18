import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/loan/emi-custom-calculator")({
	component: CustomEmiCalculator,
});

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

type ScheduleRow = {
	period: number;
	date: Date;
	payment: number;
	principal: number;
	interest: number;
	balance: number;
};

type CalculationSnapshot = {
	amount: number;
	rate: number;
	tenure: number;
	tenureType: "months" | "years";
	startDateIso: string;
	paymentScheduleType: PaymentScheduleType;
	monthEndFirstPayment: MonthEndFirstPayment;
	selectedCustomType: CustomEmiType | null;
	customFieldValues: Record<string, number>;
};

type PaymentScheduleType = "fixed-day" | "month-end" | "daily-accrual";
type MonthEndFirstPayment = "this-month-end" | "next-month-end";

const coreFieldDefinitions: Array<{
	key: string;
	label: string;
	description: string;
}> = [
	{
		key: "principal",
		label: "Principal",
		description: "Original loan amount.",
	},
	{
		key: "balance",
		label: "Balance",
		description: "Outstanding balance before current payment.",
	},
	{
		key: "rateMonthly",
		label: "Monthly Rate",
		description: "Monthly interest rate in decimal (annualRate/12/100).",
	},
	{
		key: "rateAnnual",
		label: "Annual Rate",
		description: "Annual interest rate in decimal (annualRate/100).",
	},
	{
		key: "rateDaily",
		label: "Daily Rate",
		description: "Daily interest rate in decimal (annualRate/365).",
	},
	{
		key: "period",
		label: "Period",
		description: "Current installment number starting at 1.",
	},
	{
		key: "tenureMonths",
		label: "Tenure Months",
		description: "Total tenure converted to months.",
	},
	{
		key: "remainingMonths",
		label: "Remaining Months",
		description: "Installments left including current period.",
	},
	{
		key: "daysInPeriod",
		label: "Days In Period",
		description: "Number of days between previous and current payment date.",
	},
	// {
	// 	key: "ratePeriod",
	// 	label: "Rate Per Period",
	// 	description:
	// 		"Effective rate for the current period; for daily accrual it equals annualRate * daysInPeriod / 365.",
	// },
	{
		key: "baseEmi",
		label: "Base EMI",
		description: "Standard reducing-balance EMI reference value.",
	},
	// {
	// 	key: "prevPayment",
	// 	label: "Previous Payment",
	// 	description: "Previous period payment amount.",
	// },
	// {
	// 	key: "prevPrincipal",
	// 	label: "Previous Principal",
	// 	description: "Previous period principal component.",
	// },
	// {
	// 	key: "prevInterest",
	// 	label: "Previous Interest",
	// 	description: "Previous period interest component.",
	// },
];

const supportedFunctions = [
	"min",
	"max",
	"abs",
	"round",
	"floor",
	"ceil",
	"pow",
	"sqrt",
	"log",
	"exp",
] as const;

const customEmiTypesStorageKey = "loan-custom-emi-types";

function createId() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultCustomTypes(): CustomEmiType[] {
	return [
		{
			id: createId(),
			name: "Interest Only",
			principalFormula: "0",
			interestFormula: "balance * rateMonthly",
			fieldDefinitions: [],
		},
		{
			id: createId(),
			name: "Risk Loaded EMI",
			principalFormula: "max(0, baseEmi - (balance * rateMonthly))",
			interestFormula: "(balance * rateMonthly) + serviceFee",
			fieldDefinitions: [
				{
					id: createId(),
					key: "riskLoading",
					label: "Risk Loading %",
					description: "Adds premium on top of base EMI.",
					defaultValue: 5,
				},
				{
					id: createId(),
					key: "serviceFee",
					label: "Monthly Service Fee",
					description: "Flat monthly surcharge.",
					defaultValue: 1000,
				},
			],
		},
	];
}

function isValidFieldKey(key: string) {
	return /^[A-Za-z_]\w*$/.test(key);
}

function parseIsoDate(dateString: string) {
	const parsed = new Date(`${dateString}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}
	return parsed;
}

function daysBetween(start: Date, end: Date) {
	const msPerDay = 24 * 60 * 60 * 1000;
	const utcStart = Date.UTC(
		start.getFullYear(),
		start.getMonth(),
		start.getDate(),
	);
	const utcEnd = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
	return Math.max(1, Math.round((utcEnd - utcStart) / msPerDay));
}

function buildPaymentDate(
	startDate: Date,
	period: number,
	scheduleType: PaymentScheduleType,
	monthEndFirstPayment: MonthEndFirstPayment,
) {
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
}

function tokenizeFormula(input: string): Token[] {
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
}

function parseFormula(input: string): ExpressionNode {
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
}

function evalFormulaNode(
	node: ExpressionNode,
	context: FormulaContext,
): number {
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
}

function CustomEmiCalculator() {
	const [amount, setAmount] = useState<number | undefined>(100000);
	const [rate, setRate] = useState<number | undefined>(10);
	const [tenure, setTenure] = useState<number | undefined>(12);
	const [tenureType, setTenureType] = useState<"months" | "years">("months");
	const [startDateIso, setStartDateIso] = useState<string>(() => {
		const today = new Date();
		const yyyy = today.getFullYear();
		const mm = String(today.getMonth() + 1).padStart(2, "0");
		const dd = String(today.getDate()).padStart(2, "0");
		return `${yyyy}-${mm}-${dd}`;
	});
	const [paymentScheduleType, setPaymentScheduleType] =
		useState<PaymentScheduleType>("fixed-day");
	const [monthEndFirstPayment, setMonthEndFirstPayment] =
		useState<MonthEndFirstPayment>("this-month-end");
	const [customTypes, setCustomTypes] = useState<CustomEmiType[]>(() =>
		createDefaultCustomTypes(),
	);
	const [selectedCustomTypeId, setSelectedCustomTypeId] = useState<string>("");
	const [customFieldValues, setCustomFieldValues] = useState<
		Record<string, number>
	>({});
	const [saveMessage, setSaveMessage] = useState<string | null>(null);
	const [calculationSnapshot, setCalculationSnapshot] =
		useState<CalculationSnapshot | null>(null);

	const startDateForUi = parseIsoDate(startDateIso);
	const canChooseMonthEndFirstPayment =
		paymentScheduleType === "month-end" &&
		(startDateForUi?.getDate() ?? 0) > 15;

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
											: createId(),
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
						id: typeof item.id === "string" && item.id ? item.id : createId(),
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
				setCustomTypes(restoredTypes);
			}
		} catch {
			setSaveMessage("Failed to load saved custom EMI types.");
		}
	}, []);

	useEffect(() => {
		if (customTypes.length === 0) {
			setSelectedCustomTypeId("");
			return;
		}
		if (
			!selectedCustomTypeId ||
			!customTypes.some((item) => item.id === selectedCustomTypeId)
		) {
			setSelectedCustomTypeId(customTypes[0]?.id ?? "");
		}
	}, [customTypes, selectedCustomTypeId]);

	const selectedCustomType = useMemo(
		() => customTypes.find((item) => item.id === selectedCustomTypeId) ?? null,
		[customTypes, selectedCustomTypeId],
	);

	useEffect(() => {
		if (!selectedCustomType) {
			setCustomFieldValues({});
			return;
		}
		setCustomFieldValues((prev) => {
			const next: Record<string, number> = {};
			for (const def of selectedCustomType.fieldDefinitions) {
				next[def.key] = prev[def.key] ?? def.defaultValue;
			}
			return next;
		});
	}, [selectedCustomType]);

	const { emi, totalPayment, totalInterest, schedule, formulaError } =
		useMemo(() => {
			if (!calculationSnapshot) {
				return {
					emi: 0,
					totalPayment: 0,
					totalInterest: 0,
					schedule: [] as ScheduleRow[],
					formulaError: null as string | null,
				};
			}

			const p = calculationSnapshot.amount;
			const monthlyRate = calculationSnapshot.rate / 12 / 100;
			const rateAnnual = calculationSnapshot.rate / 100;
			const rateDaily = rateAnnual / 365;
			const tenureMonths =
				calculationSnapshot.tenureType === "years"
					? calculationSnapshot.tenure * 12
					: calculationSnapshot.tenure;
			const scheduleStartDate = parseIsoDate(calculationSnapshot.startDateIso);

			if (p <= 0 || tenureMonths <= 0 || !scheduleStartDate) {
				return {
					emi: 0,
					totalPayment: 0,
					totalInterest: 0,
					schedule: [] as ScheduleRow[],
					formulaError: !scheduleStartDate
						? "Start date is required."
						: (null as string | null),
				};
			}

			const currentSchedule: ScheduleRow[] = [];
			let remainingBalance = p;
			let prevPayment = 0;
			let prevPrincipal = 0;
			let prevInterest = 0;

			const pushRow = (
				period: number,
				date: Date,
				payment: number,
				principal: number,
				interest: number,
			) => {
				currentSchedule.push({
					period,
					date,
					payment,
					principal,
					interest,
					balance: Math.max(0, remainingBalance),
				});
			};

			const baseEmi =
				monthlyRate <= 0
					? p / tenureMonths
					: (p * monthlyRate * (1 + monthlyRate) ** tenureMonths) /
						((1 + monthlyRate) ** tenureMonths - 1);

			const selectedType = calculationSnapshot.selectedCustomType;
			if (!selectedType) {
				return {
					emi: 0,
					totalPayment: 0,
					totalInterest: 0,
					schedule: [] as ScheduleRow[],
					formulaError: "Select a custom EMI type.",
				};
			}

			if (!selectedType.principalFormula.trim()) {
				return {
					emi: 0,
					totalPayment: 0,
					totalInterest: 0,
					schedule: [] as ScheduleRow[],
					formulaError: "Principal formula is required.",
				};
			}

			if (!selectedType.interestFormula.trim()) {
				return {
					emi: 0,
					totalPayment: 0,
					totalInterest: 0,
					schedule: [] as ScheduleRow[],
					formulaError: "Interest formula is required.",
				};
			}

			let parsedFormulaNodes: {
				principalNode: ExpressionNode;
				interestNode: ExpressionNode;
			};
			try {
				parsedFormulaNodes = {
					principalNode: parseFormula(selectedType.principalFormula),
					interestNode: parseFormula(selectedType.interestFormula),
				};
			} catch (error) {
				return {
					emi: 0,
					totalPayment: 0,
					totalInterest: 0,
					schedule: [] as ScheduleRow[],
					formulaError:
						error instanceof Error ? error.message : "Invalid formula.",
				};
			}

			let totalPaid = 0;
			let totalInterestPaid = 0;
			let previousDate = scheduleStartDate;

			for (let i = 1; i <= tenureMonths; i++) {
				const paymentDate = buildPaymentDate(
					scheduleStartDate,
					i,
					calculationSnapshot.paymentScheduleType,
					calculationSnapshot.monthEndFirstPayment,
				);
				const periodDays = daysBetween(previousDate, paymentDate);
				const scheduleRate =
					calculationSnapshot.paymentScheduleType === "daily-accrual"
						? (rateAnnual * periodDays) / 365
						: monthlyRate;

				const context: FormulaContext = {
					principal: p,
					balance: remainingBalance,
					rateMonthly: scheduleRate,
					rateAnnual,
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

				for (const field of selectedType.fieldDefinitions) {
					if (!isValidFieldKey(field.key)) {
						continue;
					}
					context[field.key] =
						calculationSnapshot.customFieldValues[field.key] ??
						field.defaultValue;
				}

				let interest = evalFormulaNode(
					parsedFormulaNodes.interestNode,
					context,
				);
				if (!Number.isFinite(interest)) {
					interest = 0;
				}
				interest = Math.max(0, interest);

				let principal = evalFormulaNode(
					parsedFormulaNodes.principalNode,
					context,
				);
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
				pushRow(i, paymentDate, payment, principal, interest);
				previousDate = paymentDate;
			}

			return {
				emi: currentSchedule[0]?.payment ?? 0,
				totalPayment: totalPaid,
				totalInterest: totalInterestPaid,
				schedule: currentSchedule,
				formulaError: null as string | null,
			};
		}, [calculationSnapshot]);

	const calculate = () => {
		setCalculationSnapshot({
			amount: amount ?? 0,
			rate: rate ?? 0,
			tenure: tenure ?? 0,
			tenureType,
			startDateIso,
			paymentScheduleType,
			monthEndFirstPayment,
			selectedCustomType,
			customFieldValues: { ...customFieldValues },
		});
	};

	const formatCurrency = (val: number) =>
		new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "MMK",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(val);

	const updateSelectedCustomType = (
		updater: (type: CustomEmiType) => CustomEmiType,
	) => {
		if (!selectedCustomType) {
			return;
		}
		setCustomTypes((prev) =>
			prev.map((type) =>
				type.id === selectedCustomType.id ? updater(type) : type,
			),
		);
	};

	const addCustomType = () => {
		const id = createId();
		setCustomTypes((prev) => [
			...prev,
			{
				id,
				name: `Custom Type ${prev.length + 1}`,
				principalFormula: "max(0, baseEmi - (balance * rateMonthly))",
				interestFormula: "balance * rateMonthly",
				fieldDefinitions: [],
			},
		]);
		setSelectedCustomTypeId(id);
	};

	const removeSelectedType = () => {
		if (!selectedCustomType) {
			return;
		}
		setCustomTypes((prev) =>
			prev.filter((type) => type.id !== selectedCustomType.id),
		);
	};

	const addFieldDefinition = () => {
		updateSelectedCustomType((type) => ({
			...type,
			fieldDefinitions: [
				...type.fieldDefinitions,
				{
					id: createId(),
					key: `customField${type.fieldDefinitions.length + 1}`,
					label: "Custom Field",
					description: "Used in custom formula.",
					defaultValue: 0,
				},
			],
		}));
	};

	const saveCustomTypes = () => {
		try {
			localStorage.setItem(
				customEmiTypesStorageKey,
				JSON.stringify(customTypes),
			);
			setSaveMessage(`Saved ${customTypes.length} custom EMI type(s).`);
		} catch {
			setSaveMessage("Failed to save custom EMI types.");
		}
	};

	const removeFieldDefinition = (fieldId: string) => {
		updateSelectedCustomType((type) => ({
			...type,
			fieldDefinitions: type.fieldDefinitions.filter(
				(field) => field.id !== fieldId,
			),
		}));
	};

	const updateFieldDefinition = (
		fieldId: string,
		updater: (field: FieldDefinition) => FieldDefinition,
	) => {
		updateSelectedCustomType((type) => ({
			...type,
			fieldDefinitions: type.fieldDefinitions.map((item) =>
				item.id === fieldId ? updater(item) : item,
			),
		}));
	};

	const hasInvalidCustomKey =
		selectedCustomType?.fieldDefinitions.some(
			(field) => !isValidFieldKey(field.key),
		) ?? false;
	const hasDuplicateCustomKey =
		(selectedCustomType?.fieldDefinitions ?? []).length !==
		new Set(
			(selectedCustomType?.fieldDefinitions ?? []).map((field) =>
				field.key.trim(),
			),
		).size;

	return (
		<div className="p-6 font-sans max-w-7xl mx-auto space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Custom EMI Formula Calculator</h1>
				<p className="text-sm text-gray-600 mt-1">
					Create custom EMI types by defining a formula and your own fields.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<div className="space-y-4 border p-6 rounded-lg shadow-sm bg-white h-fit">
					<h2 className="font-semibold text-lg">Loan Details</h2>

					<div>
						<label
							htmlFor="loan-amount"
							className="block text-sm font-medium mb-1 text-gray-700"
						>
							Loan Amount
						</label>
						<div className="relative">
							<span className="absolute left-3 top-2 text-gray-500">MMK</span>
							<input
								id="loan-amount"
								type="number"
								min="0"
								value={amount ?? ""}
								onChange={(e) =>
									setAmount(e.target.value ? Number(e.target.value) : undefined)
								}
								className="w-full border p-2 pl-14 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
					</div>

					<div>
						<label
							htmlFor="interest-rate"
							className="block text-sm font-medium mb-1 text-gray-700"
						>
							Interest Rate (%)
						</label>
						<input
							id="interest-rate"
							type="number"
							min="0"
							step="0.1"
							value={rate ?? ""}
							onChange={(e) =>
								setRate(e.target.value ? Number(e.target.value) : undefined)
							}
							className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label
							htmlFor="tenure-value"
							className="block text-sm font-medium mb-1 text-gray-700"
						>
							Tenure
						</label>
						<div className="flex gap-2">
							<input
								id="tenure-value"
								type="number"
								min="1"
								value={tenure ?? ""}
								onChange={(e) =>
									setTenure(e.target.value ? Number(e.target.value) : undefined)
								}
								className="flex-1 border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<select
								value={tenureType}
								onChange={(e) =>
									setTenureType(e.target.value as "months" | "years")
								}
								className="border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="months">Months</option>
								<option value="years">Years</option>
							</select>
						</div>
					</div>
					<div>
						<label
							htmlFor="schedule-start-date"
							className="block text-sm font-medium mb-1 text-gray-700"
						>
							Start Date
						</label>
						<input
							id="schedule-start-date"
							type="date"
							value={startDateIso}
							onChange={(e) => setStartDateIso(e.target.value)}
							className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label
							htmlFor="payment-schedule-type"
							className="block text-sm font-medium mb-1 text-gray-700"
						>
							Payment Schedule Type
						</label>
						<select
							id="payment-schedule-type"
							value={paymentScheduleType}
							onChange={(e) =>
								setPaymentScheduleType(e.target.value as PaymentScheduleType)
							}
							className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="fixed-day">Fixed Day</option>
							<option value="month-end">Month End</option>
							<option value="daily-accrual">Daily Accrual</option>
						</select>
						<p className="text-xs text-gray-500 mt-1">
							Daily accrual uses actual days between schedule dates from the
							selected start date.
						</p>
					</div>

					{canChooseMonthEndFirstPayment && (
						<div>
							<label
								htmlFor="month-end-first-payment"
								className="block text-sm font-medium mb-1 text-gray-700"
							>
								Month-End First Payment
							</label>
							<select
								id="month-end-first-payment"
								value={monthEndFirstPayment}
								onChange={(e) =>
									setMonthEndFirstPayment(
										e.target.value as MonthEndFirstPayment,
									)
								}
								className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="this-month-end">This Month End</option>
								<option value="next-month-end">Next Month End</option>
							</select>
							<p className="text-xs text-gray-500 mt-1">
								Available when start date is after day 15.
							</p>
						</div>
					)}
				</div>

				<div className="space-y-4 border p-6 rounded-lg shadow-sm bg-blue-50 h-fit">
					<h2 className="font-semibold text-lg text-blue-900">Summary</h2>
					<div className="space-y-4">
						<div className="flex justify-between items-center pb-2 border-b border-blue-100">
							<span className="text-gray-600">First Period EMI</span>
							<span className="text-2xl font-bold text-blue-600">
								{formatCurrency(emi)}
							</span>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-gray-600">Principal Amount</span>
							<span className="font-medium">{formatCurrency(amount ?? 0)}</span>
						</div>
						<div className="flex justify-between items-center">
							<span className="text-gray-600">Total Interest</span>
							<span className="font-medium text-orange-600">
								{formatCurrency(totalInterest)}
							</span>
						</div>
						<div className="flex justify-between items-center pt-2 border-t border-blue-200">
							<span className="font-semibold text-gray-800">Total Payment</span>
							<span className="font-bold text-gray-900">
								{formatCurrency(totalPayment)}
							</span>
						</div>
					</div>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<div className="space-y-4 border p-6 rounded-lg shadow-sm bg-white">
					<div className="flex items-center justify-between">
						<h2 className="font-semibold text-lg">Custom EMI Types</h2>
						<div className="flex gap-2">
							<button
								type="button"
								onClick={saveCustomTypes}
								className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
							>
								Save Types
							</button>
							<button
								type="button"
								onClick={addCustomType}
								className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
							>
								Add Type
							</button>
							<button
								type="button"
								onClick={removeSelectedType}
								className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
								disabled={!selectedCustomType}
							>
								Delete
							</button>
						</div>
					</div>
					{saveMessage && (
						<p className="text-xs text-gray-600">{saveMessage}</p>
					)}

					<div>
						<label
							htmlFor="custom-type-select"
							className="block text-sm font-medium mb-1 text-gray-700"
						>
							Custom Type
						</label>
						<select
							id="custom-type-select"
							value={selectedCustomTypeId}
							onChange={(e) => setSelectedCustomTypeId(e.target.value)}
							className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							{customTypes.map((type) => (
								<option key={type.id} value={type.id}>
									{type.name}
								</option>
							))}
						</select>
					</div>

					{selectedCustomType && (
						<>
							<div>
								<label
									htmlFor="custom-type-name"
									className="block text-sm font-medium mb-1 text-gray-700"
								>
									Type Name
								</label>
								<input
									id="custom-type-name"
									type="text"
									value={selectedCustomType.name}
									onChange={(e) =>
										updateSelectedCustomType((type) => ({
											...type,
											name: e.target.value,
										}))
									}
									className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
							</div>

							<div>
								<label
									htmlFor="custom-principal-formula"
									className="block text-sm font-medium mb-1 text-gray-700"
								>
									Principal Formula
								</label>
								<textarea
									id="custom-principal-formula"
									rows={4}
									value={selectedCustomType.principalFormula}
									onChange={(e) =>
										updateSelectedCustomType((type) => ({
											...type,
											principalFormula: e.target.value,
										}))
									}
									className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Defines the principal component for each period.
								</p>
							</div>

							<div>
								<label
									htmlFor="custom-interest-formula"
									className="block text-sm font-medium mb-1 text-gray-700"
								>
									Interest Formula
								</label>
								<textarea
									id="custom-interest-formula"
									rows={4}
									value={selectedCustomType.interestFormula}
									onChange={(e) =>
										updateSelectedCustomType((type) => ({
											...type,
											interestFormula: e.target.value,
										}))
									}
									className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
								/>
								<p className="text-xs text-gray-600 mt-1">
									Use operators +, -, *, /, ^ and functions:{" "}
									{supportedFunctions.join(", ")}
								</p>
								{formulaError && (
									<p className="text-xs text-red-600 mt-1">{formulaError}</p>
								)}
							</div>
						</>
					)}
				</div>

				<div className="space-y-4 border p-6 rounded-lg shadow-sm bg-white">
					<div className="flex items-center justify-between">
						<h2 className="font-semibold text-lg">Field Definitions</h2>
						<button
							type="button"
							onClick={addFieldDefinition}
							className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
							disabled={!selectedCustomType}
						>
							Add Field
						</button>
					</div>

					<div className="border rounded overflow-x-auto">
						<table className="min-w-full text-sm">
							<thead className="bg-gray-100 text-left">
								<tr>
									<th className="px-3 py-2 font-semibold">Key</th>
									<th className="px-3 py-2 font-semibold">Label</th>
									<th className="px-3 py-2 font-semibold">Description</th>
									<th className="px-3 py-2 font-semibold">Default</th>
									<th className="px-3 py-2 font-semibold"></th>
								</tr>
							</thead>
							<tbody>
								{(selectedCustomType?.fieldDefinitions ?? []).map((field) => (
									<tr key={field.id} className="border-t align-top">
										<td className="px-3 py-2 min-w-36">
											<input
												type="text"
												value={field.key}
												onChange={(e) =>
													updateFieldDefinition(field.id, (item) => ({
														...item,
														key: e.target.value.trim(),
													}))
												}
												className="w-full border p-2 rounded"
											/>
										</td>
										<td className="px-3 py-2 min-w-36">
											<input
												type="text"
												value={field.label}
												onChange={(e) =>
													updateFieldDefinition(field.id, (item) => ({
														...item,
														label: e.target.value,
													}))
												}
												className="w-full border p-2 rounded"
											/>
										</td>
										<td className="px-3 py-2 min-w-56">
											<input
												type="text"
												value={field.description}
												onChange={(e) =>
													updateFieldDefinition(field.id, (item) => ({
														...item,
														description: e.target.value,
													}))
												}
												className="w-full border p-2 rounded"
											/>
										</td>
										<td className="px-3 py-2 min-w-28">
											<input
												type="number"
												value={field.defaultValue}
												onChange={(e) =>
													updateFieldDefinition(field.id, (item) => ({
														...item,
														defaultValue: Number(e.target.value) || 0,
													}))
												}
												className="w-full border p-2 rounded"
											/>
										</td>
										<td className="px-3 py-2 text-right">
											<button
												type="button"
												onClick={() => removeFieldDefinition(field.id)}
												className="text-sm border px-2 py-1 rounded hover:bg-gray-50"
											>
												Remove
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					<div className="rounded border p-3 bg-gray-50 text-xs text-gray-700 space-y-1">
						<p>
							Core fields available in formulas:{" "}
							{coreFieldDefinitions.map((item) => item.key).join(", ")}
						</p>
						<p>
							Custom field keys must match <code>[A-Za-z_][A-Za-z0-9_]*</code>.
						</p>
						{hasInvalidCustomKey && (
							<p className="text-red-600">
								Some custom field keys are invalid.
							</p>
						)}
						{hasDuplicateCustomKey && (
							<p className="text-red-600">Custom field keys must be unique.</p>
						)}
					</div>

					{(selectedCustomType?.fieldDefinitions.length ?? 0) > 0 && (
						<div className="space-y-3">
							<h3 className="font-medium text-sm text-gray-800">
								Field Values
							</h3>
							<div className="grid gap-3 sm:grid-cols-2">
								{selectedCustomType?.fieldDefinitions.map((field) => (
									<div key={field.id}>
										<label
											htmlFor={`field-value-${field.id}`}
											className="block text-sm font-medium mb-1 text-gray-700"
										>
											{field.label || field.key}
										</label>
										<input
											id={`field-value-${field.id}`}
											type="number"
											value={customFieldValues[field.key] ?? field.defaultValue}
											onChange={(e) =>
												setCustomFieldValues((prev) => ({
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
				</div>
			</div>

			<div className="border p-6 rounded-lg shadow-sm bg-white space-y-4">
				<h2 className="text-xl font-bold">Formula Field Definitions</h2>
				<div className="overflow-x-auto border rounded">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-100 text-left">
							<tr>
								<th className="px-3 py-2 font-semibold">Field</th>
								<th className="px-3 py-2 font-semibold">Meaning</th>
							</tr>
						</thead>
						<tbody>
							{coreFieldDefinitions.map((field) => (
								<tr key={field.key} className="border-t">
									<td className="px-3 py-2 font-mono text-xs">{field.key}</td>
									<td className="px-3 py-2">{field.description}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<div className="flex justify-end">
				<button
					type="button"
					onClick={calculate}
					className="text-sm px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
				>
					Calculate
				</button>
			</div>

			{schedule.length > 0 && (
				<div className="mt-2">
					<h2 className="text-xl font-bold mb-4">Payment Schedule</h2>
					<div className="border rounded-lg overflow-x-auto shadow-sm bg-white">
						<table className="min-w-full text-sm text-left">
							<thead className="bg-gray-100 text-gray-700 font-semibold border-b">
								<tr>
									<th className="px-4 py-3 whitespace-nowrap">#</th>
									<th className="px-4 py-3 whitespace-nowrap">Payment Date</th>
									<th className="px-4 py-3 text-right whitespace-nowrap">
										Payment
									</th>
									<th className="px-4 py-3 text-right whitespace-nowrap">
										Principal
									</th>
									<th className="px-4 py-3 text-right whitespace-nowrap">
										Interest
									</th>
									<th className="px-4 py-3 text-right whitespace-nowrap">
										Outstanding
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{schedule.map((row) => (
									<tr key={row.period} className="hover:bg-gray-50">
										<td className="px-4 py-2 text-gray-500">{row.period}</td>
										<td className="px-4 py-2">
											{new Intl.DateTimeFormat("en-US", {
												year: "numeric",
												month: "short",
												day: "numeric",
											}).format(row.date)}
										</td>
										<td className="px-4 py-2 text-right font-medium">
											{formatCurrency(row.payment)}
										</td>
										<td className="px-4 py-2 text-right text-gray-600">
											{formatCurrency(row.principal)}
										</td>
										<td className="px-4 py-2 text-right text-orange-600">
											{formatCurrency(row.interest)}
										</td>
										<td className="px-4 py-2 text-right text-gray-500">
											{formatCurrency(row.balance)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
