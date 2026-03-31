using Los.Application.Common;
using Los.Application.DTOs;
using Los.Domain.Entities;
using Los.Domain.Enums;
using Los.Domain.Interfaces;
using MediatR;

namespace Los.Application.Features.RepaymentPlans;

// ─── Queries ──────────────────────────────────────────────────────────────────

public record GetRepaymentPlansQuery : IRequest<Result<IReadOnlyList<RepaymentPlanDto>>>;

public class GetRepaymentPlansHandler(IRepaymentPlanRepository repo)
    : IRequestHandler<GetRepaymentPlansQuery, Result<IReadOnlyList<RepaymentPlanDto>>>
{
    public async Task<Result<IReadOnlyList<RepaymentPlanDto>>> Handle(GetRepaymentPlansQuery request, CancellationToken ct)
    {
        var plans = await repo.GetAllOrderedAsync(ct);
        return Result<IReadOnlyList<RepaymentPlanDto>>.Success(plans.Select(MapToDto).ToList());
    }

    internal static RepaymentPlanDto MapToDto(RepaymentPlan p) => new(
        p.Id, p.PlanCode, p.Name, p.Description,
        p.Method.ToString().ToUpperInvariant(),
        p.Frequency.ToString().ToUpperInvariant(),
        p.DueDayOfMonth, p.FirstDueAfterDays, p.GracePeriodDays,
        p.LateFeeFlat, p.LateFeePct, p.PrepaymentPenaltyPct,
        p.AutopayRequired, p.RoundingStep, p.MinInstallmentAmount, p.CreatedAt);
}

public record GetRepaymentPlanByIdQuery(Guid Id) : IRequest<Result<RepaymentPlanDto>>;

public class GetRepaymentPlanByIdHandler(IRepaymentPlanRepository repo)
    : IRequestHandler<GetRepaymentPlanByIdQuery, Result<RepaymentPlanDto>>
{
    public async Task<Result<RepaymentPlanDto>> Handle(GetRepaymentPlanByIdQuery request, CancellationToken ct)
    {
        var plan = await repo.GetByIdAsync(request.Id, ct);
        if (plan is null) return Result<RepaymentPlanDto>.Failure("Repayment plan not found.");
        return Result<RepaymentPlanDto>.Success(GetRepaymentPlansHandler.MapToDto(plan));
    }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

public record CreateRepaymentPlanCommand(
    string Name,
    RepaymentMethod Method,
    RepaymentFrequency Frequency,
    string? PlanCode = null,
    string? Description = null,
    int? DueDayOfMonth = null,
    int FirstDueAfterDays = 30,
    int GracePeriodDays = 5,
    decimal LateFeeFlat = 0,
    decimal LateFeePct = 0,
    decimal PrepaymentPenaltyPct = 0,
    bool AutopayRequired = false,
    decimal RoundingStep = 100,
    decimal? MinInstallmentAmount = null) : IRequest<Result<RepaymentPlanDto>>;

public class CreateRepaymentPlanHandler(IRepaymentPlanRepository repo)
    : IRequestHandler<CreateRepaymentPlanCommand, Result<RepaymentPlanDto>>
{
    public async Task<Result<RepaymentPlanDto>> Handle(CreateRepaymentPlanCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Name))
            return Result<RepaymentPlanDto>.Failure("Plan name is required.");

        var plan = RepaymentPlan.Create(
            cmd.Name, cmd.Method, cmd.Frequency, cmd.PlanCode, cmd.Description,
            cmd.DueDayOfMonth, cmd.FirstDueAfterDays, cmd.GracePeriodDays,
            cmd.LateFeeFlat, cmd.LateFeePct, cmd.PrepaymentPenaltyPct,
            cmd.AutopayRequired, cmd.RoundingStep, cmd.MinInstallmentAmount);

        await repo.AddAsync(plan, ct);
        await repo.SaveChangesAsync(ct);
        return Result<RepaymentPlanDto>.Success(GetRepaymentPlansHandler.MapToDto(plan));
    }
}

public record UpdateRepaymentPlanCommand(
    Guid Id,
    string Name,
    RepaymentMethod Method,
    RepaymentFrequency Frequency,
    string? Description = null,
    int? DueDayOfMonth = null,
    int FirstDueAfterDays = 30,
    int GracePeriodDays = 5,
    decimal LateFeeFlat = 0,
    decimal LateFeePct = 0,
    decimal PrepaymentPenaltyPct = 0,
    bool AutopayRequired = false,
    decimal RoundingStep = 100,
    decimal? MinInstallmentAmount = null) : IRequest<Result<RepaymentPlanDto>>;

public class UpdateRepaymentPlanHandler(IRepaymentPlanRepository repo)
    : IRequestHandler<UpdateRepaymentPlanCommand, Result<RepaymentPlanDto>>
{
    public async Task<Result<RepaymentPlanDto>> Handle(UpdateRepaymentPlanCommand cmd, CancellationToken ct)
    {
        var plan = await repo.GetByIdAsync(cmd.Id, ct);
        if (plan is null) return Result<RepaymentPlanDto>.Failure("Repayment plan not found.");

        plan.Update(cmd.Name, cmd.Method, cmd.Frequency, cmd.Description,
            cmd.DueDayOfMonth, cmd.FirstDueAfterDays, cmd.GracePeriodDays,
            cmd.LateFeeFlat, cmd.LateFeePct, cmd.PrepaymentPenaltyPct,
            cmd.AutopayRequired, cmd.RoundingStep, cmd.MinInstallmentAmount);

        repo.Update(plan);
        await repo.SaveChangesAsync(ct);
        return Result<RepaymentPlanDto>.Success(GetRepaymentPlansHandler.MapToDto(plan));
    }
}

public record DeleteRepaymentPlanCommand(Guid Id) : IRequest<Result>;

public class DeleteRepaymentPlanHandler(IRepaymentPlanRepository repo)
    : IRequestHandler<DeleteRepaymentPlanCommand, Result>
{
    public async Task<Result> Handle(DeleteRepaymentPlanCommand cmd, CancellationToken ct)
    {
        var plan = await repo.GetByIdAsync(cmd.Id, ct);
        if (plan is null) return Result.Failure("Repayment plan not found.");
        repo.Remove(plan);
        await repo.SaveChangesAsync(ct);
        return Result.Success();
    }
}
