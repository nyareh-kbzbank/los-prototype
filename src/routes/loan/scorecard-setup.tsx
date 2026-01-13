import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Save, Trash2, X } from "lucide-react";
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
	useScoreCardStore,
} from "../../lib/scorecard-store";

export const Route = createFileRoute("/loan/scorecard-setup")({
	component: ScorecardSetupComponent,
});

type GroupedRules = Record<string, Array<{ rule: Rule; ruleIndex: number }>>;

const createRuleForField = (field: string): Rule => ({
	field,
	operator: ">=",
	value: "",
	score: 0,
});

const generateScoreCardId = () =>
	globalThis.crypto?.randomUUID?.() ?? `scorecard_${Date.now()}`;

function ScorecardSetupComponent() {
	const scoreCards = useScoreCardStore((s) => s.scoreCards);
	const selectedScoreCardId = useScoreCardStore((s) => s.selectedScoreCardId);
	const selectScoreCard = useScoreCardStore((s) => s.selectScoreCard);
	const upsertScoreCard = useScoreCardStore((s) => s.upsertScoreCard);
	const removeScoreCard = useScoreCardStore((s) => s.removeScoreCard);

	const selectedFromStore = scoreCards[selectedScoreCardId];

	const [scoreCard, setScoreCard] = useState<ScoreCard>({
		...(selectedFromStore ?? {
			scoreCardId: generateScoreCardId(),
			name: "New Scorecard",
			maxScore: 100,
			rules: [],
		}),
		rules: selectedFromStore?.rules ?? [],
	});
	const [newFieldName, setNewFieldName] = useState("");
	const [isTestOpen, setIsTestOpen] = useState(false);
	const [testInputs, setTestInputs] = useState<Record<string, string>>({});
	const [testResult, setTestResult] = useState<ScoreEngineResult | null>(null);

	const groupedRules = useMemo<GroupedRules>(() => {
		return scoreCard.rules.reduce<GroupedRules>((acc, rule, ruleIndex) => {
			const field = rule.field;
			if (!acc[field]) {
				acc[field] = [];
			}
			acc[field].push({ rule, ruleIndex });
			return acc;
		}, {});
	}, [scoreCard.rules]);

	useEffect(() => {
		if (!selectedFromStore) return;
		setScoreCard({ ...selectedFromStore, rules: selectedFromStore.rules });
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
			return prev;
		});
	};

	const updateRuleAtIndex = (ruleIndex: number, next: Rule) => {
		setScoreCard((prev) => {
			const rules = [...prev.rules];
			rules[ruleIndex] = next;
			return { ...prev, rules };
		});
	};

	const removeRuleAtIndex = (ruleIndex: number) => {
		setScoreCard((prev) => ({
			...prev,
			rules: prev.rules.filter((_, i) => i !== ruleIndex),
		}));
	};

	const addConditionToField = (field: string) => {
		setScoreCard((prev) => ({
			...prev,
			rules: [...prev.rules, createRuleForField(field)],
		}));
	};

	const addField = () => {
		const field = newFieldName.trim();
		if (!field) return;
		setScoreCard((prev) => {
			if (prev.rules.some((r) => r.field === field)) return prev;
			return { ...prev, rules: [...prev.rules, createRuleForField(field)] };
		});
		setNewFieldName("");
	};

	const openTestModal = () => {
		const fields = Object.keys(groupedRules);
		setTestInputs((prev) => {
			const next: Record<string, string> = { ...prev };
			for (const f of fields) {
				next[f] ??= "";
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

	const onSave = () => {
		upsertScoreCard(scoreCard, { select: true });
	};

	const onSaveAsNew = () => {
		const next: ScoreCard = {
			...scoreCard,
			scoreCardId: generateScoreCardId(),
			name: scoreCard.name.trim() ? `${scoreCard.name} (copy)` : "New Scorecard",
		};
		upsertScoreCard(next, { select: true });
		setScoreCard(next);
	};

	const onNewScoreCard = () => {
		const next: ScoreCard = {
			scoreCardId: generateScoreCardId(),
			name: "New Scorecard",
			maxScore: 100,
			rules: [],
		};
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
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold">Scorecard Engine Setup</h1>
				<Link
					to="/loan/setup"
					className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
				>
					Back to Loan Setup
				</Link>
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
							onClick={onNewScoreCard}
							className="border px-3 py-2 rounded text-sm hover:bg-gray-50"
						>
							New
						</button>
						<button
							type="button"
							onClick={onSaveAsNew}
							className="border px-3 py-2 rounded text-sm hover:bg-gray-50"
						>
							Save as New
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
			</section>

			{/* Rules Editor */}
			<section className="border p-4 rounded mb-6 bg-white">
				<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4">
					<div>
						<h2 className="font-semibold text-lg">Rules</h2>
						<div className="text-xs text-gray-600">
							Rules are grouped by field; each field can have multiple
							conditions.
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
					{Object.entries(groupedRules).map(([field, items]) => (
						<div key={field} className="border rounded p-3">
							<div className="flex items-center justify-between mb-2">
								<div className="font-semibold">{field}</div>
								<button
									onClick={() => addConditionToField(field)}
									type="button"
									className="flex items-center gap-1 text-sm border px-2 py-1 rounded hover:bg-gray-50"
								>
									<Plus className="w-4 h-4" />
									Add Condition
								</button>
							</div>

							<div className="space-y-2">
								{items.map(({ rule, ruleIndex }) => (
									<div
										key={`${field}-${ruleIndex}`}
										className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center"
									>
										<select
											value={rule.operator}
											onChange={(e: ChangeEvent<HTMLSelectElement>) =>
												updateRuleAtIndex(ruleIndex, {
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
											placeholder="Value"
											value={rule.value}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												updateRuleAtIndex(ruleIndex, {
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
												updateRuleAtIndex(ruleIndex, {
													...rule,
													score: Number(e.target.value),
												})
											}
											className="border px-2 py-1 rounded text-sm"
										/>
										<button
											onClick={() => removeRuleAtIndex(ruleIndex)}
											type="button"
											className="text-red-500 hover:text-red-700 justify-self-end"
										>
											<Trash2 className="w-4 h-4" />
										</button>
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
						<button
							onClick={onSave}
							type="button"
							className="bg-emerald-600 text-white px-3 py-1 rounded text-sm flex items-center gap-2"
						>
							<Save className="w-4 h-4" />
							Save
						</button>
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
								{Object.entries(groupedRules).map(([field, items]) => {
									const kind = inferFieldKind(items.map((i) => i.rule));
									const inputId = `test-${field}`;
									return (
										<div key={field} className="flex flex-col gap-1 text-sm">
											<label htmlFor={inputId} className="font-medium">
												{field}
											</label>
											{kind === "boolean" ? (
												<select
													id={inputId}
													value={testInputs[field] ?? ""}
													onChange={(e: ChangeEvent<HTMLSelectElement>) =>
														setTestInputs((prev) => ({
															...prev,
															[field]: e.target.value,
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
													value={testInputs[field] ?? ""}
													onChange={(e: ChangeEvent<HTMLInputElement>) =>
														setTestInputs((prev) => ({
															...prev,
															[field]: e.target.value,
														}))
													}
													className="border px-2 py-1 rounded"
													placeholder={
														items.some((i) => i.rule.operator === "between")
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
											{testResult.matchedRules} / {scoreCard.rules.length}
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
											return (
												<div
													key={`${b.field}-${idx}`}
													className={`flex justify-between gap-3 text-sm ${rowClass}`}
												>
													<span>
														{b.field} {b.operator} {b.value}
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
