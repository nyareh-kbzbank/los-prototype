import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { InputInfoLabel } from "./InputInfoLabel";
import type { ProductSetupForm, TenorUnit } from "./setup-types";

type ProductSetupTabProps = {
	productSetup: ProductSetupForm;
	updateProductField: <K extends keyof ProductSetupForm>(
		field: K,
		value: ProductSetupForm[K],
	) => void;
	addTenorValue: () => void;
	updateTenorValue: (tenorId: string, value: string) => void;
	removeTenorValue: (tenorId: string) => void;
};

type SecuredTestResult = {
	passesMinimumCollateral: boolean;
	passesLtv: boolean;
	passesValuation: boolean;
	overallPass: boolean;
	ltvPercentage: number;
	adjustedCollateralValue: number;
	maxLoanByLtv: number;
	maxLoanByHaircut: number;
	error: string | null;
};

type SecuredSetupSectionProps = {
	productSetup: ProductSetupForm;
	updateProductField: <K extends keyof ProductSetupForm>(
		field: K,
		value: ProductSetupForm[K],
	) => void;
	onRunTestClick: () => void;
};

function SecuredSetupSection({
	productSetup,
	updateProductField,
	onRunTestClick,
}: Readonly<SecuredSetupSectionProps>) {
	return (
		<div className="border rounded-lg p-4 space-y-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<h3 className="text-sm font-semibold">Secured Loan Configuration</h3>
					<div className="text-xs text-gray-600">
						Configure collateral, LTV, haircut, and valuation constraints.
					</div>
				</div>
				<button
					type="button"
					onClick={onRunTestClick}
					className="text-sm border px-3 py-2 rounded hover:bg-gray-50"
				>
					Run Test
				</button>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="space-y-1">
					<InputInfoLabel
						label="Collateral Type"
						info="Primary collateral class accepted for this product."
					/>
					<select
						value={productSetup.collateralType}
						onChange={(event) =>
							updateProductField(
								"collateralType",
								event.target.value as ProductSetupForm["collateralType"],
							)
						}
						className="border rounded px-3 py-2 w-full"
					>
						<option value="LAND">Land</option>
						<option value="BUILDING">Building</option>
						<option value="VEHICLE">Vehicle</option>
						<option value="MACHINERY">Machinery</option>
						<option value="Deposit">Deposit</option>
						<option value="OTHER">Other</option>
					</select>
				</div>
				<div className="space-y-1">
					<InputInfoLabel
						label="Minimum Collateral Value"
						info="Minimum acceptable collateral market value."
					/>
					<input
						type="number"
						min={0}
						value={productSetup.minimumCollateralValue}
						onChange={(event) =>
							updateProductField(
								"minimumCollateralValue",
								Number(event.target.value) || 0,
							)
						}
						className="border rounded px-3 py-2 w-full"
						placeholder="0"
					/>
				</div>
				<div className="space-y-1">
					<InputInfoLabel
						label="Maximum LTV (%)"
						info="Maximum allowed Loan to Value ratio in percent."
					/>
					<input
						type="number"
						min={0}
						max={100}
						value={productSetup.maximumLtvPercentage}
						onChange={(event) =>
							updateProductField(
								"maximumLtvPercentage",
								Number(event.target.value) || 0,
							)
						}
						className="border rounded px-3 py-2 w-full"
						placeholder="80"
					/>
				</div>
				<div className="space-y-1">
					<InputInfoLabel
						label="Haircut Percentage (%)"
						info="Reduction factor applied to collateral value for risk."
					/>
					<input
						type="number"
						min={0}
						max={100}
						step={0.1}
						value={productSetup.haircutPercentage}
						onChange={(event) =>
							updateProductField(
								"haircutPercentage",
								Number(event.target.value) || 0,
							)
						}
						className="border rounded px-3 py-2 w-full"
						placeholder="0"
					/>
				</div>
			</div>

			<div className="space-y-2">
				<InputInfoLabel
					label="Valuation Required"
					info="Enable if a recent valuation report is mandatory."
				/>
				<label className="inline-flex items-center gap-2 text-sm">
					<input
						type="checkbox"
						checked={productSetup.valuationRequired}
						onChange={(event) =>
							updateProductField("valuationRequired", event.target.checked)
						}
					/>
					<span>Valuation report is required</span>
				</label>
			</div>

			{productSetup.valuationRequired ? (
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-1">
						<InputInfoLabel
							label="Valuation Validity Days"
							info="Maximum age of valuation report in days."
						/>
						<input
							type="number"
							min={0}
							value={productSetup.valuationValidityDays ?? ""}
							onChange={(event) =>
								updateProductField(
									"valuationValidityDays",
									event.target.value ? Number(event.target.value) : null,
								)
							}
							className="border rounded px-3 py-2 w-full"
							placeholder="e.g. 30"
						/>
					</div>
				</div>
			) : null}
		</div>
	);
}

