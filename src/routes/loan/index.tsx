import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { getLoanSetupList, useLoanSetupStore } from "@/lib/loan-setup-store";

export const Route = createFileRoute("/loan/")({
	component: LoanWorkflowList,
});

function LoanWorkflowList() {
	const setups = useLoanSetupStore((s) => s.setups);
	const rows = useMemo(() => getLoanSetupList(setups), [setups]);

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h1 className="text-2xl font-bold">Saved Loan Setup</h1>
					<p className="text-sm text-gray-700">
						Snapshots are saved from the Loan Setup page.
					</p>
				</div>
				<div className="flex gap-2">
					<Link
						to="/loan/setup"
						className="text-sm border px-3 rounded hover:bg-gray-50"
					>
						Create
					</Link>
					<Link
						to="/workflow"
						className="text-sm border px-3 rounded hover:bg-gray-50"
					>
						Create Workflow
					</Link>
					<Link
						to="/loan/repayment-setup"
						className="text-sm border px-3 rounded hover:bg-gray-50"
					>
						Create Repayment Setup
					</Link>
					<Link
						to="/loan/scorecard-setup"
						className="text-sm border px-3 rounded hover:bg-gray-50"
					>
						Create Score Card
					</Link>
				</div>
			</div>

			{rows.length === 0 ? (
				<div className="border rounded p-4 bg-gray-50 text-gray-700 text-sm">
					Nothing saved yet. Use the save button on the setup page first.
				</div>
			) : (
				<div className="overflow-x-auto border rounded">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-100 text-left">
							<tr>
								<th className="px-3 py-2 font-semibold">Product</th>
								<th className="px-3 py-2 font-semibold">Scorecard</th>
								<th className="px-3 py-2 font-semibold">Workflow</th>
								<th className="px-3 py-2 font-semibold">Repayment</th>
								<th className="px-3 py-2 font-semibold">Risk</th>
								<th className="px-3 py-2 font-semibold">Created</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<tr key={row.id} className="border-t hover:bg-gray-50">
									<td className="px-3 py-2">
										<div className="font-medium">{row.product.productName}</div>
										<div className="text-xs text-gray-600">
											{row.product.productCode}
										</div>
									</td>
									<td className="px-3 py-2">
										{row.scorecardName ?? row.scorecardId ?? "—"}
									</td>
									<td className="px-3 py-2">
										{row.workflowName ?? row.workflowId ?? "—"}
									</td>
									<td className="px-3 py-2">
										{row.repaymentPlanName ?? row.repaymentPlanId ?? "—"}
									</td>
									<td className="px-3 py-2">
										{row.riskGrade ?? "—"}
										{row.totalScore == null ? "" : ` (${row.totalScore})`}
									</td>
									<td className="px-3 py-2 whitespace-nowrap">
										{new Date(row.createdAt).toLocaleString()}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
