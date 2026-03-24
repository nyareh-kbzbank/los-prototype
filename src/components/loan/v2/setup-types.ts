export type LoanSecurityType = "SECURED" | "UNSECURED";
export type TenorUnit = "DAY" | "MONTH" | "YEAR";

export const V2_INTEREST_TYPES = ["REDUCING", "FLAT"] as const;
export type V2InterestType = (typeof V2_INTEREST_TYPES)[number];

export const V2_RATE_TYPES = ["FIXED", "FLOATING"] as const;
export type V2RateType = (typeof V2_RATE_TYPES)[number];

export type V2InterestParameter = {
	name: string;
	value: number;
	interestRate: number;
};

export type V2InterestPolicy = {
	interestCategory: string;
	interestRate: number;
};

export type V2InterestConfig = {
	interestType: V2InterestType;
	rateType: V2RateType;
	baseRate: number;
	config: { parameters: V2InterestParameter[] };
	policies: V2InterestPolicy[];
};

export type TenorValueItem = {
	id: string;
	value: number;
};

export type ProductSetupForm = {
	productName: string;
	productCode: string;
	description: string;
	loanSecurity: LoanSecurityType;
	minAmount: number;
	maxAmount: number;
	serviceFees: number | null;
	adminFees: number | null;
	stampDuty: number | null;
	commissionFees: number | null;
	insuranceFees: number | null;
	tenorUnit: TenorUnit;
	tenorValues: TenorValueItem[];
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
