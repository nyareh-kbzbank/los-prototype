import { useEffect, useState } from "react";

type FieldDefinition = {
	id: string;
	key: string;
	label: string;
	description: string;
	defaultValue: number;
};

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

export type FormulaSetup = {
	principalFormula: string;
	interestFormula: string;
	fieldDefinitions: FieldDefinition[];
};

export type RepaymentSetupTabState = {
	form: RepaymentSetupForm;
	formulaSetup: FormulaSetup;
};

type FormulaTestResult = {
	installment: number;
	totalInterest: number;
	totalPayment: number;
	schedule: Array<{
		period: number;
		date: Date;
		payment: number;
		principal: number;
		interest: number;
		balance: number;
	}>;
	error: string | null;
};

const createId = () =>
	`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const isValidFieldKey = (key: string) => /^[A-Za-z_]\w*$/.test(key);

const coreFieldDefinitions: Array<{
	key: string;
	label: string;
	description: string;
}> = [
	{
		key: "principal",
		label: "Principal",
		description: "Original loan amount.",
	},
	{
		key: "balance",
		label: "Balance",
		description: "Outstanding balance before current payment.",
	},
	{
		key: "rateMonthly",
		label: "Monthly Rate",
		description: "Monthly interest rate in decimal (annualRate/12/100).",
	},
	{
		key: "rateAnnual",
		label: "Annual Rate",
		description: "Annual interest rate in decimal (annualRate/100).",
	},
	{
		key: "period",
		label: "Period",
		description: "Current installment number starting at 1.",
	},
	{
		key: "tenureMonths",
		label: "Tenure Months",
		description: "Total tenure converted to months.",
	},
	{
		key: "remainingMonths",
		label: "Remaining Months",
		description: "Installments left including current period.",
	},
	{
		key: "baseEmi",
		label: "Base EMI",
		description: "Standard reducing-balance EMI reference value.",
	},
	{
		key: "prevPayment",
		label: "Previous Payment",
		description: "Previous period payment amount.",
	},
	{
		key: "prevPrincipal",
		label: "Previous Principal",
		description: "Previous period principal component.",
	},
	{
		key: "prevInterest",
		label: "Previous Interest",
		description: "Previous period interest component.",
	},
];

function parseIsoDate(dateString: string) {
	const parsed = new Date(`${dateString}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}
	return parsed;
}

function addDays(baseDate: Date, days: number) {
	const next = new Date(baseDate);
	next.setDate(next.getDate() + Math.max(0, days));
	return next;
}

function buildDueDateForMonth(year: number, month: number, dueDay: number) {
	const maxDay = new Date(year, month + 1, 0).getDate();
	return new Date(year, month, Math.min(Math.max(1, dueDay), maxDay));
}

function resolveMonthlyLikeDueDate(tentativeDate: Date, dueDay: number) {
	const sameMonthDueDate = buildDueDateForMonth(
		tentativeDate.getFullYear(),
		tentativeDate.getMonth(),
		dueDay,
	);

	if (tentativeDate.getTime() <= sameMonthDueDate.getTime()) {
		return sameMonthDueDate;
	}

	return buildDueDateForMonth(
		tentativeDate.getFullYear(),
		tentativeDate.getMonth() + 1,
		dueDay,
	);
}

function buildPaymentDates(
	startDate: Date,
	installments: number,
	repaymentSetup: Pick<
		RepaymentSetupForm,
		"frequency" | "dueDayOfMonth" | "firstDueAfterDays" | "firstDueAfterDueDayDays"
	>,
) {
	const paymentDates: Date[] = [];
	const dueDay = repaymentSetup.dueDayOfMonth ?? 1;

	if (installments <= 0) {
		return paymentDates;
	}

	if (
		repaymentSetup.frequency === "WEEKLY" ||
		repaymentSetup.frequency === "BIWEEKLY"
	) {
		const intervalDays = repaymentSetup.frequency === "WEEKLY" ? 7 : 14;
		const firstDate = addDays(
			startDate,
			repaymentSetup.firstDueAfterDays + repaymentSetup.firstDueAfterDueDayDays,
		);
		for (let index = 0; index < installments; index += 1) {
			paymentDates.push(addDays(firstDate, intervalDays * index));
		}
		return paymentDates;
	}

	const firstTentativeDate = addDays(startDate, repaymentSetup.firstDueAfterDays);
	const firstBaseDate = resolveMonthlyLikeDueDate(firstTentativeDate, dueDay);
	const firstDate = addDays(firstBaseDate, repaymentSetup.firstDueAfterDueDayDays);
	paymentDates.push(firstDate);

	const monthStep = repaymentSetup.frequency === "QUARTERLY" ? 3 : 1;
	for (let index = 1; index < installments; index += 1) {
		const targetMonthDate = buildDueDateForMonth(
			firstBaseDate.getFullYear(),
			firstBaseDate.getMonth() + monthStep * index,
			dueDay,
		);
		paymentDates.push(targetMonthDate);
	}

	return paymentDates;
}

