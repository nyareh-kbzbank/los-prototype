import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import type { ApplicationDecisionEvent } from "@/lib/loan-application-store";
import { useLoanApplicationStore } from "@/lib/loan-application-store";
import { useLoanSetupV2Store } from "@/lib/loan-setup-v2-store";

export const Route = createFileRoute("/solution/v2/loan-applications/$applicationId")({
	component: V2LoanApplicationDetail,
});

function V2LoanApplicationDetail() {
	const { applicationId } = Route.useParams();
	const application = useLoanApplicationStore((state) => state.applications[applicationId]);
	const v2Setups = useLoanSetupV2Store((state) => state.setups);

	const isV2Application = Boolean(application && v2Setups[application.setupId]);

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

	const collateralValueLabel = useMemo(() => {
		if (application?.collateralEstimatedValue == null) return "—";
		return application.collateralEstimatedValue.toLocaleString();
	}, [application?.collateralEstimatedValue]);

	const showCollateralFields = useMemo(
		() =>
			Boolean(
				application?.collateralType ||
				application?.collateralEstimatedValue !== null ||
				application?.collateralDescription ||
				application?.valuationReportReference,
			),
		[
			application?.collateralDescription,
			application?.collateralEstimatedValue,
			application?.collateralType,
			application?.valuationReportReference,
		],
	);

	const decisionWorkflowHistory = useMemo(() => {
		const history = [...(application?.decisionHistory ?? [])];
		history.sort((a, b) => a.occurredAt - b.occurredAt);
		return history;
	}, [application?.decisionHistory]);

	const lastDecisionEvent = decisionWorkflowHistory.at(-1);
	const decisionSummary = useMemo(
		() => getDecisionSummary(application?.status, lastDecisionEvent?.actor),
		[application?.status, lastDecisionEvent?.actor],
	);

	const isAutoOutcome = useMemo(() => {
		const decisionHistory = application?.decisionHistory ?? [];
		return (
			decisionHistory.length === 0 &&
			(application?.status === "APPROVED" || application?.status === "REJECTED")
		);
	}, [application?.decisionHistory, application?.status]);

	const decisionWorkflowHistoryContent = getDecisionWorkflowHistoryContent(
		isAutoOutcome,
		decisionWorkflowHistory,
	);

	if (!application || !isV2Application) {
		return (
			<div className="p-6 font-sans max-w-3xl mx-auto">
				<div className="border rounded p-4 bg-red-50 text-sm text-gray-800">
					V2 application not found.
					<div className="mt-2">
						<Link
							to="/solution/v2/loan-applications"
							className="text-blue-600 hover:underline"
						>
							Back to V2 list
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
					<h1 className="text-2xl font-bold">V2 Application detail</h1>
					<p className="text-sm text-gray-700">
						{application.productName ?? "Loan product"} · {application.productCode}
					</p>
					<p className="text-xs text-gray-600 font-mono">
						Application #: {application.applicationNo}
					</p>
				</div>
				<Link
					to="/solution/v2/loan-applications"
					className="text-sm border px-3 rounded hover:bg-gray-50"
				>
					Back to V2 list
				</Link>
			</div>

			<section className="border rounded p-4 text-sm space-y-3">
				<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
					<div className="font-semibold">Decision outcome</div>
					<span
						className={`text-xs px-2 py-1 rounded-full border ${decisionSummary.badge}`}
					>
						{decisionSummary.title}
					</span>
				</div>
				<div className="text-xs text-gray-600">{decisionSummary.detail}</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
					<Field label="Application #" value={application.applicationNo} />
					<Field label="Beneficiary" value={application.beneficiaryName} />
					<Field label="National ID" value={application.nationalId} />
					<Field label="Age" value={application.age ?? "—"} />
					<Field label="Gender" value={application.gender || "—"} />
					<Field label="Marital status" value={application.maritalStatus || "—"} />
					<Field label="Education" value={application.education || "—"} />
					<Field
						label={
							application.destinationType === "BANK"
								? "Bank account no"
								: "Phone no (KPay)"
						}
						value={
							application.destinationType === "BANK"
								? application.bankAccountNo || "—"
								: application.kpayPhoneNo || application.phone || "—"
						}
					/>
					<Field
						label="Monthly income"
						value={
							application.monthlyIncome === null
								? "—"
								: application.monthlyIncome.toLocaleString()
						}
					/>
					<Field
						label="DTI"
						value={
							application.debtToIncomeRatio === null
								? "—"
								: `${application.debtToIncomeRatio.toLocaleString()}%`
						}
					/>
					<Field label="Channel" value={application.channelCode || "—"} />
					<Field
						label="Requested amount"
						value={application.requestedAmount.toLocaleString()}
					/>
					<Field
						label="Tenure"
						value={
							application.tenureValue
								? `${application.tenureValue} ${application.tenureUnit || ""}`
								: "—"
						}
					/>
					<Field label="Destination" value={application.destinationType} />
					<Field label="Setup ID" value={application.setupId} />
					<Field label="Score result" value={scoreLabel} />
					{showCollateralFields ? (
						<Field
							label="Collateral type"
							value={application.collateralType || "—"}
						/>
					) : null}
					{showCollateralFields ? (
						<Field label="Collateral value" value={collateralValueLabel} />
					) : null}
					{showCollateralFields ? (
						<Field
							label="Valuation report reference"
							value={application.valuationReportReference || "—"}
						/>
					) : null}
					{showCollateralFields ? (
						<Field
							label="Collateral description"
							value={application.collateralDescription || "—"}
						/>
					) : null}
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

			{isAutoOutcome ? null : (
				<section className="border rounded p-4 text-sm space-y-3">
					<div>
						<div className="font-semibold">Maker / Checker workflow history</div>
						<div className="text-xs text-gray-600">
							Decision trail through maker and checker review.
						</div>
					</div>
					{decisionWorkflowHistoryContent}
				</section>
			)}

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

function DecisionHistoryItem({
	event,
}: Readonly<{ event: ApplicationDecisionEvent }>) {
	const actorLabel =
		event.note === "Entered maker inbox" && event.actor === "SYSTEM"
			? "CUSTOMER"
			: event.actor;

	return (
		<div className="flex items-start justify-between gap-2 border rounded p-3 bg-white">
			<div className="space-y-1">
				<div className="font-semibold">{event.note}</div>
				<div className="text-xs text-gray-600">
					Actor: {actorLabel} · {event.fromStatus ?? "NONE"} → {event.toStatus}
				</div>
			</div>
			<span className="text-xs text-gray-600 whitespace-nowrap">
				{new Date(event.occurredAt).toLocaleString()}
			</span>
		</div>
	);
}

function getDecisionWorkflowHistoryContent(
	isAutoOutcome: boolean,
	decisionWorkflowHistory: ApplicationDecisionEvent[],
) {
	if (isAutoOutcome) {
		return (
			<div className="border rounded p-3 bg-gray-50 text-gray-700">
				None — this application was auto-approved or auto-rejected.
			</div>
		);
	}

	if (decisionWorkflowHistory.length === 0) {
		return (
			<div className="border rounded p-3 bg-gray-50 text-gray-700">
				No maker/checker workflow events yet.
			</div>
		);
	}

	return (
		<div className="space-y-2">
			{decisionWorkflowHistory.map((event, idx) => (
				<DecisionHistoryItem
					key={`${event.occurredAt}-${event.toStatus}-${idx}`}
					event={event}
				/>
			))}
		</div>
	);
}

function getDecisionSummary(
	status: string | undefined,
	actor: ApplicationDecisionEvent["actor"] | undefined,
) {
	if (status === "APPROVED") {
		if (actor === "MAKER") {
			return {
				title: "Approved by Maker",
				detail: "The application was approved by maker during manual review.",
				badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
			};
		}
		if (actor === "CHECKER") {
			return {
				title: "Approved by Checker",
				detail:
					"The application was approved by checker after maker submission.",
				badge: "bg-teal-50 text-teal-700 border-teal-200",
			};
		}
		return {
			title: "Auto-Approved",
			detail: "The application is approved automatically by setup decision rules.",
			badge: "bg-green-50 text-green-700 border-green-200",
		};
	}

	if (status === "REJECTED") {
		if (actor === "MAKER") {
			return {
				title: "Rejected by Maker",
				detail: "The application was rejected by maker during manual review.",
				badge: "bg-rose-50 text-rose-700 border-rose-200",
			};
		}
		if (actor === "CHECKER") {
			return {
				title: "Rejected by Checker",
				detail:
					"The application was rejected by checker after maker submission.",
				badge: "bg-red-50 text-red-700 border-red-200",
			};
		}
		return {
			title: "Auto-Rejected",
			detail: "The application is rejected automatically by setup decision rules.",
			badge: "bg-red-50 text-red-700 border-red-200",
		};
	}

	if (status === "SUBMITTED") {
		return {
			title: "Manual Review Required",
			detail: "The application is submitted for manual underwriter review.",
			badge: "bg-yellow-50 text-yellow-800 border-yellow-200",
		};
	}

	if (status === "CHECKER_PENDING") {
		return {
			title: "Submitted to Checker",
			detail: "Maker has submitted this application to checker for final decision.",
			badge: "bg-blue-50 text-blue-700 border-blue-200",
		};
	}

	return {
		title: "Draft",
		detail: "The application is still in draft state.",
		badge: "bg-gray-50 text-gray-700 border-gray-200",
	};
}
