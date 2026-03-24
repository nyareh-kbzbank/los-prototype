import { Plus, Trash2, X } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
	evaluateScoreCard,
	inferFieldKind,
	type ScoreEngineResult,
} from "@/lib/scorecard-engine";
import {
	type Operator,
	operatorOptions,
	type Rule,
	type ScoreCard,
	type ScoreCardField,
} from "@/lib/scorecard-store";
import { InputInfoLabel } from "./InputInfoLabel";

type CreditScoreEngineTabProps = {
	bureauRequired: boolean;
	bureauProvider: string;
	bureauPurpose: string;
	bureauConsentRequired: boolean;
	setBureauRequired: (value: boolean) => void;
	setBureauProvider: (value: string) => void;
	setBureauPurpose: (value: string) => void;
	setBureauConsentRequired: (value: boolean) => void;
	state?: CreditScoreEngineState;
	onStateChange?: (value: CreditScoreEngineState) => void;
};

export type RiskGradeThresholds = {
	lowMin: number;
	mediumMin: number;
	highMin: number;
};

export type CreditScoreEngineState = {
	scoreCard: ScoreCard;
	riskThresholds: RiskGradeThresholds;
};

export const createDefaultCreditScoreEngineState = (): CreditScoreEngineState => ({
	scoreCard: createEmptyScoreCard(),
	riskThresholds: {
		lowMin: 60,
		mediumMin: 40,
		highMin: 0,
	},
});

const humanizeFieldName = (field: string): string => {
	return field
		.replaceAll(/[_-]+/g, " ")
		.replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replaceAll(/\s+/g, " ")
		.trim()
		.replace(/^./, (c) => c.toUpperCase());
};

const createRuleForField = (field: string): Rule => ({
	field,
	operator: ">=",
	value: "",
	score: 0,
});

const createFieldGroup = (field: string): ScoreCardField => ({
	field,
	description: humanizeFieldName(field),
	rules: [createRuleForField(field)],
});

const generateScoreCardId = () =>
	globalThis.crypto?.randomUUID?.() ?? `scorecard_${Date.now()}`;

const createEmptyScoreCard = (): ScoreCard => ({
	scoreCardId: generateScoreCardId(),
	name: "New Scorecard",
	maxScore: 100,
	fields: [],
});

