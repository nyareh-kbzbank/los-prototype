using Los.Domain.Common;
using Los.Domain.Enums;

namespace Los.Domain.Entities;

/// <summary>
/// Loan product setup snapshot that captures full configuration at a point in time.
/// </summary>
public class LoanSetup : BaseEntity
{
    public string ProductCode { get; private set; } = string.Empty;
    public string ProductName { get; private set; } = string.Empty;
    public decimal MinAmount { get; private set; }
    public decimal MaxAmount { get; private set; }
    public TenorUnit TenorUnit { get; private set; }
    public int[] TenorValues { get; private set; } = [];
    public bool IsSecuredLoan { get; private set; }

    // Scorecard reference
    public Guid? ScoreCardId { get; private set; }
    public string? ScoreCardName { get; private set; }

    // Workflow reference
    public Guid? WorkflowId { get; private set; }
    public string? WorkflowName { get; private set; }

    // Repayment plan reference
    public Guid? RepaymentPlanId { get; private set; }
    public string? RepaymentPlanName { get; private set; }

    // Scoring result snapshot
    public RiskGrade? RiskGrade { get; private set; }
    public decimal? TotalScore { get; private set; }

    // Disbursement
    public DisbursementType DisbursementType { get; private set; }
    public decimal? PartialInterestRate { get; private set; }

    // Bureau
    public string? BureauProvider { get; private set; }
    public string? BureauPurpose { get; private set; }
    public bool BureauCheckRequired { get; private set; }
    public bool BureauConsentRequired { get; private set; }

    // Custom EMI
    public string? CustomEmiTypeId { get; private set; }
    public string? CustomEmiTypeName { get; private set; }
    public string? CustomEmiPrincipalFormula { get; private set; }
    public string? CustomEmiInterestFormula { get; private set; }

    private readonly List<LoanSetupChannel> _channels = [];
    private readonly List<LoanSetupInterestPlan> _interestPlans = [];
    private readonly List<LoanSetupDocument> _documentRequirements = [];
    private readonly List<LoanSetupDisbursementDestination> _disbursementDestinations = [];

    public IReadOnlyList<LoanSetupChannel> Channels => _channels.AsReadOnly();
    public IReadOnlyList<LoanSetupInterestPlan> InterestPlans => _interestPlans.AsReadOnly();
    public IReadOnlyList<LoanSetupDocument> DocumentRequirements => _documentRequirements.AsReadOnly();
    public IReadOnlyList<LoanSetupDisbursementDestination> DisbursementDestinations => _disbursementDestinations.AsReadOnly();

    protected LoanSetup() { }

    public static LoanSetup Create(
        string productCode,
        string productName,
        decimal minAmount,
        decimal maxAmount,
        TenorUnit tenorUnit,
        int[] tenorValues,
        bool isSecuredLoan = false)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(productCode);
        ArgumentException.ThrowIfNullOrWhiteSpace(productName);

        return new LoanSetup
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ProductCode = productCode.Trim(),
            ProductName = productName.Trim(),
            MinAmount = Math.Max(0, minAmount),
            MaxAmount = Math.Max(0, maxAmount),
            TenorUnit = tenorUnit,
            TenorValues = tenorValues ?? [],
            IsSecuredLoan = isSecuredLoan,
            DisbursementType = DisbursementType.Full
        };
    }

    public void SetScorecardRef(Guid? scorecardId, string? scorecardName)
    {
        ScoreCardId = scorecardId;
        ScoreCardName = scorecardName?.Trim();
        SetUpdatedAt();
    }

    public void SetWorkflowRef(Guid? workflowId, string? workflowName)
    {
        WorkflowId = workflowId;
        WorkflowName = workflowName?.Trim();
        SetUpdatedAt();
    }

    public void SetRepaymentPlanRef(Guid? planId, string? planName)
    {
        RepaymentPlanId = planId;
        RepaymentPlanName = planName?.Trim();
        SetUpdatedAt();
    }

    public void SetRiskResult(RiskGrade? riskGrade, decimal? totalScore)
    {
        RiskGrade = riskGrade;
        TotalScore = totalScore;
        SetUpdatedAt();
    }

    public void SetDisbursement(DisbursementType type, decimal? partialInterestRate)
    {
        DisbursementType = type;
        PartialInterestRate = type == DisbursementType.Partial ? partialInterestRate : null;
        SetUpdatedAt();
    }

    public void SetBureau(string? provider, string? purpose, bool checkRequired, bool consentRequired)
    {
        BureauProvider = provider?.Trim();
        BureauPurpose = purpose?.Trim();
        BureauCheckRequired = checkRequired;
        BureauConsentRequired = consentRequired;
        SetUpdatedAt();
    }

    public void SetCustomEmi(string? typeId, string? typeName, string? principalFormula, string? interestFormula)
    {
        CustomEmiTypeId = typeId;
        CustomEmiTypeName = typeName;
        CustomEmiPrincipalFormula = principalFormula;
        CustomEmiInterestFormula = interestFormula;
        SetUpdatedAt();
    }

    public void SetChannels(IEnumerable<LoanSetupChannel> channels)
    {
        _channels.Clear();
        _channels.AddRange(channels);
        SetUpdatedAt();
    }

    public void SetInterestPlans(IEnumerable<LoanSetupInterestPlan> plans)
    {
        _interestPlans.Clear();
        _interestPlans.AddRange(plans);
        SetUpdatedAt();
    }

    public void SetDocumentRequirements(IEnumerable<LoanSetupDocument> documents)
    {
        _documentRequirements.Clear();
        _documentRequirements.AddRange(documents);
        SetUpdatedAt();
    }

    public void SetDisbursementDestinations(IEnumerable<LoanSetupDisbursementDestination> destinations)
    {
        _disbursementDestinations.Clear();
        _disbursementDestinations.AddRange(destinations);
        SetUpdatedAt();
    }
}

