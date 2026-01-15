import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ClipboardList,
	LayoutTemplate,
	Network,
	Receipt,
	Table,
} from "lucide-react";

export const Route = createFileRoute("/")({ component: App });

function App() {
	return (
		<div className="min-h-screen bg-slate-950 text-white">
			<section className="px-6 py-16 max-w-5xl mx-auto">
				<div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 shadow-xl shadow-cyan-900/40">
					<p className="text-cyan-300 text-sm font-semibold mb-2 tracking-wide">
						LOS
					</p>
					<h1 className="text-4xl font-black mb-3">Welcome back</h1>
					<p className="text-slate-300 text-lg leading-relaxed mb-8">
						Set up loan products, tune scorecards, and manage applications from
						one spot. Choose where you want to start below.
					</p>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Link
							to="/loan/repayment-setup"
							className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-cyan-500/60 hover:bg-slate-900 transition-colors"
						>
							<span className="rounded-lg bg-emerald-500/15 text-emerald-300 p-2">
								<Receipt className="w-5 h-5" />
							</span>
							<div>
								<h2 className="text-xl font-semibold">Repayment Setup</h2>
								<p className="text-slate-400 text-sm">
									Create and manage reusable repayment plans for loan products.
								</p>
							</div>
						</Link>
						<Link
							to="/loan/scorecard-setup"
							className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-cyan-500/60 hover:bg-slate-900 transition-colors"
						>
							<span className="rounded-lg bg-amber-500/15 text-amber-300 p-2">
								<ClipboardList className="w-5 h-5" />
							</span>
							<div>
								<h2 className="text-xl font-semibold">Scorecard Setup</h2>
								<p className="text-slate-400 text-sm">
									Define rules, weights, and test inputs to calculate risk
									scores.
								</p>
							</div>
						</Link>

						<Link
							to="/workflow"
							className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-cyan-500/60 hover:bg-slate-900 transition-colors"
						>
							<span className="rounded-lg bg-sky-500/15 text-sky-300 p-2">
								<Network className="w-5 h-5" />
							</span>
							<div>
								<h2 className="text-xl font-semibold">Workflows</h2>
								<p className="text-slate-400 text-sm">
									Design and visualize the processing steps for each loan.
								</p>
							</div>
						</Link>
						<Link
							to="/loan/setup"
							className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-cyan-500/60 hover:bg-slate-900 transition-colors"
						>
							<span className="rounded-lg bg-cyan-500/15 text-cyan-400 p-2">
								<LayoutTemplate className="w-5 h-5" />
							</span>
							<div>
								<h2 className="text-xl font-semibold">Loan Setup</h2>
								<p className="text-slate-400 text-sm">
									Configure product details, channels, disbursement options, and
									workflow selection.
								</p>
							</div>
						</Link>

						<Link
							to="/loan/applications"
							className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-cyan-500/60 hover:bg-slate-900 transition-colors"
						>
							<span className="rounded-lg bg-emerald-500/15 text-emerald-300 p-2">
								<Table className="w-5 h-5" />
							</span>
							<div>
								<h2 className="text-xl font-semibold">Loan Applications</h2>
								<p className="text-slate-400 text-sm">
									Review saved applications and open details.
								</p>
							</div>
						</Link>

						<Link
							to="/loan/applications/create"
							className="group flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 hover:border-cyan-500/60 hover:bg-slate-900 transition-colors"
						>
							<span className="rounded-lg bg-indigo-500/15 text-indigo-300 p-2">
								<ClipboardList className="w-5 h-5" />
							</span>
							<div>
								<h2 className="text-xl font-semibold">New Application</h2>
								<p className="text-slate-400 text-sm">
									Capture applicant info, calculate scores, and submit.
								</p>
							</div>
						</Link>
					</div>
				</div>
			</section>
		</div>
	);
}
