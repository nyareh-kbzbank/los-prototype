import {
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	type Connection,
	type EdgeChange,
	type EdgeTypes,
	type NodeChange,
	type NodeTypes,
	Position,
	ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { v4 as uuidV4 } from "uuid";
import { useWorkflowStore } from "@/lib/workflow-store";
import { ConditionNode } from "./ConditionNode";
import { CustomEdge } from "./CustomEdge";
import { CustomNode } from "./CustomNode";
import DataEdge from "./DataEdge";
import { EndNode } from "./EndNode";
import { StartNode } from "./StartNode";
import type { WorkflowJSON, WorkflowJsonEdge, WorkflowJsonNode } from "./types";

const edgeTypes: EdgeTypes = {
	"data-edge": DataEdge,
	"custom-edge": CustomEdge,
};
const nodeTypes: NodeTypes = {
	"custom-node": CustomNode,
	"start-node": StartNode,
	"end-node": EndNode,
	"condition-node": ConditionNode,
};

const defaultStartNode: WorkflowJsonNode = {
	id: "start",
	type: "start-node",
	position: { x: 50, y: 50 },
	data: { label: "Start" },
	// Only source handle
	sourcePosition: Position.Right,
};
const defaultEndNode: WorkflowJsonNode = {
	id: "end",
	type: "end-node",
	position: { x: 600, y: 50 },
	data: { label: "End" },
	// Only target handle
	targetPosition: Position.Left,
};
const firstDefaultNode: WorkflowJsonNode = {
	id: "first-default",
	type: "custom-node",
	position: { x: 300, y: 50 },
	data: { label: "First Default Node" },
};

export default function WorkflowCanvas({
	instanceId,
	workflowJson,
	initialName,
}: Readonly<{
	workflowJson: WorkflowJSON;
	instanceId: string;
	initialName?: string;
}>) {
	const navigate = useNavigate();
	const [nodes, setNodes] = useState<WorkflowJsonNode[]>(
		workflowJson.nodes.length > 0
			? workflowJson.nodes
			: [defaultStartNode, firstDefaultNode, defaultEndNode],
	);
	const [edges, setEdges] = useState<WorkflowJsonEdge[]>(
		workflowJson.edges.length > 0
			? workflowJson.edges
			: [
					{
						id: "e-start-to-first",
						source: "start",
						target: firstDefaultNode.id,
						type: "custom-edge",
						animated: true,
					},
				],
	);

	const addWorkflow = useWorkflowStore((s) => s.addWorkflow);
	const updateWorkflow = useWorkflowStore((s) => s.updateWorkflow);

	const [showJson, setShowJson] = useState(false);
	const [saveName, setSaveName] = useState(initialName ?? "");
	const [saveError, setSaveError] = useState<string | null>(null);

	const onNodesChange = useCallback(
		(changes: NodeChange<WorkflowJsonNode>[]) => {
			// Prevent removal of start/end nodes
			const filteredChanges = changes.filter(
				(change) =>
					!(
						change.type === "remove" &&
						(change.id === "start" || change.id === "end")
					),
			);
			setNodes((nodesSnapshot) =>
				applyNodeChanges(filteredChanges, nodesSnapshot),
			);
		},
		[],
	);
	const onEdgesChange = useCallback(
		(changes: EdgeChange<WorkflowJsonEdge>[]) =>
			setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
		[],
	);
	const onConnect = useCallback((params: Connection) => {
		// Prevent connecting to start node as target or from end node as source
		if (params.target === "start" || params.source === "end") return;
		setEdges((edgesSnapshot) =>
			addEdge(
				{ ...params, animated: true, type: "custom-edge" },
				edgesSnapshot,
			),
		);
	}, []);

	useEffect(() => {
		console.log({ nodes, edges });
	}, [nodes, edges]);

	const handleSave = () => {
		try {
			setSaveError(null);
			if (instanceId !== "new-workflow") {
				updateWorkflow(instanceId, saveName, { nodes, edges });
			} else {
				addWorkflow(saveName, { nodes, edges }, { sourceInstanceId: instanceId });
			}
			setSaveName("");
			navigate({ to: "/workflow" });
		} catch (err) {
			setSaveError(
				err instanceof Error ? err.message : "Unable to save workflow",
			);
		}
	};

	return (
		<div className="w-80vw h-200 border border-cyan-500">
			<button
				type="button"
				className="ml-2 px-2 py-1 border rounded"
				onClick={(_) => {
					setNodes((prev) => [
						...prev,
						{
							id: uuidV4(),
							type: "custom-node",
							position: { x: 0, y: 0 },
							data: { label: "New Node" },
						},
					]);
				}}
			>
				Add
			</button>

			<button
				type="button"
				className="ml-2 px-2 py-1 border rounded"
				onClick={(_) => {
					setNodes((prev) => [
						...prev,
						{
							id: uuidV4(),
							type: "condition-node",
							position: { x: 0, y: 0 },
							data: { label: "New Node" },
						},
					]);
				}}
			>
				Add Condition
			</button>
			<button
				type="button"
				className="ml-2 px-2 py-1 border rounded"
				onClick={() => setShowJson((v) => !v)}
			>
				{showJson ? "Show Canvas" : "Show JSON"}
			</button>

			<div className="mt-2 flex items-center gap-2">
				<input
					type="text"
					className="border px-2 py-1 rounded"
					placeholder="Workflow name"
					value={saveName}
					onChange={(e) => setSaveName(e.target.value)}
				/>
				<button
					type="button"
					onClick={handleSave}
					className="px-3 py-1 bg-blue-600 text-white rounded"
				>
					Save Workflow
				</button>
				{saveError ? (
					<span className="text-sm text-red-600">{saveError}</span>
				) : null}
			</div>

			{showJson ? (
				<div className="mt-2 h-full overflow-auto bg-gray-50 p-2">
					<pre className="text-xs">
						{JSON.stringify({ nodes, edges }, null, 2)}
					</pre>
				</div>
			) : (
				<ReactFlow
					nodes={nodes}
					edges={edges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					edgeTypes={edgeTypes}
					nodeTypes={nodeTypes}
					fitView
					style={{ width: "100%", height: "100%" }}
				/>
			)}
		</div>
	);
}
