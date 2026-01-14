import { createFileRoute, Link } from "@tanstack/react-router";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
	type ChannelConfig,
	type LoanProduct,
	useLoanSetupStore,
} from "@/lib/loan-setup-store";
import { getWorkflowList, useWorkflowStore } from "@/lib/workflow-store";
import {
	evaluateScoreCard,
	inferFieldKind,
	type ScoreEngineResult,
} from "../../lib/scorecard-engine";
import { type Rule, useScoreCardStore } from "../../lib/scorecard-store";

export const Route = createFileRoute("/loan/setup")({
	component: RouteComponent,
});

// --------------------
// Workflow Engine (Frontend Mock)
// --------------------
const workflowDefinition = [
	{ stepId: "KYC", label: "KYC Verification" },
	{ stepId: "DOCUMENT", label: "Document Upload" },
	{ stepId: "CREDIT", label: "Credit Check" },
	{ stepId: "RISK", label: "Risk Assessment" },
	{ stepId: "APPROVAL", label: "Approval" },
];

const runWorkflow = (currentStepIndex: number) => {
	return workflowDefinition.map((step, index) => {
		let status: "COMPLETED" | "IN_PROGRESS" | "PENDING" = "PENDING";
		if (index < currentStepIndex) status = "COMPLETED";
		else if (index === currentStepIndex) status = "IN_PROGRESS";
		return { ...step, status };
	});
};

const workflowStepClass = (status: "COMPLETED" | "IN_PROGRESS" | "PENDING") => {
	if (status === "COMPLETED") return "bg-green-100";
	if (status === "IN_PROGRESS") return "bg-yellow-100";
	return "bg-gray-100";
};

// --------------------
// Loan Product Setup
// --------------------
const loanProductSetup: LoanProduct = {
	productCode: "PL-STD",
	productName: "Personal Loan Standard",
	minAmount: 500000,
	maxAmount: 10000000,
	tenureMonths: [6, 12, 18, 24],
	baseInterestRate: 18.5,
};