function evaluateFormulaExpression(
	expression: string,
	context: Record<string, number>,
) {
	const trimmed = expression.trim();
	if (!trimmed) throw new Error("Formula is required.");
	const keys = Object.keys(context).filter(isValidFieldKey);
	const values = keys.map((key) => context[key] ?? 0);
	const fn = new Function(
		...keys,
		"const min=Math.min; const max=Math.max; const abs=Math.abs; const round=Math.round; const floor=Math.floor; const ceil=Math.ceil; const pow=Math.pow; const sqrt=Math.sqrt; const log=Math.log; const exp=Math.exp; return (" +
			trimmed +
			");",
	) as (...args: number[]) => number;
	const result = Number(fn(...values));
	if (!Number.isFinite(result)) {
		throw new TypeError("Formula result is invalid.");
	}
	return result;
}

function runFormulaTest(
	principalAmount: number,
	annualRate: number,
	tenureMonths: number,
	startDateIso: string,
	repaymentSetup: Pick<
		RepaymentSetupForm,
		"frequency" | "dueDayOfMonth" | "firstDueAfterDays" | "firstDueAfterDueDayDays"
	>,
	formulaSetup: FormulaSetup,
	customFieldValues: Record<string, number>,
): FormulaTestResult {
	const scheduleStartDate = parseIsoDate(startDateIso);
	if (!scheduleStartDate) {
		return {
			installment: 0,
			totalInterest: 0,
			totalPayment: 0,
			schedule: [],
			error: "Start date is required.",
		};
	}

	if (principalAmount <= 0 || tenureMonths <= 0) {
		return {
			installment: 0,
			totalInterest: 0,
			totalPayment: 0,
			schedule: [],
			error: "Loan amount and tenure must be positive.",
		};
	}
	if (
		!formulaSetup.principalFormula.trim() ||
		!formulaSetup.interestFormula.trim()
	) {
		return {
			installment: 0,
			totalInterest: 0,
			totalPayment: 0,
			schedule: [],
			error: "Principal and interest formulas are required.",
		};
	}

	try {
		const rateMonthly = annualRate / 12 / 100;
		const rateAnnual = annualRate / 100;
		const baseEmi =
			rateMonthly <= 0
				? principalAmount / tenureMonths
				: (principalAmount * rateMonthly * (1 + rateMonthly) ** tenureMonths) /
					((1 + rateMonthly) ** tenureMonths - 1);

		let remainingBalance = principalAmount;
		let totalPayment = 0;
		let totalInterest = 0;
		let prevPayment = 0;
		let prevPrincipal = 0;
		let prevInterest = 0;
		let firstInstallment = 0;
		const schedule: FormulaTestResult["schedule"] = [];
		const paymentDates = buildPaymentDates(
			scheduleStartDate,
			tenureMonths,
			repaymentSetup,
		);

		for (let period = 1; period <= tenureMonths; period += 1) {
			const paymentDate =
				paymentDates[period - 1] ??
				new Date(
					scheduleStartDate.getFullYear(),
					scheduleStartDate.getMonth() + period,
					scheduleStartDate.getDate(),
				);

			const context: Record<string, number> = {
				principal: principalAmount,
				balance: remainingBalance,
				rateMonthly,
				rateAnnual,
				period,
				tenureMonths,
				remainingMonths: tenureMonths - period + 1,
				baseEmi,
				prevPayment,
				prevPrincipal,
				prevInterest,
			};

			for (const field of formulaSetup.fieldDefinitions) {
				if (!isValidFieldKey(field.key)) continue;
				context[field.key] = customFieldValues[field.key] ?? field.defaultValue;
			}

			const interestValue = Math.max(
				0,
				evaluateFormulaExpression(formulaSetup.interestFormula, context),
			);
			let principalValue = Math.max(
				0,
				evaluateFormulaExpression(formulaSetup.principalFormula, context),
			);

			if (principalValue > remainingBalance) {
				principalValue = remainingBalance;
			}

			let payment = principalValue + interestValue;
			if (period === tenureMonths && remainingBalance - principalValue > 0) {
				const residual = remainingBalance - principalValue;
				principalValue += residual;
				payment += residual;
			}

			remainingBalance -= principalValue;
			totalPayment += payment;
			totalInterest += interestValue;
			prevPayment = payment;
			prevPrincipal = principalValue;
			prevInterest = interestValue;
			schedule.push({
				period,
				date: paymentDate,
				payment,
				principal: principalValue,
				interest: interestValue,
				balance: Math.max(0, remainingBalance),
			});
			if (period === 1) firstInstallment = payment;
		}

		return {
			installment: firstInstallment,
			totalInterest,
			totalPayment,
			schedule,
			error: null,
		};
	} catch (error) {
		return {
			installment: 0,
			totalInterest: 0,
			totalPayment: 0,
			schedule: [],
			error:
				error instanceof Error ? error.message : "Unable to evaluate formulas.",
		};
	}
}

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
	formulaSetup: {
		principalFormula: "max(0, baseEmi - (balance * rateMonthly))",
		interestFormula: "balance * rateMonthly",
		fieldDefinitions: [],
	},
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
	const [formulaSetup, setFormulaSetup] = useState<FormulaSetup>(
		state?.formulaSetup ?? {
			principalFormula: "max(0, baseEmi - (balance * rateMonthly))",
			interestFormula: "balance * rateMonthly",
			fieldDefinitions: [],
		},
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
	const [testResult, setTestResult] = useState<FormulaTestResult | null>(null);
	const [showPredefinedFields, setShowPredefinedFields] = useState(false);

	useEffect(() => {
		onStateChange?.({
			form,
			formulaSetup,
		});
	}, [form, formulaSetup, onStateChange]);

	const formatNumber = (value: number) =>
		value.toLocaleString(undefined, { maximumFractionDigits: 2 });

	const addFieldDefinition = () => {
		setFormulaSetup((prev) => ({
			...prev,
			fieldDefinitions: [
				...prev.fieldDefinitions,
				{
					id: createId(),
					key: "",
					label: "",
					description: "",
					defaultValue: 0,
				},
			],
		}));
	};

	const updateFieldDefinition = (
		fieldId: string,
		field: "key" | "label" | "description" | "defaultValue",
		value: string,
	) => {
		setFormulaSetup((prev) => ({
			...prev,
			fieldDefinitions: prev.fieldDefinitions.map((item) => {
				if (item.id !== fieldId) return item;
				if (field === "defaultValue") {
					const parsed = Number(value);
					return {
						...item,
						defaultValue: Number.isFinite(parsed) ? parsed : item.defaultValue,
					};
				}
				return { ...item, [field]: value };
			}),
		}));
	};

	const removeFieldDefinition = (fieldId: string) => {
		setFormulaSetup((prev) => ({
			...prev,
			fieldDefinitions: prev.fieldDefinitions.filter(
				(item) => item.id !== fieldId,
			),
		}));
	};

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
		const result = runFormulaTest(
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
		setTestResult(result);
	};

	return (
		<div className="space-y-4">
			<section className="border rounded-lg p-5 space-y-4">
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-lg font-semibold">Repayment Setup</h2>
						<div className="text-xs text-gray-600">
							Define repayment rules only for this V2 loan setup.
						</div>
					</div>
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

			<section className="border rounded-lg p-5 space-y-4">
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-lg font-semibold">Custom Formula</h2>
						<div className="text-xs text-gray-600">
							Custom formula fields based on EMI custom calculator format.
						</div>
					</div>
					<button
						type="button"
						onClick={openTestDialog}
						className="text-sm border px-3 py-2 rounded hover:bg-gray-50"
					>
						Test Calculate
					</button>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label className="flex flex-col gap-1 text-sm">
						<span>Principal Formula</span>
						<textarea
							value={formulaSetup.principalFormula}
							onChange={(event) =>
								setFormulaSetup((prev) => ({
									...prev,
									principalFormula: event.target.value,
								}))
							}
							rows={4}
							className="border rounded px-2 py-2 font-mono text-sm"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm">
						<span>Interest Formula</span>
						<textarea
							value={formulaSetup.interestFormula}
							onChange={(event) =>
								setFormulaSetup((prev) => ({
									...prev,
									interestFormula: event.target.value,
								}))
							}
							rows={4}
							className="border rounded px-2 py-2 font-mono text-sm"
						/>
					</label>
				</div>

				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<h3 className="text-sm font-medium">Custom Formula Fields</h3>
						<button
							type="button"
							onClick={addFieldDefinition}
							className="text-sm border px-3 py-1 rounded hover:bg-gray-50"
						>
							Add field
						</button>
					</div>
					{formulaSetup.fieldDefinitions.length === 0 ? (
						<div className="text-xs text-gray-600 border rounded p-2 bg-gray-50">
							No custom fields yet.
						</div>
					) : (
						<div className="space-y-2">
							{formulaSetup.fieldDefinitions.map((field) => (
								<div
									key={field.id}
									className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 items-end"
								>
									<input
										type="text"
										placeholder="Key"
										value={field.key}
										onChange={(event) =>
											updateFieldDefinition(field.id, "key", event.target.value)
										}
										className="border px-2 py-2 rounded min-w-0"
									/>
									<input
										type="text"
										placeholder="Label"
										value={field.label}
										onChange={(event) =>
											updateFieldDefinition(
												field.id,
												"label",
												event.target.value,
											)
										}
										className="border px-2 py-2 rounded min-w-0"
									/>
									<input
										type="text"
										placeholder="Description"
										value={field.description}
										onChange={(event) =>
											updateFieldDefinition(
												field.id,
												"description",
												event.target.value,
											)
										}
										className="border px-2 py-2 rounded min-w-0"
									/>
									<input
										type="number"
										placeholder="Default"
										value={field.defaultValue}
										onChange={(event) =>
											updateFieldDefinition(
												field.id,
												"defaultValue",
												event.target.value,
											)
										}
										className="border px-2 py-2 rounded min-w-0"
									/>
									<button
										type="button"
										onClick={() => removeFieldDefinition(field.id)}
										className="border px-2 py-2 rounded hover:bg-gray-50 sm:col-span-2 lg:col-span-1"
									>
										Remove
									</button>
								</div>
							))}
						</div>
					)}
				</div>

				<div className="rounded border p-3 bg-gray-50 space-y-2">
					<button
						type="button"
						onClick={() => setShowPredefinedFields((prev) => !prev)}
						className="w-full flex items-center justify-between text-left"
					>
						<h3 className="text-sm font-medium">Predefined Fields</h3>
						<span className="text-xs text-gray-600">
							{showPredefinedFields ? "Hide" : "Show"}
						</span>
					</button>
					{showPredefinedFields ? (
						<div className="overflow-x-auto border rounded bg-white">
							<table className="min-w-full text-sm text-left">
								<thead className="bg-gray-100">
									<tr>
										<th className="px-3 py-2 font-semibold">Field</th>
										<th className="px-3 py-2 font-semibold">Meaning</th>
									</tr>
								</thead>
								<tbody>
									{coreFieldDefinitions.map((field) => (
										<tr key={field.key} className="border-t">
											<td className="px-3 py-2 font-mono text-xs">{field.key}</td>
											<td className="px-3 py-2 text-xs text-gray-700">
												{field.description}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : null}
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
									Run sample calculation for current formula fields.
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
											<div className="text-xs text-gray-600">
												Total Interest
											</div>
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
															<th className="px-3 py-2 whitespace-nowrap">
																Payment Date
															</th>
															<th className="px-3 py-2 text-right whitespace-nowrap">
																Payment
															</th>
															<th className="px-3 py-2 text-right whitespace-nowrap">
																Principal
															</th>
															<th className="px-3 py-2 text-right whitespace-nowrap">
																Interest
															</th>
															<th className="px-3 py-2 text-right whitespace-nowrap">
																Outstanding
															</th>
														</tr>
													</thead>
													<tbody className="divide-y divide-gray-200">
														{testResult.schedule.map((row) => (
															<tr key={row.period} className="hover:bg-gray-50">
																<td className="px-3 py-2 text-gray-500">
																	{row.period}
																</td>
																<td className="px-3 py-2">
																	{new Intl.DateTimeFormat("en-US", {
																		year: "numeric",
																		month: "short",
																		day: "numeric",
																	}).format(row.date)}
																</td>
																<td className="px-3 py-2 text-right font-medium">
																	{formatNumber(row.payment)}
																</td>
																<td className="px-3 py-2 text-right text-gray-600">
																	{formatNumber(row.principal)}
																</td>
																<td className="px-3 py-2 text-right text-orange-600">
																	{formatNumber(row.interest)}
																</td>
																<td className="px-3 py-2 text-right text-gray-500">
																	{formatNumber(row.balance)}
																</td>
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
