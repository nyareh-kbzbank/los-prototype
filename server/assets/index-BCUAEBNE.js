import { jsxs, jsx } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { u as useLoanApplicationStore, g as getLoanApplicationList } from "./loan-application-store-lyPNXgVT.js";
import { u as useLoanSetupStore } from "./loan-setup-store-X8Js1XLI.js";
import "uuid";
import "zustand";
import "zustand/middleware";
function LoanApplicationList() {
  const applications = useLoanApplicationStore((s) => s.applications);
  useLoanSetupStore((s) => s.setups);
  const rows = useMemo(() => getLoanApplicationList(applications), [applications]);
  return /* @__PURE__ */ jsxs("div", { className: "p-6 font-sans max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: "Loan Applications" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-700", children: "Applications saved against configured loan products." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(Link, { to: "/loan/applications/create", className: "text-sm border px-3 rounded hover:bg-gray-50", children: "New application" }),
        /* @__PURE__ */ jsx(Link, { to: "/loan/setup", className: "text-sm border px-3 rounded hover:bg-gray-50", children: "Configure loan" })
      ] })
    ] }),
    rows.length === 0 ? /* @__PURE__ */ jsx("div", { className: "border rounded p-4 bg-gray-50 text-gray-700 text-sm", children: "No applications yet. Create a loan setup, then start an application." }) : /* @__PURE__ */ jsx("div", { className: "overflow-x-auto border rounded", children: /* @__PURE__ */ jsxs("table", { className: "min-w-full text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-gray-100 text-left", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Application #" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Beneficiary" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Product" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Amount" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Credit score" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Status" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Created" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: rows.map((row) => {
        const score = row.creditScore ?? null;
        const max = row.creditMax ?? null;
        return /* @__PURE__ */ jsxs("tr", { className: "border-t hover:bg-gray-50", children: [
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2 font-mono text-xs text-gray-700", children: row.applicationNo }),
          /* @__PURE__ */ jsxs("td", { className: "px-3 py-2", children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium", children: row.beneficiaryName }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: row.nationalId })
          ] }),
          /* @__PURE__ */ jsxs("td", { className: "px-3 py-2", children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium", children: row.productName ?? "" }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: row.productCode })
          ] }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2 font-mono", children: row.requestedAmount.toLocaleString() }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2 whitespace-nowrap", children: score === null ? "—" : max ? `${score} / ${max}` : `${score}` }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: row.status }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2 whitespace-nowrap", children: new Date(row.createdAt).toLocaleString() }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsx(Link, { to: "/loan/applications/$applicationId", params: {
            applicationId: row.id
          }, className: "text-sm text-blue-600 hover:underline", children: "View" }) })
        ] }, row.id);
      }) })
    ] }) })
  ] });
}
export {
  LoanApplicationList as component
};
