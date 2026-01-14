import { v4 as uuidV4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RepaymentMethod = "EMI" | "INTEREST_ONLY" | "BULLET";
export type RepaymentFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY";

export type RepaymentPlan = {
	planId: string;
	name: string;
	description?: string;
	method: RepaymentMethod;
	frequency: RepaymentFrequency;
	dueDayOfMonth: number | null;
	firstDueAfterDays: number;
	gracePeriodDays: number;
	lateFeeFlat: number;
	lateFeePct: number;
	prepaymentPenaltyPct: number;
	autopayRequired: boolean;
	roundingStep: number;
	minInstallmentAmount: number | null;
	createdAt: number;
};

export type RepaymentPlanInput = {
	name: string;
	description?: string;
	method?: RepaymentMethod;
	frequency?: RepaymentFrequency;
	dueDayOfMonth?: number | null;
	firstDueAfterDays?: number;
	gracePeriodDays?: number;
	lateFeeFlat?: number;
	lateFeePct?: number;
	prepaymentPenaltyPct?: number;
	autopayRequired?: boolean;
	roundingStep?: number;
	minInstallmentAmount?: number | null;
};

type RepaymentPlanState = {
	plans: Record<string, RepaymentPlan>;
	selectedPlanId: string | null;
	addPlan: (input: RepaymentPlanInput) => RepaymentPlan;
	removePlan: (planId: string) => void;
	selectPlan: (planId: string | null) => void;
	resetStore: () => void;
};

const clampDay = (value: number | null | undefined) => {
	if (!Number.isFinite(value)) return null;
	const day = Number(value);
	if (day < 1) return 1;
	if (day > 28) return 28;
	return day;
};

const toNumber = (value: number | null | undefined, fallback: number) => {
	return Number.isFinite(value) ? Number(value) : fallback;
};

const seededPlan: RepaymentPlan = {
	planId: "plan-standard-emi",
	name: "Standard EMI",
	description: "Monthly equal installments with a short grace period and small prepayment fee.",
	method: "EMI",
	frequency: "MONTHLY",
	dueDayOfMonth: 5,
	firstDueAfterDays: 30,
	gracePeriodDays: 5,
	lateFeeFlat: 7500,
	lateFeePct: 1,
	prepaymentPenaltyPct: 2,
	autopayRequired: true,
	roundingStep: 100,
	minInstallmentAmount: null,
	createdAt: Date.now(),
};

export const useRepaymentSetupStore = create<RepaymentPlanState>()(
	persist(
		(set, get) => ({
			plans: { [seededPlan.planId]: seededPlan },
			selectedPlanId: seededPlan.planId,
			addPlan: (input) => {
				const name = input.name.trim();
				if (!name) {
					throw new Error("Repayment plan name is required");
				}
				const plan: RepaymentPlan = {
					planId: uuidV4(),
					name,
					description: input.description?.trim() || undefined,
					method: input.method ?? "EMI",
					frequency: input.frequency ?? "MONTHLY",
					dueDayOfMonth: clampDay(input.dueDayOfMonth ?? null),
					firstDueAfterDays: toNumber(input.firstDueAfterDays, 30),
					gracePeriodDays: toNumber(input.gracePeriodDays, 5),
					lateFeeFlat: Math.max(0, toNumber(input.lateFeeFlat, 0)),
					lateFeePct: Math.max(0, toNumber(input.lateFeePct, 0)),
					prepaymentPenaltyPct: Math.max(0, toNumber(input.prepaymentPenaltyPct, 0)),
					autopayRequired: input.autopayRequired ?? false,
					roundingStep: Math.max(1, toNumber(input.roundingStep, 1)),
					minInstallmentAmount:
						Number.isFinite(input.minInstallmentAmount)
							? Math.max(0, Number(input.minInstallmentAmount))
							: null,
					createdAt: Date.now(),
				};
				set((prev) => ({
					plans: { ...prev.plans, [plan.planId]: plan },
					selectedPlanId: plan.planId,
				}));
				return plan;
			},
			removePlan: (planId) => {
				set((prev) => {
					if (!prev.plans[planId]) return prev;
					const next = { ...prev.plans };
					delete next[planId];
					const hasPlans = Object.keys(next).length > 0;
					return {
						plans: hasPlans ? next : { [seededPlan.planId]: seededPlan },
						selectedPlanId: prev.selectedPlanId === planId
							? hasPlans
								? Object.keys(next)[0]
								: seededPlan.planId
							: prev.selectedPlanId,
					};
				});
			},
			selectPlan: (planId) => {
				set((prev) => {
					if (!planId) return { selectedPlanId: null };
					return prev.plans[planId]
						? { selectedPlanId: planId }
						: prev;
				});
			},
			resetStore: () => set({
				plans: { [seededPlan.planId]: seededPlan },
				selectedPlanId: seededPlan.planId,
			}),
		}),
		{
			name: "loan-repayment-plans",
			version: 1,
			partialize: (state) => ({
				plans: state.plans,
				selectedPlanId: state.selectedPlanId,
			}),
		},
	),
);

export function getRepaymentPlanList(plans: Record<string, RepaymentPlan>) {
	return Object.values(plans).sort((a, b) => {
		const byName = a.name.localeCompare(b.name);
		if (byName !== 0) return byName;
		return a.createdAt - b.createdAt;
	});
}
