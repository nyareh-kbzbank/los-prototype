using Los.Domain.Common;
using Los.Domain.Enums;

namespace Los.Domain.Entities;

/// <summary>
/// Repayment plan configuration for a loan product.
/// </summary>
public class RepaymentPlan : BaseEntity
{
    public string PlanCode { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public RepaymentMethod Method { get; private set; }
    public RepaymentFrequency Frequency { get; private set; }
    public int? DueDayOfMonth { get; private set; }
    public int FirstDueAfterDays { get; private set; }
    public int GracePeriodDays { get; private set; }
    public decimal LateFeeFlat { get; private set; }
    public decimal LateFeePct { get; private set; }
    public decimal PrepaymentPenaltyPct { get; private set; }
    public bool AutopayRequired { get; private set; }
    public decimal RoundingStep { get; private set; }
    public decimal? MinInstallmentAmount { get; private set; }

    protected RepaymentPlan() { }

    public static RepaymentPlan Create(
        string name,
        RepaymentMethod method,
        RepaymentFrequency frequency,
        string? planCode = null,
        string? description = null,
        int? dueDayOfMonth = null,
        int firstDueAfterDays = 30,
        int gracePeriodDays = 5,
        decimal lateFeeFlat = 0,
        decimal lateFeePct = 0,
        decimal prepaymentPenaltyPct = 0,
        bool autopayRequired = false,
        decimal roundingStep = 100,
        decimal? minInstallmentAmount = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        return new RepaymentPlan
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Name = name.Trim(),
            PlanCode = planCode?.Trim() ?? $"PLAN-{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
            Description = description?.Trim(),
            Method = method,
            Frequency = frequency,
            DueDayOfMonth = dueDayOfMonth.HasValue ? Math.Clamp(dueDayOfMonth.Value, 1, 28) : null,
            FirstDueAfterDays = Math.Max(0, firstDueAfterDays),
            GracePeriodDays = Math.Max(0, gracePeriodDays),
            LateFeeFlat = Math.Max(0, lateFeeFlat),
            LateFeePct = Math.Max(0, lateFeePct),
            PrepaymentPenaltyPct = Math.Max(0, prepaymentPenaltyPct),
            AutopayRequired = autopayRequired,
            RoundingStep = Math.Max(1, roundingStep),
            MinInstallmentAmount = minInstallmentAmount
        };
    }

    public void Update(
        string name,
        RepaymentMethod method,
        RepaymentFrequency frequency,
        string? description = null,
        int? dueDayOfMonth = null,
        int firstDueAfterDays = 30,
        int gracePeriodDays = 5,
        decimal lateFeeFlat = 0,
        decimal lateFeePct = 0,
        decimal prepaymentPenaltyPct = 0,
        bool autopayRequired = false,
        decimal roundingStep = 100,
        decimal? minInstallmentAmount = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        Name = name.Trim();
        Description = description?.Trim();
        Method = method;
        Frequency = frequency;
        DueDayOfMonth = dueDayOfMonth.HasValue ? Math.Clamp(dueDayOfMonth.Value, 1, 28) : null;
        FirstDueAfterDays = Math.Max(0, firstDueAfterDays);
        GracePeriodDays = Math.Max(0, gracePeriodDays);
        LateFeeFlat = Math.Max(0, lateFeeFlat);
        LateFeePct = Math.Max(0, lateFeePct);
        PrepaymentPenaltyPct = Math.Max(0, prepaymentPenaltyPct);
        AutopayRequired = autopayRequired;
        RoundingStep = Math.Max(1, roundingStep);
        MinInstallmentAmount = minInstallmentAmount;
        SetUpdatedAt();
    }
}
