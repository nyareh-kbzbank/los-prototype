import { v4 as uuidV4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DocumentRequirementItem } from "@/components/loan/DocumentRequirementsSection";
import type { CreditScoreEngineState } from "@/components/loan/v2/CreditScoreEngineTab";
import type {
	DecisionRuleByGrade,
	DecisionRuleSetupState,
} from "@/components/loan/v2/DecisionRuleSetupTab";
import type { DisbursementSetupTabState } from "@/components/loan/v2/DisbursementSetupTab";
import type { RepaymentSetupTabState } from "@/components/loan/v2/RepaymentSetupTab";
import type {
	ChannelConfig,
	ProductSetupForm,
	V2InterestConfig,
} from "@/components/loan/v2/setup-types";

export type V2LoanSetupSnapshot = {
	id: string;
	createdAt: number;
	productSetup: ProductSetupForm;
	channels: ChannelConfig[];
	interestRatePlans: V2InterestConfig[];
	repaymentSetup: RepaymentSetupTabState;
	creditScoreSetup: CreditScoreEngineState;
	documentSetup: DocumentRequirementItem[];
	bureauRequired: boolean;
	bureauProvider: string;
	bureauPurpose: string;
	bureauConsentRequired: boolean;
	decisionRules: DecisionRuleByGrade;
	decisionRuleSetup?: DecisionRuleSetupState;
	disbursementSetup: DisbursementSetupTabState;
};

type V2LoanSetupInput = {
	productSetup: ProductSetupForm;
	channels: ChannelConfig[];
	interestRatePlans: V2InterestConfig[];
	repaymentSetup: RepaymentSetupTabState;
	creditScoreSetup: CreditScoreEngineState;
	documentSetup: DocumentRequirementItem[];
	bureauRequired: boolean;
	bureauProvider: string;
	bureauPurpose: string;
	bureauConsentRequired: boolean;
	decisionRules: DecisionRuleByGrade;
	decisionRuleSetup: DecisionRuleSetupState;
	disbursementSetup: DisbursementSetupTabState;
};

type V2LoanSetupState = {
	setups: Record<string, V2LoanSetupSnapshot>;
	addSetup: (input: V2LoanSetupInput) => V2LoanSetupSnapshot;
	updateSetup: (id: string, input: V2LoanSetupInput) => void;
	removeSetup: (id: string) => void;
	resetStore: () => void;
};

const cloneProductSetup = (
	productSetup: ProductSetupForm,
): ProductSetupForm => ({
	...productSetup,
	productName: productSetup.productName.trim(),
	productCode: productSetup.productCode.trim(),
	description: productSetup.description.trim(),
	minAmount: Math.max(0, productSetup.minAmount),
	maxAmount: Math.max(0, productSetup.maxAmount),
	tenorValues: productSetup.tenorValues.map((item) => ({
		id: item.id,
		value: Math.max(0, item.value),
	})),
});

const cloneChannels = (channels: ChannelConfig[]): ChannelConfig[] =>
	channels
		.map((channel) => ({
			id: channel.id,
			name: channel.name.trim(),
			code: channel.code.trim(),
			workflowId: channel.workflowId,
		}))
		.filter((channel) => channel.name || channel.code || channel.workflowId);

const cloneInterestRatePlans = (
	interestRatePlans: V2InterestConfig[],
): V2InterestConfig[] =>
	interestRatePlans.map((plan) => ({
		interestType: plan.interestType,
		rateType: plan.rateType,
		baseRate: Number.isFinite(plan.baseRate) ? plan.baseRate : 0,
		config: {
			parameters: (plan.config?.parameters ?? []).map((parameter) => ({
				name: parameter.name,
				value: Number.isFinite(parameter.value) ? parameter.value : 0,
				interestRate: Number.isFinite(parameter.interestRate)
					? parameter.interestRate
					: 0,
			})),
		},
		policies: (plan.policies ?? []).map((policy) => ({
			interestCategory: policy.interestCategory,
			interestRate: Number.isFinite(policy.interestRate)
				? policy.interestRate
				: 0,
		})),
	}));

const cloneDecisionRules = (
	decisionRules: DecisionRuleByGrade,
): DecisionRuleByGrade => ({
	LOW: decisionRules.LOW,
	MEDIUM: decisionRules.MEDIUM,
	HIGH: decisionRules.HIGH,
});

const cloneDecisionRuleSetup = (
	decisionRuleSetup: DecisionRuleSetupState,
): DecisionRuleSetupState => ({
	decisionRules: cloneDecisionRules(decisionRuleSetup.decisionRules),
	rules: decisionRuleSetup.rules.map((rule) => ({
		id: rule.id,
		name: rule.name.trim(),
		outcome: rule.outcome,
		conditions: rule.conditions.map((condition) => ({
			id: condition.id,
			keyField: condition.keyField.trim(),
			operator: condition.operator,
			value: condition.value.trim(),
		})),
	})),
});

const cloneRepaymentSetup = (
	repaymentSetup: RepaymentSetupTabState,
): RepaymentSetupTabState => ({
	form: {
		...repaymentSetup.form,
		methodName: repaymentSetup.form.methodName.trim(),
		description: repaymentSetup.form.description.trim(),
	},
	formulaSetup: {
		principalFormula: repaymentSetup.formulaSetup.principalFormula.trim(),
		interestFormula: repaymentSetup.formulaSetup.interestFormula.trim(),
		fieldDefinitions: repaymentSetup.formulaSetup.fieldDefinitions.map(
			(field) => ({
				id: field.id,
				key: field.key.trim(),
				label: field.label.trim(),
				description: field.description.trim(),
				defaultValue: Number.isFinite(field.defaultValue)
					? field.defaultValue
					: 0,
			}),
		),
	},
});

