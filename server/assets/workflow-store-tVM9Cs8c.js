import { v4 } from "uuid";
import { create } from "zustand";
import { persist } from "zustand/middleware";
const useWorkflowStore = create()(
  persist(
    (set, get) => ({
      workflows: {},
      selectedWorkflowId: null,
      addWorkflow: (name, workflow, opts) => {
        const trimmed = name.trim();
        if (!trimmed) {
          throw new Error("Workflow name is required");
        }
        const next = {
          workflowId: v4(),
          name: trimmed,
          createdAt: Date.now(),
          workflow,
          sourceInstanceId: opts?.sourceInstanceId
        };
        set((prev) => ({
          workflows: { ...prev.workflows, [next.workflowId]: next },
          selectedWorkflowId: next.workflowId
        }));
        return next;
      },
      selectWorkflow: (workflowId) => set((prev) => {
        if (!workflowId) return { selectedWorkflowId: null };
        return prev.workflows[workflowId] ? { selectedWorkflowId: workflowId } : prev;
      }),
      resetStore: () => set({ workflows: {}, selectedWorkflowId: null })
    }),
    {
      name: "loan-workflows",
      version: 1,
      partialize: (state) => ({
        workflows: state.workflows,
        selectedWorkflowId: state.selectedWorkflowId
      })
    }
  )
);
function getWorkflowList(workflows) {
  return Object.values(workflows).sort((a, b) => {
    const byName = a.name.localeCompare(b.name);
    if (byName !== 0) return byName;
    return a.createdAt - b.createdAt;
  });
}
export {
  getWorkflowList as g,
  useWorkflowStore as u
};
