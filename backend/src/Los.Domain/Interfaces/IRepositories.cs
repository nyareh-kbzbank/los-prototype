using Los.Domain.Entities;
using Los.Domain.Enums;

namespace Los.Domain.Interfaces;

public interface IWorkflowRepository : IRepository<Workflow>
{
    Task<IReadOnlyList<Workflow>> GetAllOrderedAsync(CancellationToken ct = default);
}

public interface IScoreCardRepository : IRepository<ScoreCard>
{
    Task<ScoreCard?> GetByCodeAsync(string scorecardCode, CancellationToken ct = default);
    Task<IReadOnlyList<ScoreCard>> GetAllWithFieldsAsync(CancellationToken ct = default);
}

public interface IRepaymentPlanRepository : IRepository<RepaymentPlan>
{
    Task<IReadOnlyList<RepaymentPlan>> GetAllOrderedAsync(CancellationToken ct = default);
}

public interface ILoanSetupRepository : IRepository<LoanSetup>
{
    Task<IReadOnlyList<LoanSetup>> GetAllWithDetailsAsync(CancellationToken ct = default);
    Task<LoanSetup?> GetWithDetailsAsync(Guid id, CancellationToken ct = default);
}

public interface ILoanApplicationRepository : IRepository<LoanApplication>
{
    Task<IReadOnlyList<LoanApplication>> GetAllOrderedAsync(CancellationToken ct = default);
    Task<IReadOnlyList<LoanApplication>> GetByStatusAsync(LoanApplicationStatus status, CancellationToken ct = default);
    Task<LoanApplication?> GetWithHistoryAsync(Guid id, CancellationToken ct = default);
    Task<LoanApplication?> GetByApplicationNoAsync(string applicationNo, CancellationToken ct = default);
}
