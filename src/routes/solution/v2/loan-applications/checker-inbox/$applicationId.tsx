import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useLoanApplicationStore } from "@/lib/loan-application-store";
import { useLoanSetupV2Store } from "@/lib/loan-setup-v2-store";
import {
	createWorkflowRuntime,
	formatWorkflowActionLabel,
	getCurrentWorkflowStageId,
	getWorkflowTransitionsForApplication,
	type WorkflowTransition,
} from "@/lib/workflow-runtime";
import { useWorkflowStore } from "@/lib/workflow-store";

export const Route = createFileRoute(
	"/solution/v2/loan-applications/checker-inbox/$applicationId",
)({
	component: V2CheckerInboxDetailPage,
});

function V2CheckerInboxDetailPage() {
	const navigate = useNavigate();
	const { applicationId } = Route.useParams();
	const application = useLoanApplicationStore((state) => state.applications[applicationId]);
	const updateStatus = useLoanApplicationStore((state) => state.updateStatus);
	const advanceWorkflowStage = useLoanApplicationStore((state) => state.advanceWorkflowStage);
	const v2Setups = useLoanSetupV2Store((state) => state.setups);
	const workflows = useWorkflowStore((state) => state.workflows);

	const isV2Application = Boolean(application && v2Setups[application.setupId]);
	const canTakeDecision = application?.status === "CHECKER_PENDING";
	const savedWorkflow =
		application?.workflowId && workflows[application.workflowId]
			? workflows[application.workflowId]
			: null;
	const runtime = useMemo(() => createWorkflowRuntime(savedWorkflow), [savedWorkflow]);
	const currentStageId = application
		? getCurrentWorkflowStageId(application, runtime)
		: null;
	const currentStageLabel =
		currentStageId && runtime
			? (runtime.stageLabelById[currentStageId] ?? currentStageId)
			: "—";
	const runtimeActions = application
		? getWorkflowTransitionsForApplication(application, runtime)
		: [];
	const actions = useMemo<WorkflowTransition[]>(() => {
		if (runtimeActions.length > 0) {
			return runtimeActions;
		}

		return [
			{
				id: "legacy-approve",
				label: "approve",
				nextStageId: null,
				nextStageLabel: null,
				isTerminal: true,
				nextStatus: "APPROVED",
			},
			{
				id: "legacy-reject",
				label: "reject",
				nextStageId: null,
				nextStageLabel: null,
				isTerminal: true,
				nextStatus: "REJECTED",
			},
		];
	}, [runtimeActions]);

	const decisionSummary = useMemo(() => {
		switch (application?.status) {
			case "CHECKER_PENDING":
				return "Waiting for checker decision";
			case "APPROVED":
				return "Approved";
			case "REJECTED":
				return "Rejected";
			default:
				return "Not in checker queue";
		}
	}, [application?.status]);

	const creditScoreLabel = useMemo(() => {
		if (application?.creditScore == null) return "—";
		if (application.creditMax == null) return `${application.creditScore}`;
		return `${application.creditScore} / ${application.creditMax}`;
	}, [application?.creditMax, application?.creditScore]);

	const handleAction = (action: WorkflowTransition) => {
		if (!application || !canTakeDecision) return;

		if (action.nextStageId) {
			advanceWorkflowStage(application.id, {
				stageId: action.nextStageId,
				stageIndex: application.workflowStageIndex + 1,
				stageLabel: action.nextStageLabel ?? action.nextStageId,
				occurredAt: Date.now(),
			});
		}

		if (action.nextStatus !== application.status) {
			updateStatus(application.id, action.nextStatus);
		}

		if (action.nextStatus === "SUBMITTED") {
			navigate({
				to: "/solution/v2/loan-applications/maker-inbox/$applicationId",
				params: { applicationId: application.id },
			});
			return;
		}

		navigate({ to: "/solution/v2/loan-applications/checker-inbox" });
	};

	if (!application || !isV2Application) {
		return (
			<div className="p-6 font-sans max-w-3xl mx-auto">
				<div className="border rounded p-4 bg-red-50 text-sm text-gray-800">
					V2 application not found.
					<div className="mt-2">
						<Link
							to="/solution/v2/loan-applications/checker-inbox"
							className="text-blue-600 hover:underline"
						>
							Back to V2 checker inbox
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
					<h1 className="text-2xl font-bold">V2 Checker review detail</h1>
					<p className="text-sm text-gray-700">{application.applicationNo}</p>
				</div>
				<Link
					to="/solution/v2/loan-applications/checker-inbox"
					className="text-sm border px-3 py-2 rounded hover:bg-gray-50"
				>
					Back to inbox
				</Link>
			</div>

			<section className="border rounded p-4 text-sm space-y-3">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
					<div className="font-semibold">Checker decision status</div>
					<span className="text-xs px-2 py-1 rounded-full border bg-gray-50 text-gray-700 border-gray-200">
						{decisionSummary}
					</span>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<Field label="Beneficiary" value={application.beneficiaryName} />
					<Field label="National ID" value={application.nationalId} />
					<Field label="Product" value={application.productName ?? application.productCode} />
					<Field label="Requested amount" value={application.requestedAmount.toLocaleString()} />
					<Field label="Credit score" value={creditScoreLabel} />
					<Field label="Workflow" value={application.workflowName || "—"} />
					<Field label="Current stage" value={currentStageLabel} />
					<Field label="Current status" value={application.status} />
				</div>
			</section>

			<section className="border rounded p-4 text-sm space-y-3">
				<div className="font-semibold">Checker actions</div>
				{canTakeDecision ? (
					<div className="flex gap-2 flex-wrap">
						{actions.map((action) => {
							const isReject = action.nextStatus === "REJECTED";
							const isApprove = action.nextStatus === "APPROVED";
							const buttonClass = isReject
								? "px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
								: isApprove
									? "px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
									: "px-4 py-2 rounded border hover:bg-gray-50";

							return (
								<button
									key={action.id}
									type="button"
									onClick={() => handleAction(action)}
									className={buttonClass}
								>
									{formatWorkflowActionLabel(action.label)}
								</button>
							);
						})}
					</div>
				) : (
					<div className="text-sm text-gray-600">
						Checker actions are available only for applications waiting in V2 checker inbox.
					</div>
				)}
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
