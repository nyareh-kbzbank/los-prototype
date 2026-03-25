import { useEffect, useState } from "react";
import { buildV2RepaymentSchedulePreview } from "@/lib/v2-repayment-preview";
import { createDefaultFormulaSetup, type FormulaSetup } from "./setup-types";

export type RepaymentSetupForm = {
	methodName: string;
	frequency: "WEEKLY" | "BIWEEKLY" | "MONTHLY" | "QUARTERLY";
	dueDayOfMonth: number | null;
	firstDueAfterDays: number;
	firstDueAfterDueDayDays: number;
	gracePeriodDays: number;
	lateFeeFlat: number;
	lateFeePct: number;
	prepaymentPenaltyPct: number;
	autopayRequired: boolean;
	minInstallmentAmount: number | null;
	description: string;
};

export type RepaymentSetupTabState = {
	form: RepaymentSetupForm;
	formulaSetup: FormulaSetup;
};

const emptyForm: RepaymentSetupForm = {
	methodName: "",
	frequency: "MONTHLY",
	dueDayOfMonth: 5,
	firstDueAfterDays: 30,
	firstDueAfterDueDayDays: 0,
	gracePeriodDays: 5,
	lateFeeFlat: 0,
	lateFeePct: 0,
	prepaymentPenaltyPct: 0,
	autopayRequired: false,
	minInstallmentAmount: null,
	description: "",
};

export const createDefaultRepaymentSetupTabState = (): RepaymentSetupTabState => ({
	form: emptyForm,
	formulaSetup: createDefaultFormulaSetup(),
});

type RepaymentSetupTabProps = {
	state?: RepaymentSetupTabState;
	onStateChange?: (value: RepaymentSetupTabState) => void;
};

