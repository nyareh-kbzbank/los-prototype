using Los.Application.Features.Workflows;
using Los.Domain.Enums;
using MediatR;

namespace Los.Api.Endpoints;

public static class WorkflowEndpoints
{
    public static IEndpointRouteBuilder MapWorkflowEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/workflows").WithTags("Workflows");

        group.MapGet("/", async (IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new GetWorkflowsQuery(), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.Problem(result.Error);
        }).WithName("GetWorkflows").WithSummary("List all workflows");

        group.MapGet("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new GetWorkflowByIdQuery(id), ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("GetWorkflow").WithSummary("Get workflow by ID");

        group.MapPost("/", async (CreateWorkflowCommand cmd, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(cmd, ct);
            return result.IsSuccess
                ? Results.Created($"/api/workflows/{result.Value!.Id}", result.Value)
                : Results.BadRequest(result.Error);
        }).WithName("CreateWorkflow").WithSummary("Create a new workflow");

        group.MapPut("/{id:guid}", async (Guid id, UpdateWorkflowRequest req, IMediator mediator, CancellationToken ct) =>
        {
            var cmd = new UpdateWorkflowCommand(id, req.Name, req.Nodes, req.Edges);
            var result = await mediator.Send(cmd, ct);
            return result.IsSuccess ? Results.Ok(result.Value) : Results.NotFound(result.Error);
        }).WithName("UpdateWorkflow").WithSummary("Update a workflow");

        group.MapDelete("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(new DeleteWorkflowCommand(id), ct);
            return result.IsSuccess ? Results.NoContent() : Results.NotFound(result.Error);
        }).WithName("DeleteWorkflow").WithSummary("Delete a workflow");

        return app;
    }
}

public record UpdateWorkflowRequest(string Name, List<CreateWorkflowNodeInput> Nodes, List<CreateWorkflowEdgeInput> Edges);
