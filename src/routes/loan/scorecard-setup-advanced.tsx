import { createFileRoute, Link } from "@tanstack/react-router";
import { type ChangeEvent, useMemo, useState } from "react";
import {
	evaluateScoreCardAdvanced,
	inferFieldKindAdvanced,
	type ScoreEngineAdvancedResult,
} from "@/lib/scorecard-engine-advanced";
import { useScoreCardStore } from "@/lib/scorecard-store";

export const Route = createFileRoute("/loan/scorecard-setup-advanced")({
	component: ScorecardSetupAdvancedComponent,
});

const humanizeFieldName = (field: string): string => {
	return field
		.replaceAll(/[_-]+/g, " ")
		.replaceAll(/([a-z0-9])([A-Z])/g, "$1 $2")
		.replaceAll(/\s+/g, " ")
		.trim()
		.replace(/^./, (c) => c.toUpperCase());
};

function ScorecardSetupAdvancedComponent() {
	const scoreCards = useScoreCardStore((s) => s.scoreCards);
	const selectedScoreCardId = useScoreCardStore((s) => s.selectedScoreCardId);
	const selectScoreCard = useScoreCardStore((s) => s.selectScoreCard);

	const scoreCardList = useMemo(() => {
		return Object.values(scoreCards).sort((a, b) =>
			(a.name || a.scoreCardId).localeCompare(b.name || b.scoreCardId),
		);
	}, [scoreCards]);

	const activeScoreCard = scoreCards[selectedScoreCardId] ?? scoreCardList[0] ?? null;
	const [testInputs, setTestInputs] = useState<Record<string, string>>({});
	const [testResult, setTestResult] = useState<ScoreEngineAdvancedResult | null>(null);

	const runAdvancedTest = () => {
		if (!activeScoreCard) return;
		setTestResult(evaluateScoreCardAdvanced(activeScoreCard, testInputs));
	};

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="flex items-center justify-between mb-4 gap-3">
				<div>
					<h1 className="text-2xl font-bold">Advanced Scorecard Setup</h1>
					<p className="text-sm text-gray-700">
						Separate setup for FICO weighting, technical scaling, credit utilization,
						and ECL calculations.
					</p>
				</div>
				<div className="flex gap-2">
					<Link
						to="/loan/scorecard-setup"
						className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
					>
						Open Original Setup
					</Link>
					<Link
						to="/loan/scorecards"
						className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
					>
						Back to Scorecards
					</Link>
				</div>
			</div>

			<section className="border p-4 rounded mb-6 bg-white">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
					<label className="flex flex-col gap-1 text-sm">
						<span>Scorecard</span>
						<select
							value={activeScoreCard?.scoreCardId ?? ""}
							onChange={(e: ChangeEvent<HTMLSelectElement>) =>
								selectScoreCard(e.target.value)
							}
							className="border px-2 py-1 rounded"
						>
							{scoreCardList.map((card) => (
								<option key={card.scoreCardId} value={card.scoreCardId}>
									{card.name || card.scoreCardId}
								</option>
							))}
						</select>
					</label>
					<div className="text-xs text-gray-600">
						Uses the same saved scorecards, but computes scores with the advanced
						formula engine only in this page.
					</div>
				</div>
			</section>

			{activeScoreCard ? (
				<section className="border p-4 rounded mb-6 bg-white">
					<h2 className="font-semibold text-lg mb-3">Test Inputs</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						{activeScoreCard.fields.map((fieldGroup) => {
							const kind = inferFieldKindAdvanced(fieldGroup.rules ?? []);
							const inputId = `advanced-${fieldGroup.field}`;
							return (
								<label
									key={fieldGroup.field}
									htmlFor={inputId}
									className="flex flex-col gap-1 text-sm"
								>
									<span>
										{fieldGroup.description || humanizeFieldName(fieldGroup.field)}
									</span>
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
											id={inputId}
											type={kind === "number" ? "number" : "text"}
											value={testInputs[fieldGroup.field] ?? ""}
											onChange={(e: ChangeEvent<HTMLInputElement>) =>
												setTestInputs((prev) => ({
													...prev,
													[fieldGroup.field]: e.target.value,
												}))
											}
											className="border px-2 py-1 rounded"
										/>
									)}
								</label>
							);
						})}
					</div>

					<div className="mt-4 flex gap-2">
						<button
							type="button"
							onClick={runAdvancedTest}
							className="bg-purple-600 text-white px-3 py-1 rounded text-sm"
						>
							Run Advanced Evaluation
						</button>
						<button
							type="button"
							onClick={() => {
								setTestInputs({});
								setTestResult(null);
							}}
							className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
						>
							Clear
						</button>
					</div>

					{testResult && (
						<div className="mt-4 border rounded p-3 bg-gray-50 space-y-2 text-sm">
							<div>
								<span className="font-semibold">Score:</span> {testResult.totalScore} /
								 {testResult.maxScore} — {testResult.riskGrade}
							</div>
							<div>
								<span className="font-semibold">Matched rules:</span>
								 {testResult.matchedRules} / {testResult.breakdown.length}
							</div>
							<div>
								<span className="font-semibold">ECL:</span>{" "}
								{testResult.ecl
									? testResult.ecl.expectedCreditLoss.toFixed(2)
									: "Not available (missing PD/LGD/EAD)"}
							</div>
						</div>
					)}
				</section>
			) : (
				<div className="border rounded p-4 bg-gray-50 text-sm text-gray-700">
					No scorecard available. Create one in the original setup page first.
				</div>
			)}
		</div>
	);
}