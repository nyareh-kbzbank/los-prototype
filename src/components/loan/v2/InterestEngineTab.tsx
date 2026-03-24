import { Trash2 } from "lucide-react";
import type { V2InterestConfig } from "./setup-types";

type InterestEngineTabProps = {
	interestRatePlans: V2InterestConfig[];
	updateInterestConfig: (
		updater: (current: V2InterestConfig[]) => V2InterestConfig[],
	) => void;
	addPlan: () => void;
	removePlan: (planIndex: number) => void;
	addParameter: (planIndex: number) => void;
	updateParameter: (
		planIndex: number,
		paramIndex: number,
		field: "name" | "value" | "interestRate",
		value: string,
	) => void;
	removeParameter: (planIndex: number, paramIndex: number) => void;
	addPolicy: (planIndex: number) => void;
	updatePolicy: (
		planIndex: number,
		policyIndex: number,
		field: "interestCategory" | "interestRate",
		value: string,
	) => void;
	removePolicy: (planIndex: number, policyIndex: number) => void;
};

export function InterestEngineTab({
	interestRatePlans,
	updateInterestConfig,
	addPlan,
	removePlan,
	addParameter,
	updateParameter,
	removeParameter,
	addPolicy,
	updatePolicy,
	removePolicy,
}: InterestEngineTabProps) {
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

	return (
		<div className="border rounded-lg overflow-hidden">
			<div className="p-3 bg-white text-sm space-y-3">
					<div className="flex items-center justify-between">
						<p className="text-xs text-gray-600">
							Configure base rate, parameter overrides, and policies to match
							interest rate plans.
						</p>
						<button
							type="button"
							onClick={addPlan}
							className="text-xs border px-2 py-1 rounded hover:bg-gray-50"
						>
							Add Plan
						</button>
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
										key={`${plan.interestType}-${plan.rateType}-${plan.baseRate}`}
										className="border rounded-md p-3 space-y-3"
									>
										<div className="flex items-center justify-between">
											<div>
												<div className="text-sm font-semibold">Plan {planIndex + 1}</div>
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
												<span className="text-xs text-gray-600">Interest Type</span>
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
														updatePlanType(planIndex, "rateType", event.target.value)
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
												<span className="text-xs text-gray-600">{baseRateLabel}</span>
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
												<span className="text-xs text-gray-600">Parameters</span>
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
													{(plan.config?.parameters ?? []).map((parameter, paramIndex) => (
														<div
															key={`${parameter.name}-${parameter.value}-${parameter.interestRate}`}
															className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end"
														>
															<label className="flex flex-col gap-1">
																<span className="text-xs text-gray-600">Name</span>
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
																<span className="text-xs text-gray-600">Value</span>
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
																<span className="text-xs text-gray-600">Interest Rate (%)</span>
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
																onClick={() => removeParameter(planIndex, paramIndex)}
																className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
																title="Remove parameter"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</div>
													))}
												</div>
											)}
										</div>
										<div className="space-y-2">
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
															key={`${policy.interestCategory}-${policy.interestRate}`}
															className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end"
														>
															<label className="flex flex-col gap-1">
																<span className="text-xs text-gray-600">Category</span>
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
																<span className="text-xs text-gray-600">Interest Rate (%)</span>
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
																onClick={() => removePolicy(planIndex, policyIndex)}
																className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
																title="Remove policy"
															>
																<Trash2 className="w-4 h-4" />
															</button>
														</div>
													))}
												</div>
											)}
										</div>
									</div>
								);
							})}
						</div>
					)}
			</div>
		</div>
	);
}
