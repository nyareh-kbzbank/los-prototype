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

export type LoanProduct = {
	productCode: string;
	productName: string;
	minAmount: number;
	maxAmount: number;
	loanTenor: LoanTenor;
	baseInterestRate: number;
};

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
					product: {
						...input.product,
						loanTenor: {
							...input.product.loanTenor,
							TenorValue: [...input.product.loanTenor.TenorValue],
						},
					},
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
					product: {
						...input.product,
						loanTenor: {
							...input.product.loanTenor,
							TenorValue: [...input.product.loanTenor.TenorValue],
						},
					},
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
			version: 1,
			partialize: (state) => ({ setups: state.setups }),
		},
	),
);

export function getLoanSetupList(setups: Record<string, LoanWorkflowSnapshot>) {
	return Object.values(setups).sort((a, b) => b.createdAt - a.createdAt);
}
