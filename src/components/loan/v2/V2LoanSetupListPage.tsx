import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	getLoanSetupV2List,
	useLoanSetupV2Store,
} from "@/lib/loan-setup-v2-store";
import { getWorkflowList, useWorkflowStore } from "@/lib/workflow-store";

export function V2LoanSetupListPage() {
	const setups = useLoanSetupV2Store((state) => state.setups);
	const removeSetup = useLoanSetupV2Store((state) => state.removeSetup);
	const rows = useMemo(() => getLoanSetupV2List(setups), [setups]);
	const workflows = useWorkflowStore((state) => state.workflows);
	const workflowList = useMemo(() => getWorkflowList(workflows), [workflows]);

	const workflowNameById = useMemo(
		() =>
			Object.fromEntries(
				workflowList.map((workflow) => [workflow.workflowId, workflow.name]),
			),
		[workflowList],
	);

	const handleDelete = (setupId: string, productName: string) => {
		const quotedProductName = productName ? ` "${productName}"` : "";
		const confirmed = globalThis.confirm(
			`Delete saved loan setup${quotedProductName}?`,
		);
		if (!confirmed) return;
		removeSetup(setupId);
	};

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h1 className="text-2xl font-bold">Saved Loan Setup V2</h1>
					<p className="text-sm text-gray-700">
						Snapshots are saved from the V2 Loan Setup page.
					</p>
				</div>
				<div className="flex gap-2">
					<Link
						to="/solution/v2/loan-setup"
						className="text-sm border px-3 rounded hover:bg-gray-50"
					>
						Create
					</Link>
					<Link
						to="/solution/v2/loan-applications/create"
						className="text-sm border px-3 rounded hover:bg-gray-50"
					>
						Create Application
					</Link>
				</div>
			</div>

			{rows.length === 0 ? (
				<div className="border rounded p-4 bg-gray-50 text-gray-700 text-sm">
					Nothing saved yet. Click Completed from the V2 setup page to save.
				</div>
			) : (
				<div className="overflow-x-auto border rounded">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-100 text-left">
							<tr>
								<th className="px-3 py-2 font-semibold">Product</th>
								<th className="px-3 py-2 font-semibold">Workflow</th>
								<th className="px-3 py-2 font-semibold">Bureau</th>
								<th className="px-3 py-2 font-semibold">Decision Rules</th>
								<th className="px-3 py-2 font-semibold">Created</th>
								<th className="px-3 py-2 font-semibold text-right">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const firstMappedWorkflowId = row.channels.find(
									(channel) => channel.workflowId,
								)?.workflowId;
								const workflowName = firstMappedWorkflowId
									? (workflowNameById[firstMappedWorkflowId] ??
										firstMappedWorkflowId)
									: "—";

								return (
									<tr key={row.id} className="border-t hover:bg-gray-50">
										<td className="px-3 py-2">
											<div className="font-medium">
												{row.productSetup.productName || "—"}
											</div>
											<div className="text-xs text-gray-600">
												{row.productSetup.productCode || "—"}
											</div>
										</td>
										<td className="px-3 py-2">{workflowName}</td>
										<td className="px-3 py-2">
											{row.bureauRequired
												? row.bureauProvider || "Enabled"
												: "Disabled"}
										</td>
										<td className="px-3 py-2">
											LOW: {row.decisionRules.LOW} · MEDIUM:{" "}
											{row.decisionRules.MEDIUM} · HIGH:{" "}
											{row.decisionRules.HIGH}
										</td>
										<td className="px-3 py-2 whitespace-nowrap">
											{new Date(row.createdAt).toLocaleString()}
										</td>
										<td className="px-3 py-2">
											<div className="flex items-center justify-end gap-2 whitespace-nowrap">
												<Link
													to="/solution/v2/loan-setup"
													search={{ setupId: row.id }}
													className="rounded border px-3 py-1.5 hover:bg-gray-50"
												>
													Edit
												</Link>
												<button
													type="button"
													onClick={() =>
														handleDelete(row.id, row.productSetup.productName)
													}
													className="rounded border border-red-200 px-3 py-1.5 text-red-600 hover:bg-red-50"
												>
													Delete
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