const operatorPlaceholder = (op: Operator): string => {
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

const normalizeRiskThresholds = (
	thresholds: RiskGradeThresholds,
	maxScore: number,
): RiskGradeThresholds => {
	const boundedHigh = Math.max(0, Math.min(thresholds.highMin, maxScore));
	const boundedMedium = Math.max(
		boundedHigh,
		Math.min(thresholds.mediumMin, maxScore),
	);
	const boundedLow = Math.max(
		boundedMedium,
		Math.min(thresholds.lowMin, maxScore),
	);
	return {
		highMin: boundedHigh,
		mediumMin: boundedMedium,
		lowMin: boundedLow,
	};
};

const gradeFromThresholds = (
	score: number,
	thresholds: RiskGradeThresholds,
) => {
	if (score >= thresholds.lowMin) return "LOW" as const;
	if (score >= thresholds.mediumMin) return "MEDIUM" as const;
	if (score >= thresholds.highMin) return "HIGH" as const;
	return "HIGH" as const;
};

export function CreditScoreEngineTab({
	bureauRequired,
	bureauProvider,
	bureauPurpose,
	bureauConsentRequired,
	setBureauRequired,
	setBureauProvider,
	setBureauPurpose,
	setBureauConsentRequired,
	state,
	onStateChange,
}: Readonly<CreditScoreEngineTabProps>) {
	const [scoreCard, setScoreCard] = useState<ScoreCard>(
		state?.scoreCard ?? createEmptyScoreCard(),
	);
	const [newFieldName, setNewFieldName] = useState("");
	const [isTestOpen, setIsTestOpen] = useState(false);
	const [testInputs, setTestInputs] = useState<Record<string, string>>({});
	const [testResult, setTestResult] = useState<ScoreEngineResult | null>(null);
	const [riskThresholds, setRiskThresholds] = useState<RiskGradeThresholds>(
		state?.riskThresholds ?? {
			lowMin: 60,
			mediumMin: 40,
			highMin: 0,
		},
	);

	useEffect(() => {
		onStateChange?.({
			scoreCard,
			riskThresholds,
		});
	}, [onStateChange, riskThresholds, scoreCard]);

	const allRules = useMemo(() => {
		return scoreCard.fields.flatMap((f) => f.rules ?? []);
	}, [scoreCard.fields]);

	const normalizedRiskThresholds = useMemo(
		() => normalizeRiskThresholds(riskThresholds, scoreCard.maxScore),
		[riskThresholds, scoreCard.maxScore],
	);

	const effectiveRiskGrade = useMemo(() => {
		if (!testResult) return null;
		return gradeFromThresholds(testResult.totalScore, normalizedRiskThresholds);
	}, [testResult, normalizedRiskThresholds]);

	const handleCardInfoChange = (e: ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setScoreCard((prev) => {
			if (name === "name") {
				return { ...prev, name: value };
			}
			if (name === "maxScore") {
				return { ...prev, maxScore: Number(value) || 0 };
			}
			return prev;
		});
	};

	const handleRiskThresholdChange = (
		field: keyof RiskGradeThresholds,
		value: string,
	) => {
		const parsed = Number(value);
		setRiskThresholds((prev) => ({
			...prev,
			[field]: Number.isFinite(parsed) ? parsed : 0,
		}));
	};

	const updateFieldName = (fieldIndex: number, value: string) => {
		setScoreCard((prev) => {
			const fields = [...prev.fields];
			const target = fields[fieldIndex];
			if (!target) return prev;
			const nextField = value.trim();
			const updatedRules = (target.rules ?? []).map((rule) => ({
				...rule,
				field: nextField,
			}));
			fields[fieldIndex] = {
				...target,
				field: nextField,
				rules: updatedRules,
			};
			return { ...prev, fields };
		});
	};

	const updateFieldDescription = (fieldIndex: number, value: string) => {
		setScoreCard((prev) => {
			const fields = [...prev.fields];
			const target = fields[fieldIndex];
			if (!target) return prev;
			fields[fieldIndex] = { ...target, description: value };
			return { ...prev, fields };
		});
	};

	const updateRuleAt = (fieldIndex: number, ruleIndex: number, next: Rule) => {
		setScoreCard((prev) => {
			const fields = [...prev.fields];
			const target = fields[fieldIndex];
			if (!target) return prev;
			const rules = [...(target.rules ?? [])];
			rules[ruleIndex] = { ...next, field: target.field };
			fields[fieldIndex] = { ...target, rules };
			return { ...prev, fields };
		});
	};

	const removeRuleAt = (fieldIndex: number, ruleIndex: number) => {
		setScoreCard((prev) => {
			const fields = [...prev.fields];
			const target = fields[fieldIndex];
			if (!target) return prev;
			const rules = (target.rules ?? []).filter((_, i) => i !== ruleIndex);
			fields[fieldIndex] = { ...target, rules };
			return { ...prev, fields };
		});
	};

	const addConditionToField = (fieldIndex: number) => {
		setScoreCard((prev) => {
			const fields = [...prev.fields];
			const target = fields[fieldIndex];
			if (!target) return prev;
			const rules = [...(target.rules ?? []), createRuleForField(target.field)];
			fields[fieldIndex] = { ...target, rules };
			return { ...prev, fields };
		});
	};

	const addField = () => {
		const field = newFieldName.trim();
		if (!field) return;
		setScoreCard((prev) => {
			if (prev.fields.some((f) => f.field === field)) return prev;
			return { ...prev, fields: [...prev.fields, createFieldGroup(field)] };
		});
		setNewFieldName("");
	};

	const removeFieldAt = (fieldIndex: number) => {
		setScoreCard((prev) => {
			const fields = prev.fields.filter((_, idx) => idx !== fieldIndex);
			return { ...prev, fields };
		});
	};

	const openTestModal = () => {
		setTestInputs((prev) => {
			const next: Record<string, string> = { ...prev };
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

	return (
		<>
			<section className="border rounded-lg p-5 space-y-4">
				<div className="flex items-center justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold">Credit Score Setup</h2>
						<div className="text-xs text-gray-600">
							Configure scorecards directly in this step.
						</div>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={openTestModal}
							className="bg-purple-600 text-white px-3 py-2 rounded text-sm"
						>
							Sample Calculation
						</button>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<label className="flex flex-col gap-1 text-sm">
						<InputInfoLabel
							label="Scorecard Name"
							info="Display name shown in scorecard selectors and setup screens."
						/>
						<input
							type="text"
							name="name"
							value={scoreCard.name}
							onChange={handleCardInfoChange}
							className="border px-2 py-2 rounded"
						/>
					</label>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<label className="flex flex-col gap-1 text-sm md:col-span-1">
						<InputInfoLabel
							label="Max Score"
							info="Upper cap applied to total score after rule evaluation."
						/>
						<input
							type="number"
							name="maxScore"
							value={scoreCard.maxScore}
							onChange={handleCardInfoChange}
							className="border px-2 py-2 rounded"
						/>
					</label>
				</div>

				<div className="border rounded p-4 space-y-3">
					<div>
						<h3 className="text-sm font-semibold">Risk Grade Definition</h3>
						<div className="text-xs text-gray-600">
							Set score thresholds for Low, Medium, and High risk.
						</div>
					</div>
					<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
						<label className="flex flex-col gap-1 text-sm">
							<InputInfoLabel
								label="Low Risk Minimum"
								info="Scores greater than or equal to this value are considered LOW risk."
							/>
							<input
								type="number"
								min={0}
								max={scoreCard.maxScore}
								value={riskThresholds.lowMin}
								onChange={(e) =>
									handleRiskThresholdChange("lowMin", e.target.value)
								}
								className="border px-2 py-2 rounded"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<InputInfoLabel
								label="Medium Risk Minimum"
								info="Scores greater than or equal to this value (but below Low minimum) are MEDIUM risk."
							/>
							<input
								type="number"
								min={0}
								max={scoreCard.maxScore}
								value={riskThresholds.mediumMin}
								onChange={(e) =>
									handleRiskThresholdChange("mediumMin", e.target.value)
								}
								className="border px-2 py-2 rounded"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<InputInfoLabel
								label="High Risk Minimum"
								info="Scores greater than or equal to this value (but below Medium minimum) are HIGH risk."
							/>
							<input
								type="number"
								min={0}
								max={scoreCard.maxScore}
								value={riskThresholds.highMin}
								onChange={(e) =>
									handleRiskThresholdChange("highMin", e.target.value)
								}
								className="border px-2 py-2 rounded"
							/>
						</label>
					</div>
					<div className="text-xs text-gray-600">
						Effective thresholds: LOW ≥ {normalizedRiskThresholds.lowMin}, MEDIUM ≥ {normalizedRiskThresholds.mediumMin}, HIGH ≥ {normalizedRiskThresholds.highMin}
					</div>
				</div>
			</section>

			<section className="border rounded-lg p-5 space-y-4">
				<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
					<div>
						<h3 className="text-base font-semibold">Scorecard Rules</h3>
						<div className="text-xs text-gray-600">
							Rules are grouped by field. Add conditions for each field.
						</div>
					</div>
					<div className="flex gap-2">
						<div className="space-y-1 min-w-64">
							<InputInfoLabel
								label="New Field"
								info="Create a new score input field, for example age, income, or loanAmount."
							/>
							<input
								type="text"
								value={newFieldName}
								onChange={(e: ChangeEvent<HTMLInputElement>) =>
									setNewFieldName(e.target.value)
								}
								placeholder="Add a field (e.g., loanAmount)"
								className="border px-2 py-2 rounded text-sm w-full"
							/>
						</div>
						<button
							onClick={addField}
							type="button"
							className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
						>
							Add field
						</button>
					</div>
				</div>

				<div className="space-y-4">
					{scoreCard.fields.map((fieldGroup, fieldIndex) => (
						<div
							key={`${fieldGroup.field}-${fieldIndex}`}
							className="border rounded p-3"
						>
							<div className="flex items-center justify-between mb-2 gap-3">
								<div className="flex flex-col">
									<span className="font-semibold">
										{fieldGroup.description ||
											humanizeFieldName(fieldGroup.field)}
									</span>
									<span className="text-xs text-gray-600">
										{fieldGroup.field}
									</span>
								</div>
								<div className="flex gap-2">
									<button
										onClick={() => addConditionToField(fieldIndex)}
										type="button"
										className="flex items-center gap-1 text-sm border px-2 py-1 rounded hover:bg-gray-50"
									>
										<Plus className="w-4 h-4" />
										Add Condition
									</button>
									<button
										onClick={() => removeFieldAt(fieldIndex)}
										type="button"
										className="flex items-center gap-1 text-sm border px-2 py-1 rounded text-red-600 hover:bg-red-50"
									>
										<Trash2 className="w-4 h-4" />
										Remove Field
									</button>
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-sm">
								<label className="flex flex-col gap-1">
									<InputInfoLabel
										label="Field Name"
										info="Machine key used by the score engine; keep it stable once used in production."
									/>
									<input
										type="text"
										value={fieldGroup.field}
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
											updateFieldName(fieldIndex, e.target.value)
										}
										className="border px-2 py-1 rounded"
									/>
								</label>
								<label className="flex flex-col gap-1">
									<InputInfoLabel
										label="Field Description"
										info="Human-readable label shown to users when entering score input values."
									/>
									<input
										type="text"
										value={fieldGroup.description}
										onChange={(e: ChangeEvent<HTMLInputElement>) =>
											updateFieldDescription(fieldIndex, e.target.value)
										}
										className="border px-2 py-1 rounded"
									/>
								</label>
							</div>

							<div className="overflow-x-auto border rounded">
								<table className="w-full text-sm border-collapse">
									<thead>
										<tr className="border-b bg-gray-50 text-left text-gray-600">
											<th className="px-3 py-2">Operator</th>
											<th className="px-3 py-2">Value</th>
											<th className="px-3 py-2">Score</th>
											<th className="px-3 py-2 text-right">Action</th>
										</tr>
									</thead>
									<tbody>
										{(fieldGroup.rules ?? []).map((rule, ruleIndex) => (
											<tr
												key={`${fieldGroup.field}-${ruleIndex}`}
												className="border-b last:border-b-0 align-top"
											>
												<td className="px-3 py-2 min-w-36">
													<select
														value={rule.operator}
														onChange={(e: ChangeEvent<HTMLSelectElement>) =>
															updateRuleAt(fieldIndex, ruleIndex, {
																...rule,
																operator: e.target.value as Operator,
															})
														}
														className="border px-2 py-1 rounded text-sm w-full"
													>
														{operatorOptions.map((op) => (
															<option key={op} value={op}>
																{op}
															</option>
														))}
													</select>
												</td>
												<td className="px-3 py-2 min-w-52">
													<input
														type="text"
														placeholder={operatorPlaceholder(rule.operator)}
														value={rule.value}
														onChange={(e: ChangeEvent<HTMLInputElement>) =>
															updateRuleAt(fieldIndex, ruleIndex, {
																...rule,
																value: e.target.value,
															})
														}
														className="border px-2 py-1 rounded text-sm w-full"
													/>
													{["between", "in", "notin"].includes(rule.operator) ? (
														<div className="text-xs text-gray-600 mt-1">
															{rule.operator === "between" &&
																"Use two values separated by comma: min,max"}
															{rule.operator === "in" &&
																"Comma-separated allowed values"}
															{rule.operator === "notin" &&
																"Comma-separated blocked values"}
														</div>
													) : null}
												</td>
												<td className="px-3 py-2 min-w-32">
													<input
														type="number"
														placeholder="Score"
														value={rule.score}
														onChange={(e: ChangeEvent<HTMLInputElement>) =>
															updateRuleAt(fieldIndex, ruleIndex, {
																...rule,
																score: Number(e.target.value),
															})
														}
														className="border px-2 py-1 rounded text-sm w-full"
													/>
												</td>
												<td className="px-3 py-2 text-right">
													<button
														onClick={() => removeRuleAt(fieldIndex, ruleIndex)}
														type="button"
														className="text-red-500 hover:text-red-700"
													>
														<Trash2 className="w-4 h-4" />
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					))}
				</div>
			</section>

			<section className="border rounded-lg p-5 space-y-4">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-lg font-semibold">Bureau</h2>
						<div className="text-xs text-gray-600">
							Configure credit bureau integration settings.
						</div>
					</div>
					<label className="flex items-center gap-2 text-sm">
						<span>Bureau check required</span>
						<input
							type="checkbox"
							className="h-4 w-4"
							checked={bureauRequired}
							onChange={(e) => setBureauRequired(e.target.checked)}
						/>
					</label>
				</div>

				{bureauRequired ? (
					<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
						<label className="flex flex-col gap-1 text-sm">
							<InputInfoLabel
								label="Bureau Provider"
								info="Name of the provider used for credit bureau checks."
							/>
							<input
								type="text"
								name="bureauProvider"
								value={bureauProvider}
								onChange={(e) => setBureauProvider(e.target.value)}
								className="border px-2 py-2 rounded"
								placeholder="e.g., MMCB"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<InputInfoLabel
								label="Bureau Purpose"
								info="Reason provided for why a bureau check is performed."
							/>
							<input
								type="text"
								name="bureauPurpose"
								value={bureauPurpose}
								onChange={(e) => setBureauPurpose(e.target.value)}
								className="border px-2 py-2 rounded"
								placeholder="e.g., Credit assessment"
							/>
						</label>
						<label className="flex flex-col gap-2 text-sm">
							<InputInfoLabel
								label="Consent Required"
								info="Require borrower consent before running bureau checks."
							/>
							<input
								type="checkbox"
								className="h-4 w-4"
								checked={bureauConsentRequired}
								onChange={(e) => setBureauConsentRequired(e.target.checked)}
							/>
						</label>
					</div>
				) : null}
			</section>

			{isTestOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<button
						type="button"
						className="absolute inset-0 bg-black/40"
						onClick={closeTestModal}
						aria-label="Close modal"
					/>
					<div className="relative w-full max-w-3xl mx-4 rounded bg-white shadow-lg border">
						<div className="flex items-center justify-between p-4 border-b">
							<div>
								<div className="text-lg font-semibold">Sample Calculation</div>
								<div className="text-xs text-gray-600">
									Enter only the fields configured in this scorecard.
								</div>
							</div>
							<button
								type="button"
								onClick={closeTestModal}
								className="p-2 rounded hover:bg-gray-100"
								aria-label="Close"
							>
								<X className="w-4 h-4" />
							</button>
						</div>

						<div className="p-4 space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{scoreCard.fields.map((fieldGroup) => {
									const kind = inferFieldKind(fieldGroup.rules ?? []);
									const inputId = `test-${fieldGroup.field}`;
									const label =
										fieldGroup.description || humanizeFieldName(fieldGroup.field);
									return (
										<div key={fieldGroup.field} className="flex flex-col gap-1 text-sm">
											<label htmlFor={inputId} className="font-medium">
												{label}
											</label>
											{kind === "boolean" ? (
												<select
													id={inputId}
													value={testInputs[fieldGroup.field] ?? ""}
													onChange={(e: ChangeEvent<HTMLSelectElement>) =>
														setTestInputs((prev) => ({
															...prev,
															[fieldGroup.field]: e.target.value,
														}))
													}
													className="border px-2 py-1 rounded"
												>
													<option value="">(not set)</option>
													<option value="true">true</option>
													<option value="false">false</option>
												</select>
											) : (
												<input
													type={kind === "number" ? "number" : "text"}
													id={inputId}
													value={testInputs[fieldGroup.field] ?? ""}
													onChange={(e: ChangeEvent<HTMLInputElement>) =>
														setTestInputs((prev) => ({
															...prev,
															[fieldGroup.field]: e.target.value,
														}))
													}
													className="border px-2 py-1 rounded"
													placeholder={
														(fieldGroup.rules ?? []).some(
															(rule) => rule.operator === "between",
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

							<div className="flex items-center gap-2">
								<button
									onClick={runTest}
									type="button"
									className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
								>
									Run Test
								</button>
								<button
									onClick={() => {
										setTestInputs({});
										setTestResult(null);
									}}
									type="button"
									className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
								>
									Clear Inputs
								</button>
							</div>


							{testResult && (
								<div className="border rounded p-3 bg-gray-50">
									<div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
										<div>
											<span className="font-semibold">Score:</span>{" "}
											{testResult.totalScore} / {testResult.maxScore} —{" "}
											{effectiveRiskGrade ?? testResult.riskGrade}
										</div>
										<div>
											<span className="font-semibold">Matched rules:</span>{" "}
											{testResult.matchedRules} / {allRules.length}
										</div>
									</div>

									<div className="mt-3 space-y-1">
										{testResult.breakdown.map((b, idx) => {
											let rowClass = "text-gray-700";
											if (b.skippedBecauseMissingInput) {
												rowClass = "text-gray-400";
											} else if (b.matched) {
												rowClass = "text-green-700";
											}
											const label =
												b.fieldDescription || humanizeFieldName(b.field);
											return (
												<div
													key={`${b.field}-${idx}`}
													className={`flex justify-between gap-3 text-sm ${rowClass}`}
												>
													<span>
														{label} {b.operator} {b.value}
														{b.skippedBecauseMissingInput
															? " (skipped: no input)"
															: ""}
													</span>
													<span>{b.matched ? `+${b.score}` : "0"}</span>
												</div>
											);
										})}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
