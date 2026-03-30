import { Trash2 } from "lucide-react";
import { useState } from "react";
import {
	createDefaultFormulaSetup,
	type FormulaSetup,
	type LoanSecurityType,
	type V2InterestConfig,
} from "./setup-types";

type InterestEngineTabProps = {
	interestRatePlans: V2InterestConfig[];
	formulaSetup?: FormulaSetup;
	loanSecurity?: LoanSecurityType;
	updateFormulaSetup?: (
		updater: (current: FormulaSetup) => FormulaSetup,
	) => void;
	updateInterestConfig: (
		updater: (current: V2InterestConfig[]) => V2InterestConfig[],
	) => void;
	addPlan?: () => void;
	removePlan: (planIndex: number) => void;
	addParameter: (planIndex: number) => void;
	updateParameter: (
		planIndex: number,
		paramIndex: number,
		field: "name" | "value" | "interestRate",
		value: string,
	) => void;
	removeParameter: (planIndex: number, paramIndex: number) => void;
	addPolicy?: (planIndex: number) => void;
	updatePolicy?: (
		planIndex: number,
		policyIndex: number,
		field: "interestCategory" | "interestRate",
		value: string,
	) => void;
	removePolicy?: (planIndex: number, policyIndex: number) => void;
};

const createId = () =>
	`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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

const unsecuredFieldDefinitions: Array<{
	key: string;
	label: string;
	description: string;
}> = [
	{
		key: "openingPrincipal",
		label: "Opening Principal",
		description: "Outstanding principal balance at the start of the row/date.",
	},
	{
		key: "drawdownAmount",
		label: "Drawdown Amount",
		description: "Amount drawn on the current row/date.",
	},
	{
		key: "principalRepayment",
		label: "Principal Repayment",
		description: "Principal repaid on the current row/date.",
	},
	{
		key: "interestRepayment",
		label: "Interest Repayment",
		description: "Interest repaid on the current row/date.",
	},
	{
		key: "openingAccruedInterest",
		label: "Opening Accrued Interest",
		description: "Accrued interest carried into the row before new daily accrual.",
	},
	{
		key: "principalAfterDrawdown",
		label: "Principal After Drawdown",
		description: "Opening principal plus drawdown amount before repayment.",
	},
	{
		key: "principalAfterRepayment",
		label: "Principal After Repayment",
		description: "Principal balance after applying principal repayment.",
	},
	{
		key: "creditLimit",
		label: "Credit Limit",
		description: "Approved credit limit for the line facility.",
	},
	{
		key: "availableLimit",
		label: "Available Limit",
		description: "Remaining drawable limit before the current event is applied.",
	},
	{
		key: "annualRate",
		label: "Annual Rate",
		description: "Annual interest rate in percent for the unsecured line.",
	},
	{
		key: "daysInYear",
		label: "Days In Year",
		description: "Day-count basis used to convert annual rate to daily rate.",
	},
	{
		key: "dailyRate",
		label: "Daily Rate",
		description: "Derived daily rate based on annual rate and days-in-year.",
	},
	{
		key: "dayIndex",
		label: "Day Index",
		description: "1-based row counter from the open date.",
	},
	{
		key: "daysFromOpen",
		label: "Days From Open",
		description: "Elapsed days from the facility open date to the current row.",
	},
	{
		key: "prevClosingPrincipal",
		label: "Previous Closing Principal",
		description: "Closing principal from the previous row.",
	},
	{
		key: "prevAccruedInterest",
		label: "Previous Accrued Interest",
		description: "Accrued interest from the previous row.",
	},
	{
		key: "prevTotalPayment",
		label: "Previous Total Payment",
		description: "Total payment recorded on the previous row.",
	},
];

export function InterestEngineTab({
	interestRatePlans,
	formulaSetup = createDefaultFormulaSetup(),
	loanSecurity = "UNSECURED",
	updateFormulaSetup,
	updateInterestConfig,
	removePlan,
	addParameter,
	updateParameter,
	removeParameter,
}: Readonly<InterestEngineTabProps>) {
	const [showPredefinedFields, setShowPredefinedFields] = useState(false);
	const isUnsecured = loanSecurity === "UNSECURED";

	const updatePlanType = (
		planIndex: number,
		field: "interestType" | "rateType",
		value: string,
	) => {
		updateInterestConfig((current) =>
			current.map((plan, index) =>
				index === planIndex ? { ...plan, [field]: value } : plan,
			),
		);
	};

	const updateBaseRate = (planIndex: number, value: string) => {
		const parsed = Number(value);
		updateInterestConfig((current) =>
			current.map((plan, index) =>
				index === planIndex
					? {
							...plan,
							baseRate: Number.isFinite(parsed) ? parsed : plan.baseRate,
						}
					: plan,
			),
		);
	};

	const updateFormula = (updater: (current: FormulaSetup) => FormulaSetup) => {
		updateFormulaSetup?.((current) => updater(current));
	};

	const addFieldDefinition = () => {
		updateFormula((current) => ({
			...current,
			fieldDefinitions: [
				...current.fieldDefinitions,
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
		updateFormula((current) => ({
			...current,
			fieldDefinitions: current.fieldDefinitions.map((item) => {
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
		updateFormula((current) => ({
			...current,
			fieldDefinitions: current.fieldDefinitions.filter(
				(item) => item.id !== fieldId,
			),
		}));
	};

	const updateOpenLineFormula = (
		field: keyof FormulaSetup["openLineFormulas"],
		value: string,
	) => {
		updateFormula((current) => ({
			...current,
			openLineFormulas: {
				...current.openLineFormulas,
				[field]: value,
			},
		}));
	};

	return (
		<div className="space-y-4">
			<div className="border rounded-lg overflow-hidden">
				<div className="p-3 bg-white text-sm space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-xs text-gray-600">
							Configure base rate, parameter overrides, policies, and custom
							formula behavior for interest plans.
						</p>
						{/* <button
							type="button"
							onClick={addPlan}
							className="text-xs border px-2 py-1 rounded hover:bg-gray-50"
						>
							Add Plan
						</button> */}
					</div>
					{interestRatePlans.length === 0 ? (
						<div className="text-xs text-gray-500 border border-dashed rounded p-3">
							No plans configured yet.
						</div>
					) : (
						<div className="flex flex-col gap-3">
							{interestRatePlans.map((plan, planIndex) => {
								const baseRateLabel =
									plan.rateType === "FLOATING"
										? "Base Rate (%)"
										: "Interest Rate";
								return (
									<div
										key={plan.id}
										className="border rounded-md p-3 space-y-3"
									>
										<div className="flex items-center justify-between">
											<div>
												{/* <div className="text-sm font-semibold">
													Plan {planIndex + 1}
												</div> */}
												<div className="text-xs text-gray-500">
													{plan.interestType} - {plan.rateType}
												</div>
											</div>
											{interestRatePlans.length > 1 ? (
												<button
													type="button"
													onClick={() => removePlan(planIndex)}
													className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
													title="Remove plan"
												>
													<Trash2 className="w-4 h-4" />
												</button>
											) : null}
										</div>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
											<label className="flex flex-col gap-1">
												<span className="text-xs text-gray-600">
													Interest Type
												</span>
												<select
													value={plan.interestType}
													onChange={(event) =>
														updatePlanType(
															planIndex,
															"interestType",
															event.target.value,
														)
													}
													className="border px-2 py-1 rounded"
												>
													{["REDUCING", "FLAT"].map((option) => (
														<option key={option} value={option}>
															{option}
														</option>
													))}
												</select>
											</label>
											<label className="flex flex-col gap-1">
												<span className="text-xs text-gray-600">Rate Type</span>
												<select
													value={plan.rateType}
													onChange={(event) =>
														updatePlanType(
															planIndex,
															"rateType",
															event.target.value,
														)
													}
													className="border px-2 py-1 rounded"
												>
													{["FIXED", "FLOATING"].map((option) => (
														<option key={option} value={option}>
															{option}
														</option>
													))}
												</select>
											</label>
											<label className="flex flex-col gap-1">
												<span className="text-xs text-gray-600">
													{baseRateLabel}
												</span>
												<input
													type="number"
													step="0.1"
													min={0}
													value={plan.baseRate}
													onChange={(event) =>
														updateBaseRate(planIndex, event.target.value)
													}
													className="border px-2 py-1 rounded"
												/>
											</label>
										</div>
										<div className="space-y-2">
											<div className="flex items-center justify-between">
												<span className="text-xs text-gray-600">
													Parameters
												</span>
												<button
													type="button"
													onClick={() => addParameter(planIndex)}
													className="text-xs border px-2 py-1 rounded hover:bg-gray-50"
												>
													Add Parameter
												</button>
											</div>
											{(plan.config?.parameters ?? []).length === 0 ? (
												<div className="text-xs text-gray-500 border border-dashed rounded p-2">
													No parameter overrides. Will use base rate.
												</div>
											) : (
												<div className="space-y-2">
													{(plan.config?.parameters ?? []).map(
														(parameter, paramIndex) => (
															<div
																key={parameter.id}
																className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end"
															>
																<label className="flex flex-col gap-1">
																	<span className="text-xs text-gray-600">
																		Name
																	</span>
																	<input
																		type="text"
																		value={parameter.name}
																		onChange={(event) =>
																			updateParameter(
																				planIndex,
																				paramIndex,
																				"name",
																				event.target.value,
																			)
																		}
																		className="border px-2 py-1 rounded"
																	/>
																</label>
																<label className="flex flex-col gap-1">
																	<span className="text-xs text-gray-600">
																		Value
																	</span>
																	<input
																		type="number"
																		min={0}
																		value={parameter.value}
																		onChange={(event) =>
																			updateParameter(
																				planIndex,
																				paramIndex,
																				"value",
																				event.target.value,
																			)
																		}
																		className="border px-2 py-1 rounded"
																	/>
																</label>
																<label className="flex flex-col gap-1">
																	<span className="text-xs text-gray-600">
																		Interest Rate (%)
																	</span>
																	<input
																		type="number"
																		step="0.1"
																		value={parameter.interestRate}
																		onChange={(event) =>
																			updateParameter(
																				planIndex,
																				paramIndex,
																				"interestRate",
																				event.target.value,
																			)
																		}
																		className="border px-2 py-1 rounded"
																	/>
																</label>
																<button
																	type="button"
																	onClick={() =>
																		removeParameter(planIndex, paramIndex)
																	}
																	className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
																	title="Remove parameter"
																>
																	<Trash2 className="w-4 h-4" />
																</button>
															</div>
														),
													)}
												</div>
											)}
										</div>
										{/* <div className="space-y-2">
											<div className="flex items-center justify-between">
												<span className="text-xs text-gray-600">Policies</span>
												<button
													type="button"
													onClick={() => addPolicy(planIndex)}
													className="text-xs border px-2 py-1 rounded hover:bg-gray-50"
												>
													Add Policy
												</button>
											</div>
											{(plan.policies ?? []).length === 0 ? (
												<div className="text-xs text-gray-500 border border-dashed rounded p-2">
													No policies attached.
												</div>
											) : (
												<div className="space-y-2">
													{(plan.policies ?? []).map((policy, policyIndex) => (
														<div
															key={policy.id}
															className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end"
														>
															<label className="flex flex-col gap-1">
																<span className="text-xs text-gray-600">
																	Category
																</span>
																<input
																	type="text"
																	value={policy.interestCategory}
																	onChange={(event) =>
																		updatePolicy(
																			planIndex,
																			policyIndex,
																			"interestCategory",
																			event.target.value,
																		)
																	}
																	className="border px-2 py-1 rounded"
																/>
															</label>
															<label className="flex flex-col gap-1">
																<span className="text-xs text-gray-600">
																	Interest Rate (%)
																</span>
																<input
																	type="number"
																	step="0.1"
																	value={policy.interestRate}
																	onChange={(event) =>
																		updatePolicy(
																			planIndex,
																			policyIndex,
																			"interestRate",
																			event.target.value,
																		)
																	}
																	className="border px-2 py-1 rounded"
																/>
															</label>
															<button
																type="button"
																onClick={() =>
																	removePolicy(planIndex, policyIndex)
																}
																className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
																title="Remove policy"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</div>
													))}
												</div>
											)}
										</div> */}
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>

			<section className="border rounded-lg p-5 space-y-4">
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<div>
						<h2 className="text-lg font-semibold">Custom Formula</h2>
						<div className="text-xs text-gray-600">
							Define principal and interest formulas alongside the interest
							engine.
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<label className="flex flex-col gap-1 text-sm">
						<span>Principal Formula</span>
						<textarea
							value={formulaSetup.principalFormula}
							onChange={(event) =>
								updateFormula((current) => ({
									...current,
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
								updateFormula((current) => ({
									...current,
									interestFormula: event.target.value,
								}))
							}
							rows={4}
							className="border rounded px-2 py-2 font-mono text-sm"
						/>
					</label>
				</div>

				{isUnsecured ? (
					<div className="space-y-4 border rounded-lg p-4 bg-gray-50">
						<div>
							<h3 className="text-sm font-medium">Additional Unsecured Formulas</h3>
							<div className="text-xs text-gray-600">
								Required formula fields for unsecured and open-line style interest calculations.
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<label className="flex flex-col gap-1 text-sm">
								<span>Closing Principal Formula</span>
								<textarea
									value={formulaSetup.openLineFormulas?.closingPrincipalFormula}
									onChange={(event) =>
										updateOpenLineFormula(
											"closingPrincipalFormula",
											event.target.value,
										)
									}
									rows={3}
									className="border rounded px-2 py-2 font-mono text-sm bg-white"
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>Daily Interest Formula</span>
								<textarea
									value={formulaSetup.openLineFormulas?.dailyInterestFormula}
									onChange={(event) =>
										updateOpenLineFormula(
											"dailyInterestFormula",
											event.target.value,
										)
									}
									rows={3}
									className="border rounded px-2 py-2 font-mono text-sm bg-white"
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>Accrued Interest Formula</span>
								<textarea
									value={formulaSetup.openLineFormulas?.accruedInterestFormula}
									onChange={(event) =>
										updateOpenLineFormula(
											"accruedInterestFormula",
											event.target.value,
										)
									}
									rows={3}
									className="border rounded px-2 py-2 font-mono text-sm bg-white"
								/>
							</label>
							<label className="flex flex-col gap-1 text-sm">
								<span>Total Payment Formula</span>
								<textarea
									value={formulaSetup.openLineFormulas?.totalPaymentFormula}
									onChange={(event) =>
										updateOpenLineFormula(
											"totalPaymentFormula",
											event.target.value,
										)
									}
									rows={3}
									className="border rounded px-2 py-2 font-mono text-sm bg-white"
								/>
							</label>
						</div>
					</div>
				) : null}

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
											<td className="px-3 py-2 font-mono text-xs">
												{field.key}
											</td>
											<td className="px-3 py-2 text-xs text-gray-700">
												{field.description}
											</td>
										</tr>
									))}
									{isUnsecured
										? unsecuredFieldDefinitions.map((field) => (
											<tr key={field.key} className="border-t bg-blue-50/40">
												<td className="px-3 py-2 font-mono text-xs">
													{field.key}
												</td>
												<td className="px-3 py-2 text-xs text-gray-700">
													{field.description}
												</td>
											</tr>
										))
										: null}
								</tbody>
							</table>
						</div>
					) : null}
				</div>
			</section>
		</div>
	);
}
