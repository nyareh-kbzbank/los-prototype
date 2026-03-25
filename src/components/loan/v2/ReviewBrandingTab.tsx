import { CheckCircle2, ImageIcon, Plus, Sparkles, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { InputInfoLabel } from "./InputInfoLabel";
import type {
	ChannelConfig,
	ChannelWorkflowMapItem,
	V2BrandingSetup,
	WorkflowListItem,
} from "./setup-types";

type ReviewBrandingTabProps = {
	brandingSetup: V2BrandingSetup;
	onBrandingChange: (value: V2BrandingSetup) => void;
	channels: ChannelConfig[];
	workflowList: WorkflowListItem[];
	mappedChannelWorkflows: ChannelWorkflowMapItem[];
	addChannel: () => void;
	updateChannelField: <K extends keyof ChannelConfig>(
		channelId: string,
		field: K,
		value: ChannelConfig[K],
	) => void;
	removeChannel: (channelId: string) => void;
	productName: string;
	productCode: string;
	productDescription: string;
	minAmount: number;
	maxAmount: number;
	baseRate: number | null;
	channelCount: number;
	workflowCount: number;
	interestPlanCount: number;
	documentRuleCount: number;
	decisionRuleCount: number;
	bureauRequired: boolean;
	bureauProvider: string;
	disbursementType: string;
};

const formatMoney = (value: number) =>
	value.toLocaleString(undefined, {
		maximumFractionDigits: 0,
	});

const formatRate = (value: number | null) => {
	if (value === null || !Number.isFinite(value)) return "Custom";
	return `${value.toFixed(2)}%`;
};

const previewPillDefaults = ["INSTANT APPROVAL", "LOW DOCUMENT"];
const channelNameOptions = [
	"Wallet",
	"Mobile Banking",
	"Internet Banking",
	"Internal",
	"Website",
	"SSBP",
] as const;

export function ReviewBrandingTab({
	brandingSetup,
	onBrandingChange,
	channels,
	workflowList,
	mappedChannelWorkflows,
	addChannel,
	updateChannelField,
	removeChannel,
	productName,
	productCode,
	productDescription,
	minAmount,
	maxAmount,
	baseRate,
	channelCount,
	workflowCount,
	interestPlanCount,
	documentRuleCount,
	decisionRuleCount,
	bureauRequired,
	bureauProvider,
	disbursementType,
}: Readonly<ReviewBrandingTabProps>) {
	const [pendingTag, setPendingTag] = useState("");

	const displayName = productName.trim() || "Untitled Product";
	const displayDescription =
		brandingSetup.shortDescription.trim() ||
		brandingSetup.longDescription.trim() ||
		productDescription.trim() ||
		"Add a marketplace-ready summary to highlight the product value proposition.";
	const detailDescription =
		brandingSetup.longDescription.trim() || displayDescription;
	const previewTags = brandingSetup.tags.length
		? brandingSetup.tags
		: previewPillDefaults;
	const previewBannerImage = brandingSetup.bannerImageUrl.trim();
	const previewCardImage =
		brandingSetup.cardImageUrl.trim() || previewBannerImage;

	const validationItems = useMemo(
		() => [
			`${channelCount} channel${channelCount === 1 ? "" : "s"} configured`,
			`${workflowCount} workflow${workflowCount === 1 ? "" : "s"} mapped`,
			`${interestPlanCount} interest plan${interestPlanCount === 1 ? "" : "s"}`,
			`${documentRuleCount} document rule band${documentRuleCount === 1 ? "" : "s"}`,
			`${decisionRuleCount} decision rule${decisionRuleCount === 1 ? "" : "s"}`,
			`${disbursementType === "MULTIPLE" ? "Multiple" : "Single"} disbursement flow`,
		],
		[
			channelCount,
			decisionRuleCount,
			disbursementType,
			documentRuleCount,
			interestPlanCount,
			workflowCount,
		],
	);

	const updateBrandingField = <K extends keyof V2BrandingSetup>(
		field: K,
		value: V2BrandingSetup[K],
	) => {
		onBrandingChange({
			...brandingSetup,
			[field]: value,
		});
	};

	const addTag = () => {
		const nextTags = pendingTag
			.split(",")
			.map((tag) => tag.trim())
			.filter(Boolean);
		if (nextTags.length === 0) return;

		const uniqueTags = [...brandingSetup.tags];
		for (const tag of nextTags) {
			if (
				!uniqueTags.some(
					(existingTag) => existingTag.toLowerCase() === tag.toLowerCase(),
				)
			) {
				uniqueTags.push(tag);
			}
		}

		updateBrandingField("tags", uniqueTags);
		setPendingTag("");
	};

	const removeTag = (tagToRemove: string) => {
		updateBrandingField(
			"tags",
			brandingSetup.tags.filter((tag) => tag !== tagToRemove),
		);
	};

	return (
		<div className="space-y-6">
			<section className="rounded-[28px] border bg-emerald-50 p-6 shadow-sm space-y-5">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h2 className="text-lg font-semibold text-slate-950">
							Channel Configuration
						</h2>
						<p className="mt-1 text-sm text-slate-600">
							Assign origination channels and connect each one to the workflow that should run during review.
						</p>
					</div>
					<button
						type="button"
						onClick={addChannel}
						className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
					>
						<Plus className="h-4 w-4" />
						Add channel
					</button>
				</div>

				<div className="space-y-3">
					{channels.map((channel) => (
						<div
							key={channel.id}
							className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_1.2fr_auto]"
						>
							<div className="space-y-1">
								<InputInfoLabel
									label="Channel Name"
									info="Display name for the origination channel."
								/>
								<select
									value={channel.name}
									onChange={(event) =>
										updateChannelField(channel.id, "name", event.target.value)
									}
									className="w-full rounded-xl border bg-white px-3 py-2"
								>
									<option value="">Select channel</option>
									{channelNameOptions.map((option) => (
										<option key={option} value={option}>
											{option}
										</option>
									))}
								</select>
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
									className="w-full rounded-xl border bg-white px-3 py-2"
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
									className="w-full rounded-xl border bg-white px-3 py-2"
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
								className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-100"
							>
								<Trash2 className="h-4 w-4" />
								Remove
							</button>
						</div>
					))}
				</div>
			</section>


			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
				<div className="space-y-6">
					<section className="rounded-[28px] border bg-white p-6 shadow-sm">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h2 className="text-lg font-semibold text-slate-950">
									Review Snapshot
								</h2>
								<p className="mt-1 text-sm text-slate-600">
									Final confirmation of the commercial setup before launch.
								</p>
							</div>
							<div className="rounded-2xl bg-slate-100 px-3 py-2 text-right text-xs text-slate-500">
								<div className="uppercase tracking-[0.24em]">Mode</div>
								<div className="mt-1 font-semibold text-slate-900">Config</div>
							</div>
						</div>

						<div className="mt-6 grid gap-4 md:grid-cols-2">
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div className="text-xs uppercase tracking-[0.24em] text-slate-500">
									Product
								</div>
								<div className="mt-2 text-lg font-semibold text-slate-950">
									{displayName}
								</div>
								<div className="mt-1 text-sm text-slate-600">
									{productCode.trim() || "Code pending"}
								</div>
								<div className="mt-4 text-sm text-slate-700">
									{detailDescription}
								</div>
							</div>

							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div className="text-xs uppercase tracking-[0.24em] text-slate-500">
									Commercial Highlights
								</div>
								<div className="mt-3 grid gap-3 sm:grid-cols-2">
									<div>
										<div className="text-xs text-slate-500">Ticket Size</div>
										<div className="text-sm font-semibold text-slate-950">
											{formatMoney(minAmount)} - {formatMoney(maxAmount)}
										</div>
									</div>
									<div>
										<div className="text-xs text-slate-500">Base Rate</div>
										<div className="text-sm font-semibold text-slate-950">
											{formatRate(baseRate)}
										</div>
									</div>
									<div>
										<div className="text-xs text-slate-500">Bureau Check</div>
										<div className="text-sm font-semibold text-slate-950">
											{bureauRequired
												? bureauProvider.trim() || "Enabled"
												: "Disabled"}
										</div>
									</div>
									<div>
										<div className="text-xs text-slate-500">Distribution</div>
										<div className="text-sm font-semibold text-slate-950">
											{workflowCount} workflow path{workflowCount === 1 ? "" : "s"}
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>

					<section className="rounded-[28px] border bg-white p-6 shadow-sm">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h2 className="text-lg font-semibold text-slate-950">
									Marketplace Branding
								</h2>
								<p className="mt-1 text-sm text-slate-600">
									Configure visual assets and the product story shown in catalog or partner channels.
								</p>
							</div>
							<div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
								<Sparkles className="h-3.5 w-3.5" />
								Live visuals
							</div>
						</div>

						<div className="mt-6 grid gap-4 md:grid-cols-2">
							<div className="space-y-1 md:col-span-2">
								<InputInfoLabel
									label="Banner Image URL"
									info="Wide visual used as the hero or listing banner in marketplace surfaces."
								/>
								<input
									type="url"
									value={brandingSetup.bannerImageUrl}
									onChange={(event) =>
										updateBrandingField("bannerImageUrl", event.target.value)
									}
									className="w-full rounded-xl border px-3 py-2"
									placeholder="https://example.com/banner-image.jpg"
								/>
							</div>

							<div className="space-y-1 md:col-span-2">
								<InputInfoLabel
									label="Card Image URL"
									info="Primary product card image for tiles, cards, or embedded partner widgets."
								/>
								<input
									type="url"
									value={brandingSetup.cardImageUrl}
									onChange={(event) =>
										updateBrandingField("cardImageUrl", event.target.value)
									}
									className="w-full rounded-xl border px-3 py-2"
									placeholder="https://example.com/product-card.jpg"
								/>
							</div>

							<div className="space-y-1">
								<InputInfoLabel
									label="Short Description"
									info="Compact summary used in listings, teasers, and lightweight product cards."
								/>
								<textarea
									value={brandingSetup.shortDescription}
									onChange={(event) =>
										updateBrandingField("shortDescription", event.target.value)
									}
									className="min-h-28 w-full rounded-xl border px-3 py-2"
									placeholder="Short customer-facing description"
								/>
							</div>

							<div className="space-y-1">
								<InputInfoLabel
									label="Long Description"
									info="Expanded marketing copy for richer landing cards, partner reviews, or detail views."
								/>
								<textarea
									value={brandingSetup.longDescription}
									onChange={(event) =>
										updateBrandingField("longDescription", event.target.value)
									}
									className="min-h-28 w-full rounded-xl border px-3 py-2"
									placeholder="Long-form value proposition and positioning"
								/>
							</div>

							<div className="space-y-2 md:col-span-2">
								<InputInfoLabel
									label="Marketplace Tags"
									info="Add short discovery tags. Press Enter or click Add. Comma-separated input is supported."
								/>
								<div className="flex flex-col gap-3 md:flex-row">
									<input
										type="text"
										value={pendingTag}
										onChange={(event) => setPendingTag(event.target.value)}
										onKeyDown={(event) => {
											if (event.key !== "Enter") return;
											event.preventDefault();
											addTag();
										}}
										className="w-full rounded-xl border px-3 py-2"
										placeholder="Trusted, SME, Fast approval"
									/>
									<button
										type="button"
										onClick={addTag}
										className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-slate-50"
									>
										<Plus className="h-4 w-4" />
										Add tag
									</button>
								</div>
								<div className="flex flex-wrap gap-2">
									{brandingSetup.tags.length === 0 ? (
										<div className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500">
											No branding tags added yet.
										</div>
									) : null}
									{brandingSetup.tags.map((tag) => (
										<button
											type="button"
											key={tag}
											onClick={() => removeTag(tag)}
											className="inline-flex items-center gap-2 rounded-full border bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
										>
											<span>{tag}</span>
											<X className="h-3.5 w-3.5" />
										</button>
									))}
								</div>
							</div>
						</div>
					</section>
				</div>

				<aside className="rounded-4xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/10">
					<div className="flex items-center justify-between gap-3">
						<div>
							<div className="text-xs uppercase tracking-[0.32em] text-slate-400">
								Marketplace Branding
							</div>
							<h2 className="mt-2 text-2xl font-semibold">Live Visuals</h2>
						</div>
						<div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
							{channelCount} channel{channelCount === 1 ? "" : "s"}
						</div>
					</div>

					<div className="mt-6 space-y-5">
						<div>
							<div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
								Banner Aspect 4:3
							</div>
							<div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
								{previewBannerImage ? (
									<img
										src={previewBannerImage}
										alt={`${displayName} banner preview`}
										className="aspect-4/3 h-full w-full object-cover"
									/>
								) : (
										<div className="flex aspect-4/3 flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.35),transparent_55%),linear-gradient(135deg,rgba(15,23,42,1),rgba(30,41,59,0.92))] px-6 text-center text-slate-300">
										<div className="rounded-2xl bg-white/10 p-3">
											<ImageIcon className="h-6 w-6" />
										</div>
										<div className="text-sm font-medium">Add a banner image URL</div>
										<div className="max-w-xs text-xs text-slate-400">
											This will preview your marketplace hero banner in real time.
										</div>
									</div>
								)}
							</div>
						</div>

						<div className="overflow-hidden rounded-[30px] bg-white text-slate-950">
							<div className="relative border-b border-slate-100">
								{previewCardImage ? (
									<img
										src={previewCardImage}
										alt={`${displayName} card preview`}
										className="aspect-16/10 h-full w-full object-cover"
									/>
								) : (
										<div className="flex aspect-16/10 items-center justify-center bg-[linear-gradient(135deg,#dbeafe,#eff6ff_45%,#ffffff)] text-slate-400">
										<ImageIcon className="h-8 w-8" />
									</div>
								)}
								<div className="absolute left-4 top-4 flex flex-wrap gap-2">
									{previewTags.slice(0, 2).map((tag) => (
										<span
											key={tag}
											className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-900 shadow"
										>
											{tag}
										</span>
									))}
								</div>
							</div>

							<div className="space-y-4 p-5">
								<div className="flex items-start justify-between gap-4">
									<div>
										<div className="text-2xl font-semibold leading-tight">
											{displayName}
										</div>
										<div className="mt-1 text-sm text-slate-500">
											{productCode.trim() || "Product code pending"}
										</div>
									</div>
									<div className="text-right">
										<div className="text-2xl font-semibold text-blue-600">
											{formatRate(baseRate)}
										</div>
										<div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
											Interest p.a
										</div>
									</div>
								</div>

								<p className="text-sm leading-6 text-slate-600">{displayDescription}</p>

								<div className="flex flex-wrap gap-2">
									{previewTags.map((tag) => (
										<span
											key={tag}
											className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600"
										>
											{tag}
										</span>
									))}
								</div>

								<div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
									<div>
										<div className="text-xs uppercase tracking-[0.2em] text-slate-400">
											Amount range
										</div>
										<div className="mt-1 font-semibold text-slate-900">
											{formatMoney(minAmount)} - {formatMoney(maxAmount)}
										</div>
									</div>
									<div>
										<div className="text-xs uppercase tracking-[0.2em] text-slate-400">
											Setup coverage
										</div>
										<div className="mt-1 font-semibold text-slate-900">
											{interestPlanCount} plan{interestPlanCount === 1 ? "" : "s"} · {documentRuleCount} doc band{documentRuleCount === 1 ? "" : "s"}
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
}