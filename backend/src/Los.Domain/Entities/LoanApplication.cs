using Los.Domain.Common;
using Los.Domain.Enums;

namespace Los.Domain.Entities;

/// <summary>
/// Loan application entity representing a borrower's request for a loan.
/// </summary>
public class LoanApplication : BaseEntity
{
    public string ApplicationNo { get; private set; } = string.Empty;
    public LoanApplicationStatus Status { get; private set; }

    // Applicant
    public string BeneficiaryName { get; private set; } = string.Empty;
    public string NationalId { get; private set; } = string.Empty;
    public string Gender { get; private set; } = string.Empty;
    public string MaritalStatus { get; private set; } = string.Empty;
    public string Education { get; private set; } = string.Empty;
    public string Phone { get; private set; } = string.Empty;
    public string BankAccountNo { get; private set; } = string.Empty;
    public string KpayPhoneNo { get; private set; } = string.Empty;
    public int? Age { get; private set; }
    public decimal? MonthlyIncome { get; private set; }
    public decimal? DebtToIncomeRatio { get; private set; }

    // Loan
    public decimal RequestedAmount { get; private set; }
    public int? TenureValue { get; private set; }
    public TenorUnit? TenureUnit { get; private set; }
    public string ChannelCode { get; private set; } = string.Empty;
    public DisbursementDestinationType DestinationType { get; private set; }
    public string Notes { get; private set; } = string.Empty;

    // Product / Setup references
    public Guid SetupId { get; private set; }
    public string ProductCode { get; private set; } = string.Empty;
    public string? ProductName { get; private set; }

    // Scoring
    public decimal? CreditScore { get; private set; }
    public decimal? CreditMax { get; private set; }

    // Workflow
    public Guid? WorkflowId { get; private set; }
    public string? WorkflowName { get; private set; }
    public int WorkflowStageIndex { get; private set; } = -1;

    // Bureau
    public string BureauProvider { get; private set; } = string.Empty;
    public string BureauPurpose { get; private set; } = string.Empty;
    public bool BureauConsent { get; private set; }
    public string BureauReference { get; private set; } = string.Empty;
    public DateTime? BureauRequestedAt { get; private set; }

    private readonly List<ApplicationWorkflowEvent> _workflowHistory = [];
    private readonly List<ApplicationDecisionEvent> _decisionHistory = [];

    public IReadOnlyList<ApplicationWorkflowEvent> WorkflowHistory => _workflowHistory.AsReadOnly();
    public IReadOnlyList<ApplicationDecisionEvent> DecisionHistory => _decisionHistory.AsReadOnly();

    protected LoanApplication() { }

    public static LoanApplication Create(
        Guid setupId,
        string productCode,
        string beneficiaryName,
        string nationalId,
        string phone,
        decimal requestedAmount,
        string channelCode,
        DisbursementDestinationType destinationType,
        string bureauProvider,
        string bureauPurpose,
        bool bureauConsent,
        LoanApplicationStatus initialStatus = LoanApplicationStatus.Draft,
        string? productName = null,
        string? gender = null,
        string? maritalStatus = null,
        string? education = null,
        string? bankAccountNo = null,
        string? kpayPhoneNo = null,
        int? age = null,
        decimal? monthlyIncome = null,
        decimal? debtToIncomeRatio = null,
        int? tenureValue = null,
        TenorUnit? tenureUnit = null,
        string? notes = null,
        decimal? creditScore = null,
        decimal? creditMax = null,
        Guid? workflowId = null,
        string? workflowName = null,
        string? bureauReference = null,
        DateTime? bureauRequestedAt = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(beneficiaryName);
        ArgumentException.ThrowIfNullOrWhiteSpace(nationalId);
        ArgumentException.ThrowIfNullOrWhiteSpace(phone);
        ArgumentException.ThrowIfNullOrWhiteSpace(productCode);

        var now = DateTime.UtcNow;
        var app = new LoanApplication
        {
            Id = Guid.NewGuid(),
            CreatedAt = now,
            UpdatedAt = now,
            SetupId = setupId,
            ProductCode = productCode.Trim(),
            ProductName = productName?.Trim(),
            ApplicationNo = GenerateApplicationNo(productCode),
            Status = initialStatus,
            BeneficiaryName = beneficiaryName.Trim(),
            NationalId = nationalId.Trim(),
            Gender = gender?.Trim() ?? string.Empty,
            MaritalStatus = maritalStatus?.Trim() ?? string.Empty,
            Education = education?.Trim() ?? string.Empty,
            Phone = phone.Trim(),
            BankAccountNo = bankAccountNo?.Trim() ?? string.Empty,
            KpayPhoneNo = kpayPhoneNo?.Trim() ?? string.Empty,
            Age = age.HasValue ? Math.Max(0, age.Value) : null,
            MonthlyIncome = monthlyIncome.HasValue ? Math.Max(0, monthlyIncome.Value) : null,
            DebtToIncomeRatio = debtToIncomeRatio.HasValue ? Math.Max(0, debtToIncomeRatio.Value) : null,
            RequestedAmount = Math.Max(0, requestedAmount),
            TenureValue = tenureValue,
            TenureUnit = tenureUnit,
            ChannelCode = channelCode.Trim(),
            DestinationType = destinationType,
            Notes = notes?.Trim() ?? string.Empty,
            CreditScore = creditScore,
            CreditMax = creditMax,
            WorkflowId = workflowId,
            WorkflowName = workflowName?.Trim(),
            BureauProvider = bureauProvider.Trim().Length > 0 ? bureauProvider.Trim() : "Unknown",
            BureauPurpose = bureauPurpose.Trim(),
            BureauConsent = bureauConsent,
            BureauReference = bureauReference?.Trim() ?? string.Empty,
            BureauRequestedAt = bureauRequestedAt
        };

        if (initialStatus == LoanApplicationStatus.Submitted)
        {
            app._decisionHistory.Add(ApplicationDecisionEvent.Create(
                ApplicationDecisionActor.System, null, LoanApplicationStatus.Submitted, "Entered maker inbox", now));
        }

        return app;
    }

