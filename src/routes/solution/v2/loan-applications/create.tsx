import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	type LoanApplicationStatus,
	useLoanApplicationStore,
} from "@/lib/loan-application-store";
import {
	type DisbursementDestinationType,
	TenorUnit,
} from "@/lib/loan-setup-store";
import {
	getLoanSetupV2List,
	useLoanSetupV2Store,
	type V2LoanSetupSnapshot,
} from "@/lib/loan-setup-v2-store";
import {
	evaluateScoreCard,
	inferFieldKind,
	type RiskGrade,
} from "@/lib/scorecard-engine";
import { buildV2RepaymentSchedulePreview } from "@/lib/v2-repayment-preview";
import { createWorkflowRuntime } from "@/lib/workflow-runtime";
import { getWorkflowList, useWorkflowStore } from "@/lib/workflow-store";

export const Route = createFileRoute("/solution/v2/loan-applications/create")({
	component: V2LoanApplicationCreate,
});

type DocumentUploadField = {
	documentTypeId: string;
	isMandatory: boolean;
};

type OtherDocumentUpload = {
	id: string;
	file: File | null;
};

const normalizeScoreFieldKey = (value: string) =>
	value
		.trim()
		.toLowerCase()
		.replaceAll(/[^a-z0-9]/g, "");

const includesAny = (value: string, parts: string[]) =>
	parts.some((part) => value.includes(part));

const isBuiltInScoreField = (normalizedField: string) => {
	if (
		normalizedField === "age" ||
		(normalizedField.includes("age") && !normalizedField.includes("average"))
	) {
		return true;
	}

	return scoreInputResolvers.some((resolver) =>
		includesAny(normalizedField, resolver.keys),
	);
};

const getSelectableScoreFieldOptions = (
	rules: Parameters<typeof inferFieldKind>[0],
) => {
	const kind = inferFieldKind(rules);
	if (kind === "boolean") {
		return ["true", "false"];
	}
	if (kind !== "string") {
		return [];
	}

	const values = new Set<string>();
	for (const rule of rules) {
		if (rule.operator === "==") {
			const value = rule.value.trim();
			if (value) values.add(value);
		}
		if (rule.operator === "in") {
			for (const value of rule.value
				.split(",")
				.map((item) => item.trim())
				.filter(Boolean)) {
				values.add(value);
			}
		}
	}

	return Array.from(values);
};

const formatDocumentTypeLabel = (documentTypeId: string) => {
	const value = documentTypeId.startsWith("DOC-")
		? documentTypeId.slice(4)
		: documentTypeId;
	return value.replaceAll("_", " ");
};

const formatAmountWithTwoDecimals = (value: number) => {
	if (!Number.isFinite(value)) return "0.00";
	return value.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
};

const genderOptions = ["male", "female"] as const;
const maritalStatusOptions = ["single", "married", "divorced"] as const;
const educationOptions = ["graduate", "under graduate"] as const;

const toTenorUnit = (unit: "DAY" | "MONTH" | "YEAR"): TenorUnit => {
	if (unit === "DAY") return TenorUnit.DAY;
	if (unit === "YEAR") return TenorUnit.YEAR;
	return TenorUnit.MONTH;
};

const toTenureMonths = (unit: "DAY" | "MONTH" | "YEAR", value: number) => {
	if (unit === "YEAR") return value * 12;
	if (unit === "DAY") return Math.max(1, Math.round(value / 30));
	return value;
};

const formatDateForInput = (date: Date) => {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
};

type ScoreInputContext = {
	beneficiaryName: string;
	nationalId: string;
	gender: string;
	maritalStatus: string;
	education: string;
	phone: string;
	bankAccountNo: string;
	age: number | null;
	monthlyIncome: number | null;
	debtToIncomeRatio: number | null;
	requestedAmount: number | null;
	tenureValue: number | null;
	channelCode: string;
	destinationType: DisbursementDestinationType;
	bureauProvider: string;
	bureauPurpose: string;
	bureauConsent: boolean;
	isBureauCheck: boolean;
	notes: string;
};

const scoreInputResolvers: Array<{
	keys: string[];
	resolve: (input: ScoreInputContext) => string;
}> = [
	{
		keys: ["monthlyincome", "income", "salary"],
		resolve: (input) =>
			input.monthlyIncome === null ? "" : String(input.monthlyIncome),
	},
	{
		keys: ["requestedamount", "loanamount", "amount", "principal"],
		resolve: (input) =>
			input.requestedAmount === null ? "" : String(input.requestedAmount),
	},
	{
		keys: ["tenure", "term", "duration"],
		resolve: (input) =>
			input.tenureValue === null ? "" : String(input.tenureValue),
	},
	{
		keys: ["beneficiaryname", "customername", "applicantname", "name"],
		resolve: (input) => input.beneficiaryName.trim(),
	},
	{
		keys: ["nationalid", "nrc", "idno", "identityno", "idnumber"],
		resolve: (input) => input.nationalId.trim(),
	},
	{
		keys: ["gender", "sex"],
		resolve: (input) => input.gender.trim().toLowerCase(),
	},
	{
		keys: ["maritalstatus", "marital", "civilstatus"],
		resolve: (input) => input.maritalStatus.trim().toLowerCase(),
	},
	{
		keys: ["education", "educationlevel", "schooling"],
		resolve: (input) => input.education.trim().toLowerCase(),
	},
	{
		keys: ["mobile", "phone", "phoneno", "mobileno"],
		resolve: (input) => input.phone.trim(),
	},
	{
		keys: ["dti", "debttoincome", "debttoincomeratio", "debtincome"],
		resolve: (input) =>
			input.debtToIncomeRatio === null ? "" : String(input.debtToIncomeRatio),
	},
	{
		keys: ["bankaccount", "accountno", "accountnumber"],
		resolve: (input) => input.bankAccountNo.trim(),
	},
	{
		keys: ["channelcode", "channel"],
		resolve: (input) => input.channelCode.trim(),
	},
	{
		keys: ["disbursement", "destination"],
		resolve: (input) => input.destinationType,
	},
	{
		keys: ["bureauprovider", "creditbureauprovider"],
		resolve: (input) => input.bureauProvider.trim(),
	},
	{
		keys: ["bureaupurpose", "creditbureaupurpose", "purpose"],
		resolve: (input) => input.bureauPurpose.trim(),
	},
	{
		keys: ["bureauconsent", "consent"],
		resolve: (input) => String(input.bureauConsent),
	},
	{
		keys: ["isburaeucheck", "isbureaucheck", "bureaucheck"],
		resolve: (input) => String(input.isBureauCheck),
	},
	{
		keys: ["remark", "remarks", "note", "notes"],
		resolve: (input) => input.notes.trim(),
	},
];

