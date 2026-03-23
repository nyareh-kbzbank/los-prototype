import { useState } from "react";

type DisbursementType = "SINGLE" | "MULTIPLE";
type DisbursementTiming = "IMMEDIATE" | "MILESTONE";

type TrancheItem = {
	id: string;
	tranche: string;
	amount: number;
	triggerType: string;
	timingMeaning: DisbursementTiming;
};

const createId = () =>
	typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2);

const createTranche = (index: number): TrancheItem => ({
	id: createId(),
	tranche: `Tranche ${index}`,
	amount: 0,
	triggerType: "",
	timingMeaning: "IMMEDIATE",
});

export function DisbursementSetupTab() {
	const [disbursementType, setDisbursementType] =
		useState<DisbursementType>("SINGLE");
	const [releaseFullAmountAtOnce, setReleaseFullAmountAtOnce] = useState(true);
	const [method, setMethod] = useState("BANK_TRANSFER");
	const [processingFee, setProcessingFee] = useState<number>(0);
	const [disbursementFee, setDisbursementFee] = useState<number>(0);
	const [tranches, setTranches] = useState<TrancheItem[]>([createTranche(1)]);

	const handleDisbursementTypeChange = (value: DisbursementType) => {
		setDisbursementType(value);
		if (value === "SINGLE") {
			setReleaseFullAmountAtOnce(true);
		}
	};

	const addTranche = () => {
		setTranches((current) => [...current, createTranche(current.length + 1)]);
	};

	const updateTranche = (
		trancheId: string,
		field: keyof TrancheItem,
		value: string | number,
	) => {
		setTranches((current) =>
			current.map((item) =>
				item.id === trancheId ? { ...item, [field]: value } : item,
			),
		);
	};

	const removeTranche = (trancheId: string) => {
		setTranches((current) =>
			current.length === 1
				? current
				: current.filter((item) => item.id !== trancheId),
		);
	};

	return (
		<section className="border rounded-lg p-5 space-y-5">
			<div>
				<h2 className="text-lg font-semibold">Disbursement Setup</h2>
				<div className="text-xs text-gray-600 mt-1">
					Configure disbursement type, tranches, method, and fees.
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<label className="flex flex-col gap-1 text-sm">
					<span>Type</span>
					<select
						value={disbursementType}
						onChange={(event) =>
							handleDisbursementTypeChange(
								event.target.value as DisbursementType,
							)
						}
						className="border rounded px-2 py-2"
					>
						<option value="SINGLE">Single</option>
						<option value="MULTIPLE">Multiple</option>
					</select>
				</label>

				{disbursementType === "SINGLE" ? (
					<label className="flex items-center gap-2 text-sm mt-6">
						<input
							type="checkbox"
							checked={releaseFullAmountAtOnce}
							onChange={(event) =>
								setReleaseFullAmountAtOnce(event.target.checked)
							}
							disabled
						/>
						<span>Release full amount at once</span>
					</label>
				) : null}
			</div>

			{disbursementType === "MULTIPLE" ? (
				<div className="space-y-3">
					<div className="flex items-center justify-between gap-2">
						<div className="text-sm font-semibold">Tranches</div>
						<button
							type="button"
							onClick={addTranche}
							className="border rounded px-3 py-2 text-sm hover:bg-gray-50"
						>
							Add Tranche
						</button>
					</div>

					<div className="space-y-2">
						<div className="grid grid-cols-5 gap-2 text-xs font-semibold text-gray-600 px-1">
							<div>Tranche</div>
							<div>Amount</div>
							<div>Trigger Type</div>
							<div>Timing Meaning</div>
							<div></div>
						</div>
						{tranches.map((item) => (
							<div
								key={item.id}
								className="grid grid-cols-1 md:grid-cols-5 gap-2 border rounded p-2"
							>
								<input
									type="text"
									value={item.tranche}
									onChange={(event) =>
										updateTranche(item.id, "tranche", event.target.value)
									}
									className="border rounded px-2 py-2 text-sm"
								/>
								<input
									type="number"
									min={0}
									value={item.amount}
									onChange={(event) =>
										updateTranche(
											item.id,
											"amount",
											Number(event.target.value) || 0,
										)
									}
									className="border rounded px-2 py-2 text-sm"
								/>
								<input
									type="text"
									value={item.triggerType}
									onChange={(event) =>
										updateTranche(item.id, "triggerType", event.target.value)
									}
									className="border rounded px-2 py-2 text-sm"
									placeholder="e.g. Milestone reached"
								/>
								<select
									value={item.timingMeaning}
									onChange={(event) =>
										updateTranche(
											item.id,
											"timingMeaning",
											event.target.value as DisbursementTiming,
										)
									}
									className="border rounded px-2 py-2 text-sm"
								>
									<option value="IMMEDIATE">Immediate</option>
									<option value="MILESTONE">Based on milestone</option>
								</select>
								<button
									type="button"
									onClick={() => removeTranche(item.id)}
									className="border rounded px-3 py-2 text-xs hover:bg-gray-50"
								>
									Remove
								</button>
							</div>
						))}
					</div>
				</div>
			) : null}

			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<label className="flex flex-col gap-1 text-sm">
					<span>Method</span>
					<select
						value={method}
						onChange={(event) => setMethod(event.target.value)}
						className="border rounded px-2 py-2"
					>
						<option value="BANK_TRANSFER">Bank Transfer</option>
						<option value="WALLET">Wallet</option>
						<option value="CASH">Cash</option>
						<option value="PAY_TO_MERCHANT">Pay to Merchant</option>
					</select>
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span>Processing Fee</span>
					<input
						type="number"
						min={0}
						value={processingFee}
						onChange={(event) =>
							setProcessingFee(Number(event.target.value) || 0)
						}
						className="border rounded px-2 py-2"
					/>
				</label>
				<label className="flex flex-col gap-1 text-sm">
					<span>Disbursement Fee</span>
					<input
						type="number"
						min={0}
						value={disbursementFee}
						onChange={(event) =>
							setDisbursementFee(Number(event.target.value) || 0)
						}
						className="border rounded px-2 py-2"
					/>
				</label>
			</div>
		</section>
	);
}