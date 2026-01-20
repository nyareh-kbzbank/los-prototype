import { v4 as uuidV4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DisbursementDestinationType } from "./loan-setup-store";

export type LoanApplicationStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export type ApplicationWorkflowEvent = {
  stageIndex: number;
  stageId: string;
  stageLabel: string;
  occurredAt: number;
};

export type LoanApplication = {
  id: string;
  applicationNo: string;
  createdAt: number;
  updatedAt: number;
  status: LoanApplicationStatus;
  beneficiaryName: string;
  nationalId: string;
  phone: string;
  age: number | null;
  monthlyIncome: number | null;
  requestedAmount: number;
  tenureMonths: number | null;
  channelCode: string;
  destinationType: DisbursementDestinationType;
  notes: string;
  setupId: string;
  productCode: string;
  productName: string | null;
  creditScore: number | null;
  creditMax: number | null;
  workflowId: string | null;
  workflowName: string | null;
  workflowStageIndex: number;
  workflowHistory: ApplicationWorkflowEvent[];
  bureauProvider: string;
  bureauPurpose: string;
  bureauConsent: boolean;
  bureauReference: string;
  bureauRequestedAt: number | null;
};

export type LoanApplicationInput = {
  beneficiaryName: string;
  nationalId: string;
  phone: string;
  age?: number | null;
  monthlyIncome?: number | null;
  requestedAmount: number;
  tenureMonths: number | null;
  channelCode: string;
  destinationType: DisbursementDestinationType;
  notes?: string;
  setupId: string;
  productCode: string;
  productName?: string | null;
  creditScore?: number | null;
  creditMax?: number | null;
  workflowId?: string | null;
  workflowName?: string | null;
  bureauProvider: string;
  bureauPurpose: string;
  bureauConsent: boolean;
  bureauReference?: string;
  bureauRequestedAt?: number | null;
};

type LoanApplicationState = {
  applications: Record<string, LoanApplication>;
  addApplication: (input: LoanApplicationInput) => LoanApplication;
  updateStatus: (id: string, status: LoanApplicationStatus) => void;
  advanceWorkflowStage: (id: string, event: ApplicationWorkflowEvent) => void;
  resetWorkflowProgress: (id: string) => void;
};

export const useLoanApplicationStore = create<LoanApplicationState>()(
  persist(
    (set) => ({
      applications: {},
      addApplication: (input) => {
        const now = Date.now();
        const applicationNo = generateApplicationNo(input.productCode);
        const application: LoanApplication = {
          id: uuidV4(),
          applicationNo,
          createdAt: now,
          updatedAt: now,
          status: "DRAFT",
          beneficiaryName: input.beneficiaryName.trim(),
          nationalId: input.nationalId.trim(),
          phone: input.phone.trim(),
          age:
            Number.isFinite(input.age || NaN) && input.age !== null
              ? Math.max(0, input.age)
              : null,
          monthlyIncome:
            Number.isFinite(input.monthlyIncome || NaN) && input.monthlyIncome !== null
              ? Math.max(0, input.monthlyIncome)
              : null,
          requestedAmount: Number.isFinite(input.requestedAmount)
            ? Math.max(0, input.requestedAmount)
            : 0,
          tenureMonths: Number.isFinite(input.tenureMonths || NaN)
            ? input.tenureMonths
            : null,
          channelCode: input.channelCode.trim(),
          destinationType: input.destinationType,
          notes: input.notes?.trim() ?? "",
          setupId: input.setupId,
          productCode: input.productCode,
          productName: input.productName ?? null,
          creditScore:
            Number.isFinite(input.creditScore || NaN) && input.creditScore !== null
              ? input.creditScore
              : null,
          creditMax:
            Number.isFinite(input.creditMax || NaN) && input.creditMax !== null
              ? input.creditMax
              : null,
          workflowId: input.workflowId ?? null,
          workflowName: input.workflowName ?? null,
          workflowStageIndex: -1,
          workflowHistory: [],
          bureauProvider: input.bureauProvider.trim() || "Unknown",
          bureauPurpose: input.bureauPurpose.trim() || "",
          bureauConsent: Boolean(input.bureauConsent),
          bureauReference: input.bureauReference?.trim() ?? "",
          bureauRequestedAt:
            Number.isFinite(input.bureauRequestedAt || NaN) &&
            input.bureauRequestedAt !== null
              ? input.bureauRequestedAt
              : null,
        };
        set((prev) => ({
          applications: { ...prev.applications, [application.id]: application },
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
              [id]: { ...existing, status, updatedAt: Date.now() },
            },
          };
        });
      },
      advanceWorkflowStage: (id, event) => {
        set((prev) => {
          const existing = prev.applications[id];
          if (!existing) return prev;
          if (event.stageIndex <= existing.workflowStageIndex) return prev;
          const history: ApplicationWorkflowEvent[] = [
            ...existing.workflowHistory,
            {
              stageId: event.stageId,
              stageIndex: event.stageIndex,
              stageLabel: event.stageLabel,
              occurredAt: event.occurredAt,
            },
          ];
          return {
            applications: {
              ...prev.applications,
              [id]: {
                ...existing,
                workflowStageIndex: event.stageIndex,
                workflowHistory: history,
                updatedAt: Date.now(),
              },
            },
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
                updatedAt: Date.now(),
              },
            },
          };
        });
      },
    }),
    {
      name: "loan-applications",
      version: 4,
      partialize: (state) => ({ applications: state.applications }),
      migrate: (persistedState, version) => {
        const base = persistedState as Partial<LoanApplicationState> &
          Record<string, unknown>;
        const applications = base.applications ?? {};

        if (version < 2) {
          const patched: Record<string, LoanApplication> = {};
          for (const [id, app] of Object.entries(applications)) {
            patched[id] = {
              workflowHistory: [],
              workflowStageIndex: -1,
              workflowId: null,
              workflowName: null,
              ...(app as LoanApplication),
            };
          }
          return {
            ...base,
            applications: patched,
          } satisfies Partial<LoanApplicationState>;
        }

        if (version < 3) {
          const patched: Record<string, LoanApplication> = {};
          for (const [id, app] of Object.entries(applications)) {
            const productCode = (app as LoanApplication).productCode ?? "APP";
            patched[id] = {
              applicationNo: generateApplicationNo(productCode),
              ...(app as LoanApplication),
            };
          }
          return { ...base, applications: patched } satisfies Partial<LoanApplicationState>;
        }

        if (version < 4) {
          const patched: Record<string, LoanApplication> = {};
          for (const [id, app] of Object.entries(applications)) {
            patched[id] = {
              bureauConsent: false,
              bureauProvider: "Unknown",
              bureauPurpose: "",
              bureauReference: "",
              bureauRequestedAt: null,
              ...(app as LoanApplication),
            };
          }
          return { ...base, applications: patched } satisfies Partial<LoanApplicationState>;
        }

        return base as LoanApplicationState;
      },
    },
  ),
);

export function getLoanApplicationList(applications: Record<string, LoanApplication>) {
  return Object.values(applications).sort((a, b) => b.createdAt - a.createdAt);
}

function generateApplicationNo(productCode: string) {
  const prefix = productCode?.trim() || "APP";
  const suffix = Date.now().toString(36).toUpperCase();
  return `${prefix}-${suffix}`;
}
