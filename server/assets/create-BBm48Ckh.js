import { jsx, jsxs, Fragment } from "react/jsx-runtime";
import { useNavigate, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { u as useLoanApplicationStore } from "./loan-application-store-lyPNXgVT.js";
import { u as useLoanSetupStore, g as getLoanSetupList } from "./loan-setup-store-X8Js1XLI.js";
import { i as inferFieldKind, e as evaluateScoreCard } from "./scorecard-engine-DdqdXgEo.js";
import { u as useScoreCardStore } from "./scorecard-store-Dlg7Kc76.js";
import "uuid";
import "zustand";
import "zustand/middleware";
function RouteComponent() {
  const navigate = useNavigate();
  const setups = useLoanSetupStore((s) => s.setups);
  const scoreCards = useScoreCardStore((s) => s.scoreCards);
  const addApplication = useLoanApplicationStore((s) => s.addApplication);
  const setupList = useMemo(() => getLoanSetupList(setups), [setups]);
  const [selectedSetupId, setSelectedSetupId] = useState(setupList[0]?.id ?? "");
  const activeSetup = useMemo(() => {
    return setupList.find((s) => s.id === selectedSetupId) ?? setupList[0] ?? null;
  }, [setupList, selectedSetupId]);
  useEffect(() => {
    if (setupList.length === 0) return;
    if (!activeSetup) {
      setSelectedSetupId(setupList[0].id);
    }
  }, [activeSetup, setupList]);
  const tenureOptions = activeSetup?.product.tenureMonths ?? [];
  const channelOptions = activeSetup?.channels ?? [];
  const destinationChoices = (activeSetup?.disbursementDestinations ?? []).map((d) => d.type);
  const defaultBureauProvider = "Myanmar Credit Bureau";
  const defaultBureauPurpose = "Credit assessment";
  const activeScoreCard = useMemo(() => {
    if (!activeSetup?.scorecardId) return null;
    return scoreCards[activeSetup.scorecardId] ?? null;
  }, [activeSetup?.scorecardId, scoreCards]);
  const bureauProviders = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    set.add(defaultBureauProvider);
    if (activeScoreCard?.bureauProvider?.trim()) {
      set.add(activeScoreCard.bureauProvider.trim());
    }
    return Array.from(set);
  }, [activeScoreCard?.bureauProvider]);
  const bureauPurposes = useMemo(() => {
    const set = /* @__PURE__ */ new Set();
    set.add(defaultBureauPurpose);
    set.add("Pre-approval");
    set.add("Account review");
    set.add("Regulatory reporting");
    if (activeScoreCard?.bureauPurpose?.trim()) {
      set.add(activeScoreCard.bureauPurpose.trim());
    }
    return Array.from(set);
  }, [activeScoreCard?.bureauPurpose]);
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
  const scoreInputFields = useMemo(() => {
    return configuredFields.filter((field) => field !== "age" && field !== "monthlyIncome");
  }, [configuredFields]);
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [phone, setPhone] = useState("");
  const [ageInput, setAgeInput] = useState("");
  const [monthlyIncomeInput, setMonthlyIncomeInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [tenureValue, setTenureValue] = useState(tenureOptions[0] ?? null);
  const [channelCode, setChannelCode] = useState(channelOptions[0]?.code ?? "");
  const [destinationType, setDestinationType] = useState(destinationChoices[0] ?? "BANK");
  const [bureauProvider, setBureauProvider] = useState(defaultBureauProvider);
  const [bureauPurpose, setBureauPurpose] = useState(defaultBureauPurpose);
  const [bureauConsent, setBureauConsent] = useState(false);
  const [bureauReference, setBureauReference] = useState("");
  const [bureauRequestedAt, setBureauRequestedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState(null);
  const [scoreInputs, setScoreInputs] = useState({});
  const [scoreResult, setScoreResult] = useState(null);
  useEffect(() => {
    setTenureValue(tenureOptions[0] ?? null);
  }, [selectedSetupId, tenureOptions]);
  useEffect(() => {
    setChannelCode(channelOptions[0]?.code ?? "");
  }, [selectedSetupId, channelOptions]);
  useEffect(() => {
    setDestinationType(destinationChoices[0] ?? "BANK");
  }, [selectedSetupId, destinationChoices]);
  useEffect(() => {
    setScoreInputs((prev) => {
      const next = {};
      for (const field of scoreInputFields) {
        next[field] = prev[field] ?? "";
      }
      return next;
    });
    setScoreResult(null);
  }, [activeSetup?.id, scoreInputFields]);
  useEffect(() => {
    const nextProvider = activeScoreCard?.bureauProvider?.trim() || defaultBureauProvider;
    const nextPurpose = activeScoreCard?.bureauPurpose?.trim() || defaultBureauPurpose;
    setBureauProvider(nextProvider);
    setBureauPurpose(nextPurpose);
    setBureauConsent(false);
    setBureauReference("");
    setBureauRequestedAt("");
  }, [activeScoreCard?.scoreCardId]);
  const disabled = setupList.length === 0;
  const statusBadge = "DRAFT";
  const handleCalculateScore = () => {
    if (!activeScoreCard) {
      setFormError("This loan setup is missing a linked scorecard.");
      return;
    }
    const inputs = {};
    for (const field of configuredFields) {
      if (field === "age") {
        inputs[field] = ageInput;
        continue;
      }
      if (field === "monthlyIncome") {
        inputs[field] = monthlyIncomeInput;
        continue;
      }
      inputs[field] = scoreInputs[field] ?? "";
    }
    const result = evaluateScoreCard(activeScoreCard, inputs);
    setScoreResult(result);
    setFormError(null);
  };
  const handleSubmit = () => {
    if (disabled || !activeSetup) return;
    if (!beneficiaryName.trim()) {
      setFormError("Beneficiary name is required.");
      return;
    }
    if (!nationalId.trim()) {
      setFormError("National ID is required.");
      return;
    }
    const parsedAge = Number(ageInput);
    if (!Number.isFinite(parsedAge) || parsedAge <= 0) {
      setFormError("Enter a valid age.");
      return;
    }
    const parsedMonthlyIncome = Number(monthlyIncomeInput);
    if (!Number.isFinite(parsedMonthlyIncome) || parsedMonthlyIncome < 0) {
      setFormError("Enter a valid monthly income.");
      return;
    }
    const parsedAmount = Number(amountInput);
    if (!Number.isFinite(parsedAmount)) {
      setFormError("Enter a valid amount.");
      return;
    }
    if (activeSetup.product.minAmount && parsedAmount < activeSetup.product.minAmount) {
      setFormError(`Amount must be at least ${activeSetup.product.minAmount.toLocaleString()}.`);
      return;
    }
    if (activeSetup.product.maxAmount && parsedAmount > activeSetup.product.maxAmount) {
      setFormError(`Amount must be at most ${activeSetup.product.maxAmount.toLocaleString()}.`);
      return;
    }
    if (!bureauProvider.trim()) {
      setFormError("Select a credit bureau provider.");
      return;
    }
    if (!bureauPurpose.trim()) {
      setFormError("Enter the purpose for the bureau check.");
      return;
    }
    if (!bureauConsent) {
      setFormError("Beneficiary consent is required before checking the bureau.");
      return;
    }
    const parsedBureauRequestedAt = bureauRequestedAt ? Date.parse(bureauRequestedAt) : null;
    if (bureauRequestedAt && Number.isNaN(parsedBureauRequestedAt)) {
      setFormError("Enter a valid requested-at date/time.");
      return;
    }
    setFormError(null);
    const creditScoreToSave = scoreResult?.totalScore ?? activeSetup.totalScore ?? null;
    const creditMaxToSave = scoreResult?.maxScore ?? activeScoreCard?.maxScore ?? null;
    addApplication({
      beneficiaryName,
      nationalId,
      phone,
      age: parsedAge,
      monthlyIncome: parsedMonthlyIncome,
      requestedAmount: parsedAmount,
      tenureMonths: tenureValue,
      channelCode,
      destinationType,
      bureauProvider,
      bureauPurpose,
      bureauConsent,
      bureauReference,
      bureauRequestedAt: parsedBureauRequestedAt,
      notes,
      setupId: activeSetup.id,
      productCode: activeSetup.product.productCode,
      productName: activeSetup.product.productName,
      creditScore: creditScoreToSave,
      creditMax: creditMaxToSave,
      workflowId: activeSetup.workflowId,
      workflowName: activeSetup.workflowName
    });
    navigate({
      to: "/loan/applications"
    });
  };
  return /* @__PURE__ */ jsx("div", { className: "p-6 font-sans max-w-5xl mx-auto", children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-600", children: "Loan applications" }),
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold", children: "Create application" })
    ] }),
    disabled ? /* @__PURE__ */ jsxs("div", { className: "border rounded p-4 bg-yellow-50 text-sm text-gray-800", children: [
      "You need at least one saved loan setup before creating applications.",
      /* @__PURE__ */ jsx("div", { className: "mt-2", children: /* @__PURE__ */ jsx(Link, { to: "/loan/setup", className: "text-blue-600 hover:underline", children: "Go to Loan Setup" }) })
    ] }) : /* @__PURE__ */ jsxs("div", { className: "space-y-4 border rounded p-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Loan setup (product)" }),
          /* @__PURE__ */ jsx("select", { className: "border px-2 py-2 rounded", value: selectedSetupId, onChange: (e) => setSelectedSetupId(e.target.value), children: setupList.map((setup) => /* @__PURE__ */ jsxs("option", { value: setup.id, children: [
            setup.product.productName,
            " (",
            setup.product.productCode,
            ")"
          ] }, setup.id)) }),
          /* @__PURE__ */ jsxs("span", { className: "text-xs text-gray-600", children: [
            "Tenure options: ",
            tenureOptions.join(", ") || "—",
            " months · Range: ",
            activeSetup?.product.minAmount.toLocaleString(),
            " -",
            " ",
            activeSetup?.product.maxAmount.toLocaleString()
          ] })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Status" }),
          /* @__PURE__ */ jsx("input", { readOnly: true, value: statusBadge, className: "border px-2 py-2 rounded bg-gray-50" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Beneficiary name" }),
          /* @__PURE__ */ jsx("input", { type: "text", className: "border px-2 py-2 rounded", value: beneficiaryName, onChange: (e) => setBeneficiaryName(e.target.value), disabled })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "National ID" }),
          /* @__PURE__ */ jsx("input", { type: "text", className: "border px-2 py-2 rounded", value: nationalId, onChange: (e) => setNationalId(e.target.value), disabled })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Phone" }),
          /* @__PURE__ */ jsx("input", { type: "tel", className: "border px-2 py-2 rounded", value: phone, onChange: (e) => setPhone(e.target.value), disabled })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Age" }),
          /* @__PURE__ */ jsx("input", { type: "number", min: 0, className: "border px-2 py-2 rounded", value: ageInput, onChange: (e) => setAgeInput(e.target.value), disabled })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Monthly income" }),
          /* @__PURE__ */ jsx("input", { type: "number", min: 0, className: "border px-2 py-2 rounded", value: monthlyIncomeInput, onChange: (e) => setMonthlyIncomeInput(e.target.value), disabled })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Requested amount" }),
          /* @__PURE__ */ jsx("input", { type: "number", min: activeSetup?.product.minAmount ?? 0, max: activeSetup?.product.maxAmount ?? void 0, className: "border px-2 py-2 rounded", value: amountInput, onChange: (e) => setAmountInput(e.target.value), disabled }),
          /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-600", children: activeSetup ? `Allowed: ${activeSetup.product.minAmount.toLocaleString()} - ${activeSetup.product.maxAmount.toLocaleString()}` : "Save a loan setup first." })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3 border rounded p-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 md:flex-row md:items-center md:justify-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-600", children: "Credit score" }),
            /* @__PURE__ */ jsx("div", { className: "text-base font-semibold", children: activeScoreCard ? `${activeScoreCard.name} (Max ${activeScoreCard.maxScore})` : "No scorecard attached" })
          ] }),
          scoreResult ? /* @__PURE__ */ jsxs("div", { className: "text-sm text-gray-700", children: [
            "Score ",
            scoreResult.totalScore,
            " / ",
            scoreResult.maxScore,
            " —",
            scoreResult.riskGrade
          ] }) : null
        ] }),
        activeScoreCard ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: scoreInputFields.map((field) => {
            const kind = inferFieldKind(rulesByField[field] ?? []);
            const value = scoreInputs[field] ?? "";
            const inputId = `score-${field}`;
            return /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", htmlFor: inputId, children: [
              /* @__PURE__ */ jsx("span", { children: field }),
              kind === "boolean" ? /* @__PURE__ */ jsxs("select", { id: inputId, value, onChange: (e) => {
                const nextValue = e.target.value;
                setScoreInputs((prev) => ({
                  ...prev,
                  [field]: nextValue
                }));
              }, className: "border px-2 py-2 rounded", disabled, children: [
                /* @__PURE__ */ jsx("option", { value: "", children: "(not set)" }),
                /* @__PURE__ */ jsx("option", { value: "true", children: "true" }),
                /* @__PURE__ */ jsx("option", { value: "false", children: "false" })
              ] }) : /* @__PURE__ */ jsx("input", { id: inputId, type: kind === "number" ? "number" : "text", value, onChange: (e) => {
                const nextValue = e.target.value;
                setScoreInputs((prev) => ({
                  ...prev,
                  [field]: nextValue
                }));
              }, className: "border px-2 py-2 rounded", placeholder: (rulesByField[field] ?? []).some((r) => r.operator === "between") ? "For between: e.g. 25,45" : "", disabled })
            ] }, field);
          }) }),
          /* @__PURE__ */ jsxs("div", { className: "flex gap-2 items-center", children: [
            /* @__PURE__ */ jsx("button", { type: "button", onClick: handleCalculateScore, className: "px-4 py-2 rounded bg-blue-600 text-white shadow hover:bg-blue-700", disabled, children: "Calculate credit score" }),
            scoreResult ? /* @__PURE__ */ jsxs("span", { className: "text-sm text-gray-700", children: [
              "Result: ",
              scoreResult.totalScore,
              " /",
              " ",
              scoreResult.maxScore,
              " — ",
              scoreResult.riskGrade
            ] }) : null
          ] })
        ] }) : /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-700", children: "Link a scorecard in Loan Setup to calculate credit scores per beneficiary." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-3 border rounded p-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-1 md:flex-row md:items-center md:justify-between", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("div", { className: "text-sm text-gray-600", children: "Credit bureau check" }),
            /* @__PURE__ */ jsx("div", { className: "text-base font-semibold", children: "Capture consent and request details" })
          ] }),
          bureauConsent ? /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100", children: "Consent ready" }) : /* @__PURE__ */ jsx("span", { className: "text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200", children: "Consent required" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
            /* @__PURE__ */ jsx("span", { children: "Bureau provider" }),
            /* @__PURE__ */ jsx("select", { className: "border px-2 py-2 rounded", value: bureauProvider, onChange: (e) => setBureauProvider(e.target.value), disabled, children: bureauProviders.map((provider) => /* @__PURE__ */ jsx("option", { value: provider, children: provider }, provider)) })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
            /* @__PURE__ */ jsx("span", { children: "Purpose" }),
            /* @__PURE__ */ jsx("input", { type: "text", className: "border px-2 py-2 rounded", value: bureauPurpose, onChange: (e) => setBureauPurpose(e.target.value), list: "bureau-purpose-options", disabled }),
            /* @__PURE__ */ jsx("datalist", { id: "bureau-purpose-options", children: bureauPurposes.map((purpose) => /* @__PURE__ */ jsx("option", { value: purpose, children: purpose }, purpose)) })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-2 text-sm", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx("input", { type: "checkbox", className: "h-4 w-4", checked: bureauConsent, onChange: (e) => setBureauConsent(e.target.checked), disabled }),
              /* @__PURE__ */ jsx("span", { children: "Beneficiary consent captured" })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-600", children: "Consent must be obtained before requesting a bureau report." })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
            /* @__PURE__ */ jsx("span", { children: "Bureau reference (case ID)" }),
            /* @__PURE__ */ jsx("input", { type: "text", className: "border px-2 py-2 rounded", value: bureauReference, onChange: (e) => setBureauReference(e.target.value), disabled, placeholder: "e.g. REF-12345" })
          ] }),
          /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
            /* @__PURE__ */ jsx("span", { children: "Bureau requested at" }),
            /* @__PURE__ */ jsx("input", { type: "datetime-local", className: "border px-2 py-2 rounded", value: bureauRequestedAt, onChange: (e) => setBureauRequestedAt(e.target.value), disabled }),
            /* @__PURE__ */ jsx("span", { className: "text-xs text-gray-600", children: "Optional timestamp to track when the bureau request was sent." })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Tenure (months)" }),
          /* @__PURE__ */ jsx("select", { className: "border px-2 py-2 rounded", value: tenureValue ?? "", onChange: (e) => setTenureValue(e.target.value ? Number(e.target.value) : null), disabled: disabled || tenureOptions.length === 0, children: tenureOptions.map((months) => /* @__PURE__ */ jsx("option", { value: months, children: months }, months)) })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Channel code" }),
          /* @__PURE__ */ jsx("input", { type: "text", className: "border px-2 py-2 rounded", value: channelCode, onChange: (e) => setChannelCode(e.target.value), list: "channel-options", disabled }),
          /* @__PURE__ */ jsx("datalist", { id: "channel-options", children: channelOptions.map((ch) => /* @__PURE__ */ jsx("option", { value: ch.code || ch.name, children: ch.name }, `${ch.code}-${ch.name}`)) })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
          /* @__PURE__ */ jsx("span", { children: "Disbursement destination" }),
          /* @__PURE__ */ jsx("select", { className: "border px-2 py-2 rounded", value: destinationType, onChange: (e) => setDestinationType(e.target.value), disabled, children: (destinationChoices.length ? destinationChoices : ["BANK"]).map((dest) => /* @__PURE__ */ jsx("option", { value: dest, children: dest }, dest)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("label", { className: "flex flex-col gap-1 text-sm", children: [
        /* @__PURE__ */ jsx("span", { children: "Notes" }),
        /* @__PURE__ */ jsx("textarea", { className: "border px-2 py-2 rounded min-h-24", value: notes, onChange: (e) => setNotes(e.target.value), disabled })
      ] }),
      formError ? /* @__PURE__ */ jsx("div", { className: "text-sm text-red-700", children: formError }) : null,
      /* @__PURE__ */ jsxs("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ jsx("button", { type: "button", onClick: handleSubmit, className: "px-4 py-2 rounded bg-emerald-600 text-white shadow hover:bg-emerald-700", disabled, children: "Save application" }),
        /* @__PURE__ */ jsx(Link, { to: "/loan/applications", className: "px-4 py-2 rounded border text-sm hover:bg-gray-50", children: "Cancel" })
      ] })
    ] })
  ] }) });
}
export {
  RouteComponent as component
};