type SecuredRunTestDialogProps = {
	productSetup: ProductSetupForm;
	testLoanAmount: number;
	setTestLoanAmount: (value: number) => void;
	testCollateralValue: number;
	setTestCollateralValue: (value: number) => void;
	testValuationAgeDays: number;
	setTestValuationAgeDays: (value: number) => void;
	testResult: SecuredTestResult | null;
	onClose: () => void;
	onRunTest: () => void;
};

function SecuredTestResultSection({
	testResult,
}: Readonly<{ testResult: SecuredTestResult | null }>) {
	if (!testResult) {
		return null;
	}

	if (testResult.error) {
		return (
			<div className="border border-red-200 bg-red-50 text-red-700 rounded p-3 text-sm">
				{testResult.error}
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<div
				className={`border rounded p-3 text-sm ${
					testResult.overallPass
						? "border-emerald-200 bg-emerald-50 text-emerald-700"
						: "border-amber-200 bg-amber-50 text-amber-700"
				}`}
			>
				{testResult.overallPass
					? "Pass: sample input meets secured constraints."
					: "Fail: sample input violates one or more secured constraints."}
			</div>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
				<div className="border rounded p-3">
					<div className="font-medium">Checks</div>
					<div className="mt-1 space-y-1 text-gray-700">
						<div>
							Minimum collateral:{" "}
							{testResult.passesMinimumCollateral ? "Pass" : "Fail"}
						</div>
						<div>LTV limit: {testResult.passesLtv ? "Pass" : "Fail"}</div>
						<div>
							Valuation validity: {testResult.passesValuation ? "Pass" : "Fail"}
						</div>
					</div>
				</div>
				<div className="border rounded p-3">
					<div className="font-medium">Computed Metrics</div>
					<div className="mt-1 space-y-1 text-gray-700">
						<div>LTV: {testResult.ltvPercentage.toFixed(2)}%</div>
						<div>
							Adjusted collateral after haircut:{" "}
							{testResult.adjustedCollateralValue.toFixed(2)}
						</div>
						<div>Max loan by LTV: {testResult.maxLoanByLtv.toFixed(2)}</div>
						<div>
							Max loan by haircut: {testResult.maxLoanByHaircut.toFixed(2)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function SecuredRunTestDialog({
	productSetup,
	testLoanAmount,
	setTestLoanAmount,
	testCollateralValue,
	setTestCollateralValue,
	testValuationAgeDays,
	setTestValuationAgeDays,
	testResult,
	onClose,
	onRunTest,
}: Readonly<SecuredRunTestDialogProps>) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<button
				type="button"
				className="absolute inset-0 bg-black/40"
				onClick={onClose}
				aria-label="Close secured test dialog"
			/>
			<div className="relative w-full max-w-3xl mx-4 rounded bg-white shadow-lg border max-h-[90vh] overflow-hidden">
				<div className="flex items-center justify-between p-4 border-b">
					<div>
						<div className="text-lg font-semibold">
							Run Test - Secured Inputs
						</div>
						<div className="text-xs text-gray-600">
							Validate collateral and valuation constraints using sample values.
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
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
								value={testLoanAmount}
								onChange={(event) =>
									setTestLoanAmount(Number(event.target.value) || 0)
								}
								className="border px-2 py-2 rounded"
							/>
						</label>
						<label className="flex flex-col gap-1 text-sm">
							<span>Collateral Value</span>
							<input
								type="number"
								min={0}
								value={testCollateralValue}
								onChange={(event) =>
									setTestCollateralValue(Number(event.target.value) || 0)
								}
								className="border px-2 py-2 rounded"
							/>
						</label>
						{productSetup.valuationRequired ? (
							<label className="flex flex-col gap-1 text-sm">
								<span>Valuation Age (days)</span>
								<input
									type="number"
									min={0}
									value={testValuationAgeDays}
									onChange={(event) =>
										setTestValuationAgeDays(Number(event.target.value) || 0)
									}
									className="border px-2 py-2 rounded"
								/>
							</label>
						) : null}
					</div>

					<div>
						<button
							type="button"
							onClick={onRunTest}
							className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
						>
							Run Test
						</button>
					</div>

					<SecuredTestResultSection testResult={testResult} />
				</div>
			</div>
		</div>
	);
}

export function ProductSetupTab({
	productSetup,
	updateProductField,
	addTenorValue,
	updateTenorValue,
	removeTenorValue,
}: Readonly<ProductSetupTabProps>) {
	const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
	const [testLoanAmount, setTestLoanAmount] = useState(0);
	const [testCollateralValue, setTestCollateralValue] = useState(0);
	const [testValuationAgeDays, setTestValuationAgeDays] = useState(0);
	const [testResult, setTestResult] = useState<SecuredTestResult | null>(null);
	const isSecured = productSetup.loanSecurity === "SECURED";

	const runSecuredTest = () => {
		if (testCollateralValue <= 0) {
			setTestResult({
				passesMinimumCollateral: false,
				passesLtv: false,
				passesValuation: !productSetup.valuationRequired,
				overallPass: false,
				ltvPercentage: 0,
				adjustedCollateralValue: 0,
				maxLoanByLtv: 0,
				maxLoanByHaircut: 0,
				error: "Collateral value must be greater than 0.",
			});
			return;
		}

		const ltvPercentage = (testLoanAmount / testCollateralValue) * 100;
		const adjustedCollateralValue =
			testCollateralValue * (1 - productSetup.haircutPercentage / 100);
		const maxLoanByLtv =
			testCollateralValue * (productSetup.maximumLtvPercentage / 100);
		const maxLoanByHaircut = adjustedCollateralValue;
		const passesMinimumCollateral =
			testCollateralValue >= productSetup.minimumCollateralValue;
		const passesLtv = ltvPercentage <= productSetup.maximumLtvPercentage;
		const passesValuation = productSetup.valuationRequired
			? productSetup.valuationValidityDays != null &&
				testValuationAgeDays <= productSetup.valuationValidityDays
			: true;
		const overallPass = passesMinimumCollateral && passesLtv && passesValuation;

		setTestResult({
			passesMinimumCollateral,
			passesLtv,
			passesValuation,
			overallPass,
			ltvPercentage,
			adjustedCollateralValue,
			maxLoanByLtv,
			maxLoanByHaircut,
			error: null,
		});
	};

	return (
		<>
			<section className="border rounded-lg p-5 space-y-4">
				<h2 className="text-lg font-semibold">Product Basics</h2>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-1">
						<InputInfoLabel
							label="Product Name"
							info="Customer-facing product name shown in application journeys."
						/>
						<input
							type="text"
							value={productSetup.productName}
							onChange={(event) =>
								updateProductField("productName", event.target.value)
							}
							className="border rounded px-3 py-2 w-full"
							placeholder="Product Name"
						/>
					</div>
					<div className="space-y-1">
						<InputInfoLabel
							label="Product Code"
							info="Unique internal code used to identify this product."
						/>
						<input
							type="text"
							value={productSetup.productCode}
							onChange={(event) =>
								updateProductField("productCode", event.target.value)
							}
							className="border rounded px-3 py-2 w-full"
							placeholder="Product Code"
						/>
					</div>
				</div>
				<div className="space-y-1">
					<InputInfoLabel
						label="Description"
						info="Short product summary for internal and customer context."
					/>
					<textarea
						value={productSetup.description}
						onChange={(event) =>
							updateProductField("description", event.target.value)
						}
						className="border rounded px-3 py-2 min-h-24 w-full"
						placeholder="Description"
					/>
				</div>
			</section>

			<section className="border rounded-lg p-5 space-y-4">
				<h2 className="text-lg font-semibold">Lending Terms</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-1">
						<InputInfoLabel
							label="Loan Security"
							info="Choose secured if collateral is required, unsecured otherwise."
						/>
						<div className="flex items-center gap-6 text-sm pt-2">
							<label className="inline-flex items-center gap-2">
								<input
									type="radio"
									name="loan-security"
									checked={productSetup.loanSecurity === "SECURED"}
									onChange={() => updateProductField("loanSecurity", "SECURED")}
								/>
								<span>Secured</span>
							</label>
							<label className="inline-flex items-center gap-2">
								<input
									type="radio"
									name="loan-security"
									checked={productSetup.loanSecurity === "UNSECURED"}
									onChange={() =>
										updateProductField("loanSecurity", "UNSECURED")
									}
								/>
								<span>Unsecured</span>
							</label>
						</div>
					</div>
				</div>

				{isSecured ? (
					<SecuredSetupSection
						productSetup={productSetup}
						updateProductField={updateProductField}
						onRunTestClick={() => {
							setTestResult(null);
							setIsTestDialogOpen(true);
						}}
					/>
				) : null}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-1">
						<InputInfoLabel
							label="Minimum Amount"
							info="Lowest loan amount allowed for this product."
						/>
						<input
							type="number"
							min={0}
							value={productSetup.minAmount}
							onChange={(event) =>
								updateProductField("minAmount", Number(event.target.value) || 0)
							}
							className="border rounded px-3 py-2 w-full"
							placeholder="Minimum Amount"
						/>
					</div>
					<div className="space-y-1">
						<InputInfoLabel
							label="Maximum Amount Type"
							info="Choose whether maximum amount is an absolute value or percentage rate."
						/>
						<select
							value={productSetup.maxAmountRateType}
							onChange={(event) =>
								updateProductField(
									"maxAmountRateType",
									event.target.value as ProductSetupForm["maxAmountRateType"],
								)
							}
							className="border rounded px-3 py-2 w-full"
						>
							<option value="FLAT">Flat rate</option>
							<option value="PERCENTAGE">Percentage rate</option>
						</select>
					</div>
					<div className="space-y-1">
						<InputInfoLabel
							label={
								productSetup.maxAmountRateType === "PERCENTAGE"
									? "Maximum Amount Rate (%)"
									: "Maximum Amount"
							}
							info={
								productSetup.maxAmountRateType === "PERCENTAGE"
									? "Highest allowed percentage rate for amount-based checks."
									: "Highest loan amount allowed for this product."
							}
						/>
						<input
							type="number"
							min={0}
							max={productSetup.maxAmountRateType === "PERCENTAGE" ? 100 : undefined}
							value={productSetup.maxAmount}
							onChange={(event) =>
								updateProductField(
									"maxAmount",
									productSetup.maxAmountRateType === "PERCENTAGE"
										? Math.min(100, Number(event.target.value) || 0)
										: Number(event.target.value) || 0,
								)
							}
							className="border rounded px-3 py-2 w-full"
							placeholder={
								productSetup.maxAmountRateType === "PERCENTAGE"
									? "Maximum Amount Rate (%)"
									: "Maximum Amount"
							}
						/>
					</div>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-1">
						<InputInfoLabel
							label="Service Fees"
							info="Optional service fees applied to the loan."
						/>
						<input
							type="number"
							min={0}
							value={productSetup.serviceFees ?? ""}
							onChange={(event) =>
								updateProductField(
									"serviceFees",
									event.target.value ? Number(event.target.value) : null,
								)
							}
							className="border rounded px-3 py-2 w-full"
							placeholder="Optional"
						/>
					</div>
					<div className="space-y-1">
						<InputInfoLabel
							label="Admin Fees"
							info="Optional administration fees for processing."
						/>
						<input
							type="number"
							min={0}
							value={productSetup.adminFees ?? ""}
							onChange={(event) =>
								updateProductField(
									"adminFees",
									event.target.value ? Number(event.target.value) : null,
								)
							}
							className="border rounded px-3 py-2 w-full"
							placeholder="Optional"
						/>
					</div>
					<div className="space-y-1">
						<InputInfoLabel
							label="Stamp Duty"
							info="Optional stamp duty charges where applicable."
						/>
						<input
							type="number"
							min={0}
							value={productSetup.stampDuty ?? ""}
							onChange={(event) =>
								updateProductField(
									"stampDuty",
									event.target.value ? Number(event.target.value) : null,
								)
							}
							className="border rounded px-3 py-2 w-full"
							placeholder="Optional"
						/>
					</div>
					<div className="space-y-1">
						<InputInfoLabel
							label="Commission Fees"
							info="Optional commission fees payable on disbursement."
						/>
						<input
							type="number"
							min={0}
							value={productSetup.commissionFees ?? ""}
							onChange={(event) =>
								updateProductField(
									"commissionFees",
									event.target.value ? Number(event.target.value) : null,
								)
							}
							className="border rounded px-3 py-2 w-full"
							placeholder="Optional"
						/>
					</div>
					<div className="space-y-1">
						<InputInfoLabel
							label="Insurance Fees"
							info="Optional insurance fees included in pricing."
						/>
						<input
							type="number"
							min={0}
							value={productSetup.insuranceFees ?? ""}
							onChange={(event) =>
								updateProductField(
									"insuranceFees",
									event.target.value ? Number(event.target.value) : null,
								)
							}
							className="border rounded px-3 py-2 w-full"
							placeholder="Optional"
						/>
					</div>
				</div>

				<div className="border"></div>
				<div className="space-y-2">
					<div className="flex items-end justify-between gap-4">
						<div className="space-y-1">
							<InputInfoLabel
								label="Tenor Unit"
								info="Unit used for tenor values (day, month, or year)."
							/>
							<select
								value={productSetup.tenorUnit}
								onChange={(event) =>
									updateProductField(
										"tenorUnit",
										event.target.value as TenorUnit,
									)
								}
								className="border rounded px-3 py-2 w-48"
							>
								<option value="DAY">Day</option>
								<option value="MONTH">Month</option>
								<option value="YEAR">Year</option>
							</select>
						</div>
						<button
							type="button"
							onClick={addTenorValue}
							className="inline-flex items-center gap-1 border rounded px-2 py-1 text-xs hover:bg-gray-50"
						>
							<Plus className="h-3 w-3" />
							Add tenor
						</button>
					</div>
					<InputInfoLabel
						label="Tenor Values"
						info="Allowed duration options for this product in the selected unit."
					/>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
						{productSetup.tenorValues.map((item) => (
							<div
								key={item.id}
								className="flex items-center gap-2 border rounded px-2 py-2"
							>
								<input
									type="number"
									min={0}
									value={item.value}
									onChange={(event) =>
										updateTenorValue(item.id, event.target.value)
									}
									className="w-full outline-none"
								/>
								<button
									type="button"
									onClick={() => removeTenorValue(item.id)}
									className="text-gray-500 hover:text-red-600"
									aria-label="Remove tenor value"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							</div>
						))}
					</div>
				</div>
			</section>

			{isTestDialogOpen ? (
				<SecuredRunTestDialog
					productSetup={productSetup}
					testLoanAmount={testLoanAmount}
					setTestLoanAmount={setTestLoanAmount}
					testCollateralValue={testCollateralValue}
					setTestCollateralValue={setTestCollateralValue}
					testValuationAgeDays={testValuationAgeDays}
					setTestValuationAgeDays={setTestValuationAgeDays}
					testResult={testResult}
					onClose={() => setIsTestDialogOpen(false)}
					onRunTest={runSecuredTest}
				/>
			) : null}
		</>
	);
}
