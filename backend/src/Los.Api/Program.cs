using Los.Application;
using Los.Infrastructure;
using Los.Infrastructure.Persistence;
using Los.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

// ─── Services ──────────────────────────────────────────────────────────────
builder.Services.AddApplication();
builder.Services.AddInfrastructure(
    builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Data Source=los.db");

builder.Services.AddOpenApi();

builder.Services.AddCors(opts =>
    opts.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

// ─── Middleware ─────────────────────────────────────────────────────────────
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();

// ─── Ensure DB is created ───────────────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<LosDbContext>();
    db.Database.EnsureCreated();
}

// ─── Endpoints ──────────────────────────────────────────────────────────────
app.MapWorkflowEndpoints();
app.MapScorecardEndpoints();
app.MapRepaymentPlanEndpoints();
app.MapLoanSetupEndpoints();
app.MapLoanApplicationEndpoints();

app.MapGet("/", () => Results.Redirect("/openapi/v1.json")).ExcludeFromDescription();

app.Run();
