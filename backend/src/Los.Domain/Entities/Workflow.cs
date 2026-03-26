using Los.Domain.Common;
using Los.Domain.Enums;

namespace Los.Domain.Entities;

/// <summary>
/// Represents a loan approval workflow as a directed graph.
/// </summary>
public class Workflow : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? SourceInstanceId { get; private set; }

    private readonly List<WorkflowNode> _nodes = [];
    private readonly List<WorkflowEdge> _edges = [];

    public IReadOnlyList<WorkflowNode> Nodes => _nodes.AsReadOnly();
    public IReadOnlyList<WorkflowEdge> Edges => _edges.AsReadOnly();

    protected Workflow() { }

    public static Workflow Create(string name, string? sourceInstanceId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        return new Workflow
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Name = name.Trim(),
            SourceInstanceId = sourceInstanceId
        };
    }

    public void UpdateName(string name)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        Name = name.Trim();
        SetUpdatedAt();
    }

    public WorkflowNode AddNode(string nodeId, string label, WorkflowNodeType type, string? input = null)
    {
        var node = WorkflowNode.Create(nodeId, label, type, input, Id);
        _nodes.Add(node);
        SetUpdatedAt();
        return node;
    }

    public WorkflowEdge AddEdge(string edgeId, string sourceNodeId, string targetNodeId, string? condition = null, string? input = null)
    {
        var edge = WorkflowEdge.Create(edgeId, sourceNodeId, targetNodeId, condition, input, Id);
        _edges.Add(edge);
        SetUpdatedAt();
        return edge;
    }

    public void SetNodes(IEnumerable<WorkflowNode> nodes)
    {
        _nodes.Clear();
        _nodes.AddRange(nodes);
        SetUpdatedAt();
    }

    public void SetEdges(IEnumerable<WorkflowEdge> edges)
    {
        _edges.Clear();
        _edges.AddRange(edges);
        SetUpdatedAt();
    }
}

public class WorkflowNode : BaseEntity
{
    public string NodeId { get; private set; } = string.Empty;
    public string Label { get; private set; } = string.Empty;
    public WorkflowNodeType Type { get; private set; }
    public string? Input { get; private set; }
    public Guid WorkflowId { get; private set; }

    protected WorkflowNode() { }

    public static WorkflowNode Create(string nodeId, string label, WorkflowNodeType type, string? input, Guid workflowId)
    {
        return new WorkflowNode
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            NodeId = nodeId,
            Label = label,
            Type = type,
            Input = input,
            WorkflowId = workflowId
        };
    }
}

public class WorkflowEdge : BaseEntity
{
    public string EdgeId { get; private set; } = string.Empty;
    public string SourceNodeId { get; private set; } = string.Empty;
    public string TargetNodeId { get; private set; } = string.Empty;
    public string? Condition { get; private set; }
    public string? Input { get; private set; }
    public Guid WorkflowId { get; private set; }

    protected WorkflowEdge() { }

    public static WorkflowEdge Create(string edgeId, string sourceNodeId, string targetNodeId, string? condition, string? input, Guid workflowId)
    {
        return new WorkflowEdge
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            EdgeId = edgeId,
            SourceNodeId = sourceNodeId,
            TargetNodeId = targetNodeId,
            Condition = condition,
            Input = input,
            WorkflowId = workflowId
        };
    }
}
