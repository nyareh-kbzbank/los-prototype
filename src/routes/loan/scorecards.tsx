import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { type ScoreCard, useScoreCardStore } from "@/lib/scorecard-store";

export const Route = createFileRoute("/loan/scorecards")({
	component: ScorecardListPage,
});

function ScorecardListPage() {
	const navigate = useNavigate();
	const scoreCards = useScoreCardStore((s) => s.scoreCards);
	const selectScoreCard = useScoreCardStore((s) => s.selectScoreCard);

	const rows = useMemo<ScoreCard[]>(() => {
		return Object.values(scoreCards).sort((a, b) =>
			(a.name || a.scoreCardId).localeCompare(b.name || b.scoreCardId),
		);
	}, [scoreCards]);

	const handleOpen = (id: string, target: "setup" | "loan") => {
		selectScoreCard(id);
		if (target === "setup") {
			navigate({ to: "/loan/scorecard-setup" });
			return;
		}
		navigate({ to: "/loan/setup" });
	};

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="flex items-center justify-between mb-4 gap-3">
				<div>
					<h1 className="text-2xl font-bold">Scorecard Setups</h1>
					<p className="text-sm text-gray-700">
						View and open saved scorecards for editing or use in the loan setup
						flow.
					</p>
				</div>
				<div className="flex flex-wrap gap-2 justify-end">
					<Link
						to="/loan/scorecard-setup"
						className="text-sm border px-3 py-2 rounded hover:bg-gray-50"
					>
						Create / Edit
					</Link>
				</div>
			</div>

			{rows.length === 0 ? (
				<div className="border rounded p-4 bg-gray-50 text-gray-700 text-sm">
					No scorecards saved yet. Create one to see it listed here.
				</div>
			) : (
				<div className="overflow-x-auto border rounded">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-100 text-left">
							<tr>
								<th className="px-3 py-2 font-semibold">Name</th>
								<th className="px-3 py-2 font-semibold">Max Score</th>
								<th className="px-3 py-2 font-semibold">Rules</th>
								<th className="px-3 py-2 font-semibold">Bureau</th>
								<th className="px-3 py-2 font-semibold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((card) => {
								const uniqueFields = new Set(card.rules.map((r) => r.field));
								return (
									<tr key={card.scoreCardId} className="border-t hover:bg-gray-50">
										<td className="px-3 py-2">
											<div className="font-medium">{card.name || "(unnamed)"}</div>
											<div className="text-xs text-gray-600">{card.scoreCardId}</div>
										</td>
										<td className="px-3 py-2">{card.maxScore}</td>
										<td className="px-3 py-2 text-xs text-gray-700">
											<div className="font-semibold text-sm">{card.rules.length} rules</div>
											<div>{uniqueFields.size} fields</div>
										</td>
										<td className="px-3 py-2 text-xs text-gray-700">
											<div className="font-medium text-sm">{card.bureauProvider ?? "—"}</div>
											<div>{card.bureauPurpose ?? ""}</div>
											<div className="text-gray-600">
												{card.bureauConsentRequired ? "Consent required" : "Consent not required"}
											</div>
										</td>
										<td className="px-3 py-2">
											<div className="flex flex-wrap gap-2">
												<button
													type="button"
													onClick={() => handleOpen(card.scoreCardId, "setup")}
													className="border px-3 py-1 rounded text-sm hover:bg-gray-50"
												>
													Open in editor
												</button>
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
