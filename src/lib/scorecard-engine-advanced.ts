import type { Operator, Rule, ScoreCard } from "./scorecard-store";

export type FieldKind = "number" | "boolean" | "string";
export type Scalar = string | number | boolean;
export type RiskGrade = "LOW" | "MEDIUM" | "HIGH";

export type TestBreakdownItem = Rule & {
	fieldDescription: string;
	matched: boolean;
	actual: Scalar | undefined;
	skippedBecauseMissingInput: boolean;
};

export type ScoreEngineAdvancedResult = {
	maxScore: number;
	totalScore: number;
	matchedRules: number;
	riskGrade: RiskGrade;
	breakdown: TestBreakdownItem[];
	ecl: {
		pd: number;
		lgd: number;
		ead: number;
		discountFactor: number;
		expectedCreditLoss: number;
	} | null;
};

const FICO_FACTOR_WEIGHTS = {
	paymentHistory: 0.35,
	creditUtilization: 0.3,
	creditHistoryLength: 0.15,
	creditMix: 0.1,
	newCredit: 0.1,
} as const;

const FICO_FACTOR_ALIASES: Record<keyof typeof FICO_FACTOR_WEIGHTS, string[]> = {
	paymentHistory: ["paymenthistory", "payment_history", "paymenthistoryscore"],
	creditUtilization: [
		"creditutilization",
		"credit_utilization",
		"utilization",
		"utilizationratio",
	],
	creditHistoryLength: [
		"credithistorylength",
		"credit_history_length",
		"lengthofcredithistory",
		"historylength",
	],
	creditMix: ["creditmix", "credit_mix", "mixofcredit"],
	newCredit: ["newcredit", "new_credit", "recentcredit", "newaccounts"],
};

const CREDIT_BALANCE_ALIASES = [
	"creditbalance",
	"credit_balance",
	"totalcreditbalance",
	"outstandingbalance",
	"usedcredit",
];

const CREDIT_LIMIT_ALIASES = [
	"creditlimit",
	"credit_limit",
	"totalcreditlimit",
	"totallimit",
	"availablecreditlimit",
];

const PD_ALIASES = [
	"pd",
	"probabilityofdefault",
	"probability_of_default",
	"defaultprobability",
];

const LGD_ALIASES = [
	"lgd",
	"lossgivendefault",
	"loss_given_default",
];

const EAD_ALIASES = [
	"ead",
	"exposureatdefault",
	"exposure_at_default",
	"exposure",
];

const DISCOUNT_FACTOR_ALIASES = ["discountfactor", "discount_factor", "df"];

const normalizeLookupKey = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.replaceAll(/[^a-z0-9]/g, "");

const clampToPercentage = (value: number) => Math.max(0, Math.min(100, value));

const buildNormalizedInputs = (inputs: Record<string, string>) => {
	return Object.entries(inputs).reduce(
		(acc, [key, value]) => {
			acc[normalizeLookupKey(key)] = value;
			return acc;
		},
		{} as Record<string, string>,
	);
};

const getRawValueByAliases = (
	normalizedInputs: Record<string, string>,
	aliases: string[],
) => {
	return aliases
		.map(normalizeLookupKey)
		.map((alias) => normalizedInputs[alias])
		.find((value) => value !== undefined);
};

const parseNumberFromAliases = (
	normalizedInputs: Record<string, string>,
	aliases: string[],
): number | null => {
	const raw = getRawValueByAliases(normalizedInputs, aliases);
	if (raw === undefined) return null;
	const parsed = Number(raw);
	return Number.isFinite(parsed) ? parsed : null;
};

const normalizeProbability = (value: number): number | null => {
	if (!Number.isFinite(value)) return null;
	if (value < 0) return null;
	if (value <= 1) return value;
	if (value <= 100) return value / 100;
	return null;
};

const computeCreditUtilizationPercentage = (
	inputs: Record<string, string>,
): number | null => {
	const normalizedInputs = buildNormalizedInputs(inputs);
	const directUtilization = parseNumberFromAliases(
		normalizedInputs,
		FICO_FACTOR_ALIASES.creditUtilization,
	);
	if (directUtilization !== null) return Math.max(0, directUtilization);

	const creditBalance = parseNumberFromAliases(
		normalizedInputs,
		CREDIT_BALANCE_ALIASES,
	);
	const creditLimit = parseNumberFromAliases(normalizedInputs, CREDIT_LIMIT_ALIASES);
	if (creditBalance === null || creditLimit === null || creditLimit <= 0) return null;

	return Math.max(0, (creditBalance / creditLimit) * 100);
};

