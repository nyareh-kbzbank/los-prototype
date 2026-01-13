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
import { useCallback, useEffect, useState } from "react";
import { v4 as uuidV4 } from "uuid";
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
const easdfafd = {
	nodes: [
		{
			id: "start",
			type: "start-node",
			position: {
				x: 187.1968635246329,
				y: 63.47381286423635,
			},
			data: {
				label: "Start",
			},
			sourcePosition: "right",
			measured: {
				width: 58,
				height: 50,
			},
			selected: false,
			dragging: false,
		},
		{
			id: "first-default",
			type: "custom-node",
			position: {
				x: 317.8259555778805,
				y: -55.42827056133912,
			},
			data: {
				label: "Maker 1",
			},
			measured: {
				width: 224,
				height: 75,
			},
			selected: false,
			dragging: false,
		},
		{
			id: "end",
			type: "end-node",
			position: {
				x: 1301.7786879266184,
				y: 72.72250294889108,
			},
			data: {
				label: "End",
			},
			targetPosition: "left",
			measured: {
				width: 54,
				height: 50,
			},
			selected: false,
			dragging: false,
		},
		{
			id: "b53f0d43-d57e-4580-accc-477c3a152e3f",
			type: "condition-node",
			position: {
				x: 595.7370871699043,
				y: 26.97829010660014,
			},
			data: {
				label: "New Node",
				input: "loan_amount>=1000000",
			},
			measured: {
				width: 224,
				height: 123,
			},
			selected: false,
			dragging: false,
		},
		{
			id: "5f04f3d3-57c4-410c-8e77-0ac5f5e2730e",
			type: "custom-node",
			position: {
				x: 930.3078990343031,
				y: -20.09559629426068,
			},
			data: {
				label: "Maker 2",
			},
			measured: {
				width: 224,
				height: 75,
			},
			selected: false,
			dragging: false,
		},
		{
			id: "e7cd3b02-55ce-417a-adb9-d150d19b0b59",
			type: "custom-node",
			position: {
				x: 930.3078990343031,
				y: 122.93776556488879,
			},
			data: {
				label: "Checker 1",
			},
			measured: {
				width: 224,
				height: 75,
			},
			selected: false,
			dragging: false,
		},
		{
			id: "19c0c7f5-488b-4cbc-b70e-156f6b26f3b2",
			type: "custom-node",
			position: {
				x: 319.0046564491983,
				y: 197.51842717968495,
			},
			data: {
				label: "Other Maker",
			},
			measured: {
				width: 224,
				height: 75,
			},
			selected: false,
			dragging: false,
		},
	],
	edges: [
		{
			id: "e-start-to-first",
			source: "start",
			target: "first-default",
			type: "custom-edge",
			animated: true,
		},
		{
			source: "b53f0d43-d57e-4580-accc-477c3a152e3f",
			target: "5f04f3d3-57c4-410c-8e77-0ac5f5e2730e",
			animated: true,
			type: "custom-edge",
			id: "xy-edge__b53f0d43-d57e-4580-accc-477c3a152e3f-5f04f3d3-57c4-410c-8e77-0ac5f5e2730e",
		},
		{
			source: "b53f0d43-d57e-4580-accc-477c3a152e3f",
			target: "e7cd3b02-55ce-417a-adb9-d150d19b0b59",
			animated: true,
			type: "custom-edge",
			id: "xy-edge__b53f0d43-d57e-4580-accc-477c3a152e3f-e7cd3b02-55ce-417a-adb9-d150d19b0b59",
		},
		{
			source: "first-default",
			target: "b53f0d43-d57e-4580-accc-477c3a152e3f",
			animated: true,
			type: "custom-edge",
			id: "xy-edge__first-default-b53f0d43-d57e-4580-accc-477c3a152e3f",
		},
		{
			source: "start",
			target: "19c0c7f5-488b-4cbc-b70e-156f6b26f3b2",
			animated: true,
			type: "custom-edge",
			id: "xy-edge__start-19c0c7f5-488b-4cbc-b70e-156f6b26f3b2",
		},
		{
			source: "19c0c7f5-488b-4cbc-b70e-156f6b26f3b2",
			target: "b53f0d43-d57e-4580-accc-477c3a152e3f",
			animated: true,
			type: "custom-edge",
			id: "xy-edge__19c0c7f5-488b-4cbc-b70e-156f6b26f3b2-b53f0d43-d57e-4580-accc-477c3a152e3f",
		},
		{
			source: "5f04f3d3-57c4-410c-8e77-0ac5f5e2730e",
			target: "end",
			animated: true,
			type: "custom-edge",
			id: "xy-edge__5f04f3d3-57c4-410c-8e77-0ac5f5e2730e-end",
		},
		{
			source: "e7cd3b02-55ce-417a-adb9-d150d19b0b59",
			target: "end",
			animated: true,
			type: "custom-edge",
			id: "xy-edge__e7cd3b02-55ce-417a-adb9-d150d19b0b59-end",
		},
	],
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
}: Readonly<{
	workflowJson: WorkflowJSON;
	instanceId: string;
}>) {
	const [nodes, setNodes] = useState<WorkflowJsonNode[]>([
		defaultStartNode,
		firstDefaultNode,
		...workflowJson.nodes,
		defaultEndNode,
	]);
	const [edges, setEdges] = useState<WorkflowJsonEdge[]>([
		{
			id: "e-start-to-first",
			source: "start",
			target: firstDefaultNode.id,
			type: "custom-edge",
			animated: true,
		},
		...workflowJson.edges,
	]);

	const [showJson, setShowJson] = useState(false);

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

	return (
		<div className="w-80vw h-200 border border-cyan-500">
			<button
				type="button"
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

			{showJson ? (
				<div className="mt-2 h-full overflow-auto bg-gray-50 p-2">
					<pre className="text-xs">{JSON.stringify({ nodes, edges }, null, 2)}</pre>
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
