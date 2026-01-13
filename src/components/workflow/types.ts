import type { Edge, Node } from "@xyflow/react";

export type WorkflowJsonNode = Node<{
	label?: string;
}>;

export type WorkflowJsonEdge = Edge<{
	condition?: string;
	input?: string;
}>;

export interface WorkflowJSON {
	nodes: WorkflowJsonNode[];
	edges: WorkflowJsonEdge[];
}
