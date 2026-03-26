using Los.Application.Features.Scorecards;
using MediatR;

namespace Los.Api.Endpoints;

public static class ScorecardEndpoints
{
    public static IEndpointRouteBuilder MapScorecardEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/scorecards").WithTags("Scorecards");

        group.MapGet("/", async (IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new GetScoreCardsQuery(), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.Problem(result.Error);
        }).WithName("GetScorecards").WithSummary("List all scorecards");

        group.MapGet("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new GetScoreCardByIdQuery(id), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("GetScorecard").WithSummary("Get scorecard by ID");

        group.MapPost("/", async (CreateScoreCardCommand cmd, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(cmd, ct);
            return result.IsSuccess
                ? Results.Created($"/api/scorecards/{result.Value!.Id}", result.Value)
                : Results.BadRequest(result.Error);
        }).WithName("CreateScorecard").WithSummary("Create a new scorecard");

        group.MapPut("/{id:guid}", async (Guid id, UpdateScoreCardRequest req, IMediator mediator, CancellationToken ct) =>
        {
            var cmd = new UpdateScoreCardCommand(id, req.Name, req.MaxScore, req.Fields);
            var result = await mediator.Send(cmd, ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("UpdateScorecard").WithSummary("Update a scorecard");

        group.MapDelete("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new DeleteScoreCardCommand(id), ct);
            return result.IsSuccess ? Results.NoContent() : Results.NotFound(result.Error);
        }).WithName("DeleteScorecard").WithSummary("Delete a scorecard");

        group.MapPost("/{id:guid}/evaluate", async (Guid id, EvaluateRequest req, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new EvaluateScoreCardQuery(id, req.Inputs), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("EvaluateScorecard").WithSummary("Evaluate applicant inputs against a scorecard");

        group.MapPost("/{id:guid}/evaluate-advanced", async (Guid id, EvaluateRequest req, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new EvaluateScoreCardAdvancedQuery(id, req.Inputs), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("EvaluateScorecardAdvanced").WithSummary("Evaluate with FICO weighting and ECL calculation");

        return app;
    }
}

public record UpdateScoreCardRequest(string Name, int MaxScore, List<ScoreCardFieldInput> Fields);
public record EvaluateRequest(Dictionary<string, string> Inputs);
