import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import { useReactFlow, Handle, Position, getSmoothStepPath, BaseEdge, EdgeLabelRenderer, applyNodeChanges, applyEdgeChanges, addEdge, ReactFlow } from "@xyflow/react";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState, useEffect } from "react";
import { v4 } from "uuid";
import { u as useWorkflowStore } from "./workflow-store-tVM9Cs8c.js";
import "zustand";
import "zustand/middleware";
function ConditionNode({
  data,
  isConnectable,
  id
}) {
  const { setNodes, setEdges } = useReactFlow();
  const onChange = useCallback(
    (evt) => {
      setNodes(
        (eds) => eds.map(
          (ed) => ed.id === id ? { ...ed, data: { ...ed.data, input: evt.target.value } } : ed
        )
      );
    },
    [id, setNodes]
  );
  useCallback(() => {
    setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
  }, [id, setEdges]);
  const removeIncomingEdges = useCallback(
    (event) => {
      event.stopPropagation();
      setEdges((es) => es.filter((e) => e.target !== id));
    },
    [id, setEdges]
  );
  const removeOutgoingEdges = useCallback(
    (event) => {
      event.stopPropagation();
      setEdges((es) => es.filter((e) => e.source !== id));
    },
    [id, setEdges]
  );
  const removeNode = useCallback(
    (event) => {
      event.stopPropagation();
      setNodes((nds) => nds.filter((node) => node.id !== id));
      setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    },
    [id, setNodes, setEdges]
  );
  return /* @__PURE__ */ jsxs("div", { className: "text-updater-node border border-cyan-500 bg-cyan-100 p-4 rounded-md shadow-sm", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: removeIncomingEdges,
        title: "Click to remove all incoming edges",
        className: "cursor-pointer",
        type: "button",
        children: /* @__PURE__ */ jsx(
          Handle,
          {
            type: "target",
            position: Position.Left,
            isConnectable
          }
        )
      }
    ),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "text", className: "block text-xs text-gray-500", children: "Add Condition" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          name: "text",
          type: "text",
          onChange,
          className: "nodrag border rounded px-1"
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: removeNode,
        title: "Remove this node",
        className: "ml-2 px-2 py-1 mt-2 bg-red-500 text-white rounded hover:bg-red-600 size-8",
        type: "button",
        children: "X"
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: removeOutgoingEdges,
        title: "Click to remove all incoming edges",
        className: "cursor-pointer",
        type: "button",
        children: /* @__PURE__ */ jsx(
          Handle,
          {
            type: "source",
            position: Position.Right,
            isConnectable
          }
        )
      }
    )
  ] });
}
function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY
}) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Right,
    targetX,
    targetY,
    targetPosition: Position.Left
  });
  return /* @__PURE__ */ jsx(
    BaseEdge,
    {
      id,
      path: edgePath,
      onClick: (e) => {
        e.stopPropagation();
        setEdges((prev) => {
          return prev.filter((item) => item.id !== id);
        });
      }
    }
  );
}
function CustomNode({
  isConnectable,
  id,
  data
}) {
  const { setEdges, setNodes } = useReactFlow();
  const removeNode = useCallback(
    (event) => {
      event.stopPropagation();
      setNodes((nds) => nds.filter((node) => node.id !== id));
      setEdges((es) => es.filter((e) => e.source !== id && e.target !== id));
    },
    [id, setNodes, setEdges]
  );
  const onChange = useCallback(
    (event) => {
      const text = event.target.value;
      setNodes(
        (nds) => nds.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              data: {
                ...node.data,
                label: text
              }
            };
          }
          return node;
        })
      );
    },
    [id, setNodes]
  );
  const removeIncomingEdges = useCallback(
    (event) => {
      event.stopPropagation();
      setEdges((es) => es.filter((e) => e.target !== id));
    },
    [id, setEdges]
  );
  const removeOutgoingEdges = useCallback(
    (event) => {
      event.stopPropagation();
      setEdges((es) => es.filter((e) => e.source !== id));
    },
    [id, setEdges]
  );
  return /* @__PURE__ */ jsxs("div", { className: "text-updater-node border border-emerald-500 p-4 rounded-md bg-white shadow-sm", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: removeIncomingEdges,
        title: "Click to remove all incoming edges",
        className: "cursor-pointer",
        type: "button",
        children: /* @__PURE__ */ jsx(
          Handle,
          {
            type: "target",
            position: Position.Left,
            isConnectable
          }
        )
      }
    ),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "text", className: "block text-xs text-gray-500", children: "Workflow Stage" }),
      /* @__PURE__ */ jsx(
        "input",
        {
          name: "text",
          onChange,
          className: "nodrag border rounded px-1"
        }
      )
    ] }),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: removeNode,
        title: "Remove this node",
        className: "ml-2 size-8 px-2 mt-2 py-1 bg-red-500 text-white rounded hover:bg-red-600",
        type: "button",
        children: "X"
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: removeOutgoingEdges,
        title: "Click to remove all incoming edges",
        className: "cursor-pointer",
        type: "button",
        children: /* @__PURE__ */ jsx(
          Handle,
          {
            type: "source",
            position: Position.Right,
            isConnectable
          }
        )
      }
    )
  ] });
}
function DataEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd
}) {
  const [inputValue, setInputValue] = useState(data?.input || "");
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Right,
    targetX,
    targetY,
    targetPosition: Position.Left
  });
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "path",
      {
        id,
        className: "react-flow__edge-path",
        d: edgePath,
        markerEnd
      }
    ),
    /* @__PURE__ */ jsx(EdgeLabelRenderer, { children: /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          pointerEvents: "all",
          padding: 4,
          borderRadius: 6,
          minWidth: 200
        },
        className: "border-cyan-500 border p-8 absolute bg-white",
        children: /* @__PURE__ */ jsxs("div", { className: "flex", children: [
          /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              "aria-label": "Delete edge",
              onClick: () => setEdges((eds) => eds.filter((e) => e.id !== id)),
              className: "text-red-600 hover:text-red-800 ml-auto",
              title: "Delete",
              children: "×"
            }
          ) }),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col", children: [
            /* @__PURE__ */ jsx("label", { className: "mr-2 font-semibold", htmlFor: "" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                type: "text",
                value: inputValue,
                className: "w-full",
                onChange: (e) => {
                  setInputValue(e.target.value);
                  setEdges(
                    (eds) => eds.map(
                      (ed) => ed.id === id ? { ...ed, data: { ...ed.data, input: e.target.value } } : ed
                    )
                  );
                },
                placeholder: "Conditional Input"
              }
            )
          ] })
        ] })
      }
    ) })
  ] });
}
function EndNode({ isConnectable }) {
  return /* @__PURE__ */ jsxs("div", { className: "text-updater-node border border-emerald-500 p-4 bg-white shadow-sm rounded-full", children: [
    /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("label", { htmlFor: "text", className: "block text-xs text-gray-500", children: "End" }) }),
    /* @__PURE__ */ jsx(
      Handle,
      {
        type: "target",
        position: Position.Left,
        isConnectable
      }
    )
  ] });
}
function StartNode({
  isConnectable
}) {
  return /* @__PURE__ */ jsxs("div", { className: "text-updater-node border border-emerald-500 p-4 rounded-full bg-white shadow-sm", children: [
    /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx("label", { htmlFor: "text", className: "block text-xs text-gray-500", children: "Start" }) }),
    /* @__PURE__ */ jsx(
      Handle,
      {
        type: "source",
        position: Position.Right,
        isConnectable
      }
    )
  ] });
}
const edgeTypes = {
  "data-edge": DataEdge,
  "custom-edge": CustomEdge
};
const nodeTypes = {
  "custom-node": CustomNode,
  "start-node": StartNode,
  "end-node": EndNode,
  "condition-node": ConditionNode
};
const defaultStartNode = {
  id: "start",
  type: "start-node",
  position: { x: 50, y: 50 },
  data: { label: "Start" },
  // Only source handle
  sourcePosition: Position.Right
};
const defaultEndNode = {
  id: "end",
  type: "end-node",
  position: { x: 600, y: 50 },
  data: { label: "End" },
  // Only target handle
  targetPosition: Position.Left
};
const firstDefaultNode = {
  id: "first-default",
  type: "custom-node",
  position: { x: 300, y: 50 },
  data: { label: "First Default Node" }
};
function WorkflowCanvas({
  instanceId,
  workflowJson
}) {
  const navigate = useNavigate();
  const [nodes, setNodes] = useState([
    defaultStartNode,
    firstDefaultNode,
    ...workflowJson.nodes,
    defaultEndNode
  ]);
  const [edges, setEdges] = useState([
    {
      id: "e-start-to-first",
      source: "start",
      target: firstDefaultNode.id,
      type: "custom-edge",
      animated: true
    },
    ...workflowJson.edges
  ]);
  const addWorkflow = useWorkflowStore((s) => s.addWorkflow);
  const [showJson, setShowJson] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveError, setSaveError] = useState(null);
  const onNodesChange = useCallback(
    (changes) => {
      const filteredChanges = changes.filter(
        (change) => !(change.type === "remove" && (change.id === "start" || change.id === "end"))
      );
      setNodes(
        (nodesSnapshot) => applyNodeChanges(filteredChanges, nodesSnapshot)
      );
    },
    []
  );
  const onEdgesChange = useCallback(
    (changes) => setEdges((edgesSnapshot) => applyEdgeChanges(changes, edgesSnapshot)),
    []
  );
  const onConnect = useCallback((params) => {
    if (params.target === "start" || params.source === "end") return;
    setEdges(
      (edgesSnapshot) => addEdge(
        { ...params, animated: true, type: "custom-edge" },
        edgesSnapshot
      )
    );
  }, []);
  useEffect(() => {
    console.log({ nodes, edges });
  }, [nodes, edges]);
  const handleSave = () => {
    try {
      setSaveError(null);
      addWorkflow(saveName, { nodes, edges }, { sourceInstanceId: instanceId });
      setSaveName("");
      navigate({ to: "/loan" });
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Unable to save workflow"
      );
    }
  };
  return /* @__PURE__ */ jsxs("div", { className: "w-80vw h-200 border border-cyan-500", children: [
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: (_) => {
          setNodes((prev) => [
            ...prev,
            {
              id: v4(),
              type: "custom-node",
              position: { x: 0, y: 0 },
              data: { label: "New Node" }
            }
          ]);
        },
        children: "Add"
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        onClick: (_) => {
          setNodes((prev) => [
            ...prev,
            {
              id: v4(),
              type: "condition-node",
              position: { x: 0, y: 0 },
              data: { label: "New Node" }
            }
          ]);
        },
        children: "Add Condition"
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        className: "ml-2 px-2 py-1 border rounded",
        onClick: () => setShowJson((v) => !v),
        children: showJson ? "Show Canvas" : "Show JSON"
      }
    ),
    /* @__PURE__ */ jsxs("div", { className: "mt-2 flex items-center gap-2", children: [
      /* @__PURE__ */ jsx(
        "input",
        {
          type: "text",
          className: "border px-2 py-1 rounded",
          placeholder: "Workflow name",
          value: saveName,
          onChange: (e) => setSaveName(e.target.value)
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: handleSave,
          className: "px-3 py-1 bg-blue-600 text-white rounded",
          children: "Save Workflow"
        }
      ),
      saveError ? /* @__PURE__ */ jsx("span", { className: "text-sm text-red-600", children: saveError }) : null
    ] }),
    showJson ? /* @__PURE__ */ jsx("div", { className: "mt-2 h-full overflow-auto bg-gray-50 p-2", children: /* @__PURE__ */ jsx("pre", { className: "text-xs", children: JSON.stringify({ nodes, edges }, null, 2) }) }) : /* @__PURE__ */ jsx(
      ReactFlow,
      {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        edgeTypes,
        nodeTypes,
        fitView: true,
        style: { width: "100%", height: "100%" }
      }
    )
  ] });
}
function Workflow() {
  return /* @__PURE__ */ jsx(
    WorkflowCanvas,
    {
      instanceId: "TEsting",
      workflowJson: {
        edges: [],
        nodes: []
      }
    }
  );
}
export {
  Workflow as component
};
