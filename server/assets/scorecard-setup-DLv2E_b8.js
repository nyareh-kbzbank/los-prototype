import { jsxs, jsx } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { Plus, Trash2, X } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { i as inferFieldKind, e as evaluateScoreCard } from "./scorecard-engine-DdqdXgEo.js";
import { u as useScoreCardStore, o as operatorOptions } from "./scorecard-store-Dlg7Kc76.js";
import "zustand";
import "zustand/middleware";
const humanizeFieldName = (field) => {
  return field.replace(/[_-]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/\s+/g, " ").trim().replace(/^./, (c) => c.toUpperCase());
};
const createRuleForField = (field) => ({
  field,
  operator: ">=",
  value: "",
  score: 0
});
const createFieldGroup = (field) => ({
  field,
  description: humanizeFieldName(field),
  rules: [createRuleForField(field)]
});
const generateScoreCardId = () => globalThis.crypto?.randomUUID?.() ?? `scorecard_${Date.now()}`;
const createEmptyScoreCard = () => ({
  scoreCardId: generateScoreCardId(),
  name: "New Scorecard",
  maxScore: 100,
  fields: [],
  bureauProvider: "Experian",
  bureauPurpose: "Credit assessment",
  bureauConsentRequired: true
});
const operatorPlaceholder = (op) => {
  switch (op) {
    case "between":
      return "min,max (e.g. 18,60)";
    case "in":
      return "Comma list (e.g. gold,silver)";
    case "notin":
      return "Comma list (e.g. denied,blocked)";
    case "contains":
      return "Substring (case-sensitive)";
    default:
      return "Value";
  }
};
const withBureauDefaults = (card) => ({
  ...card,
  bureauProvider: card.bureauProvider ?? "Experian",
  bureauPurpose: card.bureauPurpose ?? "Credit assessment",
  bureauConsentRequired: card.bureauConsentRequired ?? true
});
function ScorecardSetupComponent() {
  const scoreCards = useScoreCardStore((s) => s.scoreCards);
  const selectedScoreCardId = useScoreCardStore((s) => s.selectedScoreCardId);
  const selectScoreCard = useScoreCardStore((s) => s.selectScoreCard);
  const upsertScoreCard = useScoreCardStore((s) => s.upsertScoreCard);
  const removeScoreCard = useScoreCardStore((s) => s.removeScoreCard);
  const selectedFromStore = scoreCards[selectedScoreCardId];
  const [scoreCard, setScoreCard] = useState(selectedFromStore ? withBureauDefaults({
    ...selectedFromStore,
    fields: selectedFromStore.fields ?? []
  }) : createEmptyScoreCard());
  const [newFieldName, setNewFieldName] = useState("");
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testInputs, setTestInputs] = useState({});
  const [testResult, setTestResult] = useState(null);
  const allRules = useMemo(() => {
    return scoreCard.fields.flatMap((f) => f.rules ?? []);
  }, [scoreCard.fields]);
  useEffect(() => {
    if (!selectedFromStore) return;
    setScoreCard(withBureauDefaults({
      ...selectedFromStore,
      fields: selectedFromStore.fields ?? []
    }));
  }, [selectedFromStore]);
  const handleCardInfoChange = (e) => {
    const {
      name,
      value
    } = e.target;
    setScoreCard((prev) => {
      if (name === "maxScore") {
        return {
          ...prev,
          maxScore: Number(value)
        };
      }
      if (name === "scoreCardId") {
        return {
          ...prev,
          scoreCardId: value
        };
      }
      if (name === "name") {
        return {
          ...prev,
          name: value
        };
      }
      if (name === "bureauProvider") {
        return {
          ...prev,
          bureauProvider: value
        };
      }
      if (name === "bureauPurpose") {
        return {
          ...prev,
          bureauPurpose: value
        };
      }
      return prev;
    });
  };
  const updateFieldName = (fieldIndex, value) => {
    setScoreCard((prev) => {
      const fields = [...prev.fields];
      const target = fields[fieldIndex];
      if (!target) return prev;
      const nextField = value.trim();
      const updatedRules = (target.rules ?? []).map((rule) => ({
        ...rule,
        field: nextField
      }));
      fields[fieldIndex] = {
        ...target,
        field: nextField,
        rules: updatedRules
      };
      return {
        ...prev,
        fields
      };
    });
  };
  const updateFieldDescription = (fieldIndex, value) => {
    setScoreCard((prev) => {
      const fields = [...prev.fields];
      const target = fields[fieldIndex];
      if (!target) return prev;
      fields[fieldIndex] = {
        ...target,
        description: value
      };
      return {
        ...prev,
        fields
      };
    });
  };
  const updateRuleAt = (fieldIndex, ruleIndex, next) => {
    setScoreCard((prev) => {
      const fields = [...prev.fields];
      const target = fields[fieldIndex];
      if (!target) return prev;
      const rules = [...target.rules ?? []];
      rules[ruleIndex] = {
        ...next,
        field: target.field
      };
      fields[fieldIndex] = {
        ...target,
        rules
      };
      return {
        ...prev,
        fields
      };
    });
  };
  const removeRuleAt = (fieldIndex, ruleIndex) => {
    setScoreCard((prev) => {
      const fields = [...prev.fields];
      const target = fields[fieldIndex];
      if (!target) return prev;
      const rules = (target.rules ?? []).filter((_, i) => i !== ruleIndex);
      fields[fieldIndex] = {
        ...target,
        rules
      };
      return {
        ...prev,
        fields
      };
    });
  };
  const addConditionToField = (fieldIndex) => {
    setScoreCard((prev) => {
      const fields = [...prev.fields];
      const target = fields[fieldIndex];
      if (!target) return prev;
      const rules = [...target.rules ?? [], createRuleForField(target.field)];
      fields[fieldIndex] = {
        ...target,
        rules
      };
      return {
        ...prev,
        fields
      };
    });
  };
  const addField = () => {
    const field = newFieldName.trim();
    if (!field) return;
    setScoreCard((prev) => {
      if (prev.fields.some((f) => f.field === field)) return prev;
      return {
        ...prev,
        fields: [...prev.fields, createFieldGroup(field)]
      };
    });
    setNewFieldName("");
  };
  const removeFieldAt = (fieldIndex) => {
    setScoreCard((prev) => {
      const fields = prev.fields.filter((_, idx) => idx !== fieldIndex);
      return {
        ...prev,
        fields
      };
    });
  };
  const openTestModal = () => {
    setTestInputs((prev) => {
      const next = {
        ...prev
      };
      for (const f of scoreCard.fields) {
        next[f.field] ??= "";
      }
      return next;
    });
    setTestResult(null);
    setIsTestOpen(true);
  };
  const closeTestModal = () => {
    setIsTestOpen(false);
  };
  const runTest = () => {
    setTestResult(evaluateScoreCard(scoreCard, testInputs));
  };
  const navigate = useNavigate();
  const onSave = () => {
    upsertScoreCard(scoreCard, {
      select: true
    });
    navigate({
      to: "/"
    });
  };
  const onDeleteSelected = () => {
    removeScoreCard(selectedScoreCardId);
  };
  const scoreCardList = useMemo(() => {
    return Object.values(scoreCards).sort((a, b) => (a.name || a.scoreCardId).localeCompare(b.name || b.scoreCardId));
  }, [scoreCards]);
  return /* @__PURE__ */ jsxs("div", { className: "p-6 font-sans max-w-4xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4 gap-3", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: "Scorecard Engine Setup" }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
        /* @__PURE__ */ jsx(Link, { to: "/loan/scorecards", className: "text-sm border px-3 py-1 rounded hover:bg-gray-50", children: "View Scorecards" }),
        /* @__PURE__ */ jsx(Link, { to: "/loan/setup", className: "text-sm border px-3 py-1 rounded hover:bg-gray-50", children: "Back to Loan Setup" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded mb-6 bg-white", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-semibold text-lg mb-3", children: "Saved Scorecards" }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 items-end", children: [
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Choose Scorecard" }),
          /* @__PURE__ */ jsx("select", { value: selectedScoreCardId, onChange: (e) => selectScoreCard(e.target.value), className: "border px-2 py-1 rounded", children: scoreCardList.map((c) => /* @__PURE__ */ jsx("option", { value: c.scoreCardId, children: c.name || c.scoreCardId }, c.scoreCardId)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx("button", { type: "button", onClick: onSave, className: "border px-3 py-2 rounded text-sm hover:bg-gray-50", children: "Create" }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: onDeleteSelected, className: "border px-3 py-2 rounded text-sm text-red-600 hover:bg-red-50", title: "Delete selected scorecard", children: "Delete" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "mt-2 text-xs text-gray-600", children: "Save updates to overwrite the selected scorecard, or use “Save as New” to create another." })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded mb-6 bg-white", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-semibold text-lg mb-3", children: "Scorecard Details" }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Scorecard ID" }),
          /* @__PURE__ */ jsx("input", { type: "text", name: "scoreCardId", value: scoreCard.scoreCardId, onChange: handleCardInfoChange, className: "border px-2 py-1 rounded" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Scorecard Name" }),
          /* @__PURE__ */ jsx("input", { type: "text", name: "name", value: scoreCard.name, onChange: handleCardInfoChange, className: "border px-2 py-1 rounded" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Max Score" }),
          /* @__PURE__ */ jsx("input", { type: "number", name: "maxScore", value: scoreCard.maxScore, onChange: handleCardInfoChange, className: "border px-2 py-1 rounded" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mt-4", children: [
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Bureau provider" }),
          /* @__PURE__ */ jsx("input", { type: "text", name: "bureauProvider", value: scoreCard.bureauProvider ?? "", onChange: handleCardInfoChange, className: "border px-2 py-1 rounded", placeholder: "e.g., Experian" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Bureau purpose" }),
          /* @__PURE__ */ jsx("input", { type: "text", name: "bureauPurpose", value: scoreCard.bureauPurpose ?? "", onChange: handleCardInfoChange, className: "border px-2 py-1 rounded", placeholder: "e.g., Credit assessment" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-2 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Bureau consent required" }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("input", { type: "checkbox", className: "h-4 w-4", checked: Boolean(scoreCard.bureauConsentRequired), onChange: (e) => setScoreCard((prev) => ({
              ...prev,
              bureauConsentRequired: e.target.checked
            })) }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-700", children: "Indicates whether beneficiary consent must be captured before bureau pulls." })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded mb-6 bg-white", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "font-semibold text-lg", children: "Rules" }),
          /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-600", children: [
            "Rules are grouped by field; each field can have multiple conditions. For operators ",
            /* @__PURE__ */ jsx("em", { children: "between" }),
            ", use two values separated by a comma (min,max). For ",
            /* @__PURE__ */ jsx("em", { children: "in" }),
            "/",
            /* @__PURE__ */ jsx("em", { children: "notin" }),
            ", provide a comma-separated list."
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ jsx("input", { type: "text", value: newFieldName, onChange: (e) => setNewFieldName(e.target.value), placeholder: "Add a field (e.g., loanAmount)", className: "border px-2 py-1 rounded text-sm" }),
          /* @__PURE__ */ jsx("button", { onClick: addField, type: "button", className: "bg-blue-600 text-white px-3 py-1 rounded text-sm", children: "Add Field" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-4", children: scoreCard.fields.map((fieldGroup, fieldIndex) => /* @__PURE__ */ jsxs("div", { className: "border rounded p-3", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2 gap-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
            /* @__PURE__ */ jsx("span", { className: "font-semibold", children: fieldGroup.description || humanizeFieldName(fieldGroup.field) }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-600", children: fieldGroup.field })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2", children: [
            /* @__PURE__ */ jsxs("button", { onClick: () => addConditionToField(fieldIndex), type: "button", className: "flex items-center gap-1 text-sm border px-2 py-1 rounded hover:bg-gray-50", children: [
              /* @__PURE__ */ jsx(Plus, { className: "w-4 h-4" }),
              "Add Condition"
            ] }),
            /* @__PURE__ */ jsxs("button", { onClick: () => removeFieldAt(fieldIndex), type: "button", className: "flex items-center gap-1 text-sm border px-2 py-1 rounded text-red-600 hover:bg-red-50", children: [
              /* @__PURE__ */ jsx(Trash2, { className: "w-4 h-4" }),
              "Remove Field"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-sm", children: [
          /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1", children: [
            /* @__PURE__ */ jsx("span", { children: "Field name" }),
            /* @__PURE__ */ jsx("input", { type: "text", value: fieldGroup.field, onChange: (e) => updateFieldName(fieldIndex, e.target.value), className: "border px-2 py-1 rounded" })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1", children: [
            /* @__PURE__ */ jsx("span", { children: "Field description" }),
            /* @__PURE__ */ jsx("input", { type: "text", value: fieldGroup.description, onChange: (e) => updateFieldDescription(fieldIndex, e.target.value), className: "border px-2 py-1 rounded" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-2", children: (fieldGroup.rules ?? []).map((rule, ruleIndex) => /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-2 items-center", children: [
          /* @__PURE__ */ jsx("select", { value: rule.operator, onChange: (e) => updateRuleAt(fieldIndex, ruleIndex, {
            ...rule,
            operator: e.target.value
          }), className: "border px-2 py-1 rounded text-sm", children: operatorOptions.map((op) => /* @__PURE__ */ jsx("option", { value: op, children: op }, op)) }),
          /* @__PURE__ */ jsx("input", { type: "text", placeholder: operatorPlaceholder(rule.operator), value: rule.value, onChange: (e) => updateRuleAt(fieldIndex, ruleIndex, {
            ...rule,
            value: e.target.value
          }), className: "border px-2 py-1 rounded text-sm" }),
          /* @__PURE__ */ jsx("input", { type: "number", placeholder: "Score", value: rule.score, onChange: (e) => updateRuleAt(fieldIndex, ruleIndex, {
            ...rule,
            score: Number(e.target.value)
          }), className: "border px-2 py-1 rounded text-sm" }),
          /* @__PURE__ */ jsx("button", { onClick: () => removeRuleAt(fieldIndex, ruleIndex), type: "button", className: "text-red-500 hover:text-red-700 justify-self-end", children: /* @__PURE__ */ jsx(Trash2, { className: "w-4 h-4" }) }),
          ["between", "in", "notin"].includes(rule.operator) ? /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-600 md:col-span-4", children: [
            rule.operator === "between" && "Use two values separated by a comma: min,max (numbers).",
            rule.operator === "in" && "Comma-separated list of allowed values (trim spaces).",
            rule.operator === "notin" && "Comma-separated list of blocked values (trim spaces)."
          ] }) : null
        ] }, `${fieldGroup.field}-${ruleIndex}`)) })
      ] }, `${fieldGroup.field}-${fieldIndex}`)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded bg-gray-50", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-2", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-semibold text-lg", children: "Live JSON Output" }),
        /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: /* @__PURE__ */ jsx("button", { onClick: openTestModal, type: "button", className: "bg-purple-600 text-white px-3 py-1 rounded text-sm", children: "Test Score Engine" }) })
      ] }),
      /* @__PURE__ */ jsx("pre", { className: "bg-gray-900 text-white p-4 rounded text-sm overflow-x-auto", children: JSON.stringify(scoreCard, null, 2) })
    ] }),
    isTestOpen && /* @__PURE__ */ jsxs("div", { className: "fixed inset-0 z-50 flex items-center justify-center", children: [
      /* @__PURE__ */ jsx("button", { type: "button", className: "absolute inset-0 bg-black/40", onClick: closeTestModal, "aria-label": "Close modal" }),
      /* @__PURE__ */ jsxs("div", { className: "relative w-full max-w-3xl mx-4 rounded bg-white shadow-lg border", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-4 border-b", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-lg font-semibold", children: "Test Score Engine" }),
            /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: "Enter only the fields you configured in this scorecard." })
          ] }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: closeTestModal, className: "p-2 rounded hover:bg-gray-100", "aria-label": "Close", children: /* @__PURE__ */ jsx(X, { className: "w-4 h-4" }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "p-4 space-y-4", children: [
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: scoreCard.fields.map((fieldGroup) => {
            const kind = inferFieldKind(fieldGroup.rules ?? []);
            const inputId = `test-${fieldGroup.field}`;
            const label = fieldGroup.description || humanizeFieldName(fieldGroup.field);
            return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 text-sm", children: [
              /* @__PURE__ */ jsx("label", { htmlFor: inputId, className: "font-medium", children: label }),
              kind === "boolean" ? /* @__PURE__ */ jsxs("select", { id: inputId, value: testInputs[fieldGroup.field] ?? "", onChange: (e) => setTestInputs((prev) => ({
                ...prev,
                [fieldGroup.field]: e.target.value
              })), className: "border px-2 py-1 rounded", children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "(not set)" }),
                /* @__PURE__ */ jsx("option", { value: "true", children: "true" }),
                /* @__PURE__ */ jsx("option", { value: "false", children: "false" })
              ] }) : /* @__PURE__ */ jsx("input", { type: kind === "number" ? "number" : "text", id: inputId, value: testInputs[fieldGroup.field] ?? "", onChange: (e) => setTestInputs((prev) => ({
                ...prev,
                [fieldGroup.field]: e.target.value
              })), className: "border px-2 py-1 rounded", placeholder: (fieldGroup.rules ?? []).some((rule) => rule.operator === "between") ? "For between: e.g. 25,45" : "" })
            ] }, fieldGroup.field);
          }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("button", { onClick: runTest, type: "button", className: "bg-purple-600 text-white px-3 py-1 rounded text-sm", children: "Run Test" }),
            /* @__PURE__ */ jsx("button", { onClick: () => {
              setTestInputs({});
              setTestResult(null);
            }, type: "button", className: "text-sm border px-3 py-1 rounded hover:bg-gray-50", children: "Clear Inputs" })
          ] }),
          testResult && /* @__PURE__ */ jsxs("div", { className: "border rounded p-3 bg-gray-50", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-x-6 gap-y-1 text-sm", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Score:" }),
                " ",
                testResult.totalScore,
                " / ",
                testResult.maxScore,
                " —",
                " ",
                testResult.riskGrade
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Matched rules:" }),
                " ",
                testResult.matchedRules,
                " / ",
                allRules.length
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-3 space-y-1", children: testResult.breakdown.map((b, idx) => {
              let rowClass = "text-gray-700";
              if (b.skippedBecauseMissingInput) {
                rowClass = "text-gray-400";
              } else if (b.matched) {
                rowClass = "text-green-700";
              }
              const label = b.fieldDescription || humanizeFieldName(b.field);
              return /* @__PURE__ */ jsxs("div", { className: `flex justify-between gap-3 text-sm ${rowClass}`, children: [
                /* @__PURE__ */ jsxs("span", { children: [
                  label,
                  " ",
                  b.operator,
                  " ",
                  b.value,
                  b.skippedBecauseMissingInput ? " (skipped: no input)" : ""
                ] }),
                /* @__PURE__ */ jsx("span", { children: b.matched ? `+${b.score}` : "0" })
              ] }, `${b.field}-${idx}`);
            }) })
          ] })
        ] })
      ] })
    ] })
  ] });
}
export {
  ScorecardSetupComponent as component
};
