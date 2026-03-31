using Los.Application.Common;
using Los.Application.DTOs;
using Los.Domain.Entities;
using Los.Domain.Enums;
using Los.Domain.Interfaces;
using MediatR;

namespace Los.Application.Features.LoanSetups;

// ─── Queries ──────────────────────────────────────────────────────────────────

public record GetLoanSetupsQuery : IRequest<Result<IReadOnlyList<LoanSetupDto>>>;

public class GetLoanSetupsHandler(ILoanSetupRepository repo)
    : IRequestHandler<GetLoanSetupsQuery, Result<IReadOnlyList<LoanSetupDto>>>
{
    public async Task<Result<IReadOnlyList<LoanSetupDto>>> Handle(GetLoanSetupsQuery request, CancellationToken ct)
    {
        var setups = await repo.GetAllWithDetailsAsync(ct);
        return Result<IReadOnlyList<LoanSetupDto>>.Success(setups.Select(MapToDto).ToList());
    }

    internal static LoanSetupDto MapToDto(LoanSetup s) => new(
        s.Id, s.ProductCode, s.ProductName, s.MinAmount, s.MaxAmount,
        s.TenorUnit.ToString().ToUpperInvariant(),
        s.TenorValues,
        s.IsSecuredLoan,
        s.ScoreCardId, s.ScoreCardName,
        s.WorkflowId, s.WorkflowName,
        s.RepaymentPlanId, s.RepaymentPlanName,
        s.RiskGrade?.ToString().ToUpperInvariant(),
        s.TotalScore,
        s.DisbursementType.ToString().ToUpperInvariant(),
        s.PartialInterestRate,
        s.BureauProvider, s.BureauPurpose,
        s.BureauCheckRequired, s.BureauConsentRequired,
        s.CustomEmiPrincipalFormula, s.CustomEmiInterestFormula,
        s.Channels.Select(c => new LoanSetupChannelDto(c.Name, c.Code)).ToList(),
        s.InterestPlans.Select(p => new LoanSetupInterestPlanDto(
            p.InterestType.ToString().ToUpperInvariant(),
            p.RateType.ToString().ToUpperInvariant(),
            p.BaseRate,
            p.Parameters.Select(x => new InterestRateParameterDto(x.Name, x.Value, x.InterestRate)).ToList(),
            p.Policies.Select(x => new InterestRatePolicyDto(x.InterestCategory, x.InterestRate)).ToList()
        )).ToList(),
        s.DocumentRequirements.Select(d => new LoanSetupDocumentDto(
            d.DocumentTypeId, d.MinAmount, d.MaxAmount,
            d.EmploymentType, d.CollateralRequired,
            d.RiskGrade?.ToString().ToUpperInvariant(), d.IsMandatory
        )).ToList(),
        s.DisbursementDestinations.Select(d => d.DestinationType.ToString().ToUpperInvariant()).ToList(),
        s.CreatedAt);
}

public record GetLoanSetupByIdQuery(Guid Id) : IRequest<Result<LoanSetupDto>>;

