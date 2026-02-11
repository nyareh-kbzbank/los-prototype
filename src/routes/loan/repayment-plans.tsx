import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
	getRepaymentPlanList,
	useRepaymentSetupStore,
} from "@/lib/repayment-setup-store";

export const Route = createFileRoute("/loan/repayment-plans")({
	component: RouteComponent,
});

function RouteComponent() {
	const plans = useRepaymentSetupStore((s) => s.plans);
	const selectedPlanId = useRepaymentSetupStore((s) => s.selectedPlanId);
	const removePlan = useRepaymentSetupStore((s) => s.removePlan);
	const planList = useMemo(() => getRepaymentPlanList(plans), [plans]);

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h1 className="text-2xl font-bold">Saved repayment plans</h1>
					<p className="text-sm text-gray-700">
						Review and manage plans used in Loan Setup.
					</p>
				</div>
				<div className="flex gap-2">
					<Link
						to="/loan/repayment-setup"
						className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
					>
						New plan
					</Link>
					<Link
						to="/loan/setup"
						className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
					>
						Back to Loan Setup
					</Link>
				</div>
			</div>

			<section className="border p-4 rounded">
				<div className="flex items-center justify-between mb-3">
					<h2 className="font-semibold">Plans</h2>
					<span className="text-xs text-gray-500">
						Select a plan in Loan Setup.
					</span>
				</div>
				{planList.length === 0 ? (
					<div className="text-sm text-gray-700">No plans yet.</div>
				) : (
					<div className="space-y-3">
						{planList.map((plan) => (
							<div
								key={plan.planId}
								className={`border rounded p-3 text-sm ${selectedPlanId === plan.planId ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
							>
								<div className="flex items-start justify-between gap-2">
									<div>
										<div className="font-semibold">{plan.name}</div>
										<div className="text-xs text-gray-600">{plan.method} · {plan.frequency}</div>
										{plan.description ? (
											<div className="text-xs text-gray-700 mt-1">{plan.description}</div>
										) : null}
									</div>
									<button
										type="button"
										onClick={() => removePlan(plan.planId)}
										className="text-sm border px-3 py-1 rounded hover:bg-gray-100"
									>
										Delete
									</button>
								</div>
								<dl className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs text-gray-700">
									<div>
										<dt>Due day</dt>
										<dd>{plan.dueDayOfMonth ?? "—"}</dd>
									</div>
									<div>
										<dt>Grace period</dt>
										<dd>{plan.gracePeriodDays} days</dd>
									</div>
									<div>
										<dt>Late fee</dt>
										<dd>{plan.lateFeeFlat.toLocaleString()} + {plan.lateFeePct}%</dd>
									</div>
									<div>
										<dt>Prepayment</dt>
										<dd>{plan.prepaymentPenaltyPct}%</dd>
									</div>
									<div>
										<dt>Rounding</dt>
										<dd>{plan.roundingStep}</dd>
									</div>
									<div>
										<dt>Autopay</dt>
										<dd>{plan.autopayRequired ? "Required" : "Optional"}</dd>
									</div>
								</dl>
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