export function RepaymentSetupTab({
	state,
	onStateChange,
}: Readonly<RepaymentSetupTabProps>) {
	const [form, setForm] = useState<RepaymentSetupForm>(
		state?.form ?? emptyForm,
	);
	const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
	const [testAmount, setTestAmount] = useState(500000);
	const [testRate, setTestRate] = useState(18.5);
	const [testTenureMonths, setTestTenureMonths] = useState(12);
	const [testStartDateIso, setTestStartDateIso] = useState<string>(() => {
		const today = new Date();
		const yyyy = today.getFullYear();
		const mm = String(today.getMonth() + 1).padStart(2, "0");
		const dd = String(today.getDate()).padStart(2, "0");
		return `${yyyy}-${mm}-${dd}`;
	});
	const [testCustomFieldValues, setTestCustomFieldValues] = useState<
		Record<string, number>
	>({});
	const [testResult, setTestResult] = useState<{
		installment: number;
		totalInterest: number;
		totalPayment: number;
		schedule: ReturnType<typeof buildV2RepaymentSchedulePreview>["schedule"];
		error: string | null;
	} | null>(null);
	const formulaSetup = state?.formulaSetup ?? createDefaultFormulaSetup();

	useEffect(() => {
		onStateChange?.({
			form,
			formulaSetup,
		});
	}, [form, formulaSetup, onStateChange]);

	const formatNumber = (value: number) =>
		value.toLocaleString(undefined, { maximumFractionDigits: 2 });

	const openTestDialog = () => {
		setTestCustomFieldValues((prev) => {
			const next: Record<string, number> = {};
			for (const field of formulaSetup.fieldDefinitions) {
				next[field.key] = prev[field.key] ?? field.defaultValue;
			}
			return next;
		});
		setTestResult(null);
		setIsTestDialogOpen(true);
	};

	const runTestCalculation = () => {
		const preview = buildV2RepaymentSchedulePreview(
			testAmount,
			testRate,
			Math.max(1, testTenureMonths),
			testStartDateIso,
			{
				frequency: form.frequency,
				dueDayOfMonth: form.dueDayOfMonth,
				firstDueAfterDays: form.firstDueAfterDays,
				firstDueAfterDueDayDays: form.firstDueAfterDueDayDays,
			},
			formulaSetup,
			testCustomFieldValues,
		);
		const totalInterest = preview.schedule.reduce(
			(sum, row) => sum + row.interest,
			0,
		);
		const totalPayment = preview.schedule.reduce(
			(sum, row) => sum + row.payment,
			0,
		);
		setTestResult({
			installment: preview.schedule[0]?.payment ?? 0,
			totalInterest,
			totalPayment,
			schedule: preview.schedule,
			error: preview.error,
		});
	};

	return (
		<div className="space-y-4">
			<section className="border rounded-lg p-5 space-y-4">
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					{/* <div>
						<h2 className="text-lg font-semibold">Repayment Setup</h2>
						<div className="text-xs text-gray-600">
							Define repayment rules only for this V2 loan setup.
						</div>
					</div> */}
          <div></div>
					<button
						type="button"
						onClick={openTestDialog}
						className="text-sm border px-3 py-2 rounded hover:bg-gray-50 float-right"
					>
						Test Calculate
					</button>
				</div>

				<div className="space-y-3">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
						<label className="flex flex-col gap-1 text-sm">
							<span>Method Name</span>
							<input
								type="text"
								value={form.methodName}
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										methodName: event.target.value,
									}))
								}
								className="border px-2 py-2 rounded"
								placeholder="Description only"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span>Frequency</span>
							<select
								value={form.frequency}
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										frequency: event.target.value as typeof prev.frequency,
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
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										dueDayOfMonth: event.target.value
											? Number(event.target.value)
											: null,
									}))
								}
								className="border px-2 py-2 rounded disabled:bg-gray-100 disabled:text-gray-500"
								placeholder="e.g. 5"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span>First due after (days)</span>
							<input
								type="number"
								min={0}
								value={form.firstDueAfterDays ?? ""}
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										firstDueAfterDays: Number(event.target.value),
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
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										gracePeriodDays: Number(event.target.value),
									}))
								}
								className="border px-2 py-2 rounded"
								placeholder="5"
							/>
						</label>
            <div></div>
						<label className="flex flex-col gap-1 text-sm">
							<span>Late fee flat</span>
							<input
								type="number"
								min={0}
								value={form.lateFeeFlat ?? ""}
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										lateFeeFlat: Number(event.target.value),
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
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										lateFeePct: Number(event.target.value),
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
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										prepaymentPenaltyPct: Number(event.target.value),
									}))
								}
								className="border px-2 py-2 rounded"
								placeholder="2"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span>Min installment amount</span>
							<input
								type="number"
								min={0}
								value={form.minInstallmentAmount ?? ""}
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										minInstallmentAmount: event.target.value
											? Number(event.target.value)
											: null,
									}))
								}
								className="border px-2 py-2 rounded"
								placeholder="optional"
							/>
						</label>
						<label className="inline-flex items-center gap-2 text-sm mt-6">
							<input
								type="checkbox"
								checked={form.autopayRequired}
								onChange={(event) =>
									setForm((prev) => ({
										...prev,
										autopayRequired: event.target.checked,
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
							onChange={(event) =>
								setForm((prev) => ({
									...prev,
									description: event.target.value,
								}))
							}
							className="border px-2 py-2 rounded"
							rows={3}
							placeholder="Notes for ops team"
						/>
					</label>

				</div>
			</section>

			{isTestDialogOpen ? (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<button
						type="button"
						className="absolute inset-0 bg-black/40"
						onClick={() => setIsTestDialogOpen(false)}
						aria-label="Close test calculate dialog"
					/>
					<div className="relative w-full max-w-4xl mx-4 rounded bg-white shadow-lg border max-h-[90vh] overflow-hidden">
						<div className="flex items-center justify-between p-4 border-b">
							<div>
								<div className="text-lg font-semibold">Test Calculate</div>
								<div className="text-xs text-gray-600">
									Run sample calculation using the current formula and repayment timing.
								</div>
							</div>
							<button
								type="button"
								onClick={() => setIsTestDialogOpen(false)}
								className="border px-3 py-1 rounded hover:bg-gray-50"
							>
								Close
							</button>
						</div>

						<div className="p-4 space-y-4 overflow-y-auto max-h-[calc(90vh-72px)]">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
								<label className="flex flex-col gap-1 text-sm">
									<span>Loan Amount</span>
									<input
										type="number"
										min={0}
										value={testAmount}
										onChange={(event) =>
											setTestAmount(Number(event.target.value) || 0)
										}
										className="border px-2 py-2 rounded"
									/>
								</label>
								<label className="flex flex-col gap-1 text-sm">
									<span>Annual Rate (%)</span>
									<input
										type="number"
										step="0.1"
										min={0}
										value={testRate}
										onChange={(event) =>
											setTestRate(Number(event.target.value) || 0)
										}
										className="border px-2 py-2 rounded"
									/>
								</label>
								<label className="flex flex-col gap-1 text-sm">
									<span>Tenure (Months)</span>
									<input
										type="number"
										min={1}
										value={testTenureMonths}
										onChange={(event) =>
											setTestTenureMonths(Number(event.target.value) || 1)
										}
										className="border px-2 py-2 rounded"
									/>
								</label>
								<label className="flex flex-col gap-1 text-sm">
									<span>Start Date</span>
									<input
										type="date"
										value={testStartDateIso}
										onChange={(event) =>
											setTestStartDateIso(event.target.value)
										}
										className="border px-2 py-2 rounded"
									/>
								</label>
							</div>

							{formulaSetup.fieldDefinitions.length > 0 ? (
								<div className="space-y-2">
									<h3 className="text-sm font-medium">Custom Field Values</h3>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										{formulaSetup.fieldDefinitions.map((field) => (
											<label
												key={field.id}
												className="flex flex-col gap-1 text-sm"
											>
												<span>
													{field.label || field.key || "Custom field"}
												</span>
												<input
													type="number"
													value={
														testCustomFieldValues[field.key] ??
														field.defaultValue
													}
													onChange={(event) =>
														setTestCustomFieldValues((prev) => ({
															...prev,
															[field.key]: Number(event.target.value) || 0,
														}))
													}
													className="border px-2 py-2 rounded"
												/>
											</label>
										))}
									</div>
								</div>
							) : null}

							<div>
								<button
									type="button"
									onClick={runTestCalculation}
									className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
								>
									Calculate
								</button>
							</div>

							{testResult ? (
								<div className="border rounded p-3 bg-gray-50">
									<div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
										<div>
											<div className="text-xs text-gray-600">Installment</div>
											<div className="text-lg font-semibold">
												{formatNumber(testResult.installment)}
											</div>
										</div>
										<div>
											<div className="text-xs text-gray-600">Total Interest</div>
											<div className="text-lg font-semibold">
												{formatNumber(testResult.totalInterest)}
											</div>
										</div>
										<div>
											<div className="text-xs text-gray-600">Total Payment</div>
											<div className="text-lg font-semibold">
												{formatNumber(testResult.totalPayment)}
											</div>
										</div>
									</div>
									{testResult.error ? (
										<div className="text-sm text-red-700 mt-2">
											{testResult.error}
										</div>
									) : null}
									{testResult.schedule.length > 0 ? (
										<div className="mt-4">
											<h3 className="text-sm font-medium mb-2">
												Payment Schedule
											</h3>
											<div className="border rounded-lg overflow-x-auto bg-white">
												<table className="min-w-full text-sm text-left">
													<thead className="bg-gray-100 text-gray-700 font-semibold border-b">
														<tr>
															<th className="px-3 py-2 whitespace-nowrap">#</th>
															<th className="px-3 py-2 whitespace-nowrap">Payment Date</th>
															<th className="px-3 py-2 text-right whitespace-nowrap">Payment</th>
															<th className="px-3 py-2 text-right whitespace-nowrap">Principal</th>
															<th className="px-3 py-2 text-right whitespace-nowrap">Interest</th>
															<th className="px-3 py-2 text-right whitespace-nowrap">Outstanding</th>
														</tr>
													</thead>
													<tbody className="divide-y divide-gray-200">
														{testResult.schedule.map((row) => (
															<tr key={row.period} className="hover:bg-gray-50">
																<td className="px-3 py-2 text-gray-500">{row.period}</td>
																<td className="px-3 py-2">
																	{new Intl.DateTimeFormat("en-US", {
																		year: "numeric",
																		month: "short",
																		day: "numeric",
																	}).format(row.date)}
																</td>
																<td className="px-3 py-2 text-right font-medium">{formatNumber(row.payment)}</td>
																<td className="px-3 py-2 text-right text-gray-600">{formatNumber(row.principal)}</td>
																<td className="px-3 py-2 text-right text-orange-600">{formatNumber(row.interest)}</td>
																<td className="px-3 py-2 text-right text-gray-500">{formatNumber(row.balance)}</td>
															</tr>
														))}
													</tbody>
												</table>
											</div>
										</div>
									) : null}
								</div>
							) : null}
						</div>
					</div>
				</div>
			) : null}

		</div>
	);
}
