import { createFileRoute, Link } from "@tanstack/react-router";
import {
	Archive,
	ClipboardList,
	FilePlus2,
	LayoutTemplate,
	ListChecks,
	Network,
	Receipt,
	Table,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: App });

const configureCards = [
	{
		title: "Loan Setup",
		description:
			"Configure product details, channels, disbursement options, and workflow selection.",
		to: "/loan/setup",
		icon: LayoutTemplate,
		accent: "bg-cyan-500/15 text-cyan-400",
	},
	{
		title: "Workflow Builder",
		description: "Design and visualize the processing steps for each loan.",
		to: "/workflow/setup",
		icon: Network,
		accent: "bg-sky-500/15 text-sky-300",
	},
	{
		title: "Scorecard Setup",
		description:
			"Define rules, weights, and test inputs to calculate risk scores.",
		to: "/loan/scorecard-setup",
		icon: ClipboardList,
		accent: "bg-amber-500/15 text-amber-300",
	},
	{
		title: "Repayment Setup",
		description:
			"Create and manage reusable repayment plans for loan products.",
		to: "/loan/repayment-setup",
		icon: Receipt,
		accent: "bg-emerald-500/15 text-emerald-300",
	},
];

function App() {
	const libraryCards = [
		{
			title: "Loan Setup Library",
			description: "Browse saved loan product setups and snapshots.",
			to: "/loan",
			icon: Archive,
			accent: "bg-indigo-500/15 text-indigo-300",
		},
		{
			title: "Workflow Library",
			description: "Browse and manage saved workflows.",
			to: "/workflow",
			icon: Network,
			accent: "bg-sky-500/15 text-sky-300",
		},
		{
			title: "Scorecard Library",
			description: "View saved scorecards and open them for editing or use.",
			to: "/loan/scorecards",
			icon: ListChecks,
			accent: "bg-fuchsia-500/15 text-fuchsia-300",
		},
	];

	const actionCards = [
		{
			title: "New Application",
			description: "Capture beneficiary info, calculate scores, and submit.",
			to: "/loan/applications/create",
			icon: FilePlus2,
			accent: "bg-lime-500/15 text-lime-300",
		},
		{
			title: "Loan Applications",
			description: "Review submitted applications and drill into details.",
			to: "/loan/applications",
			icon: Table,
			accent: "bg-teal-500/15 text-teal-300",
		},
	];

	const renderCard = (card: {
		title: string;
		description: string;
		to: string;
		icon: typeof LayoutTemplate;
		accent: string;
	}) => {
		const Icon = card.icon;
		return (
			<Link
				key={card.to}
				to={card.to}
				className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md"
			>
				<span className={`rounded-lg p-2 ${card.accent}`}>
					<Icon className="w-5 h-5" />
				</span>
				<div>
					<h2 className="text-lg font-semibold text-slate-900 group-hover:text-cyan-700">
						{card.title}
					</h2>
					<p className="text-slate-600 text-sm">{card.description}</p>
				</div>
			</Link>
		);
	};

	return (
		<div className="p-6 font-sans text-slate-900">
			<section className="max-w-5xl mx-auto space-y-8">
				<div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 mb-2">
						LOS
					</p>
					<h1 className="text-3xl font-bold mb-2">Welcome back</h1>
					<p className="text-slate-600 text-base leading-relaxed mb-8">
						Set up loan products, tune scorecards, and manage applications from
						one spot.
					</p>

					<div className="space-y-8">
						<div className="space-y-3">
							<h2 className="text-sm font-semibold text-slate-700">
								Configure
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{configureCards.map(renderCard)}
							</div>
						</div>

						<div className="space-y-3">
							<h2 className="text-sm font-semibold text-slate-700">
								Libraries & Lists
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{libraryCards.map(renderCard)}
							</div>
						</div>

						<div className="space-y-3">
							<h2 className="text-sm font-semibold text-slate-700">Applications</h2>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{actionCards.map(renderCard)}
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
