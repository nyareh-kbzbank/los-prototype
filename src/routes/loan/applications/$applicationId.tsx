import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { WorkflowJsonNode } from "@/components/workflow/types";
import {
	type ApplicationWorkflowEvent,
	type LoanApplicationStatus,
	useLoanApplicationStore,
} from "@/lib/loan-application-store";
import { useLoanSetupStore } from "@/lib/loan-setup-store";
import { useWorkflowStore } from "@/lib/workflow-store";

export const Route = createFileRoute("/loan/applications/$applicationId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { applicationId } = Route.useParams();
	const application = useLoanApplicationStore(
		(s) => s.applications[applicationId],
	);
	const updateStatus = useLoanApplicationStore((s) => s.updateStatus);
	const advanceWorkflowStage = useLoanApplicationStore(
		(s) => s.advanceWorkflowStage,
	);
	const resetWorkflowProgress = useLoanApplicationStore(
			(s) => s.resetWorkflowProgress,
		);
	const setups = useLoanSetupStore((s) => s.setups);
	const workflows = useWorkflowStore((s) => s.workflows);

	const setup = application ? setups[application.setupId] : undefined;
	const savedWorkflow =
		setup?.workflowId && workflows[setup.workflowId]
			? workflows[setup.workflowId]
			: null;

	const workflowStages: WorkflowJsonNode[] = useMemo(() => {
		return (
			savedWorkflow?.workflow.nodes.filter(
				(item) => item.type === "custom-node",
			) ?? []
		);
	}, [savedWorkflow?.workflow]);

	const historyByStageIndex = useMemo(() => {
		const map = new Map<number, ApplicationWorkflowEvent>();
		if (!application?.workflowHistory) return map;
		for (const entry of application.workflowHistory) {
			map.set(entry.stageIndex, entry);
		}
		return map;
	}, [application?.workflowHistory]);

	const currentStageIndex = application?.workflowStageIndex ?? -1;
	const nextStage = workflowStages[currentStageIndex + 1];

	const getStageLabel = (node: WorkflowJsonNode) => {
		const label =
			typeof node.data?.label === "string" ? node.data.label.trim() : "";
		return label || node.id;
	};

	const handleAdvanceStage = () => {
		if (!application || !nextStage) return;
		advanceWorkflowStage(application.id, {
			stageId: nextStage.id,
			stageIndex: currentStageIndex + 1,
			stageLabel: getStageLabel(nextStage),
			occurredAt: Date.now(),
		});
	};

	const handleResetWorkflow = () => {
		if (!application) return;
		resetWorkflowProgress(application.id);
	};

	const scoreLabel = useMemo(() => {
		if (
			application?.creditScore === null ||
			application?.creditScore === undefined
		)
			return "—";
		if (application.creditMax === null || application.creditMax === undefined)
			return application.creditScore.toLocaleString();
		return `${application.creditScore.toLocaleString()} / ${application.creditMax.toLocaleString()}`;
	}, [application?.creditMax, application?.creditScore]);

	const bureauRequestedAtLabel = useMemo(() => {
		if (!application?.bureauRequestedAt) return "—";
		return new Date(application.bureauRequestedAt).toLocaleString();
	}, [application?.bureauRequestedAt]);

	const statuses: LoanApplicationStatus[] = useMemo(
		() => ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
		[],
	);

	const getStatusTone = (statusLabel: string) => {
		switch (statusLabel) {
			case "Completed":
				return {
					badge: "bg-green-50 text-green-700 border-green-200",
					card: "border-green-200 bg-green-50/40",
				};
			case "Current":
				return {
					badge: "bg-blue-50 text-blue-700 border-blue-200",
					card: "border-blue-200 bg-blue-50/40",
				};
			default:
				return {
					badge: "bg-gray-50 text-gray-700 border-gray-200",
					card: "border-gray-200 bg-white",
				};
		}
	};

	if (!application) {
		return (
			<div className="p-6 font-sans max-w-3xl mx-auto">
				<div className="border rounded p-4 bg-red-50 text-sm text-gray-800">
					Application not found.
					<div className="mt-2">
						<Link
							to="/loan/applications"
							className="text-blue-600 hover:underline"
						>
							Back to list
						</Link>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 font-sans max-w-3xl mx-auto space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Application detail</h1>
					<p className="text-sm text-gray-700">
						{application.productName ?? "Loan product"} ·{" "}
						{application.productCode}
					</p>
					<p className="text-xs text-gray-600 font-mono">
						Application #: {application.applicationNo}
					</p>
				</div>
				<Link
					to="/loan/applications"
					className="text-sm border px-3 rounded hover:bg-gray-50"
				>
					Back to list
				</Link>
			</div>

			<section className="border rounded p-4 text-sm space-y-3">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
					<div className="font-semibold">Status</div>
					<select
						className="border px-2 py-2 rounded"
						value={application.status}
						onChange={(e) =>
							updateStatus(
								application.id,
								e.target.value as LoanApplicationStatus,
							)
						}
					>
						{statuses.map((status) => (
							<option key={status} value={status}>
								{status}
							</option>
						))}
					</select>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<Field label="Application #" value={application.applicationNo} />
					<Field label="Applicant" value={application.applicantName} />
					<Field label="National ID" value={application.nationalId} />
					<Field label="Age" value={application.age ?? "—"} />
					<Field label="Phone" value={application.phone} />
					<Field
						label="Monthly income"
						value={
							application.monthlyIncome === null
								? "—"
								: application.monthlyIncome.toLocaleString()
						}
					/>
					<Field label="Channel" value={application.channelCode || "—"} />
					<Field
						label="Requested amount"
						value={application.requestedAmount.toLocaleString()}
					/>
					<Field
						label="Tenure (months)"
						value={application.tenureMonths ?? "—"}
					/>
					<Field label="Destination" value={application.destinationType} />
					<Field label="Setup ID" value={application.setupId} />
					<Field label="Score result" value={scoreLabel} />
					<Field label="Bureau provider" value={application.bureauProvider || "—"} />
					<Field label="Bureau purpose" value={application.bureauPurpose || "—"} />
					<Field label="Bureau consent" value={application.bureauConsent ? "Yes" : "No"} />
					<Field label="Bureau reference" value={application.bureauReference || "—"} />
					<Field label="Bureau requested at" value={bureauRequestedAtLabel} />
				</div>
				<div>
					<div className="font-semibold mb-1">Notes</div>
					<div className="border rounded p-3 bg-gray-50 text-gray-700 min-h-16">
						{application.notes || "No notes"}
					</div>
				</div>
			</section>

			<section className="border rounded p-4 text-sm space-y-3">
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<div>
						<div className="font-semibold">Workflow history</div>
						<div className="text-xs text-gray-600">
							Linked workflow:{" "}
							{setup?.workflowName ??
								application.workflowName ??
								"(not linked)"}
						</div>
					</div>
					<div className="flex gap-2">
						<button
							type="button"
							className="text-sm border px-3 py-2 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={handleAdvanceStage}
							disabled={!nextStage}
						>
							{nextStage
								? `Advance to ${getStageLabel(nextStage)}`
								: "No next stage"}
						</button>
						<button
							type="button"
							className="text-sm border px-3 py-2 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
							onClick={handleResetWorkflow}
							disabled={(application.workflowHistory?.length ?? 0) === 0}
						>
							Reset stages
						</button>
					</div>
				</div>

				{!savedWorkflow ? (
					<div className="border rounded p-3 bg-yellow-50 text-gray-800">
						No workflow is linked to this loan setup. Attach one in Loan Setup
						to track stage history.
					</div>
				) : workflowStages.length === 0 ? (
					<div className="border rounded p-3 bg-gray-50 text-gray-700">
						Workflow has no stages defined.
					</div>
				) : (
					<div className="space-y-2">
						{workflowStages.map((stage, idx) => {
							const history = historyByStageIndex.get(idx);
							const statusLabel =
								idx < currentStageIndex
									? "Completed"
									: idx === currentStageIndex
										? "Current"
									: "Pending";
							const statusTone = getStatusTone(statusLabel);
							return (
								<div
									key={`${stage.id}-${idx}`}
									className={`flex items-start justify-between gap-2 border rounded p-3 ${statusTone.card}`}
								>
									<div className="space-y-1">
										<div className="font-semibold">{getStageLabel(stage)}</div>
										<div className="text-xs text-gray-600">Stage {idx + 1}</div>
										{history ? (
											<div className="text-xs text-gray-700">
												Reached {new Date(history.occurredAt).toLocaleString()}
											</div>
										) : null}
									</div>
										<span
											className={`text-xs px-2 py-1 rounded-full border ${statusTone.badge}`}
										>
										{statusLabel}
									</span>
								</div>
							);
						})}
					</div>
				)}
			</section>

			<section className="border rounded p-4 text-sm text-gray-700">
				<div className="font-semibold mb-1">Timestamps</div>
				<div>Created: {new Date(application.createdAt).toLocaleString()}</div>
				<div>Updated: {new Date(application.updatedAt).toLocaleString()}</div>
			</section>
		</div>
	);
}

function Field({
	label,
	value,
}: Readonly<{ label: string; value: string | number }>) {
	return (
		<div className="flex flex-col gap-1">
			<span className="text-gray-600">{label}</span>
			<span className="font-medium">{value}</span>
		</div>
	);
}
