import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { u as useRepaymentSetupStore, g as getRepaymentPlanList } from "./repayment-setup-store-Cm_G_mNP.js";
import "uuid";
import "zustand";
import "zustand/middleware";
const emptyForm = {
  name: "",
  description: "",
  method: "EMI",
  frequency: "MONTHLY",
  dueDayOfMonth: 5,
  firstDueAfterDays: 30,
  gracePeriodDays: 5,
  lateFeeFlat: 0,
  lateFeePct: 0,
  prepaymentPenaltyPct: 0,
  autopayRequired: false,
  roundingStep: 100,
  minInstallmentAmount: null
};
function RouteComponent() {
  const plans = useRepaymentSetupStore((s) => s.plans);
  const selectedPlanId = useRepaymentSetupStore((s) => s.selectedPlanId);
  const addPlan = useRepaymentSetupStore((s) => s.addPlan);
  const selectPlan = useRepaymentSetupStore((s) => s.selectPlan);
  const removePlan = useRepaymentSetupStore((s) => s.removePlan);
  const planList = useMemo(() => getRepaymentPlanList(plans), [plans]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState(null);
  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);
    try {
      const created = addPlan({
        ...form,
        name: form.name.trim(),
        description: form.description?.trim() || ""
      });
      selectPlan(created.planId);
      setForm(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save plan");
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-6 font-sans max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: "Repayment Setup" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-700", children: "Define repayment plans that can be reused in Loan Setup." })
      ] }),
      /* @__PURE__ */ jsx(Link, { to: "/loan/setup", className: "text-sm border px-3 py-1 rounded hover:bg-gray-50", children: "Back to Loan Setup" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "grid gap-6 md:grid-cols-[1.4fr_1fr]", children: [
      /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "font-semibold", children: "New repayment plan" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500", children: "Persisted via Zustand" })
        ] }),
        /* @__PURE__ */ jsxs("form", { className: "space-y-3", onSubmit: handleSubmit, children: [
          /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
            /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
              /* @__PURE__ */ jsx("span", { children: "Name" }),
              /* @__PURE__ */ jsx("input", { type: "text", value: form.name, onChange: (e) => setForm((prev) => ({
                ...prev,
                name: e.target.value
              })), className: "border px-2 py-2 rounded", placeholder: "e.g. Monthly EMI", required: true })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
              /* @__PURE__ */ jsx("span", { children: "Method" }),
              /* @__PURE__ */ jsxs("select", { value: form.method, onChange: (e) => setForm((prev) => ({
                ...prev,
                method: e.target.value
              })), className: "border px-2 py-2 rounded", children: [
                /* @__PURE__ */ jsx("option", { value: "EMI", children: "EMI (amortized)" }),
                /* @__PURE__ */ jsx("option", { value: "INTEREST_ONLY", children: "Interest only" }),
                /* @__PURE__ */ jsx("option", { value: "BULLET", children: "Bullet" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
              /* @__PURE__ */ jsx("span", { children: "Frequency" }),
              /* @__PURE__ */ jsxs("select", { value: form.frequency, onChange: (e) => setForm((prev) => ({
                ...prev,
                frequency: e.target.value
              })), className: "border px-2 py-2 rounded", children: [
                /* @__PURE__ */ jsx("option", { value: "WEEKLY", children: "Weekly" }),
                /* @__PURE__ */ jsx("option", { value: "BIWEEKLY", children: "Bi-weekly" }),
                /* @__PURE__ */ jsx("option", { value: "MONTHLY", children: "Monthly" }),
                /* @__PURE__ */ jsx("option", { value: "QUARTERLY", children: "Quarterly" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
              /* @__PURE__ */ jsx("span", { children: "Due day (1-28, monthly)" }),
              /* @__PURE__ */ jsx("input", { type: "number", min: 1, max: 28, value: form.dueDayOfMonth ?? "", onChange: (e) => setForm((prev) => ({
                ...prev,
                dueDayOfMonth: e.target.value ? Number(e.target.value) : null
              })), className: "border px-2 py-2 rounded", placeholder: "e.g. 5" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
              /* @__PURE__ */ jsx("span", { children: "First due after (days)" }),
              /* @__PURE__ */ jsx("input", { type: "number", min: 0, value: form.firstDueAfterDays ?? "", onChange: (e) => setForm((prev) => ({
                ...prev,
                firstDueAfterDays: Number(e.target.value)
              })), className: "border px-2 py-2 rounded", placeholder: "30" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
              /* @__PURE__ */ jsx("span", { children: "Grace period (days)" }),
              /* @__PURE__ */ jsx("input", { type: "number", min: 0, value: form.gracePeriodDays ?? "", onChange: (e) => setForm((prev) => ({
                ...prev,
                gracePeriodDays: Number(e.target.value)
              })), className: "border px-2 py-2 rounded", placeholder: "5" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
              /* @__PURE__ */ jsx("span", { children: "Late fee flat" }),
              /* @__PURE__ */ jsx("input", { type: "number", min: 0, value: form.lateFeeFlat ?? "", onChange: (e) => setForm((prev) => ({
                ...prev,
                lateFeeFlat: Number(e.target.value)
              })), className: "border px-2 py-2 rounded", placeholder: "0" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
              /* @__PURE__ */ jsx("span", { children: "Late fee (%)" }),
              /* @__PURE__ */ jsx("input", { type: "number", step: 0.1, min: 0, value: form.lateFeePct ?? "", onChange: (e) => setForm((prev) => ({
                ...prev,
                lateFeePct: Number(e.target.value)
              })), className: "border px-2 py-2 rounded", placeholder: "1" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
              /* @__PURE__ */ jsx("span", { children: "Prepayment penalty (%)" }),
              /* @__PURE__ */ jsx("input", { type: "number", step: 0.1, min: 0, value: form.prepaymentPenaltyPct ?? "", onChange: (e) => setForm((prev) => ({
                ...prev,
                prepaymentPenaltyPct: Number(e.target.value)
              })), className: "border px-2 py-2 rounded", placeholder: "2" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
              /* @__PURE__ */ jsx("span", { children: "Rounding step" }),
              /* @__PURE__ */ jsx("input", { type: "number", min: 1, value: form.roundingStep ?? "", onChange: (e) => setForm((prev) => ({
                ...prev,
                roundingStep: Number(e.target.value)
              })), className: "border px-2 py-2 rounded", placeholder: "100" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
              /* @__PURE__ */ jsx("span", { children: "Min installment amount" }),
              /* @__PURE__ */ jsx("input", { type: "number", min: 0, value: form.minInstallmentAmount ?? "", onChange: (e) => setForm((prev) => ({
                ...prev,
                minInstallmentAmount: e.target.value ? Number(e.target.value) : null
              })), className: "border px-2 py-2 rounded", placeholder: "optional" })
            ] }),
            /* @__PURE__ */ jsxs("label", { className: "inline-flex items-center gap-2 text-sm", children: [
              /* @__PURE__ */ jsx("input", { type: "checkbox", checked: form.autopayRequired, onChange: (e) => setForm((prev) => ({
                ...prev,
                autopayRequired: e.target.checked
              })), className: "accent-blue-600" }),
              /* @__PURE__ */ jsx("span", { children: "Autopay required" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
            /* @__PURE__ */ jsx("span", { children: "Description" }),
            /* @__PURE__ */ jsx("textarea", { value: form.description, onChange: (e) => setForm((prev) => ({
              ...prev,
              description: e.target.value
            })), className: "border px-2 py-2 rounded", rows: 3, placeholder: "Notes for ops team" })
          ] }),
          error && /* @__PURE__ */ jsx("div", { className: "text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2", children: error }),
          /* @__PURE__ */ jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsx("button", { type: "submit", className: "bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700", children: "Save plan" }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ jsx("h2", { className: "font-semibold", children: "Saved plans" }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-500", children: "Select to use in Loan Setup" })
        ] }),
        planList.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-700", children: "No plans yet." }) : /* @__PURE__ */ jsx("div", { className: "space-y-3", children: planList.map((plan) => /* @__PURE__ */ jsxs("div", { className: `border rounded p-3 text-sm ${selectedPlanId === plan.planId ? "border-blue-500 bg-blue-50" : "border-gray-200"}`, children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-start justify-between gap-2", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { className: "font-semibold", children: plan.name }),
              /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-600", children: [
                plan.method,
                " · ",
                plan.frequency
              ] }),
              plan.description ? /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-700 mt-1", children: plan.description }) : null
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ jsx("button", { type: "button", onClick: () => selectPlan(plan.planId), className: "text-sm border px-3 py-1 rounded hover:bg-gray-100", children: "Use" }),
              /* @__PURE__ */ jsx("button", { type: "button", onClick: () => removePlan(plan.planId), className: "text-sm border px-3 py-1 rounded hover:bg-gray-100", children: "Delete" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("dl", { className: "grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-gray-700", children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { children: "Due day" }),
              /* @__PURE__ */ jsx("dd", { children: plan.dueDayOfMonth ?? "—" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { children: "Grace period" }),
              /* @__PURE__ */ jsxs("dd", { children: [
                plan.gracePeriodDays,
                " days"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { children: "Late fee" }),
              /* @__PURE__ */ jsxs("dd", { children: [
                plan.lateFeeFlat.toLocaleString(),
                " + ",
                plan.lateFeePct,
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { children: "Prepayment" }),
              /* @__PURE__ */ jsxs("dd", { children: [
                plan.prepaymentPenaltyPct,
                "%"
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { children: "Rounding" }),
              /* @__PURE__ */ jsx("dd", { children: plan.roundingStep })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("dt", { children: "Autopay" }),
              /* @__PURE__ */ jsx("dd", { children: plan.autopayRequired ? "Required" : "Optional" })
            ] })
          ] })
        ] }, plan.planId)) })
      ] })
    ] })
  ] });
}
export {
  RouteComponent as component
};
