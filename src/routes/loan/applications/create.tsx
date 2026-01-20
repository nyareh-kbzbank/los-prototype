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
	const defaultBureauProvider = "Myanmar Credit Bureau";
	const defaultBureauPurpose = "Credit assessment";

	const activeScoreCard = useMemo(() => {
		if (!activeSetup?.scorecardId) return null;
		return scoreCards[activeSetup.scorecardId] ?? null;
	}, [activeSetup?.scorecardId, scoreCards]);

	const bureauProviders = useMemo(() => {
		const set = new Set<string>();
		set.add(defaultBureauProvider);
		if (activeScoreCard?.bureauProvider?.trim()) {
			set.add(activeScoreCard.bureauProvider.trim());
		}
		return Array.from(set);
	}, [activeScoreCard?.bureauProvider]);

	const bureauPurposes = useMemo(() => {
		const set = new Set<string>();
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
		return activeScoreCard
			? [...activeScoreCard.fields.map((f) => f.field)].sort((a, b) => a.localeCompare(b))
			: [];
	}, [activeScoreCard]);

	const rulesByField = useMemo<Record<string, Rule[]>>(() => {
		if (!activeScoreCard) return {};
		const acc: Record<string, Rule[]> = {};
		for (const field of activeScoreCard.fields) {
			acc[field.field] = [...(field.rules ?? [])];
		}
		return acc;
	}, [activeScoreCard]);

	const scoreInputFields = useMemo(() => {
		return configuredFields.filter(
			(field) => field !== "age" && field !== "monthlyIncome",
		);
	}, [configuredFields]);

	const [beneficiaryName, setBeneficiaryName] = useState("");
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
	const [bureauProvider, setBureauProvider] = useState(defaultBureauProvider);
	const [bureauPurpose, setBureauPurpose] = useState(defaultBureauPurpose);
	const [bureauConsent, setBureauConsent] = useState(false);
	const [bureauReference, setBureauReference] = useState("");
	const [bureauRequestedAt, setBureauRequestedAt] = useState("");
	const [notes, setNotes] = useState("");
	const [formError, setFormError] = useState<string | null>(null);
	const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});
	const [scoreResult, setScoreResult] = useState<ScoreEngineResult | null>(
		null,
	);

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

		const parsedBureauRequestedAt = bureauRequestedAt
			? Date.parse(bureauRequestedAt)
			: null;
		if (bureauRequestedAt && Number.isNaN(parsedBureauRequestedAt)) {
			setFormError("Enter a valid requested-at date/time.");
			return;
		}

		setFormError(null);
		const creditScoreToSave =
			scoreResult?.totalScore ?? activeSetup.totalScore ?? null;
		const creditMaxToSave =
			scoreResult?.maxScore ?? activeScoreCard?.maxScore ?? null;

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
								<span>Beneficiary name</span>
								<input
									type="text"
									className="border px-2 py-2 rounded"
									value={beneficiaryName}
									onChange={(e) => setBeneficiaryName(e.target.value)}
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
												<label
													key={field}
													className="flex flex-col gap-1 text-sm"
													htmlFor={inputId}
												>
													<span>{field}</span>
													{kind === "boolean" ? (
														<select
															id={inputId}
															value={value}
															onChange={(e) => {
																const nextValue = e.target.value;
																setScoreInputs((prev) => ({
																	...prev,
																	[field]: nextValue,
																}));
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
																setScoreInputs((prev) => ({
																	...prev,
																	[field]: nextValue,
																}));
															}}
															className="border px-2 py-2 rounded"
															placeholder={
																(rulesByField[field] ?? []).some(
																	(r) => r.operator === "between",
																)
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
												Result: {scoreResult.totalScore} /{" "}
												{scoreResult.maxScore} — {scoreResult.riskGrade}
											</span>
										) : null}
									</div>
								</>
							) : (
								<p className="text-sm text-gray-700">
									Link a scorecard in Loan Setup to calculate credit scores per
									beneficiary.
								</p>
							)}
						</div>

						<div className="space-y-3 border rounded p-4">
							<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
								<div>
									<div className="text-sm text-gray-600">
										Credit bureau check
									</div>
									<div className="text-base font-semibold">
										Capture consent and request details
									</div>
								</div>
								{bureauConsent ? (
									<span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
										Consent ready
									</span>
								) : (
									<span className="text-xs px-2 py-1 rounded-full bg-yellow-50 text-yellow-800 border border-yellow-200">
										Consent required
									</span>
								)}
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<label className="flex flex-col gap-1 text-sm">
									<span>Bureau provider</span>
									<select
										className="border px-2 py-2 rounded"
										value={bureauProvider}
										onChange={(e) => setBureauProvider(e.target.value)}
										disabled={disabled}
									>
										{bureauProviders.map((provider) => (
											<option key={provider} value={provider}>
												{provider}
											</option>
										))}
									</select>
								</label>

								<label className="flex flex-col gap-1 text-sm">
									<span>Purpose</span>
									<input
										type="text"
										className="border px-2 py-2 rounded"
										value={bureauPurpose}
										onChange={(e) => setBureauPurpose(e.target.value)}
										list="bureau-purpose-options"
										disabled={disabled}
									/>
									<datalist id="bureau-purpose-options">
										{bureauPurposes.map((purpose) => (
											<option key={purpose} value={purpose}>
												{purpose}
											</option>
										))}
									</datalist>
								</label>

								<label className="flex flex-col gap-2 text-sm">
									<div className="flex items-center gap-2">
										<input
											type="checkbox"
											className="h-4 w-4"
											checked={bureauConsent}
											onChange={(e) => setBureauConsent(e.target.checked)}
											disabled={disabled}
										/>
										<span>Beneficiary consent captured</span>
									</div>
									<span className="text-xs text-gray-600">
										Consent must be obtained before requesting a bureau report.
									</span>
								</label>

								<label className="flex flex-col gap-1 text-sm">
									<span>Bureau reference (case ID)</span>
									<input
										type="text"
										className="border px-2 py-2 rounded"
										value={bureauReference}
										onChange={(e) => setBureauReference(e.target.value)}
										disabled={disabled}
										placeholder="e.g. REF-12345"
									/>
								</label>

								<label className="flex flex-col gap-1 text-sm">
									<span>Bureau requested at</span>
									<input
										type="datetime-local"
										className="border px-2 py-2 rounded"
										value={bureauRequestedAt}
										onChange={(e) => setBureauRequestedAt(e.target.value)}
										disabled={disabled}
									/>
									<span className="text-xs text-gray-600">
										Optional timestamp to track when the bureau request was
										sent.
									</span>
								</label>
							</div>
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
