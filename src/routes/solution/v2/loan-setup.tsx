import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import type { DocumentRequirementItem } from "@/components/loan/DocumentRequirementsSection";
import { createDocumentRequirementItem } from "@/components/loan/DocumentRequirementsSection";
import type { CreditScoreEngineState } from "@/components/loan/v2/CreditScoreEngineTab";
import {
	CreditScoreEngineTab,
	createDefaultCreditScoreEngineState,
} from "@/components/loan/v2/CreditScoreEngineTab";
import {
	createDefaultDecisionRuleSetup,
	type DecisionRuleSetupState,
	DecisionRuleSetupTab,
} from "@/components/loan/v2/DecisionRuleSetupTab";
import type { DisbursementSetupTabState } from "@/components/loan/v2/DisbursementSetupTab";
import {
	createDefaultDisbursementSetupTabState,
	DisbursementSetupTab,
} from "@/components/loan/v2/DisbursementSetupTab";
import { DocumentSetupTab } from "@/components/loan/v2/DocumentSetupTab";
import { InterestEngineTab } from "@/components/loan/v2/InterestEngineTab";
import { ProductSetupTab } from "@/components/loan/v2/ProductSetupTab";
import type { RepaymentSetupTabState } from "@/components/loan/v2/RepaymentSetupTab";
import {
	createDefaultRepaymentSetupTabState,
	RepaymentSetupTab,
} from "@/components/loan/v2/RepaymentSetupTab";
import { ReviewBrandingTab } from "@/components/loan/v2/ReviewBrandingTab";
import {
	type ChannelConfig,
	createDefaultBrandingSetup,
	createDefaultFormulaSetup,
	type ProductSetupForm,
	type V2BrandingSetup,
	type V2InterestConfig,
} from "@/components/loan/v2/setup-types";
import { DEFAULT_REQUIRED_DOCUMENTS } from "@/lib/loan-setup-store";
import { useLoanSetupV2Store } from "@/lib/loan-setup-v2-store";
import { getWorkflowList, useWorkflowStore } from "@/lib/workflow-store";

const loanSetupSearchSchema = z.object({
	setupId: z.string().optional(),
});

export const Route = createFileRoute("/solution/v2/loan-setup")({
	validateSearch: loanSetupSearchSchema,
	component: LoanProductSetup,
});

function createId() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createChannelConfig(): ChannelConfig {
	return { id: createId(), name: "", code: "", workflowId: "" };
}

function createTenorValue(value: number) {
	return { id: createId(), value };
}

function createInterestConfig(baseRate = 18.5): V2InterestConfig {
	return {
		id: createId(),
		interestType: "REDUCING",
		rateType: "FIXED",
		baseRate,
		config: { parameters: [] },
		policies: [],
	};
}

function getDefaultProductSetup(): ProductSetupForm {
	return {
		productName: "",
		productCode: "",
		description: "",
		loanSecurity: "UNSECURED",
		collateralType: "LAND",
		minimumCollateralValue: 0,
		maximumLtvPercentage: 80,
		haircutPercentage: 0,
		valuationRequired: false,
		valuationValidityDays: null,
		minAmount: 500000,
		maxAmount: 10000000,
		maxAmountRateType: "FLAT",
		serviceFees: null,
		adminFees: null,
		stampDuty: null,
		commissionFees: null,
		insuranceFees: null,
		tenorUnit: "MONTH",
		tenorValues: [
			createTenorValue(6),
			createTenorValue(12),
			createTenorValue(18),
		],
	};
}

function normalizeProductSetup(productSetup: ProductSetupForm): ProductSetupForm {
	const defaults = getDefaultProductSetup();
	return {
		...defaults,
		...productSetup,
		minimumCollateralValue: Math.max(
			0,
			productSetup.minimumCollateralValue ?? defaults.minimumCollateralValue,
		),
		maximumLtvPercentage: Math.max(
			0,
			productSetup.maximumLtvPercentage ?? defaults.maximumLtvPercentage,
		),
		haircutPercentage: Math.max(
			0,
			productSetup.haircutPercentage ?? defaults.haircutPercentage,
		),
		valuationValidityDays:
			productSetup.valuationValidityDays == null
				? null
				: Math.max(0, productSetup.valuationValidityDays),
		maxAmountRateType:
			productSetup.maxAmountRateType === "PERCENTAGE"
				? "PERCENTAGE"
				: "FLAT",
	};
}