const getApplicationStatusFromRiskGrade = (
	riskGrade: RiskGrade | null,
): LoanApplicationStatus => {
	if (riskGrade === "LOW") return "APPROVED";
	if (riskGrade === "HIGH") return "REJECTED";
	return "SUBMITTED";
};

const resolveBuiltInScoreInput = (
	normalizedField: string,
	input: ScoreInputContext,
) => {
	if (
		normalizedField === "age" ||
		(normalizedField.includes("age") && !normalizedField.includes("average"))
	) {
		return input.age === null ? "" : String(input.age);
	}
	for (const resolver of scoreInputResolvers) {
		if (includesAny(normalizedField, resolver.keys)) {
			return resolver.resolve(input);
		}
	}
	return null;
};

const buildScoreInputsFromApplication = (
	fields: Array<{ field: string }>,
	input: ScoreInputContext,
	customFieldValues: Record<string, string>,
) => {
	return fields.reduce<Record<string, string>>((acc, field) => {
		const normalizedKey = normalizeScoreFieldKey(field.field);
		const builtInValue = resolveBuiltInScoreInput(normalizedKey, input);
		acc[field.field] = builtInValue ?? customFieldValues[field.field] ?? "";
		return acc;
	}, {});
};

const gradeFromThresholds = (
	score: number,
	thresholds: { lowMin: number; mediumMin: number; highMin: number },
): RiskGrade => {
	if (score >= thresholds.lowMin) return "LOW";
	if (score >= thresholds.mediumMin) return "MEDIUM";
	return "HIGH";
};

const scoreCardHasField = (
	fields: Array<{ field: string }>,
	aliases: string[],
) =>
	fields.some((field) =>
		includesAny(normalizeScoreFieldKey(field.field), aliases),
	);

const buildV2DocumentUploadFields = (
	activeSetup: V2LoanSetupSnapshot,
	parsedAmount: number,
	riskGrade: RiskGrade | null,
): DocumentUploadField[] => {
	const hasAmount = Number.isFinite(parsedAmount) && parsedAmount >= 0;
	const byType = new Map<string, DocumentUploadField>();

	for (const requirementItem of activeSetup.documentSetup) {
		for (const document of requirementItem.documents) {
			if (document.documentTypeId === "DOC-OTHER") continue;
			const collateralAlwaysRequired =
				activeSetup.productSetup.loanSecurity === "SECURED" &&
				document.collateralRequired;
			if (
				riskGrade &&
				requirementItem.grade !== riskGrade &&
				!collateralAlwaysRequired
			) {
				continue;
			}
			if (
				hasAmount &&
				(parsedAmount < document.minAmount || parsedAmount > document.maxAmount)
			) {
				continue;
			}
			const existing = byType.get(document.documentTypeId);
			if (existing) {
				existing.isMandatory =
					existing.isMandatory ||
					document.isMandatory ||
					collateralAlwaysRequired;
				continue;
			}
			byType.set(document.documentTypeId, {
				documentTypeId: document.documentTypeId,
				isMandatory: document.isMandatory || collateralAlwaysRequired,
			});
		}
	}

	return Array.from(byType.values()).sort((a, b) =>
		a.documentTypeId.localeCompare(b.documentTypeId),
	);
};

const validateV2StepOne = (input: {
	activeSetup: V2LoanSetupSnapshot | null;
	beneficiaryName: string;
	nationalId: string;
	ageInput: string;
	monthlyIncomeInput: string;
	amountInput: string;
	bureauProvider: string;
	bureauPurpose: string;
	bureauConsent: boolean;
	destinationType: DisbursementDestinationType;
	bankAccountNo: string;
	phone: string;
}) => {
	if (!input.activeSetup)
		return { error: "No active V2 setup selected.", parsed: null };
	if (!input.beneficiaryName.trim())
		return { error: "Beneficiary name is required.", parsed: null };
	if (!input.nationalId.trim())
		return { error: "National ID is required.", parsed: null };

	const parsedAge = Number(input.ageInput);
	if (!Number.isFinite(parsedAge) || parsedAge <= 0) {
		return { error: "Enter a valid age.", parsed: null };
	}

	const parsedMonthlyIncome = Number(input.monthlyIncomeInput);
	if (!Number.isFinite(parsedMonthlyIncome) || parsedMonthlyIncome < 0) {
		return { error: "Enter a valid monthly income.", parsed: null };
	}

	const parsedAmount = Number(input.amountInput);
	if (!Number.isFinite(parsedAmount))
		return { error: "Enter a valid amount.", parsed: null };
	if (parsedAmount < input.activeSetup.productSetup.minAmount) {
		return {
			error: `Amount must be at least ${input.activeSetup.productSetup.minAmount.toLocaleString()}.`,
			parsed: null,
		};
	}
	if (parsedAmount > input.activeSetup.productSetup.maxAmount) {
		return {
			error: `Amount must be at most ${input.activeSetup.productSetup.maxAmount.toLocaleString()}.`,
			parsed: null,
		};
	}

	if (
		input.activeSetup.bureauRequired &&
		input.activeSetup.bureauConsentRequired
	) {
		if (!input.bureauProvider.trim()) {
			return { error: "Select a bureau provider.", parsed: null };
		}
		if (!input.bureauPurpose.trim()) {
			return { error: "Enter bureau purpose.", parsed: null };
		}
		if (!input.bureauConsent) {
			return { error: "Beneficiary consent is required.", parsed: null };
		}
	}

	if (input.destinationType === "BANK" && !input.bankAccountNo.trim()) {
		return {
			error: "Bank account no is required for bank disbursement.",
			parsed: null,
		};
	}
	if (input.destinationType === "WALLET" && !input.phone.trim()) {
		return {
			error: "Phone no is required for wallet disbursement.",
			parsed: null,
		};
	}

	return {
		error: null,
		parsed: {
			parsedAge,
			parsedMonthlyIncome,
			parsedAmount,
		},
	};
};

