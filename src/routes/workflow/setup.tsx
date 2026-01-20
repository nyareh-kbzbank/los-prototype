import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";
import { useWorkflowStore } from "@/lib/workflow-store";

export const Route = createFileRoute("/workflow/setup")({
	component: Workflow,
});

function Workflow() {
	const selectedWorkflowId = useWorkflowStore((s) => s.selectedWorkflowId);
	const workflows = useWorkflowStore((s) => s.workflows);

	const selectedWorkflow = useMemo(() => {
		return selectedWorkflowId ? workflows[selectedWorkflowId] : null;
	}, [selectedWorkflowId, workflows]);

	const workflowJson = useMemo(() => {
		return selectedWorkflow
			? selectedWorkflow.workflow
			: { edges: [], nodes: [] };
	}, [selectedWorkflow]);

	return (
		<WorkflowCanvas
			instanceId={selectedWorkflow?.workflowId ?? "new-workflow"}
			workflowJson={workflowJson}
			initialName={selectedWorkflow?.name}
		/>
	);
}
