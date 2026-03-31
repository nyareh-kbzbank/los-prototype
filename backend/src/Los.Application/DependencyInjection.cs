using FluentValidation;
using Los.Domain.Services;
using Microsoft.Extensions.DependencyInjection;

namespace Los.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(cfg => cfg.RegisterServicesFromAssembly(typeof(DependencyInjection).Assembly));
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);

        // Domain services
        services.AddScoped<ScoreCardEngine>();
        services.AddScoped<ScoreCardEngineAdvanced>();

        return services;
    }
}
