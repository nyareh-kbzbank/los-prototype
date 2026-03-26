using Los.Application.Features.LoanApplications;
using Los.Domain.Enums;
using MediatR;

namespace Los.Api.Endpoints;

public static class LoanApplicationEndpoints
{
    public static IEndpointRouteBuilder MapLoanApplicationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/loan-applications").WithTags("Loan Applications");

        group.MapGet("/", async (string? status, IMediator mediator, CancellationToken ct) =>
        {
            LoanApplicationStatus? parsedStatus = null;
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<LoanApplicationStatus>(status, true, out var s))
                parsedStatus = s;

            var result = await mediator.Send(new GetLoanApplicationsQuery(parsedStatus), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.Problem(result.Error);
        }).WithName("GetLoanApplications").WithSummary("List all loan applications (optionally filtered by status)");

        group.MapGet("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new GetLoanApplicationByIdQuery(id), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("GetLoanApplication").WithSummary("Get loan application by ID");

        group.MapPost("/", async (CreateLoanApplicationCommand cmd, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(cmd, ct);
            return result.IsSuccess
                ? Results.Created($"/api/loan-applications/{result.Value!.Id}", result.Value)
                : Results.BadRequest(result.Error);
        }).WithName("CreateLoanApplication").WithSummary("Create a new loan application");

        group.MapPut("/{id:guid}/status", async (Guid id, UpdateStatusRequest req, IMediator mediator, CancellationToken ct) =>
        {
            if (!Enum.TryParse<LoanApplicationStatus>(req.Status, true, out var newStatus))
                return Results.BadRequest("Invalid status value.");

            var result = await mediator.Send(new UpdateLoanApplicationStatusCommand(id, newStatus), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("UpdateLoanApplicationStatus").WithSummary("Update application status (maker/checker decisions)");

        group.MapPost("/{id:guid}/workflow-stage", async (Guid id, AdvanceWorkflowStageRequest req, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new AdvanceWorkflowStageCommand(id, req.StageIndex, req.StageId, req.StageLabel), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("AdvanceWorkflowStage").WithSummary("Advance application workflow stage");

        group.MapPost("/{id:guid}/reset-workflow", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new ResetWorkflowProgressCommand(id), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("ResetWorkflowProgress").WithSummary("Reset application workflow progress");

        // Maker inbox — applications in SUBMITTED state
        group.MapGet("/maker-inbox", async (IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new GetLoanApplicationsQuery(LoanApplicationStatus.Submitted), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.Problem(result.Error);
        }).WithName("GetMakerInbox").WithSummary("Get applications pending maker review");

        // Checker inbox — applications in CHECKER_PENDING state
        group.MapGet("/checker-inbox", async (IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new GetLoanApplicationsQuery(LoanApplicationStatus.CheckerPending), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.Problem(result.Error);
        }).WithName("GetCheckerInbox").WithSummary("Get applications pending checker review");

        return app;
    }
}

public record UpdateStatusRequest(string Status);
public record AdvanceWorkflowStageRequest(int StageIndex, string StageId, string StageLabel);
