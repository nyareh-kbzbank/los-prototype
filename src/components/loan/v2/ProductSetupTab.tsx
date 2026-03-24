import { Plus, Trash2 } from "lucide-react";
import { InputInfoLabel } from "./InputInfoLabel";
import type {
	ChannelConfig,
	ChannelWorkflowMapItem,
	ProductSetupForm,
	TenorUnit,
	WorkflowListItem,
} from "./setup-types";

type ProductSetupTabProps = {
	productSetup: ProductSetupForm;
	channels: ChannelConfig[];
	workflowList: WorkflowListItem[];
	mappedChannelWorkflows: ChannelWorkflowMapItem[];
	updateProductField: <K extends keyof ProductSetupForm>(
		field: K,
		value: ProductSetupForm[K],
	) => void;
	addTenorValue: () => void;
	updateTenorValue: (tenorId: string, value: string) => void;
	removeTenorValue: (tenorId: string) => void;
	addChannel: () => void;
	updateChannelField: <K extends keyof ChannelConfig>(
		channelId: string,
		field: K,
		value: ChannelConfig[K],
	) => void;
	removeChannel: (channelId: string) => void;
};

export function ProductSetupTab({
	productSetup,
	channels,
	workflowList,
	mappedChannelWorkflows,
	updateProductField,
	addTenorValue,
	updateTenorValue,
	removeTenorValue,
	addChannel,
	updateChannelField,
	removeChannel,
}: ProductSetupTabProps) {
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
				<h2 className="text-lg font-semibold">Loan Setup</h2>
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div className="space-y-1">
						<InputInfoLabel
							label="Loan Security"
							info="Choose secured if collateral is required, unsecured otherwise."
						/>
						<div />
						<div />
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
							label="Maximum Amount"
							info="Highest loan amount allowed for this product."
						/>
						<input
							type="number"
							min={0}
							value={productSetup.maxAmount}
							onChange={(event) =>
								updateProductField("maxAmount", Number(event.target.value) || 0)
							}
							className="border rounded px-3 py-2 w-full"
							placeholder="Maximum Amount"
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

			<section className="border rounded-lg p-5 space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Channel Configuration</h2>
					<button
						type="button"
						onClick={addChannel}
						className="inline-flex items-center gap-2 border rounded px-3 py-2 text-sm hover:bg-gray-50"
					>
						<Plus className="h-4 w-4" />
						Add channel
					</button>
				</div>
				{channels.map((channel) => (
					<div
						key={channel.id}
						className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.2fr_auto] gap-3 border rounded p-3"
					>
						<div className="space-y-1">
							<InputInfoLabel
								label="Channel Name"
								info="Display name for the origination channel."
							/>
							<input
								type="text"
								value={channel.name}
								onChange={(event) =>
									updateChannelField(channel.id, "name", event.target.value)
								}
								className="border rounded px-3 py-2 w-full"
								placeholder="Channel Name"
							/>
						</div>
						<div className="space-y-1">
							<InputInfoLabel
								label="Channel Code"
								info="Short code for integrations and reporting."
							/>
							<input
								type="text"
								value={channel.code}
								onChange={(event) =>
									updateChannelField(channel.id, "code", event.target.value)
								}
								className="border rounded px-3 py-2 w-full"
								placeholder="Channel Code"
							/>
						</div>
						<div className="space-y-1">
							<InputInfoLabel
								label="Workflow"
								info="Workflow applied when applications come from this channel."
							/>
							<select
								value={channel.workflowId}
								onChange={(event) =>
									updateChannelField(
										channel.id,
										"workflowId",
										event.target.value,
									)
								}
								className="border rounded px-3 py-2 w-full"
							>
								<option value="">(Select workflow)</option>
								{workflowList.map((workflow) => (
									<option key={workflow.workflowId} value={workflow.workflowId}>
										{workflow.name}
									</option>
								))}
							</select>
						</div>
						<button
							type="button"
							onClick={() => removeChannel(channel.id)}
							className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
						>
							Remove
						</button>
					</div>
				))}
			</section>

			<section className="border rounded-lg p-5">
				<h2 className="text-lg font-semibold mb-2">
					Workflow Setup by Channel
				</h2>
				<table className="w-full text-sm border-collapse">
					<thead>
						<tr className="border-b text-left text-gray-600">
							<th className="py-2 pr-3">Channel</th>
							<th className="py-2 pr-3">Code</th>
							<th className="py-2">Assigned Workflow</th>
						</tr>
					</thead>
					<tbody>
						{mappedChannelWorkflows.map(({ channel, workflowName }) => (
							<tr
								key={`mapped-${channel.id}`}
								className="border-b last:border-b-0"
							>
								<td className="py-2 pr-3">
									{channel.name || "(Unnamed channel)"}
								</td>
								<td className="py-2 pr-3">{channel.code || "—"}</td>
								<td className="py-2">
									{workflowName ? (
										<span className="text-emerald-700">{workflowName}</span>
									) : (
										<span className="text-amber-700">No workflow assigned</span>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</section>
		</>
	);
}
