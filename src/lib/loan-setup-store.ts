import { v4 as uuidV4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RepaymentPlan } from "./repayment-setup-store.ts";
import type { ScoreEngineResult } from "./scorecard-engine";

export enum TenorUnit {
	MONTH = "Month",
	YEAR = "Year",
	DAY = "Day",
}

export interface LoanTenor {
	id: string;
	TenorValue: number[];
	TenorUnit: TenorUnit;
}

export const INTEREST_TYPES = ["REDUCING", "FLAT"] as const;
export type InterestType = (typeof INTEREST_TYPES)[number];

export const RATE_TYPES = ["FIXED", "FLOATING"] as const;
export type RateType = (typeof RATE_TYPES)[number];

export type InterestRateParameter = {
	name: string;
	value: number;
	interestRate: number;
};

export type InterestRatePolicy = {
	interestCategory: string;
	interestRate: number;
};

export type InterestRatePlan = {
	interestType: InterestType;
	rateType: RateType;
	baseRate: number;
	config: {
		parameters: InterestRateParameter[];
	};
	policies: InterestRatePolicy[];
};

export type LoanProduct = {
	productCode: string;
	productName: string;
	minAmount: number;
	maxAmount: number;
	loanTenor: LoanTenor;
	baseInterestRate?: number;
	interestRatePlans?: InterestRatePlan[];
};

const cloneInterestRatePlan = (plan: InterestRatePlan): InterestRatePlan => ({
	interestType: plan.interestType,
	rateType: plan.rateType,
	baseRate: plan.baseRate,
	config: {
		parameters: (plan.config?.parameters ?? []).map((parameter) => ({
			name: parameter.name,
			value: parameter.value,
			interestRate: parameter.interestRate,
		})),
	},
	policies: (plan.policies ?? []).map((policy) => ({
		interestCategory: policy.interestCategory,
		interestRate: policy.interestRate,
	})),
});

const createEmptyInterestRatePlan = (baseRate = 0): InterestRatePlan => ({
	interestType: "REDUCING",
	rateType: "FIXED",
	baseRate,
	config: { parameters: [] },
	policies: [],
});

const normalizeInterestPlans = (product: LoanProduct): InterestRatePlan[] => {
	const hasPlans = product.interestRatePlans && product.interestRatePlans.length > 0;
	if (hasPlans) {
		return (product.interestRatePlans ?? []).map(cloneInterestRatePlan);
	}
	const fallbackRate =
		typeof product.baseInterestRate === "number" ? product.baseInterestRate : 0;
	return [cloneInterestRatePlan(createEmptyInterestRatePlan(fallbackRate))];
};

export function cloneLoanProduct(product: LoanProduct): LoanProduct {
	const normalizedPlans = normalizeInterestPlans(product);
	return {
		...product,
		loanTenor: {
			...product.loanTenor,
			TenorValue: [...product.loanTenor.TenorValue],
		},
		interestRatePlans: normalizedPlans,
		baseInterestRate: normalizedPlans[0]?.baseRate ?? product.baseInterestRate,
	};
}

export type ChannelConfig = {
	name: string;
	code: string;
};

export type DisbursementType = "FULL" | "PARTIAL";

export type DisbursementDestinationType = "BANK" | "WALLET";

export type DisbursementDestination = { type: "BANK" } | { type: "WALLET" };

export type LoanWorkflowSnapshot = {
	id: string;
	createdAt: number;
	product: LoanProduct;
	channels: ChannelConfig[];
	scorecardId: string | null;
	scorecardName: string | null;
	workflowId: string | null;
	workflowName: string | null;
	riskGrade: string | null;
	totalScore: number | null;
	disbursementType: DisbursementType;
	partialInterestRate: number | null;
	disbursementDestinations: DisbursementDestination[];
	repaymentPlanId: string | null;
	repaymentPlanName: string | null;
	repaymentPlan: RepaymentPlan | null;
	bureauProvider: string | null;
	bureauPurpose: string | null;
	bureauCheckRequired: boolean | null;
	bureauConsentRequired: boolean | null;
};

type LoanWorkflowInput = {
	product: LoanProduct;
	channels?: ChannelConfig[];
	scorecardId?: string | null;
	scorecardName?: string | null;
	workflowId?: string | null;
	workflowName?: string | null;
	riskResult?: ScoreEngineResult | null;
	disbursementType?: DisbursementType;
	partialInterestRate?: number | null;
	disbursementDestinations?: DisbursementDestination[];
	repaymentPlan?: RepaymentPlan | null;
	bureauProvider?: string;
	bureauPurpose?: string;
	bureauCheckRequired?: boolean;
	bureauConsentRequired?: boolean;
};

