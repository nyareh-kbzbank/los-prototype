import { v4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
const useLoanApplicationStore = create()(
  persist(
    (set) => ({
      applications: {},
      addApplication: (input) => {
        const now = Date.now();
        const applicationNo = generateApplicationNo(input.productCode);
        const application = {
          id: v4(),
          applicationNo,
          createdAt: now,
          updatedAt: now,
          status: "DRAFT",
          beneficiaryName: input.beneficiaryName.trim(),
          nationalId: input.nationalId.trim(),
          phone: input.phone.trim(),
          age: Number.isFinite(input.age || NaN) && input.age !== null ? Math.max(0, input.age) : null,
          monthlyIncome: Number.isFinite(input.monthlyIncome || NaN) && input.monthlyIncome !== null ? Math.max(0, input.monthlyIncome) : null,
          requestedAmount: Number.isFinite(input.requestedAmount) ? Math.max(0, input.requestedAmount) : 0,
          tenureMonths: Number.isFinite(input.tenureMonths || NaN) ? input.tenureMonths : null,
          channelCode: input.channelCode.trim(),
          destinationType: input.destinationType,
          notes: input.notes?.trim() ?? "",
          setupId: input.setupId,
          productCode: input.productCode,
          productName: input.productName ?? null,
          creditScore: Number.isFinite(input.creditScore || NaN) && input.creditScore !== null ? input.creditScore : null,
          creditMax: Number.isFinite(input.creditMax || NaN) && input.creditMax !== null ? input.creditMax : null,
          workflowId: input.workflowId ?? null,
          workflowName: input.workflowName ?? null,
          workflowStageIndex: -1,
          workflowHistory: [],
          bureauProvider: input.bureauProvider.trim() || "Unknown",
          bureauPurpose: input.bureauPurpose.trim() || "",
          bureauConsent: Boolean(input.bureauConsent),
          bureauReference: input.bureauReference?.trim() ?? "",
          bureauRequestedAt: Number.isFinite(input.bureauRequestedAt || NaN) && input.bureauRequestedAt !== null ? input.bureauRequestedAt : null
        };
        set((prev) => ({
          applications: { ...prev.applications, [application.id]: application }
        }));
        return application;
      },
      updateStatus: (id, status) => {
        set((prev) => {
          const existing = prev.applications[id];
          if (!existing) return prev;
          return {
            applications: {
              ...prev.applications,
              [id]: { ...existing, status, updatedAt: Date.now() }
            }
          };
        });
      },
      advanceWorkflowStage: (id, event) => {
        set((prev) => {
          const existing = prev.applications[id];
          if (!existing) return prev;
          if (event.stageIndex <= existing.workflowStageIndex) return prev;
          const history = [
            ...existing.workflowHistory,
            {
              stageId: event.stageId,
              stageIndex: event.stageIndex,
              stageLabel: event.stageLabel,
              occurredAt: event.occurredAt
            }
          ];
          return {
            applications: {
              ...prev.applications,
              [id]: {
                ...existing,
                workflowStageIndex: event.stageIndex,
                workflowHistory: history,
                updatedAt: Date.now()
              }
            }
          };
        });
      },
      resetWorkflowProgress: (id) => {
        set((prev) => {
          const existing = prev.applications[id];
          if (!existing) return prev;
          return {
            applications: {
              ...prev.applications,
              [id]: {
                ...existing,
                workflowStageIndex: -1,
                workflowHistory: [],
                updatedAt: Date.now()
              }
            }
          };
        });
      }
    }),
    {
      name: "loan-applications",
      version: 4,
      partialize: (state) => ({ applications: state.applications }),
      migrate: (persistedState, version) => {
        const base = persistedState;
        const applications = base.applications ?? {};
        if (version < 2) {
          const patched = {};
          for (const [id, app] of Object.entries(applications)) {
            patched[id] = {
              workflowHistory: [],
              workflowStageIndex: -1,
              workflowId: null,
              workflowName: null,
              ...app
            };
          }
          return {
            ...base,
            applications: patched
          };
        }
        if (version < 3) {
          const patched = {};
          for (const [id, app] of Object.entries(applications)) {
            const productCode = app.productCode ?? "APP";
            patched[id] = {
              applicationNo: generateApplicationNo(productCode),
              ...app
            };
          }
          return { ...base, applications: patched };
        }
        if (version < 4) {
          const patched = {};
          for (const [id, app] of Object.entries(applications)) {
            patched[id] = {
              bureauConsent: false,
              bureauProvider: "Unknown",
              bureauPurpose: "",
              bureauReference: "",
              bureauRequestedAt: null,
              ...app
            };
          }
          return { ...base, applications: patched };
        }
        return base;
      }
    }
  )
);
function getLoanApplicationList(applications) {
  return Object.values(applications).sort((a, b) => b.createdAt - a.createdAt);
}
function generateApplicationNo(productCode) {
  const prefix = productCode?.trim() || "APP";
  const suffix = Date.now().toString(36).toUpperCase();
  return `${prefix}-${suffix}`;
}
export {
  getLoanApplicationList as g,
  useLoanApplicationStore as u
};
