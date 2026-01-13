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

export type ScoreCard = {
	scoreCardId: string;
	name: string;
	maxScore: number;
	rules: Rule[];
};

export const defaultScoreCard: ScoreCard = {
	scoreCardId: "SC-NEW-01",
	name: "New Scorecard",
	maxScore: 100,
	rules: [
		{ field: "age", operator: ">=", value: "25", score: 10 },
		{ field: "age", operator: "<", value: "40", score: 15 },
		{ field: "monthlyIncome", operator: ">", value: "50000", score: 20 },
	],
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
			scoreCards: { [defaultScoreCard.scoreCardId]: defaultScoreCard },
			selectedScoreCardId: defaultScoreCard.scoreCardId,
			upsertScoreCard: (next, opts) =>
				set((prev) => ({
					scoreCards: { ...prev.scoreCards, [next.scoreCardId]: next },
					selectedScoreCardId:
						opts?.select === false
							? prev.selectedScoreCardId
							: next.scoreCardId,
				})),
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
							? { [defaultScoreCard.scoreCardId]: defaultScoreCard }
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
					scoreCards: { [defaultScoreCard.scoreCardId]: defaultScoreCard },
					selectedScoreCardId: defaultScoreCard.scoreCardId,
				}),
		}),
		{
			name: "loan-scorecard",
			version: 2,
			migrate: (persistedState, version) => {
				if (version === 1) {
					const legacy = persistedState as { scoreCard?: ScoreCard };
					if (legacy?.scoreCard) {
						const card = legacy.scoreCard;
						return {
							scoreCards: { [card.scoreCardId]: card },
							selectedScoreCardId: card.scoreCardId,
						};
					}
				}
				return persistedState as PersistedScoreCardState;
			},
		},
	),
);
