import { useState } from "react";
import { RISK_GRADES, type RiskGrade } from "@/lib/scorecard-engine";

export const DECISION_RULE_ACTIONS = [
	"AUTO_APPROVE",
	"MANUAL_REVIEW",
	"AUTO_REJECT",
] as const;

export type DecisionRuleAction = (typeof DECISION_RULE_ACTIONS)[number];

export type DecisionRuleByGrade = Record<RiskGrade, DecisionRuleAction>;

export const createDefaultDecisionRules = (): DecisionRuleByGrade => ({
	LOW: "AUTO_APPROVE",
	MEDIUM: "MANUAL_REVIEW",
	HIGH: "AUTO_REJECT",
});

export type DecisionConditionOperator =
	| "="
	| "!="
	| ">"
	| ">="
	| "<"
	| "<="
	| "IN";

export type DecisionRuleCondition = {
	id: string;
	keyField: string;
	operator: DecisionConditionOperator;
	value: string;
};

export type DecisionRuleItem = {
	id: string;
	name: string;
	outcome: DecisionRuleAction;
	conditions: DecisionRuleCondition[];
};

export type DecisionRuleSetupState = {
	decisionRules: DecisionRuleByGrade;
	rules: DecisionRuleItem[];
};

type DecisionRuleSetupTabProps = {
	state: DecisionRuleSetupState;
	onStateChange: (state: DecisionRuleSetupState) => void;
};

const decisionActionLabel: Record<DecisionRuleAction, string> = {
	AUTO_APPROVE: "Auto Approve",
	MANUAL_REVIEW: "Manual Review",
	AUTO_REJECT: "Auto Reject",
};

const decisionActionTagClass: Record<DecisionRuleAction, string> = {
	AUTO_APPROVE: "border border-emerald-200 bg-emerald-50 text-emerald-700",
	MANUAL_REVIEW: "border border-amber-200 bg-amber-50 text-amber-700",
	AUTO_REJECT: "border border-rose-200 bg-rose-50 text-rose-700",
};

const decisionOperators: DecisionConditionOperator[] = [
	"=",
	"!=",
	">",
	">=",
	"<",
	"<=",
	"IN",
];

const createId = () =>
	typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2);

const createCondition = (
	keyField = "",
	operator: DecisionConditionOperator = "=",
	value = "",
): DecisionRuleCondition => ({
	id: createId(),
	keyField,
	operator,
	value,
});

const createDecisionRule = (
	name: string,
	outcome: DecisionRuleAction,
	conditions: DecisionRuleCondition[],
): DecisionRuleItem => ({
	id: createId(),
	name,
	outcome,
	conditions,
});

const createDefaultRuleItems = (
	decisionRules: DecisionRuleByGrade,
): DecisionRuleItem[] =>
	RISK_GRADES.map((grade) =>
		createDecisionRule(`${grade} Risk Rule`, decisionRules[grade], [
			createCondition("riskGrade", "=", grade),
		]),
	);

export const createDefaultDecisionRuleSetup = (
	decisionRules: DecisionRuleByGrade = createDefaultDecisionRules(),
): DecisionRuleSetupState => ({
	decisionRules,
	rules: createDefaultRuleItems(decisionRules),
});