public class LoanSetupChannel : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public Guid LoanSetupId { get; set; }

    protected LoanSetupChannel() { }

    public static LoanSetupChannel Create(string name, string code, Guid loanSetupId) =>
        new() { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, Name = name.Trim(), Code = code.Trim(), LoanSetupId = loanSetupId };
}

public class LoanSetupInterestPlan : BaseEntity
{
    public InterestType InterestType { get; set; }
    public RateType RateType { get; set; }
    public decimal BaseRate { get; set; }
    public Guid LoanSetupId { get; set; }

    private readonly List<InterestRateParameter> _parameters = [];
    private readonly List<InterestRatePolicy> _policies = [];

    public IReadOnlyList<InterestRateParameter> Parameters => _parameters.AsReadOnly();
    public IReadOnlyList<InterestRatePolicy> Policies => _policies.AsReadOnly();

    protected LoanSetupInterestPlan() { }

    public static LoanSetupInterestPlan Create(InterestType interestType, RateType rateType, decimal baseRate, Guid loanSetupId) =>
        new() { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, InterestType = interestType, RateType = rateType, BaseRate = baseRate, LoanSetupId = loanSetupId };

    public void SetParameters(IEnumerable<InterestRateParameter> parameters)
    {
        _parameters.Clear();
        _parameters.AddRange(parameters);
    }

    public void SetPolicies(IEnumerable<InterestRatePolicy> policies)
    {
        _policies.Clear();
        _policies.AddRange(policies);
    }
}

public class InterestRateParameter : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public decimal Value { get; set; }
    public decimal InterestRate { get; set; }
    public Guid InterestPlanId { get; set; }

    protected InterestRateParameter() { }

    public static InterestRateParameter Create(string name, decimal value, decimal interestRate, Guid planId) =>
        new() { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, Name = name, Value = value, InterestRate = interestRate, InterestPlanId = planId };
}

public class InterestRatePolicy : BaseEntity
{
    public string InterestCategory { get; set; } = string.Empty;
    public decimal InterestRate { get; set; }
    public Guid InterestPlanId { get; set; }

    protected InterestRatePolicy() { }

    public static InterestRatePolicy Create(string category, decimal interestRate, Guid planId) =>
        new() { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, InterestCategory = category, InterestRate = interestRate, InterestPlanId = planId };
}

public class LoanSetupDocument : BaseEntity
{
    public string DocumentTypeId { get; set; } = string.Empty;
    public decimal MinAmount { get; set; }
    public decimal MaxAmount { get; set; }
    public string? EmploymentType { get; set; }
    public bool CollateralRequired { get; set; }
    public RiskGrade? RiskGrade { get; set; }
    public bool IsMandatory { get; set; } = true;
    public Guid LoanSetupId { get; set; }

    protected LoanSetupDocument() { }

    public static LoanSetupDocument Create(string documentTypeId, decimal minAmount, decimal maxAmount, Guid loanSetupId, RiskGrade? riskGrade = null, bool isMandatory = true) =>
        new()
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            DocumentTypeId = NormalizeDocTypeId(documentTypeId),
            MinAmount = Math.Max(0, minAmount),
            MaxAmount = Math.Max(0, maxAmount),
            RiskGrade = riskGrade,
            IsMandatory = isMandatory,
            LoanSetupId = loanSetupId
        };

    private static string NormalizeDocTypeId(string value)
    {
        var trimmed = value.Trim();
        return trimmed.StartsWith("DOC-", StringComparison.OrdinalIgnoreCase) ? trimmed.ToUpperInvariant() : $"DOC-{trimmed.ToUpperInvariant()}";
    }
}

public class LoanSetupDisbursementDestination : BaseEntity
{
    public DisbursementDestinationType DestinationType { get; set; }
    public Guid LoanSetupId { get; set; }

    protected LoanSetupDisbursementDestination() { }

    public static LoanSetupDisbursementDestination Create(DisbursementDestinationType type, Guid loanSetupId) =>
        new() { Id = Guid.NewGuid(), CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow, DestinationType = type, LoanSetupId = loanSetupId };
}
