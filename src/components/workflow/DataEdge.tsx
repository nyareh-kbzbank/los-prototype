// DataEdge.js
import {
	EdgeLabelRenderer,
	type EdgeProps,
	getSmoothStepPath,
	Position,
	useReactFlow,
} from "@xyflow/react";
import type { CSSProperties } from "react";
import { useState } from "react";
import type { WorkflowJsonEdge } from "./types";

export default function DataEdge({
	id,
	sourceX,
	sourceY,
	targetX,
	targetY,
	data,
	markerEnd,
}: EdgeProps<WorkflowJsonEdge>) {
	const [inputValue, setInputValue] = useState(data?.input || "");

	// Optional: store input somewhere in ReactFlow context
	const { setEdges } = useReactFlow();

	const [edgePath, labelX, labelY] = getSmoothStepPath({
		sourceX,
		sourceY,
		sourcePosition: Position.Right,
		targetX,
		targetY,
		targetPosition: Position.Left,
	});

	return (
		<>
			<path
				id={id}
				className="react-flow__edge-path"
				d={edgePath}
				markerEnd={markerEnd}
			/>
			<EdgeLabelRenderer>
				<div
					style={
						{
							transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
							pointerEvents: "all",
							padding: 4,
							borderRadius: 6,
							minWidth: 200,
						} as CSSProperties
					}
					className="border-cyan-500 border p-8 absolute bg-white"
				>
					<div className="flex">
						<div className="flex items-center gap-2">
							<button
								type="button"
								aria-label="Delete edge"
								onClick={() =>
									setEdges((eds) => eds.filter((e) => e.id !== id))
								}
								className="text-red-600 hover:text-red-800 ml-auto"
								title="Delete"
							>
								×
							</button>
						</div>
						<div className="flex flex-col">
							<label className="mr-2 font-semibold" htmlFor="">
								{/* Condition Input: */}
							</label>
							<input
								type="text"
								value={inputValue}
                className="w-full"
								onChange={(e) => {
									setInputValue(e.target.value);
									// Optionally, persist input to edge's data!
									setEdges((eds) =>
										eds.map((ed) =>
											ed.id === id
												? { ...ed, data: { ...ed.data, input: e.target.value } }
												: ed,
										),
									);
								}}
								placeholder="Conditional Input"
							/>
						</div>
					</div>
				</div>
			</EdgeLabelRenderer>
		</>
	);
}
