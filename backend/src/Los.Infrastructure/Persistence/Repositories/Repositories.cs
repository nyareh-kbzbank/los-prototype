using Los.Domain.Entities;
using Los.Domain.Enums;
using Los.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Los.Infrastructure.Persistence.Repositories;

public class WorkflowRepository(LosDbContext db) : Repository<Workflow>(db), IWorkflowRepository
{
    public async Task<IReadOnlyList<Workflow>> GetAllOrderedAsync(CancellationToken ct = default) =>
        await Db.Workflows
            .Include(w => w.Nodes)
            .Include(w => w.Edges)
            .OrderBy(w => w.Name)
            .ThenBy(w => w.CreatedAt)
            .ToListAsync(ct);

    public override async Task<Workflow?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await Db.Workflows
            .Include(w => w.Nodes)
            .Include(w => w.Edges)
            .FirstOrDefaultAsync(w => w.Id == id, ct);
}

public class ScoreCardRepository(LosDbContext db) : Repository<ScoreCard>(db), IScoreCardRepository
{
    public async Task<ScoreCard?> GetByCodeAsync(string code, CancellationToken ct = default) =>
        await Db.ScoreCards
            .Include(c => c.Fields).ThenInclude(f => f.Rules)
            .FirstOrDefaultAsync(c => c.ScorecardCode == code, ct);

    public async Task<IReadOnlyList<ScoreCard>> GetAllWithFieldsAsync(CancellationToken ct = default) =>
        await Db.ScoreCards
            .Include(c => c.Fields).ThenInclude(f => f.Rules)
            .ToListAsync(ct);

    public override async Task<ScoreCard?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await Db.ScoreCards
            .Include(c => c.Fields).ThenInclude(f => f.Rules)
            .FirstOrDefaultAsync(c => c.Id == id, ct);
}

public class RepaymentPlanRepository(LosDbContext db) : Repository<RepaymentPlan>(db), IRepaymentPlanRepository
{
    public async Task<IReadOnlyList<RepaymentPlan>> GetAllOrderedAsync(CancellationToken ct = default) =>
        await Db.RepaymentPlans.OrderBy(p => p.Name).ToListAsync(ct);
}

public class LoanSetupRepository(LosDbContext db) : Repository<LoanSetup>(db), ILoanSetupRepository
{
    public async Task<IReadOnlyList<LoanSetup>> GetAllWithDetailsAsync(CancellationToken ct = default) =>
        await Db.LoanSetups
            .Include(s => s.Channels)
            .Include(s => s.InterestPlans).ThenInclude(p => p.Parameters)
            .Include(s => s.InterestPlans).ThenInclude(p => p.Policies)
            .Include(s => s.DocumentRequirements)
            .Include(s => s.DisbursementDestinations)
            .OrderByDescending(s => s.CreatedAt)
            .ToListAsync(ct);

    public async Task<LoanSetup?> GetWithDetailsAsync(Guid id, CancellationToken ct = default) =>
        await Db.LoanSetups
            .Include(s => s.Channels)
            .Include(s => s.InterestPlans).ThenInclude(p => p.Parameters)
            .Include(s => s.InterestPlans).ThenInclude(p => p.Policies)
            .Include(s => s.DocumentRequirements)
            .Include(s => s.DisbursementDestinations)
            .FirstOrDefaultAsync(s => s.Id == id, ct);
}

public class LoanApplicationRepository(LosDbContext db) : Repository<LoanApplication>(db), ILoanApplicationRepository
{
    public async Task<IReadOnlyList<LoanApplication>> GetAllOrderedAsync(CancellationToken ct = default) =>
        await Db.LoanApplications
            .Include(a => a.WorkflowHistory)
            .Include(a => a.DecisionHistory)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);

    public async Task<IReadOnlyList<LoanApplication>> GetByStatusAsync(LoanApplicationStatus status, CancellationToken ct = default) =>
        await Db.LoanApplications
            .Include(a => a.WorkflowHistory)
            .Include(a => a.DecisionHistory)
            .Where(a => a.Status == status)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync(ct);

    public async Task<LoanApplication?> GetWithHistoryAsync(Guid id, CancellationToken ct = default) =>
        await Db.LoanApplications
            .Include(a => a.WorkflowHistory)
            .Include(a => a.DecisionHistory)
            .FirstOrDefaultAsync(a => a.Id == id, ct);

    public async Task<LoanApplication?> GetByApplicationNoAsync(string applicationNo, CancellationToken ct = default) =>
        await Db.LoanApplications
            .Include(a => a.WorkflowHistory)
            .Include(a => a.DecisionHistory)
            .FirstOrDefaultAsync(a => a.ApplicationNo == applicationNo, ct);
}