public class GetLoanSetupByIdHandler(ILoanSetupRepository repo)
    : IRequestHandler<GetLoanSetupByIdQuery, Result<LoanSetupDto>>
{
    public async Task<Result<LoanSetupDto>> Handle(GetLoanSetupByIdQuery request, CancellationToken ct)
    {
        var setup = await repo.GetWithDetailsAsync(request.Id, ct);
        if (setup is null) return Result<LoanSetupDto>.Failure("Loan setup not found.");
        return Result<LoanSetupDto>.Success(GetLoanSetupsHandler.MapToDto(setup));
    }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

public record CreateLoanSetupCommand(
    string ProductCode,
    string ProductName,
    decimal MinAmount,
    decimal MaxAmount,
    TenorUnit TenorUnit,
    int[] TenorValues,
    bool IsSecuredLoan = false,
    Guid? ScoreCardId = null,
    string? ScoreCardName = null,
    Guid? WorkflowId = null,
    string? WorkflowName = null,
    Guid? RepaymentPlanId = null,
    string? RepaymentPlanName = null,
    string? RiskGrade = null,
    decimal? TotalScore = null,
    DisbursementType DisbursementType = DisbursementType.Full,
    decimal? PartialInterestRate = null,
    string? BureauProvider = null,
    string? BureauPurpose = null,
    bool BureauCheckRequired = false,
    bool BureauConsentRequired = false,
    string? CustomEmiPrincipalFormula = null,
    string? CustomEmiInterestFormula = null,
    List<LoanSetupChannelInput>? Channels = null,
    List<LoanSetupInterestPlanInput>? InterestPlans = null,
    List<LoanSetupDocumentInput>? DocumentRequirements = null,
    List<string>? DisbursementDestinations = null) : IRequest<Result<LoanSetupDto>>;

public record LoanSetupChannelInput(string Name, string Code);
public record LoanSetupInterestPlanInput(
    InterestType InterestType, RateType RateType, decimal BaseRate,
    List<InterestRateParamInput> Parameters,
    List<InterestRatePolicyInput> Policies);
public record InterestRateParamInput(string Name, decimal Value, decimal InterestRate);
public record InterestRatePolicyInput(string InterestCategory, decimal InterestRate);
public record LoanSetupDocumentInput(
    string DocumentTypeId, decimal MinAmount, decimal MaxAmount,
    string? EmploymentType = null, bool CollateralRequired = false,
    RiskGrade? RiskGrade = null, bool IsMandatory = true);

public class CreateLoanSetupHandler(ILoanSetupRepository repo)
    : IRequestHandler<CreateLoanSetupCommand, Result<LoanSetupDto>>
{
    public async Task<Result<LoanSetupDto>> Handle(CreateLoanSetupCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.ProductCode))
            return Result<LoanSetupDto>.Failure("Product code is required.");

        var setup = LoanSetup.Create(
            cmd.ProductCode, cmd.ProductName, cmd.MinAmount, cmd.MaxAmount,
            cmd.TenorUnit, cmd.TenorValues ?? [], cmd.IsSecuredLoan);

        setup.SetScorecardRef(cmd.ScoreCardId, cmd.ScoreCardName);
        setup.SetWorkflowRef(cmd.WorkflowId, cmd.WorkflowName);
        setup.SetRepaymentPlanRef(cmd.RepaymentPlanId, cmd.RepaymentPlanName);
        setup.SetDisbursement(cmd.DisbursementType, cmd.PartialInterestRate);
        setup.SetBureau(cmd.BureauProvider, cmd.BureauPurpose, cmd.BureauCheckRequired, cmd.BureauConsentRequired);
        setup.SetCustomEmi(null, null, cmd.CustomEmiPrincipalFormula, cmd.CustomEmiInterestFormula);

        if (Enum.TryParse<RiskGrade>(cmd.RiskGrade, true, out var rg))
            setup.SetRiskResult(rg, cmd.TotalScore);

        setup.SetChannels((cmd.Channels ?? []).Select(c =>
            LoanSetupChannel.Create(c.Name, c.Code, setup.Id)));

        setup.SetInterestPlans((cmd.InterestPlans ?? []).Select(p =>
        {
            var plan = LoanSetupInterestPlan.Create(p.InterestType, p.RateType, p.BaseRate, setup.Id);
            plan.SetParameters(p.Parameters.Select(x => InterestRateParameter.Create(x.Name, x.Value, x.InterestRate, plan.Id)));
            plan.SetPolicies(p.Policies.Select(x => InterestRatePolicy.Create(x.InterestCategory, x.InterestRate, plan.Id)));
            return plan;
        }));

        var docs = NormalizeDocuments(cmd.DocumentRequirements, setup.Id);
        setup.SetDocumentRequirements(docs);

        setup.SetDisbursementDestinations((cmd.DisbursementDestinations ?? [])
            .Where(d => Enum.TryParse<DisbursementDestinationType>(d, true, out _))
            .Select(d => LoanSetupDisbursementDestination.Create(
                Enum.Parse<DisbursementDestinationType>(d, true), setup.Id)));

        await repo.AddAsync(setup, ct);
        await repo.SaveChangesAsync(ct);
        return Result<LoanSetupDto>.Success(GetLoanSetupsHandler.MapToDto(setup));
    }

    private static List<LoanSetupDocument> NormalizeDocuments(
        List<LoanSetupDocumentInput>? inputs, Guid setupId)
    {
        var docs = (inputs ?? [])
            .Where(d => !string.IsNullOrWhiteSpace(d.DocumentTypeId))
            .Select(d => LoanSetupDocument.Create(d.DocumentTypeId, d.MinAmount, d.MaxAmount, setupId, d.RiskGrade, d.IsMandatory))
            .ToList();

        if (docs.Count == 0)
        {
            // Default documents: NRC and PAYSLIP
            docs.Add(LoanSetupDocument.Create("NRC", 0, 50_000_000, setupId, RiskGrade.Low, true));
            docs.Add(LoanSetupDocument.Create("PAYSLIP", 0, 50_000_000, setupId, RiskGrade.Low, true));
        }

        return docs;
    }
}

public record DeleteLoanSetupCommand(Guid Id) : IRequest<Result>;

public class DeleteLoanSetupHandler(ILoanSetupRepository repo)
    : IRequestHandler<DeleteLoanSetupCommand, Result>
{
    public async Task<Result> Handle(DeleteLoanSetupCommand cmd, CancellationToken ct)
    {
        var setup = await repo.GetByIdAsync(cmd.Id, ct);
        if (setup is null) return Result.Failure("Loan setup not found.");
        repo.Remove(setup);
        await repo.SaveChangesAsync(ct);
        return Result.Success();
    }
}
