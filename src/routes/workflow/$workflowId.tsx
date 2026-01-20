import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useWorkflowStore } from "@/lib/workflow-store";

export const Route = createFileRoute("/workflow/$workflowId")({
  component: WorkflowDetailPage,
});

function WorkflowDetailPage() {
  const { workflowId } = Route.useParams();
  const workflows = useWorkflowStore((s) => s.workflows);

  const workflow = useMemo(
    () => (workflowId ? workflows[workflowId] : undefined),
    [workflowId, workflows],
  );

  if (!workflow) {
    return <div>Workflow not found</div>;
  }

  return (
    <div className="p-6 font-sans max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{workflow.name}</h1>
          <p className="text-sm text-gray-700">{workflow.workflowId}</p>
        </div>
        <Link
          to="/workflow"
          className="text-sm border px-3 py-2 rounded hover:bg-gray-50"
        >
          &larr; Back to list
        </Link>
      </div>

      <div className="mt-4 bg-gray-100 p-4 rounded">
        <h2 className="text-lg font-semibold mb-2">Workflow JSON</h2>
        <pre className="text-xs overflow-auto">
          {JSON.stringify(workflow.workflow, null, 2)}
        </pre>
      </div>
    </div>
  );
}