const computeExpectedCreditLoss = (
	inputs: Record<string, string>,
):
	| {
			pd: number;
			lgd: number;
			ead: number;
			discountFactor: number;
			expectedCreditLoss: number;
	  }
	| null => {
	const normalizedInputs = buildNormalizedInputs(inputs);
	const rawPd = parseNumberFromAliases(normalizedInputs, PD_ALIASES);
	const rawLgd = parseNumberFromAliases(normalizedInputs, LGD_ALIASES);
	const rawEad = parseNumberFromAliases(normalizedInputs, EAD_ALIASES);
	const fallbackEad = parseNumberFromAliases(normalizedInputs, [
		"requestedamount",
		"requested_amount",
		"loanamount",
		"loan_amount",
		"principal",
		"outstandingbalance",
	]);

	if (rawPd === null || rawLgd === null) return null;
	const pd = normalizeProbability(rawPd);
	const lgd = normalizeProbability(rawLgd);
	if (pd === null || lgd === null) return null;

	const eadCandidate = rawEad ?? fallbackEad;
	if (eadCandidate === null || !Number.isFinite(eadCandidate) || eadCandidate < 0) {
		return null;
	}

	const rawDiscountFactor = parseNumberFromAliases(
		normalizedInputs,
		DISCOUNT_FACTOR_ALIASES,
	);
	const discountFactor =
		rawDiscountFactor === null || !Number.isFinite(rawDiscountFactor)
			? 1
			: Math.max(0, rawDiscountFactor);

	return {
		pd,
		lgd,
		ead: eadCandidate,
		discountFactor,
		expectedCreditLoss: pd * lgd * eadCandidate * discountFactor,
	};
};

const computeFicoWeightedScore = (
	inputs: Record<string, string>,
): number | null => {
	const normalizedInputs = buildNormalizedInputs(inputs);

	let weightedScore = 0;
	for (const factor of Object.keys(FICO_FACTOR_WEIGHTS) as Array<
		keyof typeof FICO_FACTOR_WEIGHTS
	>) {
		const aliases = FICO_FACTOR_ALIASES[factor].map(normalizeLookupKey);
		const rawValue = aliases
			.map((alias) => normalizedInputs[alias])
			.find((value) => value !== undefined);

		if (rawValue === undefined) return null;
		const parsed = Number(rawValue);
		if (!Number.isFinite(parsed)) return null;

		weightedScore += clampToPercentage(parsed) * FICO_FACTOR_WEIGHTS[factor];
	}

	return weightedScore;
};

const computeTechnicalScaledScore = (
	fields: ScoreCard["fields"],
	rawMatchedScore: number,
	maxScore: number,
): number => {
	const maxTechnicalRawScore = (fields ?? []).reduce((acc, field) => {
		const maxRuleScore = (field.rules ?? []).reduce(
			(maxRule, rule) => Math.max(maxRule, Number.isFinite(rule.score) ? rule.score : 0),
			0,
		);
		return acc + maxRuleScore;
	}, 0);

	if (maxTechnicalRawScore <= 0 || maxScore <= 0) return 0;
	const boundedRaw = Math.max(0, rawMatchedScore);
	return Math.min((boundedRaw / maxTechnicalRawScore) * maxScore, maxScore);
};

export const inferFieldKindAdvanced = (rules: Rule[]): FieldKind => {
	if (
		rules.some(
			(r) =>
				r.operator === ">" ||
				r.operator === "<" ||
				r.operator === ">=" ||
				r.operator === "<=" ||
				r.operator === "between",
		)
	) {
		return "number";
	}
	if (
		rules.some((r) => {
			const v = r.value.trim().toLowerCase();
			return v === "true" || v === "false";
		})
	) {
		return "boolean";
	}
	return "string";
};

const parseBetween = (raw: string): { min: number; max: number } | null => {
	const normalized = raw.trim();
	if (!normalized) return null;

	const candidates = normalized
		.replaceAll(/\s+to\s+/gi, ",")
		.replaceAll(/\.\.+/g, ",")
		.replaceAll(/\s*-\s*/g, ",")
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);

	if (candidates.length !== 2) return null;
	const min = Number(candidates[0]);
	const max = Number(candidates[1]);
	if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
	return { min, max };
};

const parseList = (raw: string): string[] => {
	return raw
		.split(",")
		.map((s) => s.trim())
		.filter(Boolean);
};

const parseActualValue = (raw: string, kind: FieldKind): Scalar | undefined => {
	const trimmed = raw.trim();
	if (trimmed === "") return undefined;
	if (kind === "number") {
		const num = Number(trimmed);
		return Number.isFinite(num) ? num : undefined;
	}
	if (kind === "boolean") {
		const lower = trimmed.toLowerCase();
		if (lower === "true") return true;
		if (lower === "false") return false;
		return undefined;
	}
	return trimmed;
};

const asString = (value: Scalar): string => {
	return typeof value === "string" ? value : String(value);
};

