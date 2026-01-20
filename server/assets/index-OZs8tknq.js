import { jsx, jsxs } from "react/jsx-runtime";
import { Link } from "@tanstack/react-router";
import { LayoutTemplate, Network, ClipboardList, Receipt, Archive, ListChecks, Table, FilePlus2 } from "lucide-react";
const configureCards = [{
  title: "Loan Setup",
  description: "Configure product details, channels, disbursement options, and workflow selection.",
  to: "/loan/setup",
  icon: LayoutTemplate,
  accent: "bg-cyan-500/15 text-cyan-400"
}, {
  title: "Workflow Builder",
  description: "Design and visualize the processing steps for each loan.",
  to: "/workflow",
  icon: Network,
  accent: "bg-sky-500/15 text-sky-300"
}, {
  title: "Scorecard Setup",
  description: "Define rules, weights, and test inputs to calculate risk scores.",
  to: "/loan/scorecard-setup",
  icon: ClipboardList,
  accent: "bg-amber-500/15 text-amber-300"
}, {
  title: "Repayment Setup",
  description: "Create and manage reusable repayment plans for loan products.",
  to: "/loan/repayment-setup",
  icon: Receipt,
  accent: "bg-emerald-500/15 text-emerald-300"
}];
function App() {
  const libraryCards = [{
    title: "Loan Setup Library",
    description: "Browse saved loan product setups and snapshots.",
    to: "/loan",
    icon: Archive,
    accent: "bg-indigo-500/15 text-indigo-300"
  }, {
    title: "Scorecard Library",
    description: "View saved scorecards and open them for editing or use.",
    to: "/loan/scorecards",
    icon: ListChecks,
    accent: "bg-fuchsia-500/15 text-fuchsia-300"
  }, {
    title: "Loan Applications",
    description: "Review submitted applications and drill into details.",
    to: "/loan/applications",
    icon: Table,
    accent: "bg-teal-500/15 text-teal-300"
  }];
  const actionCards = [{
    title: "New Application",
    description: "Capture beneficiary info, calculate scores, and submit.",
    to: "/loan/applications/create",
    icon: FilePlus2,
    accent: "bg-lime-500/15 text-lime-300"
  }];
  const renderCard = (card) => {
    const Icon = card.icon;
    return /* @__PURE__ */ jsxs(Link, { to: card.to, className: "group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md", children: [
      /* @__PURE__ */ jsx("span", { className: `rounded-lg p-2 ${card.accent}`, children: /* @__PURE__ */ jsx(Icon, { className: "w-5 h-5" }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "text-lg font-semibold text-slate-900 group-hover:text-cyan-700", children: card.title }),
        /* @__PURE__ */ jsx("p", { className: "text-slate-600 text-sm", children: card.description })
      ] })
    ] }, card.to);
  };
  return /* @__PURE__ */ jsx("div", { className: "p-6 font-sans text-slate-900", children: /* @__PURE__ */ jsx("section", { className: "max-w-5xl mx-auto space-y-8", children: /* @__PURE__ */ jsxs("div", { className: "bg-white border border-slate-200 rounded-2xl p-8 shadow-sm", children: [
    /* @__PURE__ */ jsx("p", { className: "text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 mb-2", children: "LOS" }),
    /* @__PURE__ */ jsx("h1", { className: "text-3xl font-bold mb-2", children: "Welcome back" }),
    /* @__PURE__ */ jsx("p", { className: "text-slate-600 text-base leading-relaxed mb-8", children: "Set up loan products, tune scorecards, and manage applications from one spot." }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-slate-700", children: "Configure" }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: configureCards.map(renderCard) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-slate-700", children: "Libraries & Lists" }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: libraryCards.map(renderCard) })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-slate-700", children: "Actions" }),
        /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: actionCards.map(renderCard) })
      ] })
    ] })
  ] }) }) });
}
export {
  App as component
};
