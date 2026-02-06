import { ChevronRight, Trash2 } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import {
	type InterestRatePlan,
	type LoanProduct,
	TenorUnit,
} from "@/lib/loan-setup-store";

interface TenorInterestSectionProps {
	product: LoanProduct;
	onUpdateTenureUnit: (e: ChangeEvent<HTMLSelectElement>) => void;
	onAddTenureValue: () => void;
	onUpdateTenureValue: (
		index: number,
	) => (e: ChangeEvent<HTMLInputElement>) => void;
	onRemoveTenureValue: (index: number) => void;
	onInterestPlansChange: (plans: InterestRatePlan[]) => void;
}

function TenorInterestSection(props: TenorInterestSectionProps) {
	const {
		product,
		onUpdateTenureUnit,
		onAddTenureValue,
		onUpdateTenureValue,
		onRemoveTenureValue,
		onInterestPlansChange,
	} = props;

	const [openTenor, setOpenTenor] = useState(true);
	const [openInterestPlans, setOpenInterestPlans] = useState(true);
	const interestPlans = product.interestRatePlans ?? [];

	const updatePlan = (
		index: number,
		updater: (plan: InterestRatePlan) => InterestRatePlan,
	) => {
		onInterestPlansChange(
			interestPlans.map((plan, idx) => (idx === index ? updater(plan) : plan)),
		);
	};

	const addInterestPlan = () => {
		const lastPlan = interestPlans.length
			? interestPlans[interestPlans.length - 1]
			: undefined;
		const fallbackRate = lastPlan?.baseRate ?? product.baseInterestRate ?? 0;
		onInterestPlansChange([
			...interestPlans,
			{
				interestType: "REDUCING",
				rateType: "FIXED",
				baseRate: fallbackRate,
				config: { parameters: [] },
				policies: [],
			},
		]);
	};

	const removeInterestPlan = (index: number) => {
		if (interestPlans.length === 1) return;
		onInterestPlansChange(interestPlans.filter((_, idx) => idx !== index));
	};

	const handlePlanTypeChange =
		(index: number, field: "interestType" | "rateType") =>
		(e: ChangeEvent<HTMLSelectElement>) => {
			updatePlan(index, (plan) => ({ ...plan, [field]: e.target.value }));
		};

	const handleBaseRateChange =
		(index: number) => (e: ChangeEvent<HTMLInputElement>) => {
			const parsed = Number(e.target.value);
			updatePlan(index, (plan) => ({
				...plan,
				baseRate: Number.isFinite(parsed) ? parsed : plan.baseRate,
			}));
		};

	const addParameter = (planIndex: number) => {
		updatePlan(planIndex, (plan) => ({
			...plan,
			config: {
				parameters: [
					...(plan.config?.parameters ?? []),
					{ name: "", value: 0, interestRate: plan.baseRate },
				],
			},
		}));
	};

	const updateParameter =
		(
			planIndex: number,
			paramIndex: number,
			field: "name" | "value" | "interestRate",
		) =>
		(e: ChangeEvent<HTMLInputElement>) => {
			const rawValue =
				field === "name" ? e.target.value : Number(e.target.value);
			updatePlan(planIndex, (plan) => {
				const nextParameters = [...(plan.config?.parameters ?? [])];
				const target = nextParameters[paramIndex];
				if (!target) return plan;
				if (field === "name") {
					nextParameters[paramIndex] = {
						...target,
						name: rawValue as string,
					};
				} else {
					const numeric = Number.isFinite(rawValue as number)
						? (rawValue as number)
						: target[field];
					nextParameters[paramIndex] = {
						...target,
						[field]: numeric,
					};
				}
				return {
					...plan,
					config: { parameters: nextParameters },
				};
			});
		};

	const removeParameter = (planIndex: number, paramIndex: number) => {
		updatePlan(planIndex, (plan) => ({
			...plan,
			config: {
				parameters: (plan.config?.parameters ?? []).filter(
					(_, idx) => idx !== paramIndex,
				),
			},
		}));
	};

	const addPolicy = (planIndex: number) => {
		updatePlan(planIndex, (plan) => ({
			...plan,
			policies: [
				...(plan.policies ?? []),
				{ interestCategory: "", interestRate: 0 },
			],
		}));
	};

	const updatePolicy =
		(
			planIndex: number,
			policyIndex: number,
			field: "interestCategory" | "interestRate",
		) =>
		(e: ChangeEvent<HTMLInputElement>) => {
			const rawValue =
				field === "interestCategory" ? e.target.value : Number(e.target.value);
			updatePlan(planIndex, (plan) => {
				const nextPolicies = [...(plan.policies ?? [])];
				const target = nextPolicies[policyIndex];
				if (!target) return plan;
				if (field === "interestCategory") {
					nextPolicies[policyIndex] = {
						...target,
						interestCategory: rawValue as string,
					};
				} else {
					const numeric = Number.isFinite(rawValue as number)
						? (rawValue as number)
						: target.interestRate;
					nextPolicies[policyIndex] = {
						...target,
						interestRate: numeric,
					};
				}
				return { ...plan, policies: nextPolicies };
			});
		};

	const removePolicy = (planIndex: number, policyIndex: number) => {
		updatePlan(planIndex, (plan) => ({
			...plan,
			policies: (plan.policies ?? []).filter((_, idx) => idx !== policyIndex),
		}));
	};

	return (
		<>
			{/* Tenor Accordion */}
			<div className="md:col-span-2">
				<div className="border rounded-lg overflow-hidden">
					<button
						type="button"
						onClick={() => setOpenTenor((v) => !v)}
						className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 text-sm font-semibold"
					>
						<span>Tenor Configuration</span>
						<ChevronRight
							className={`w-4 h-4 transition-transform ${openTenor ? "rotate-90" : "rotate-0"}`}
						/>
					</button>
					{openTenor && (
						<div className="flex flex-col gap-2 border-t p-3 bg-white text-sm">
							<div className="flex flex-col gap-1">
								<span className="text-xs text-gray-600">Unit</span>
								<select
									value={product.loanTenor.TenorUnit}
									onChange={onUpdateTenureUnit}
									className="border px-2 py-1 rounded w-full md:w-1/2"
								>
									{Object.values(TenorUnit).map((u) => (
										<option key={u} value={u}>
											{u}
										</option>
									))}
								</select>
							</div>
							<div className="flex items-center justify-between">
								<span className="text-xs text-gray-600">Values</span>
								<button
									type="button"
									onClick={onAddTenureValue}
									className="text-xs border px-2 py-1 rounded hover:bg-gray-50"
								>
									Add Value
								</button>
							</div>
							<div className="grid grid-cols-2 gap-3 w-full">
								{product.loanTenor.TenorValue.map((val, idx) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: simple list
									<div key={idx} className="flex items-center gap-2">
										<input
											type="number"
											value={val}
											onChange={onUpdateTenureValue(idx)}
											className="border px-2 py-1 rounded w-full"
											min="0"
										/>
										<button
											onClick={() => onRemoveTenureValue(idx)}
											className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
											type="button"
											title="Remove"
										>
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			{/* Interest Rate Plans */}
			<div className="md:col-span-2">
				<div className="border rounded-lg overflow-hidden">
					<button
						type="button"
						onClick={() => setOpenInterestPlans((v) => !v)}
						className="w-full flex items-center justify-between px-3 py-2 bg-gray-100 text-sm font-semibold"
					>
						<span>Interest Rate Plans</span>
						<ChevronRight
							className={`w-4 h-4 transition-transform ${openInterestPlans ? "rotate-90" : "rotate-0"}`}
						/>
					</button>
					{openInterestPlans && (
						<div className="border-t p-3 bg-white text-sm space-y-3">
							<div className="flex items-center justify-between">
								<p className="text-xs text-gray-600">
									Configure base rate, parameter overrides, and policies to
									match `interestRatePlans`.
								</p>
								<button
									type="button"
									onClick={addInterestPlan}
									className="text-xs border px-2 py-1 rounded hover:bg-gray-50"
								>
									Add Plan
								</button>
							</div>
							{interestPlans.length === 0 ? (
								<div className="text-xs text-gray-500 border border-dashed rounded p-3">
									No plans configured yet.
								</div>
							) : (
								<div className="flex flex-col gap-3">
									{interestPlans.map((plan, planIdx) => {
										const baseRateLabel =
											plan.rateType === "FLOATING"
												? "Base Rate (%)"
												: "Interest Rate";
										return (
											// biome-ignore lint/suspicious/noArrayIndexKey: ordered list managed by user actions
											<div
												key={planIdx}
												className="border rounded-md p-3 space-y-3"
											>
												<div className="flex items-center justify-between">
													<div>
														<div className="text-sm font-semibold">
															Plan {planIdx + 1}
														</div>
														<div className="text-xs text-gray-500">
															{plan.interestType} - {plan.rateType}
														</div>
													</div>
													{interestPlans.length > 1 && (
														<button
															type="button"
															onClick={() => removeInterestPlan(planIdx)}
															className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
															title="Remove plan"
														>
															<Trash2 className="w-4 h-4" />
														</button>
													)}
												</div>
												<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
													<label className="flex flex-col gap-1">
														<span className="text-xs text-gray-600">
															Interest Type
														</span>
														<select
															value={plan.interestType}
															onChange={handlePlanTypeChange(
																planIdx,
																"interestType",
															)}
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
														<span className="text-xs text-gray-600">
															Rate Type
														</span>
														<select
															value={plan.rateType}
															onChange={handlePlanTypeChange(
																planIdx,
																"rateType",
															)}
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
															onChange={handleBaseRateChange(planIdx)}
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
															onClick={() => addParameter(planIdx)}
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
																(parameter, paramIdx) => (
																	// biome-ignore lint/suspicious/noArrayIndexKey: ordered list managed by user actions
																	<div
																		key={paramIdx}
																		className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end"
																	>
																		<label className="flex flex-col gap-1">
																			<span className="text-xs text-gray-600">
																				Name
																			</span>
																			<input
																				type="text"
																				value={parameter.name}
																				onChange={updateParameter(
																					planIdx,
																					paramIdx,
																					"name",
																				)}
																				className="border px-2 py-1 rounded"
																			/>
																		</label>
																		<label className="flex flex-col gap-1">
																			<span className="text-xs text-gray-600">
																				Value
																			</span>
																			<input
																				type="number"
																				value={parameter.value}
																				min={0}
																				onChange={updateParameter(
																					planIdx,
																					paramIdx,
																					"value",
																				)}
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
																				onChange={updateParameter(
																					planIdx,
																					paramIdx,
																					"interestRate",
																				)}
																				className="border px-2 py-1 rounded"
																			/>
																		</label>
																		<button
																			type="button"
																			onClick={() =>
																				removeParameter(planIdx, paramIdx)
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
												<div className="space-y-2">
													<div className="flex items-center justify-between">
														<span className="text-xs text-gray-600">
															Policies
														</span>
														<button
															type="button"
															onClick={() => addPolicy(planIdx)}
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
															{(plan.policies ?? []).map(
																(policy, policyIdx) => (
																	// biome-ignore lint/suspicious/noArrayIndexKey: ordered list managed by user actions
																	<div
																		key={policyIdx}
																		className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end"
																	>
																		<label className="flex flex-col gap-1">
																			<span className="text-xs text-gray-600">
																				Category
																			</span>
																			<input
																				type="text"
																				value={policy.interestCategory}
																				onChange={updatePolicy(
																					planIdx,
																					policyIdx,
																					"interestCategory",
																				)}
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
																				onChange={updatePolicy(
																					planIdx,
																					policyIdx,
																					"interestRate",
																				)}
																				className="border px-2 py-1 rounded"
																			/>
																		</label>
																		<button
																			type="button"
																			onClick={() =>
																				removePolicy(planIdx, policyIdx)
																			}
																			className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
																			title="Remove policy"
																		>
																			<Trash2 className="w-4 h-4" />
																		</button>
																	</div>
																),
															)}
														</div>
													)}
												</div>
											</div>
										);
									})}
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		</>
	);
}

export default TenorInterestSection;
