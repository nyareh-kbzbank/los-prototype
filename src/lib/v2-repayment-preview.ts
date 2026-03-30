import type {
	RepaymentSetupForm,
} from "@/components/loan/v2/RepaymentSetupTab";
import {
	createDefaultFormulaSetup,
	type FormulaSetup,
} from "@/components/loan/v2/setup-types";

export type V2RepaymentScheduleRow = {
	period: number;
	date: Date;
	payment: number;
	principal: number;
	interest: number;
	balance: number;
};

export type V2RepaymentSchedulePreview = {
	schedule: V2RepaymentScheduleRow[];
	error: string | null;
};

export type OpenLineDrawdownEvent = {
	id: string;
	dateIso: string;
	amount: number;
};

export type OpenLineRepaymentEvent = {
	id: string;
	dateIso: string;
	principalAmount: number;
	interestAmount: number;
};

export type OpenLineLoanPreviewInput = {
	creditLimit: number;
	initialBorrowedAmount: number;
	startingInterestRate: number;
	drawPeriodYears: number;
	openDateIso: string;
	daysInYear: number;
	drawdowns: OpenLineDrawdownEvent[];
	repayments: OpenLineRepaymentEvent[];
	formulaSetup: FormulaSetup;
	customFieldValues: Record<string, number>;
};

export type OpenLineLoanPreviewRow = {
	date: Date;
	opening: number;
	drawdown: number;
	principalRepayment: number;
	closing: number;
	interest: number;
	interestRepayment: number;
	accruedInterest: number;
	totalPayment: number;
};

export type OpenLineLoanPreview = {
	rows: OpenLineLoanPreviewRow[];
	error: string | null;
};

const isValidFieldKey = (key: string) => /^[A-Za-z_]\w*$/.test(key);

