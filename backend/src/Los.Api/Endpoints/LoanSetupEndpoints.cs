using Los.Application.Features.LoanSetups;
using MediatR;

namespace Los.Api.Endpoints;

public static class LoanSetupEndpoints
{
    public static IEndpointRouteBuilder MapLoanSetupEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/loan-setups").WithTags("Loan Setups");

        group.MapGet("/", async (IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new GetLoanSetupsQuery(), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.Problem(result.Error);
        }).WithName("GetLoanSetups").WithSummary("List all loan product setups");

        group.MapGet("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new GetLoanSetupByIdQuery(id), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("GetLoanSetup").WithSummary("Get loan setup by ID");

        group.MapPost("/", async (CreateLoanSetupCommand cmd, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(cmd, ct);
            return result.IsSuccess
                ? Results.Created($"/api/loan-setups/{result.Value!.Id}", result.Value)
                : Results.BadRequest(result.Error);
        }).WithName("CreateLoanSetup").WithSummary("Create a loan product setup");

        group.MapDelete("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new DeleteLoanSetupCommand(id), ct);
            return result.IsSuccess ? Results.NoContent() : Results.NotFound(result.Error);
        }).WithName("DeleteLoanSetup").WithSummary("Delete a loan setup");

        return app;
    }
}
