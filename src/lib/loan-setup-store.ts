import { v4 as uuidV4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RepaymentPlan } from "./repayment-setup-store.ts";
import type { ScoreEngineResult } from "./scorecard-engine";

export type LoanProduct = {
	productCode: string;
	productName: string;
	minAmount: number;
	maxAmount: number;
	tenureMonths: number[];
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
};

type LoanWorkflowState = {
	setups: Record<string, LoanWorkflowSnapshot>;
	addSetup: (input: LoanWorkflowInput) => LoanWorkflowSnapshot;
	resetStore: () => void;
};

export const useLoanSetupStore = create<LoanWorkflowState>()(
	persist(
		(set) => ({
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
						tenureMonths: [...input.product.tenureMonths],
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
				};
				set((prev) => ({
					setups: { ...prev.setups, [entry.id]: entry },
				}));
				return entry;
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