const parseIsoDate = (dateString: string) => {
	const parsed = new Date(`${dateString}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) {
		return null;
	}
	return parsed;
};

const addDays = (baseDate: Date, days: number) => {
	const next = new Date(baseDate);
	next.setDate(next.getDate() + Math.max(0, days));
	return next;
};

const buildDueDateForMonth = (year: number, month: number, dueDay: number) => {
	const maxDay = new Date(year, month + 1, 0).getDate();
	return new Date(year, month, Math.min(Math.max(1, dueDay), maxDay));
};

const resolveMonthlyLikeDueDate = (tentativeDate: Date, dueDay: number) => {
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
};

const buildPaymentDates = (
	startDate: Date,
	installments: number,
	repaymentSetup: Pick<
		RepaymentSetupForm,
		"frequency" | "dueDayOfMonth" | "firstDueAfterDays" | "firstDueAfterDueDayDays"
	>,
) => {
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
	const firstDate = addDays(
		firstBaseDate,
		repaymentSetup.firstDueAfterDueDayDays,
	);
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
};

const evaluateFormulaExpression = (
	expression: string,
	context: Record<string, number>,
) => {
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
};

const getPreviewValidationError = (
	principalAmount: number,
	tenureMonths: number,
	startDateIso: string,
	formulaSetup: FormulaSetup,
) => {
	const scheduleStartDate = parseIsoDate(startDateIso);
	if (!scheduleStartDate) {
		return { scheduleStartDate: null, error: "Start date is required." };
	}
	if (principalAmount <= 0 || tenureMonths <= 0) {
		return {
			scheduleStartDate,
			error: "Loan amount and tenure must be positive.",
		};
	}
	if (!formulaSetup.principalFormula.trim()) {
		return {
			scheduleStartDate,
			error: "Principal formula is required.",
		};
	}
	if (!formulaSetup.interestFormula.trim()) {
		return {
			scheduleStartDate,
			error: "Interest formula is required.",
		};
	}
	return { scheduleStartDate, error: null };
};

const buildFormulaContext = ({
	principalAmount,
	remainingBalance,
	annualRate,
	period,
	tenureMonths,
	baseEmi,
	prevPayment,
	prevPrincipal,
	prevInterest,
	formulaSetup,
	customFieldValues,
}: {
	principalAmount: number;
	remainingBalance: number;
	annualRate: number;
	period: number;
	tenureMonths: number;
	baseEmi: number;
	prevPayment: number;
	prevPrincipal: number;
	prevInterest: number;
	formulaSetup: FormulaSetup;
	customFieldValues: Record<string, number>;
}) => {
	const rateMonthly = annualRate / 12 / 100;
	const rateAnnual = annualRate / 100;
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

	return context;
};

const buildScheduleRow = (
	remainingBalance: number,
	period: number,
	paymentDate: Date,
	formulaSetup: FormulaSetup,
	context: Record<string, number>,
) => {
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
	if (context.period === context.tenureMonths && remainingBalance - principalValue > 0) {
		const residual = remainingBalance - principalValue;
		principalValue += residual;
		payment += residual;
	}

	const nextBalance = Math.max(0, remainingBalance - principalValue);
	return {
		row: {
			period,
			date: paymentDate,
			payment,
			principal: principalValue,
			interest: interestValue,
			balance: nextBalance,
		},
		nextBalance,
		nextPayment: payment,
		nextPrincipal: principalValue,
		nextInterest: interestValue,
	};
};

export const buildV2RepaymentSchedulePreview = (
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
): V2RepaymentSchedulePreview => {
	const validation = getPreviewValidationError(
		principalAmount,
		tenureMonths,
		startDateIso,
		formulaSetup,
	);
	if (validation.error || !validation.scheduleStartDate) {
		return {
			schedule: [],
			error: validation.error,
		};
	}

	try {
		const rateMonthly = annualRate / 12 / 100;
		const baseEmi =
			rateMonthly <= 0
				? principalAmount / tenureMonths
				: (principalAmount * rateMonthly * (1 + rateMonthly) ** tenureMonths) /
					((1 + rateMonthly) ** tenureMonths - 1);

		let remainingBalance = principalAmount;
		let prevPayment = 0;
		let prevPrincipal = 0;
		let prevInterest = 0;
		const schedule: V2RepaymentScheduleRow[] = [];
		const paymentDates = buildPaymentDates(
			validation.scheduleStartDate,
			tenureMonths,
			repaymentSetup,
		);

		for (let period = 1; period <= tenureMonths; period += 1) {
			const paymentDate =
				paymentDates[period - 1] ??
				new Date(
					validation.scheduleStartDate.getFullYear(),
					validation.scheduleStartDate.getMonth() + period,
					validation.scheduleStartDate.getDate(),
				);
			const context = buildFormulaContext({
				principalAmount,
				remainingBalance,
				annualRate,
				period,
				tenureMonths,
				baseEmi,
				prevPayment,
				prevPrincipal,
				prevInterest,
				formulaSetup,
				customFieldValues,
			});
			const next = buildScheduleRow(
				remainingBalance,
				period,
				paymentDate,
				formulaSetup,
				context,
			);
			remainingBalance = next.nextBalance;
			prevPayment = next.nextPayment;
			prevPrincipal = next.nextPrincipal;
			prevInterest = next.nextInterest;
			schedule.push(next.row);
		}

		return {
			schedule,
			error: null,
		};
	} catch (error) {
		return {
			schedule: [],
			error:
				error instanceof Error ? error.message : "Unable to evaluate formulas.",
		};
	}
};

const normalizeDateKey = (date: Date) => date.toISOString().slice(0, 10);

const clampNonNegative = (value: number) =>
	Number.isFinite(value) ? Math.max(0, value) : 0;

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const buildOpenLineLoanPreview = (
	input: OpenLineLoanPreviewInput,
): OpenLineLoanPreview => {
	const openDate = parseIsoDate(input.openDateIso);
	if (!openDate) {
		return { rows: [], error: "Open date is required." };
	}

	const creditLimit = clampNonNegative(input.creditLimit);
	const daysInYear = Math.max(1, Math.round(clampNonNegative(input.daysInYear) || 365));
	const drawPeriodYears = Math.max(0, clampNonNegative(input.drawPeriodYears));
	const totalDays = Math.max(1, Math.round(drawPeriodYears * daysInYear));
	const annualRate = clampNonNegative(input.startingInterestRate) / 100;
	const annualRatePercentage = clampNonNegative(input.startingInterestRate);
	const dailyRate = annualRate / daysInYear;
	const openLineFormulas =
		input.formulaSetup.openLineFormulas ??
		createDefaultFormulaSetup().openLineFormulas;

	if (!openLineFormulas.closingPrincipalFormula.trim()) {
		return { rows: [], error: "Closing principal formula is required." };
	}
	if (!openLineFormulas.dailyInterestFormula.trim()) {
		return { rows: [], error: "Daily interest formula is required." };
	}
	if (!openLineFormulas.accruedInterestFormula.trim()) {
		return { rows: [], error: "Accrued interest formula is required." };
	}
	if (!openLineFormulas.totalPaymentFormula.trim()) {
		return { rows: [], error: "Total payment formula is required." };
	}

	const drawdownByDate = new Map<string, number>();
	for (const event of input.drawdowns) {
		const parsedDate = parseIsoDate(event.dateIso);
		if (!parsedDate) continue;
		const key = normalizeDateKey(parsedDate);
		drawdownByDate.set(
			key,
			(drawdownByDate.get(key) ?? 0) + clampNonNegative(event.amount),
		);
	}

	const principalRepaymentByDate = new Map<string, number>();
	const interestRepaymentByDate = new Map<string, number>();
	for (const event of input.repayments) {
		const parsedDate = parseIsoDate(event.dateIso);
		if (!parsedDate) continue;
		const key = normalizeDateKey(parsedDate);
		principalRepaymentByDate.set(
			key,
			(principalRepaymentByDate.get(key) ?? 0) +
				clampNonNegative(event.principalAmount),
		);
		interestRepaymentByDate.set(
			key,
			(interestRepaymentByDate.get(key) ?? 0) +
				clampNonNegative(event.interestAmount),
		);
	}

	const rows: OpenLineLoanPreviewRow[] = [];
	let outstandingPrincipal = Math.min(
		creditLimit,
		clampNonNegative(input.initialBorrowedAmount),
	);
	let accruedInterest = 0;
	let prevClosingPrincipal = outstandingPrincipal;
	let prevAccruedInterest = accruedInterest;
	let prevTotalPayment = 0;

	try {
		for (let index = 0; index < totalDays; index += 1) {
			const date = addDays(openDate, index);
			const key = normalizeDateKey(date);
			const opening = outstandingPrincipal;

			const requestedDrawdown = drawdownByDate.get(key) ?? 0;
			const drawdown = Math.min(
				requestedDrawdown,
				Math.max(0, creditLimit - opening),
			);

			const principalAfterDrawdown = opening + drawdown;
			const requestedPrincipalRepayment = principalRepaymentByDate.get(key) ?? 0;
			const principalRepayment = Math.min(
				requestedPrincipalRepayment,
				principalAfterDrawdown,
			);
			const principalAfterRepayment = Math.max(
				0,
				principalAfterDrawdown - principalRepayment,
			);

			const requestedInterestRepayment = interestRepaymentByDate.get(key) ?? 0;
			const interestRepayment = Math.min(requestedInterestRepayment, accruedInterest);

			const context: Record<string, number> = {
				openingPrincipal: opening,
				drawdownAmount: drawdown,
				principalRepayment,
				interestRepayment,
				openingAccruedInterest: accruedInterest,
				principalAfterDrawdown,
				principalAfterRepayment,
				creditLimit,
				availableLimit: Math.max(0, creditLimit - opening),
				annualRate: annualRatePercentage,
				daysInYear,
				dailyRate,
				dayIndex: index + 1,
				daysFromOpen: index,
				prevClosingPrincipal,
				prevAccruedInterest,
				prevTotalPayment,
			};

			for (const field of input.formulaSetup.fieldDefinitions) {
				if (!isValidFieldKey(field.key)) continue;
				context[field.key] =
					input.customFieldValues[field.key] ?? field.defaultValue;
			}

			const closingPrincipal = Math.max(
				0,
				evaluateFormulaExpression(
					openLineFormulas.closingPrincipalFormula,
					context,
				),
			);
			context.closingPrincipal = closingPrincipal;

			const dailyInterest = Math.max(
				0,
				evaluateFormulaExpression(openLineFormulas.dailyInterestFormula, context),
			);
			context.dailyInterest = dailyInterest;

			const nextAccruedInterest = Math.max(
				0,
				evaluateFormulaExpression(
					openLineFormulas.accruedInterestFormula,
					context,
				),
			);
			context.accruedInterest = nextAccruedInterest;

			const totalPayment = Math.max(
				0,
				evaluateFormulaExpression(openLineFormulas.totalPaymentFormula, context),
			);

			rows.push({
				date,
				opening: roundCurrency(opening),
				drawdown: roundCurrency(drawdown),
				principalRepayment: roundCurrency(principalRepayment),
				closing: roundCurrency(closingPrincipal),
				interest: roundCurrency(dailyInterest),
				interestRepayment: roundCurrency(interestRepayment),
				accruedInterest: roundCurrency(nextAccruedInterest),
				totalPayment: roundCurrency(totalPayment),
			});

			outstandingPrincipal = closingPrincipal;
			accruedInterest = nextAccruedInterest;
			prevClosingPrincipal = closingPrincipal;
			prevAccruedInterest = nextAccruedInterest;
			prevTotalPayment = totalPayment;
		}
	} catch (error) {
		return {
			rows: [],
			error:
				error instanceof Error
					? error.message
					: "Unable to evaluate open line formulas.",
		};
	}

	return { rows, error: null };
};