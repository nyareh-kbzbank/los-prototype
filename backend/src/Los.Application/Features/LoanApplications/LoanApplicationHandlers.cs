using Los.Application.Common;
using Los.Application.DTOs;
using Los.Domain.Entities;
using Los.Domain.Enums;
using Los.Domain.Interfaces;
using MediatR;

namespace Los.Application.Features.LoanApplications;

// ─── Queries ──────────────────────────────────────────────────────────────────

public record GetLoanApplicationsQuery(LoanApplicationStatus? Status = null)
    : IRequest<Result<IReadOnlyList<LoanApplicationDto>>>;

public class GetLoanApplicationsHandler(ILoanApplicationRepository repo)
    : IRequestHandler<GetLoanApplicationsQuery, Result<IReadOnlyList<LoanApplicationDto>>>
{
    public async Task<Result<IReadOnlyList<LoanApplicationDto>>> Handle(GetLoanApplicationsQuery request, CancellationToken ct)
    {
        var apps = request.Status.HasValue
            ? await repo.GetByStatusAsync(request.Status.Value, ct)
            : await repo.GetAllOrderedAsync(ct);

        return Result<IReadOnlyList<LoanApplicationDto>>.Success(apps.Select(MapToDto).ToList());
    }

    internal static LoanApplicationDto MapToDto(LoanApplication a) => new(
        a.Id, a.ApplicationNo, ToSnakeUpper(a.Status.ToString()),
        a.BeneficiaryName, a.NationalId, a.Gender, a.MaritalStatus, a.Education,
        a.Phone, a.BankAccountNo, a.KpayPhoneNo, a.Age, a.MonthlyIncome, a.DebtToIncomeRatio,
        a.RequestedAmount, a.TenureValue, a.TenureUnit?.ToString().ToUpperInvariant(),
        a.ChannelCode, a.DestinationType.ToString().ToUpperInvariant(),
        a.Notes, a.SetupId, a.ProductCode, a.ProductName,
        a.CreditScore, a.CreditMax,
        a.WorkflowId, a.WorkflowName, a.WorkflowStageIndex,
        a.BureauProvider, a.BureauPurpose, a.BureauConsent, a.BureauReference, a.BureauRequestedAt,
        a.WorkflowHistory.Select(e => new ApplicationWorkflowEventDto(e.StageIndex, e.StageId, e.StageLabel, e.OccurredAt)).ToList(),
        a.DecisionHistory.Select(e => new ApplicationDecisionEventDto(
            ToSnakeUpper(e.Actor.ToString()),
            e.FromStatus.HasValue ? ToSnakeUpper(e.FromStatus.Value.ToString()) : null,
            ToSnakeUpper(e.ToStatus.ToString()), e.Note, e.OccurredAt)).ToList(),
        a.CreatedAt, a.UpdatedAt);

    private static string ToSnakeUpper(string name) =>
        System.Text.RegularExpressions.Regex.Replace(name, "([A-Z])", "_$1").TrimStart('_').ToUpperInvariant();
}

public record GetLoanApplicationByIdQuery(Guid Id) : IRequest<Result<LoanApplicationDto>>;

