import { Handle, type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { useCallback } from "react";
import type { WorkflowJsonNode } from "./types";

export function ConditionNode({
	data,
	isConnectable,
	id,
}: NodeProps<WorkflowJsonNode>) {
	const { setNodes, setEdges } = useReactFlow();

	const onChange = useCallback(
		(evt) => {
			setNodes((eds) =>
				eds.map((ed) =>
					ed.id === id
						? { ...ed, data: { ...ed.data, input: evt.target.value } }
						: ed,
				),
			);
		},
		[id, setNodes],
	);

	const removeAllEdges = useCallback(() => {
		setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
	}, [id, setEdges]);

	const removeIncomingEdges = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			event.stopPropagation();
			setEdges((es) => es.filter((e) => e.target !== id));
		},
		[id, setEdges],
	);

	const removeOutgoingEdges = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			event.stopPropagation();
			setEdges((es) => es.filter((e) => e.source !== id));
		},
		[id, setEdges],
	);

	const removeNode = useCallback(
		(event: React.MouseEvent<HTMLButtonElement>) => {
			event.stopPropagation();
			setNodes((nds) => nds.filter((node) => node.id !== id));
			setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
		},
		[id, setNodes, setEdges],
	);

	return (
		<div className="text-updater-node border border-cyan-500 bg-cyan-100 p-4 rounded-md shadow-sm">
			<button
				onClick={removeIncomingEdges}
				title="Click to remove all incoming edges"
				className="cursor-pointer"
				type="button"
			>
				<Handle
					type="target"
					position={Position.Left}
					isConnectable={isConnectable}
				/>
			</button>
			<div>
				<label htmlFor="text" className="block text-xs text-gray-500">
					Add Condition
				</label>
				<input
					name="text"
					type="text"
					onChange={onChange}
					className="nodrag border rounded px-1"
				/>
			</div>
			<button
				onClick={removeNode}
				title="Remove this node"
				className="ml-2 px-2 py-1 mt-2 bg-red-500 text-white rounded hover:bg-red-600 size-8"
				type="button"
			>
				X
			</button>
			<button
				onClick={removeOutgoingEdges}
				title="Click to remove all incoming edges"
				className="cursor-pointer"
				type="button"
			>
				<Handle
					type="source"
					position={Position.Right}
					isConnectable={isConnectable}
				/>
			</button>
		</div>
	);
}
