import { createFileRoute, Link } from "@tanstack/react-router";
import { type FormEvent, useMemo, useState } from "react";
import {
	getRepaymentPlanList,
	type RepaymentPlanInput,
	useRepaymentSetupStore,
} from "@/lib/repayment-setup-store";

export const Route = createFileRoute("/loan/repayment-setup")({
	component: RouteComponent,
});

const emptyForm: RepaymentPlanInput = {
	name: "",
	description: "",
	method: "EMI",
	frequency: "MONTHLY",
	dueDayOfMonth: 5,
	firstDueAfterDays: 30,
	gracePeriodDays: 5,
	lateFeeFlat: 0,
	lateFeePct: 0,
	prepaymentPenaltyPct: 0,
	autopayRequired: false,
	roundingStep: 100,
	minInstallmentAmount: null,
};

function RouteComponent() {
	const plans = useRepaymentSetupStore((s) => s.plans);
	const selectedPlanId = useRepaymentSetupStore((s) => s.selectedPlanId);
	const addPlan = useRepaymentSetupStore((s) => s.addPlan);
	const selectPlan = useRepaymentSetupStore((s) => s.selectPlan);
	const removePlan = useRepaymentSetupStore((s) => s.removePlan);
	const planList = useMemo(() => getRepaymentPlanList(plans), [plans]);

	const [form, setForm] = useState<RepaymentPlanInput>(emptyForm);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setError(null);
		try {
			const created = addPlan({
				...form,
				name: form.name.trim(),
				description: form.description?.trim() || "",
			});
			selectPlan(created.planId);
			setForm(emptyForm);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Unable to save plan");
		}
	};

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h1 className="text-2xl font-bold">Repayment Setup</h1>
					<p className="text-sm text-gray-700">
						Define repayment plans that can be reused in Loan Setup.
					</p>
				</div>
				<Link
					to="/loan/setup"
					className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
				>
					Back to Loan Setup
				</Link>
			</div>

			<div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
				<section className="border p-4 rounded">
					<div className="flex items-center justify-between mb-3">
						<h2 className="font-semibold">New repayment plan</h2>
					</div>
					<form className="space-y-3" onSubmit={handleSubmit}>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<label className="flex flex-col gap-1 text-sm">
								<span>Name</span>
								<input
									type="text"
									value={form.name}
									onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
									className="border px-2 py-2 rounded"
									placeholder="e.g. Monthly EMI"
									required
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>Method</span>
								<select
									value={form.method}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											method: e.target.value as typeof prev.method,
										}))
								}
									className="border px-2 py-2 rounded"
								>
									<option value="EMI">EMI (amortized)</option>
									<option value="INTEREST_ONLY">Interest only</option>
									<option value="BULLET">Bullet</option>
								</select>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>Frequency</span>
								<select
									value={form.frequency}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											frequency: e.target.value as typeof prev.frequency,
										}))
								}
									className="border px-2 py-2 rounded"
								>
									<option value="WEEKLY">Weekly</option>
									<option value="BIWEEKLY">Bi-weekly</option>
									<option value="MONTHLY">Monthly</option>
									<option value="QUARTERLY">Quarterly</option>
								</select>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>Due day (1-28, monthly)</span>
								<input
									type="number"
									min={1}
									max={28}
									value={form.dueDayOfMonth ?? ""}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											dueDayOfMonth: e.target.value ? Number(e.target.value) : null,
										}))
								}
									className="border px-2 py-2 rounded"
									placeholder="e.g. 5"
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>First due after (days)</span>
								<input
									type="number"
									min={0}
									value={form.firstDueAfterDays ?? ""}
									onChange={(e) =>
										setForm((prev) => ({
											...prev,
											firstDueAfterDays: Number(e.target.value),
										}))
								}
								className="border px-2 py-2 rounded"
								placeholder="30"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span>Grace period (days)</span>
							<input
								type="number"
								min={0}
								value={form.gracePeriodDays ?? ""}
								onChange={(e) =>
									setForm((prev) => ({
										...prev,
										gracePeriodDays: Number(e.target.value),
									}))
							}
							className="border px-2 py-2 rounded"
							placeholder="5"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Late fee flat</span>
						<input
							type="number"
							min={0}
							value={form.lateFeeFlat ?? ""}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									lateFeeFlat: Number(e.target.value),
								}))
							}
							className="border px-2 py-2 rounded"
							placeholder="0"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Late fee (%)</span>
						<input
							type="number"
							step={0.1}
							min={0}
							value={form.lateFeePct ?? ""}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									lateFeePct: Number(e.target.value),
								}))
							}
							className="border px-2 py-2 rounded"
							placeholder="1"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Prepayment penalty (%)</span>
						<input
							type="number"
							step={0.1}
							min={0}
							value={form.prepaymentPenaltyPct ?? ""}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									prepaymentPenaltyPct: Number(e.target.value),
								}))
							}
							className="border px-2 py-2 rounded"
							placeholder="2"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Rounding step</span>
						<input
							type="number"
							min={1}
							value={form.roundingStep ?? ""}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									roundingStep: Number(e.target.value),
								}))
							}
							className="border px-2 py-2 rounded"
							placeholder="100"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Min installment amount</span>
						<input
							type="number"
							min={0}
							value={form.minInstallmentAmount ?? ""}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									minInstallmentAmount: e.target.value ? Number(e.target.value) : null,
								}))
							}
							className="border px-2 py-2 rounded"
							placeholder="optional"
						/>
					</label>
					<label className="inline-flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={form.autopayRequired}
							onChange={(e) =>
								setForm((prev) => ({
									...prev,
									autopayRequired: e.target.checked,
								}))
							}
							className="accent-blue-600"
						/>
						<span>Autopay required</span>
					</label>
					</div>

					<label className="flex flex-col gap-1 text-sm">
						<span>Description</span>
						<textarea
							value={form.description}
							onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
							className="border px-2 py-2 rounded"
							rows={3}
							placeholder="Notes for ops team"
						/>
					</label>

					{error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">{error}</div>}

					<div className="flex justify-end">
						<button
							type="submit"
							className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
						>
							Save plan
						</button>
					</div>
					</form>
				</section>

				<section className="border p-4 rounded">
					<div className="flex items-center justify-between mb-3">
						<h2 className="font-semibold">Saved plans</h2>
						<span className="text-xs text-gray-500">Select to use in Loan Setup</span>
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
										<div className="flex gap-2">
											<button
												type="button"
												onClick={() => selectPlan(plan.planId)}
												className="text-sm border px-3 py-1 rounded hover:bg-gray-100"
											>
												Use
											</button>
											<button
												type="button"
												onClick={() => removePlan(plan.planId)}
												className="text-sm border px-3 py-1 rounded hover:bg-gray-100"
											>
												Delete
											</button>
										</div>
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
		</div>
	);
}