public class GetLoanApplicationByIdHandler(ILoanApplicationRepository repo)
    : IRequestHandler<GetLoanApplicationByIdQuery, Result<LoanApplicationDto>>
{
    public async Task<Result<LoanApplicationDto>> Handle(GetLoanApplicationByIdQuery request, CancellationToken ct)
    {
        var app = await repo.GetWithHistoryAsync(request.Id, ct);
        if (app is null) return Result<LoanApplicationDto>.Failure("Application not found.");
        return Result<LoanApplicationDto>.Success(GetLoanApplicationsHandler.MapToDto(app));
    }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

public record CreateLoanApplicationCommand(
    Guid SetupId,
    string ProductCode,
    string BeneficiaryName,
    string NationalId,
    string Phone,
    decimal RequestedAmount,
    string ChannelCode,
    DisbursementDestinationType DestinationType,
    string BureauProvider,
    string BureauPurpose,
    bool BureauConsent,
    LoanApplicationStatus? InitialStatus = null,
    string? ProductName = null,
    string? Gender = null,
    string? MaritalStatus = null,
    string? Education = null,
    string? BankAccountNo = null,
    string? KpayPhoneNo = null,
    int? Age = null,
    decimal? MonthlyIncome = null,
    decimal? DebtToIncomeRatio = null,
    int? TenureValue = null,
    TenorUnit? TenureUnit = null,
    string? Notes = null,
    decimal? CreditScore = null,
    decimal? CreditMax = null,
    Guid? WorkflowId = null,
    string? WorkflowName = null,
    string? BureauReference = null,
    DateTime? BureauRequestedAt = null) : IRequest<Result<LoanApplicationDto>>;

public class CreateLoanApplicationHandler(ILoanApplicationRepository repo)
    : IRequestHandler<CreateLoanApplicationCommand, Result<LoanApplicationDto>>
{
    public async Task<Result<LoanApplicationDto>> Handle(CreateLoanApplicationCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.BeneficiaryName))
            return Result<LoanApplicationDto>.Failure("Beneficiary name is required.");
        if (string.IsNullOrWhiteSpace(cmd.NationalId))
            return Result<LoanApplicationDto>.Failure("National ID is required.");

        var app = LoanApplication.Create(
            cmd.SetupId, cmd.ProductCode, cmd.BeneficiaryName, cmd.NationalId,
            cmd.Phone, cmd.RequestedAmount, cmd.ChannelCode, cmd.DestinationType,
            cmd.BureauProvider, cmd.BureauPurpose, cmd.BureauConsent,
            cmd.InitialStatus ?? LoanApplicationStatus.Draft,
            cmd.ProductName, cmd.Gender, cmd.MaritalStatus, cmd.Education,
            cmd.BankAccountNo, cmd.KpayPhoneNo, cmd.Age, cmd.MonthlyIncome,
            cmd.DebtToIncomeRatio, cmd.TenureValue, cmd.TenureUnit,
            cmd.Notes, cmd.CreditScore, cmd.CreditMax,
            cmd.WorkflowId, cmd.WorkflowName,
            cmd.BureauReference, cmd.BureauRequestedAt);

        await repo.AddAsync(app, ct);
        await repo.SaveChangesAsync(ct);
        return Result<LoanApplicationDto>.Success(GetLoanApplicationsHandler.MapToDto(app));
    }
}

/// <summary>Update the status of a loan application (maker/checker decisions).</summary>
public record UpdateLoanApplicationStatusCommand(
    Guid Id,
    LoanApplicationStatus NewStatus) : IRequest<Result<LoanApplicationDto>>;

public class UpdateLoanApplicationStatusHandler(ILoanApplicationRepository repo)
    : IRequestHandler<UpdateLoanApplicationStatusCommand, Result<LoanApplicationDto>>
{
    public async Task<Result<LoanApplicationDto>> Handle(UpdateLoanApplicationStatusCommand cmd, CancellationToken ct)
    {
        var app = await repo.GetWithHistoryAsync(cmd.Id, ct);
        if (app is null) return Result<LoanApplicationDto>.Failure("Application not found.");

        app.UpdateStatus(cmd.NewStatus);
        repo.Update(app);
        await repo.SaveChangesAsync(ct);
        return Result<LoanApplicationDto>.Success(GetLoanApplicationsHandler.MapToDto(app));
    }
}

/// <summary>Advance the workflow stage for an application.</summary>
public record AdvanceWorkflowStageCommand(
    Guid Id,
    int StageIndex,
    string StageId,
    string StageLabel) : IRequest<Result<LoanApplicationDto>>;

public class AdvanceWorkflowStageHandler(ILoanApplicationRepository repo)
    : IRequestHandler<AdvanceWorkflowStageCommand, Result<LoanApplicationDto>>
{
    public async Task<Result<LoanApplicationDto>> Handle(AdvanceWorkflowStageCommand cmd, CancellationToken ct)
    {
        var app = await repo.GetWithHistoryAsync(cmd.Id, ct);
        if (app is null) return Result<LoanApplicationDto>.Failure("Application not found.");

        app.AdvanceWorkflowStage(cmd.StageIndex, cmd.StageId, cmd.StageLabel);
        repo.Update(app);
        await repo.SaveChangesAsync(ct);
        return Result<LoanApplicationDto>.Success(GetLoanApplicationsHandler.MapToDto(app));
    }
}

/// <summary>Reset workflow progress for an application.</summary>
public record ResetWorkflowProgressCommand(Guid Id) : IRequest<Result<LoanApplicationDto>>;

public class ResetWorkflowProgressHandler(ILoanApplicationRepository repo)
    : IRequestHandler<ResetWorkflowProgressCommand, Result<LoanApplicationDto>>
{
    public async Task<Result<LoanApplicationDto>> Handle(ResetWorkflowProgressCommand cmd, CancellationToken ct)
    {
        var app = await repo.GetWithHistoryAsync(cmd.Id, ct);
        if (app is null) return Result<LoanApplicationDto>.Failure("Application not found.");

        app.ResetWorkflowProgress();
        repo.Update(app);
        await repo.SaveChangesAsync(ct);
        return Result<LoanApplicationDto>.Success(GetLoanApplicationsHandler.MapToDto(app));
    }
}
