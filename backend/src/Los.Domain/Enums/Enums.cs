namespace Los.Domain.Enums;

public enum TenorUnit
{
    Day,
    Month,
    Year
}

public enum InterestType
{
    Reducing,
    Flat
}

public enum RateType
{
    Fixed,
    Floating
}

public enum RepaymentMethod
{
    Emi,
    InterestOnly,
    Bullet
}

public enum RepaymentFrequency
{
    Weekly,
    Biweekly,
    Monthly,
    Quarterly
}

public enum DisbursementType
{
    Full,
    Partial
}

public enum DisbursementDestinationType
{
    Bank,
    Wallet
}

public enum RiskGrade
{
    Low,
    Medium,
    High
}

public enum LoanApplicationStatus
{
    Draft,
    Submitted,
    CheckerPending,
    Approved,
    Rejected
}

public enum ApplicationDecisionActor
{
    System,
    Maker,
    Checker
}

public enum ScorecardOperator
{
    Equal,
    NotEqual,
    GreaterThan,
    LessThan,
    GreaterThanOrEqual,
    LessThanOrEqual,
    Between,
    In,
    NotIn,
    Contains
}

public enum WorkflowNodeType
{
    Start,
    End,
    Custom,
    Condition
}
