import {
	BaseEdge,
	getSmoothStepPath,
	Position,
	useReactFlow,
} from "@xyflow/react";
import type { WorkflowJsonEdge, WorkflowJsonNode } from "./types";

export function CustomEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
}: Readonly<{
	id: string;
	sourceX: number;
	sourceY: number;
	targetX: number;
	targetY: number;
	sourcePosition: Position;
	targetPosition: Position;
}>) {
	const { setEdges } = useReactFlow<WorkflowJsonNode, WorkflowJsonEdge>();
	const [edgePath, labelX, labelY] = getSmoothStepPath({
		sourceX,
		sourceY,
		sourcePosition: Position.Right,
		targetX,
		targetY,
		targetPosition: Position.Left,
	});

	return (
		<BaseEdge
			id={id}
			path={edgePath}
			onClick={(e) => {
				e.stopPropagation();
				setEdges((prev) => {
					return prev.filter((item) => item.id !== id);
				});
			}}
		/>
	);
}
