import type {
	FormulaSetup,
	RepaymentSetupForm,
} from "@/components/loan/v2/RepaymentSetupTab";

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