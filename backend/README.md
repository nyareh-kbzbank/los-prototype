# LOS Backend

A **.NET 10** backend for the Loan Origination System (LOS), built using **Clean Architecture** principles.

## Project Structure

```
backend/
├── src/
│   ├── Los.Domain/          # Domain layer — entities, enums, repository interfaces, domain services
│   ├── Los.Application/     # Application layer — CQRS handlers (MediatR), DTOs, DI
│   ├── Los.Infrastructure/  # Infrastructure layer — EF Core (SQLite), repository implementations
│   └── Los.Api/             # Presentation layer — ASP.NET Core Minimal API endpoints
└── tests/
    ├── Los.Domain.Tests/     # Domain unit tests (score engine, entity rules)
    └── Los.Application.Tests/ # Application unit tests (handlers, validators)
```

## Architecture

### Layers

| Layer | Project | Responsibility |
|-------|---------|----------------|
| **Domain** | `Los.Domain` | Core entities, business rules, repository interfaces, domain services |
| **Application** | `Los.Application` | CQRS commands/queries via MediatR, DTOs, orchestration |
| **Infrastructure** | `Los.Infrastructure` | EF Core DbContext, SQLite persistence, repository implementations |
| **API** | `Los.Api` | ASP.NET Core Minimal API endpoints, DI wiring |

### Repository Pattern

EF Core is fully encapsulated inside the `Los.Infrastructure` layer via the repository pattern:

- `IRepository<T>` — generic CRUD interface (in Domain)
- `Repository<T>` — EF Core generic implementation (in Infrastructure)
- Specific repositories (`IWorkflowRepository`, `ILoanApplicationRepository`, etc.) extend the generic interface

The Application layer only depends on repository interfaces, never on EF Core directly.

## Domain Entities

| Entity | Description |
|--------|-------------|
| `Workflow` | Approval workflow graph (nodes + edges) |
| `ScoreCard` | Risk scoring configuration with fields and rules |
| `RepaymentPlan` | Loan repayment schedule configuration |
| `LoanSetup` | Full loan product snapshot (interest plans, channels, document requirements) |
| `LoanApplication` | Individual loan application with lifecycle management |

## Core Business Logic

### Score Engine (`Los.Domain.Services.ScoreCardEngine`)
- Evaluates applicant inputs against scorecard rules
- Supports 10 operators: `==`, `!=`, `>`, `<`, `>=`, `<=`, `between`, `in`, `notin`, `contains`
- Infers field types (number, boolean, string) from operators
- Caps total at `maxScore`; maps to risk grades: **LOW** (≥60%), **MEDIUM** (≥40%), **HIGH** (<40%)

### Advanced Score Engine (`Los.Domain.Services.ScoreCardEngineAdvanced`)
- FICO-weighted scoring (Payment History 35%, Credit Utilization 30%, History Length 15%, Mix 10%, New Credit 10%)
- ECL calculation: `PD × LGD × EAD × DiscountFactor`
- Derives credit utilization from balance/limit if not provided directly

### Loan Application Lifecycle
Status transitions: `DRAFT` → `SUBMITTED` → `CHECKER_PENDING` → `APPROVED`/`REJECTED`

Decision events are automatically recorded per transition:
- `SUBMITTED → CHECKER_PENDING` → Maker decision
- `CHECKER_PENDING → APPROVED/REJECTED` → Checker decision
- Any → `SUBMITTED` → System event

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/workflows` | List all workflows |
| `GET` | `/api/workflows/{id}` | Get workflow by ID |
| `POST` | `/api/workflows` | Create workflow |
| `PUT` | `/api/workflows/{id}` | Update workflow |
| `DELETE` | `/api/workflows/{id}` | Delete workflow |
| `GET` | `/api/scorecards` | List scorecards |
| `POST` | `/api/scorecards` | Create scorecard |
| `POST` | `/api/scorecards/{id}/evaluate` | Evaluate applicant against scorecard |
| `POST` | `/api/scorecards/{id}/evaluate-advanced` | FICO + ECL evaluation |
| `GET` | `/api/repayment-plans` | List repayment plans |
| `POST` | `/api/repayment-plans` | Create repayment plan |
| `GET` | `/api/loan-setups` | List loan product setups |
| `POST` | `/api/loan-setups` | Create loan setup |
| `GET` | `/api/loan-applications` | List applications (optional `?status=` filter) |
| `POST` | `/api/loan-applications` | Create application |
| `PUT` | `/api/loan-applications/{id}/status` | Update application status |
| `POST` | `/api/loan-applications/{id}/workflow-stage` | Advance workflow stage |
| `POST` | `/api/loan-applications/{id}/reset-workflow` | Reset workflow progress |
| `GET` | `/api/loan-applications/maker-inbox` | Applications in SUBMITTED state |
| `GET` | `/api/loan-applications/checker-inbox` | Applications in CHECKER_PENDING state |

## Getting Started

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)

### Run

```bash
cd backend
dotnet run --project src/Los.Api
```

The API starts at `http://localhost:5210` (http) or `https://localhost:7133` (https). OpenAPI spec is available at `/openapi/v1.json` in development.

### Test

```bash
cd backend
dotnet test
```

### Build

```bash
cd backend
dotnet build
```

## Database

Uses **SQLite** by default (`los.db` in the working directory). The schema is auto-created on startup via `EnsureCreated()`.

To use a different database, update the connection string in `appsettings.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=los.db"
  }
}
```

To switch to SQL Server, replace the `UseSqlite` call in `Los.Infrastructure/DependencyInjection.cs` with `UseSqlServer` and add the `Microsoft.EntityFrameworkCore.SqlServer` package.
