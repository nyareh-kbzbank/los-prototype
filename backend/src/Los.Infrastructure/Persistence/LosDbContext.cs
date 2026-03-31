using Los.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Los.Infrastructure.Persistence;

public class LosDbContext(DbContextOptions<LosDbContext> options) : DbContext(options)
{
    public DbSet<Workflow> Workflows => Set<Workflow>();
    public DbSet<WorkflowNode> WorkflowNodes => Set<WorkflowNode>();
    public DbSet<WorkflowEdge> WorkflowEdges => Set<WorkflowEdge>();

    public DbSet<ScoreCard> ScoreCards => Set<ScoreCard>();
    public DbSet<ScoreCardField> ScoreCardFields => Set<ScoreCardField>();
    public DbSet<ScorecardRule> ScorecardRules => Set<ScorecardRule>();

    public DbSet<RepaymentPlan> RepaymentPlans => Set<RepaymentPlan>();

    public DbSet<LoanSetup> LoanSetups => Set<LoanSetup>();
    public DbSet<LoanSetupChannel> LoanSetupChannels => Set<LoanSetupChannel>();
    public DbSet<LoanSetupInterestPlan> LoanSetupInterestPlans => Set<LoanSetupInterestPlan>();
    public DbSet<InterestRateParameter> InterestRateParameters => Set<InterestRateParameter>();
    public DbSet<InterestRatePolicy> InterestRatePolicies => Set<InterestRatePolicy>();
    public DbSet<LoanSetupDocument> LoanSetupDocuments => Set<LoanSetupDocument>();
    public DbSet<LoanSetupDisbursementDestination> LoanSetupDisbursementDestinations => Set<LoanSetupDisbursementDestination>();

    public DbSet<LoanApplication> LoanApplications => Set<LoanApplication>();
    public DbSet<ApplicationWorkflowEvent> ApplicationWorkflowEvents => Set<ApplicationWorkflowEvent>();
    public DbSet<ApplicationDecisionEvent> ApplicationDecisionEvents => Set<ApplicationDecisionEvent>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(LosDbContext).Assembly);
    }
}
