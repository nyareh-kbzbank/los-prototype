import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useMemo,
	useState,
} from "react";
import { DEFAULT_REQUIRED_DOCUMENTS } from "@/lib/loan-setup-store";
import {
	RISK_GRADES,
	type RiskGrade,
	type ScoreEngineResult,
} from "@/lib/scorecard-engine";

const QUICK_DOC_OPTIONS = Array.from(
	new Set([
		...DEFAULT_REQUIRED_DOCUMENTS,
		"BANK_STATEMENT",
		"GUARANTOR",
		"UTILITY_BILL",
		"BUSINESS_LICENSE",
		"TAX_RETURN",
		"CREDIT_REPORT",
	]),
);

export type DocumentRequirementItem = {
	id: string;
	grade: RiskGrade;
	documents: string[];
};

const generateRequirementId = () =>
	typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2);

export const createDocumentRequirementItem = (
	grade: RiskGrade,
	documents: string[],
): DocumentRequirementItem => ({
	id: generateRequirementId(),
	grade,
	documents: [...documents],
});

interface DocumentRequirementsSectionProps {
	riskResult: ScoreEngineResult | null;
	requirements: DocumentRequirementItem[];
	onChangeRequirements: Dispatch<SetStateAction<DocumentRequirementItem[]>>;
}

