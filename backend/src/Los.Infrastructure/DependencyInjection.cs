using Los.Domain.Interfaces;
using Los.Infrastructure.Persistence;
using Los.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Los.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        string connectionString)
    {
        services.AddDbContext<LosDbContext>(opts =>
            opts.UseSqlite(connectionString));

        services.AddScoped<IWorkflowRepository, WorkflowRepository>();
        services.AddScoped<IScoreCardRepository, ScoreCardRepository>();
        services.AddScoped<IRepaymentPlanRepository, RepaymentPlanRepository>();
        services.AddScoped<ILoanSetupRepository, LoanSetupRepository>();
        services.AddScoped<ILoanApplicationRepository, LoanApplicationRepository>();

        return services;
    }
}
