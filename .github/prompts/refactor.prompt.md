---
description: "Refactor selected code safely with minimal, behavior-preserving changes"
name: "Refactor Safely"
argument-hint: "Refactor goal and constraints (for example: reduce duplication, keep API unchanged)"
agent: "agent"
model: "GPT-5 (copilot)"
---
Refactor the selected code to meet this goal:

`${input:goal}`

Requirements:
- Preserve runtime behavior unless explicitly asked to change it.
- Do not make incidental UX or copy/text changes unless explicitly requested.
- Prefer small, reversible edits over broad rewrites.
- Keep existing public interfaces stable unless the request explicitly allows API changes.
- Follow the codebase conventions already present in nearby files.
- Avoid unrelated cleanup.

Process:
1. Identify the current structure and likely pain points tied to the goal.
2. Apply targeted refactors (extract functions, simplify conditionals, reduce duplication, improve naming).
3. Re-check for edge cases and potential regressions introduced by the refactor.
4. If tests exist for the touched area, update or add only the minimal tests needed.

Output format:
1. Summary of what changed and why.
2. Risks or behavior assumptions.
3. Validation steps run (or not run).
4. Optional follow-up refactors that were intentionally deferred.
