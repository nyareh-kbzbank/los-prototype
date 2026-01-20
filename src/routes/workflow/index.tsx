import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { type SavedWorkflow, useWorkflowStore } from "@/lib/workflow-store";

export const Route = createFileRoute("/workflow/")({
	component: WorkflowListPage,
});

function WorkflowListPage() {
	const navigate = useNavigate();
	const workflows = useWorkflowStore((s) => s.workflows);
	const selectWorkflow = useWorkflowStore((s) => s.selectWorkflow);

	const rows = useMemo<SavedWorkflow[]>(() => {
		return Object.values(workflows).sort((a, b) =>
			(a.name || a.workflowId).localeCompare(b.name || b.workflowId),
		);
	}, [workflows]);

	const handleOpen = (id: string) => {
		selectWorkflow(id);
		navigate({ to: "/workflow/setup" });
	};

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="flex items-center justify-between mb-4 gap-3">
				<div>
					<h1 className="text-2xl font-bold">Workflow Setups</h1>
					<p className="text-sm text-gray-700">
						View and open saved workflows for editing.
					</p>
				</div>
				<div className="flex flex-wrap gap-2 justify-end">
					<Link
						to="/workflow"
						className="text-sm border px-3 py-2 rounded hover:bg-gray-50"
					>
						Create / Edit
					</Link>
				</div>
			</div>

			{rows?.length === 0 ? (
				<div className="border rounded p-4 bg-gray-50 text-gray-700 text-sm">
					No workflows saved yet. Create one to see it listed here.
				</div>
			) : (
				<div className="overflow-x-auto border rounded">
					<table className="min-w-full text-sm">
						<thead className="bg-gray-100 text-left">
							<tr>
								<th className="px-3 py-2 font-semibold">Name</th>
								<th className="px-3 py-2 font-semibold">Actions</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((wf) => {
								return (
									<tr key={wf.workflowId} className="border-t hover:bg-gray-50">
										<td className="px-3 py-2">
											<div className="font-medium">{wf.name || "(unnamed)"}</div>
											<div className="text-xs text-gray-600">{wf.workflowId}</div>
										</td>
										<td className="px-3 py-2">
											<div className="flex flex-wrap gap-2">
												<button
													type="button"
													onClick={() => handleOpen(wf.workflowId)}
													className="border px-3 py-1 rounded text-sm hover:bg-gray-50"
												>
													Open in editor
												</button>
												<Link
													to="/workflow/$workflowId"
													params={{ workflowId: wf.workflowId }}
													className="border px-3 py-1 rounded text-sm hover:bg-gray-50"
												>
													View Details
												</Link>
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
