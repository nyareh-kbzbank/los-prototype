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

## V2 Loan Setup Page

Sources:

- src/routes/solution/v2/loan-setup.tsx
- src/components/loan/v2/*

- V2 setup is a separate page/flow from the main loan setup route and should be treated as an independent implementation.
- V2 may reference logic and UI patterns from `src/routes/loan/setup/index.tsx` and related components for consistency.
- Referencing does not imply coupling: changes in V2 should not directly alter main loan setup unless explicitly requested.
- Current V2 step order is: **Product Setup** → **Interest Setup** → **Repayment Setup** → **Credit Score Engine** → **Document Rule** → **Decision Rule** → **Disbursement Setup**.
- V2 uses a sidebar stepper; each step is edited inline in the same page flow.
- V2 step 2 is an **Interest Setup** section that configures interest rate plans.
- Interest setup includes the same plan fields as the main setup interest section: interest type, rate type, base rate, parameter overrides, and policies.
- V2 Interest Setup also persists its own custom interest formula configuration (principal formula, interest formula, and custom field definitions) independently from repayment setup.
- For backward compatibility, older V2 snapshots hydrate the new interest formula state from the formula data previously stored under repayment setup.
- V2 Interest Setup intentionally does not use an accordion; all fields are always visible in this step.
- V2 Interest Setup allows multiple interest plans to be added and removed within the same setup snapshot.
- V2 step 3 is a **Repayment Setup** section inserted between Interest Setup and Credit Score Engine.
- V2 Repayment Setup is local to the V2 flow (not reusable/global), so it does not include reusable plan naming or saved-plan config selection.
- V2 Repayment Setup also includes inline custom formula fields based on the Custom EMI calculator format (principal formula, interest formula, and custom field definitions).
- V2 Repayment Setup custom formula includes a **Test Calculate** action that opens a dialog for sample input values and displays installment/interest/payment output from the configured formulas.
- V2 Repayment Setup references repayment fields from the main repayment setup flow but is configured only for the current V2 setup session.
- V2 step 4 is a **Credit Score Engine** section that keeps scorecard setup and bureau settings in the same step.
- Credit Score Engine behavior in V2 includes table-based rule editing, a sample calculation modal, and no raw JSON preview panel.
- V2 Credit Score Engine includes a **Risk Grade Definition** section where users can configure minimum score thresholds for `LOW`, `MEDIUM`, and `HIGH` risk grades.
- Sample calculation in V2 applies the configured thresholds when displaying risk grade outcomes.
- V2 step 5 is a **Document Rule** section that reuses the existing document-requirements configuration pattern from the main loan setup flow.
- V2 Document Rule maps required documents by risk grade and starts with default required documents for `LOW` risk.
- In V2 Document Rule, when loan security is set to `SECURED`, collateral (`DOC-COLLATERAL`) is automatically enforced as `isMandatory=true` and `collateralRequired=true` for all configured risk grades.
- In V2 Product Setup, when `loanSecurity` is `SECURED`, additional collateral controls are required: collateral type, minimum collateral value, maximum LTV percentage, haircut percentage, valuation-required toggle, and valuation-validity days (when valuation is required).
- V2 Product Setup for secured loans also includes a **Run Test** dialog that evaluates sample loan amount/collateral value (and valuation age, when applicable) against the configured minimum collateral, LTV limit, haircut-adjusted collateral value, and valuation-validity rules.
- V2 Product Setup allows `maxAmount` to be configured as either a `FLAT` value or a `PERCENTAGE` rate (`maxAmountRateType`) to support product-specific maximum-amount interpretation.
- V2 step 6 is a **Decision Rule** section where users can configure decision outcomes (`AUTO_APPROVE`, `MANUAL_REVIEW`, `AUTO_REJECT`) using conditional rules.
- Decision rules support flexible key fields (for example `creditScore`, `riskGrade`, and other custom fields) with operators and values.
- Decision Rule setup also keeps a default mapping by risk grade as a fallback outcome.
- V2 step 7 is a **Disbursement Setup** section.
- Disbursement Setup supports `Single` and `Multiple` disbursement types:
  - `Single` auto-enforces “Release full amount at once”.
  - `Multiple` enables tranche configuration with columns: Tranche, Amount, Trigger Type, and Timing Meaning.
- Tranche timing meaning supports `Immediate` and `Based on milestone`.
- Disbursement Setup includes method selection (`Bank Transfer`, `Wallet`, `Cash`, `Pay to Merchant`) and fee inputs (`Processing Fee`, `Disbursement Fee`).
- In V2, clicking **Completed** on the final step saves a setup snapshot into a dedicated V2 store (`loan-workflow-setups-v2`) that is separate from the V1 loan setup list/store.
- V2 saved setups are shown on a separate page (`/solution/v2/loan-setup/list`) and are not mixed with the V1 list route (`/loan`).
- V2 saved setup lists at `/solution/v2/list` and `/solution/v2/loan-setup/list` expose row-level `Edit` and `Delete` actions against the same V2 snapshot store.
- `Edit` opens the existing V2 setup wizard with the selected snapshot hydrated into all steps, and final submit updates the same snapshot instead of creating a new one.
- V2 edit hydration includes the full Decision Rule setup state, including configured conditional rules, not only the fallback risk-grade action map.
- `Delete` removes the selected V2 setup snapshot from `loan-workflow-setups-v2` after confirmation.
- V2 `Completed` persistence now captures data from all tabs in the same snapshot: Product Setup, Interest Setup, Repayment Setup (including custom formula config), Credit Score Engine setup (scorecard + risk thresholds), Document Rule mappings, Decision Rule mapping, and Disbursement Setup.
- V2 has a dedicated application-create flow at `/solution/v2/loan-applications/create` that reads from the V2 setup store (`loan-workflow-setups-v2`) rather than the V1 setup store.
- The V2 application form derives product constraints (amount range, tenor options), channel/workflow references, bureau requirements, risk score inputs/grade (from V2 scorecard + thresholds), and required document uploads from the selected V2 setup snapshot.
- V2 application listing is now separated from V1: `/solution/v2/loan-applications` shows only applications created from V2 setup snapshots and is independent from `/loan/applications`.
- V2 application detail is also separated from V1: V2 list rows navigate to `/solution/v2/loan-applications/$applicationId`, while V1 detail remains under `/loan/applications/$applicationId`
- V2 application creation now uses the workflow linked to the **selected channel code** in V2 channel configuration, not the first available channel workflow.
- V2 has separate role inboxes for manual-review stages:
  - Maker inbox: `/solution/v2/loan-applications/maker-inbox`
  - Checker inbox: `/solution/v2/loan-applications/checker-inbox`
- V2 maker/checker inboxes and detail pages operate only on V2 applications (applications whose `setupId` exists in the V2 setup store).
- V2 maker/checker detail pages execute transitions from the linked saved workflow graph (from `loan-workflows`) rather than fixed action buttons.
- Workflow transitions are resolved from the current stage node to outgoing condition branches and next stage/end targets; action button labels come from condition input values.
- Queue status is derived from workflow transition outcome:
  - transition to a stage label containing `checker` → `CHECKER_PENDING`
  - transition to any other non-terminal stage → `SUBMITTED`
  - transition to `end` with reject-like action label (`reject`/`decline`/`deny`/`fail`) → `REJECTED`; otherwise `APPROVED`
- V2 application creation initializes workflow stage history at the linked workflow's first reachable custom stage after `start` when initial status is manual review (`SUBMITTED`).
- The V2 application form now renders any non-native scorecard fields directly from the selected setup's Credit Score Engine configuration, requires those values before score evaluation, and uses the resulting credit score plus threshold-based risk grade to determine which document uploads are required.
- For V2 scorecard matching, core scoring inputs are normalized to align with setup keywords: `age`, `gender` (`male`/`female`), `maritalstatus` (`single`/`married`/`divorced`), `education` (`graduate`/`under graduate`), `dti`, `income`, and `isburaeucheck` (`true`/`false`).
- The V2 application page installment preview uses the saved V2 repayment setup directly: repayment frequency and due-day rules come from the setup, while amount, tenure, start date, and custom formula field values come from the application page inputs.
- The V2 application form also captures applicant `gender`, `marital status`, `education`, and `income`; it derives `DTI` in the background from the selected product's repayment preview and income, and passes all of these into scorecard evaluation when the chosen product's scorecard references those fields.

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

## Advanced Score Engine Setup

Sources:

- src/routes/loan/scorecard-setup-advanced.tsx
- src/lib/scorecard-engine-advanced.ts

- Runs in a separate setup page and does not modify the original scorecard setup flow.
- Reuses saved scorecards, but evaluates with advanced formulas:
  - FICO weighted score: payment history 35%, credit utilization 30%, credit history length 15%, credit mix 10%, new credit 10%.
  - Technical scaling fallback: raw matched score scaled by max rule score per field to scorecard max.
  - Credit utilization derivation: (creditBalance / creditLimit) * 100 when direct utilization input is absent.
  - ECL: PD × LGD × EAD × discountFactor (with PD/LGD decimal-or-percent normalization).

## Loan Applications

Source: src/lib/loan-application-store.ts

- Store key: loan-applications.
- addApplication:
  - Trims string fields.
  - Clamps numeric fields to non-negative values.
  - Generates applicationNo as `${productCode}-${Date.now().toString(36).toUpperCase()}`.
  - Initializes workflow history and bureau metadata.
  - Re-evaluates scorecard risk grade from current application inputs at submit time (does not rely on setup snapshot risk grade) and sets initial status:
    - `LOW` risk grade → `APPROVED` (auto-approved)
    - `HIGH` risk grade → `REJECTED` (auto-rejected)
    - `MEDIUM` or missing risk grade → `SUBMITTED` (manual review)
- Manual review queue flow:
  - `SUBMITTED` applications appear in Maker Inbox.
  - `CHECKER_PENDING` applications appear in Checker Inbox.
  - For V2 flows, maker/checker actions are workflow-driven from the linked graph's current stage transitions (not hardcoded).
  - Transition target stage determines queue status (`SUBMITTED` for non-checker stages, `CHECKER_PENDING` for checker stages).
  - End-node transitions determine final status (`APPROVED` or `REJECTED`) using transition label semantics.
  - Checker-to-maker loopbacks are supported through workflow transitions and are captured in decision history as `Returned to maker`.
  - `REJECTED` is source-aware in decision history:
    - Auto-rejected from setup decision engine is system-driven.
    - Rejected by maker/checker is manual-review-driven and tracked with actor + transition.
  - Application list displays auto outcomes as `Auto-Approved` / `Auto-Rejected` to distinguish them from maker/checker `APPROVED` / `REJECTED`.
  - Application detail shows maker/checker workflow history from these transitions.
  - Auto-approved and auto-rejected applications show no maker/checker workflow history.
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
- Risk/status and required-document determination are deferred until required application inputs are filled in Step 1.
- Step 1 also shows an estimated eligible amount derived from an affordability rule (`50%` of monthly income as EMI capacity), then caps by product max amount.
- Remaining fields (identity, channel/disbursement, bureau details, notes) are grouped under a separate Additional details section.
- In Additional details, disbursement destination drives required payout input:
  - `BANK` requires `bankAccountNo`.
  - `WALLET` (KPay flow) requires `phone`/`kpayPhoneNo`.

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

## Authentication and Role Access (Prototype)

Sources:

- src/lib/auth-store.ts
- src/routes/login.tsx
- src/routes/__root.tsx

- Authentication uses hardcoded prototype accounts stored client-side in Zustand persist state.
- Supported credentials:
  - `admin / admin123`
  - `customer / customer123`
- Login writes an auth session with `username` and `role` to local storage key `loan-auth-session`.
- Root route guard enforces authentication for all routes except `/login`.
- Role-based route access:
  - `admin` can access all existing setup/workflow/configuration pages and application routes.
  - `customer` can access home and loan application routes (`/loan/applications/*`) only.
- Unauthenticated users are redirected to `/login`.
- Authenticated users visiting `/login` are redirected to their role landing page:
  - `admin` → `/loan/setup`
  - `customer` → `/loan/applications/create`
