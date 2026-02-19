import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/loan/emi-calculator")({
	component: EmiCalculator,
});

function EmiCalculator() {
	const [amount, setAmount] = useState<number | undefined>(100000);
	const [rate, setRate] = useState<number | undefined>(10); // Annual interest rate in %
	const [tenure, setTenure] = useState<number | undefined>(12);
	const [tenureType, setTenureType] = useState<"months" | "years">("months");
	const [moratoriumMonths, setMoratoriumMonths] = useState<number | undefined>(6);
	const [tenureIncludesMoratorium, setTenureIncludesMoratorium] =
		useState<boolean>(false);
	const [emiType, setEmiType] = useState<
		"reducing" | "flat" | "step-up" | "step-down" | "balloon" | "moratorium"
	>("reducing");
	const [moratoriumBaseType, setMoratoriumBaseType] = useState<
		"reducing" | "flat"
	>("reducing");
	const [stepPercent, setStepPercent] = useState<number | undefined>(5);
	const [stepEveryMonths, setStepEveryMonths] = useState<number | undefined>(12);
	const [balloonPercent, setBalloonPercent] = useState<number | undefined>(30);

	const { emi, totalPayment, totalInterest, schedule } = useMemo(() => {
		/**
		 * Core inputs for EMI math.
		 * - p: principal amount
		 * - r: monthly interest rate
		 */
		const p = amount ?? 0;

		/**
		 * Interest rate per month.
		 * Rate is given annually, so divide by 12 and convert to decimal.
		 */
		const r = (rate ?? 0) / 12 / 100;

		/**
		 * Tenor value in months.
		 * We track base tenor, moratorium months, and effective EMI months
		 * to support both include/exclude moratorium behaviors.
		 */
		const isMoratorium = emiType === "moratorium";
		const baseTenorMonths =
			tenureType === "years" ? (tenure ?? 0) * 12 : (tenure ?? 0);
		const moratorium = isMoratorium ? Math.max(0, moratoriumMonths ?? 0) : 0;
		/**
		 * EMI months can exclude or include moratorium, based on user selection.
		 * - Exclude: EMI starts after moratorium and keeps full base tenor.
		 * - Include: EMI starts after moratorium and reduces remaining EMI months.
		 */
		const emiMonths = tenureIncludesMoratorium && isMoratorium
			? Math.max(0, baseTenorMonths - moratorium)
			: baseTenorMonths;
		const totalMonths = tenureIncludesMoratorium && isMoratorium
			? baseTenorMonths
			: baseTenorMonths + moratorium;

		if (p <= 0 || baseTenorMonths <= 0 || totalMonths <= 0) {
			return {
				emi: 0,
				totalPayment: 0,
				totalInterest: 0,
				schedule: [],
			};
		}

		const currentSchedule: {
			period: number;
			date: Date;
			payment: number;
			principal: number;
			interest: number;
			balance: number;
		}[] = [];
		let remainingBalance = p;
		const today = new Date();
		let accruedMoratoriumInterest = 0;

		const pushScheduleRow = (entry: {
			period: number;
			date: Date;
			payment: number;
			principal: number;
			interest: number;
			balance: number;
		}) => {
			currentSchedule.push(entry);
		};

		/**
		 * Moratorium schedule.
		 * No payments are made during moratorium; interest accrues monthly
		 * and is capitalized into the outstanding balance.
		 */
		const addMoratoriumSchedule = () => {
			for (let i = 1; i <= moratorium; i++) {
				const interest = remainingBalance * r;
				accruedMoratoriumInterest += interest;
				remainingBalance += interest;
				const date = new Date(today);
				date.setMonth(today.getMonth() + i);

				pushScheduleRow({
					period: i,
					date: date,
					payment: 0,
					principal: 0,
					interest: interest,
					balance: Math.max(0, remainingBalance),
				});
			}
		};

		/**
		 * Zero-interest case.
		 * Moratorium still defers payments; EMI is a simple principal split.
		 */
		if ((rate ?? 0) <= 0) {
			if (moratorium > 0) {
				addMoratoriumSchedule();
			}
			const effectiveEmiMonths = Math.max(1, emiMonths);
			const zeroInterestEmi = remainingBalance / effectiveEmiMonths;
			for (let i = 1; i <= effectiveEmiMonths; i++) {
				remainingBalance -= zeroInterestEmi;
				const date = new Date(today);
				date.setMonth(today.getMonth() + moratorium + i);

				pushScheduleRow({
					period: moratorium + i,
					date: date,
					payment: zeroInterestEmi,
					principal: zeroInterestEmi,
					interest: 0,
					balance: Math.max(0, remainingBalance),
				});
			}

			return {
				emi: zeroInterestEmi,
				totalPayment: zeroInterestEmi * effectiveEmiMonths,
				totalInterest: 0,
				schedule: currentSchedule,
			};
		}

		/**
		 * Apply moratorium before EMI calculation to get the post-moratorium
		 * principal used for reducing/step/balloon schedules.
		 */
		if (moratorium > 0) {
			addMoratoriumSchedule();
		}

		const principalAfterMoratorium = remainingBalance;
		const effectiveEmiMonths = Math.max(1, emiMonths);
		const baseEmi =
			(principalAfterMoratorium * r * (1 + r) ** effectiveEmiMonths) /
			((1 + r) ** effectiveEmiMonths - 1);

		/**
		 * Builds EMI schedule using a per-period payment generator.
		 * Used by reducing, step-up/down, and balloon variants.
		 */
		const buildSchedule = (paymentForPeriod: (period: number) => number) => {
			let totalPaid = 0;
			for (let i = 1; i <= effectiveEmiMonths; i++) {
				const payment = paymentForPeriod(i);
				const interest = remainingBalance * r;
				const principal = Math.max(0, payment - interest);
				remainingBalance -= principal;
				if (i === effectiveEmiMonths && remainingBalance < 1) {
					remainingBalance = 0;
				}

				const date = new Date(today);
				date.setMonth(today.getMonth() + moratorium + i);

				pushScheduleRow({
					period: moratorium + i,
					date: date,
					payment: payment,
					principal: principal,
					interest: interest,
					balance: Math.max(0, remainingBalance),
				});
				totalPaid += payment;
			}

			return {
				totalPaid,
				interestTotal: totalPaid - p,
			};
		};

		/**
		 * Flat rate:
		 * - Interest is computed on the original principal for the EMI months.
		 * - Principal is distributed evenly across EMI months.
		 * - Moratorium interest is reported separately and capitalized already.
		 */
		const effectiveEmiType = isMoratorium ? moratoriumBaseType : emiType;

		if (effectiveEmiType === "flat") {
			const annualRate = (rate ?? 0) / 100;
			const totalInterest = p * annualRate * (effectiveEmiMonths / 12);
			const monthlyInterest = totalInterest / effectiveEmiMonths;
			const monthlyPrincipal = principalAfterMoratorium / effectiveEmiMonths;
			const flatEmi = monthlyPrincipal + monthlyInterest;

			for (let i = 1; i <= effectiveEmiMonths; i++) {
				const interest = monthlyInterest;
				const principal = monthlyPrincipal;
				remainingBalance -= principal;
				const date = new Date(today);
				date.setMonth(today.getMonth() + moratorium + i);

				pushScheduleRow({
					period: moratorium + i,
					date: date,
					payment: flatEmi,
					principal: principal,
					interest: interest,
					balance: Math.max(0, remainingBalance),
				});
			}

			return {
				emi: flatEmi,
				totalPayment: flatEmi * effectiveEmiMonths,
				totalInterest: totalInterest + accruedMoratoriumInterest,
				schedule: currentSchedule,
			};
		}

		/**
		 * Step schedules:
		 * Apply a multiplier to the base reducing EMI every N months.
		 */
		if (effectiveEmiType === "step-up" || effectiveEmiType === "step-down") {
			const stepRate = (stepPercent ?? 0) / 100;
			const stepEvery = Math.max(1, stepEveryMonths ?? 1);
			const direction = effectiveEmiType === "step-up" ? 1 : -1;
			const stepSchedule = buildSchedule((period) => {
				const stepIndex = Math.floor((period - 1) / stepEvery);
				const multiplier = 1 + direction * stepRate * stepIndex;
				return Math.max(0, baseEmi * multiplier);
			});

			return {
				emi: baseEmi,
				totalPayment: stepSchedule.totalPaid,
				totalInterest:
					stepSchedule.interestTotal + accruedMoratoriumInterest,
				schedule: currentSchedule,
			};
		}

		/**
		 * Balloon:
		 * A lump sum is added to the final EMI, reducing the amortized principal.
		 */
		if (effectiveEmiType === "balloon") {
			const balloon = p * ((balloonPercent ?? 0) / 100);
			const amortizedPrincipal = Math.max(
				0,
				principalAfterMoratorium - balloon,
			);
			const emiVal =
				amortizedPrincipal === 0
					? 0
					: (amortizedPrincipal * r * (1 + r) ** effectiveEmiMonths) /
						((1 + r) ** effectiveEmiMonths - 1);

			const balloonSchedule = buildSchedule((period) =>
				period === effectiveEmiMonths ? emiVal + balloon : emiVal,
			);

			return {
				emi: emiVal,
				totalPayment: balloonSchedule.totalPaid,
				totalInterest:
					balloonSchedule.interestTotal + accruedMoratoriumInterest,
				schedule: currentSchedule,
			};
		}

		const reducingSchedule = buildSchedule(() => baseEmi);

		return {
			emi: baseEmi,
			totalPayment: reducingSchedule.totalPaid,
			totalInterest:
				reducingSchedule.interestTotal + accruedMoratoriumInterest,
			schedule: currentSchedule,
		};
	}, [
		amount,
		rate,
		tenure,
		tenureType,
		moratoriumMonths,
		tenureIncludesMoratorium,
		emiType,
		moratoriumBaseType,
		stepPercent,
		stepEveryMonths,
		balloonPercent,
	]);

	const formatCurrency = (val: number) =>
		new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "MMK",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(val);

	return (
		<div className="p-6 font-sans max-w-7xl mx-auto">
			<h1 className="text-2xl font-bold mb-6">EMI Calculator</h1>

			<div className="grid gap-6 md:grid-cols-2">
				<div className="space-y-4 border p-6 rounded-lg shadow-sm bg-white h-fit">
					<h2 className="font-semibold text-lg mb-4">Loan Details</h2>

					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700">
							EMI Type
						</label>
						<select
							value={emiType}
							onChange={(e) =>
								setEmiType(
									e.target.value as
										| "reducing"
										| "flat"
										| "step-up"
										| "step-down"
										| "balloon"
										| "moratorium",
								)
							}
							className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
						>
							<option value="reducing">Reducing Balance</option>
							<option value="flat">Flat Rate</option>
							<option value="step-up">Step-Up</option>
							<option value="step-down">Step-Down</option>
							<option value="balloon">Balloon</option>
								<option value="moratorium">Moratorium</option>
						</select>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700">
							Loan Amount
						</label>
						<div className="relative">
							<span className="absolute left-3 top-2 text-gray-500">MMK</span>
							<input
								type="number"
								min="0"
								value={amount ?? ""}
								onChange={(e) =>
									setAmount(e.target.value ? Number(e.target.value) : undefined)
								}
								className="w-full border p-2 pl-14 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700">
							Interest Rate (%)
						</label>
						<input
							type="number"
							min="0"
							step="0.1"
							value={rate ?? ""}
							onChange={(e) =>
								setRate(e.target.value ? Number(e.target.value) : undefined)
							}
							className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700">
							Tenure
						</label>
						<div className="flex gap-2">
							<input
								type="number"
								min="1"
								value={tenure ?? ""}
								onChange={(e) =>
									setTenure(e.target.value ? Number(e.target.value) : undefined)
								}
								className="flex-1 border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<select
								value={tenureType}
								onChange={(e) =>
									setTenureType(e.target.value as "months" | "years")
								}
								className="border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="months">Months</option>
								<option value="years">Years</option>
							</select>
						</div>
					</div>

					{emiType === "moratorium" && (
						<div className="space-y-4">
							<div>
								<label className="block text-sm font-medium mb-1 text-gray-700">
									Moratorium Base
								</label>
								<select
									value={moratoriumBaseType}
									onChange={(e) =>
										setMoratoriumBaseType(
											e.target.value as "reducing" | "flat",
										)
									}
									className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="reducing">Reducing Balance</option>
									<option value="flat">Flat Rate</option>
								</select>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1 text-gray-700">
									Moratorium (Months)
								</label>
								<input
									type="number"
									min="0"
									value={moratoriumMonths ?? ""}
									onChange={(e) =>
										setMoratoriumMonths(
											e.target.value ? Number(e.target.value) : undefined,
										)
									}
									className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
								/>
								<p className="text-xs text-gray-500 mt-1">
									No EMI during moratorium; interest accrues and is capitalized.
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium mb-1 text-gray-700">
									Tenure Handling
								</label>
								<select
									value={tenureIncludesMoratorium ? "include" : "exclude"}
									onChange={(e) =>
										setTenureIncludesMoratorium(e.target.value === "include")
									}
									className="w-full border p-2 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="exclude">
										Exclude moratorium from tenure (EMI starts after)
									</option>
									<option value="include">
										Include moratorium in tenure (shorter EMI span)
									</option>
								</select>
							</div>
						</div>
					)}
				</div>

				<div className="space-y-4 border p-6 rounded-lg shadow-sm bg-blue-50 h-fit">
					<h2 className="font-semibold text-lg mb-4 text-blue-900">Summary</h2>

					<div className="space-y-4">
						<div className="flex justify-between items-center pb-2 border-b border-blue-100">
							<span className="text-gray-600">Monthly EMI</span>
							<span className="text-2xl font-bold text-blue-600">
								{formatCurrency(emi)}
							</span>
						</div>

						<div className="flex justify-between items-center">
							<span className="text-gray-600">Principal Amount</span>
							<span className="font-medium">{formatCurrency(amount ?? 0)}</span>
						</div>

						<div className="flex justify-between items-center">
							<span className="text-gray-600">Total Interest</span>
							<span className="font-medium text-orange-600">
								{formatCurrency(totalInterest)}
							</span>
						</div>

						<div className="flex justify-between items-center pt-2 border-t border-blue-200">
							<span className="font-semibold text-gray-800">Total Payment</span>
							<span className="font-bold text-gray-900">
								{formatCurrency(totalPayment)}
							</span>
						</div>
					</div>
				</div>

				{(emiType === "step-up" || emiType === "step-down") && (
					<div className="grid gap-4 md:grid-cols-2">
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700">
								Step Change (%)
							</label>
							<input
								type="number"
								min="0"
								step="0.1"
								value={stepPercent ?? ""}
								onChange={(e) =>
									setStepPercent(
										e.target.value ? Number(e.target.value) : undefined,
									)
								}
								className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1 text-gray-700">
								Step Every (Months)
							</label>
							<input
								type="number"
								min="1"
								value={stepEveryMonths ?? ""}
								onChange={(e) =>
									setStepEveryMonths(
										e.target.value ? Number(e.target.value) : undefined,
									)
								}
								className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
						</div>
					</div>
				)}

				{emiType === "balloon" && (
					<div>
						<label className="block text-sm font-medium mb-1 text-gray-700">
							Balloon Amount (% of Principal)
						</label>
						<input
							type="number"
							min="0"
							max="100"
							step="1"
							value={balloonPercent ?? ""}
							onChange={(e) =>
								setBalloonPercent(
									e.target.value ? Number(e.target.value) : undefined,
								)
							}
							className="w-full border p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				)}
			</div>

			{schedule.length > 0 && (
				<div className="mt-8">
					<h2 className="text-xl font-bold mb-4">Payment Schedule</h2>
					<div className="border rounded-lg overflow-x-auto shadow-sm bg-white">
						<table className="min-w-full text-sm text-left">
							<thead className="bg-gray-100 text-gray-700 font-semibold border-b">
								<tr>
									<th className="px-4 py-3 whitespace-nowrap">#</th>
									<th className="px-4 py-3 whitespace-nowrap">Payment Date</th>
									<th className="px-4 py-3 text-right whitespace-nowrap">
										Payment
									</th>
									<th className="px-4 py-3 text-right whitespace-nowrap">
										Principal
									</th>
									<th className="px-4 py-3 text-right whitespace-nowrap">
										Interest
									</th>
									<th className="px-4 py-3 text-right whitespace-nowrap">
										Outstanding
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-200">
								{schedule.map((row) => (
									<tr key={row.period} className="hover:bg-gray-50">
										<td className="px-4 py-2 text-gray-500">{row.period}</td>
										<td className="px-4 py-2">
											{new Intl.DateTimeFormat("en-US", {
												year: "numeric",
												month: "short",
												day: "numeric",
											}).format(row.date)}
										</td>
										<td className="px-4 py-2 text-right font-medium">
											{formatCurrency(row.payment)}
										</td>
										<td className="px-4 py-2 text-right text-gray-600">
											{formatCurrency(row.principal)}
										</td>
										<td className="px-4 py-2 text-right text-orange-600">
											{formatCurrency(row.interest)}
										</td>
										<td className="px-4 py-2 text-right text-gray-500">
											{formatCurrency(row.balance)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	);
}
