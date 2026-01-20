import { v4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
const useLoanSetupStore = create()(
  persist(
    (set) => ({
      setups: {},
      addSetup: (input) => {
        const channels = (input.channels ?? []).map((c) => ({
          name: c.name.trim(),
          code: c.code.trim()
        })).filter((c) => c.name || c.code);
        const entry = {
          id: v4(),
          createdAt: Date.now(),
          product: {
            ...input.product,
            tenureMonths: [...input.product.tenureMonths]
          },
          channels,
          scorecardId: input.scorecardId ?? null,
          scorecardName: input.scorecardName ?? null,
          workflowId: input.workflowId ?? null,
          workflowName: input.workflowName ?? null,
          riskGrade: input.riskResult?.riskGrade ?? null,
          totalScore: input.riskResult?.totalScore ?? null,
          disbursementType: input.disbursementType ?? "FULL",
          partialInterestRate: input.disbursementType === "PARTIAL" ? input.partialInterestRate ?? null : null,
          disbursementDestinations: (input.disbursementDestinations ?? []).filter(
            (d) => d?.type === "BANK" || d?.type === "WALLET"
          ),
          repaymentPlanId: input.repaymentPlan?.planId ?? null,
          repaymentPlanName: input.repaymentPlan?.name ?? null,
          repaymentPlan: input.repaymentPlan ? { ...input.repaymentPlan } : null
        };
        set((prev) => ({
          setups: { ...prev.setups, [entry.id]: entry }
        }));
        return entry;
      },
      resetStore: () => set({ setups: {} })
    }),
    {
      name: "loan-workflow-setups",
      version: 1,
      partialize: (state) => ({ setups: state.setups })
    }
  )
);
function getLoanSetupList(setups) {
  return Object.values(setups).sort((a, b) => b.createdAt - a.createdAt);
}
export {
  getLoanSetupList as g,
  useLoanSetupStore as u
};
