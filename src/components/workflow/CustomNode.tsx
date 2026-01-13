// 1. Import Handle and Position

import { Handle, type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { type ChangeEvent, useCallback } from "react";
import type { WorkflowJsonEdge, WorkflowJsonNode } from "./types";

export function CustomNode({
	isConnectable,
	id,
	data,
}: NodeProps<WorkflowJsonNode>) {
	const { setEdges, setNodes } = useReactFlow<
  WorkflowJsonNode,
  WorkflowJsonEdge
	>();
  // Remove current node
  const removeNode = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      setNodes((nds) => nds.filter((node) => node.id !== id));
      setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    },
    [id, setNodes, setEdges]
  );

	const onChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>) => {
			const text = event.target.value;
			setNodes((nds) =>
				nds.map((node) => {
					if (node.id === id) {
						// Update the node's data with the new text
						return {
							...node,
							data: {
								...node.data,
								label: text,
							},
						};
					}
					return node;
				}),
			);
		},
		[id, setNodes],
	);

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

	return (
		<div className="text-updater-node border border-emerald-500 p-4 rounded-md bg-white shadow-sm">
			{/* 2. Add a Target handle (Top) to receive connections */}
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
					Workflow Stage
				</label>
				<input
					name="text"
					onChange={onChange}
					className="nodrag border rounded px-1"
				/>
			</div>
			<button
				onClick={removeNode}
				title="Remove this node"
				className="ml-2 size-8 px-2 mt-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
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