type LoanWorkflowState = {
	setups: Record<string, LoanWorkflowSnapshot>;
	addSetup: (input: LoanWorkflowInput) => LoanWorkflowSnapshot;
	updateSetup: (id: string, input: LoanWorkflowInput) => void;
	resetStore: () => void;
};

export const useLoanSetupStore = create<LoanWorkflowState>()(
	persist(
		(set, get) => ({
			setups: {},
			addSetup: (input) => {
				const channels = (input.channels ?? [])
					.map((c) => ({
						name: c.name.trim(),
						code: c.code.trim(),
					}))
					.filter((c) => c.name || c.code);
				const entry: LoanWorkflowSnapshot = {
					id: uuidV4(),
					createdAt: Date.now(),
					product: cloneLoanProduct(input.product),
					channels,
					scorecardId: input.scorecardId ?? null,
					scorecardName: input.scorecardName ?? null,
					workflowId: input.workflowId ?? null,
					workflowName: input.workflowName ?? null,
					riskGrade: input.riskResult?.riskGrade ?? null,
					totalScore: input.riskResult?.totalScore ?? null,
					disbursementType: input.disbursementType ?? "FULL",
					partialInterestRate:
						input.disbursementType === "PARTIAL"
							? (input.partialInterestRate ?? null)
							: null,
					disbursementDestinations: (
						input.disbursementDestinations ?? []
					).filter(
						(d): d is DisbursementDestination =>
							d?.type === "BANK" || d?.type === "WALLET",
					),
					repaymentPlanId: input.repaymentPlan?.planId ?? null,
					repaymentPlanName: input.repaymentPlan?.name ?? null,
					repaymentPlan: input.repaymentPlan
						? { ...input.repaymentPlan }
						: null,
					bureauCheckRequired: input.bureauCheckRequired || false,
					bureauConsentRequired: input.bureauConsentRequired || false,
					bureauProvider: input.bureauProvider || null,
					bureauPurpose: input.bureauPurpose || null,
				};
				set((prev) => ({
					setups: { ...prev.setups, [entry.id]: entry },
				}));
				return entry;
			},
			updateSetup: (id, input) => {
				const current = get().setups[id];
				if (!current) return;

				const channels = (input.channels ?? [])
					.map((c) => ({
						name: c.name.trim(),
						code: c.code.trim(),
					}))
					.filter((c) => c.name || c.code);

				const updated: LoanWorkflowSnapshot = {
					...current,
					product: cloneLoanProduct(input.product),
					channels,
					scorecardId: input.scorecardId ?? null,
					scorecardName: input.scorecardName ?? null,
					workflowId: input.workflowId ?? null,
					workflowName: input.workflowName ?? null,
					riskGrade: input.riskResult?.riskGrade ?? current.riskGrade,
					totalScore: input.riskResult?.totalScore ?? current.totalScore,
					disbursementType: input.disbursementType ?? "FULL",
					partialInterestRate:
						input.disbursementType === "PARTIAL"
							? (input.partialInterestRate ?? null)
							: null,
					disbursementDestinations: (
						input.disbursementDestinations ?? []
					).filter(
						(d): d is DisbursementDestination =>
							d?.type === "BANK" || d?.type === "WALLET",
					),
					repaymentPlanId: input.repaymentPlan?.planId ?? null,
					repaymentPlanName: input.repaymentPlan?.name ?? null,
					repaymentPlan: input.repaymentPlan
						? { ...input.repaymentPlan }
						: null,
					bureauCheckRequired: input.bureauCheckRequired || false,
					bureauConsentRequired: input.bureauConsentRequired || false,
					bureauProvider: input.bureauProvider || null,
					bureauPurpose: input.bureauPurpose || null,
				};
				set((prev) => ({
					setups: { ...prev.setups, [id]: updated },
				}));
			},
			resetStore: () => set({ setups: {} }),
		}),
		{
			name: "loan-workflow-setups",
			version: 2,
			migrate: (persistedState: any, version) => {
				if (!persistedState) return { setups: {} };
				if (version >= 2) return persistedState;
				const storedSetups = (persistedState.setups ?? {}) as Record<
					string,
					LoanWorkflowSnapshot
				>;
				const upgradedEntries = Object.entries(storedSetups).map(
					([id, snapshot]) => {
						if (!snapshot?.product) return [id, snapshot];
						return [
							id,
							{
								...snapshot,
								product: cloneLoanProduct(snapshot.product),
							},
						];
					},
				);
				return {
					...persistedState,
					setups: Object.fromEntries(upgradedEntries),
				};
			},
			partialize: (state) => ({ setups: state.setups }),
		},
	),
);

export function getLoanSetupList(setups: Record<string, LoanWorkflowSnapshot>) {
	return Object.values(setups).sort((a, b) => b.createdAt - a.createdAt);
}
