using Los.Application.Common;
using Los.Application.DTOs;
using Los.Domain.Entities;
using Los.Domain.Enums;
using Los.Domain.Interfaces;
using Los.Domain.Services;
using MediatR;

namespace Los.Application.Features.Scorecards;

// ─── Queries ──────────────────────────────────────────────────────────────────

public record GetScoreCardsQuery : IRequest<Result<IReadOnlyList<ScoreCardSummaryDto>>>;

public class GetScoreCardsHandler(IScoreCardRepository repo)
    : IRequestHandler<GetScoreCardsQuery, Result<IReadOnlyList<ScoreCardSummaryDto>>>
{
    public async Task<Result<IReadOnlyList<ScoreCardSummaryDto>>> Handle(GetScoreCardsQuery request, CancellationToken ct)
    {
        var cards = await repo.GetAllWithFieldsAsync(ct);
        var dtos = cards.Select(c => new ScoreCardSummaryDto(
            c.Id, c.ScorecardCode, c.Name, c.MaxScore, c.Fields.Count)).ToList();
        return Result<IReadOnlyList<ScoreCardSummaryDto>>.Success(dtos);
    }
}

public record GetScoreCardByIdQuery(Guid Id) : IRequest<Result<ScoreCardDto>>;

public class GetScoreCardByIdHandler(IScoreCardRepository repo)
    : IRequestHandler<GetScoreCardByIdQuery, Result<ScoreCardDto>>
{
    public async Task<Result<ScoreCardDto>> Handle(GetScoreCardByIdQuery request, CancellationToken ct)
    {
        var card = await repo.GetByIdAsync(request.Id, ct);
        if (card is null) return Result<ScoreCardDto>.Failure("Scorecard not found.");
        return Result<ScoreCardDto>.Success(MapToDto(card));
    }

    internal static ScoreCardDto MapToDto(ScoreCard c) => new(
        c.Id, c.ScorecardCode, c.Name, c.MaxScore, c.CreatedAt,
        c.Fields.Select(f => new ScoreCardFieldDto(
            f.Field, f.Description,
            f.Rules.Select(r => new ScorecardRuleDto(r.Operator, r.Value, r.Score)).ToList()
        )).ToList());
}

/// <summary>Evaluate an applicant's inputs against a scorecard.</summary>
public record EvaluateScoreCardQuery(Guid ScoreCardId, Dictionary<string, string> Inputs) : IRequest<Result<ScoreEvaluationResultDto>>;

public class EvaluateScoreCardHandler(IScoreCardRepository repo, ScoreCardEngine engine)
    : IRequestHandler<EvaluateScoreCardQuery, Result<ScoreEvaluationResultDto>>
{
    public async Task<Result<ScoreEvaluationResultDto>> Handle(EvaluateScoreCardQuery request, CancellationToken ct)
    {
        var card = await repo.GetByIdAsync(request.ScoreCardId, ct);
        if (card is null) return Result<ScoreEvaluationResultDto>.Failure("Scorecard not found.");

        var result = engine.Evaluate(card, request.Inputs);
        return Result<ScoreEvaluationResultDto>.Success(new ScoreEvaluationResultDto(
            result.MaxScore, result.TotalScore, result.MatchedRules,
            result.RiskGrade.ToString().ToUpperInvariant(),
            result.Breakdown.Select(b => new RuleBreakdownDto(
                b.Field, b.FieldDescription, b.Operator.ToString(), b.RuleValue,
                b.Score, b.Matched, b.ActualValue, b.SkippedBecauseMissingInput)).ToList()));
    }
}

/// <summary>Evaluate with FICO-weighted scoring and ECL calculation.</summary>
public record EvaluateScoreCardAdvancedQuery(Guid ScoreCardId, Dictionary<string, string> Inputs) : IRequest<Result<ScoreEvaluationAdvancedResultDto>>;

