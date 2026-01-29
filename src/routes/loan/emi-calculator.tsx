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

	const { emi, totalPayment, totalInterest, schedule } = useMemo(() => {
		const p = amount ?? 0;
		const r = (rate ?? 0) / 12 / 100;
		const n = tenureType === "years" ? (tenure ?? 0) * 12 : (tenure ?? 0);

		if (p <= 0 || n <= 0) {
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

		// If rate is 0, just divide principal by months
		if ((rate ?? 0) <= 0) {
			const zeroInterestEmi = p / n;
			for (let i = 1; i <= n; i++) {
				remainingBalance -= zeroInterestEmi;
				const date = new Date(today);
				date.setMonth(today.getMonth() + i);

				currentSchedule.push({
					period: i,
					date: date,
					payment: zeroInterestEmi,
					principal: zeroInterestEmi,
					interest: 0,
					balance: Math.max(0, remainingBalance),
				});
			}

			return {
				emi: zeroInterestEmi,
				totalPayment: p,
				totalInterest: 0,
				schedule: currentSchedule,
			};
		}

		const emiVal = (p * r * (1 + r) ** n) / ((1 + r) ** n - 1);
		const total = emiVal * n;
		const interestTotal = total - p;

		for (let i = 1; i <= n; i++) {
			const interest = remainingBalance * r;
			const principal = emiVal - interest;
			remainingBalance -= principal;
			// Avoid negative zero or small floating point issues at the very end
			if (i === n && remainingBalance < 1) remainingBalance = 0;

			const date = new Date(today);
			date.setMonth(today.getMonth() + i);

			currentSchedule.push({
				period: i,
				date: date,
				payment: emiVal,
				principal: principal,
				interest: interest,
				balance: Math.max(0, remainingBalance),
			});
		}

		return {
			emi: emiVal,
			totalPayment: total,
			totalInterest: interestTotal,
			schedule: currentSchedule,
		};
	}, [amount, rate, tenure, tenureType]);

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
