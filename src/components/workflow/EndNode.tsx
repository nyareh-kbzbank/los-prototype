// 1. Import Handle and Position

import { Handle, type NodeProps, Position } from "@xyflow/react";
import type { WorkflowJsonNode } from "./types";

export function EndNode({ isConnectable }: NodeProps<WorkflowJsonNode>) {
	return (
		<div className="text-updater-node border border-emerald-500 p-4 bg-white shadow-sm rounded-full">
			<div>
				<label htmlFor="text" className="block text-xs text-gray-500">
					End
				</label>
			</div>
			<Handle
				type="target"
				position={Position.Left}
				isConnectable={isConnectable}
			/>
		</div>
	);
}