    /// <summary>
    /// Transitions the application to a new status and records a decision event.
    /// </summary>
    public void UpdateStatus(LoanApplicationStatus newStatus)
    {
        if (Status == newStatus) return;

        var now = DateTime.UtcNow;
        var decisionEvent = BuildDecisionEvent(Status, newStatus, now);
        if (decisionEvent is not null)
            _decisionHistory.Add(decisionEvent);

        Status = newStatus;
        SetUpdatedAt();
    }

    /// <summary>
    /// Advances the workflow stage index and records the stage event.
    /// </summary>
    public void AdvanceWorkflowStage(int stageIndex, string stageId, string stageLabel)
    {
        if (stageIndex <= WorkflowStageIndex) return;

        _workflowHistory.Add(ApplicationWorkflowEvent.Create(stageIndex, stageId, stageLabel, DateTime.UtcNow));
        WorkflowStageIndex = stageIndex;
        SetUpdatedAt();
    }

    /// <summary>Resets workflow progress back to initial state.</summary>
    public void ResetWorkflowProgress()
    {
        _workflowHistory.Clear();
        WorkflowStageIndex = -1;
        SetUpdatedAt();
    }

    public bool IsAutoApproved =>
        Status == LoanApplicationStatus.Approved && _decisionHistory.Count == 0;

    public bool IsAutoRejected =>
        Status == LoanApplicationStatus.Rejected && _decisionHistory.Count == 0;

    private static ApplicationDecisionEvent? BuildDecisionEvent(
        LoanApplicationStatus from,
        LoanApplicationStatus to,
        DateTime occurredAt)
    {
        return (from, to) switch
        {
            (LoanApplicationStatus.Submitted, LoanApplicationStatus.CheckerPending) =>
                ApplicationDecisionEvent.Create(ApplicationDecisionActor.Maker, from, to, "Submitted to checker", occurredAt),
            (LoanApplicationStatus.Submitted, LoanApplicationStatus.Approved) =>
                ApplicationDecisionEvent.Create(ApplicationDecisionActor.Maker, from, to, "Approved by maker", occurredAt),
            (LoanApplicationStatus.Submitted, LoanApplicationStatus.Rejected) =>
                ApplicationDecisionEvent.Create(ApplicationDecisionActor.Maker, from, to, "Rejected by maker", occurredAt),
            (LoanApplicationStatus.CheckerPending, LoanApplicationStatus.Approved) =>
                ApplicationDecisionEvent.Create(ApplicationDecisionActor.Checker, from, to, "Approved by checker", occurredAt),
            (LoanApplicationStatus.CheckerPending, LoanApplicationStatus.Rejected) =>
                ApplicationDecisionEvent.Create(ApplicationDecisionActor.Checker, from, to, "Rejected by checker", occurredAt),
            (LoanApplicationStatus.CheckerPending, LoanApplicationStatus.Submitted) =>
                ApplicationDecisionEvent.Create(ApplicationDecisionActor.Checker, from, to, "Returned to maker", occurredAt),
            (_, LoanApplicationStatus.Submitted) =>
                ApplicationDecisionEvent.Create(ApplicationDecisionActor.System, from, to, "Entered maker inbox", occurredAt),
            _ => null
        };
    }

    private static string GenerateApplicationNo(string productCode)
    {
        var prefix = productCode.Trim().Length > 0 ? productCode.Trim() : "APP";
        var ticks = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var suffix = ConvertToBase36(ticks).ToUpperInvariant();
        return $"{prefix}-{suffix}";
    }

    private static string ConvertToBase36(long value)
    {
        const string chars = "0123456789abcdefghijklmnopqrstuvwxyz";
        if (value == 0) return "0";
        var sb = new System.Text.StringBuilder();
        while (value > 0)
        {
            sb.Insert(0, chars[(int)(value % 36)]);
            value /= 36;
        }
        return sb.ToString();
    }
}

public class ApplicationWorkflowEvent : BaseEntity
{
    public int StageIndex { get; private set; }
    public string StageId { get; private set; } = string.Empty;
    public string StageLabel { get; private set; } = string.Empty;
    public DateTime OccurredAt { get; private set; }
    public Guid LoanApplicationId { get; set; }

    protected ApplicationWorkflowEvent() { }

    internal static ApplicationWorkflowEvent Create(int stageIndex, string stageId, string stageLabel, DateTime occurredAt) =>
        new()
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            StageIndex = stageIndex,
            StageId = stageId,
            StageLabel = stageLabel,
            OccurredAt = occurredAt
        };
}

public class ApplicationDecisionEvent : BaseEntity
{
    public ApplicationDecisionActor Actor { get; private set; }
    public LoanApplicationStatus? FromStatus { get; private set; }
    public LoanApplicationStatus ToStatus { get; private set; }
    public string Note { get; private set; } = string.Empty;
    public DateTime OccurredAt { get; private set; }
    public Guid LoanApplicationId { get; set; }

    protected ApplicationDecisionEvent() { }

    internal static ApplicationDecisionEvent Create(
        ApplicationDecisionActor actor,
        LoanApplicationStatus? fromStatus,
        LoanApplicationStatus toStatus,
        string note,
        DateTime occurredAt) =>
        new()
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Actor = actor,
            FromStatus = fromStatus,
            ToStatus = toStatus,
            Note = note,
            OccurredAt = occurredAt
        };
}
