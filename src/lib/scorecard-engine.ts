import type { Operator, Rule, ScoreCard } from "./scorecard-store";

export type FieldKind = "number" | "boolean" | "string";
export type Scalar = string | number | boolean;

export type TestBreakdownItem = Rule & {
	fieldDescription: string;
	matched: boolean;
	actual: Scalar | undefined;
	skippedBecauseMissingInput: boolean;
};

export type ScoreEngineResult = {
	maxScore: number;
	totalScore: number;
	matchedRules: number;
	riskGrade: "LOW" | "MEDIUM" | "HIGH";
	minDocs: string[];
	breakdown: TestBreakdownItem[];
};

export const inferFieldKind = (rules: Rule[]): FieldKind => {
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

export const evaluateScoreCard = (
	scoreCard: ScoreCard,
	inputs: Record<string, string>,
): ScoreEngineResult => {
	const fields = scoreCard.fields ?? [];

	const perFieldKind: Record<string, FieldKind> = fields.reduce(
		(acc, field) => {
			if (!acc[field.field]) {
				acc[field.field] = inferFieldKind(field.rules ?? []);
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
		const actualRaw = inputs[rule.field] ?? "";
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
	const totalScore = Math.min(totalScoreRaw, scoreCard.maxScore);
	const matchedRules = breakdown.filter((b) => b.matched).length;

	// Keep the same UX as the loan page: map score -> grade/docs.
	const lowCutoff = scoreCard.maxScore * 0.6;
	const mediumCutoff = scoreCard.maxScore * 0.4;
	let riskGrade: "LOW" | "MEDIUM" | "HIGH" = "HIGH";
	if (totalScore >= lowCutoff) {
		riskGrade = "LOW";
	} else if (totalScore >= mediumCutoff) {
		riskGrade = "MEDIUM";
	}

	let minDocs: string[] = ["NRC", "PAYSLIP", "BANK_STATEMENT", "GUARANTOR"];
	if (riskGrade === "LOW") {
		minDocs = ["NRC", "PAYSLIP"];
	} else if (riskGrade === "MEDIUM") {
		minDocs = ["NRC", "PAYSLIP", "BANK_STATEMENT"];
	}

	return {
		maxScore: scoreCard.maxScore,
		totalScore,
		matchedRules,
		riskGrade,
		minDocs,
		breakdown,
	};
};
