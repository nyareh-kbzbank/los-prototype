import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	getLoanApplicationList,
	useLoanApplicationStore,
} from "@/lib/loan-application-store";

export const Route = createFileRoute("/loan/maker-inbox/")({
	component: MakerInboxPage,
});

function MakerInboxPage() {
	const applications = useLoanApplicationStore((s) => s.applications);
	const rows = useMemo(
		() =>
			getLoanApplicationList(applications).filter(
				(application) => application.status === "SUBMITTED",
			),
		[applications],
	);

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Maker Inbox</h1>
					<p className="text-sm text-gray-700">
						Manual-review applications waiting for maker decision.
					</p>
				</div>
				<Link
					to="/loan/applications"
					className="text-sm border px-3 py-2 rounded hover:bg-gray-50"
				>
					All applications
				</Link>
			</div>

			{rows.length === 0 ? (
				<div className="border rounded p-4 bg-gray-50 text-sm text-gray-700">
					No applications are waiting in maker inbox.
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
									<td className="px-3 py-2 whitespace-nowrap">
										{new Date(row.createdAt).toLocaleString()}
									</td>
									<td className="px-3 py-2">
										<Link
											to="/loan/maker-inbox/$applicationId"
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