function DecisionActionTag({
	action,
}: Readonly<{ action: DecisionRuleAction }>) {
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${decisionActionTagClass[action]}`}
		>
			{decisionActionLabel[action]}
		</span>
	);
}

export function DecisionRuleSetupTab({
	state,
	onStateChange,
}: Readonly<DecisionRuleSetupTabProps>) {
	const [draftName, setDraftName] = useState("Custom Decision Rule");
	const [draftOutcome, setDraftOutcome] =
		useState<DecisionRuleAction>("MANUAL_REVIEW");
	const [draftConditions, setDraftConditions] = useState<
		DecisionRuleCondition[]
	>([createCondition("", "=", "")]);
	const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

	const updateDraftCondition = (
		conditionId: string,
		field: "keyField" | "operator" | "value",
		value: string,
	) => {
		setDraftConditions((current) =>
			current.map((condition) =>
				condition.id === conditionId
					? {
							...condition,
							[field]:
								field === "operator"
									? (value as DecisionConditionOperator)
									: value,
						}
					: condition,
			),
		);
	};

	const addDraftCondition = () => {
		setDraftConditions((current) => [...current, createCondition("", "=", "")]);
	};

	const removeDraftCondition = (conditionId: string) => {
		setDraftConditions((current) =>
			current.length === 1
				? current
				: current.filter((condition) => condition.id !== conditionId),
		);
	};

	const resetDraftRule = () => {
		setDraftName("Custom Decision Rule");
		setDraftOutcome("MANUAL_REVIEW");
		setDraftConditions([createCondition("", "=", "")]);
		setEditingRuleId(null);
	};

	const editRule = (ruleId: string) => {
		const target = rules.find((rule) => rule.id === ruleId);
		if (!target) return;
		setDraftName(target.name);
		setDraftOutcome(target.outcome);
		setDraftConditions(
			target.conditions.map((condition) => ({ ...condition })),
		);
		setEditingRuleId(ruleId);
	};

	const removeRule = (ruleId: string) => {
		onStateChange({
			...state,
			rules: state.rules.filter((rule) => rule.id !== ruleId),
		});
		if (editingRuleId === ruleId) {
			resetDraftRule();
		}
	};

	const isDraftRuleValid =
		draftName.trim().length > 0 &&
		draftConditions.length > 0 &&
		draftConditions.every(
			(condition) =>
				condition.keyField.trim().length > 0 &&
				condition.value.trim().length > 0,
		);

	const submitRule = () => {
		if (!isDraftRuleValid) return;
		const nextRule: DecisionRuleItem = createDecisionRule(
			draftName.trim(),
			draftOutcome,
			draftConditions.map((condition) => ({
				...condition,
				keyField: condition.keyField.trim(),
				value: condition.value.trim(),
			})),
		);

		if (editingRuleId) {
			onStateChange({
				...state,
				rules: state.rules.map((rule) =>
					rule.id === editingRuleId ? { ...nextRule, id: editingRuleId } : rule,
				),
			});
		} else {
			onStateChange({
				...state,
				rules: [...state.rules, nextRule],
			});
		}

		resetDraftRule();
	};

	return (
		<section className="border rounded-lg p-5 space-y-5">
			<div className="flex items-center justify-between gap-2">
				<div className="text-sm font-semibold">Conditional decision rules</div>
				<span className="text-xs text-gray-600">{state.rules.length} rule(s)</span>
			</div>

			<div className="grid grid-cols-1 gap-3 md:grid-cols-2">
				<label className="flex flex-col gap-1 text-sm">
					<span>Rule name</span>
					<input
						type="text"
						value={draftName}
						onChange={(event) => setDraftName(event.target.value)}
						className="border rounded px-2 py-2"
						placeholder="e.g. Strong profile auto-approve"
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span className="flex items-center gap-2">
						<span>Result</span>
						<DecisionActionTag action={draftOutcome} />
					</span>
					<select
						value={draftOutcome}
						onChange={(event) =>
							setDraftOutcome(event.target.value as DecisionRuleAction)
						}
						className="border rounded px-2 py-2"
					>
						{DECISION_RULE_ACTIONS.map((action) => (
							<option key={action} value={action}>
								{decisionActionLabel[action]}
							</option>
						))}
					</select>
				</label>
			</div>

			<div className="space-y-2">
				<div className="text-xs text-gray-600">
					Add conditions using key fields such as creditScore, riskGrade,
					income, or bureauScore.
				</div>
				{draftConditions.map((condition) => (
					<div
						key={condition.id}
						className="grid grid-cols-1 gap-2 rounded border p-3 md:grid-cols-[1.2fr_0.8fr_1fr_auto]"
					>
						<input
							type="text"
							value={condition.keyField}
							onChange={(event) =>
								updateDraftCondition(
									condition.id,
									"keyField",
									event.target.value,
								)
							}
							className="border rounded px-2 py-2 text-sm"
							placeholder="Key field (e.g. creditScore)"
						/>
						<select
							value={condition.operator}
							onChange={(event) =>
								updateDraftCondition(
									condition.id,
									"operator",
									event.target.value,
								)
							}
							className="border rounded px-2 py-2 text-sm"
						>
							{decisionOperators.map((operator) => (
								<option key={operator} value={operator}>
									{operator}
								</option>
							))}
						</select>
						<input
							type="text"
							value={condition.value}
							onChange={(event) =>
								updateDraftCondition(condition.id, "value", event.target.value)
							}
							className="border rounded px-2 py-2 text-sm"
							placeholder="Condition value"
						/>
						<button
							type="button"
							onClick={() => removeDraftCondition(condition.id)}
							className="border rounded px-3 py-2 text-xs hover:bg-gray-50"
						>
							Remove
						</button>
					</div>
				))}
			</div>

			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					onClick={addDraftCondition}
					className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
				>
					Add condition
				</button>
				<button
					type="button"
					onClick={submitRule}
					disabled={!isDraftRuleValid}
					className={`rounded px-4 py-2 text-sm text-white ${isDraftRuleValid ? "bg-slate-900 hover:bg-slate-800" : "bg-gray-400 cursor-not-allowed"}`}
				>
					{editingRuleId ? "Save rule" : "Add rule"}
				</button>
				{editingRuleId ? (
					<button
						type="button"
						onClick={resetDraftRule}
						className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
					>
						Cancel edit
					</button>
				) : null}
			</div>

			{state.rules.length === 0 ? (
				<div className="text-xs text-gray-600">No configured rules yet.</div>
			) : (
				<div className="space-y-3 border rounded-lg bg-gray-50 p-3">
					<div className="text-sm font-semibold">Configured rules</div>
					{state.rules.map((rule) => (
						<div key={rule.id} className="rounded border bg-white p-3">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<div>
									<div className="text-sm font-semibold">{rule.name}</div>
									<div className="mt-1">
										<DecisionActionTag action={rule.outcome} />
									</div>
								</div>
								<div className="flex gap-2">
									<button
										type="button"
										onClick={() => editRule(rule.id)}
										className="border rounded px-3 py-1 text-xs hover:bg-gray-50"
									>
										Edit
									</button>
									<button
										type="button"
										onClick={() => removeRule(rule.id)}
										className="border rounded px-3 py-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
									>
										Remove
									</button>
								</div>
							</div>
							<div className="mt-2 space-y-1 text-xs text-gray-700">
								{rule.conditions.map((condition) => (
									<div key={condition.id} className="rounded border px-2 py-1">
										{condition.keyField} {condition.operator} {condition.value}
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			)}

			<div className="text-xs text-gray-600">
				Rules support flexible fields and conditions; use key fields like
				creditScore and riskGrade to build your decisioning criteria.
			</div>
		</section>
	);
}