function RouteComponent() {
	const scoreCards = useScoreCardStore((s) => s.scoreCards);
	const selectedScoreCardId = useScoreCardStore((s) => s.selectedScoreCardId);
	const selectScoreCard = useScoreCardStore((s) => s.selectScoreCard);
	const workflows = useWorkflowStore((s) => s.workflows);
	const selectedWorkflowId = useWorkflowStore((s) => s.selectedWorkflowId);
	const selectWorkflow = useWorkflowStore((s) => s.selectWorkflow);
	const addLoanSetup = useLoanSetupStore((s) => s.addSetup);
	const configuredScoreCard = scoreCards[selectedScoreCardId];
	const configuredScoreCardFallback = useMemo(() => {
		return Object.values(scoreCards)[0];
	}, [scoreCards]);
	const activeScoreCard = configuredScoreCard ?? configuredScoreCardFallback;

	const [product, setProduct] = useState(loanProductSetup);
	const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
	const [workflowStep, setWorkflowStep] = useState(0);
	const [riskResult, setRiskResult] = useState<ScoreEngineResult | null>(null);
	const [workflow, setWorkflow] = useState(runWorkflow(0));
	const [channels, setChannels] = useState<ChannelConfig[]>([
		{ name: "", code: "" },
	]);
	const workflowList = useMemo(() => getWorkflowList(workflows), [workflows]);
	const [tenureInput, setTenureInput] = useState(
		loanProductSetup.tenureMonths.join(", "),
	);

	const handleTextChange =
		(field: "productCode" | "productName") =>
		(e: ChangeEvent<HTMLInputElement>) => {
			const { value } = e.target;
			setProduct((prev) => ({ ...prev, [field]: value }));
		};

	const handleNumberChange =
		(field: "minAmount" | "maxAmount" | "baseInterestRate") =>
		(e: ChangeEvent<HTMLInputElement>) => {
			const { value } = e.target;
			const parsed = Number(value);
			setProduct((prev) => ({
				...prev,
				[field]: Number.isFinite(parsed) ? parsed : prev[field],
			}));
		};

	const scoreCardList = useMemo(() => {
		return Object.values(scoreCards).sort((a, b) =>
			(a.name || a.scoreCardId).localeCompare(b.name || b.scoreCardId),
		);
	}, [scoreCards]);

	const configuredFields = useMemo(() => {
		return activeScoreCard
			? Array.from(new Set(activeScoreCard.rules.map((r) => r.field))).sort(
					(a, b) => a.localeCompare(b),
				)
			: [];
	}, [activeScoreCard]);

	const rulesByField = useMemo<Record<string, Rule[]>>(() => {
		if (!activeScoreCard) return {};
		const acc: Record<string, Rule[]> = {};
		for (const rule of activeScoreCard.rules) {
			const existing = acc[rule.field];
			if (existing) existing.push(rule);
			else acc[rule.field] = [rule];
		}
		return acc;
	}, [activeScoreCard]);

	useEffect(() => {
		setScoreInputs((prev) => {
			const next: Record<string, string> = {};
			for (const field of configuredFields) {
				next[field] = prev[field] ?? "";
			}
			return next;
		});
		setRiskResult(null);
	}, [configuredFields]);

	const handleTenureChange = (e: ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setTenureInput(value);
		const months = value
			.split(",")
			.map((item) => Number(item.trim()))
			.filter((n) => Number.isFinite(n) && n > 0);
		setProduct((prev) => ({ ...prev, tenureMonths: months }));
	};

	const resetProduct = () => {
		setProduct(loanProductSetup);
		setTenureInput(loanProductSetup.tenureMonths.join(", "));
	};

	const addChannelRow = () => {
		setChannels((prev) => [...prev, { name: "", code: "" }]);
	};

	const updateChannel =
		(index: number, field: "name" | "code") =>
		(e: ChangeEvent<HTMLInputElement>) => {
			const { value } = e.target;
			setChannels((prev) =>
				prev.map((row, idx) =>
					idx === index ? { ...row, [field]: value } : row,
				),
			);
		};

	const removeChannelRow = (index: number) => {
		setChannels((prev) => {
			if (prev.length === 1) return [{ name: "", code: "" }];
			return prev.filter((_, idx) => idx !== index);
		});
	};

	const onEvaluateScore = () => {
		if (!activeScoreCard) return;
		const result = evaluateScoreCard(activeScoreCard, scoreInputs);
		setRiskResult(result);
		setWorkflow(runWorkflow(3)); // after risk step
	};

	const nextStep = () => {
		const next = Math.min(workflowStep + 1, workflowDefinition.length - 1);
		setWorkflowStep(next);
		setWorkflow(runWorkflow(next));
	};

	const onSaveWorkflowSetup = () => {
		addLoanSetup({
			product,
			channels,
			scorecardId: activeScoreCard?.scoreCardId ?? null,
			scorecardName: activeScoreCard?.name ?? null,
			workflowId: selectedWorkflowId,
			workflowName: selectedWorkflowId
				? workflows[selectedWorkflowId]?.name ?? "(unnamed workflow)"
				: null,
			riskResult,
		});
	};

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold">
					Loan Product Setup & Workflow (React)
				</h1>
				<Link
					to="/loan/scorecard-setup"
					className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
				>
					Configure Scorecard
				</Link>
			</div>

			{/* Product Setup */}
			<section className="border p-4 rounded mb-6">
				<div className="flex items-center justify-between mb-3">
					<h2 className="font-semibold">Loan Product</h2>
					<button
						onClick={resetProduct}
						type="button"
						className="text-sm border px-2 py-1 rounded hover:bg-gray-100"
					>
						Reset
					</button>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label className="flex flex-col gap-1 text-sm">
						<span>Product Code</span>
						<input
							type="text"
							value={product.productCode}
							onChange={handleTextChange("productCode")}
							className="border px-2 py-1 rounded"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Product Name</span>
						<input
							type="text"
							value={product.productName}
							onChange={handleTextChange("productName")}
							className="border px-2 py-1 rounded"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Minimum Amount</span>
						<input
							type="number"
							min={0}
							value={product.minAmount}
							onChange={handleNumberChange("minAmount")}
							className="border px-2 py-1 rounded"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Maximum Amount</span>
						<input
							type="number"
							min={0}
							value={product.maxAmount}
							onChange={handleNumberChange("maxAmount")}
							className="border px-2 py-1 rounded"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Tenure Months (comma separated)</span>
						<input
							type="text"
							value={tenureInput}
							onChange={handleTenureChange}
							className="border px-2 py-1 rounded"
							placeholder="6, 12, 18, 24"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Base Interest Rate (%)</span>
						<input
							type="number"
							step="0.1"
							min={0}
							value={product.baseInterestRate}
							onChange={handleNumberChange("baseInterestRate")}
							className="border px-2 py-1 rounded"
						/>
					</label>
				</div>

				<div className="bg-gray-50 border rounded p-3 text-sm mt-4">
					<div className="font-semibold mb-2">Preview</div>
					<dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
						<div>
							<dt className="text-gray-600">Code</dt>
							<dd className="font-mono">{product.productCode}</dd>
						</div>
						<div>
							<dt className="text-gray-600">Name</dt>
							<dd>{product.productName}</dd>
						</div>
						<div>
							<dt className="text-gray-600">Amount Range</dt>
							<dd className="font-mono">
								{product.minAmount.toLocaleString()} -{" "}
								{product.maxAmount.toLocaleString()}
							</dd>
						</div>
						<div>
							<dt className="text-gray-600">Tenure Months</dt>
							<dd className="font-mono">
								{product.tenureMonths.length
									? product.tenureMonths.join(", ")
									: "None"}
							</dd>
						</div>
						<div>
							<dt className="text-gray-600">Base Rate</dt>
							<dd className="font-mono">{product.baseInterestRate}%</dd>
						</div>
					</dl>
				</div>
			</section>

			{/* Scorecard */}
			<section className="border p-4 rounded mb-6">
				<div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between mb-3">
					<div>
						<h2 className="font-semibold">
							Scorecard Engine — {activeScoreCard?.name ?? "(none)"}
							{activeScoreCard ? ` (Max: ${activeScoreCard.maxScore})` : ""}
						</h2>
						<div className="text-xs text-gray-600">
							Select a saved scorecard to drive the inputs.
						</div>
					</div>
					<label className="flex flex-col gap-1 text-sm">
						<span>Scorecard</span>
						<select
							value={selectedScoreCardId}
							onChange={(e: ChangeEvent<HTMLSelectElement>) =>
								selectScoreCard(e.target.value)
							}
							className="border px-2 py-2 rounded"
						>
							{scoreCardList.map((c) => (
								<option key={c.scoreCardId} value={c.scoreCardId}>
									{c.name || c.scoreCardId}
								</option>
							))}
						</select>
					</label>
				</div>

				{configuredFields.length === 0 ? (
					<div className="text-sm text-gray-700 border rounded p-3 bg-gray-50">
						No fields configured in this scorecard yet. Add fields/conditions in
						the setup page.
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
						{configuredFields.map((field) => {
							const kind = inferFieldKind(rulesByField[field] ?? []);
							const inputId = `score-${field}`;
							return (
								<div key={field} className="flex flex-col gap-1 text-sm">
									<label htmlFor={inputId}>
										<span>{field}</span>
									</label>
									{kind === "boolean" ? (
										<select
											id={inputId}
											value={scoreInputs[field] ?? ""}
											onChange={(e: ChangeEvent<HTMLSelectElement>) =>
												setScoreInputs((prev) => ({
													...prev,
													[field]: e.target.value,
												}))
											}
											className="border px-2 py-2 rounded"
										>
											<option value="">(not set)</option>
											<option value="true">true</option>
											<option value="false">false</option>
										</select>
									) : (
										<input
											id={inputId}
											type={kind === "number" ? "number" : "text"}
											value={scoreInputs[field] ?? ""}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												setScoreInputs((prev) => ({
													...prev,
													[field]: e.target.value,
												}))
											}
											className="border px-2 py-2 rounded"
											placeholder={
												(rulesByField[field] ?? []).some(
													(r) => r.operator === "between",
												)
													? "For between: e.g. 25,45"
													: ""
											}
										/>
									)}
								</div>
							);
						})}
					</div>
				)}

				<div className="flex gap-2 items-center">
					<button
						onClick={onEvaluateScore}
						className="bg-blue-600 text-white px-3 py-1 rounded"
						type="button"
					>
						Evaluate Score
					</button>
					<button
						onClick={() =>
							setScoreInputs((prev) => {
								const next: Record<string, string> = { ...prev };
								for (const f of configuredFields) {
									next[f] = "";
								}
								return next;
							})
						}
						type="button"
						className="text-sm border px-2 py-1 rounded hover:bg-gray-100"
					>
						Reset Inputs
					</button>
					{riskResult && (
						<span className="text-sm text-gray-700">
							Score: {riskResult.totalScore} / {riskResult.maxScore} —{" "}
							{riskResult.riskGrade}
						</span>
					)}
				</div>

				{riskResult && (
					<div className="mt-4 space-y-3">
						<div className="bg-green-50 border rounded p-3 text-sm">
							<div className="font-semibold">Score Breakdown</div>
							<div className="text-gray-700 mb-2">
								Matched {riskResult.matchedRules} of{" "}
								{activeScoreCard?.rules.length ?? 0} rules
							</div>
							<ul className="space-y-1">
								{riskResult.breakdown.map((item, idx) => (
									<li
										key={`${item.field}-${idx}`}
										className={`flex justify-between gap-2 ${
											item.matched ? "text-green-700" : "text-gray-500"
										}`}
									>
										<span>
											{item.field} {item.operator} {item.value}
										</span>
										<span>{item.matched ? `+${item.score}` : "0"}</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				)}
			</section>

			{/* Document Setup */}
			{riskResult && (
				<section className="border p-4 rounded mb-6">
					<h2 className="font-semibold mb-2">Required Documents</h2>
					<div className="text-sm text-gray-700 mb-2">
						Risk Grade: {riskResult.riskGrade}
					</div>
					<ul className="list-disc ml-6">
						{riskResult.minDocs.map((doc) => (
							<li key={doc}>{doc}</li>
						))}
					</ul>
				</section>
			)}

			{/* Workflow selection */}
			<section className="border p-4 rounded mb-6">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="font-semibold">Workflow</h2>
						<div className="text-xs text-gray-600">
							Choose a saved workflow to visualize/apply.
						</div>
					</div>
					<select
						className="border px-2 py-2 rounded"
						value={selectedWorkflowId ?? ""}
						onChange={(e) => selectWorkflow(e.target.value || null)}
					>
						<option value="">(none selected)</option>
						{workflowList.map((wf) => (
							<option key={wf.workflowId} value={wf.workflowId}>
								{wf.name}
							</option>
						))}
					</select>
				</div>
				{selectedWorkflowId && workflows[selectedWorkflowId] ? (
					<div className="mt-3 text-xs text-gray-700">
						<span className="font-semibold">Selected:</span>{" "}
						{workflows[selectedWorkflowId].name}
					</div>
				) : null}
			</section>

			{/* Channel configuration */}
			<section className="border p-4 rounded mb-6">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-3">
					<div>
						<h2 className="font-semibold">Channel Configuration</h2>
						<div className="text-xs text-gray-600">
							Add delivery channels with a display name and code.
						</div>
					</div>
					<button
						type="button"
						onClick={addChannelRow}
						className="text-sm border px-3 py-1 rounded hover:bg-gray-100"
					>
						Add channel
					</button>
				</div>

				<div className="space-y-3">
					{channels.map((channel, idx) => {
						const nameId = `channel-name-${idx}`;
						const codeId = `channel-code-${idx}`;
						return (
							<div
								key={`${channel.code || "code"}-${idx}`}
								className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
							>
								<label className="flex flex-col gap-1 text-sm" htmlFor={nameId}>
									<span>Channel name</span>
									<input
										id={nameId}
										type="text"
										value={channel.name}
										onChange={updateChannel(idx, "name")}
										className="border px-2 py-2 rounded"
										placeholder="e.g. WhatsApp"
									/>
								</label>
								<label className="flex flex-col gap-1 text-sm" htmlFor={codeId}>
									<span>Channel code</span>
									<input
										id={codeId}
										type="text"
										value={channel.code}
										onChange={updateChannel(idx, "code")}
										className="border px-2 py-2 rounded"
										placeholder="e.g. WA-01"
									/>
								</label>
								<button
									type="button"
									onClick={() => removeChannelRow(idx)}
									className="text-sm border px-3 py-2 rounded hover:bg-gray-100"
								>
									Remove
								</button>
							</div>
						);
					})}
				</div>
			</section>

			<section className="mt-8">
				<div className="flex flex-col gap-2">
					<button
						onClick={onSaveWorkflowSetup}
						type="button"
						className="w-full py-4 text-lg font-semibold bg-emerald-600 text-white rounded-lg shadow hover:bg-emerald-700"
					>
						Save Product Setup
					</button>
					<div className="flex flex-col gap-1 text-sm text-gray-700 md:flex-row md:items-center md:justify-between">
						<span>Saved locally via Zustand. No edit flow yet.</span>
						<Link
							to="/loan/workflow-list"
							className="text-blue-600 hover:underline"
						>
							View saved loan setups
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
