import { createFileRoute } from "@tanstack/react-router";
import type { WorkflowJSON } from "@/components/workflow/types";
import WorkflowCanvas from "@/components/workflow/WorkflowCanvas";

export const Route = createFileRoute("/workflow")({
	component: Workflow,
});

function Workflow() {
	const workflowJson: WorkflowJSON = {
		nodes: [
			{
				id: "CUSTOMER_APPLY",
				position: { x: 10, y: 10 },
				data: {
					label: "Customer Apply",
					actor: "CUSTOMER",
					status: "PENDING",
				},
			},
			{
				id: "BRANCH_REVIEW",
				position: { x: 100, y: 10 },
				data: {
					label: "Branch Review",
					actor: "BRANCH",
					status: "PENDING",
				},
			},
			{
				id: "RM_REVIEW",
				position: { x: 200, y: 10 },

				data: {
					label: "RM Review",
					actor: "RELATIONSHIP_MANAGER",
					status: "PENDING",
				},
			},
			{
				id: "OPERATOR_PROCESS",
				position: { x: 300, y: 10 },

				data: {
					label: "Operator Process",
					actor: "OPERATOR",
					status: "PENDING",
				},
			},
			{
				position: { x: 400, y: 10 },

				id: "CHECKER_APPROVAL",
				data: {
					label: "Checker Approval",
					actor: "CHECKER",
					status: "PENDING",
				},
			},
			{
				id: "APPROVED",
				position: { x: 500, y: 10 },

				data: {
					label: "Approved",
					actor: "SYSTEM",
					status: "PENDING",
				},
			},
			{
				position: { x: 600, y: 10 },

				id: "REJECTED",
				data: {
					label: "Rejected",
					actor: "SYSTEM",
					status: "PENDING",
				},
			},
			{
				id: "REQUIRED_DOCUMENT",
				position: { x: 1000, y: 10 },
				data: {
					label: "Requried Document",
					actor: "SYSTEM",
					status: "PENDING",
				},
			},
			{
				id: "BRANCH_REVIEW",
				position: { x: 800, y: 10 },

				data: {
					label: "Branch Review",
					actor: "BRANCH",
					status: "PENDING",
				},
			},
		],
		edges: [
			{
				source: "CUSTOMER_APPLY",
				target: "BRANCH_REVIEW",
				id: "testing",
				data: {
					condition: "ALWAYS",
				},
			},
			{
				source: "CUSTOMER_APPLY",
				target: "RM_REVIEW",
				id: "d;alskjfd",
				data: {
					condition: "loanAmount>=5000000",
				},
			},
			{
				source: "REQUIRED_DOCUMENT",
				target: "RM_REVIEW",
				id: "a;slkdfj",
				data: {
					condition: "Bwahahah",
				},
			},
			{
				target: "RM_REVIEW",
				source: "BRANCH_REVIEW",
				id: "testing",
				data: {
					condition: "branchDecision==APPROVE",
					input: "",
				},
			},
			{
				source: "RM_REVIEW",
				target: ["OPERATOR_PROCESS", "CHECKER_APPROVAL"],
				data: {
					condition: "loanAmount>=5000000",
				},
			},
			{
				target: ["OPERATOR_PROCESS", "CHECKER_APPROVAL"],
				source: "APPROVED",
				data: {
					condition: "ALL_COMPLETED",
				},
			},
		],
	};

	return (
		<WorkflowCanvas
			instanceId={"TEsting"}
			// workflowJson={WorkflowJson as unknown as WorkflowJSON}
			// workflowJson={workflowJson}
			workflowJson={{
				edges: [],
				nodes: [],
			}}
		/>
	);
}
