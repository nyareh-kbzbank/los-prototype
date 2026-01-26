import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { getLoanSetupList, useLoanSetupStore } from "@/lib/loan-setup-store";

type LoanSearch = {
	error?: string;
};

export const Route = createFileRoute("/loan/")({
	validateSearch: (search: Record<string, unknown>): LoanSearch => {
		return {
			error: search.error as string | undefined,
		};
	},
	component: LoanWorkflowList,
});

function LoanWorkflowList() {
	const setups = useLoanSetupStore((s) => s.setups);
	const rows = useMemo(() => getLoanSetupList(setups), [setups]);
	const search = useSearch({ from: "/loan/" });
	const [showError, setShowError] = useState(false);

	useEffect(() => {
		if (search.error === "admin-required") {
			setShowError(true);
			const timer = setTimeout(() => setShowError(false), 5000);
			return () => clearTimeout(timer);
		}
	}, [search.error]);

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			{showError && (
				<div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded">
					<strong>Access Denied:</strong> You need administrator privileges to
					access the Loan Setup page.
				</div>
			)}
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
					<Link
						to="/loan/scorecards"
						className="text-sm border px-3 rounded hover:bg-gray-50"
					>
						Score Card List
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
								<th className="px-3 py-2 font-semibold"></th>
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
									<td className="px-3 py-2 text-right">
										<Link
											to="/loan/setup/$setupId"
											params={{ setupId: row.id }}
											className="text-sm border px-3 py-1 rounded hover:bg-gray-100"
										>
											Edit
										</Link>
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
