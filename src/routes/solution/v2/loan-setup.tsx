import { createFileRoute, Link } from "@tanstack/react-router";
import { Info, Plus, Trash2, Workflow } from "lucide-react";
import { useMemo, useState } from "react";
import { getWorkflowList, useWorkflowStore } from "@/lib/workflow-store";

export const Route = createFileRoute("/solution/v2/loan-setup")({
	component: LoanProductSetup,
});

type LoanSecurityType = "SECURED" | "UNSECURED";
type TenorUnit = "DAY" | "MONTH" | "YEAR";

type TenorValueItem = {
	id: string;
	value: number;
};

type ProductSetupForm = {
	productName: string;
	productCode: string;
	description: string;
	loanSecurity: LoanSecurityType;
	minAmount: number;
	maxAmount: number;
	tenorUnit: TenorUnit;
	tenorValues: TenorValueItem[];
};

type ChannelConfig = {
	id: string;
	name: string;
	code: string;
	workflowId: string;
};

function createId() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createChannelConfig(): ChannelConfig {
	return { id: createId(), name: "", code: "", workflowId: "" };
}

function createTenorValue(value: number): TenorValueItem {
	return { id: createId(), value };
}

function InputInfoLabel({ label, info }: { label: string; info: string }) {
	return (
		<div className="flex items-center gap-1 text-sm font-medium text-slate-700">
			<span>{label}</span>
			<span className="relative inline-flex items-center">
				<button
					type="button"
					aria-label={info}
					className="peer inline-flex items-center justify-center text-slate-500 cursor-help"
				>
					<Info className="h-3.5 w-3.5" />
				</button>
				<span className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 w-64 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1.5 text-[11px] leading-snug text-white opacity-0 shadow-lg transition-opacity peer-hover:opacity-100 peer-focus-visible:opacity-100">
					{info}
				</span>
			</span>
		</div>
	);
}

function LoanProductSetup() {
	const workflows = useWorkflowStore((state) => state.workflows);
	const workflowList = useMemo(() => getWorkflowList(workflows), [workflows]);
	const [currentStep, setCurrentStep] = useState(0);

	const steps = [
		{
			id: "product-setup",
			title: "Product Setup",
			description: "Product, loan, channel, and workflow mapping",
		},
	] as const;

	const [productSetup, setProductSetup] = useState<ProductSetupForm>({
		productName: "",
		productCode: "",
		description: "",
		loanSecurity: "UNSECURED",
		minAmount: 500000,
		maxAmount: 10000000,
		tenorUnit: "MONTH",
		tenorValues: [
			createTenorValue(6),
			createTenorValue(12),
			createTenorValue(18),
		],
	});
	const [channels, setChannels] = useState<ChannelConfig[]>([
		createChannelConfig(),
	]);

	const mappedChannelWorkflows = useMemo(
		() =>
			channels.map((channel) => {
				const selectedWorkflow = workflowList.find(
					(wf) => wf.workflowId === channel.workflowId,
				);
				return { channel, workflowName: selectedWorkflow?.name ?? null };
			}),
		[channels, workflowList],
	);

	const updateProductField = <K extends keyof ProductSetupForm>(
		field: K,
		value: ProductSetupForm[K],
	) => {
		setProductSetup((prev) => ({ ...prev, [field]: value }));
	};

	const addTenorValue = () => {
		setProductSetup((prev) => ({
			...prev,
			tenorValues: [...prev.tenorValues, createTenorValue(0)],
		}));
	};

	const updateTenorValue = (tenorId: string, value: string) => {
		const parsedValue = Number(value);
		setProductSetup((prev) => ({
			...prev,
			tenorValues: prev.tenorValues.map((item) =>
				item.id === tenorId
					? { ...item, value: Number.isFinite(parsedValue) ? parsedValue : 0 }
					: item,
			),
		}));
	};

	const removeTenorValue = (tenorId: string) => {
		setProductSetup((prev) => ({
			...prev,
			tenorValues: prev.tenorValues.filter((item) => item.id !== tenorId),
		}));
	};

	const addChannel = () => {
		setChannels((prev) => [...prev, createChannelConfig()]);
	};

	const updateChannelField = <K extends keyof ChannelConfig>(
		channelId: string,
		field: K,
		value: ChannelConfig[K],
	) => {
		setChannels((prev) =>
			prev.map((channel) =>
				channel.id === channelId ? { ...channel, [field]: value } : channel,
			),
		);
	};

	const removeChannel = (channelId: string) => {
		setChannels((prev) =>
			prev.length === 1
				? [createChannelConfig()]
				: prev.filter((channel) => channel.id !== channelId),
		);
	};

	const stepContent = (
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
									updateChannelField(channel.id, "workflowId", event.target.value)
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
				<h2 className="text-lg font-semibold mb-2">Workflow Setup by Channel</h2>
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
								<td className="py-2 pr-3">{channel.name || "(Unnamed channel)"}</td>
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

	return (
		<div className="min-h-screen bg-slate-100 p-6">
			<div className="mx-auto max-w-6xl bg-white rounded-3xl border overflow-hidden flex flex-col md:flex-row min-h-180">
				<aside className="w-full md:w-72 bg-slate-950 p-6 md:p-8 text-white">
					<div className="mb-8">
						<div className="text-xl font-semibold">Setup Flow</div>
						<div className="text-xs text-slate-400 mt-1">Loan Product V2</div>
					</div>

					<nav className="space-y-2">
						{steps.map((step, index) => {
							const isActive = index === currentStep;
							const isDone = index < currentStep;
							return (
								<button
									type="button"
									key={step.id}
									onClick={() => setCurrentStep(index)}
									className={`w-full text-left rounded-xl p-3 border transition ${
										isActive
											? "bg-blue-600 border-blue-500"
											: isDone
												? "bg-slate-900 border-slate-700"
												: "bg-transparent border-slate-800 hover:bg-slate-900"
									}`}
								>
									<div className="flex items-start gap-3">
										<div className="mt-0.5 h-6 w-6 rounded-full border border-white/40 flex items-center justify-center text-xs font-semibold">
											{index + 1}
										</div>
										<div>
											<div className="text-sm font-medium">{step.title}</div>
											<div className="text-xs text-slate-300">{step.description}</div>
										</div>
									</div>
								</button>
							);
						})}
					</nav>
				</aside>

				<div className="flex-1 p-6 md:p-8 lg:p-10 flex flex-col">
					<header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
						<div>
							<h1 className="text-3xl font-bold">{steps[currentStep].title}</h1>
							<p className="text-sm text-gray-600 mt-1">
								{steps[currentStep].description}
							</p>
						</div>
						<div className="flex items-center gap-3">
							<span className="text-xs text-gray-500">
								Step {currentStep + 1} / {steps.length}
							</span>
							<Link
								to="/workflow"
								className="inline-flex items-center gap-2 border rounded px-3 py-2 text-sm hover:bg-gray-50"
							>
								<Workflow className="h-4 w-4" />
								Manage workflows
							</Link>
						</div>
					</header>

					<div className="flex-1 space-y-4">{stepContent}</div>
				</div>
			</div>
		</div>
	);
}
