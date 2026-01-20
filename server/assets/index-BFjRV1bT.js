import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { u as useLoanSetupStore, g as getLoanSetupList } from "./loan-setup-store-X8Js1XLI.js";
import "uuid";
import "zustand";
import "zustand/middleware";
function LoanWorkflowList() {
  const setups = useLoanSetupStore((s) => s.setups);
  const rows = useMemo(() => getLoanSetupList(setups), [setups]);
  return /* @__PURE__ */ jsxs("div", { className: "p-6 font-sans max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: "Saved Loan Setup" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-700", children: "Snapshots are saved from the Loan Setup page." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(Link, { to: "/loan/setup", className: "text-sm border px-3 rounded hover:bg-gray-50", children: "Create" }),
        /* @__PURE__ */ jsx(Link, { to: "/workflow", className: "text-sm border px-3 rounded hover:bg-gray-50", children: "Create Workflow" }),
        /* @__PURE__ */ jsx(Link, { to: "/loan/repayment-setup", className: "text-sm border px-3 rounded hover:bg-gray-50", children: "Create Repayment Setup" }),
        /* @__PURE__ */ jsx(Link, { to: "/loan/scorecard-setup", className: "text-sm border px-3 rounded hover:bg-gray-50", children: "Create Score Card" }),
        /* @__PURE__ */ jsx(Link, { to: "/loan/scorecards", className: "text-sm border px-3 rounded hover:bg-gray-50", children: "Score Card List" })
      ] })
    ] }),
    rows.length === 0 ? /* @__PURE__ */ jsx("div", { className: "border rounded p-4 bg-gray-50 text-gray-700 text-sm", children: "Nothing saved yet. Use the save button on the setup page first." }) : /* @__PURE__ */ jsx("div", { className: "overflow-x-auto border rounded", children: /* @__PURE__ */ jsxs("table", { className: "min-w-full text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-gray-100 text-left", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Product" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Scorecard" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Workflow" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Repayment" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Risk" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Created" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: rows.map((row) => /* @__PURE__ */ jsxs("tr", { className: "border-t hover:bg-gray-50", children: [
        /* @__PURE__ */ jsxs("td", { className: "px-3 py-2", children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium", children: row.product.productName }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: row.product.productCode })
        ] }),
        /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: row.scorecardName ?? row.scorecardId ?? "—" }),
        /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: row.workflowName ?? row.workflowId ?? "—" }),
        /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: row.repaymentPlanName ?? row.repaymentPlanId ?? "—" }),
        /* @__PURE__ */ jsxs("td", { className: "px-3 py-2", children: [
          row.riskGrade ?? "—",
          row.totalScore == null ? "" : ` (${row.totalScore})`
        ] }),
        /* @__PURE__ */ jsx("td", { className: "px-3 py-2 whitespace-nowrap", children: new Date(row.createdAt).toLocaleString() })
      ] }, row.id)) })
    ] }) })
  ] });
}
export {
  LoanWorkflowList as component
};