function DocumentRequirementsSection(props: DocumentRequirementsSectionProps) {
	const { riskResult, requirements, onChangeRequirements } = props;
	const [draftGrade, setDraftGrade] = useState<RiskGrade>("LOW");
	const [draftDocuments, setDraftDocuments] = useState<string[]>([
		...DEFAULT_REQUIRED_DOCUMENTS,
	]);
	const [customDocument, setCustomDocument] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const editingRequirement = editingId
		? (requirements.find((requirement) => requirement.id === editingId) ?? null)
		: null;
	const blockedGradeSet = useMemo(() => {
		const used = new Set<RiskGrade>();
		for (const requirement of requirements) {
			used.add(requirement.grade);
		}
		return used;
	}, [requirements]);
	const availableGrades = useMemo(() => {
		return RISK_GRADES.filter((grade) => {
			if (editingRequirement && editingRequirement.grade === grade) {
				return true;
			}
			return !blockedGradeSet.has(grade);
		});
	}, [blockedGradeSet, editingRequirement]);

	useEffect(() => {
		if (editingId || !riskResult?.riskGrade) return;
		if (!blockedGradeSet.has(riskResult.riskGrade)) {
			setDraftGrade(riskResult.riskGrade);
		}
	}, [riskResult?.riskGrade, editingId, blockedGradeSet]);

	useEffect(() => {
		if (editingId) return;
		if (!blockedGradeSet.has(draftGrade)) return;
		if (availableGrades.length === 0) return;
		setDraftGrade(availableGrades[0]);
	}, [editingId, draftGrade, blockedGradeSet, availableGrades]);

	const dedupeDocs = (docs: string[]) => {
		const seen = new Set<string>();
		return docs
			.map((doc) => doc.trim())
			.filter((doc) => {
				if (!doc) return false;
				const key = doc.toLowerCase();
				if (seen.has(key)) return false;
				seen.add(key);
				return true;
			});
	};

	const toggleQuickPick = (doc: string) => {
		const normalized = doc.trim();
		if (!normalized) return;
		setDraftDocuments((prev) => {
			const exists = prev.some(
				(item) => item.toLowerCase() === normalized.toLowerCase(),
			);
			if (exists) {
				return prev.filter(
					(item) => item.toLowerCase() !== normalized.toLowerCase(),
				);
			}
			return [...prev, normalized];
		});
	};

	const handleAddCustomDocument = () => {
		const normalized = customDocument.trim();
		if (!normalized) return;
		setDraftDocuments((prev) => {
			const exists = prev.some(
				(item) => item.toLowerCase() === normalized.toLowerCase(),
			);
			if (exists) return prev;
			return [...prev, normalized];
		});
		setCustomDocument("");
	};

	const removeDraftDocument = (doc: string) => {
		setDraftDocuments((prev) =>
			prev.filter((item) => item.toLowerCase() !== doc.toLowerCase()),
		);
	};

	const resetBuilder = () => {
		const preferredGrade =
			riskResult?.riskGrade && !blockedGradeSet.has(riskResult.riskGrade)
				? riskResult.riskGrade
				: (availableGrades[0] ?? riskResult?.riskGrade ?? "LOW");
		setDraftGrade(preferredGrade);
		setDraftDocuments([...DEFAULT_REQUIRED_DOCUMENTS]);
		setCustomDocument("");
		setEditingId(null);
	};

	const handleSubmitRequirement = () => {
		if (!editingId && blockedGradeSet.has(draftGrade)) return;
		const cleanedDocs = dedupeDocs(draftDocuments);
		if (cleanedDocs.length === 0) return;
		if (editingId) {
			onChangeRequirements((prev) =>
				prev.map((requirement) =>
					requirement.id === editingId
						? { ...requirement, grade: draftGrade, documents: cleanedDocs }
						: requirement,
				),
			);
		} else {
			const nextRequirement = createDocumentRequirementItem(
				draftGrade,
				cleanedDocs,
			);
			onChangeRequirements((prev) => [...prev, nextRequirement]);
		}
		resetBuilder();
	};

	const handleEditRequirement = (id: string) => {
		const target = requirements.find((requirement) => requirement.id === id);
		if (!target) return;
		setEditingId(id);
		setDraftGrade(target.grade);
		setDraftDocuments([...target.documents]);
	};

	const handleRemoveRequirement = (id: string) => {
		onChangeRequirements((prev) =>
			prev.filter((requirement) => requirement.id !== id),
		);
		if (editingId === id) {
			resetBuilder();
		}
	};

	const isDraftValid = draftDocuments.length > 0;
	const canSubmit =
		isDraftValid && (editingId || !blockedGradeSet.has(draftGrade));
	const allGradesUsed = !editingId && availableGrades.length === 0;

	return (
		<section className="border p-4 rounded mb-6">
			<div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between mb-3">
				<div>
					<h2 className="font-semibold">Document Requirements</h2>
					<div className="text-xs text-gray-600">
						Map each risk grade to a checklist of supporting documents.
					</div>
				</div>
				<label className="flex flex-col gap-1 text-sm">
					<span>Risk grade</span>
					<select
						value={draftGrade}
						onChange={(event) => setDraftGrade(event.target.value as RiskGrade)}
						className="border px-2 py-2 rounded"
					>
						{RISK_GRADES.map((grade) => {
							const isOwnGrade = editingRequirement?.grade === grade;
							const disabled = blockedGradeSet.has(grade) && !isOwnGrade;
							return (
								<option key={grade} value={grade} disabled={disabled}>
									{grade}
								</option>
							);
						})}
					</select>
				</label>
			</div>
			{allGradesUsed ? (
				<p className="text-xs text-red-600">
					All risk grades already have document requirements. Edit or remove a
					section before adding another.
				</p>
			) : null}

			{riskResult ? (
				<p className="text-xs text-gray-500 mb-3">
					Latest evaluated grade: {riskResult.riskGrade} (
					{riskResult.totalScore}/{riskResult.maxScore})
				</p>
			) : null}

			<div className="space-y-3 text-sm">
				<div>
					<div className="text-xs text-gray-600 mb-2">Quick picks</div>
					<div className="flex flex-wrap gap-2">
						{QUICK_DOC_OPTIONS.map((doc) => {
							const active = draftDocuments.some(
								(item) => item.toLowerCase() === doc.toLowerCase(),
							);
							return (
								<button
									key={doc}
									type="button"
									onClick={() => toggleQuickPick(doc)}
									className={`px-3 py-1 rounded-full border text-xs transition ${active ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-700 hover:border-gray-500"}`}
								>
									{doc}
								</button>
							);
						})}
					</div>
				</div>

				<label className="flex flex-col gap-1 text-sm">
					<span>Add custom document</span>
					<div className="flex flex-col gap-2 md:flex-row">
						<input
							type="text"
							value={customDocument}
							onChange={(event) => setCustomDocument(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									handleAddCustomDocument();
								}
							}}
							className="border px-2 py-2 rounded flex-1"
							placeholder="e.g., Employer letter"
						/>
						<button
							type="button"
							onClick={handleAddCustomDocument}
							className="border px-3 py-2 rounded bg-gray-50 hover:bg-gray-100"
						>
							Add
						</button>
					</div>
				</label>

				<div>
					<div className="text-xs text-gray-600 mb-2">
						Selected documents ({draftDocuments.length})
					</div>
					{draftDocuments.length === 0 ? (
						<p className="text-xs text-red-700">
							Add at least one supporting document before saving.
						</p>
					) : (
						<ul className="flex flex-wrap gap-2">
							{draftDocuments.map((doc) => (
								<li
									key={doc}
									className="flex items-center gap-2 border rounded-full px-3 py-1 text-xs"
								>
									<span>{doc}</span>
									<button
										type="button"
										onClick={() => removeDraftDocument(doc)}
										className="text-gray-500 hover:text-red-600"
									>
										Remove
									</button>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="flex flex-wrap gap-2">
					<button
						type="button"
						onClick={handleSubmitRequirement}
						disabled={!canSubmit}
						className={`px-4 py-2 rounded text-sm font-semibold text-white ${canSubmit ? "bg-emerald-600 hover:bg-emerald-700" : "bg-gray-400 cursor-not-allowed"}`}
					>
						{editingId ? "Save requirement" : "Add requirement"}
					</button>
					{editingId ? (
						<button
							type="button"
							onClick={resetBuilder}
							className="px-4 py-2 rounded text-sm border"
						>
							Cancel edit
						</button>
					) : null}
				</div>
			</div>

			<div className="mt-6 space-y-3">
				<div className="flex items-center justify-between">
					<h3 className="text-sm font-semibold">Configured requirements</h3>
					<span className="text-xs text-gray-600">
						{requirements.length} section(s)
					</span>
				</div>
				{requirements.length === 0 ? (
					<p className="text-xs text-gray-600">
						No requirements yet. Map at least one grade to continue.
					</p>
				) : (
					<div className="space-y-3">
						{requirements.map((requirement) => (
							<div key={requirement.id} className="border rounded p-3 text-sm">
								<div className="flex items-center justify-between gap-2">
									<div>
										<div className="font-semibold">
											Risk grade: {requirement.grade}
										</div>
										<div className="text-xs text-gray-600">
											{requirement.documents.length} document(s)
										</div>
									</div>
									<div className="flex gap-2">
										<button
											type="button"
											onClick={() => handleEditRequirement(requirement.id)}
											className="text-xs border px-3 py-1 rounded hover:bg-gray-50"
										>
											Edit
										</button>
										<button
											type="button"
											onClick={() => handleRemoveRequirement(requirement.id)}
											className="text-xs border px-3 py-1 rounded text-red-600 border-red-200 hover:bg-red-50"
										>
											Remove
										</button>
									</div>
								</div>
								<ul className="flex flex-wrap gap-2 mt-2 text-xs text-gray-700">
									{requirement.documents.map((doc) => (
										<li
											key={`${requirement.id}-${doc}`}
											className="border rounded-full px-3 py-1"
										>
											{doc}
										</li>
									))}
								</ul>
							</div>
						))}
					</div>
				)}
			</div>
		</section>
	);
}

export default DocumentRequirementsSection;