public class EvaluateScoreCardAdvancedHandler(IScoreCardRepository repo, ScoreCardEngineAdvanced engine)
    : IRequestHandler<EvaluateScoreCardAdvancedQuery, Result<ScoreEvaluationAdvancedResultDto>>
{
    public async Task<Result<ScoreEvaluationAdvancedResultDto>> Handle(EvaluateScoreCardAdvancedQuery request, CancellationToken ct)
    {
        var card = await repo.GetByIdAsync(request.ScoreCardId, ct);
        if (card is null) return Result<ScoreEvaluationAdvancedResultDto>.Failure("Scorecard not found.");

        var result = engine.Evaluate(card, request.Inputs);
        var eclDto = result.Ecl is null ? null : new EclDto(
            result.Ecl.Pd, result.Ecl.Lgd, result.Ecl.Ead,
            result.Ecl.DiscountFactor, result.Ecl.ExpectedCreditLoss);

        return Result<ScoreEvaluationAdvancedResultDto>.Success(new ScoreEvaluationAdvancedResultDto(
            result.MaxScore, result.TotalScore, result.MatchedRules,
            result.RiskGrade.ToString().ToUpperInvariant(),
            result.Breakdown.Select(b => new RuleBreakdownDto(
                b.Field, b.FieldDescription, b.Operator.ToString(), b.RuleValue,
                b.Score, b.Matched, b.ActualValue, b.SkippedBecauseMissingInput)).ToList(),
            eclDto));
    }
}

// ─── Commands ─────────────────────────────────────────────────────────────────

public record CreateScoreCardCommand(
    string Name,
    int MaxScore,
    string? ScorecardCode,
    List<ScoreCardFieldInput> Fields) : IRequest<Result<ScoreCardDto>>;

public record ScoreCardFieldInput(string Field, string Description, List<ScorecardRuleInput> Rules);
public record ScorecardRuleInput(ScorecardOperator Operator, string Value, int Score);

public class CreateScoreCardHandler(IScoreCardRepository repo)
    : IRequestHandler<CreateScoreCardCommand, Result<ScoreCardDto>>
{
    public async Task<Result<ScoreCardDto>> Handle(CreateScoreCardCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Name))
            return Result<ScoreCardDto>.Failure("Scorecard name is required.");
        if (cmd.MaxScore <= 0)
            return Result<ScoreCardDto>.Failure("MaxScore must be positive.");

        var card = ScoreCard.Create(cmd.Name, cmd.MaxScore, cmd.ScorecardCode);
        foreach (var f in cmd.Fields)
        {
            var field = card.AddField(f.Field, f.Description);
            foreach (var r in f.Rules)
                field.AddRule(r.Operator, r.Value, r.Score);
        }

        await repo.AddAsync(card, ct);
        await repo.SaveChangesAsync(ct);
        return Result<ScoreCardDto>.Success(GetScoreCardByIdHandler.MapToDto(card));
    }
}

public record UpdateScoreCardCommand(
    Guid Id,
    string Name,
    int MaxScore,
    List<ScoreCardFieldInput> Fields) : IRequest<Result<ScoreCardDto>>;

public class UpdateScoreCardHandler(IScoreCardRepository repo)
    : IRequestHandler<UpdateScoreCardCommand, Result<ScoreCardDto>>
{
    public async Task<Result<ScoreCardDto>> Handle(UpdateScoreCardCommand cmd, CancellationToken ct)
    {
        var card = await repo.GetByIdAsync(cmd.Id, ct);
        if (card is null) return Result<ScoreCardDto>.Failure("Scorecard not found.");

        card.Update(cmd.Name, cmd.MaxScore);

        var fields = cmd.Fields.Select(f =>
        {
            var field = ScoreCardField.CreatePublic(f.Field, f.Description, card.Id);
            foreach (var r in f.Rules)
                field.AddRule(r.Operator, r.Value, r.Score);
            return field;
        }).ToList();

        card.SetFields(fields);
        repo.Update(card);
        await repo.SaveChangesAsync(ct);
        return Result<ScoreCardDto>.Success(GetScoreCardByIdHandler.MapToDto(card));
    }
}

public record DeleteScoreCardCommand(Guid Id) : IRequest<Result>;

public class DeleteScoreCardHandler(IScoreCardRepository repo)
    : IRequestHandler<DeleteScoreCardCommand, Result>
{
    public async Task<Result> Handle(DeleteScoreCardCommand cmd, CancellationToken ct)
    {
        var card = await repo.GetByIdAsync(cmd.Id, ct);
        if (card is null) return Result.Failure("Scorecard not found.");
        repo.Remove(card);
        await repo.SaveChangesAsync(ct);
        return Result.Success();
    }
}