const cloneCreditScoreSetup = (
	creditScoreSetup: CreditScoreEngineState,
): CreditScoreEngineState => ({
	scoreCard: {
		...creditScoreSetup.scoreCard,
		name: creditScoreSetup.scoreCard.name.trim(),
		maxScore: Number.isFinite(creditScoreSetup.scoreCard.maxScore)
			? creditScoreSetup.scoreCard.maxScore
			: 0,
		fields: creditScoreSetup.scoreCard.fields.map((field) => ({
			field: field.field.trim(),
			description: field.description.trim(),
			rules: (field.rules ?? []).map((rule) => ({
				field: rule.field.trim(),
				operator: rule.operator,
				value: typeof rule.value === "string" ? rule.value.trim() : rule.value,
				score: Number.isFinite(rule.score) ? rule.score : 0,
			})),
		})),
	},
	riskThresholds: {
		lowMin: Number.isFinite(creditScoreSetup.riskThresholds.lowMin)
			? creditScoreSetup.riskThresholds.lowMin
			: 0,
		mediumMin: Number.isFinite(creditScoreSetup.riskThresholds.mediumMin)
			? creditScoreSetup.riskThresholds.mediumMin
			: 0,
		highMin: Number.isFinite(creditScoreSetup.riskThresholds.highMin)
			? creditScoreSetup.riskThresholds.highMin
			: 0,
	},
});

const cloneDocumentSetup = (
	documentSetup: DocumentRequirementItem[],
): DocumentRequirementItem[] =>
	documentSetup.map((item) => ({
		id: item.id,
		grade: item.grade,
		documents: item.documents.map((doc) => ({
			id: doc.id,
			documentTypeId: doc.documentTypeId,
			minAmount: Number.isFinite(doc.minAmount) ? doc.minAmount : 0,
			maxAmount: Number.isFinite(doc.maxAmount) ? doc.maxAmount : 0,
			employmentType: doc.employmentType,
			collateralRequired: Boolean(doc.collateralRequired),
			isMandatory: Boolean(doc.isMandatory),
		})),
	}));

const cloneDisbursementSetup = (
	disbursementSetup: DisbursementSetupTabState,
): DisbursementSetupTabState => ({
	disbursementType: disbursementSetup.disbursementType,
	releaseFullAmountAtOnce: Boolean(disbursementSetup.releaseFullAmountAtOnce),
	method: disbursementSetup.method,
	processingFee: Number.isFinite(disbursementSetup.processingFee)
		? disbursementSetup.processingFee
		: 0,
	disbursementFee: Number.isFinite(disbursementSetup.disbursementFee)
		? disbursementSetup.disbursementFee
		: 0,
	tranches: disbursementSetup.tranches.map((tranche) => ({
		id: tranche.id,
		tranche: tranche.tranche,
		amount: Number.isFinite(tranche.amount) ? tranche.amount : 0,
		triggerType: tranche.triggerType,
		timingMeaning: tranche.timingMeaning,
	})),
});

const createSnapshot = (
	input: V2LoanSetupInput,
	id = uuidV4(),
): V2LoanSetupSnapshot => ({
	id,
	createdAt: Date.now(),
	productSetup: cloneProductSetup(input.productSetup),
	channels: cloneChannels(input.channels),
	interestRatePlans: cloneInterestRatePlans(input.interestRatePlans),
	repaymentSetup: cloneRepaymentSetup(input.repaymentSetup),
	creditScoreSetup: cloneCreditScoreSetup(input.creditScoreSetup),
	documentSetup: cloneDocumentSetup(input.documentSetup),
	bureauRequired: Boolean(input.bureauRequired),
	bureauProvider: input.bureauProvider.trim(),
	bureauPurpose: input.bureauPurpose.trim(),
	bureauConsentRequired: Boolean(input.bureauConsentRequired),
	decisionRules: cloneDecisionRules(input.decisionRules),
	decisionRuleSetup: cloneDecisionRuleSetup(input.decisionRuleSetup),
	disbursementSetup: cloneDisbursementSetup(input.disbursementSetup),
});

export const useLoanSetupV2Store = create<V2LoanSetupState>()(
	persist(
		(set, get) => ({
			setups: {},
			addSetup: (input) => {
				const entry = createSnapshot(input);
				set((prev) => ({
					setups: { ...prev.setups, [entry.id]: entry },
				}));
				return entry;
			},
			updateSetup: (id, input) => {
				const current = get().setups[id];
				if (!current) return;
				const updated = {
					...createSnapshot(input, id),
					createdAt: current.createdAt,
				};
				set((prev) => ({
					setups: { ...prev.setups, [id]: updated },
				}));
			},
			removeSetup: (id) => {
				set((prev) => {
					const nextSetups = { ...prev.setups };
					delete nextSetups[id];
					return { setups: nextSetups };
				});
			},
			resetStore: () => set({ setups: {} }),
		}),
		{
			name: "loan-workflow-setups-v2",
			version: 1,
			partialize: (state) => ({ setups: state.setups }),
		},
	),
);

export function getLoanSetupV2List(
	setups: Record<string, V2LoanSetupSnapshot>,
) {
	return Object.values(setups).sort((a, b) => b.createdAt - a.createdAt);
}