function V2LoanApplicationCreate() {
	const navigate = useNavigate();
	const addApplication = useLoanApplicationStore(
		(state) => state.addApplication,
	);
	const advanceWorkflowStage = useLoanApplicationStore(
		(state) => state.advanceWorkflowStage,
	);
	const setups = useLoanSetupV2Store((state) => state.setups);
	const setupList = useMemo(() => getLoanSetupV2List(setups), [setups]);
	const workflows = useWorkflowStore((state) => state.workflows);
	const workflowList = useMemo(() => getWorkflowList(workflows), [workflows]);
	const workflowNameById = useMemo(
		() =>
			Object.fromEntries(
				workflowList.map((workflow) => [workflow.workflowId, workflow.name]),
			),
		[workflowList],
	);
	const [selectedSetupId, setSelectedSetupId] = useState(
		setupList[0]?.id ?? "",
	);

	const activeSetup = useMemo<V2LoanSetupSnapshot | null>(() => {
		return (
			setupList.find((setup) => setup.id === selectedSetupId) ??
			setupList[0] ??
			null
		);
	}, [selectedSetupId, setupList]);

	useEffect(() => {
		if (setupList.length === 0) return;
		if (!activeSetup) {
			setSelectedSetupId(setupList[0].id);
		}
	}, [activeSetup, setupList]);

	const [beneficiaryName, setBeneficiaryName] = useState("");
	const [nationalId, setNationalId] = useState("");
	const [gender, setGender] = useState("");
	const [maritalStatus, setMaritalStatus] = useState("");
	const [education, setEducation] = useState("");
	const [phone, setPhone] = useState("");
	const [bankAccountNo, setBankAccountNo] = useState("");
	const [ageInput, setAgeInput] = useState("");
	const [monthlyIncomeInput, setMonthlyIncomeInput] = useState("");
	const [amountInput, setAmountInput] = useState("");
	const [tenureValue, setTenureValue] = useState<number | null>(
		activeSetup?.productSetup.tenorValues[0]?.value ?? null,
	);
	const [channelCode, setChannelCode] = useState(
		activeSetup?.channels[0]?.code ?? "",
	);
	const [destinationType, setDestinationType] =
		useState<DisbursementDestinationType>("BANK");
	const [bureauProvider, setBureauProvider] = useState(
		activeSetup?.bureauProvider ?? "",
	);
	const [bureauPurpose, setBureauPurpose] = useState(
		activeSetup?.bureauPurpose ?? "",
	);
	const [bureauConsent, setBureauConsent] = useState(false);
	const [notes, setNotes] = useState("");
	const [formError, setFormError] = useState<string | null>(null);
	const [currentStep, setCurrentStep] = useState<1 | 2>(1);
	const [repaymentStartDateIso, setRepaymentStartDateIso] = useState(() =>
		formatDateForInput(new Date()),
	);
	const [customFormulaFieldValues, setCustomFormulaFieldValues] = useState<
		Record<string, number>
	>({});
	const [dynamicScoreFieldValues, setDynamicScoreFieldValues] = useState<
		Record<string, string>
	>({});
	const [documentFiles, setDocumentFiles] = useState<
		Record<string, File | null>
	>({});
	const otherDocumentCounterRef = useRef(1);
	const createOtherDocumentUpload = useCallback(
		(): OtherDocumentUpload => ({
			id: `other-document-${otherDocumentCounterRef.current++}`,
			file: null,
		}),
		[],
	);
	const [otherDocumentFiles, setOtherDocumentFiles] = useState<
		Array<OtherDocumentUpload>
	>(() => [createOtherDocumentUpload()]);

	const disabled = setupList.length === 0;
	const tenorOptions =
		activeSetup?.productSetup.tenorValues.map((item) => item.value) ?? [];
	const channelOptions = activeSetup?.channels ?? [];
	const selectedChannel = useMemo(
		() =>
			channelOptions.find((channel) => channel.code === channelCode) ??
			channelOptions[0] ??
			null,
		[channelCode, channelOptions],
	);
	const selectedWorkflowId = selectedChannel?.workflowId ?? null;
	const workflowName = selectedWorkflowId
		? (workflowNameById[selectedWorkflowId] ?? selectedWorkflowId)
		: null;
	const activeScoreFields =
		activeSetup?.creditScoreSetup.scoreCard.fields ?? [];
	const requiresGenderInput = scoreCardHasField(activeScoreFields, [
		"gender",
		"sex",
	]);
	const requiresMaritalStatusInput = scoreCardHasField(activeScoreFields, [
		"maritalstatus",
		"marital",
		"civilstatus",
	]);
	const requiresEducationInput = scoreCardHasField(activeScoreFields, [
		"education",
		"educationlevel",
		"schooling",
	]);
	const dynamicScoreFields = useMemo(
		() =>
			activeScoreFields.filter(
				(field) => !isBuiltInScoreField(normalizeScoreFieldKey(field.field)),
			),
		[activeScoreFields],
	);
	const missingDynamicScoreField = useMemo(
		() =>
			dynamicScoreFields.find(
				(field) => !(dynamicScoreFieldValues[field.field] ?? "").trim(),
			) ?? null,
		[dynamicScoreFieldValues, dynamicScoreFields],
	);

	useEffect(() => {
		setTenureValue(activeSetup?.productSetup.tenorValues[0]?.value ?? null);
		setChannelCode(activeSetup?.channels[0]?.code ?? "");
		setGender("");
		setMaritalStatus("");
		setEducation("");
		setDocumentFiles({});
		setOtherDocumentFiles([createOtherDocumentUpload()]);
		setBureauProvider(activeSetup?.bureauProvider ?? "");
		setBureauPurpose(activeSetup?.bureauPurpose ?? "");
		setBureauConsent(false);
		if (activeSetup?.disbursementSetup.method === "WALLET") {
			setDestinationType("WALLET");
		} else {
			setDestinationType("BANK");
		}
		setRepaymentStartDateIso(formatDateForInput(new Date()));
		setCustomFormulaFieldValues(() => {
			const next: Record<string, number> = {};
			for (const field of activeSetup?.repaymentSetup.formulaSetup
				.fieldDefinitions ?? []) {
				next[field.key] = field.defaultValue;
			}
			return next;
		});
		setDynamicScoreFieldValues(() => {
			const next: Record<string, string> = {};
			for (const field of activeSetup?.creditScoreSetup.scoreCard.fields ??
				[]) {
				if (!isBuiltInScoreField(normalizeScoreFieldKey(field.field))) {
					next[field.field] = "";
				}
			}
			return next;
		});
	}, [activeSetup, createOtherDocumentUpload]);

	const riskEvaluationReady = useMemo(() => {
		if (!activeSetup) return false;
		const parsedAge = Number(ageInput);
		const parsedMonthlyIncome = Number(monthlyIncomeInput);
		const parsedRequestedAmount = Number(amountInput);
		if (!beneficiaryName.trim()) return false;
		if (!nationalId.trim()) return false;
		if (!Number.isFinite(parsedAge) || parsedAge <= 0) return false;
		if (!Number.isFinite(parsedMonthlyIncome) || parsedMonthlyIncome < 0)
			return false;
		if (!Number.isFinite(parsedRequestedAmount)) return false;
		if (tenureValue === null || tenureValue <= 0) return false;
		if (requiresGenderInput && !gender.trim()) return false;
		if (requiresMaritalStatusInput && !maritalStatus.trim()) return false;
		if (requiresEducationInput && !education.trim()) return false;
		if (missingDynamicScoreField) return false;
		if (activeSetup.bureauRequired && activeSetup.bureauConsentRequired) {
			if (!bureauProvider.trim()) return false;
			if (!bureauPurpose.trim()) return false;
			if (!bureauConsent) return false;
		}
		return true;
	}, [
		activeSetup,
		ageInput,
		amountInput,
		beneficiaryName,
		bureauConsent,
		bureauProvider,
		bureauPurpose,
		education,
		gender,
		monthlyIncomeInput,
		missingDynamicScoreField,
		maritalStatus,
		nationalId,
		requiresEducationInput,
		requiresGenderInput,
		requiresMaritalStatusInput,
		tenureValue,
	]);
	const scoreEvaluationPending = !riskEvaluationReady;

	const schedulePreview = useMemo(() => {
		if (!activeSetup) {
			return { schedule: [], error: "No active V2 setup selected." };
		}
		const parsedAmount = Number(amountInput);
		const selectedTenure = tenureValue ?? 0;
		const months = toTenureMonths(
			activeSetup.productSetup.tenorUnit,
			selectedTenure,
		);
		const annualRate = activeSetup.interestRatePlans[0]?.baseRate ?? 0;
		return buildV2RepaymentSchedulePreview(
			parsedAmount,
			annualRate,
			months,
			repaymentStartDateIso,
			{
				frequency: activeSetup.repaymentSetup.form.frequency,
				dueDayOfMonth: activeSetup.repaymentSetup.form.dueDayOfMonth,
				firstDueAfterDays: activeSetup.repaymentSetup.form.firstDueAfterDays,
				firstDueAfterDueDayDays:
					activeSetup.repaymentSetup.form.firstDueAfterDueDayDays,
			},
			activeSetup.repaymentSetup.formulaSetup,
			customFormulaFieldValues,
		);
	}, [
		activeSetup,
		amountInput,
		customFormulaFieldValues,
		repaymentStartDateIso,
		tenureValue,
	]);

	const computedDebtToIncomeRatio = useMemo(() => {
		const parsedMonthlyIncome = Number(monthlyIncomeInput);
		const firstPayment = schedulePreview.schedule[0]?.payment ?? null;
		if (
			!Number.isFinite(parsedMonthlyIncome) ||
			parsedMonthlyIncome <= 0 ||
			firstPayment === null ||
			!Number.isFinite(firstPayment)
		) {
			return null;
		}
		return Number(((firstPayment / parsedMonthlyIncome) * 100).toFixed(2));
	}, [monthlyIncomeInput, schedulePreview.schedule]);

	const computedScoreInputs = useMemo(() => {
		if (!activeSetup) return null;
		const fields = activeSetup.creditScoreSetup.scoreCard.fields;
		if (fields.length === 0) return null;
		const parsedAge = Number(ageInput);
		const parsedMonthlyIncome = Number(monthlyIncomeInput);
		const parsedRequestedAmount = Number(amountInput);
		return buildScoreInputsFromApplication(
			fields,
			{
				beneficiaryName,
				nationalId,
				gender,
				maritalStatus,
				education,
				phone: destinationType === "WALLET" ? phone : "",
				bankAccountNo: destinationType === "BANK" ? bankAccountNo : "",
				age: Number.isFinite(parsedAge) ? parsedAge : null,
				monthlyIncome: Number.isFinite(parsedMonthlyIncome)
					? parsedMonthlyIncome
					: null,
				debtToIncomeRatio: computedDebtToIncomeRatio,
				requestedAmount: Number.isFinite(parsedRequestedAmount)
					? parsedRequestedAmount
					: null,
				tenureValue,
				channelCode,
				destinationType,
				bureauProvider,
				bureauPurpose,
				bureauConsent,
				isBureauCheck: activeSetup.bureauRequired,
				notes,
			},
			dynamicScoreFieldValues,
		);
	}, [
		activeSetup,
		ageInput,
		amountInput,
		bankAccountNo,
		beneficiaryName,
		bureauConsent,
		bureauProvider,
		bureauPurpose,
		channelCode,
		computedDebtToIncomeRatio,
		destinationType,
		dynamicScoreFieldValues,
		education,
		gender,
		monthlyIncomeInput,
		maritalStatus,
		nationalId,
		notes,
		phone,
		tenureValue,
	]);

	const computedRisk = useMemo(() => {
		if (!activeSetup || !computedScoreInputs) return null;
		const scoreCard = activeSetup.creditScoreSetup.scoreCard;
		if (!scoreCard.fields.length) return null;
		const result = evaluateScoreCard(scoreCard, computedScoreInputs);
		const thresholds = activeSetup.creditScoreSetup.riskThresholds;
		const riskGrade = gradeFromThresholds(result.totalScore, thresholds);
		return {
			totalScore: result.totalScore,
			maxScore: result.maxScore,
			riskGrade,
		};
	}, [activeSetup, computedScoreInputs]);

	const documentUploadFields = useMemo<DocumentUploadField[]>(() => {
		if (!activeSetup) return [];
		if (!riskEvaluationReady) return [];
		const parsedAmount = Number(amountInput);
		return buildV2DocumentUploadFields(
			activeSetup,
			parsedAmount,
			computedRisk?.riskGrade ?? null,
		);
	}, [activeSetup, amountInput, computedRisk?.riskGrade, riskEvaluationReady]);

	useEffect(() => {
		const validIds = new Set(
			documentUploadFields.map((field) => field.documentTypeId),
		);
		setDocumentFiles((prev) => {
			const next: Record<string, File | null> = {};
			for (const [documentTypeId, file] of Object.entries(prev)) {
				if (validIds.has(documentTypeId)) {
					next[documentTypeId] = file;
				}
			}
			return next;
		});
	}, [documentUploadFields]);

	const validateStepOne = () => {
		const validation = validateV2StepOne({
			activeSetup,
			beneficiaryName,
			nationalId,
			ageInput,
			monthlyIncomeInput,
			amountInput,
			bureauProvider,
			bureauPurpose,
			bureauConsent,
			destinationType,
			bankAccountNo,
			phone,
		});
		if (validation.error) {
			setFormError(validation.error);
			return null;
		}
		if (requiresGenderInput && !gender.trim()) {
			setFormError("Select gender.");
			return null;
		}
		if (requiresMaritalStatusInput && !maritalStatus.trim()) {
			setFormError("Select marital status.");
			return null;
		}
		if (requiresEducationInput && !education.trim()) {
			setFormError("Select education.");
			return null;
		}
		if (missingDynamicScoreField) {
			setFormError(
				`${missingDynamicScoreField.description || missingDynamicScoreField.field} is required for score calculation.`,
			);
			return null;
		}
		setFormError(null);
		return validation.parsed;
	};

	const handleOtherDocumentChange = (uploadId: string, file: File | null) => {
		setOtherDocumentFiles((prev) => {
			const next = prev.map((upload) =>
				upload.id === uploadId ? { ...upload, file } : upload,
			);
			const changedIndex = next.findIndex((upload) => upload.id === uploadId);
			const isLastRow = changedIndex === next.length - 1;
			if (file && isLastRow) {
				next.push(createOtherDocumentUpload());
			}
			if (next.length === 0) {
				next.push(createOtherDocumentUpload());
			}
			return next;
		});
	};

	const handleRemoveOtherDocument = (uploadId: string) => {
		setOtherDocumentFiles((prev) => {
			if (prev.length <= 1) return [createOtherDocumentUpload()];
			const next = prev.filter((upload) => upload.id !== uploadId);
			if (next.length === 0 || next.at(-1)?.file !== null) {
				next.push(createOtherDocumentUpload());
			}
			return next;
		});
	};

	const handleNextStep = () => {
		if (disabled) return;
		const validated = validateStepOne();
		if (!validated) return;
		setCurrentStep(2);
	};

	const handleSubmit = () => {
		if (disabled || !activeSetup) return;
		const validated = validateStepOne();
		if (!validated) return;

		const missingRequiredDocuments = documentUploadFields
			.filter(
				(field) => field.isMandatory && !documentFiles[field.documentTypeId],
			)
			.map((field) => formatDocumentTypeLabel(field.documentTypeId));
		if (missingRequiredDocuments.length > 0) {
			setFormError(
				`Upload required documents before saving: ${missingRequiredDocuments.join(", ")}.`,
			);
			return;
		}

		const status = getApplicationStatusFromRiskGrade(
			computedRisk?.riskGrade ?? null,
		);
		const workflowId =
			activeSetup.channels.find((channel) => channel.code === channelCode)
				?.workflowId ?? null;
		const resolvedWorkflowName = workflowId
			? (workflowNameById[workflowId] ?? workflowId)
			: null;

		const createdApplication = addApplication({
			status,
			beneficiaryName,
			nationalId,
			gender,
			maritalStatus,
			education,
			phone: destinationType === "WALLET" ? phone : "",
			bankAccountNo: destinationType === "BANK" ? bankAccountNo : "",
			kpayPhoneNo: destinationType === "WALLET" ? phone : "",
			age: validated.parsedAge,
			monthlyIncome: validated.parsedMonthlyIncome,
			debtToIncomeRatio: computedDebtToIncomeRatio,
			requestedAmount: validated.parsedAmount,
			tenureValue,
			tenureUnit: toTenorUnit(activeSetup.productSetup.tenorUnit),
			channelCode,
			destinationType,
			notes,
			setupId: activeSetup.id,
			productCode: activeSetup.productSetup.productCode,
			productName: activeSetup.productSetup.productName,
			creditScore: computedRisk?.totalScore ?? null,
			creditMax: computedRisk?.maxScore ?? null,
			workflowId,
			workflowName: resolvedWorkflowName,
			bureauProvider,
			bureauPurpose,
			bureauConsent,
		});

		if (createdApplication.status === "SUBMITTED" && workflowId) {
			const runtime = createWorkflowRuntime(workflows[workflowId]);
			if (runtime?.initialStageId) {
				advanceWorkflowStage(createdApplication.id, {
					stageId: runtime.initialStageId,
					stageIndex: 0,
					stageLabel:
						runtime.stageLabelById[runtime.initialStageId] ??
						runtime.initialStageId,
					occurredAt: Date.now(),
				});
			}
		}

		navigate({ to: ".." });
	};

	return (
		<div className="p-6 font-sans max-w-5xl mx-auto">
			<div className="space-y-6">
				<div className="flex items-start justify-between gap-4">
					<div>
						<div className="text-sm text-gray-600">V2 loan applications</div>
						<h1 className="text-2xl font-semibold">Create application</h1>
					</div>
				</div>

				{disabled ? (
					<div className="border rounded p-4 bg-yellow-50 text-sm text-gray-800">
						You need at least one saved V2 loan setup before creating
						applications.
						<div className="mt-2">
							<Link
								to="/solution/v2/loan-setup"
								className="text-blue-600 hover:underline"
							>
								Go to V2 Loan Setup
							</Link>
						</div>
					</div>
				) : (
					<div className="space-y-4 border rounded p-4">
						<div className="flex items-center gap-3 text-sm">
							<button
								type="button"
								onClick={() => setCurrentStep(1)}
								className={`px-3 py-1.5 rounded border ${
									currentStep === 1
										? "bg-gray-900 text-white border-gray-900"
										: "bg-white text-gray-700"
								}`}
							>
								1. Application details
							</button>
							<button
								type="button"
								onClick={() => {
									if (currentStep === 1) {
										handleNextStep();
										return;
									}
									setCurrentStep(2);
								}}
								className={`px-3 py-1.5 rounded border ${
									currentStep === 2
										? "bg-gray-900 text-white border-gray-900"
										: "bg-white text-gray-700"
								}`}
							>
								2. Document uploads
							</button>
						</div>

						{currentStep === 1 ? (
							<>
								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<label className="flex flex-col gap-1 text-sm">
										<span>V2 loan setup</span>
										<select
											className="border px-2 py-2 rounded"
											value={selectedSetupId}
											onChange={(event) => {
												setSelectedSetupId(event.target.value);
												setCurrentStep(1);
												setFormError(null);
											}}
										>
											{setupList.map((setup) => (
												<option key={setup.id} value={setup.id}>
													{setup.productSetup.productName || "Unnamed Product"}{" "}
													({setup.productSetup.productCode || "—"})
												</option>
											))}
										</select>
										<span className="text-xs text-gray-600">
											Tenure options: {tenorOptions.join(", ") || "—"}{" "}
											{activeSetup?.productSetup.tenorUnit.toLowerCase()} ·
											Range:{" "}
											{activeSetup?.productSetup.minAmount.toLocaleString()} -{" "}
											{activeSetup?.productSetup.maxAmount.toLocaleString()}
										</span>
									</label>

									<label className="flex flex-col gap-1 text-sm">
										<span>Status</span>
										<input
											readOnly
											value={
												riskEvaluationReady
													? getApplicationStatusFromRiskGrade(
															computedRisk?.riskGrade ?? null,
														)
													: ""
											}
											placeholder="Complete inputs to determine"
											className="border px-2 py-2 rounded bg-gray-50"
										/>
										<span className="text-xs text-gray-600">
											{riskEvaluationReady
												? "Status is calculated from V2 scorecard and risk thresholds."
												: "Status appears after all scoring inputs are filled."}
										</span>
									</label>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
									<label className="flex flex-col gap-1 text-sm">
										<span>Beneficiary name</span>
										<input
											type="text"
											className="border px-2 py-2 rounded"
											value={beneficiaryName}
											onChange={(event) =>
												setBeneficiaryName(event.target.value)
											}
										/>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>National ID</span>
										<input
											type="text"
											className="border px-2 py-2 rounded"
											value={nationalId}
											onChange={(event) => setNationalId(event.target.value)}
										/>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>Age</span>
										<input
											type="number"
											min={0}
											className="border px-2 py-2 rounded"
											value={ageInput}
											onChange={(event) => setAgeInput(event.target.value)}
										/>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>Income</span>
										<input
											type="number"
											min={0}
											className="border px-2 py-2 rounded"
											value={monthlyIncomeInput}
											onChange={(event) =>
												setMonthlyIncomeInput(event.target.value)
											}
										/>
										<span className="text-xs text-gray-600">
											Used for scorecard income rules and background DTI
											calculation.
										</span>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>Gender{requiresGenderInput ? " *" : ""}</span>
										<select
											className="border px-2 py-2 rounded"
											value={gender}
											onChange={(event) => setGender(event.target.value)}
										>
											<option value="">Select gender</option>
											{genderOptions.map((option) => (
												<option key={option} value={option}>
													{option}
												</option>
											))}
										</select>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>
											Marital status{requiresMaritalStatusInput ? " *" : ""}
										</span>
										<select
											className="border px-2 py-2 rounded"
											value={maritalStatus}
											onChange={(event) => setMaritalStatus(event.target.value)}
										>
											<option value="">Select marital status</option>
											{maritalStatusOptions.map((option) => (
												<option key={option} value={option}>
													{option}
												</option>
											))}
										</select>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>Education{requiresEducationInput ? " *" : ""}</span>
										<select
											className="border px-2 py-2 rounded"
											value={education}
											onChange={(event) => setEducation(event.target.value)}
										>
											<option value="">Select education</option>
											{educationOptions.map((option) => (
												<option key={option} value={option}>
													{option}
												</option>
											))}
										</select>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>Requested amount</span>
										<input
											type="number"
											className="border px-2 py-2 rounded"
											min={activeSetup?.productSetup.minAmount ?? 0}
											max={activeSetup?.productSetup.maxAmount ?? undefined}
											value={amountInput}
											onChange={(event) => setAmountInput(event.target.value)}
										/>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>Tenure</span>
										<select
											className="border px-2 py-2 rounded"
											value={tenureValue ?? ""}
											onChange={(event) =>
												setTenureValue(
													event.target.value
														? Number(event.target.value)
														: null,
												)
											}
										>
											{tenorOptions.map((value) => (
												<option key={value} value={value}>
													{value}{" "}
													{activeSetup?.productSetup.tenorUnit.toLowerCase()}
												</option>
											))}
										</select>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>Channel code</span>
										<select
											className="border px-2 py-2 rounded"
											value={channelCode}
											onChange={(event) => setChannelCode(event.target.value)}
										>
											{channelOptions.map((channel) => (
												<option key={channel.id} value={channel.code}>
													{channel.code || channel.name || "Unnamed channel"}
												</option>
											))}
										</select>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>Workflow</span>
										<input
											readOnly
											value={workflowName ?? "—"}
											className="border px-2 py-2 rounded bg-gray-50"
										/>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>Disbursement destination</span>
										<select
											className="border px-2 py-2 rounded"
											value={destinationType}
											onChange={(event) =>
												setDestinationType(
													event.target.value as DisbursementDestinationType,
												)
											}
										>
											{activeSetup?.disbursementSetup.method === "WALLET" ? (
												<option value="WALLET">WALLET</option>
											) : (
												<option value="BANK">BANK</option>
											)}
										</select>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>
											{destinationType === "BANK"
												? "Bank account no"
												: "Phone no"}
										</span>
										<input
											type={destinationType === "BANK" ? "text" : "tel"}
											className="border px-2 py-2 rounded"
											value={destinationType === "BANK" ? bankAccountNo : phone}
											onChange={(event) => {
												if (destinationType === "BANK") {
													setBankAccountNo(event.target.value);
													return;
												}
												setPhone(event.target.value);
											}}
										/>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>Repayment start date</span>
										<input
											type="date"
											className="border px-2 py-2 rounded"
											value={repaymentStartDateIso}
											onChange={(event) =>
												setRepaymentStartDateIso(event.target.value)
											}
										/>
										<span className="text-xs text-gray-600">
											Preview dates use the repayment setup frequency and
											due-day rules.
										</span>
									</label>
									<label className="flex flex-col gap-1 text-sm">
										<span>DTI</span>
										<input
											readOnly
											value={
												computedDebtToIncomeRatio === null
													? ""
													: `${formatAmountWithTwoDecimals(computedDebtToIncomeRatio)}%`
											}
											placeholder="Calculated automatically"
											className="border px-2 py-2 rounded bg-gray-50"
										/>
										<span className="text-xs text-gray-600">
											Calculated in the background from the selected product's
											repayment preview and income.
										</span>
									</label>
								</div>

								{dynamicScoreFields.length ? (
									<div className="space-y-3 border rounded p-3 bg-white text-sm">
										<div>
											<div className="text-sm font-medium">
												Credit score inputs
											</div>
											<div className="text-xs text-gray-600">
												These fields come directly from the selected loan setup
												scorecard and are required before risk grade and
												document uploads can be determined.
											</div>
										</div>
										<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
											{dynamicScoreFields.map((field) => {
												const inputKind = inferFieldKind(field.rules ?? []);
												const selectableOptions =
													getSelectableScoreFieldOptions(field.rules ?? []);
												const value =
													dynamicScoreFieldValues[field.field] ?? "";

												const inputId = `score-field-${normalizeScoreFieldKey(field.field)}`;

												return (
													<div
														key={field.field}
														className="flex flex-col gap-1 text-sm"
													>
														<label htmlFor={inputId}>
															{field.description || field.field}
														</label>
														{selectableOptions.length > 0 ? (
															<select
																id={inputId}
																className="border px-2 py-2 rounded"
																value={value}
																onChange={(event) =>
																	setDynamicScoreFieldValues((current) => ({
																		...current,
																		[field.field]: event.target.value,
																	}))
																}
															>
																<option value="">Select value</option>
																{selectableOptions.map((option) => (
																	<option key={option} value={option}>
																		{option}
																	</option>
																))}
															</select>
														) : (
															<input
																id={inputId}
																type={
																	inputKind === "number" ? "number" : "text"
																}
																step={
																	inputKind === "number" ? "any" : undefined
																}
																className="border px-2 py-2 rounded"
																value={value}
																onChange={(event) =>
																	setDynamicScoreFieldValues((current) => ({
																		...current,
																		[field.field]: event.target.value,
																	}))
																}
															/>
														)}
														<span className="text-xs text-gray-600">
															Field key: {field.field}
														</span>
													</div>
												);
											})}
										</div>
									</div>
								) : null}

								{activeSetup?.repaymentSetup.formulaSetup.fieldDefinitions
									.length ? (
									<div className="space-y-3 border rounded p-3 bg-white text-sm">
										<div>
											<div className="text-sm font-medium">
												Custom EMI inputs
											</div>
											<div className="text-xs text-gray-600">
												These values are used directly by the repayment formula
												in the preview.
											</div>
										</div>
										<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
											{activeSetup.repaymentSetup.formulaSetup.fieldDefinitions.map(
												(field) => (
													<label
														key={field.id}
														className="flex flex-col gap-1 text-sm"
													>
														<span>
															{field.label || field.key || "Custom field"}
														</span>
														<input
															type="number"
															className="border px-2 py-2 rounded"
															value={
																customFormulaFieldValues[field.key] ??
																field.defaultValue
															}
															onChange={(event) => {
																const nextValue = Number(event.target.value);
																setCustomFormulaFieldValues((current) => ({
																	...current,
																	[field.key]: Number.isFinite(nextValue)
																		? nextValue
																		: field.defaultValue,
																}));
															}}
														/>
														<span className="text-xs text-gray-600">
															{field.description ||
																`Default: ${field.defaultValue}`}
														</span>
													</label>
												),
											)}
										</div>
									</div>
								) : null}

								<div className="space-y-3 border rounded p-3 bg-gray-50 text-sm text-gray-700">
									<div>
										<div className="text-xs text-gray-600">
											Payment schedule (custom EMI)
										</div>
										<div className="text-base font-semibold">
											Upcoming installments preview
										</div>
										<div className="text-xs text-gray-500">
											{schedulePreview.schedule.length} installment(s) based on
											the selected tenure.
										</div>
									</div>
									{schedulePreview.error ? (
										<div className="text-xs text-red-700">
											{schedulePreview.error}
										</div>
									) : null}
									{schedulePreview.schedule.length > 0 ? (
										<div className="border rounded bg-white overflow-x-auto">
											<table className="min-w-full text-xs text-left">
												<thead className="bg-gray-100 text-gray-700 font-semibold border-b">
													<tr>
														<th className="px-3 py-2 whitespace-nowrap">#</th>
														<th className="px-3 py-2 whitespace-nowrap">
															Date
														</th>
														<th className="px-3 py-2 text-right whitespace-nowrap">
															Payment
														</th>
														<th className="px-3 py-2 text-right whitespace-nowrap">
															Principal
														</th>
														<th className="px-3 py-2 text-right whitespace-nowrap">
															Interest
														</th>
														<th className="px-3 py-2 text-right whitespace-nowrap">
															Balance
														</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-gray-200">
													{schedulePreview.schedule.map((row) => (
														<tr key={row.period} className="hover:bg-gray-50">
															<td className="px-3 py-2 text-gray-500">
																{row.period}
															</td>
															<td className="px-3 py-2 text-gray-500 whitespace-nowrap">
																{new Intl.DateTimeFormat("en-US", {
																	year: "numeric",
																	month: "short",
																	day: "numeric",
																}).format(row.date)}
															</td>
															<td className="px-3 py-2 text-right font-medium">
																{formatAmountWithTwoDecimals(row.payment)}
															</td>
															<td className="px-3 py-2 text-right text-gray-600">
																{formatAmountWithTwoDecimals(row.principal)}
															</td>
															<td className="px-3 py-2 text-right text-orange-600">
																{formatAmountWithTwoDecimals(row.interest)}
															</td>
															<td className="px-3 py-2 text-right text-gray-500">
																{formatAmountWithTwoDecimals(row.balance)}
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									) : (
										<div className="text-xs text-gray-600">
											Enter amount, tenure, and any custom EMI inputs to preview
											the schedule.
										</div>
									)}
									<div className="text-xs text-gray-500">
										Schedule preview uses the saved V2 repayment formula,
										repayment frequency, and the values entered above.
									</div>
								</div>

								{activeSetup?.bureauRequired ? (
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 border rounded p-4">
										<label className="flex flex-col gap-1 text-sm">
											<span>Bureau provider</span>
											<input
												type="text"
												className="border px-2 py-2 rounded"
												value={bureauProvider}
												onChange={(event) =>
													setBureauProvider(event.target.value)
												}
											/>
										</label>
										<label className="flex flex-col gap-1 text-sm">
											<span>Bureau purpose</span>
											<input
												type="text"
												className="border px-2 py-2 rounded"
												value={bureauPurpose}
												onChange={(event) =>
													setBureauPurpose(event.target.value)
												}
											/>
										</label>
										<label className="inline-flex items-center gap-2 text-sm md:col-span-2">
											<input
												type="checkbox"
												checked={bureauConsent}
												onChange={(event) =>
													setBureauConsent(event.target.checked)
												}
											/>
											<span>Beneficiary consent captured</span>
										</label>
									</div>
								) : null}

								<label className="flex flex-col gap-1 text-sm">
									<span>Notes</span>
									<textarea
										className="border px-2 py-2 rounded min-h-24"
										value={notes}
										onChange={(event) => setNotes(event.target.value)}
									/>
								</label>
							</>
						) : (
							<div className="space-y-4">
								<div className="border rounded p-4 bg-gray-50 text-sm text-gray-700">
									<div>
										Upload requirements are derived from V2 document rules and
										evaluated risk grade.
									</div>
									{scoreEvaluationPending ? (
										<div>
											Complete all scorecard-driven application inputs in step 1
											to calculate the credit score, risk grade, and required
											documents.
										</div>
									) : null}
									<div>
										Credit score: {computedRisk?.totalScore ?? "Not available"}
										{computedRisk ? ` / ${computedRisk.maxScore}` : ""}
									</div>
									<div>
										Risk grade: {computedRisk?.riskGrade ?? "Not available"}
									</div>
								</div>

								<div className="space-y-3 border rounded p-4">
									{documentUploadFields.map((document) => {
										const label = formatDocumentTypeLabel(
											document.documentTypeId,
										);
										const selectedFile =
											documentFiles[document.documentTypeId] ?? null;
										return (
											<label
												key={document.documentTypeId}
												className="flex flex-col gap-2 text-sm border rounded p-3"
											>
												<div className="flex items-center justify-between gap-2">
													<span className="font-medium">{label}</span>
													<span
														className={`text-xs px-2 py-0.5 rounded-full border ${
															document.isMandatory
																? "bg-red-50 text-red-700 border-red-100"
																: "bg-gray-100 text-gray-700 border-gray-200"
														}`}
													>
														{document.isMandatory ? "Required" : "Optional"}
													</span>
												</div>
												<input
													type="file"
													onChange={(event) => {
														const file = event.target.files?.[0] ?? null;
														setDocumentFiles((prev) => ({
															...prev,
															[document.documentTypeId]: file,
														}));
													}}
												/>
												{selectedFile ? (
													<span className="text-xs text-gray-600">
														Selected: {selectedFile.name}
													</span>
												) : null}
											</label>
										);
									})}
								</div>

								<div className="space-y-3 border rounded p-4">
									<div className="text-sm font-medium">
										Other documents (optional)
									</div>
									{otherDocumentFiles.map((upload) => {
										const showRemove =
											otherDocumentFiles.length > 1 && upload.file !== null;
										return (
											<div
												key={upload.id}
												className="flex flex-col gap-2 text-sm border rounded p-3"
											>
												<input
													type="file"
													onChange={(event) => {
														const file = event.target.files?.[0] ?? null;
														handleOtherDocumentChange(upload.id, file);
													}}
												/>
												{upload.file ? (
													<span className="text-xs text-gray-600">
														Selected: {upload.file.name}
													</span>
												) : null}
												{showRemove ? (
													<button
														type="button"
														onClick={() => handleRemoveOtherDocument(upload.id)}
														className="self-start text-xs px-2 py-1 rounded border hover:bg-gray-50"
													>
														Remove
													</button>
												) : null}
											</div>
										);
									})}
								</div>
							</div>
						)}

						{formError ? (
							<div className="text-sm text-red-700">{formError}</div>
						) : null}

						<div className="flex gap-3">
							{currentStep === 1 ? (
								<button
									type="button"
									onClick={handleNextStep}
									className="px-4 py-2 rounded bg-blue-600 text-white shadow hover:bg-blue-700"
									disabled={disabled}
								>
									Next: Upload documents
								</button>
							) : (
								<>
									<button
										type="button"
										onClick={() => setCurrentStep(1)}
										className="px-4 py-2 rounded border text-sm hover:bg-gray-50"
									>
										Back
									</button>
									<button
										type="button"
										onClick={handleSubmit}
										className="px-4 py-2 rounded bg-emerald-600 text-white shadow hover:bg-emerald-700"
										disabled={disabled}
									>
										Submit Application
									</button>
								</>
							)}
							<Link
								to="/solution/v2/loan-setup/list"
								className="px-4 py-2 rounded border text-sm hover:bg-gray-50"
							>
								Cancel
							</Link>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
