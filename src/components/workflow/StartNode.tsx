import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { WorkflowJsonNode } from "./types";

export function StartNode({
	isConnectable,
}: NodeProps<WorkflowJsonNode>) {
	return (
		<div className="text-updater-node border border-emerald-500 p-4 rounded-full bg-white shadow-sm">
			<div>
				<label htmlFor="text" className="block text-xs text-gray-500">
					Start
				</label>
			</div>

			{/* 3. Add a Source handle (Bottom) to send connections */}
			<Handle
				type="source"
				position={Position.Right}
				isConnectable={isConnectable}
			/>
		</div>
	);
}
