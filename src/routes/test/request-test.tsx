import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	CreditCard,
	FileText,
	Gauge,
	Info,
	Layout,
	Percent,
	Plus,
	Save,
	Settings,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import { useState } from "react";


export const Route = createFileRoute("/test/request-test")({
	component: RequestTest,
});

function RequestTest() {
	const [currentStep, setCurrentStep] = useState(0);

	const [formData, setFormData] = useState({
		name: "Standard Commercial Loan",

		category: "unsecured",

		description:
			"A versatile loan product designed for small to medium enterprises with competitive rates and flexible terms.",

		minAmount: 5000,

		maxAmount: 100000,

		interestType: "reducing",

		interestRate: 6.25,

		calculationMethod: "daily_balance",

		repaymentFrequency: "monthly",

		penaltyType: "percentage",

		penaltyValue: 2.5,

		coverImage:
			"https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1000",

		scorecard: [
			{ criteria: "Credit Score", operator: ">", value: "650", weight: "50%" },

			{
				criteria: "Time in Business",
				operator: ">",
				value: "2 Years",
				weight: "30%",
			},

			{
				criteria: "Debt-to-Income",
				operator: "<",
				value: "40%",
				weight: "20%",
			},
		],

		documents: [
			{ id: 1, name: "Business License", required: true },

			{ id: 2, name: "Financial Statements (2 Years)", required: true },

			{ id: 3, name: "Director ID Proof", required: true },

			{ id: 4, name: "Collateral Registry (Optional)", required: false },
		],

		fees: [
			{ name: "Application Fee", type: "fixed", value: "150" },

			{ name: "Valuation Fee", type: "variable", value: "0.5%" },
		],
	});

	const steps = [
		{
			id: "basics",
			title: "Product Setup",
			icon: <Settings className="w-5 h-5" />,
		},

		{
			id: "financials",
			title: "Interest Engine",
			icon: <Percent className="w-5 h-5" />,
		},

		{
			id: "repayment",
			title: "Repayment & Fees",
			icon: <CreditCard className="w-5 h-5" />,
		},

		{
			id: "risk",
			title: "Risk Scorecard",
			icon: <ShieldCheck className="w-5 h-5" />,
		},

		{
			id: "docs",
			title: "Document Rules",
			icon: <FileText className="w-5 h-5" />,
		},

		{
			id: "review",
			title: "Review & Brand",
			icon: <CheckCircle2 className="w-5 h-5" />,
		},
	]

	const handleNext = () =>
		setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));

	const handleBack = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

	const updateFormData = (field, value) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	}

	const changeCoverImage = () => {
		const images = [
			"https://images.unsplash.com/photo-1454165833767-027ffea9e77b?auto=format&fit=crop&q=80&w=1000",

			"https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=1000",

			"https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=1000",

			"https://images.unsplash.com/photo-1579621970795-87facc2f976d?auto=format&fit=crop&q=80&w=1000",
		]

		const currentIndex = images.indexOf(formData.coverImage);

		const nextIndex = (currentIndex + 1) % images.length;

		updateFormData("coverImage", images[nextIndex]);
	}

	const StepBasics = () => (
		<div className="space-y-6 animate-in fade-in duration-500">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				<div className="space-y-2">
					<label className="text-sm font-bold text-slate-600">
						Product Name
					</label>

					<input
						type="text"
						className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
						value={formData.name}
						onChange={(e) => updateFormData("name", e.target.value)}
					/>
				</div>

				<div className="space-y-2">
					<label className="text-sm font-bold text-slate-600">
						Product Category
					</label>

					<select
						className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
						value={formData.category}
						onChange={(e) => updateFormData("category", e.target.value)}
					>
						<option value="unsecured">Unsecured Business Loan</option>

						<option value="secured">Asset-Backed Loan</option>

						<option value="mortgage">Real Estate Mortgage</option>

						<option value="credit_card">Revolving Credit Line</option>
					</select>
				</div>
			</div>

			<div className="space-y-2">
				<label className="text-sm font-bold text-slate-600">
					Marketplace Description
				</label>

				<textarea
					className="w-full p-4 bg-slate-50 border-none rounded-2xl h-32 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
					value={formData.description}
					onChange={(e) => updateFormData("description", e.target.value)}
				/>
			</div>
		</div>
	)

	const StepFinancials = () => (
		<div className="space-y-6 animate-in fade-in duration-500">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
				<div className="bg-white border-2 border-slate-100 p-6 rounded-3xl space-y-4 shadow-sm">
					<div className="flex items-center gap-3 text-blue-600 font-bold">
						<Percent className="w-5 h-5" />

						<span>Pricing Model</span>
					</div>

					<div className="space-y-4">
						<div className="flex bg-slate-100 p-1.5 rounded-2xl">
							{["fixed", "reducing", "floating"].map((type) => (
								<button
									key={type}
									onClick={() => updateFormData("interestType", type)}
									className={`flex-1 py-2 px-3 rounded-xl capitalize text-xs font-black transition-all ${
										formData.interestType === type
											? "bg-white text-blue-600 shadow-lg"
											: "text-slate-500"
									}`}
								>
									{type}
								</button>
							))}
						</div>

						<div className="space-y-1">
							<label className="text-xs font-bold text-slate-400">
								Base Rate %
							</label>

							<input
								type="number"
								step="0.01"
								className="w-full p-3 bg-slate-50 border-none rounded-xl font-bold text-slate-800"
								value={formData.interestRate}
								onChange={(e) => updateFormData("interestRate", e.target.value)}
							/>
						</div>
					</div>
				</div>

				<div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4">
					<div className="flex items-center gap-3 text-blue-400 font-bold">
						<Gauge className="w-5 h-5" />

						<span>Exposure Limits</span>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-1">
							<label className="text-[10px] font-bold text-slate-500 uppercase">
								Min Principal
							</label>

							<div className="text-xl font-black">
								${formData.minAmount.toLocaleString()}
							</div>
						</div>

						<div className="space-y-1">
							<label className="text-[10px] font-bold text-slate-500 uppercase">
								Max Principal
							</label>

							<div className="text-xl font-black">
								${formData.maxAmount.toLocaleString()}
							</div>
						</div>
					</div>

					<p className="text-[10px] text-slate-400 font-medium">
						Auto-reject applications outside these bounds.
					</p>
				</div>
			</div>

			<div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex gap-4">
				<Info className="w-5 h-5 text-blue-500 shrink-0" />

				<p className="text-xs text-blue-800 leading-relaxed font-medium">
					<strong>Calculation Logic:</strong> Using 365-day simple interest
					accrual with {formData.interestType} balancing. Repayments will be
					auto-generated upon loan disbursement.
				</p>
			</div>
		</div>
	)

	const StepRisk = () => (
		<div className="space-y-6 animate-in fade-in duration-500">
			<div className="flex justify-between items-center">
				<h3 className="font-black text-slate-800 tracking-tight">
					Eligibility Criteria
				</h3>

				<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:shadow-lg transition-all">
					<Plus className="w-4 h-4" /> Add Rule
				</button>
			</div>

			<div className="space-y-3">
				{formData.scorecard.map((item, idx) => (
					<div
						key={idx}
						className="flex gap-4 items-center bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-100 transition-colors"
					>
						<div className="flex-1">
							<span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
								Criterion
							</span>

							<span className="font-bold text-slate-700">{item.criteria}</span>
						</div>

						<div className="w-20">
							<span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
								Logic
							</span>

							<span className="font-black text-blue-600">{item.operator}</span>
						</div>

						<div className="flex-1 text-right">
							<span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
								Target
							</span>

							<span className="font-bold text-slate-700">{item.value}</span>
						</div>

						<div className="w-16 text-right">
							<span className="text-[10px] font-black text-slate-400 uppercase block mb-1">
								Weight
							</span>

							<span className="font-black text-emerald-600">{item.weight}</span>
						</div>

						<button className="p-2 text-slate-300 hover:text-red-500 transition-colors">
							<Trash2 className="w-5 h-5" />
						</button>
					</div>
				))}
			</div>
		</div>
	)

	const StepReview = () => (
		<div className="space-y-8 pb-4 animate-in fade-in duration-500">
			<div className="bg-emerald-50 border border-emerald-100 p-5 rounded-3xl flex items-center gap-4">
				<div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
					<CheckCircle2 className="w-6 h-6" />
				</div>

				<div>
					<h4 className="font-black text-emerald-900 tracking-tight">
						Configuration Validated
					</h4>

					<p className="text-sm text-emerald-700 font-medium">
						All financial logic and compliance rules are active.
					</p>
				</div>
			</div>

			<div className="space-y-6">
				<div className="flex items-center justify-between px-2">
					<h3 className="font-black text-slate-800 text-lg flex items-center gap-3">
						<Layout className="w-5 h-5 text-blue-500" />
						Marketplace Branding
					</h3>

					<p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
						Live Visuals
					</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
					{/* Branding Control */}

					<div className="lg:col-span-2 space-y-4">
						<div className="relative group rounded-[2.5rem] overflow-hidden aspect-[4/3] shadow-2xl bg-slate-100 border-4 border-white">
							<img
								src={formData.coverImage}
								className="w-full h-full object-cover"
								alt="Cover"
							/>

							<div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-3 backdrop-blur-[2px]">
								<button
									onClick={changeCoverImage}
									className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl"
								>
									Rotate Banner
								</button>

								<button className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-xl">
									Upload Asset
								</button>
							</div>
						</div>

						<p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
							Banner Aspect 4:3
						</p>
					</div>

					{/* Live Preview Card */}

					<div className="lg:col-span-3">
						<div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-slate-100 max-w-sm ml-auto">
							<div className="h-44 relative">
								<img
									src={formData.coverImage}
									className="w-full h-full object-cover"
									alt="Preview"
								/>

								<div className="absolute top-6 left-6 flex gap-2">
									<span className="bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-slate-900 shadow-sm">
										NEW PRODUCT
									</span>

									<span className="bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black text-white shadow-lg">
										TRUSTED
									</span>
								</div>
							</div>

							<div className="p-8 space-y-5">
								<div className="flex justify-between items-start">
									<h4 className="font-black text-2xl tracking-tighter text-slate-900 leading-none">
										{formData.name}
									</h4>

									<div className="text-right">
										<span className="block font-black text-blue-600 text-xl leading-none">
											{formData.interestRate}%
										</span>

										<span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
											Interest PA
										</span>
									</div>
								</div>

								<p className="text-sm text-slate-500 font-medium leading-relaxed line-clamp-2">
									{formData.description}
								</p>

								<div className="flex gap-2 pt-2">
									<span className="bg-slate-50 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-tighter border border-slate-100">
										INSTANT APPROVAL
									</span>

									<span className="bg-slate-50 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-tighter border border-slate-100">
										LOW DOCUMENT
									</span>
								</div>

								<button className="w-full bg-slate-900 text-white py-4 rounded-3xl font-black text-sm shadow-xl shadow-slate-200 mt-2">
									Apply for this Loan
								</button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)

	return (
		<div className="min-h-screen bg-slate-50 flex flex-col items-center py-12 px-6 font-sans">
			<div className="max-w-6xl w-full bg-white rounded-[3rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col md:flex-row min-h-[800px]">
				{/* Navigation Sidebar */}

				<div className="w-full md:w-80 bg-slate-950 p-10 flex flex-col">
					<div className="mb-14">
						<div className="flex items-center gap-3">
							<div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-500/30">
								<span className="font-black text-xl italic">L</span>
							</div>

							<div>
								<span className="font-black text-white text-2xl tracking-tighter block leading-none">
									Factory
								</span>

								<span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mt-1">
									Enterprise
								</span>
							</div>
						</div>
					</div>

					<nav className="space-y-3 flex-1">
						{steps.map((step, idx) => (
							<div
								key={step.id}
								onClick={() => setCurrentStep(idx)}
								className={`flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all ${
									currentStep === idx
										? "bg-blue-600 text-white shadow-2xl shadow-blue-600/20"
										: currentStep > idx
											? "text-emerald-400 opacity-100"
											: "text-slate-600 opacity-60 hover:opacity-100"
								}`}
							>
								<div
									className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
										currentStep === idx
											? "border-white bg-blue-500"
											: currentStep > idx
												? "border-emerald-500 bg-emerald-950 text-emerald-500"
												: "border-slate-800 text-slate-800"
									}`}
								>
									{currentStep > idx ? (
										<CheckCircle2 className="w-4 h-4" />
									) : (
										<span className="text-[10px] font-black">{idx + 1}</span>
									)}
								</div>

								<div>
									<span
										className={`text-xs font-black uppercase tracking-widest block leading-none ${currentStep === idx ? `text-white` : ``}`}
									>
										{step.title}
									</span>

									{currentStep === idx && (
										<span className="text-[8px] font-black text-blue-200 mt-1 uppercase">
											Active Step
										</span>
									)}
								</div>
							</div>
						))}
					</nav>

					<div className="mt-10 pt-8 border-t border-slate-900 space-y-4">
						<div className="flex items-center gap-4">
							<div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-emerald-500">
								<div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
							</div>

							<div>
								<p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">
									Session
								</p>

								<p className="text-xs font-black text-white">Live Workspace</p>
							</div>
						</div>
					</div>
				</div>

				{/* Dynamic Content Panel */}

				<div className="flex-1 flex flex-col">
					<header className="p-12 pb-6 flex justify-between items-start">
						<div>
							<h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-2">
								{steps[currentStep].title}
							</h1>

							<div className="flex items-center gap-3">
								<div className="px-3 py-1 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 tracking-widest uppercase">
									Config Mode
								</div>

								<span className="text-blue-600 text-[11px] font-black uppercase tracking-[0.2em]">
									Step {currentStep + 1} / 6
								</span>
							</div>
						</div>

						<button className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors border border-slate-100 shadow-sm">
							<Info className="w-6 h-6" />
						</button>
					</header>

					<main className="flex-1 px-12 py-6 overflow-y-auto max-h-[580px]">
						{currentStep === 0 && <StepBasics />}

						{currentStep === 1 && <StepFinancials />}

						{currentStep === 2 && (
							<div className="space-y-6 animate-in fade-in duration-500">
								<h3 className="font-black text-slate-800 tracking-tight">
									Billing Parameters
								</h3>

								<div className="grid grid-cols-2 gap-6">
									<div className="space-y-2">
										<label className="text-xs font-black text-slate-400 uppercase tracking-widest">
											Interval
										</label>

										<select className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold">
											<option>Monthly Cycles</option>

											<option>Weekly (SME Focus)</option>

											<option>Quarterly (Agriculture)</option>
										</select>
									</div>

									<div className="space-y-2">
										<label className="text-xs font-black text-slate-400 uppercase tracking-widest">
											Grace Period
										</label>

										<input
											type="number"
											defaultValue={5}
											className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold"
										/>
									</div>
								</div>

								<div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 space-y-3">
									<div className="flex items-center gap-3 text-amber-700 font-black text-sm">
										<AlertCircle className="w-5 h-5" />
										Penalty Engine Trigger
									</div>

									<p className="text-xs text-amber-900 leading-relaxed font-medium opacity-80">
										Late payments exceeding the 5-day grace period will incur a
										non-refundable finance charge of{" "}
										<strong>{formData.penaltyValue}%</strong> of the overdue
										principal balance.
									</p>
								</div>
							</div>
						)}

						{currentStep === 3 && <StepRisk />}

						{currentStep === 4 && (
							<div className="space-y-4">
								<h3 className="font-black text-slate-800 tracking-tight mb-6">
									Document Checklist
								</h3>

								<div className="space-y-3">
									{formData.documents.map((doc, idx) => (
										<div
											key={doc.id}
											className="p-4 bg-white rounded-2xl border-2 border-slate-50 flex items-center justify-between hover:shadow-md transition-all"
										>
											<div className="flex items-center gap-4">
												<div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
													<FileText className="w-6 h-6" />
												</div>

												<div>
													<span className="font-black text-slate-700 text-sm block tracking-tight">
														{doc.name}
													</span>

													<span className="text-[10px] font-bold text-slate-400 uppercase">
														Verification Required
													</span>
												</div>
											</div>

											<div className="flex items-center gap-4">
												<span
													className={`text-[9px] font-black px-3 py-1 rounded-full ${doc.required ? `bg-blue-50 text-blue-600` : `bg-slate-50 text-slate-400`}`}
												>
													{doc.required ? "MANDATORY" : "OPTIONAL"}
												</span>

												<button className="p-2 text-slate-200 hover:text-red-500 transition-colors">
													<Trash2 className="w-4 h-4" />
												</button>
											</div>
										</div>
									))}
								</div>

								<button className="w-full py-4 border-2 border-dashed border-slate-100 rounded-3xl text-slate-400 text-xs font-black uppercase tracking-widest hover:border-blue-200 hover:text-blue-500 transition-all">
									Add Compliance Field
								</button>
							</div>
						)}

						{currentStep === 5 && <StepReview />}
					</main>

					<footer className="p-12 pt-6 flex justify-between items-center bg-white">
						<button
							onClick={handleBack}
							disabled={currentStep === 0}
							className={`flex items-center gap-3 px-8 py-4 rounded-3xl font-black text-[11px] uppercase tracking-widest transition-all ${
								currentStep === 0
									? "text-slate-200 cursor-not-allowed"
									: "text-slate-500 hover:bg-slate-100"
							}`}
						>
							<ChevronLeft className="w-4 h-4" /> Back
						</button>

						{currentStep === steps.length - 1 ? (
							<button className="flex items-center gap-4 bg-emerald-600 text-white px-12 py-5 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.25em] shadow-2xl shadow-emerald-500/30 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all">
								<Save className="w-5 h-5" /> Launch Product
							</button>
						) : (
							<button
								onClick={handleNext}
								className="flex items-center gap-4 bg-slate-900 text-white px-12 py-5 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.25em] shadow-2xl shadow-slate-900/10 hover:bg-slate-800 hover:scale-[1.02] active:scale-95 transition-all"
							>
								Continue <ChevronRight className="w-4 h-4" />
							</button>
						)}
					</footer>
				</div>
			</div>

			<div className="mt-10 flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest opacity-40">
				<span>Loan Factory v5.0</span>

				<div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>

				<span>Security Tier 4</span>

				<div className="w-1.5 h-1.5 bg-slate-300 rounded-full"></div>

				<span>Encrypted Workspace</span>
			</div>
		</div>
	)
}
