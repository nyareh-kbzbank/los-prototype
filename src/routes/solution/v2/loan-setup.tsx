import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { CreditScoreEngineTab } from "@/components/loan/v2/CreditScoreEngineTab";
import {
	createDefaultDecisionRules,
	type DecisionRuleAction,
	type DecisionRuleByGrade,
	DecisionRuleSetupTab,
} from "@/components/loan/v2/DecisionRuleSetupTab";
import { DisbursementSetupTab } from "@/components/loan/v2/DisbursementSetupTab";
import { DocumentSetupTab } from "@/components/loan/v2/DocumentSetupTab";
import { InterestEngineTab } from "@/components/loan/v2/InterestEngineTab";
import { ProductSetupTab } from "@/components/loan/v2/ProductSetupTab";
import { RepaymentSetupTab } from "@/components/loan/v2/RepaymentSetupTab";
import type {
	ChannelConfig,
	ProductSetupForm,
	V2InterestConfig,
} from "@/components/loan/v2/setup-types";
import { getWorkflowList, useWorkflowStore } from "@/lib/workflow-store";

export const Route = createFileRoute("/solution/v2/loan-setup")({
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
		interestType: "REDUCING",
		rateType: "FIXED",
		baseRate,
		config: { parameters: [] },
		policies: [],
	};
}

function LoanProductSetup() {
	const workflows = useWorkflowStore((state) => state.workflows);
	const workflowList = useMemo(() => getWorkflowList(workflows), [workflows]);
	const [currentStep, setCurrentStep] = useState(0);

	const steps = [
		{
			id: "product-setup",
			title: "Product Setup",
			description: "Product, loan, channel, and workflow mapping",
		},
		{
			id: "interest-setup",
			title: "Interest Setup",
			description: "Interest rate plans, parameters, and policies",
		},
		{
			id: "repayment-setup",
			title: "Repayment Setup",
			description: "Repayment rules and custom formula",
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
	] as const;

	const [productSetup, setProductSetup] = useState<ProductSetupForm>({
		productName: "",
		productCode: "",
		description: "",
		loanSecurity: "UNSECURED",
		minAmount: 500000,
		maxAmount: 10000000,
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
	});
	const [channels, setChannels] = useState<ChannelConfig[]>([
		createChannelConfig(),
	]);
	const [interestRatePlans, setInterestRatePlans] = useState<
		V2InterestConfig[]
	>([createInterestConfig()]);
	const [bureauRequired, setBureauRequired] = useState(false);
	const [bureauProvider, setBureauProvider] = useState("MMCB");
	const [bureauPurpose, setBureauPurpose] = useState("Credit assessment");
	const [bureauConsentRequired, setBureauConsentRequired] = useState(true);
	const [decisionRules, setDecisionRules] = useState<DecisionRuleByGrade>(() =>
		createDefaultDecisionRules(),
	);

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
			const fallbackRate = current[current.length - 1]?.baseRate ?? 18.5;
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
					{ name: "", value: 0, interestRate: current.baseRate },
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
				{ interestCategory: "", interestRate: 0 },
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

	const handleChangeDecisionRule = (
		grade: keyof DecisionRuleByGrade,
		action: DecisionRuleAction,
	) => {
		setDecisionRules((current) => ({
			...current,
			[grade]: action,
		}));
	};

	const canGoBack = currentStep > 0;
	const canGoNext = currentStep < steps.length - 1;

	let stepContent: ReactNode;
	if (currentStep === 0) {
		stepContent = (
			<ProductSetupTab
				productSetup={productSetup}
				channels={channels}
				workflowList={workflowList}
				mappedChannelWorkflows={mappedChannelWorkflows}
				updateProductField={updateProductField}
				addTenorValue={addTenorValue}
				updateTenorValue={updateTenorValue}
				removeTenorValue={removeTenorValue}
				addChannel={addChannel}
				updateChannelField={updateChannelField}
				removeChannel={removeChannel}
			/>
		);
	} else if (currentStep === 1) {
		stepContent = (
			<InterestEngineTab
				interestRatePlans={interestRatePlans}
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
		stepContent = <RepaymentSetupTab />;
	} else if (currentStep === 3) {
		stepContent = (
			<CreditScoreEngineTab
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
		stepContent = <DocumentSetupTab loanSecurity={productSetup.loanSecurity} />;
	} else if (currentStep === 5) {
		stepContent = (
			<DecisionRuleSetupTab
				decisionRules={decisionRules}
				onChangeDecisionRule={handleChangeDecisionRule}
			/>
		);
	} else {
		stepContent = <DisbursementSetupTab />;
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
							return (
								<button
									type="button"
									key={step.id}
									onClick={() => setCurrentStep(index)}
									className={`w-full text-left rounded-xl p-3 border transition ${
										isActive
											? "bg-blue-600 border-blue-500"
											: isDone
												? "bg-slate-900 border-slate-700"
												: "bg-transparent border-slate-800 hover:bg-slate-900"
									}`}
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
						</div>
						<div className="flex items-center gap-3">
							<span className="text-xs text-gray-500">
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
							onClick={() => canGoNext && setCurrentStep((prev) => prev + 1)}
							disabled={!canGoNext}
							className={`rounded px-5 py-2 text-sm text-white ${
								canGoNext
									? "bg-slate-900 hover:bg-slate-800"
									: "bg-emerald-600 opacity-70 cursor-default"
							}`}
						>
							{canGoNext ? "Next" : "Completed"}
						</button>
					</footer>
				</div>
			</div>
		</div>
	);
}