const matchOperators: Record<Operator, (ruleValue: string, actual: Scalar) => boolean> = {
	"==": (ruleValue, actual) => {
		if (typeof actual === "number") {
			const expected = Number(ruleValue);
			return Number.isFinite(expected) && actual === expected;
		}
		if (typeof actual === "boolean") {
			return (ruleValue.trim().toLowerCase() === "true") === actual;
		}
		return asString(actual) === ruleValue;
	},
	"!=": (ruleValue, actual) => {
		if (typeof actual === "number") {
			const expected = Number(ruleValue);
			return Number.isFinite(expected) && actual !== expected;
		}
		if (typeof actual === "boolean") {
			return (ruleValue.trim().toLowerCase() === "true") !== actual;
		}
		return asString(actual) !== ruleValue;
	},
	">": (ruleValue, actual) => {
		const expected = Number(ruleValue);
		return typeof actual === "number" && Number.isFinite(expected) && actual > expected;
	},
	"<": (ruleValue, actual) => {
		const expected = Number(ruleValue);
		return typeof actual === "number" && Number.isFinite(expected) && actual < expected;
	},
	">=": (ruleValue, actual) => {
		const expected = Number(ruleValue);
		return typeof actual === "number" && Number.isFinite(expected) && actual >= expected;
	},
	"<=": (ruleValue, actual) => {
		const expected = Number(ruleValue);
		return typeof actual === "number" && Number.isFinite(expected) && actual <= expected;
	},
	between: (ruleValue, actual) => {
		const range = parseBetween(ruleValue);
		return typeof actual === "number" && range !== null && actual >= range.min && actual <= range.max;
	},
	in: (ruleValue, actual) => {
		const list = parseList(ruleValue);
		return list.includes(asString(actual));
	},
	notin: (ruleValue, actual) => {
		const list = parseList(ruleValue);
		return !list.includes(asString(actual));
	},
	contains: (ruleValue, actual) => {
		return asString(actual).toLowerCase().includes(ruleValue.toLowerCase());
	},
};

export const evaluateScoreCardAdvanced = (
	scoreCard: ScoreCard,
	inputs: Record<string, string>,
): ScoreEngineAdvancedResult => {
	const computedCreditUtilization = computeCreditUtilizationPercentage(inputs);
	const evaluationInputs =
		computedCreditUtilization === null
			? inputs
			: {
				...inputs,
				creditUtilization: String(computedCreditUtilization),
				credit_utilization: String(computedCreditUtilization),
			};

	const fields = scoreCard.fields ?? [];

	const perFieldKind: Record<string, FieldKind> = fields.reduce(
		(acc, field) => {
			if (!acc[field.field]) {
				acc[field.field] = inferFieldKindAdvanced(field.rules ?? []);
			}
			return acc;
		},
		{} as Record<string, FieldKind>,
	);

	const flatRules = fields.flatMap((field) =>
		(field.rules ?? []).map((rule) => ({
			...rule,
			field: field.field,
			fieldDescription: field.description,
		})),
	);

	const breakdown: TestBreakdownItem[] = flatRules.map((rule) => {
		const actualRaw = evaluationInputs[rule.field] ?? "";
		const kind = perFieldKind[rule.field] ?? "string";
		const actual = parseActualValue(actualRaw, kind);
		const missingInput = actual === undefined;
		const matched = missingInput ? false : matchOperators[rule.operator](rule.value, actual);

		return {
			...rule,
			matched,
			actual,
			skippedBecauseMissingInput: missingInput,
		};
	});

	const totalScoreRaw = breakdown
		.filter((b) => b.matched)
		.reduce((acc, b) => acc + b.score, 0);
	const ecl = computeExpectedCreditLoss(evaluationInputs);
	const ficoWeightedScore = computeFicoWeightedScore(evaluationInputs);
	const scaledFicoScore =
		ficoWeightedScore === null
			? null
			: (ficoWeightedScore / 100) * scoreCard.maxScore;
	const scaledTechnicalScore = computeTechnicalScaledScore(
		fields,
		totalScoreRaw,
		scoreCard.maxScore,
	);
	const totalScore = scaledFicoScore ?? scaledTechnicalScore;
	const matchedRules = breakdown.filter((b) => b.matched).length;

	const lowCutoff = scoreCard.maxScore * 0.6;
	const mediumCutoff = scoreCard.maxScore * 0.4;
	let riskGrade: RiskGrade = "HIGH";
	if (totalScore >= lowCutoff) {
		riskGrade = "LOW";
	} else if (totalScore >= mediumCutoff) {
		riskGrade = "MEDIUM";
	}

	return {
		maxScore: scoreCard.maxScore,
		totalScore,
		matchedRules,
		riskGrade,
		breakdown,
		ecl,
	};
};