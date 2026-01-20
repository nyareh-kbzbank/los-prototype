import { create } from "zustand";
import { persist } from "zustand/middleware";

export const operatorOptions = [
	"==",
	"!=",
	">",
	"<",
	">=",
	"<=",
	"between",
	"in",
	"notin",
	"contains",
] as const;

export type Operator = (typeof operatorOptions)[number];

export type Rule = {
	field: string;
	operator: Operator;
	value: string;
	score: number;
};

export type ScoreCardField = {
	field: string;
	description: string;
	rules: Rule[];
};

export type ScoreCard = {
	scoreCardId: string;
	name: string;
	maxScore: number;
	fields: ScoreCardField[];
	bureauProvider?: string;
	bureauPurpose?: string;
	bureauConsentRequired?: boolean;
};

export const defaultScoreCard: ScoreCard = {
	scoreCardId: "SC-NEW-01",
	name: "New Scorecard",
	maxScore: 100,
	fields: [
		{
			field: "age",
			description: "Age",
			rules: [
				{ field: "age", operator: "between", value: "20,39", score: 10 },
				{ field: "age", operator: "between", value: "40,60", score: 15 },
			],
		},
		{
			field: "monthlyIncome",
			description: "Monthly Income",
			rules: [{ field: "monthlyIncome", operator: ">", value: "50000", score: 20 }],
		},
	],
	bureauProvider: "Experian",
	bureauPurpose: "Credit assessment",
	bureauConsentRequired: true,
};

const humanizeFieldName = (field: string): string => {
	return field
		.replace(/[_-]+/g, " ")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/^./, (c) => c.toUpperCase());
};

const normalizeScoreCard = (card: ScoreCard): ScoreCard => {
	const normalizedFields = (card.fields ?? []).map((field) => {
		const description = field.description?.trim() || humanizeFieldName(field.field);
		const rules = (field.rules ?? []).map((rule) => ({
			...rule,
			field: field.field,
		}));
		return { ...field, description, rules } as ScoreCardField;
	});

	// Fallback for legacy shape (flat rules array) even though we don't need strict backwards compatibility.
	if (!normalizedFields.length && (card as unknown as { rules?: Rule[] }).rules) {
		const legacyRules = (card as unknown as { rules: Rule[] }).rules;
		const byField: Record<string, ScoreCardField> = {};
		for (const rule of legacyRules) {
			const desc = humanizeFieldName(rule.field);
			if (!byField[rule.field]) {
				byField[rule.field] = {
					field: rule.field,
					description: desc,
					rules: [],
				};
			}
			byField[rule.field].rules.push({ ...rule, field: rule.field });
		}
		return {
			...card,
			fields: Object.values(byField),
			bureauProvider: card.bureauProvider ?? "Experian",
			bureauPurpose: card.bureauPurpose ?? "Credit assessment",
			bureauConsentRequired: card.bureauConsentRequired ?? true,
		};
	}

	return {
		...card,
		fields: normalizedFields,
		bureauProvider: card.bureauProvider ?? "Experian",
		bureauPurpose: card.bureauPurpose ?? "Credit assessment",
		bureauConsentRequired: card.bureauConsentRequired ?? true,
	};
};

type ScoreCardState = {
	scoreCards: Record<string, ScoreCard>;
	selectedScoreCardId: string;
	upsertScoreCard: (next: ScoreCard, opts?: { select?: boolean }) => void;
	removeScoreCard: (scoreCardId: string) => void;
	selectScoreCard: (scoreCardId: string) => void;
	resetStore: () => void;
};

type PersistedScoreCardState = {
	scoreCards: Record<string, ScoreCard>;
	selectedScoreCardId: string;
};

export const useScoreCardStore = create<ScoreCardState>()(
	persist(
		(set) => ({
			scoreCards: {
				[defaultScoreCard.scoreCardId]: normalizeScoreCard(defaultScoreCard),
			},
			selectedScoreCardId: defaultScoreCard.scoreCardId,
			upsertScoreCard: (next, opts) =>
				set((prev) => {
					const normalized = normalizeScoreCard(next);
					return {
						scoreCards: { ...prev.scoreCards, [normalized.scoreCardId]: normalized },
						selectedScoreCardId:
							opts?.select === false
								? prev.selectedScoreCardId
								: normalized.scoreCardId,
					};
				}),
			removeScoreCard: (scoreCardId) =>
				set((prev) => {
					const { [scoreCardId]: _removed, ...rest } = prev.scoreCards;
					const remainingIds = Object.keys(rest);
					const nextSelected =
						prev.selectedScoreCardId === scoreCardId
							? remainingIds[0] ?? defaultScoreCard.scoreCardId
							: prev.selectedScoreCardId;
					const nextCards =
						remainingIds.length === 0
							? { [defaultScoreCard.scoreCardId]: normalizeScoreCard(defaultScoreCard) }
							: rest;
					return {
						scoreCards: nextCards,
						selectedScoreCardId: nextSelected,
					};
				}),
			selectScoreCard: (scoreCardId) =>
				set((prev) =>
					prev.scoreCards[scoreCardId]
						? { selectedScoreCardId: scoreCardId }
						: prev,
				),
			resetStore: () =>
				set({
					scoreCards: {
						[defaultScoreCard.scoreCardId]: normalizeScoreCard(defaultScoreCard),
					},
					selectedScoreCardId: defaultScoreCard.scoreCardId,
				}),
		}),
		{
			name: "loan-scorecard",
			version: 5,
			migrate: (persistedState) => {
				const state = persistedState as PersistedScoreCardState;
				const normalizedCards: Record<string, ScoreCard> = {};
				for (const [id, card] of Object.entries(state?.scoreCards ?? {})) {
					normalizedCards[id] = normalizeScoreCard(card as ScoreCard);
				}
				const selected = normalizedCards[state?.selectedScoreCardId ?? ""]
					? state?.selectedScoreCardId
					: Object.keys(normalizedCards)[0] ?? defaultScoreCard.scoreCardId;
				return {
					scoreCards:
						Object.keys(normalizedCards).length > 0
							? normalizedCards
							: { [defaultScoreCard.scoreCardId]: normalizeScoreCard(defaultScoreCard) },
					selectedScoreCardId: selected,
				};
			},
		},
	),
);
