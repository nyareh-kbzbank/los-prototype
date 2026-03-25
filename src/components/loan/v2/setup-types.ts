export type LoanSecurityType = "SECURED" | "UNSECURED";
export type TenorUnit = "DAY" | "MONTH" | "YEAR";
export type MaxAmountRateType = "FLAT" | "PERCENTAGE";
export type CollateralType =
	| "LAND"
	| "BUILDING"
	| "VEHICLE"
	| "MACHINERY"
	| "DEPOSIT"
	| "OTHER";

export const V2_INTEREST_TYPES = ["REDUCING", "FLAT"] as const;
export type V2InterestType = (typeof V2_INTEREST_TYPES)[number];

export const V2_RATE_TYPES = ["FIXED", "FLOATING"] as const;
export type V2RateType = (typeof V2_RATE_TYPES)[number];

export type V2InterestParameter = {
	id: string;
	name: string;
	value: number;
	interestRate: number;
};

export type V2InterestPolicy = {
	id: string;
	interestCategory: string;
	interestRate: number;
};

export type V2InterestConfig = {
	id: string;
	interestType: V2InterestType;
	rateType: V2RateType;
	baseRate: number;
	config: { parameters: V2InterestParameter[] };
	policies: V2InterestPolicy[];
};

export type FieldDefinition = {
	id: string;
	key: string;
	label: string;
	description: string;
	defaultValue: number;
};

export type FormulaSetup = {
	principalFormula: string;
	interestFormula: string;
	fieldDefinitions: FieldDefinition[];
};

export function createDefaultFormulaSetup(): FormulaSetup {
	return {
		principalFormula: "max(0, baseEmi - (balance * rateMonthly))",
		interestFormula: "balance * rateMonthly",
		fieldDefinitions: [],
	};
}

export type TenorValueItem = {
	id: string;
	value: number;
};

export type ProductSetupForm = {
	productName: string;
	productCode: string;
	description: string;
	loanSecurity: LoanSecurityType;
	collateralType: CollateralType;
	minimumCollateralValue: number;
	maximumLtvPercentage: number;
	haircutPercentage: number;
	valuationRequired: boolean;
	valuationValidityDays: number | null;
	minAmount: number;
	maxAmount: number;
	maxAmountRateType: MaxAmountRateType;
	serviceFees: number | null;
	adminFees: number | null;
	stampDuty: number | null;
	commissionFees: number | null;
	insuranceFees: number | null;
	tenorUnit: TenorUnit;
	tenorValues: TenorValueItem[];
};

export type V2BrandingSetup = {
	bannerImageUrl: string;
	cardImageUrl: string;
	shortDescription: string;
	longDescription: string;
	tags: string[];
};

export type ChannelConfig = {
	id: string;
	name: string;
	code: string;
	workflowId: string;
};

export type ChannelWorkflowMapItem = {
	channel: ChannelConfig;
	workflowName: string | null;
};

export type WorkflowListItem = {
	workflowId: string;
	name: string;
};

export function createDefaultBrandingSetup(): V2BrandingSetup {
	return {
		bannerImageUrl: "",
		cardImageUrl: "",
		shortDescription: "",
		longDescription: "",
		tags: [],
	};
}
