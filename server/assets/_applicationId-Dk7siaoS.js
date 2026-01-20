import { jsx, jsxs } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { u as useLoanApplicationStore } from "./loan-application-store-lyPNXgVT.js";
import { u as useLoanSetupStore } from "./loan-setup-store-X8Js1XLI.js";
import { u as useWorkflowStore } from "./workflow-store-tVM9Cs8c.js";
import { R as Route } from "./router-Dep64Ku5.js";
import "uuid";
import "zustand";
import "zustand/middleware";
import "@tanstack/react-router-ssr-query";
import "@tanstack/react-query";
import "lucide-react";
function RouteComponent() {
  const {
    applicationId
  } = Route.useParams();
  const application = useLoanApplicationStore((s) => s.applications[applicationId]);
  const updateStatus = useLoanApplicationStore((s) => s.updateStatus);
  const advanceWorkflowStage = useLoanApplicationStore((s) => s.advanceWorkflowStage);
  const resetWorkflowProgress = useLoanApplicationStore((s) => s.resetWorkflowProgress);
  const setups = useLoanSetupStore((s) => s.setups);
  const workflows = useWorkflowStore((s) => s.workflows);
  const setup = application ? setups[application.setupId] : void 0;
  const savedWorkflow = setup?.workflowId && workflows[setup.workflowId] ? workflows[setup.workflowId] : null;
  const workflowStages = useMemo(() => {
    return savedWorkflow?.workflow.nodes.filter((item) => item.type === "custom-node") ?? [];
  }, [savedWorkflow?.workflow]);
  const historyByStageIndex = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    if (!application?.workflowHistory) return map;
    for (const entry of application.workflowHistory) {
      map.set(entry.stageIndex, entry);
    }
    return map;
  }, [application?.workflowHistory]);
  const currentStageIndex = application?.workflowStageIndex ?? -1;
  const nextStage = workflowStages[currentStageIndex + 1];
  const getStageLabel = (node) => {
    const label = typeof node.data?.label === "string" ? node.data.label.trim() : "";
    return label || node.id;
  };
  const handleAdvanceStage = () => {
    if (!application || !nextStage) return;
    advanceWorkflowStage(application.id, {
      stageId: nextStage.id,
      stageIndex: currentStageIndex + 1,
      stageLabel: getStageLabel(nextStage),
      occurredAt: Date.now()
    });
  };
  const handleResetWorkflow = () => {
    if (!application) return;
    resetWorkflowProgress(application.id);
  };
  const scoreLabel = useMemo(() => {
    if (application?.creditScore === null || application?.creditScore === void 0) return "—";
    if (application.creditMax === null || application.creditMax === void 0) return application.creditScore.toLocaleString();
    return `${application.creditScore.toLocaleString()} / ${application.creditMax.toLocaleString()}`;
  }, [application?.creditMax, application?.creditScore]);
  const bureauRequestedAtLabel = useMemo(() => {
    if (!application?.bureauRequestedAt) return "—";
    return new Date(application.bureauRequestedAt).toLocaleString();
  }, [application?.bureauRequestedAt]);
  const statuses = useMemo(() => ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"], []);
  const getStatusTone = (statusLabel) => {
    switch (statusLabel) {
      case "Completed":
        return {
          badge: "bg-green-50 text-green-700 border-green-200",
          card: "border-green-200 bg-green-50/40"
        };
      case "Current":
        return {
          badge: "bg-blue-50 text-blue-700 border-blue-200",
          card: "border-blue-200 bg-blue-50/40"
        };
      default:
        return {
          badge: "bg-gray-50 text-gray-700 border-gray-200",
          card: "border-gray-200 bg-white"
        };
    }
  };
  if (!application) {
    return /* @__PURE__ */ jsx("div", { className: "p-6 font-sans max-w-3xl mx-auto", children: /* @__PURE__ */ jsxs("div", { className: "border rounded p-4 bg-red-50 text-sm text-gray-800", children: [
      "Application not found.",
      /* @__PURE__ */ jsx("div", { className: "mt-2", children: /* @__PURE__ */ jsx(Link, { to: "/loan/applications", className: "text-blue-600 hover:underline", children: "Back to list" }) })
    ] }) });
  }
  return /* @__PURE__ */ jsxs("div", { className: "p-6 font-sans max-w-3xl mx-auto space-y-4", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: "Application detail" }),
        /* @__PURE__ */ jsxs("p", { className: "text-sm text-gray-700", children: [
          application.productName ?? "Loan product",
          " ·",
          " ",
          application.productCode
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-gray-600 font-mono", children: [
          "Application #: ",
          application.applicationNo
        ] })
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "/loan/applications", className: "text-sm border px-3 rounded hover:bg-gray-50", children: "Back to list" })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border rounded p-4 text-sm space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 md:flex-row md:items-center md:justify-between", children: [
        /* @__PURE__ */ jsx("div", { className: "font-semibold", children: "Status" }),
        /* @__PURE__ */ jsx("select", { className: "border px-2 py-2 rounded", value: application.status, onChange: (e) => updateStatus(application.id, e.target.value), children: statuses.map((status) => /* @__PURE__ */ jsx("option", { value: status, children: status }, status)) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
        /* @__PURE__ */ jsx(Field, { label: "Application #", value: application.applicationNo }),
        /* @__PURE__ */ jsx(Field, { label: "Beneficiary", value: application.beneficiaryName }),
        /* @__PURE__ */ jsx(Field, { label: "National ID", value: application.nationalId }),
        /* @__PURE__ */ jsx(Field, { label: "Age", value: application.age ?? "—" }),
        /* @__PURE__ */ jsx(Field, { label: "Phone", value: application.phone }),
        /* @__PURE__ */ jsx(Field, { label: "Monthly income", value: application.monthlyIncome === null ? "—" : application.monthlyIncome.toLocaleString() }),
        /* @__PURE__ */ jsx(Field, { label: "Channel", value: application.channelCode || "—" }),
        /* @__PURE__ */ jsx(Field, { label: "Requested amount", value: application.requestedAmount.toLocaleString() }),
        /* @__PURE__ */ jsx(Field, { label: "Tenure (months)", value: application.tenureMonths ?? "—" }),
        /* @__PURE__ */ jsx(Field, { label: "Destination", value: application.destinationType }),
        /* @__PURE__ */ jsx(Field, { label: "Setup ID", value: application.setupId }),
        /* @__PURE__ */ jsx(Field, { label: "Score result", value: scoreLabel }),
        /* @__PURE__ */ jsx(Field, { label: "Bureau provider", value: application.bureauProvider || "—" }),
        /* @__PURE__ */ jsx(Field, { label: "Bureau purpose", value: application.bureauPurpose || "—" }),
        /* @__PURE__ */ jsx(Field, { label: "Bureau consent", value: application.bureauConsent ? "Yes" : "No" }),
        /* @__PURE__ */ jsx(Field, { label: "Bureau reference", value: application.bureauReference || "—" }),
        /* @__PURE__ */ jsx(Field, { label: "Bureau requested at", value: bureauRequestedAtLabel })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("div", { className: "font-semibold mb-1", children: "Notes" }),
        /* @__PURE__ */ jsx("div", { className: "border rounded p-3 bg-gray-50 text-gray-700 min-h-16", children: application.notes || "No notes" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border rounded p-4 text-sm space-y-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 md:flex-row md:items-center md:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("div", { className: "font-semibold", children: "Workflow history" }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-600", children: [
            "Linked workflow:",
            " ",
            setup?.workflowName ?? application.workflowName ?? "(not linked)"
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx("button", { type: "button", className: "text-sm border px-3 py-2 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed", onClick: handleAdvanceStage, disabled: !nextStage, children: nextStage ? `Advance to ${getStageLabel(nextStage)}` : "No next stage" }),
          /* @__PURE__ */ jsx("button", { type: "button", className: "text-sm border px-3 py-2 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed", onClick: handleResetWorkflow, disabled: (application.workflowHistory?.length ?? 0) === 0, children: "Reset stages" })
        ] })
      ] }),
      !savedWorkflow ? /* @__PURE__ */ jsx("div", { className: "border rounded p-3 bg-yellow-50 text-gray-800", children: "No workflow is linked to this loan setup. Attach one in Loan Setup to track stage history." }) : workflowStages.length === 0 ? /* @__PURE__ */ jsx("div", { className: "border rounded p-3 bg-gray-50 text-gray-700", children: "Workflow has no stages defined." }) : /* @__PURE__ */ jsx("div", { className: "space-y-2", children: workflowStages.map((stage, idx) => {
        const history = historyByStageIndex.get(idx);
        const statusLabel = idx < currentStageIndex ? "Completed" : idx === currentStageIndex ? "Current" : "Pending";
        const statusTone = getStatusTone(statusLabel);
        return /* @__PURE__ */ jsxs("div", { className: `flex items-start justify-between gap-2 border rounded p-3 ${statusTone.card}`, children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
            /* @__PURE__ */ jsx("div", { className: "font-semibold", children: getStageLabel(stage) }),
            /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-600", children: [
              "Stage ",
              idx + 1
            ] }),
            history ? /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-700", children: [
              "Reached ",
              new Date(history.occurredAt).toLocaleString()
            ] }) : null
          ] }),
          /* @__PURE__ */ jsx("span", { className: `text-xs px-2 py-1 rounded-full border ${statusTone.badge}`, children: statusLabel })
        ] }, `${stage.id}-${idx}`);
      }) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border rounded p-4 text-sm text-gray-700", children: [
      /* @__PURE__ */ jsx("div", { className: "font-semibold mb-1", children: "Timestamps" }),
      /* @__PURE__ */ jsxs("div", { children: [
        "Created: ",
        new Date(application.createdAt).toLocaleString()
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        "Updated: ",
        new Date(application.updatedAt).toLocaleString()
      ] })
    ] })
  ] });
}
function Field({
  label,
  value
}) {
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ jsx("span", { className: "text-gray-600", children: label }),
    /* @__PURE__ */ jsx("span", { className: "font-medium", children: value })
  ] });
}
export {
  RouteComponent as component
};
