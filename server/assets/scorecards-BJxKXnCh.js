import { jsxs, jsx } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { u as useScoreCardStore } from "./scorecard-store-Dlg7Kc76.js";
import "zustand";
import "zustand/middleware";
function ScorecardListPage() {
  const navigate = useNavigate();
  const scoreCards = useScoreCardStore((s) => s.scoreCards);
  const selectScoreCard = useScoreCardStore((s) => s.selectScoreCard);
  const rows = useMemo(() => {
    return Object.values(scoreCards).sort((a, b) => (a.name || a.scoreCardId).localeCompare(b.name || b.scoreCardId));
  }, [scoreCards]);
  const handleOpen = (id, target) => {
    selectScoreCard(id);
    {
      navigate({
        to: "/loan/scorecard-setup"
      });
      return;
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-6 font-sans max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4 gap-3", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: "Scorecard Setups" }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-700", children: "View and open saved scorecards for editing or use in the loan setup flow." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2 justify-end", children: /* @__PURE__ */ jsx(Link, { to: "/loan/scorecard-setup", className: "text-sm border px-3 py-2 rounded hover:bg-gray-50", children: "Create / Edit" }) })
    ] }),
    rows?.length === 0 ? /* @__PURE__ */ jsx("div", { className: "border rounded p-4 bg-gray-50 text-gray-700 text-sm", children: "No scorecards saved yet. Create one to see it listed here." }) : /* @__PURE__ */ jsx("div", { className: "overflow-x-auto border rounded", children: /* @__PURE__ */ jsxs("table", { className: "min-w-full text-sm", children: [
      /* @__PURE__ */ jsx("thead", { className: "bg-gray-100 text-left", children: /* @__PURE__ */ jsxs("tr", { children: [
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Name" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Max Score" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Bureau" }),
        /* @__PURE__ */ jsx("th", { className: "px-3 py-2 font-semibold", children: "Actions" })
      ] }) }),
      /* @__PURE__ */ jsx("tbody", { children: rows.map((card) => {
        return /* @__PURE__ */ jsxs("tr", { className: "border-t hover:bg-gray-50", children: [
          /* @__PURE__ */ jsxs("td", { className: "px-3 py-2", children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium", children: card.name || "(unnamed)" }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: card.scoreCardId })
          ] }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: card.maxScore }),
          /* @__PURE__ */ jsxs("td", { className: "px-3 py-2 text-xs text-gray-700", children: [
            /* @__PURE__ */ jsx("div", { className: "font-medium text-sm", children: card.bureauProvider ?? "—" }),
            /* @__PURE__ */ jsx("div", { children: card.bureauPurpose ?? "" }),
            /* @__PURE__ */ jsx("div", { className: "text-gray-600", children: card.bureauConsentRequired ? "Consent required" : "Consent not required" })
          ] }),
          /* @__PURE__ */ jsx("td", { className: "px-3 py-2", children: /* @__PURE__ */ jsx("div", { className: "flex flex-wrap gap-2", children: /* @__PURE__ */ jsx("button", { type: "button", onClick: () => handleOpen(card.scoreCardId), className: "border px-3 py-1 rounded text-sm hover:bg-gray-50", children: "Open in editor" }) }) })
        ] }, card.scoreCardId);
      }) })
    ] }) })
  ] });
}
export {
  ScorecardListPage as component
};
