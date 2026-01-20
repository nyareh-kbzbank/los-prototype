import { v4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
const clampDay = (value) => {
  if (!Number.isFinite(value)) return null;
  const day = Number(value);
  if (day < 1) return 1;
  if (day > 28) return 28;
  return day;
};
const toNumber = (value, fallback) => {
  return Number.isFinite(value) ? Number(value) : fallback;
};
const seededPlan = {
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
  createdAt: Date.now()
};
const useRepaymentSetupStore = create()(
  persist(
    (set, get) => ({
      plans: { [seededPlan.planId]: seededPlan },
      selectedPlanId: seededPlan.planId,
      addPlan: (input) => {
        const name = input.name.trim();
        if (!name) {
          throw new Error("Repayment plan name is required");
        }
        const plan = {
          planId: v4(),
          name,
          description: input.description?.trim() || void 0,
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
          minInstallmentAmount: Number.isFinite(input.minInstallmentAmount) ? Math.max(0, Number(input.minInstallmentAmount)) : null,
          createdAt: Date.now()
        };
        set((prev) => ({
          plans: { ...prev.plans, [plan.planId]: plan },
          selectedPlanId: plan.planId
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
            selectedPlanId: prev.selectedPlanId === planId ? hasPlans ? Object.keys(next)[0] : seededPlan.planId : prev.selectedPlanId
          };
        });
      },
      selectPlan: (planId) => {
        set((prev) => {
          if (!planId) return { selectedPlanId: null };
          return prev.plans[planId] ? { selectedPlanId: planId } : prev;
        });
      },
      resetStore: () => set({
        plans: { [seededPlan.planId]: seededPlan },
        selectedPlanId: seededPlan.planId
      })
    }),
    {
      name: "loan-repayment-plans",
      version: 1,
      partialize: (state) => ({
        plans: state.plans,
        selectedPlanId: state.selectedPlanId
      })
    }
  )
);
function getRepaymentPlanList(plans) {
  return Object.values(plans).sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    return a.createdAt - b.createdAt;
  });
}
export {
  getRepaymentPlanList as g,
  useRepaymentSetupStore as u
};
