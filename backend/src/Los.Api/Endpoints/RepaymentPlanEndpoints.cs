using Los.Application.Features.RepaymentPlans;
using Los.Domain.Enums;
using MediatR;

namespace Los.Api.Endpoints;

public static class RepaymentPlanEndpoints
{
    public static IEndpointRouteBuilder MapRepaymentPlanEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/repayment-plans").WithTags("Repayment Plans");

        group.MapGet("/", async (IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new GetRepaymentPlansQuery(), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.Problem(result.Error);
        }).WithName("GetRepaymentPlans").WithSummary("List all repayment plans");

        group.MapGet("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new GetRepaymentPlanByIdQuery(id), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("GetRepaymentPlan").WithSummary("Get repayment plan by ID");

        group.MapPost("/", async (CreateRepaymentPlanCommand cmd, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(cmd, ct);
            return result.IsSuccess
                ? Results.Created($"/api/repayment-plans/{result.Value!.Id}", result.Value)
                : Results.BadRequest(result.Error);
        }).WithName("CreateRepaymentPlan").WithSummary("Create a repayment plan");

        group.MapPut("/{id:guid}", async (Guid id, UpdateRepaymentPlanRequest req, IMediator mediator, CancellationToken ct) =>
        {
            var cmd = new UpdateRepaymentPlanCommand(
                id, req.Name, req.Method, req.Frequency, req.Description,
                req.DueDayOfMonth, req.FirstDueAfterDays, req.GracePeriodDays,
                req.LateFeeFlat, req.LateFeePct, req.PrepaymentPenaltyPct,
                req.AutopayRequired, req.RoundingStep, req.MinInstallmentAmount);
            var result = await mediator.Send(cmd, ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("UpdateRepaymentPlan").WithSummary("Update a repayment plan");

        group.MapDelete("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new DeleteRepaymentPlanCommand(id), ct);
            return result.IsSuccess ? Results.NoContent() : Results.NotFound(result.Error);
        }).WithName("DeleteRepaymentPlan").WithSummary("Delete a repayment plan");

        return app;
    }
}

public record UpdateRepaymentPlanRequest(
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
    decimal? MinInstallmentAmount = null);
