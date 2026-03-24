import { v4 as uuidV4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DisbursementDestinationType, TenorUnit } from "./loan-setup-store";

export type LoanApplicationStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "CHECKER_PENDING"
  | "APPROVED"
  | "REJECTED";

export type ApplicationWorkflowEvent = {
  stageIndex: number;
  stageId: string;
  stageLabel: string;
  occurredAt: number;
};

export type ApplicationDecisionActor = "SYSTEM" | "MAKER" | "CHECKER";

export type ApplicationDecisionEvent = {
  actor: ApplicationDecisionActor;
  fromStatus: LoanApplicationStatus | null;
  toStatus: LoanApplicationStatus;
  note: string;
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
  gender: string;
  maritalStatus: string;
  education: string;
  phone: string;
  bankAccountNo: string;
  kpayPhoneNo: string;
  age: number | null;
  monthlyIncome: number | null;
  debtToIncomeRatio: number | null;
  requestedAmount: number;
  tenureValue: number | null;
  tenureUnit: TenorUnit | null;
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
  decisionHistory: ApplicationDecisionEvent[];
  bureauProvider: string;
  bureauPurpose: string;
  bureauConsent: boolean;
  bureauReference: string;
  bureauRequestedAt: number | null;
};

export type LoanApplicationInput = {
  status?: LoanApplicationStatus;
  beneficiaryName: string;
  nationalId: string;
  gender?: string;
  maritalStatus?: string;
  education?: string;
  phone: string;
  bankAccountNo?: string;
  kpayPhoneNo?: string;
  age?: number | null;
  monthlyIncome?: number | null;
  debtToIncomeRatio?: number | null;
  requestedAmount: number;
  tenureValue: number | null;
  tenureUnit?: TenorUnit | null;
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
        const initialStatus = input.status ?? "DRAFT";
        const normalizedAge =
          Number.isFinite(input.age ?? NaN) && input.age !== null
            ? Math.max(0, input.age ?? 0)
            : null;
        const normalizedMonthlyIncome =
          Number.isFinite(input.monthlyIncome ?? NaN) && input.monthlyIncome !== null
            ? Math.max(0, input.monthlyIncome ?? 0)
            : null;
        const normalizedDebtToIncomeRatio =
          Number.isFinite(input.debtToIncomeRatio ?? NaN) &&
          input.debtToIncomeRatio !== null
            ? Math.max(0, input.debtToIncomeRatio ?? 0)
            : null;
        const application: LoanApplication = {
          id: uuidV4(),
          applicationNo,
          createdAt: now,
          updatedAt: now,
          status: initialStatus,
          beneficiaryName: input.beneficiaryName.trim(),
          nationalId: input.nationalId.trim(),
          gender: input.gender?.trim() ?? "",
          maritalStatus: input.maritalStatus?.trim() ?? "",
          education: input.education?.trim() ?? "",
          phone: input.phone.trim(),
          bankAccountNo: input.bankAccountNo?.trim() ?? "",
          kpayPhoneNo: input.kpayPhoneNo?.trim() ?? "",
          age: normalizedAge,
          monthlyIncome: normalizedMonthlyIncome,
          debtToIncomeRatio: normalizedDebtToIncomeRatio,
          requestedAmount: Number.isFinite(input.requestedAmount)
            ? Math.max(0, input.requestedAmount)
            : 0,
          tenureValue: Number.isFinite(input.tenureValue || NaN)
            ? input.tenureValue
            : null,
          tenureUnit: input.tenureUnit || null,
          channelCode: input.channelCode.trim(),
          destinationType: input.destinationType,
          notes: input.notes?.trim() ?? "",
          setupId: input.setupId,
          productCode: input.productCode,
          productName: input.productName ?? null,
          creditScore:
            Number.isFinite(input.creditScore || NaN) && input.creditScore !== null
              ? input.creditScore ?? null
              : null,
          creditMax:
            Number.isFinite(input.creditMax || NaN) && input.creditMax !== null
              ? input.creditMax ?? null
              : null,
          workflowId: input.workflowId ?? null,
          workflowName: input.workflowName ?? null,
          workflowStageIndex: -1,
          workflowHistory: [],
          decisionHistory:
            initialStatus === "SUBMITTED"
              ? [
                  {
                    actor: "SYSTEM",
                    fromStatus: null,
                    toStatus: "SUBMITTED",
                    note: "Entered maker inbox",
                    occurredAt: now,
                  },
                ]
              : [],
          bureauProvider: input.bureauProvider.trim() || "Unknown",
          bureauPurpose: input.bureauPurpose.trim() || "",
          bureauConsent: Boolean(input.bureauConsent),
          bureauReference: input.bureauReference?.trim() ?? "",
          bureauRequestedAt:
            Number.isFinite(input.bureauRequestedAt || NaN) &&
            input.bureauRequestedAt !== null
              ? input.bureauRequestedAt ?? null
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
          if (existing.status === status) return prev;

          const now = Date.now();
          const decisionEvent = buildDecisionEvent(existing.status, status, now);
          const nextDecisionHistory = decisionEvent
            ? [...(existing.decisionHistory ?? []), decisionEvent]
            : existing.decisionHistory ?? [];

          return {
            applications: {
              ...prev.applications,
              [id]: {
                ...existing,
                status,
                decisionHistory: nextDecisionHistory,
                updatedAt: now,
              },
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
      version: 7,
      partialize: (state) => ({ applications: state.applications }),
      migrate: (persistedState, version) => {
        const base = persistedState as Partial<LoanApplicationState> &
          Record<string, unknown>;
        const applications = base.applications ?? {};

        if (version < 2) {
          const patched: Record<string, LoanApplication> = {};
          for (const [id, app] of Object.entries(applications)) {
            const existing = app as Partial<LoanApplication>;
            patched[id] = {
              ...existing,
              workflowHistory: existing.workflowHistory ?? [],
              workflowStageIndex: existing.workflowStageIndex ?? -1,
              workflowId: existing.workflowId ?? null,
              workflowName: existing.workflowName ?? null,
            } as LoanApplication;
          }
          return {
            ...base,
            applications: patched,
          } satisfies Partial<LoanApplicationState>;
        }

        if (version < 3) {
          const patched: Record<string, LoanApplication> = {};
          for (const [id, app] of Object.entries(applications)) {
            const existing = app as Partial<LoanApplication>;
            const productCode = existing.productCode ?? "APP";
            patched[id] = {
              ...existing,
              applicationNo:
                existing.applicationNo ?? generateApplicationNo(productCode),
            } as LoanApplication;
          }
          return { ...base, applications: patched } satisfies Partial<LoanApplicationState>;
        }

        if (version < 4) {
          const patched: Record<string, LoanApplication> = {};
          for (const [id, app] of Object.entries(applications)) {
            const existing = app as Partial<LoanApplication>;
            patched[id] = {
              ...existing,
              bureauConsent: existing.bureauConsent ?? false,
              bureauProvider: existing.bureauProvider ?? "Unknown",
              bureauPurpose: existing.bureauPurpose ?? "",
              bureauReference: existing.bureauReference ?? "",
              bureauRequestedAt: existing.bureauRequestedAt ?? null,
            } as LoanApplication;
          }
          return { ...base, applications: patched } satisfies Partial<LoanApplicationState>;
        }

        if (version < 5) {
          const patched: Record<string, LoanApplication> = {};
          for (const [id, app] of Object.entries(applications)) {
            const existing = app as Partial<LoanApplication>;
            patched[id] = {
              ...existing,
              decisionHistory: existing.decisionHistory ?? [],
            } as LoanApplication;
          }
          return { ...base, applications: patched } satisfies Partial<LoanApplicationState>;
        }

        if (version < 6) {
          const patched: Record<string, LoanApplication> = {};
          for (const [id, app] of Object.entries(applications)) {
            const existing = app as Partial<LoanApplication>;
            patched[id] = {
              ...existing,
              bankAccountNo: existing.bankAccountNo ?? "",
              kpayPhoneNo: existing.kpayPhoneNo ?? "",
            } as LoanApplication;
          }
          return { ...base, applications: patched } satisfies Partial<LoanApplicationState>;
        }

		if (version < 7) {
			const patched: Record<string, LoanApplication> = {};
			for (const [id, app] of Object.entries(applications)) {
				const existing = app as Partial<LoanApplication>;
				patched[id] = {
					...existing,
					gender: existing.gender ?? "",
					maritalStatus: existing.maritalStatus ?? "",
					education: existing.education ?? "",
					debtToIncomeRatio: existing.debtToIncomeRatio ?? null,
        } as LoanApplication;
			}
			return { ...base, applications: patched } satisfies Partial<LoanApplicationState>;
		}

        return base as LoanApplicationState;
      },
    },
  ),
);

function buildDecisionEvent(
  fromStatus: LoanApplicationStatus,
  toStatus: LoanApplicationStatus,
  occurredAt: number,
): ApplicationDecisionEvent | null {
  if (fromStatus === "SUBMITTED" && toStatus === "CHECKER_PENDING") {
    return {
      actor: "MAKER",
      fromStatus,
      toStatus,
      note: "Submitted to checker",
      occurredAt,
    };
  }

  if (fromStatus === "SUBMITTED" && toStatus === "APPROVED") {
    return {
      actor: "MAKER",
      fromStatus,
      toStatus,
      note: "Approved by maker",
      occurredAt,
    };
  }

  if (fromStatus === "SUBMITTED" && toStatus === "REJECTED") {
    return {
      actor: "MAKER",
      fromStatus,
      toStatus,
      note: "Rejected by maker",
      occurredAt,
    };
  }

  if (fromStatus === "CHECKER_PENDING" && toStatus === "APPROVED") {
    return {
      actor: "CHECKER",
      fromStatus,
      toStatus,
      note: "Approved by checker",
      occurredAt,
    };
  }

  if (fromStatus === "CHECKER_PENDING" && toStatus === "REJECTED") {
    return {
      actor: "CHECKER",
      fromStatus,
      toStatus,
      note: "Rejected by checker",
      occurredAt,
    };
  }

  if (toStatus === "SUBMITTED") {
    return {
      actor: "SYSTEM",
      fromStatus,
      toStatus,
      note: "Entered maker inbox",
      occurredAt,
    };
  }

  return null;
}

export function getLoanApplicationList(applications: Record<string, LoanApplication>) {
  return Object.values(applications).sort((a, b) => b.createdAt - a.createdAt);
}

export function getLoanApplicationStatusLabel(application: LoanApplication) {
  const isAutoApproved =
    application.status === "APPROVED" &&
    (application.decisionHistory?.length ?? 0) === 0;
  if (isAutoApproved) return "Auto-Approved";

  const isAutoRejected =
    application.status === "REJECTED" &&
    (application.decisionHistory?.length ?? 0) === 0;
  if (isAutoRejected) return "Auto-Rejected";

  return application.status;
}

function generateApplicationNo(productCode: string) {
  const prefix = productCode?.trim() || "APP";
  const suffix = Date.now().toString(36).toUpperCase();
  return `${prefix}-${suffix}`;
}
