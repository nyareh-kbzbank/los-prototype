import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	getLoanApplicationList,
	useLoanApplicationStore,
} from "@/lib/loan-application-store";
import { getLoanSetupV2List, useLoanSetupV2Store } from "@/lib/loan-setup-v2-store";

export const Route = createFileRoute("/solution/v2/loan-applications/checker-inbox/")({
	component: V2CheckerInboxPage,
});

function V2CheckerInboxPage() {
	const applications = useLoanApplicationStore((state) => state.applications);
	const setups = useLoanSetupV2Store((state) => state.setups);

	const rows = useMemo(() => {
		const v2SetupIds = new Set(getLoanSetupV2List(setups).map((setup) => setup.id));
		return getLoanApplicationList(applications).filter(
			(application) =>
				v2SetupIds.has(application.setupId) &&
				application.status === "CHECKER_PENDING",
		);
	}, [applications, setups]);

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">V2 Checker Inbox</h1>
					<p className="text-sm text-gray-700">
						V2 applications submitted by maker and waiting for checker decision.
					</p>
				</div>
				<div className="flex gap-2">
					<Link
						to="/solution/v2/loan-applications"
						className="text-sm border px-3 py-2 rounded hover:bg-gray-50"
					>
						V2 applications
					</Link>
					<Link
						to="/solution/v2/loan-applications/maker-inbox"
						className="text-sm border px-3 py-2 rounded hover:bg-gray-50"
					>
						Maker Inbox
					</Link>
				</div>
			</div>

			{rows.length === 0 ? (
				<div className="border rounded p-4 bg-gray-50 text-sm text-gray-700">
					No V2 applications are waiting in checker inbox.
				</div>
			) : (
				<div className="overflow-x-auto border rounded">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-100 text-left">
							<tr>
								<th className="px-3 py-2 font-semibold">Application #</th>
								<th className="px-3 py-2 font-semibold">Beneficiary</th>
								<th className="px-3 py-2 font-semibold">Product</th>
								<th className="px-3 py-2 font-semibold">Amount</th>
								<th className="px-3 py-2 font-semibold">Workflow</th>
								<th className="px-3 py-2 font-semibold">Created</th>
								<th className="px-3 py-2 font-semibold" />
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<tr key={row.id} className="border-t hover:bg-gray-50">
									<td className="px-3 py-2 font-mono text-xs text-gray-700">
										{row.applicationNo}
									</td>
									<td className="px-3 py-2">
										<div className="font-medium">{row.beneficiaryName}</div>
										<div className="text-xs text-gray-600">{row.nationalId}</div>
									</td>
									<td className="px-3 py-2">
										<div className="font-medium">{row.productName ?? "—"}</div>
										<div className="text-xs text-gray-600">{row.productCode}</div>
									</td>
									<td className="px-3 py-2 font-mono">
										{row.requestedAmount.toLocaleString()}
									</td>
									<td className="px-3 py-2">{row.workflowName || "—"}</td>
									<td className="px-3 py-2 whitespace-nowrap">
										{new Date(row.createdAt).toLocaleString()}
									</td>
									<td className="px-3 py-2">
										<Link
											to="/solution/v2/loan-applications/checker-inbox/$applicationId"
											params={{ applicationId: row.id }}
											className="text-sm text-blue-600 hover:underline"
										>
											Open
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
