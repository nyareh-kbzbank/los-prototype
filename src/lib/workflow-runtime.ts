import type { WorkflowJsonEdge, WorkflowJsonNode } from "@/components/workflow/types";
import type { LoanApplication, LoanApplicationStatus } from "./loan-application-store";
import type { SavedWorkflow } from "./workflow-store";

export type WorkflowTransition = {
	id: string;
	label: string;
	nextStageId: string | null;
	nextStageLabel: string | null;
	isTerminal: boolean;
	nextStatus: LoanApplicationStatus;
};

export type WorkflowRuntime = {
	initialStageId: string | null;
	initialStageLabel: string | null;
	stageLabelById: Record<string, string>;
	transitionsByStageId: Record<string, WorkflowTransition[]>;
};

const REJECT_PATTERN = /(reject|decline|deny|fail)/i;
const CHECKER_PATTERN = /checker/i;

function getNodeLabel(node: WorkflowJsonNode) {
	const value = typeof node.data?.label === "string" ? node.data.label.trim() : "";
	return value || node.id;
}

function getConditionLabel(node: WorkflowJsonNode, edge: WorkflowJsonEdge) {
	const nodeInput = typeof node.data?.input === "string" ? node.data.input.trim() : "";
	const edgeInput = typeof edge.data?.input === "string" ? edge.data.input.trim() : "";
	return nodeInput || edgeInput || "Proceed";
}

function toNextStatus(input: {
	nextStageLabel: string | null;
	actionLabel: string;
	isTerminal: boolean;
}): LoanApplicationStatus {
	if (input.isTerminal) {
		return REJECT_PATTERN.test(input.actionLabel) ? "REJECTED" : "APPROVED";
	}
	if (input.nextStageLabel && CHECKER_PATTERN.test(input.nextStageLabel)) {
		return "CHECKER_PENDING";
	}
	return "SUBMITTED";
}

function toTitleCaseWords(value: string) {
	return value
		.split(" ")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

export function formatWorkflowActionLabel(rawLabel: string) {
	const trimmed = rawLabel.trim();
	if (!trimmed) return "Proceed";
	const normalized = trimmed.includes("=")
		? trimmed.split("=").at(-1) ?? trimmed
		: trimmed;
	const withSpaces = normalized.replaceAll(/[-_]/g, " ").trim();
	return toTitleCaseWords(withSpaces || "Proceed");
}

function resolveTransitionsFromEdge(
	edge: WorkflowJsonEdge,
	nodesById: Map<string, WorkflowJsonNode>,
	outgoingEdgesByNodeId: Map<string, WorkflowJsonEdge[]>,
	defaultLabel: string | null,
	depth: number,
): WorkflowTransition[] {
	if (depth > 8) return [];
	const target = nodesById.get(edge.target);
	if (!target) return [];

	if (target.type === "condition-node") {
		const conditionLabel = getConditionLabel(target, edge);
		const nestedEdges = outgoingEdgesByNodeId.get(target.id) ?? [];
		return nestedEdges.flatMap((nestedEdge) =>
			resolveTransitionsFromEdge(
				nestedEdge,
				nodesById,
				outgoingEdgesByNodeId,
				conditionLabel,
				depth + 1,
			),
		);
	}

	if (target.type === "custom-node") {
		const nextStageLabel = getNodeLabel(target);
		const label = defaultLabel ?? getConditionLabel(target, edge);
		return [
			{
				id: `${edge.id}:${target.id}:${label}`,
				label,
				nextStageId: target.id,
				nextStageLabel,
				isTerminal: false,
				nextStatus: toNextStatus({
					nextStageLabel,
					actionLabel: label,
					isTerminal: false,
				}),
			},
		];
	}

	if (target.type === "end-node") {
		const label = defaultLabel ?? "Complete";
		return [
			{
				id: `${edge.id}:end:${label}`,
				label,
				nextStageId: null,
				nextStageLabel: null,
				isTerminal: true,
				nextStatus: toNextStatus({
					nextStageLabel: null,
					actionLabel: label,
					isTerminal: true,
				}),
			},
		];
	}

	return [];
}

function getOutgoingEdgesByNodeId(edges: WorkflowJsonEdge[]) {
	const map = new Map<string, WorkflowJsonEdge[]>();
	for (const edge of edges) {
		const current = map.get(edge.source) ?? [];
		current.push(edge);
		map.set(edge.source, current);
	}
	return map;
}

function dedupeTransitions(transitions: WorkflowTransition[]) {
	const seen = new Set<string>();
	const output: WorkflowTransition[] = [];

	for (const transition of transitions) {
		const key = `${transition.label}:${transition.nextStageId ?? "END"}:${transition.nextStatus}`;
		if (seen.has(key)) continue;
		seen.add(key);
		output.push(transition);
	}

	return output;
}

export function createWorkflowRuntime(savedWorkflow: SavedWorkflow | null | undefined) {
	if (!savedWorkflow) return null;

	const nodes = savedWorkflow.workflow.nodes;
	const edges = savedWorkflow.workflow.edges;
	const nodesById = new Map(nodes.map((node) => [node.id, node]));
	const outgoingEdgesByNodeId = getOutgoingEdgesByNodeId(edges);
	const stageNodes = nodes.filter((node) => node.type === "custom-node");

	const stageLabelById: Record<string, string> = Object.fromEntries(
		stageNodes.map((node) => [node.id, getNodeLabel(node)]),
	);

	const transitionsByStageId: Record<string, WorkflowTransition[]> = {};
	for (const stageNode of stageNodes) {
		const outgoing = outgoingEdgesByNodeId.get(stageNode.id) ?? [];
		const transitions = outgoing.flatMap((edge) =>
			resolveTransitionsFromEdge(edge, nodesById, outgoingEdgesByNodeId, null, 0),
		);
		transitionsByStageId[stageNode.id] = dedupeTransitions(transitions);
	}

	const startNode = nodesById.get("start");
	const startOutgoing = startNode ? outgoingEdgesByNodeId.get(startNode.id) ?? [] : [];
	const initialTransitions = startOutgoing.flatMap((edge) =>
		resolveTransitionsFromEdge(edge, nodesById, outgoingEdgesByNodeId, null, 0),
	);
	const initialStageTransition = initialTransitions.find(
		(transition) => transition.nextStageId !== null,
	);
	const fallbackInitialStage = stageNodes[0] ?? null;
	const initialStageId =
		initialStageTransition?.nextStageId ??
		fallbackInitialStage?.id ??
		null;
	const initialStageLabel = initialStageId ? stageLabelById[initialStageId] ?? null : null;

	return {
		initialStageId,
		initialStageLabel,
		stageLabelById,
		transitionsByStageId,
	} satisfies WorkflowRuntime;
}

export function getCurrentWorkflowStageId(
	application: LoanApplication,
	runtime: WorkflowRuntime | null,
) {
	const current = application.workflowHistory.at(-1);
	if (current?.stageId) {
		return current.stageId;
	}
	return runtime?.initialStageId ?? null;
}

export function getWorkflowTransitionsForApplication(
	application: LoanApplication,
	runtime: WorkflowRuntime | null,
) {
	if (!runtime) return [];
	const currentStageId = getCurrentWorkflowStageId(application, runtime);
	if (!currentStageId) return [];
	return runtime.transitionsByStageId[currentStageId] ?? [];
}
