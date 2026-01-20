import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, X } from "lucide-react";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import {
	evaluateScoreCard,
	inferFieldKind,
	type ScoreEngineResult,
} from "../../lib/scorecard-engine";
import {
	type Operator,
	operatorOptions,
	type Rule,
	type ScoreCard,
	type ScoreCardField,
	useScoreCardStore,
} from "../../lib/scorecard-store";

export const Route = createFileRoute("/loan/scorecard-setup")({
	component: ScorecardSetupComponent,
});

const humanizeFieldName = (field: string): string => {
	return field
		.replace(/[_-]+/g, " ")
		.replace(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replace(/\s+/g, " ")
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
	bureauProvider: "Experian",
	bureauPurpose: "Credit assessment",
	bureauConsentRequired: true,
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

const rulesPlaceholder = (rules: Rule[] | undefined): string => {
	if (rules?.some((r) => r.operator === "between")) {
		return "For between: min,max (e.g. 25,45)";
	}
	if (rules?.some((r) => r.operator === "in" || r.operator === "notin")) {
		return "For in/notin: comma list (e.g. gold,silver)";
	}
	if (rules?.some((r) => r.operator === "contains")) {
		return "Substring to match";
	}
	return "";
};

const withBureauDefaults = (card: ScoreCard): ScoreCard => ({
	...card,
	bureauProvider: card.bureauProvider ?? "Experian",
	bureauPurpose: card.bureauPurpose ?? "Credit assessment",
	bureauConsentRequired: card.bureauConsentRequired ?? true,
});

function ScorecardSetupComponent() {
	const scoreCards = useScoreCardStore((s) => s.scoreCards);
	const selectedScoreCardId = useScoreCardStore((s) => s.selectedScoreCardId);
	const selectScoreCard = useScoreCardStore((s) => s.selectScoreCard);
	const upsertScoreCard = useScoreCardStore((s) => s.upsertScoreCard);
	const removeScoreCard = useScoreCardStore((s) => s.removeScoreCard);

	const selectedFromStore = scoreCards[selectedScoreCardId];

	const [scoreCard, setScoreCard] = useState<ScoreCard>(
		selectedFromStore
			? withBureauDefaults({
					...selectedFromStore,
					fields: selectedFromStore.fields ?? [],
				})
			: createEmptyScoreCard(),
	);
	const [newFieldName, setNewFieldName] = useState("");
	const [isTestOpen, setIsTestOpen] = useState(false);
	const [testInputs, setTestInputs] = useState<Record<string, string>>({});
	const [testResult, setTestResult] = useState<ScoreEngineResult | null>(null);

	const allRules = useMemo(() => {
		return scoreCard.fields.flatMap((f) => f.rules ?? []);
	}, [scoreCard.fields]);

	useEffect(() => {
		if (!selectedFromStore) return;
		setScoreCard(
			withBureauDefaults({
				...selectedFromStore,
				fields: selectedFromStore.fields ?? [],
			}),
		);
	}, [selectedFromStore]);

	const handleCardInfoChange = (e: ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setScoreCard((prev) => {
			if (name === "maxScore") {
				return { ...prev, maxScore: Number(value) };
			}
			if (name === "scoreCardId") {
				return { ...prev, scoreCardId: value };
			}
			if (name === "name") {
				return { ...prev, name: value };
			}
			if (name === "bureauProvider") {
				return { ...prev, bureauProvider: value };
			}
			if (name === "bureauPurpose") {
				return { ...prev, bureauPurpose: value };
			}
			return prev;
		});
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
			fields[fieldIndex] = { ...target, field: nextField, rules: updatedRules };
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

	const navigate = useNavigate();
	const onSave = () => {
		upsertScoreCard(scoreCard, { select: true });
		navigate({ to: "/" });
	};

	const onSaveAsNew = () => {
		const next: ScoreCard = {
			...scoreCard,
			scoreCardId: generateScoreCardId(),
			name: scoreCard.name.trim() ? `${scoreCard.name} (copy)` : "New Scorecard",
		};
		setScoreCard(next);
		upsertScoreCard(next, { select: true });
	};

	const onNewScoreCard = () => {
		const next = createEmptyScoreCard();
		setScoreCard(next);
		setNewFieldName("");
		setTestInputs({});
		setTestResult(null);
	};

	const onDeleteSelected = () => {
		removeScoreCard(selectedScoreCardId);
	};

	const scoreCardList = useMemo(() => {
		return Object.values(scoreCards).sort((a, b) =>
			(a.name || a.scoreCardId).localeCompare(b.name || b.scoreCardId),
		);
	}, [scoreCards]);

	return (
		<div className="p-6 font-sans max-w-4xl mx-auto">
			<div className="flex items-center justify-between mb-4 gap-3">
				<h1 className="text-2xl font-bold">Scorecard Engine Setup</h1>
				<div className="flex gap-2">
					<Link
						to="/loan/scorecards"
						className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
					>
						View Scorecards
					</Link>
					<Link
						to="/loan/setup"
						className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
					>
						Back to Loan Setup
					</Link>
				</div>
			</div>

			<section className="border p-4 rounded mb-6 bg-white">
				<h2 className="font-semibold text-lg mb-3">Saved Scorecards</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
					<label className="flex flex-col gap-1 text-sm">
						<span>Choose Scorecard</span>
						<select
							value={selectedScoreCardId}
							onChange={(e: ChangeEvent<HTMLSelectElement>) =>
								selectScoreCard(e.target.value)
							}
							className="border px-2 py-1 rounded"
						>
							{scoreCardList.map((c) => (
								<option key={c.scoreCardId} value={c.scoreCardId}>
									{c.name || c.scoreCardId}
								</option>
							))}
						</select>
					</label>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onSave}
							className="border px-3 py-2 rounded text-sm hover:bg-gray-50"
						>
              Create
						</button>
						<button
							type="button"
							onClick={onDeleteSelected}
							className="border px-3 py-2 rounded text-sm text-red-600 hover:bg-red-50"
							title="Delete selected scorecard"
						>
							Delete
						</button>
					</div>
				</div>
				<div className="mt-2 text-xs text-gray-600">
					Save updates to overwrite the selected scorecard, or use “Save as New”
					to create another.
				</div>
			</section>

			{/* Scorecard Metadata */}
			<section className="border p-4 rounded mb-6 bg-white">
				<h2 className="font-semibold text-lg mb-3">Scorecard Details</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<label className="flex flex-col gap-1 text-sm">
						<span>Scorecard ID</span>
						<input
							type="text"
							name="scoreCardId"
							value={scoreCard.scoreCardId}
							onChange={handleCardInfoChange}
							className="border px-2 py-1 rounded"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Scorecard Name</span>
						<input
							type="text"
							name="name"
							value={scoreCard.name}
							onChange={handleCardInfoChange}
							className="border px-2 py-1 rounded"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Max Score</span>
						<input
							type="number"
							name="maxScore"
							value={scoreCard.maxScore}
							onChange={handleCardInfoChange}
							className="border px-2 py-1 rounded"
						/>
					</label>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
					<label className="flex flex-col gap-1 text-sm">
						<span>Bureau provider</span>
						<input
							type="text"
							name="bureauProvider"
							value={scoreCard.bureauProvider ?? ""}
							onChange={handleCardInfoChange}
							className="border px-2 py-1 rounded"
							placeholder="e.g., Experian"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Bureau purpose</span>
						<input
							type="text"
							name="bureauPurpose"
							value={scoreCard.bureauPurpose ?? ""}
							onChange={handleCardInfoChange}
							className="border px-2 py-1 rounded"
							placeholder="e.g., Credit assessment"
						/>
					</label>
					<label className="flex flex-col gap-2 text-sm">
						<span>Bureau consent required</span>
						<div className="flex items-center gap-2">
							<input
								type="checkbox"
								className="h-4 w-4"
								checked={Boolean(scoreCard.bureauConsentRequired)}
								onChange={(e) =>
									setScoreCard((prev) => ({
										...prev,
										bureauConsentRequired: e.target.checked,
									}))
								}
							/>
							<span className="text-xs text-gray-700">
								Indicates whether beneficiary consent must be captured before
								bureau pulls.
							</span>
						</div>
					</label>
				</div>
			</section>

			{/* Rules Editor */}
			<section className="border p-4 rounded mb-6 bg-white">
				<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4">
					<div>
						<h2 className="font-semibold text-lg">Rules</h2>
						<div className="text-xs text-gray-600">
							Rules are grouped by field; each field can have multiple
							conditions. For operators <em>between</em>, use two values separated by a
							comma (min,max). For <em>in</em>/<em>notin</em>, provide a comma-separated list.
						</div>
					</div>
					<div className="flex gap-2">
						<input
							type="text"
							value={newFieldName}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								setNewFieldName(e.target.value)
							}
							placeholder="Add a field (e.g., loanAmount)"
							className="border px-2 py-1 rounded text-sm"
						/>
						<button
							onClick={addField}
							type="button"
							className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
						>
							Add Field
						</button>
					</div>
				</div>

				<div className="space-y-4">
					{scoreCard.fields.map((fieldGroup, fieldIndex) => (
						<div key={`${fieldGroup.field}-${fieldIndex}`} className="border rounded p-3">
							<div className="flex items-center justify-between mb-2 gap-3">
								<div className="flex flex-col">
									<span className="font-semibold">{fieldGroup.description || humanizeFieldName(fieldGroup.field)}</span>
									<span className="text-xs text-gray-600">{fieldGroup.field}</span>
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
									<span>Field name</span>
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
									<span>Field description</span>
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

							<div className="space-y-2">
								{(fieldGroup.rules ?? []).map((rule, ruleIndex) => (
									<div
										key={`${fieldGroup.field}-${ruleIndex}`}
										className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center"
									>
										<select
											value={rule.operator}
											onChange={(e: ChangeEvent<HTMLSelectElement>) =>
												updateRuleAt(fieldIndex, ruleIndex, {
													...rule,
													operator: e.target.value as Operator,
												})
											}
											className="border px-2 py-1 rounded text-sm"
										>
											{operatorOptions.map((op) => (
												<option key={op} value={op}>
													{op}
												</option>
											))}
										</select>
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
											className="border px-2 py-1 rounded text-sm"
										/>
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
											className="border px-2 py-1 rounded text-sm"
										/>
										<button
											onClick={() => removeRuleAt(fieldIndex, ruleIndex)}
											type="button"
											className="text-red-500 hover:text-red-700 justify-self-end"
										>
											<Trash2 className="w-4 h-4" />
										</button>
										{["between", "in", "notin"].includes(rule.operator) ? (
											<div className="text-xs text-gray-600 md:col-span-4">
												{rule.operator === "between" && "Use two values separated by a comma: min,max (numbers)."}
												{rule.operator === "in" &&
													"Comma-separated list of allowed values (trim spaces)."}
												{rule.operator === "notin" &&
													"Comma-separated list of blocked values (trim spaces)."}
											</div>
										) : null}
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			</section>

			{/* JSON Preview */}
			<section className="border p-4 rounded bg-gray-50">
				<div className="flex items-center justify-between mb-2">
					<h2 className="font-semibold text-lg">Live JSON Output</h2>
					<div className="flex gap-2">
						{/* <button
							onClick={onSave}
							type="button"
							className="bg-emerald-600 text-white px-3 py-1 rounded text-sm flex items-center gap-2"
						>
							<Save className="w-4 h-4" />
							Save
						</button> */}
						<button
							onClick={openTestModal}
							type="button"
							className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
						>
							Test Score Engine
						</button>
					</div>
				</div>
				<pre className="bg-gray-900 text-white p-4 rounded text-sm overflow-x-auto">
					{JSON.stringify(scoreCard, null, 2)}
				</pre>
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
								<div className="text-lg font-semibold">Test Score Engine</div>
								<div className="text-xs text-gray-600">
									Enter only the fields you configured in this scorecard.
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
									const label = fieldGroup.description || humanizeFieldName(fieldGroup.field);
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
														(fieldGroup.rules ?? []).some((rule) => rule.operator === "between")
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
											{testResult.riskGrade}
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
											const label = b.fieldDescription || humanizeFieldName(b.field);
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
		</div>
	);
}
