export type ApplicantData = {
  age: number;
  monthlyIncome: number;
  employmentType: "Salaried" | "Self-Employed" | "Unemployed" | "Retired";
  notes: string;
  isEmployed: boolean;
  isVIP: boolean;
};

type RuleOperator =
  | "=="
  | "!="
  | ">"
  | "<"
  | ">="
  | "<="
  | "between"
  | "in"
  | "notin"
  | "contains";

type RuleValue =
  | number
  | boolean
  | string
  | number[]
  | string[]
  | { min: number; max: number };

export type ScoreRule = {
  field: keyof ApplicantData;
  operator: RuleOperator;
  value: RuleValue;
  score: number;
};

export type ScoreResult = {
  name: string;
  scoreCardId: string;
  maxScore: number;
  totalScore: number;
  matchedRules: number;
  riskGrade: "LOW" | "MEDIUM" | "HIGH";
  minDocs: string[];
  breakdown: Array<ScoreRule & { matched: boolean; applicantValue: unknown }>;
};

export const scoreCard: {
  scoreCardId: string;
  name: string;
  maxScore: number;
  rules: ScoreRule[];
} = {
  scoreCardId: "SC-ALL-OPS",
  name: "All Operator Test Score Card",
  maxScore: 200,
  rules: [
    {
      field: "age",
      operator: "==",
      value: 30,
      score: 10,
    },
    {
      field: "age",
      operator: "!=",
      value: 18,
      score: 5,
    },
    {
      field: "monthlyIncome",
      operator: ">",
      value: 50000,
      score: 15,
    },
    {
      field: "monthlyIncome",
      operator: "<",
      value: 150000,
      score: 10,
    },
    {
      field: "monthlyIncome",
      operator: ">=",
      value: 60000,
      score: 20,
    },
    {
      field: "monthlyIncome",
      operator: "<=",
      value: 100000,
      score: 10,
    },
    {
      field: "age",
      operator: "between",
      value: {
        min: 25,
        max: 45,
      },
      score: 15,
    },
    {
      field: "employmentType",
      operator: "in",
      value: ["Salaried", "Self-Employed"],
      score: 20,
    },
    {
      field: "employmentType",
      operator: "notin",
      value: ["Unemployed", "Retired"],
      score: 5,
    },
    {
      field: "notes",
      operator: "contains",
      value: "VIP",
      score: 10,
    },
    {
      field: "isEmployed",
      operator: "==",
      value: true,
      score: 20,
    },
    {
      field: "isVIP",
      operator: "==",
      value: true,
      score: 10,
    },
    {
      field: "isVIP",
      operator: "!=",
      value: true,
      score: 5,
    },
  ],
};

const ruleMatches = (rule: ScoreRule, applicant: ApplicantData): boolean => {
  const actual = applicant[rule.field];

  switch (rule.operator) {
    case "==":
      return actual === rule.value;
    case "!=":
      return actual !== rule.value;
    case ">":
      return typeof actual === "number" && actual > (rule.value as number);
    case "<":
      return typeof actual === "number" && actual < (rule.value as number);
    case ">=":
      return typeof actual === "number" && actual >= (rule.value as number);
    case "<=":
      return typeof actual === "number" && actual <= (rule.value as number);
    case "between": {
      if (typeof actual !== "number") return false;
      const { min, max } = rule.value as { min: number; max: number };
      return actual >= min && actual <= max;
    }
    case "in":
      return Array.isArray(rule.value)
        ? (rule.value as Array<string | number>).includes(
            actual as string | number,
          )
        : false;
    case "notin":
      return Array.isArray(rule.value)
        ? !(rule.value as Array<string | number>).includes(
            actual as string | number,
          )
        : false;
    case "contains":
      return typeof actual === "string"
        ? actual.toLowerCase().includes(String(rule.value).toLowerCase())
        : false;
    default:
      return false;
  }
};

export const evaluateScore = (applicant: ApplicantData): ScoreResult => {
  const flatRules = (scoreCard.fields ?? []).flatMap((field) =>
    (field.rules ?? []).map((rule) => ({ ...rule, field: field.field, fieldDescription: field.description })),
  );

  const breakdown = flatRules.map((rule) => ({
    ...rule,
    matched: ruleMatches(rule, applicant),
    applicantValue: applicant[rule.field],
  }));

  const totalScore = breakdown
    .filter((item) => item.matched)
    .reduce((acc, item) => acc + item.score, 0);

  const matchedRules = breakdown.filter((item) => item.matched).length;
  const riskGrade = totalScore >= 120 ? "LOW" : totalScore >= 80 ? "MEDIUM" : "HIGH";
  const minDocs =
    riskGrade === "LOW"
      ? ["NRC", "PAYSLIP"]
      : riskGrade === "MEDIUM"
        ? ["NRC", "PAYSLIP", "BANK_STATEMENT"]
        : ["NRC", "PAYSLIP", "BANK_STATEMENT", "GUARANTOR"];

  return {
    name: scoreCard.name,
    scoreCardId: scoreCard.scoreCardId,
    maxScore: scoreCard.maxScore,
    totalScore: Math.min(totalScore, scoreCard.maxScore),
    matchedRules,
    riskGrade,
    minDocs,
    breakdown,
  };
};
