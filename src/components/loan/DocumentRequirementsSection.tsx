import {
	type Dispatch,
	type SetStateAction,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { MultiValue } from "react-select";
import CreatableSelect from "react-select/creatable";
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

const DEFAULT_MIN_AMOUNT = 0;
const DEFAULT_MAX_AMOUNT = 50000000;

const normalizeDocumentTypeId = (value: string) => {
	const trimmed = value.trim();
	if (!trimmed) return trimmed;
	return trimmed.startsWith("DOC-") ? trimmed : `DOC-${trimmed}`;
};

const formatDocumentLabel = (value: string) =>
	value.startsWith("DOC-") ? value.slice(4) : value;

type DocumentOption = {
	value: string;
	label: string;
};

const DOCUMENT_OPTIONS: DocumentOption[] = QUICK_DOC_OPTIONS.map((doc) => {
	const normalized = normalizeDocumentTypeId(doc);
	return {
		value: normalized,
		label: formatDocumentLabel(normalized),
	};
});

export type DocumentRequirementItem = {
	id: string;
	grade: RiskGrade;
	documents: DocumentRequirementDocument[];
};

export type DocumentRequirementDocument = {
	id: string;
	documentTypeId: string;
	minAmount: number;
	maxAmount: number;
	employmentType: string | null;
	collateralRequired: boolean;
	isMandatory: boolean;
};

const generateRequirementId = () =>
	typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
		? crypto.randomUUID()
		: Math.random().toString(36).slice(2);

export const createDocumentRequirementDocument = (
	documentTypeId: string,
	overrides?: Partial<DocumentRequirementDocument>,
): DocumentRequirementDocument => ({
	id: generateRequirementId(),
	documentTypeId: normalizeDocumentTypeId(documentTypeId),
	minAmount: DEFAULT_MIN_AMOUNT,
	maxAmount: DEFAULT_MAX_AMOUNT,
	employmentType: null,
	collateralRequired: false,
	isMandatory: true,
	...overrides,
});

export const createDocumentRequirementItem = (
	grade: RiskGrade,
	documents: Array<string | DocumentRequirementDocument>,
): DocumentRequirementItem => ({
	id: generateRequirementId(),
	grade,
	documents: documents.map((document) =>
		typeof document === "string"
			? createDocumentRequirementDocument(document)
			: {
					...document,
					id: document.id || generateRequirementId(),
					documentTypeId: normalizeDocumentTypeId(document.documentTypeId),
				},
	),
});

interface DocumentRequirementsSectionProps {
	riskResult: ScoreEngineResult | null;
	requirements: DocumentRequirementItem[];
	onChangeRequirements: Dispatch<SetStateAction<DocumentRequirementItem[]>>;
}

function DocumentRequirementsSection(
	props: Readonly<DocumentRequirementsSectionProps>,
) {
	const { riskResult, requirements, onChangeRequirements } = props;
	const [draftGrade, setDraftGrade] = useState<RiskGrade>("LOW");
	const [draftDocuments, setDraftDocuments] = useState<
		DocumentRequirementDocument[]
	>(() =>
		DEFAULT_REQUIRED_DOCUMENTS.map((doc) =>
			createDocumentRequirementDocument(doc),
		),
	);
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
			if (editingRequirement?.grade === grade) {
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

	const selectedOptions = useMemo<DocumentOption[]>(
		() =>
			draftDocuments.map((document) => ({
				value: document.documentTypeId,
				label: formatDocumentLabel(document.documentTypeId),
			})),
		[draftDocuments],
	);

	const availableOptions = useMemo<DocumentOption[]>(() => {
		const optionMap = new Map<string, DocumentOption>();
		for (const option of DOCUMENT_OPTIONS) {
			optionMap.set(option.value, option);
		}
		for (const selected of selectedOptions) {
			if (!optionMap.has(selected.value)) {
				optionMap.set(selected.value, selected);
			}
		}
		return Array.from(optionMap.values());
	}, [selectedOptions]);

	const handleSelectChange = (next: MultiValue<DocumentOption>) => {
		const nextValues = next ?? [];
		const existingMap = new Map(
			draftDocuments.map((document) => [document.documentTypeId, document]),
		);
		const nextDocuments = nextValues.map((option) => {
			const existing = existingMap.get(option.value);
			return existing ?? createDocumentRequirementDocument(option.value);
		});
		setDraftDocuments(nextDocuments);
	};

	const updateDraftDocument = (
		id: string,
		updates: Partial<DocumentRequirementDocument>,
	) => {
		setDraftDocuments((prev) =>
			prev.map((document) =>
				document.id === id ? { ...document, ...updates } : document,
			),
		);
	};

	const resetBuilder = () => {
		const preferredGrade =
			riskResult?.riskGrade && !blockedGradeSet.has(riskResult.riskGrade)
				? riskResult.riskGrade
				: (availableGrades[0] ?? riskResult?.riskGrade ?? "LOW");
		setDraftGrade(preferredGrade);
		setDraftDocuments(
			DEFAULT_REQUIRED_DOCUMENTS.map((doc) =>
				createDocumentRequirementDocument(doc),
			),
		);
		setEditingId(null);
	};

	const handleSubmitRequirement = () => {
		if (!editingId && blockedGradeSet.has(draftGrade)) return;
		if (draftDocuments.length === 0) return;
		if (editingId) {
			onChangeRequirements((prev) =>
				prev.map((requirement) =>
					requirement.id === editingId
						? {
								...requirement,
								grade: draftGrade,
								documents: draftDocuments.map((document) => ({
									...document,
									documentTypeId: normalizeDocumentTypeId(
										document.documentTypeId,
									),
								})),
							}
						: requirement,
				),
			);
		} else {
			const nextRequirement = createDocumentRequirementItem(
				draftGrade,
				draftDocuments,
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
		setDraftDocuments(target.documents.map((document) => ({ ...document })));
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
				<div className="flex flex-col gap-1 text-sm">
					<span>Documents</span>
					<CreatableSelect
						isMulti
						classNamePrefix="rs"
						placeholder="Select or create document types"
						options={availableOptions}
						value={selectedOptions}
						onChange={(next) => handleSelectChange(next)}
					/>
				</div>

				<div>
					<div className="text-xs text-gray-600 mb-2">
						Selected documents ({draftDocuments.length})
					</div>
					{draftDocuments.length === 0 ? (
						<p className="text-xs text-red-700">
							Add at least one supporting document before saving.
						</p>
					) : (
						<div className="space-y-3">
							{draftDocuments.map((doc) => (
								<div key={doc.id} className="border rounded p-3">
									<div className="flex items-center justify-between gap-2">
										<div className="font-semibold">
											{formatDocumentLabel(doc.documentTypeId)}
										</div>
										<div className="text-xs text-gray-500">
											{doc.documentTypeId}
										</div>
									</div>
									<div className="grid grid-cols-1 gap-3 mt-3 md:grid-cols-2">
										<label className="flex flex-col gap-1 text-xs">
											<span>Min amount</span>
											<input
												type="number"
												value={doc.minAmount}
												onChange={(event) =>
													updateDraftDocument(doc.id, {
														minAmount: Number(event.target.value),
													})
												}
												className="border rounded px-2 py-1"
											/>
										</label>
										<label className="flex flex-col gap-1 text-xs">
											<span>Max amount</span>
											<input
												type="number"
												value={doc.maxAmount}
												onChange={(event) =>
													updateDraftDocument(doc.id, {
														maxAmount: Number(event.target.value),
													})
												}
												className="border rounded px-2 py-1"
											/>
										</label>
										<label className="flex flex-col gap-1 text-xs">
											<span>Employment type</span>
											<input
												type="text"
												value={doc.employmentType ?? ""}
												onChange={(event) =>
													updateDraftDocument(doc.id, {
														employmentType: event.target.value.trim() || null,
													})
												}
												className="border rounded px-2 py-1"
												placeholder="Optional"
											/>
										</label>
										<div className="flex flex-col gap-2 text-xs">
											<label className="flex items-center gap-2">
												<input
													type="checkbox"
													checked={doc.collateralRequired}
													onChange={(event) =>
														updateDraftDocument(doc.id, {
															collateralRequired: event.target.checked,
														})
													}
												/>
												<span>Collateral required</span>
											</label>
											<label className="flex items-center gap-2">
												<input
													type="checkbox"
													checked={doc.isMandatory}
													onChange={(event) =>
														updateDraftDocument(doc.id, {
															isMandatory: event.target.checked,
														})
													}
												/>
												<span>Mandatory</span>
											</label>
										</div>
									</div>
								</div>
							))}
						</div>
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
								<div className="mt-2 space-y-2 text-xs text-gray-700">
									{requirement.documents.map((doc) => (
										<div
											key={`${requirement.id}-${doc.id}`}
											className="border rounded px-3 py-2"
										>
											<div className="font-semibold">
												{formatDocumentLabel(doc.documentTypeId)}
											</div>
											<div className="text-[11px] text-gray-500">
												{doc.documentTypeId}
											</div>
											<div className="grid grid-cols-1 gap-2 mt-2 md:grid-cols-2">
												<div>Min amount: {doc.minAmount}</div>
												<div>Max amount: {doc.maxAmount}</div>
												<div>Employment: {doc.employmentType ?? "—"}</div>
												<div>
													Collateral: {doc.collateralRequired ? "Yes" : "No"}
												</div>
												<div>Mandatory: {doc.isMandatory ? "Yes" : "No"}</div>
											</div>
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</section>
	);
}

export default DocumentRequirementsSection;
