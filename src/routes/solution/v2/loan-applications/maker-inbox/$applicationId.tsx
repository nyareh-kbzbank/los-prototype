import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { useLoanApplicationStore } from "@/lib/loan-application-store";
import { useLoanSetupV2Store } from "@/lib/loan-setup-v2-store";

export const Route = createFileRoute(
	"/solution/v2/loan-applications/maker-inbox/$applicationId",
)({
	component: V2MakerInboxDetailPage,
});

function V2MakerInboxDetailPage() {
	const navigate = useNavigate();
	const { applicationId } = Route.useParams();
	const application = useLoanApplicationStore((state) => state.applications[applicationId]);
	const updateStatus = useLoanApplicationStore((state) => state.updateStatus);
	const v2Setups = useLoanSetupV2Store((state) => state.setups);

	const isV2Application = Boolean(application && v2Setups[application.setupId]);
	const canTakeDecision = application?.status === "SUBMITTED";

	const decisionSummary = useMemo(() => {
		switch (application?.status) {
			case "SUBMITTED":
				return "Waiting for maker decision";
			case "CHECKER_PENDING":
				return "Submitted to checker";
			case "APPROVED":
				return "Approved";
			case "REJECTED":
				return "Rejected";
			default:
				return "Not in maker queue";
		}
	}, [application?.status]);

	const creditScoreLabel = useMemo(() => {
		if (application?.creditScore == null) return "—";
		if (application.creditMax == null) return `${application.creditScore}`;
		return `${application.creditScore} / ${application.creditMax}`;
	}, [application?.creditMax, application?.creditScore]);

	const handleApprove = () => {
		if (!application || !canTakeDecision) return;
		updateStatus(application.id, "APPROVED");
		navigate({ to: "/solution/v2/loan-applications/maker-inbox" });
	};

	const handleReject = () => {
		if (!application || !canTakeDecision) return;
		updateStatus(application.id, "REJECTED");
		navigate({ to: "/solution/v2/loan-applications/maker-inbox" });
	};

	const handleSubmitToChecker = () => {
		if (!application || !canTakeDecision) return;
		updateStatus(application.id, "CHECKER_PENDING");
		navigate({
			to: "/solution/v2/loan-applications/checker-inbox/$applicationId",
			params: { applicationId: application.id },
		});
	};

	if (!application || !isV2Application) {
		return (
			<div className="p-6 font-sans max-w-3xl mx-auto">
				<div className="border rounded p-4 bg-red-50 text-sm text-gray-800">
					V2 application not found.
					<div className="mt-2">
						<Link
							to="/solution/v2/loan-applications/maker-inbox"
							className="text-blue-600 hover:underline"
						>
							Back to V2 maker inbox
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
					<h1 className="text-2xl font-bold">V2 Maker review detail</h1>
					<p className="text-sm text-gray-700">{application.applicationNo}</p>
				</div>
				<Link
					to="/solution/v2/loan-applications/maker-inbox"
					className="text-sm border px-3 py-2 rounded hover:bg-gray-50"
				>
					Back to inbox
				</Link>
			</div>

			<section className="border rounded p-4 text-sm space-y-3">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
					<div className="font-semibold">Maker decision status</div>
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
					<Field label="Current status" value={application.status} />
				</div>
			</section>

			<section className="border rounded p-4 text-sm space-y-3">
				<div className="font-semibold">Maker actions</div>
				{canTakeDecision ? (
					<div className="flex gap-2 flex-wrap">
						<button
							type="button"
							onClick={handleApprove}
							className="px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
						>
							Approve
						</button>
						<button
							type="button"
							onClick={handleReject}
							className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
						>
							Reject
						</button>
						<button
							type="button"
							onClick={handleSubmitToChecker}
							className="px-4 py-2 rounded border hover:bg-gray-50"
						>
							Submit to checker
						</button>
					</div>
				) : (
					<div className="text-sm text-gray-600">
						Maker actions are available only for applications waiting in V2 maker inbox.
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
