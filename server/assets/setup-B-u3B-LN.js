import { jsxs, jsx } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { u as useLoanSetupStore } from "./loan-setup-store-X8Js1XLI.js";
import { u as useRepaymentSetupStore, g as getRepaymentPlanList } from "./repayment-setup-store-Cm_G_mNP.js";
import { u as useWorkflowStore, g as getWorkflowList } from "./workflow-store-tVM9Cs8c.js";
import { i as inferFieldKind, e as evaluateScoreCard } from "./scorecard-engine-DdqdXgEo.js";
import { u as useScoreCardStore } from "./scorecard-store-Dlg7Kc76.js";
import "uuid";
import "zustand";
import "zustand/middleware";
const loanProductSetup = {
  productCode: "PL-STD",
  productName: "Personal Loan Standard",
  minAmount: 5e5,
  maxAmount: 1e7,
  tenureMonths: [6, 12, 18, 24],
  baseInterestRate: 18.5
};
function RouteComponent() {
  const navigate = useNavigate();
  const scoreCards = useScoreCardStore((s) => s.scoreCards);
  const selectedScoreCardId = useScoreCardStore((s) => s.selectedScoreCardId);
  const selectScoreCard = useScoreCardStore((s) => s.selectScoreCard);
  const workflows = useWorkflowStore((s) => s.workflows);
  const selectedWorkflowId = useWorkflowStore((s) => s.selectedWorkflowId);
  const selectWorkflow = useWorkflowStore((s) => s.selectWorkflow);
  const addLoanSetup = useLoanSetupStore((s) => s.addSetup);
  const repaymentPlans = useRepaymentSetupStore((s) => s.plans);
  const selectedRepaymentPlanId = useRepaymentSetupStore((s) => s.selectedPlanId);
  const selectRepaymentPlan = useRepaymentSetupStore((s) => s.selectPlan);
  const configuredScoreCard = scoreCards[selectedScoreCardId];
  const configuredScoreCardFallback = useMemo(() => {
    return Object.values(scoreCards)[0];
  }, [scoreCards]);
  const activeScoreCard = configuredScoreCard ?? configuredScoreCardFallback;
  const [product, setProduct] = useState(loanProductSetup);
  const [scoreInputs, setScoreInputs] = useState({});
  const [riskResult, setRiskResult] = useState(null);
  const [channels, setChannels] = useState([{
    name: "",
    code: ""
  }]);
  const [destinationTypes, setDestinationTypes] = useState(["BANK", "WALLET"]);
  const destinationOptions = [{
    type: "BANK",
    label: "Bank transfer",
    hint: "Send to any linked bank account. Details captured later in the journey."
  }, {
    type: "WALLET",
    label: "Mobile wallet",
    hint: "Push to KBZpay or other supported wallets without collecting account numbers here."
  }];
  const workflowList = useMemo(() => getWorkflowList(workflows), [workflows]);
  const repaymentPlanList = useMemo(() => getRepaymentPlanList(repaymentPlans), [repaymentPlans]);
  const activeRepaymentPlan = useMemo(() => {
    if (selectedRepaymentPlanId && repaymentPlans[selectedRepaymentPlanId]) {
      return repaymentPlans[selectedRepaymentPlanId];
    }
    return repaymentPlanList[0];
  }, [repaymentPlanList, repaymentPlans, selectedRepaymentPlanId]);
  const [tenureInput, setTenureInput] = useState(loanProductSetup.tenureMonths.join(", "));
  const handleTextChange = (field) => (e) => {
    const {
      value
    } = e.target;
    setProduct((prev) => ({
      ...prev,
      [field]: value
    }));
  };
  const handleNumberChange = (field) => (e) => {
    const {
      value
    } = e.target;
    const parsed = Number(value);
    setProduct((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) ? parsed : prev[field]
    }));
  };
  const scoreCardList = useMemo(() => {
    return Object.values(scoreCards).sort((a, b) => (a.name || a.scoreCardId).localeCompare(b.name || b.scoreCardId));
  }, [scoreCards]);
  const configuredFields = useMemo(() => {
    return activeScoreCard ? [...activeScoreCard.fields.map((f) => f.field)].sort((a, b) => a.localeCompare(b)) : [];
  }, [activeScoreCard]);
  const rulesByField = useMemo(() => {
    if (!activeScoreCard) return {};
    const acc = {};
    for (const field of activeScoreCard.fields) {
      acc[field.field] = [...field.rules ?? []];
    }
    return acc;
  }, [activeScoreCard]);
  useEffect(() => {
    setScoreInputs((prev) => {
      const next = {};
      for (const field of configuredFields) {
        next[field] = prev[field] ?? "";
      }
      return next;
    });
    setRiskResult(null);
  }, [configuredFields]);
  const handleTenureChange = (e) => {
    const value = e.target.value;
    setTenureInput(value);
    const months = value.split(",").map((item) => Number(item.trim())).filter((n) => Number.isFinite(n) && n > 0);
    setProduct((prev) => ({
      ...prev,
      tenureMonths: months
    }));
  };
  const resetProduct = () => {
    setProduct(loanProductSetup);
    setTenureInput(loanProductSetup.tenureMonths.join(", "));
  };
  const addChannelRow = () => {
    setChannels((prev) => [...prev, {
      name: "",
      code: ""
    }]);
  };
  const updateChannel = (index, field) => (e) => {
    const {
      value
    } = e.target;
    setChannels((prev) => {
      const next = [...prev];
      const current = next[index] ?? {
        name: "",
        code: ""
      };
      next[index] = {
        ...current,
        [field]: value
      };
      return next;
    });
  };
  const removeChannelRow = (index) => {
    setChannels((prev) => {
      if (prev.length === 1) return [{
        name: "",
        code: ""
      }];
      return prev.filter((_, idx) => idx !== index);
    });
  };
  const toggleDestination = (type) => {
    setDestinationTypes((prev) => {
      if (prev.includes(type)) return prev.filter((item) => item !== type);
      return [...prev, type];
    });
  };
  const onEvaluateScore = () => {
    if (!activeScoreCard) return;
    const result = evaluateScoreCard(activeScoreCard, scoreInputs);
    setRiskResult(result);
  };
  const onSaveLoanSetup = () => {
    const mappedDestinations = destinationTypes.map((type) => type === "BANK" ? {
      type: "BANK"
    } : {
      type: "WALLET"
    });
    addLoanSetup({
      product,
      channels,
      scorecardId: activeScoreCard?.scoreCardId ?? null,
      scorecardName: activeScoreCard?.name ?? null,
      workflowId: selectedWorkflowId,
      workflowName: selectedWorkflowId ? workflows[selectedWorkflowId]?.name ?? "(unnamed workflow)" : null,
      riskResult,
      disbursementType: "FULL",
      partialInterestRate: null,
      disbursementDestinations: mappedDestinations,
      repaymentPlan: activeRepaymentPlan ?? null
    });
    navigate({
      to: "/loan"
    });
  };
  return /* @__PURE__ */ jsxs("div", { className: "p-6 font-sans max-w-5xl mx-auto", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-4", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold", children: "Loan Product Setup & Workflow (React)" }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx(Link, { to: "/loan/scorecard-setup", className: "text-sm border px-3 py-1 rounded hover:bg-gray-50", children: "Configure Scorecard" }),
        /* @__PURE__ */ jsx(Link, { to: "/workflow", className: "text-sm border px-3 py-1 rounded hover:bg-gray-50", children: "Configure workflow" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsx("h2", { className: "font-semibold", children: "Loan Product" }),
        /* @__PURE__ */ jsx("button", { onClick: resetProduct, type: "button", className: "text-sm border px-2 py-1 rounded hover:bg-gray-100", children: "Reset" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Product Code" }),
          /* @__PURE__ */ jsx("input", { type: "text", value: product.productCode, onChange: handleTextChange("productCode"), className: "border px-2 py-1 rounded" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Product Name" }),
          /* @__PURE__ */ jsx("input", { type: "text", value: product.productName, onChange: handleTextChange("productName"), className: "border px-2 py-1 rounded" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Minimum Amount" }),
          /* @__PURE__ */ jsx("input", { type: "number", min: 0, value: product.minAmount, onChange: handleNumberChange("minAmount"), className: "border px-2 py-1 rounded" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Maximum Amount" }),
          /* @__PURE__ */ jsx("input", { type: "number", min: 0, value: product.maxAmount, onChange: handleNumberChange("maxAmount"), className: "border px-2 py-1 rounded" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Tenure Months (comma separated)" }),
          /* @__PURE__ */ jsx("input", { type: "text", value: tenureInput, onChange: handleTenureChange, className: "border px-2 py-1 rounded", placeholder: "6, 12, 18, 24" })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Base Interest Rate (%)" }),
          /* @__PURE__ */ jsx("input", { type: "number", step: "0.1", min: 0, value: product.baseInterestRate, onChange: handleNumberChange("baseInterestRate"), className: "border px-2 py-1 rounded" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 border rounded p-3 text-sm mt-4", children: [
        /* @__PURE__ */ jsx("div", { className: "font-semibold mb-2", children: "Preview" }),
        /* @__PURE__ */ jsxs("dl", { className: "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { className: "text-gray-600", children: "Code" }),
            /* @__PURE__ */ jsx("dd", { className: "font-mono", children: product.productCode })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { className: "text-gray-600", children: "Name" }),
            /* @__PURE__ */ jsx("dd", { children: product.productName })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { className: "text-gray-600", children: "Amount Range" }),
            /* @__PURE__ */ jsxs("dd", { className: "font-mono", children: [
              product.minAmount.toLocaleString(),
              " -",
              " ",
              product.maxAmount.toLocaleString()
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { className: "text-gray-600", children: "Tenure Months" }),
            /* @__PURE__ */ jsx("dd", { className: "font-mono", children: product.tenureMonths.length ? product.tenureMonths.join(", ") : "None" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { className: "text-gray-600", children: "Base Rate" }),
            /* @__PURE__ */ jsxs("dd", { className: "font-mono", children: [
              product.baseInterestRate,
              "%"
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 md:flex-row md:items-end md:justify-between mb-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("h2", { className: "font-semibold", children: [
            "Scorecard Engine — ",
            activeScoreCard?.name ?? "(none)",
            activeScoreCard ? ` (Max: ${activeScoreCard.maxScore})` : ""
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: "Select a saved scorecard to drive the inputs." })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Scorecard" }),
          /* @__PURE__ */ jsx("select", { value: selectedScoreCardId, onChange: (e) => selectScoreCard(e.target.value), className: "border px-2 py-2 rounded", children: scoreCardList.map((c) => /* @__PURE__ */ jsx("option", { value: c.scoreCardId, children: c.name || c.scoreCardId }, c.scoreCardId)) })
        ] })
      ] }),
      configuredFields.length === 0 ? /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-700 border rounded p-3 bg-gray-50", children: "No fields configured in this scorecard yet. Add fields/conditions in the setup page." }) : /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4", children: configuredFields.map((field) => {
        const kind = inferFieldKind(rulesByField[field] ?? []);
        const inputId = `score-${field}`;
        return /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("label", { htmlFor: inputId, children: /* @__PURE__ */ jsx("span", { children: field }) }),
          kind === "boolean" ? /* @__PURE__ */ jsxs("select", { id: inputId, value: scoreInputs[field] ?? "", onChange: (e) => setScoreInputs((prev) => ({
            ...prev,
            [field]: e.target.value
          })), className: "border px-2 py-2 rounded", children: [
            /* @__PURE__ */ jsx("option", { value: "", children: "(not set)" }),
            /* @__PURE__ */ jsx("option", { value: "true", children: "true" }),
            /* @__PURE__ */ jsx("option", { value: "false", children: "false" })
          ] }) : /* @__PURE__ */ jsx("input", { id: inputId, type: kind === "number" ? "number" : "text", value: scoreInputs[field] ?? "", onChange: (e) => setScoreInputs((prev) => ({
            ...prev,
            [field]: e.target.value
          })), className: "border px-2 py-2 rounded", placeholder: (rulesByField[field] ?? []).some((r) => r.operator === "between") ? "For between: e.g. 25,45" : "" })
        ] }, field);
      }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-center", children: [
        /* @__PURE__ */ jsx("button", { onClick: onEvaluateScore, className: "bg-blue-600 text-white px-3 py-1 rounded", type: "button", children: "Evaluate Score" }),
        /* @__PURE__ */ jsx("button", { onClick: () => setScoreInputs((prev) => {
          const next = {
            ...prev
          };
          for (const f of configuredFields) {
            next[f] = "";
          }
          return next;
        }), type: "button", className: "text-sm border px-2 py-1 rounded hover:bg-gray-100", children: "Reset Inputs" }),
        riskResult && /* @__PURE__ */ jsxs("span", { className: "text-sm text-gray-700", children: [
          "Score: ",
          riskResult.totalScore,
          " / ",
          riskResult.maxScore,
          " —",
          " ",
          riskResult.riskGrade
        ] })
      ] }),
      riskResult && /* @__PURE__ */ jsx("div", { className: "mt-4 space-y-3", children: /* @__PURE__ */ jsxs("div", { className: "bg-green-50 border rounded p-3 text-sm", children: [
        /* @__PURE__ */ jsx("div", { className: "font-semibold", children: "Score Breakdown" }),
        /* @__PURE__ */ jsxs("div", { className: "text-gray-700 mb-2", children: [
          "Matched ",
          riskResult.matchedRules,
          " of",
          " ",
          riskResult.breakdown.length,
          " rules"
        ] }),
        /* @__PURE__ */ jsx("ul", { className: "space-y-1", children: riskResult.breakdown.map((item, idx) => /* @__PURE__ */ jsxs("li", { className: `flex justify-between gap-2 ${item.matched ? "text-green-700" : "text-gray-500"}`, children: [
          /* @__PURE__ */ jsxs("span", { children: [
            item.fieldDescription,
            " (",
            item.field,
            ") ",
            item.operator,
            " ",
            item.value
          ] }),
          /* @__PURE__ */ jsx("span", { children: item.matched ? `+${item.score}` : "0" })
        ] }, `${item.field}-${idx}`)) })
      ] }) })
    ] }),
    riskResult && /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded mb-6", children: [
      /* @__PURE__ */ jsx("h2", { className: "font-semibold mb-2", children: "Required Documents" }),
      /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-700 mb-2", children: [
        "Risk Grade: ",
        riskResult.riskGrade
      ] }),
      /* @__PURE__ */ jsx("ul", { className: "list-disc ml-6", children: riskResult.minDocs.map((doc) => /* @__PURE__ */ jsx("li", { children: doc }, doc)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 md:flex-row md:items-center md:justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "font-semibold", children: "Workflow" }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: "Choose a saved workflow to visualize/apply." })
        ] }),
        /* @__PURE__ */ jsxs("select", { className: "border px-2 py-2 rounded", value: selectedWorkflowId ?? "", onChange: (e) => selectWorkflow(e.target.value || null), children: [
          /* @__PURE__ */ jsx("option", { value: "", children: "(none selected)" }),
          workflowList.map((wf) => /* @__PURE__ */ jsx("option", { value: wf.workflowId, children: wf.name }, wf.workflowId))
        ] })
      ] }),
      selectedWorkflowId && workflows[selectedWorkflowId] ? /* @__PURE__ */ jsxs("div", { className: "mt-3 text-xs text-gray-700", children: [
        /* @__PURE__ */ jsx("span", { className: "font-semibold", children: "Selected:" }),
        " ",
        workflows[selectedWorkflowId].name
      ] }) : null
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "font-semibold", children: "Repayment" }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: "Choose a repayment plan configured in Repayment Setup." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "flex gap-2 flex-wrap", children: [
          /* @__PURE__ */ jsx("select", { className: "border px-2 py-2 rounded min-w-50", value: selectedRepaymentPlanId ?? activeRepaymentPlan?.planId ?? "", onChange: (e) => selectRepaymentPlan(e.target.value || null), children: repaymentPlanList.map((plan) => /* @__PURE__ */ jsx("option", { value: plan.planId, children: plan.name }, plan.planId)) }),
          /* @__PURE__ */ jsx(Link, { to: "/loan/repayment-setup", className: "text-sm border px-3 py-2 rounded hover:bg-gray-100", children: "Manage plans" })
        ] })
      ] }),
      activeRepaymentPlan ? /* @__PURE__ */ jsxs("div", { className: "bg-gray-50 border rounded p-3 text-sm", children: [
        /* @__PURE__ */ jsx("div", { className: "font-semibold mb-1", children: activeRepaymentPlan.name }),
        /* @__PURE__ */ jsxs("div", { className: "text-xs text-gray-700 mb-2", children: [
          activeRepaymentPlan.method,
          " · ",
          activeRepaymentPlan.frequency
        ] }),
        /* @__PURE__ */ jsxs("dl", { className: "grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs text-gray-700", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Due day" }),
            /* @__PURE__ */ jsx("dd", { children: activeRepaymentPlan.dueDayOfMonth ?? "—" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Grace period" }),
            /* @__PURE__ */ jsxs("dd", { children: [
              activeRepaymentPlan.gracePeriodDays,
              " days"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Late fee" }),
            /* @__PURE__ */ jsxs("dd", { children: [
              activeRepaymentPlan.lateFeeFlat.toLocaleString(),
              " +",
              " ",
              activeRepaymentPlan.lateFeePct,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Prepayment" }),
            /* @__PURE__ */ jsxs("dd", { children: [
              activeRepaymentPlan.prepaymentPenaltyPct,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Autopay" }),
            /* @__PURE__ */ jsx("dd", { children: activeRepaymentPlan.autopayRequired ? "Required" : "Optional" })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Rounding step" }),
            /* @__PURE__ */ jsx("dd", { children: activeRepaymentPlan.roundingStep })
          ] })
        ] }),
        activeRepaymentPlan.description ? /* @__PURE__ */ jsx("p", { className: "text-xs text-gray-700 mt-2", children: activeRepaymentPlan.description }) : null
      ] }) : /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-700", children: "No repayment plans yet. Create one in Repayment Setup." })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "font-semibold", children: "Channel Configuration" }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: "Add delivery channels with a display name and code." })
        ] }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: addChannelRow, className: "text-sm border px-3 py-1 rounded hover:bg-gray-100", children: "Add channel" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "space-y-3", children: channels.map((channel, idx) => {
        const nameId = `channel-name-${idx}`;
        const codeId = `channel-code-${idx}`;
        return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end", children: [
          /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", htmlFor: nameId, children: [
            /* @__PURE__ */ jsx("span", { children: "Channel name" }),
            /* @__PURE__ */ jsx("input", { id: nameId, type: "text", value: channel.name, onChange: updateChannel(idx, "name"), className: "border px-2 py-2 rounded", placeholder: "e.g. WhatsApp" })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", htmlFor: codeId, children: [
            /* @__PURE__ */ jsx("span", { children: "Channel code" }),
            /* @__PURE__ */ jsx("input", { id: codeId, type: "text", value: channel.code, onChange: updateChannel(idx, "code"), className: "border px-2 py-2 rounded", placeholder: "e.g. WA-01" })
          ] }),
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => removeChannelRow(idx), className: "text-sm border px-3 py-2 rounded hover:bg-gray-100", children: "Remove" })
        ] }, `${channel.code || "code"}-${idx}`);
      }) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "border p-4 rounded mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-3", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "font-semibold", children: "Disbursement" }),
          /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: "Pick every destination you want to enable. We will collect account and wallet details later in the flow." })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "text-xs text-gray-600", children: "Multi-select — no bank setup here." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 gap-3 md:grid-cols-2", children: destinationOptions.map((option) => {
        const checked = destinationTypes.includes(option.type);
        return /* @__PURE__ */ jsxs("label", { className: `flex gap-3 border rounded p-3 text-sm transition hover:border-blue-300 ${checked ? "border-blue-500 bg-blue-50" : "border-gray-200"}`, children: [
          /* @__PURE__ */ jsx("input", { type: "checkbox", className: "mt-1 accent-blue-600", checked, onChange: () => toggleDestination(option.type) }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1", children: [
            /* @__PURE__ */ jsx("span", { className: "font-semibold", children: option.label }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-700", children: option.hint })
          ] })
        ] }, option.type);
      }) }),
      destinationTypes.length === 0 ? /* @__PURE__ */ jsx("p", { className: "text-xs text-red-700 mt-3", children: "Choose at least one payout rail to proceed." }) : /* @__PURE__ */ jsxs("div", { className: "mt-3 text-xs text-gray-700", children: [
        "Enabled: ",
        destinationTypes.join(", ")
      ] })
    ] }),
    /* @__PURE__ */ jsx("section", { className: "mt-8", children: /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx("button", { onClick: onSaveLoanSetup, type: "button", className: "w-full py-4 text-lg font-semibold bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700", children: "Save Product Setup" }),
      /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 text-sm text-gray-700 md:flex-row md:items-center md:justify-between", children: [
        /* @__PURE__ */ jsx("span", { children: "Saved locally via Zustand. No edit flow yet." }),
        /* @__PURE__ */ jsx(Link, { to: "/loan", className: "text-blue-600 hover:underline", children: "View saved loan setups" })
      ] })
    ] }) })
  ] });
}
export {
  RouteComponent as component
};