function getDefaultChannels(): ChannelConfig[] {
	return [createChannelConfig()];
}

function getDefaultInterestRatePlans(): V2InterestConfig[] {
	return [createInterestConfig()];
}

function getDefaultDocumentSetup(): DocumentRequirementItem[] {
	return [createDocumentRequirementItem("LOW", DEFAULT_REQUIRED_DOCUMENTS)];
}

function getEditingStateLabel(isEditing: boolean, editingProductName: string) {
	if (!isEditing) {
		return "Create a new V2 loan setup snapshot.";
	}

	if (!editingProductName) {
		return "Editing saved setup";
	}

	return `Editing saved setup: ${editingProductName}`;
}

function getCompletionButtonLabel(canGoNext: boolean, isEditing: boolean) {
	if (canGoNext) {
		return "Next";
	}

	if (isEditing) {
		return "Update Product";
	}

	return "Launch Product";
}

function LoanProductSetup() {
	const { setupId } = Route.useSearch();
	const navigate = useNavigate();
	const workflows = useWorkflowStore((state) => state.workflows);
	const workflowList = useMemo(() => getWorkflowList(workflows), [workflows]);
	const setups = useLoanSetupV2Store((state) => state.setups);
	const addLoanSetup = useLoanSetupV2Store((state) => state.addSetup);
	const updateLoanSetup = useLoanSetupV2Store((state) => state.updateSetup);
	const [currentStep, setCurrentStep] = useState(0);
	const editingSetup = useMemo(
		() => (setupId ? setups[setupId] : undefined),
		[setupId, setups],
	);
	const isEditing = Boolean(editingSetup);

	const steps = [
		{
			id: "product-setup",
			title: "Product Setup",
			description: "Product, loan, channel, and workflow mapping",
		},
		{
			id: "interest-setup",
			title: "Interest Setup",
			description: "Interest rate plans, policies, and custom formula",
		},
		{
			id: "repayment-setup",
			title: "Repayment Setup",
			description: "Repayment rules and schedule timing",
		},
		{
			id: "credit-score-engine",
			title: "Credit Score Engine",
			description: "Scorecard setup and bureau configuration",
		},
		{
			id: "document-setup",
			title: "Document Rule",
			description: "Document requirements by risk grade",
		},
		{
			id: "decision-rule-setup",
			title: "Decision Rule",
			description: "Auto-approve, manual-review, or auto-reject by grade",
		},
		{
			id: "disbursement-setup",
			title: "Disbursement Setup",
			description: "Single or multiple tranches, method, and fees",
		},
		{
			id: "review-branding",
			title: "Review & Brand",
			description: "Validate setup and configure marketplace visuals",
		},
	] as const;

	const [productSetup, setProductSetup] = useState<ProductSetupForm>(() =>
		getDefaultProductSetup(),
	);
	const [channels, setChannels] = useState<ChannelConfig[]>(() =>
		getDefaultChannels(),
	);
	const [interestRatePlans, setInterestRatePlans] = useState<
		V2InterestConfig[]
	>(() => getDefaultInterestRatePlans());
	const [interestFormulaSetup, setInterestFormulaSetup] = useState(() =>
		createDefaultFormulaSetup(),
	);
	const [bureauRequired, setBureauRequired] = useState(false);
	const [bureauProvider, setBureauProvider] = useState("MMCB");
	const [bureauPurpose, setBureauPurpose] = useState("Credit assessment");
	const [bureauConsentRequired, setBureauConsentRequired] = useState(true);
	const [decisionRuleSetup, setDecisionRuleSetup] =
		useState<DecisionRuleSetupState>(() => createDefaultDecisionRuleSetup());
	const [repaymentSetup, setRepaymentSetup] = useState<RepaymentSetupTabState>(
		() => createDefaultRepaymentSetupTabState(),
	);
	const [creditScoreSetup, setCreditScoreSetup] =
		useState<CreditScoreEngineState>(() =>
			createDefaultCreditScoreEngineState(),
		);
	const [documentSetup, setDocumentSetup] = useState<DocumentRequirementItem[]>(
		() => getDefaultDocumentSetup(),
	);
	const [disbursementSetup, setDisbursementSetup] =
		useState<DisbursementSetupTabState>(() =>
			createDefaultDisbursementSetupTabState(),
		);
	const [brandingSetup, setBrandingSetup] = useState<V2BrandingSetup>(() =>
		createDefaultBrandingSetup(),
	);

	useEffect(() => {
		if (!editingSetup) {
			setProductSetup(getDefaultProductSetup());
			setChannels(getDefaultChannels());
			setInterestRatePlans(getDefaultInterestRatePlans());
			setInterestFormulaSetup(createDefaultFormulaSetup());
			setBureauRequired(false);
			setBureauProvider("MMCB");
			setBureauPurpose("Credit assessment");
			setBureauConsentRequired(true);
			setDecisionRuleSetup(createDefaultDecisionRuleSetup());
			setRepaymentSetup(createDefaultRepaymentSetupTabState());
			setCreditScoreSetup(createDefaultCreditScoreEngineState());
			setDocumentSetup(getDefaultDocumentSetup());
			setDisbursementSetup(createDefaultDisbursementSetupTabState());
			setBrandingSetup(createDefaultBrandingSetup());
			setCurrentStep(0);
			return;
		}

		setProductSetup(normalizeProductSetup(structuredClone(editingSetup.productSetup)));
		setChannels(
			editingSetup.channels.length
				? structuredClone(editingSetup.channels)
				: getDefaultChannels(),
		);
		setInterestRatePlans(
			editingSetup.interestRatePlans.length
				? structuredClone(editingSetup.interestRatePlans)
				: getDefaultInterestRatePlans(),
		);
		setInterestFormulaSetup(
			structuredClone(
				editingSetup.interestFormulaSetup ?? createDefaultFormulaSetup(),
			),
		);
		setBureauRequired(editingSetup.bureauRequired);
		setBureauProvider(editingSetup.bureauProvider || "MMCB");
		setBureauPurpose(editingSetup.bureauPurpose || "Credit assessment");
		setBureauConsentRequired(editingSetup.bureauConsentRequired);
		setDecisionRuleSetup(
			structuredClone(
				editingSetup.decisionRuleSetup ??
					createDefaultDecisionRuleSetup(editingSetup.decisionRules),
			),
		);
		setRepaymentSetup(structuredClone(editingSetup.repaymentSetup));
		setCreditScoreSetup(structuredClone(editingSetup.creditScoreSetup));
		setDocumentSetup(
			editingSetup.documentSetup.length
				? structuredClone(editingSetup.documentSetup)
				: getDefaultDocumentSetup(),
		);
		setDisbursementSetup(structuredClone(editingSetup.disbursementSetup));
		setBrandingSetup(
			structuredClone(
				editingSetup.brandingSetup ?? createDefaultBrandingSetup(),
			),
		);
		setCurrentStep(0);
	}, [editingSetup]);

	const mappedChannelWorkflows = useMemo(
		() =>
			channels.map((channel) => {
				const selectedWorkflow = workflowList.find(
					(wf) => wf.workflowId === channel.workflowId,
				);
				return { channel, workflowName: selectedWorkflow?.name ?? null };
			}),
		[channels, workflowList],
	);

	const updateProductField = <K extends keyof ProductSetupForm>(
		field: K,
		value: ProductSetupForm[K],
	) => {
		setProductSetup((prev) => ({ ...prev, [field]: value }));
	};

	const addTenorValue = () => {
		setProductSetup((prev) => ({
			...prev,
			tenorValues: [...prev.tenorValues, createTenorValue(0)],
		}));
	};

	const updateTenorValue = (tenorId: string, value: string) => {
		const parsedValue = Number(value);
		setProductSetup((prev) => ({
			...prev,
			tenorValues: prev.tenorValues.map((item) =>
				item.id === tenorId
					? { ...item, value: Number.isFinite(parsedValue) ? parsedValue : 0 }
					: item,
			),
		}));
	};

	const removeTenorValue = (tenorId: string) => {
		setProductSetup((prev) => ({
			...prev,
			tenorValues: prev.tenorValues.filter((item) => item.id !== tenorId),
		}));
	};

	const addChannel = () => {
		setChannels((prev) => [...prev, createChannelConfig()]);
	};

	const updateChannelField = <K extends keyof ChannelConfig>(
		channelId: string,
		field: K,
		value: ChannelConfig[K],
	) => {
		setChannels((prev) =>
			prev.map((channel) =>
				channel.id === channelId ? { ...channel, [field]: value } : channel,
			),
		);
	};

	const removeChannel = (channelId: string) => {
		setChannels((prev) =>
			prev.length === 1
				? [createChannelConfig()]
				: prev.filter((channel) => channel.id !== channelId),
		);
	};

	const updateInterestConfig = (
		updater: (current: V2InterestConfig[]) => V2InterestConfig[],
	) => {
		setInterestRatePlans((current) => updater(current));
	};

	const updatePlan = (
		planIndex: number,
		updater: (plan: V2InterestConfig) => V2InterestConfig,
	) => {
		updateInterestConfig((current) =>
			current.map((plan, idx) => (idx === planIndex ? updater(plan) : plan)),
		);
	};

	const addPlan = () => {
		setInterestRatePlans((current) => {
			const fallbackRate = current.at(-1)?.baseRate ?? 18.5;
			return [...current, createInterestConfig(fallbackRate)];
		});
	};

	const removePlan = (planIndex: number) => {
		setInterestRatePlans((current) =>
			current.length === 1
				? current
				: current.filter((_, index) => index !== planIndex),
		);
	};

	const addParameter = (planIndex: number) => {
		updatePlan(planIndex, (current) => ({
			...current,
			config: {
				parameters: [
					...(current.config?.parameters ?? []),
					{
						id: createId(),
						name: "",
						value: 0,
						interestRate: current.baseRate,
					},
				],
			},
		}));
	};

	const updateParameter = (
		planIndex: number,
		paramIndex: number,
		field: "name" | "value" | "interestRate",
		value: string,
	) => {
		updatePlan(planIndex, (current) => {
			const nextParameters = [...(current.config.parameters ?? [])];
			const targetParameter = nextParameters[paramIndex];
			if (!targetParameter) return current;
			if (field === "name") {
				nextParameters[paramIndex] = { ...targetParameter, name: value };
			} else {
				const parsed = Number(value);
				nextParameters[paramIndex] = {
					...targetParameter,
					[field]: Number.isFinite(parsed) ? parsed : targetParameter[field],
				};
			}
			return {
				...current,
				config: { parameters: nextParameters },
			};
		});
	};

	const removeParameter = (planIndex: number, paramIndex: number) => {
		updatePlan(planIndex, (current) => ({
			...current,
			config: {
				parameters: (current.config.parameters ?? []).filter(
					(_, index) => index !== paramIndex,
				),
			},
		}));
	};

	const addPolicy = (planIndex: number) => {
		updatePlan(planIndex, (current) => ({
			...current,
			policies: [
				...(current.policies ?? []),
				{ id: createId(), interestCategory: "", interestRate: 0 },
			],
		}));
	};

	const updatePolicy = (
		planIndex: number,
		policyIndex: number,
		field: "interestCategory" | "interestRate",
		value: string,
	) => {
		updatePlan(planIndex, (current) => {
			const nextPolicies = [...(current.policies ?? [])];
			const targetPolicy = nextPolicies[policyIndex];
			if (!targetPolicy) return current;
			if (field === "interestCategory") {
				nextPolicies[policyIndex] = {
					...targetPolicy,
					interestCategory: value,
				};
			} else {
				const parsed = Number(value);
				nextPolicies[policyIndex] = {
					...targetPolicy,
					interestRate: Number.isFinite(parsed)
						? parsed
						: targetPolicy.interestRate,
				};
			}
			return { ...current, policies: nextPolicies };
		});
	};

	const removePolicy = (planIndex: number, policyIndex: number) => {
		updatePlan(planIndex, (current) => ({
			...current,
			policies: (current.policies ?? []).filter(
				(_, index) => index !== policyIndex,
			),
		}));
	};

	const canGoBack = currentStep > 0;
	const canGoNext = currentStep + 1 < steps.length;
	const configuredChannels = useMemo(
		() =>
			channels.filter(
				(channel) =>
					Boolean(channel.name.trim()) ||
					Boolean(channel.code.trim()) ||
					Boolean(channel.workflowId.trim()),
			),
		[channels],
	);
	const mappedWorkflowCount = useMemo(
		() =>
			configuredChannels.filter((channel) => Boolean(channel.workflowId.trim()))
				.length,
		[configuredChannels],
	);
	const editingProductName = editingSetup?.productSetup.productName ?? "";
	const editingStateLabel = getEditingStateLabel(isEditing, editingProductName);
	const completionButtonLabel = getCompletionButtonLabel(canGoNext, isEditing);

	const handleSaveCompleted = () => {
		const payload = {
			productSetup,
			channels,
			interestRatePlans,
			interestFormulaSetup,
			repaymentSetup,
			creditScoreSetup,
			documentSetup,
			bureauRequired,
			bureauProvider,
			bureauPurpose,
			bureauConsentRequired,
			decisionRules: decisionRuleSetup.decisionRules,
			decisionRuleSetup,
			disbursementSetup,
			brandingSetup,
		};

		if (editingSetup) {
			updateLoanSetup(editingSetup.id, payload);
			navigate({ to: "/solution/v2/list" });
			return;
		}

		addLoanSetup(payload);
		navigate({ to: "/solution/v2/list" });
	};

	let stepContent: ReactNode;
	if (currentStep === 0) {
		stepContent = (
			<ProductSetupTab
				productSetup={productSetup}
				updateProductField={updateProductField}
				addTenorValue={addTenorValue}
				updateTenorValue={updateTenorValue}
				removeTenorValue={removeTenorValue}
			/>
		);
	} else if (currentStep === 1) {
		stepContent = (
			<InterestEngineTab
				interestRatePlans={interestRatePlans}
				formulaSetup={interestFormulaSetup}
				updateFormulaSetup={(updater) =>
					setInterestFormulaSetup((current) => updater(current))
				}
				updateInterestConfig={updateInterestConfig}
				addPlan={addPlan}
				removePlan={removePlan}
				addParameter={addParameter}
				updateParameter={updateParameter}
				removeParameter={removeParameter}
				addPolicy={addPolicy}
				updatePolicy={updatePolicy}
				removePolicy={removePolicy}
			/>
		);
	} else if (currentStep === 2) {
		stepContent = (
			<RepaymentSetupTab
				state={repaymentSetup}
				onStateChange={setRepaymentSetup}
			/>
		);
	} else if (currentStep === 3) {
		stepContent = (
			<CreditScoreEngineTab
				state={creditScoreSetup}
				onStateChange={setCreditScoreSetup}
				bureauRequired={bureauRequired}
				bureauProvider={bureauProvider}
				bureauPurpose={bureauPurpose}
				bureauConsentRequired={bureauConsentRequired}
				setBureauRequired={setBureauRequired}
				setBureauProvider={setBureauProvider}
				setBureauPurpose={setBureauPurpose}
				setBureauConsentRequired={setBureauConsentRequired}
			/>
		);
	} else if (currentStep === 4) {
		stepContent = (
			<DocumentSetupTab
				loanSecurity={productSetup.loanSecurity}
				state={documentSetup}
				onStateChange={setDocumentSetup}
			/>
		);
	} else if (currentStep === 5) {
		stepContent = (
			<DecisionRuleSetupTab
				state={decisionRuleSetup}
				onStateChange={setDecisionRuleSetup}
			/>
		);
	} else if (currentStep === 6) {
		stepContent = (
			<DisbursementSetupTab
				state={disbursementSetup}
				onStateChange={setDisbursementSetup}
			/>
		);
	} else {
		stepContent = (
			<ReviewBrandingTab
				brandingSetup={brandingSetup}
				onBrandingChange={setBrandingSetup}
				channels={channels}
				workflowList={workflowList}
				mappedChannelWorkflows={mappedChannelWorkflows}
				addChannel={addChannel}
				updateChannelField={updateChannelField}
				removeChannel={removeChannel}
				productName={productSetup.productName}
				productCode={productSetup.productCode}
				productDescription={productSetup.description}
				minAmount={productSetup.minAmount}
				maxAmount={productSetup.maxAmount}
				baseRate={interestRatePlans[0]?.baseRate ?? null}
				channelCount={configuredChannels.length}
				workflowCount={mappedWorkflowCount}
				interestPlanCount={interestRatePlans.length}
				documentRuleCount={documentSetup.length}
				decisionRuleCount={decisionRuleSetup.rules.length}
				bureauRequired={bureauRequired}
				bureauProvider={bureauProvider}
				disbursementType={disbursementSetup.disbursementType}
			/>
		);
	}

	return (
		<div className="min-h-screen bg-slate-100 p-6">
			<div className="w-full bg-white rounded-3xl border overflow-hidden flex flex-col md:flex-row min-h-180">
				<aside className="w-full md:w-72 bg-slate-950 p-6 md:p-8 text-white">
					<div className="mb-8">
						<div className="text-xl font-semibold">Setup Flow</div>
						<div className="text-xs text-slate-400 mt-1">Loan Product V2</div>
					</div>

					<nav className="space-y-2">
						{steps.map((step, index) => {
							const isActive = index === currentStep;
							const isDone = index < currentStep;
							let buttonStyle =
								"bg-transparent border-slate-800 hover:bg-slate-900";
							if (isActive) {
								buttonStyle = "bg-blue-600 border-blue-500";
							} else if (isDone) {
								buttonStyle = "bg-slate-900 border-slate-700";
							}
							return (
								<button
									type="button"
									key={step.id}
									onClick={() => setCurrentStep(index)}
									className={`w-full text-left rounded-xl p-3 border transition ${buttonStyle}`}
								>
									<div className="flex items-start gap-3">
										<div className="mt-0.5 h-6 w-6 rounded-full border border-white/40 flex items-center justify-center text-xs font-semibold">
											{index + 1}
										</div>
										<div>
											<div className="text-sm font-medium">{step.title}</div>
											<div className="text-xs text-slate-300">
												{step.description}
											</div>
										</div>
									</div>
								</button>
							);
						})}
					</nav>
				</aside>

				<div className="flex-1 p-6 md:p-8 lg:p-10 flex flex-col">
					<header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
						<div>
							<h1 className="text-3xl font-bold">{steps[currentStep].title}</h1>
							<p className="text-sm text-gray-600 mt-1">
								{steps[currentStep].description}
							</p>
							<p className="text-xs text-gray-500 mt-2">{editingStateLabel}</p>
						</div>
						<div className="flex items-center gap-3">
							{/* <Link
								to="/solution/v2/loan-applications/create"
								className="inline-flex items-center gap-2 border rounded px-3 py-2 text-sm hover:bg-gray-50"
							>
								Create
							</Link>
							<Link
								to="/solution/v2/loan-setup/list"
								className="inline-flex items-center gap-2 border rounded px-3 py-2 text-sm hover:bg-gray-50"
							>
								Saved List
							</Link> */}
							<span className="">
								Step {currentStep + 1} / {steps.length}
							</span>
							{/* <Link
								to="/workflow"
								className="inline-flex items-center gap-2 border rounded px-3 py-2 text-sm hover:bg-gray-50"
							>
								<Workflow className="h-4 w-4" />
								Manage workflows
							</Link> */}
						</div>
					</header>

					<div className="flex-1 space-y-4">{stepContent}</div>

					<footer className="mt-6 flex items-center justify-between">
						<button
							type="button"
							onClick={() => canGoBack && setCurrentStep((prev) => prev - 1)}
							disabled={!canGoBack}
							className={`rounded px-4 py-2 text-sm border ${
								canGoBack ? "hover:bg-gray-50" : "opacity-50 cursor-not-allowed"
							}`}
						>
							Back
						</button>
						<button
							type="button"
							onClick={() => {
								if (canGoNext) {
									setCurrentStep((prev) => prev + 1);
									return;
								}
								handleSaveCompleted();
							}}
							disabled={false}
							className={`rounded px-5 py-2 text-sm text-white ${
								canGoNext
									? "bg-slate-900 hover:bg-slate-800"
									: "bg-emerald-600 cursor-default"
							}`}
						>
							{completionButtonLabel}
						</button>
					</footer>
				</div>
			</div>
		</div>
	);
}
