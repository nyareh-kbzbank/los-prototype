import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
	type LoanApplicationStatus,
	useLoanApplicationStore,
} from "@/lib/loan-application-store";
import {
	type DisbursementDestinationType,
	getLoanSetupList,
	type LoanWorkflowSnapshot,
	useLoanSetupStore,
} from "@/lib/loan-setup-store";
import {
	evaluateScoreCard,
	inferFieldKind,
	type ScoreEngineResult,
} from "@/lib/scorecard-engine";
import { type Rule, useScoreCardStore } from "@/lib/scorecard-store";

export const Route = createFileRoute("/loan/applications/create")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const setups = useLoanSetupStore((s) => s.setups);
	const scoreCards = useScoreCardStore((s) => s.scoreCards);
	const addApplication = useLoanApplicationStore((s) => s.addApplication);
	const setupList = useMemo(() => getLoanSetupList(setups), [setups]);
	const [selectedSetupId, setSelectedSetupId] = useState(
		setupList[0]?.id ?? "",
	);

	const activeSetup = useMemo<LoanWorkflowSnapshot | null>(() => {
		return (
			setupList.find((s) => s.id === selectedSetupId) ?? setupList[0] ?? null
		);
	}, [setupList, selectedSetupId]);

	useEffect(() => {
		if (setupList.length === 0) return;
		if (!activeSetup) {
			setSelectedSetupId(setupList[0].id);
		}
	}, [activeSetup, setupList]);

	const tenureOptions = activeSetup?.product.tenureMonths ?? [];
	const channelOptions = activeSetup?.channels ?? [];
	const destinationChoices: DisbursementDestinationType[] = (
		activeSetup?.disbursementDestinations ?? []
	).map((d) => d.type);

	const activeScoreCard = useMemo(() => {
		if (!activeSetup?.scorecardId) return null;
		return scoreCards[activeSetup.scorecardId] ?? null;
	}, [activeSetup?.scorecardId, scoreCards]);

	const configuredFields = useMemo(() => {
		return activeScoreCard
			? Array.from(new Set(activeScoreCard.rules.map((r) => r.field))).sort((a, b) =>
						a.localeCompare(b),
				  )
			: [];
	}, [activeScoreCard]);

	const rulesByField = useMemo<Record<string, Rule[]>>(() => {
		if (!activeScoreCard) return {};
		const acc: Record<string, Rule[]> = {};
		for (const rule of activeScoreCard.rules) {
			const current = acc[rule.field];
			acc[rule.field] = current ? [...current, rule] : [rule];
		}
		return acc;
	}, [activeScoreCard]);

	const scoreInputFields = useMemo(() => {
		return configuredFields.filter(
			(field) => field !== "age" && field !== "monthlyIncome",
		);
	}, [configuredFields]);

	const [applicantName, setApplicantName] = useState("");
	const [nationalId, setNationalId] = useState("");
	const [phone, setPhone] = useState("");
	const [ageInput, setAgeInput] = useState("");
	const [monthlyIncomeInput, setMonthlyIncomeInput] = useState("");
	const [amountInput, setAmountInput] = useState("");
	const [tenureValue, setTenureValue] = useState<number | null>(
		tenureOptions[0] ?? null,
	);
	const [channelCode, setChannelCode] = useState(channelOptions[0]?.code ?? "");
	const [destinationType, setDestinationType] =
		useState<DisbursementDestinationType>(destinationChoices[0] ?? "BANK");
	const [notes, setNotes] = useState("");
	const [formError, setFormError] = useState<string | null>(null);
	const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
	const [scoreResult, setScoreResult] = useState<ScoreEngineResult | null>(null);

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
			const next: Record<string, string> = {};
			for (const field of scoreInputFields) {
				next[field] = prev[field] ?? "";
			}
			return next;
		});
		setScoreResult(null);
	}, [activeSetup?.id, scoreInputFields]);

	const disabled = setupList.length === 0;
	const statusBadge: LoanApplicationStatus | "" = "DRAFT";

	const handleCalculateScore = () => {
		if (!activeScoreCard) {
			setFormError("This loan setup is missing a linked scorecard.");
			return;
		}

		const inputs: Record<string, string> = {};
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

		if (!applicantName.trim()) {
			setFormError("Applicant name is required.");
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
		if (
			activeSetup.product.minAmount &&
			parsedAmount < activeSetup.product.minAmount
		) {
			setFormError(
				`Amount must be at least ${activeSetup.product.minAmount.toLocaleString()}.`,
			);
			return;
		}
		if (
			activeSetup.product.maxAmount &&
			parsedAmount > activeSetup.product.maxAmount
		) {
			setFormError(
				`Amount must be at most ${activeSetup.product.maxAmount.toLocaleString()}.`,
			);
			return;
		}

		setFormError(null);
		const creditScoreToSave =
			scoreResult?.totalScore ?? activeSetup.totalScore ?? null;
		const creditMaxToSave =
			scoreResult?.maxScore ?? activeScoreCard?.maxScore ?? null;

		addApplication({
			applicantName,
			nationalId,
			phone,
			age: parsedAge,
			monthlyIncome: parsedMonthlyIncome,
			requestedAmount: parsedAmount,
			tenureMonths: tenureValue,
			channelCode,
			destinationType,
			notes,
			setupId: activeSetup.id,
			productCode: activeSetup.product.productCode,
			productName: activeSetup.product.productName,
			creditScore: creditScoreToSave,
			creditMax: creditMaxToSave,
			workflowId: activeSetup.workflowId,
			workflowName: activeSetup.workflowName,
		});

		navigate({ to: "/loan/applications" });
	};

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="space-y-6">
				<div>
					<div className="text-sm text-gray-600">Loan applications</div>
					<h1 className="text-2xl font-semibold">Create application</h1>
				</div>

				{disabled ? (
					<div className="border rounded p-4 bg-yellow-50 text-sm text-gray-800">
						You need at least one saved loan setup before creating applications.
						<div className="mt-2">
							<Link to="/loan/setup" className="text-blue-600 hover:underline">
								Go to Loan Setup
							</Link>
						</div>
					</div>
				) : (
					<div className="space-y-4 border rounded p-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<label className="flex flex-col gap-1 text-sm">
								<span>Loan setup (product)</span>
								<select
									className="border px-2 py-2 rounded"
									value={selectedSetupId}
									onChange={(e) => setSelectedSetupId(e.target.value)}
								>
									{setupList.map((setup) => (
										<option key={setup.id} value={setup.id}>
											{setup.product.productName} ({setup.product.productCode})
										</option>
									))}
								</select>
								<span className="text-xs text-gray-600">
									Tenure options: {tenureOptions.join(", ") || "—"} months ·
									Range: {activeSetup?.product.minAmount.toLocaleString()} -{" "}
									{activeSetup?.product.maxAmount.toLocaleString()}
								</span>
							</label>

							<label className="flex flex-col gap-1 text-sm">
								<span>Status</span>
								<input
									readOnly
									value={statusBadge}
									className="border px-2 py-2 rounded bg-gray-50"
								/>
							</label>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<label className="flex flex-col gap-1 text-sm">
								<span>Applicant name</span>
								<input
									type="text"
									className="border px-2 py-2 rounded"
									value={applicantName}
									onChange={(e) => setApplicantName(e.target.value)}
									disabled={disabled}
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>National ID</span>
								<input
									type="text"
									className="border px-2 py-2 rounded"
									value={nationalId}
									onChange={(e) => setNationalId(e.target.value)}
									disabled={disabled}
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>Phone</span>
								<input
									type="tel"
									className="border px-2 py-2 rounded"
									value={phone}
									onChange={(e) => setPhone(e.target.value)}
									disabled={disabled}
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>Age</span>
								<input
									type="number"
									min={0}
									className="border px-2 py-2 rounded"
									value={ageInput}
									onChange={(e) => setAgeInput(e.target.value)}
									disabled={disabled}
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>Monthly income</span>
								<input
									type="number"
									min={0}
									className="border px-2 py-2 rounded"
									value={monthlyIncomeInput}
									onChange={(e) => setMonthlyIncomeInput(e.target.value)}
									disabled={disabled}
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>Requested amount</span>
								<input
									type="number"
									min={activeSetup?.product.minAmount ?? 0}
									max={activeSetup?.product.maxAmount ?? undefined}
									className="border px-2 py-2 rounded"
									value={amountInput}
									onChange={(e) => setAmountInput(e.target.value)}
									disabled={disabled}
								/>
								<span className="text-xs text-gray-600">
									{activeSetup
										? `Allowed: ${activeSetup.product.minAmount.toLocaleString()} - ${activeSetup.product.maxAmount.toLocaleString()}`
										: "Save a loan setup first."}
								</span>
							</label>
						</div>

						<div className="space-y-3 border rounded p-4">
							<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
								<div>
									<div className="text-sm text-gray-600">Credit score</div>
									<div className="text-base font-semibold">
										{activeScoreCard
											? `${activeScoreCard.name} (Max ${activeScoreCard.maxScore})`
											: "No scorecard attached"}
									</div>
								</div>
								{scoreResult ? (
									<div className="text-sm text-gray-700">
										Score {scoreResult.totalScore} / {scoreResult.maxScore} —
										 {scoreResult.riskGrade}
									</div>
								) : null}
							</div>

							{activeScoreCard ? (
								<>
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										{scoreInputFields.map((field) => {
											const kind = inferFieldKind(rulesByField[field] ?? []);
											const value = scoreInputs[field] ?? "";
											const inputId = `score-${field}`;
											return (
												<label key={field} className="flex flex-col gap-1 text-sm" htmlFor={inputId}>
													<span>{field}</span>
													{kind === "boolean" ? (
														<select
															id={inputId}
															value={value}
															onChange={(e) => {
																const nextValue = e.target.value;
																setScoreInputs((prev) => ({ ...prev, [field]: nextValue }));
															}}
															className="border px-2 py-2 rounded"
															disabled={disabled}
														>
															<option value="">(not set)</option>
															<option value="true">true</option>
															<option value="false">false</option>
														</select>
													) : (
														<input
															id={inputId}
															type={kind === "number" ? "number" : "text"}
															value={value}
															onChange={(e) => {
																const nextValue = e.target.value;
																setScoreInputs((prev) => ({ ...prev, [field]: nextValue }));
															}}
															className="border px-2 py-2 rounded"
															placeholder={
																(rulesByField[field] ?? []).some((r) => r.operator === "between")
																	? "For between: e.g. 25,45"
																	: ""
															}
															disabled={disabled}
														/>
													)}
												</label>
											);
										})}
									</div>

									<div className="flex gap-2 items-center">
										<button
											type="button"
											onClick={handleCalculateScore}
											className="px-4 py-2 rounded bg-blue-600 text-white shadow hover:bg-blue-700"
											disabled={disabled}
										>
											Calculate credit score
										</button>
										{scoreResult ? (
											<span className="text-sm text-gray-700">
												Result: {scoreResult.totalScore} / {scoreResult.maxScore} — {scoreResult.riskGrade}
											</span>
										) : null}
									</div>
								</>
							) : (
								<p className="text-sm text-gray-700">
									Link a scorecard in Loan Setup to calculate credit scores per applicant.
								</p>
							)}
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<label className="flex flex-col gap-1 text-sm">
								<span>Tenure (months)</span>
								<select
									className="border px-2 py-2 rounded"
									value={tenureValue ?? ""}
									onChange={(e) =>
										setTenureValue(
											e.target.value ? Number(e.target.value) : null,
										)
									}
									disabled={disabled || tenureOptions.length === 0}
								>
									{tenureOptions.map((months) => (
										<option key={months} value={months}>
											{months}
										</option>
									))}
								</select>
							</label>

							<label className="flex flex-col gap-1 text-sm">
								<span>Channel code</span>
								<input
									type="text"
									className="border px-2 py-2 rounded"
									value={channelCode}
									onChange={(e) => setChannelCode(e.target.value)}
									list="channel-options"
									disabled={disabled}
								/>
								<datalist id="channel-options">
									{channelOptions.map((ch) => (
										<option
											key={`${ch.code}-${ch.name}`}
											value={ch.code || ch.name}
										>
											{ch.name}
										</option>
									))}
								</datalist>
							</label>

							<label className="flex flex-col gap-1 text-sm">
								<span>Disbursement destination</span>
								<select
									className="border px-2 py-2 rounded"
									value={destinationType}
									onChange={(e) =>
										setDestinationType(
											e.target.value as DisbursementDestinationType,
										)
									}
									disabled={disabled}
								>
									{(destinationChoices.length
										? destinationChoices
										: ["BANK"]
									).map((dest) => (
										<option key={dest} value={dest}>
											{dest}
										</option>
									))}
								</select>
							</label>
						</div>

						<label className="flex flex-col gap-1 text-sm">
							<span>Notes</span>
							<textarea
								className="border px-2 py-2 rounded min-h-24"
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								disabled={disabled}
							/>
						</label>

						{formError ? (
							<div className="text-sm text-red-700">{formError}</div>
						) : null}

						<div className="flex gap-3">
							<button
								type="button"
								onClick={handleSubmit}
								className="px-4 py-2 rounded bg-emerald-600 text-white shadow hover:bg-emerald-700"
								disabled={disabled}
							>
								Save application
							</button>
							<Link
								to="/loan/applications"
								className="px-4 py-2 rounded border text-sm hover:bg-gray-50"
							>
								Cancel
							</Link>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
