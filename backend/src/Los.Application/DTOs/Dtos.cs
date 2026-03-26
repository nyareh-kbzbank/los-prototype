using Los.Domain.Enums;

namespace Los.Application.DTOs;

// ─── Workflow DTOs ────────────────────────────────────────────────────────────

public record WorkflowDto(
    Guid Id,
    string Name,
    string? SourceInstanceId,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    IReadOnlyList<WorkflowNodeDto> Nodes,
    IReadOnlyList<WorkflowEdgeDto> Edges);

public record WorkflowSummaryDto(
    Guid Id,
    string Name,
    DateTime CreatedAt,
    int NodeCount,
    int EdgeCount);

public record WorkflowNodeDto(
    string NodeId,
    string Label,
    WorkflowNodeType Type,
    string? Input);

public record WorkflowEdgeDto(
    string EdgeId,
    string SourceNodeId,
    string TargetNodeId,
    string? Condition,
    string? Input);

// ─── ScoreCard DTOs ───────────────────────────────────────────────────────────

public record ScoreCardDto(
    Guid Id,
    string ScorecardCode,
    string Name,
    int MaxScore,
    DateTime CreatedAt,
    IReadOnlyList<ScoreCardFieldDto> Fields);

public record ScoreCardSummaryDto(
    Guid Id,
    string ScorecardCode,
    string Name,
    int MaxScore,
    int FieldCount);

public record ScoreCardFieldDto(
    string Field,
    string Description,
    IReadOnlyList<ScorecardRuleDto> Rules);

public record ScorecardRuleDto(
    ScorecardOperator Operator,
    string Value,
    int Score);

public record ScoreEvaluationResultDto(
    int MaxScore,
    int TotalScore,
    int MatchedRules,
    string RiskGrade,
    IReadOnlyList<RuleBreakdownDto> Breakdown);

public record ScoreEvaluationAdvancedResultDto(
    int MaxScore,
    int TotalScore,
    int MatchedRules,
    string RiskGrade,
    IReadOnlyList<RuleBreakdownDto> Breakdown,
    EclDto? Ecl);

public record RuleBreakdownDto(
    string Field,
    string FieldDescription,
    string Operator,
    string RuleValue,
    int Score,
    bool Matched,
    string? ActualValue,
    bool SkippedBecauseMissingInput);

public record EclDto(double Pd, double Lgd, double Ead, double DiscountFactor, double ExpectedCreditLoss);

// ─── Repayment Plan DTOs ──────────────────────────────────────────────────────

public record RepaymentPlanDto(
    Guid Id,
    string PlanCode,
    string Name,
    string? Description,
    string Method,
    string Frequency,
    int? DueDayOfMonth,
    int FirstDueAfterDays,
    int GracePeriodDays,
    decimal LateFeeFlat,
    decimal LateFeePct,
    decimal PrepaymentPenaltyPct,
    bool AutopayRequired,
    decimal RoundingStep,
    decimal? MinInstallmentAmount,
    DateTime CreatedAt);

// ─── Loan Setup DTOs ──────────────────────────────────────────────────────────

public record LoanSetupDto(
    Guid Id,
    string ProductCode,
    string ProductName,
    decimal MinAmount,
    decimal MaxAmount,
    string TenorUnit,
    int[] TenorValues,
    bool IsSecuredLoan,
    Guid? ScoreCardId,
    string? ScoreCardName,
    Guid? WorkflowId,
    string? WorkflowName,
    Guid? RepaymentPlanId,
    string? RepaymentPlanName,
    string? RiskGrade,
    decimal? TotalScore,
    string DisbursementType,
    decimal? PartialInterestRate,
    string? BureauProvider,
    string? BureauPurpose,
    bool BureauCheckRequired,
    bool BureauConsentRequired,
    string? CustomEmiPrincipalFormula,
    string? CustomEmiInterestFormula,
    IReadOnlyList<LoanSetupChannelDto> Channels,
    IReadOnlyList<LoanSetupInterestPlanDto> InterestPlans,
    IReadOnlyList<LoanSetupDocumentDto> DocumentRequirements,
    IReadOnlyList<string> DisbursementDestinations,
    DateTime CreatedAt);

public record LoanSetupChannelDto(string Name, string Code);

public record LoanSetupInterestPlanDto(
    string InterestType,
    string RateType,
    decimal BaseRate,
    IReadOnlyList<InterestRateParameterDto> Parameters,
    IReadOnlyList<InterestRatePolicyDto> Policies);

public record InterestRateParameterDto(string Name, decimal Value, decimal InterestRate);
public record InterestRatePolicyDto(string InterestCategory, decimal InterestRate);

public record LoanSetupDocumentDto(
    string DocumentTypeId,
    decimal MinAmount,
    decimal MaxAmount,
    string? EmploymentType,
    bool CollateralRequired,
    string? RiskGrade,
    bool IsMandatory);

// ─── Loan Application DTOs ────────────────────────────────────────────────────

public record LoanApplicationDto(
    Guid Id,
    string ApplicationNo,
    string Status,
    string BeneficiaryName,
    string NationalId,
    string Gender,
    string MaritalStatus,
    string Education,
    string Phone,
    string BankAccountNo,
    string KpayPhoneNo,
    int? Age,
    decimal? MonthlyIncome,
    decimal? DebtToIncomeRatio,
    decimal RequestedAmount,
    int? TenureValue,
    string? TenureUnit,
    string ChannelCode,
    string DestinationType,
    string Notes,
    Guid SetupId,
    string ProductCode,
    string? ProductName,
    decimal? CreditScore,
    decimal? CreditMax,
    Guid? WorkflowId,
    string? WorkflowName,
    int WorkflowStageIndex,
    string BureauProvider,
    string BureauPurpose,
    bool BureauConsent,
    string BureauReference,
    DateTime? BureauRequestedAt,
    IReadOnlyList<ApplicationWorkflowEventDto> WorkflowHistory,
    IReadOnlyList<ApplicationDecisionEventDto> DecisionHistory,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public record ApplicationWorkflowEventDto(
    int StageIndex,
    string StageId,
    string StageLabel,
    DateTime OccurredAt);

public record ApplicationDecisionEventDto(
    string Actor,
    string? FromStatus,
    string ToStatus,
    string Note,
    DateTime OccurredAt);
