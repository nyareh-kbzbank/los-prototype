# Business Logic Overview

## Domain Areas

- Loan workflow builder (React Flow)
- Loan setup snapshots (product + channel + scorecard + workflow + repayment)
- Scorecards and score evaluation
- Loan applications and workflow progress

## Workflow Builder

Source: src/components/workflow/WorkflowCanvas.tsx

- Graph uses custom nodes/edges with React Flow.
- Start/end nodes are seeded when the graph is empty.
- Disallow connections into start or out of end.
- Prevent deletion of start/end nodes.
- Default edges are animated and use type "custom-edge".
- Save persists via the workflow store and navigates back to /workflow.

Custom nodes/edges:

- Start/End nodes only expose source/target handles.
- ConditionNode carries data.input and exposes edge removal controls.
- CustomNode supports rename/remove and prunes related edges.
- CustomEdge deletes itself on click.
- DataEdge displays data.input.

## Workflow Persistence

Source: src/lib/workflow-store.ts

- Store key: loan-workflows.
- addWorkflow trims/validates name, generates workflowId, and auto-selects.
- updateWorkflow enforces trimmed names; no-op if workflowId missing.
- getWorkflowList sorts by name then createdAt.

## Loan Setup Snapshots

Source: src/lib/loan-setup-store.ts

- Store key: loan-workflow-setups.
- addSetup trims channel codes and drops empty channel entries.
- Document requirements are normalized:
  - Deduped by lowercase key.
  - DOC- prefix enforced.
  - Defaults to NRC and PAYSLIP if none provided.
- Interest rate plans are cloned and normalized; default plan created if missing.
- Captures scorecard/workflow IDs and names, repayment plan info, and bureau flags.
- Stores loan security type; secured loans auto-add DOC-COLLATERAL to every risk grade and require it regardless of risk grade.
- Persists selected custom EMI type details (id, name, formulas) and custom field values.
- updateSetup re-normalizes inputs and preserves existing document requirements if none provided.

## Scorecards

Source: src/lib/scorecard-store.ts

- Store key: loan-scorecard with seeded defaultScoreCard.
- Normalization humanizes field descriptions and forces rules to use the field key.
- Legacy flat rules are grouped into fields if detected.
- removeScoreCard restores default if the last card is removed.

## Score Engine

Source: src/lib/scorecard-engine.ts

- Infers field types from operators.
- Parses numeric and boolean inputs.
- Skips missing values (no match).
- Caps total score at maxScore.
- Maps to riskGrade and a minimal documents list.

## Loan Applications

Source: src/lib/loan-application-store.ts

- Store key: loan-applications.
- addApplication:
  - Trims string fields.
  - Clamps numeric fields to non-negative values.
  - Generates applicationNo as `${productCode}-${Date.now().toString(36).toUpperCase()}`.
  - Initializes workflow history and bureau metadata.
- updateStatus updates status and updatedAt timestamp.
- advanceWorkflowStage appends history and blocks regressions.
- resetWorkflowProgress clears history and sets stage index to -1.

## Routes That Orchestrate Business Logic

- Loan setup orchestration: src/routes/loan/setup/index.tsx
- Workflow list/build/detail:
  - src/routes/workflow/index.tsx
  - src/routes/workflow/setup.tsx
  - src/routes/workflow/$workflowId.tsx
- Loan applications:
  - src/routes/loan/applications/create.tsx
  - src/routes/loan/applications/index.tsx
  - src/routes/loan/applications/$applicationId.tsx

Loan application create flow details:

- Step 1 prioritizes quick eligibility inputs first: beneficiary name, age, monthly income, and requested amount.
- Step 1 shows a payment schedule preview using the loan setup's custom EMI formula (if configured).
- Step 1 also shows an estimated eligible amount derived from an affordability rule (`50%` of monthly income as EMI capacity), then caps by product max amount.
- Remaining fields (identity, channel/disbursement, bureau details, notes) are grouped under a separate Additional details section.

## Custom EMI Calculator

Source: src/routes/loan/emi-custom-calculator.tsx

- Supports custom EMI types with user-defined principal and interest formulas.
- Formula parser supports operators `+`, `-`, `*`, `/`, `^` and functions `min`, `max`, `abs`, `round`, `floor`, `ceil`, `pow`, `sqrt`, `log`, `exp`.
- Calculation runs from an explicit snapshot (`calculationSnapshot`) to avoid partial edits affecting in-progress results.
- Base EMI is computed with standard reducing-balance logic and exposed to formulas as `baseEmi`.
- Loan setup can load saved custom EMI types, preview EMI totals, and persist the selected type + field values.

Schedule behavior:

- Input includes `startDateIso` and `paymentScheduleType`.
- `fixed-day`: each period uses the same day-of-month as start date (clamped to month length when needed).
- `month-end`: first period date is the current month's end from the start date; subsequent periods use following month-ends.
- For `month-end`, if start date day is greater than 15, UI allows choosing first payment on this month-end or next month-end.
- `daily-accrual`: first period date is the selected start date, then monthly anchors continue; effective period rate uses actual day count between period dates.

Daily accrual details:

- `daysInPeriod` is derived from UTC-safe day difference between consecutive schedule dates.
- `ratePeriod` is computed as `annualRate * daysInPeriod / 365`.
- Formula context maps `rateMonthly` to `ratePeriod` under daily accrual so existing formulas continue to work.

Formula context (core fields):

- `principal`, `balance`, `rateMonthly`, `rateAnnual`
- `rateDaily`, `ratePeriod`, `daysInPeriod`
- `period`, `tenureMonths`, `remainingMonths`
- `baseEmi`, `prevPayment`, `prevPrincipal`, `prevInterest`

Validation rules:

- Start date must parse as a valid date.
- Principal and tenure months must be positive.
- Selected custom type must exist and include non-empty principal/interest formulas.
- Custom field keys must match `[A-Za-z_][A-Za-z0-9_]*` and should be unique for predictable formula behavior.
