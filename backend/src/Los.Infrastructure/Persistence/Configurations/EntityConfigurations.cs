using Los.Domain.Entities;
using Los.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Los.Infrastructure.Persistence.Configurations;

public class WorkflowConfiguration : IEntityTypeConfiguration<Workflow>
{
    public void Configure(EntityTypeBuilder<Workflow> builder)
    {
        builder.HasKey(w => w.Id);
        builder.Property(w => w.Name).IsRequired().HasMaxLength(200);
        builder.Property(w => w.SourceInstanceId).HasMaxLength(200);

        builder.HasMany(w => w.Nodes)
            .WithOne()
            .HasForeignKey(n => n.WorkflowId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(w => w.Edges)
            .WithOne()
            .HasForeignKey(e => e.WorkflowId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class WorkflowNodeConfiguration : IEntityTypeConfiguration<WorkflowNode>
{
    public void Configure(EntityTypeBuilder<WorkflowNode> builder)
    {
        builder.HasKey(n => n.Id);
        builder.Property(n => n.NodeId).IsRequired().HasMaxLength(100);
        builder.Property(n => n.Label).HasMaxLength(200);
        builder.Property(n => n.Type).HasConversion<string>();
    }
}

public class WorkflowEdgeConfiguration : IEntityTypeConfiguration<WorkflowEdge>
{
    public void Configure(EntityTypeBuilder<WorkflowEdge> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.EdgeId).IsRequired().HasMaxLength(100);
        builder.Property(e => e.SourceNodeId).IsRequired().HasMaxLength(100);
        builder.Property(e => e.TargetNodeId).IsRequired().HasMaxLength(100);
    }
}

public class ScoreCardConfiguration : IEntityTypeConfiguration<ScoreCard>
{
    public void Configure(EntityTypeBuilder<ScoreCard> builder)
    {
        builder.HasKey(c => c.Id);
        builder.Property(c => c.ScorecardCode).IsRequired().HasMaxLength(50);
        builder.HasIndex(c => c.ScorecardCode).IsUnique();
        builder.Property(c => c.Name).IsRequired().HasMaxLength(200);

        builder.HasMany(c => c.Fields)
            .WithOne()
            .HasForeignKey(f => f.ScoreCardId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ScoreCardFieldConfiguration : IEntityTypeConfiguration<ScoreCardField>
{
    public void Configure(EntityTypeBuilder<ScoreCardField> builder)
    {
        builder.HasKey(f => f.Id);
        builder.Property(f => f.Field).IsRequired().HasMaxLength(100);
        builder.Property(f => f.Description).HasMaxLength(300);

        builder.HasMany(f => f.Rules)
            .WithOne()
            .HasForeignKey(r => r.ScoreCardFieldId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public class ScorecardRuleConfiguration : IEntityTypeConfiguration<ScorecardRule>
{
    public void Configure(EntityTypeBuilder<ScorecardRule> builder)
    {
        builder.HasKey(r => r.Id);
        builder.Property(r => r.Field).IsRequired().HasMaxLength(100);
        builder.Property(r => r.Operator).HasConversion<string>();
        builder.Property(r => r.Value).IsRequired().HasMaxLength(500);
    }
}

public class RepaymentPlanConfiguration : IEntityTypeConfiguration<RepaymentPlan>
{
    public void Configure(EntityTypeBuilder<RepaymentPlan> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.PlanCode).IsRequired().HasMaxLength(50);
        builder.HasIndex(p => p.PlanCode).IsUnique();
        builder.Property(p => p.Name).IsRequired().HasMaxLength(200);
        builder.Property(p => p.Method).HasConversion<string>();
        builder.Property(p => p.Frequency).HasConversion<string>();
        builder.Property(p => p.LateFeeFlat).HasPrecision(18, 4);
        builder.Property(p => p.LateFeePct).HasPrecision(18, 4);
        builder.Property(p => p.PrepaymentPenaltyPct).HasPrecision(18, 4);
        builder.Property(p => p.RoundingStep).HasPrecision(18, 4);
        builder.Property(p => p.MinInstallmentAmount).HasPrecision(18, 4);
    }
}

public class LoanSetupConfiguration : IEntityTypeConfiguration<LoanSetup>
{
    public void Configure(EntityTypeBuilder<LoanSetup> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.ProductCode).IsRequired().HasMaxLength(50);
        builder.Property(s => s.ProductName).IsRequired().HasMaxLength(200);
        builder.Property(s => s.MinAmount).HasPrecision(18, 4);
        builder.Property(s => s.MaxAmount).HasPrecision(18, 4);
        builder.Property(s => s.TenorUnit).HasConversion<string>();
        builder.Property(s => s.TenorValues)
            .HasConversion(
                v => string.Join(",", v),
                v => string.IsNullOrEmpty(v) ? Array.Empty<int>() : v.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToArray());
        builder.Property(s => s.RiskGrade).HasConversion<string?>();
        builder.Property(s => s.TotalScore).HasPrecision(18, 4);
        builder.Property(s => s.DisbursementType).HasConversion<string>();
        builder.Property(s => s.PartialInterestRate).HasPrecision(18, 4);

        builder.HasMany(s => s.Channels).WithOne().HasForeignKey(c => c.LoanSetupId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(s => s.InterestPlans).WithOne().HasForeignKey(p => p.LoanSetupId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(s => s.DocumentRequirements).WithOne().HasForeignKey(d => d.LoanSetupId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(s => s.DisbursementDestinations).WithOne().HasForeignKey(d => d.LoanSetupId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class LoanSetupInterestPlanConfiguration : IEntityTypeConfiguration<LoanSetupInterestPlan>
{
    public void Configure(EntityTypeBuilder<LoanSetupInterestPlan> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.InterestType).HasConversion<string>();
        builder.Property(p => p.RateType).HasConversion<string>();
        builder.Property(p => p.BaseRate).HasPrecision(18, 4);
        builder.HasMany(p => p.Parameters).WithOne().HasForeignKey(x => x.InterestPlanId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(p => p.Policies).WithOne().HasForeignKey(x => x.InterestPlanId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class LoanSetupDocumentConfiguration : IEntityTypeConfiguration<LoanSetupDocument>
{
    public void Configure(EntityTypeBuilder<LoanSetupDocument> builder)
    {
        builder.HasKey(d => d.Id);
        builder.Property(d => d.DocumentTypeId).IsRequired().HasMaxLength(100);
        builder.Property(d => d.MinAmount).HasPrecision(18, 4);
        builder.Property(d => d.MaxAmount).HasPrecision(18, 4);
        builder.Property(d => d.RiskGrade).HasConversion<string?>();
    }
}

public class LoanSetupDisbursementDestinationConfiguration : IEntityTypeConfiguration<LoanSetupDisbursementDestination>
{
    public void Configure(EntityTypeBuilder<LoanSetupDisbursementDestination> builder)
    {
        builder.HasKey(d => d.Id);
        builder.Property(d => d.DestinationType).HasConversion<string>();
    }
}

public class LoanApplicationConfiguration : IEntityTypeConfiguration<LoanApplication>
{
    public void Configure(EntityTypeBuilder<LoanApplication> builder)
    {
        builder.HasKey(a => a.Id);
        builder.Property(a => a.ApplicationNo).IsRequired().HasMaxLength(100);
        builder.HasIndex(a => a.ApplicationNo).IsUnique();
        builder.Property(a => a.Status).HasConversion<string>();
        builder.Property(a => a.BeneficiaryName).IsRequired().HasMaxLength(200);
        builder.Property(a => a.NationalId).IsRequired().HasMaxLength(50);
        builder.Property(a => a.Phone).IsRequired().HasMaxLength(50);
        builder.Property(a => a.RequestedAmount).HasPrecision(18, 4);
        builder.Property(a => a.MonthlyIncome).HasPrecision(18, 4);
        builder.Property(a => a.DebtToIncomeRatio).HasPrecision(18, 4);
        builder.Property(a => a.CreditScore).HasPrecision(18, 4);
        builder.Property(a => a.CreditMax).HasPrecision(18, 4);
        builder.Property(a => a.TenureUnit).HasConversion<string?>();
        builder.Property(a => a.DestinationType).HasConversion<string>();

        builder.HasMany(a => a.WorkflowHistory).WithOne().HasForeignKey(e => e.LoanApplicationId).OnDelete(DeleteBehavior.Cascade);
        builder.HasMany(a => a.DecisionHistory).WithOne().HasForeignKey(e => e.LoanApplicationId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ApplicationDecisionEventConfiguration : IEntityTypeConfiguration<ApplicationDecisionEvent>
{
    public void Configure(EntityTypeBuilder<ApplicationDecisionEvent> builder)
    {
        builder.HasKey(e => e.Id);
        builder.Property(e => e.Actor).HasConversion<string>();
        builder.Property(e => e.FromStatus).HasConversion<string?>();
        builder.Property(e => e.ToStatus).HasConversion<string>();
        builder.Property(e => e.Note).HasMaxLength(500);
    }
}
