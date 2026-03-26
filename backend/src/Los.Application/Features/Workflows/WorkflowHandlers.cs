using Los.Application.Common;
using Los.Application.DTOs;
using Los.Domain.Entities;
using Los.Domain.Enums;
using Los.Domain.Interfaces;
using MediatR;

namespace Los.Application.Features.Workflows;

// ─── Queries ──────────────────────────────────────────────────────────────────

public record GetWorkflowsQuery : IRequest<Result<IReadOnlyList<WorkflowSummaryDto>>>;

public class GetWorkflowsHandler(IWorkflowRepository repo)
    : IRequestHandler<GetWorkflowsQuery, Result<IReadOnlyList<WorkflowSummaryDto>>>
{
    public async Task<Result<IReadOnlyList<WorkflowSummaryDto>>> Handle(GetWorkflowsQuery request, CancellationToken ct)
    {
        var workflows = await repo.GetAllOrderedAsync(ct);
        var dtos = workflows.Select(w => new WorkflowSummaryDto(
            w.Id, w.Name, w.CreatedAt, w.Nodes.Count, w.Edges.Count)).ToList();
        return Result<IReadOnlyList<WorkflowSummaryDto>>.Success(dtos);
    }
}

public record GetWorkflowByIdQuery(Guid Id) : IRequest<Result<WorkflowDto>>;

public class GetWorkflowByIdHandler(IWorkflowRepository repo)
    : IRequestHandler<GetWorkflowByIdQuery, Result<WorkflowDto>>
{
    public async Task<Result<WorkflowDto>> Handle(GetWorkflowByIdQuery request, CancellationToken ct)
    {
        var wf = await repo.GetByIdAsync(request.Id, ct);
        if (wf is null) return Result<WorkflowDto>.Failure("Workflow not found.");
        return Result<WorkflowDto>.Success(MapToDto(wf));
    }

    internal static WorkflowDto MapToDto(Workflow wf) => new(
        wf.Id, wf.Name, wf.SourceInstanceId, wf.CreatedAt, wf.UpdatedAt,
        wf.Nodes.Select(n => new WorkflowNodeDto(n.NodeId, n.Label, n.Type, n.Input)).ToList(),
        wf.Edges.Select(e => new WorkflowEdgeDto(e.EdgeId, e.SourceNodeId, e.TargetNodeId, e.Condition, e.Input)).ToList());
}

// ─── Commands ─────────────────────────────────────────────────────────────────

public record CreateWorkflowCommand(
    string Name,
    string? SourceInstanceId,
    List<CreateWorkflowNodeInput> Nodes,
    List<CreateWorkflowEdgeInput> Edges) : IRequest<Result<WorkflowDto>>;

public record CreateWorkflowNodeInput(string NodeId, string Label, WorkflowNodeType Type, string? Input);
public record CreateWorkflowEdgeInput(string EdgeId, string SourceNodeId, string TargetNodeId, string? Condition, string? Input);

public class CreateWorkflowHandler(IWorkflowRepository repo)
    : IRequestHandler<CreateWorkflowCommand, Result<WorkflowDto>>
{
    public async Task<Result<WorkflowDto>> Handle(CreateWorkflowCommand cmd, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(cmd.Name))
            return Result<WorkflowDto>.Failure("Workflow name is required.");

        var wf = Workflow.Create(cmd.Name, cmd.SourceInstanceId);

        foreach (var n in cmd.Nodes)
            wf.AddNode(n.NodeId, n.Label, n.Type, n.Input);

        foreach (var e in cmd.Edges)
            wf.AddEdge(e.EdgeId, e.SourceNodeId, e.TargetNodeId, e.Condition, e.Input);

        await repo.AddAsync(wf, ct);
        await repo.SaveChangesAsync(ct);

        return Result<WorkflowDto>.Success(GetWorkflowByIdHandler.MapToDto(wf));
    }
}

public record UpdateWorkflowCommand(
    Guid Id,
    string Name,
    List<CreateWorkflowNodeInput> Nodes,
    List<CreateWorkflowEdgeInput> Edges) : IRequest<Result<WorkflowDto>>;

public class UpdateWorkflowHandler(IWorkflowRepository repo)
    : IRequestHandler<UpdateWorkflowCommand, Result<WorkflowDto>>
{
    public async Task<Result<WorkflowDto>> Handle(UpdateWorkflowCommand cmd, CancellationToken ct)
    {
        var wf = await repo.GetByIdAsync(cmd.Id, ct);
        if (wf is null) return Result<WorkflowDto>.Failure("Workflow not found.");

        wf.UpdateName(cmd.Name);

        var nodes = cmd.Nodes.Select(n =>
            WorkflowNode.Create(n.NodeId, n.Label, n.Type, n.Input, wf.Id)).ToList();

        var edges = cmd.Edges.Select(e =>
            WorkflowEdge.Create(e.EdgeId, e.SourceNodeId, e.TargetNodeId, e.Condition, e.Input, wf.Id)).ToList();

        wf.SetNodes(nodes);
        wf.SetEdges(edges);

        repo.Update(wf);
        await repo.SaveChangesAsync(ct);

        return Result<WorkflowDto>.Success(GetWorkflowByIdHandler.MapToDto(wf));
    }
}

public record DeleteWorkflowCommand(Guid Id) : IRequest<Result>;

public class DeleteWorkflowHandler(IWorkflowRepository repo)
    : IRequestHandler<DeleteWorkflowCommand, Result>
{
    public async Task<Result> Handle(DeleteWorkflowCommand cmd, CancellationToken ct)
    {
        var wf = await repo.GetByIdAsync(cmd.Id, ct);
        if (wf is null) return Result.Failure("Workflow not found.");

        repo.Remove(wf);
        await repo.SaveChangesAsync(ct);
        return Result.Success();
    }
}
