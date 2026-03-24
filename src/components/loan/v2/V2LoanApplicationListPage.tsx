import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	getLoanApplicationList,
	getLoanApplicationStatusLabel,
	useLoanApplicationStore,
} from "@/lib/loan-application-store";
import { getLoanSetupV2List, useLoanSetupV2Store } from "@/lib/loan-setup-v2-store";

export function V2LoanApplicationListPage() {
	const applications = useLoanApplicationStore((state) => state.applications);
	const setups = useLoanSetupV2Store((state) => state.setups);

	const rows = useMemo(() => {
		const v2SetupIds = new Set(getLoanSetupV2List(setups).map((setup) => setup.id));
		return getLoanApplicationList(applications).filter((application) =>
			v2SetupIds.has(application.setupId),
		);
	}, [applications, setups]);

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
				<div>
					<h1 className="text-2xl font-bold">V2 Loan Applications</h1>
					<p className="text-sm text-gray-700">
						Applications created from V2 loan setup snapshots only.
					</p>
				</div>
				<div className="flex gap-2">
				</div>
			</div>

			{rows.length === 0 ? (
				<div className="border rounded p-4 bg-gray-50 text-gray-700 text-sm">
					No V2 applications yet. Create a V2 setup, then start a V2 application.
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
								<th className="px-3 py-2 font-semibold">Credit score</th>
								<th className="px-3 py-2 font-semibold">Status</th>
								<th className="px-3 py-2 font-semibold">Created</th>
								<th className="px-3 py-2 font-semibold" />
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const score = row.creditScore ?? null;
								const max = row.creditMax ?? null;
								let scoreLabel = "—";
								if (score !== null) {
									scoreLabel = max ? `${score} / ${max}` : `${score}`;
								}

								return (
									<tr key={row.id} className="border-t hover:bg-gray-50">
										<td className="px-3 py-2 font-mono text-xs text-gray-700">
											{row.applicationNo}
										</td>
										<td className="px-3 py-2">
											<div className="font-medium">{row.beneficiaryName}</div>
											<div className="text-xs text-gray-600">{row.nationalId}</div>
										</td>
										<td className="px-3 py-2">
											<div className="font-medium">{row.productName ?? ""}</div>
											<div className="text-xs text-gray-600">{row.productCode}</div>
										</td>
										<td className="px-3 py-2 font-mono">
											{row.requestedAmount.toLocaleString()}
										</td>
										<td className="px-3 py-2 whitespace-nowrap">{scoreLabel}</td>
										<td className="px-3 py-2">{getLoanApplicationStatusLabel(row)}</td>
										<td className="px-3 py-2 whitespace-nowrap">
											{new Date(row.createdAt).toLocaleString()}
										</td>
										<td className="px-3 py-2">
											<Link
												to="/solution/v2/loan-applications/$applicationId"
												params={{ applicationId: row.id }}
												className="text-sm text-blue-600 hover:underline"
											>
												View
											</Link>
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
