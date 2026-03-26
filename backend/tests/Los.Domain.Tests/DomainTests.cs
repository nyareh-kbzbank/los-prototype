using Los.Domain.Entities;
using Los.Domain.Enums;
using Los.Domain.Services;
using Xunit;

namespace Los.Domain.Tests;

public class ScoreCardEngineTests
{
    private static ScoreCard BuildCard()
    {
        var card = ScoreCard.Create("Test Card", 100);
        var ageField = card.AddField("age", "Age");
        ageField.AddRule(ScorecardOperator.Between, "20,39", 10);
        ageField.AddRule(ScorecardOperator.Between, "40,60", 15);

        var incomeField = card.AddField("monthlyIncome", "Monthly Income");
        incomeField.AddRule(ScorecardOperator.GreaterThan, "50000", 20);

        var genderField = card.AddField("gender", "Gender");
        genderField.AddRule(ScorecardOperator.Equal, "M", 5);

        return card;
    }

    [Fact]
    public void Evaluate_WithMatchingRules_ReturnsTotalScore()
    {
        var engine = new ScoreCardEngine();
        var card = BuildCard();

        var result = engine.Evaluate(card, new Dictionary<string, string>
        {
            ["age"] = "30",
            ["monthlyIncome"] = "60000",
            ["gender"] = "M"
        });

        Assert.Equal(35, result.TotalScore); // 10 + 20 + 5
        Assert.Equal(3, result.MatchedRules);
        Assert.Equal(RiskGrade.High, result.RiskGrade); // 35 < 40% of 100 → HIGH
    }

    [Fact]
    public void Evaluate_ScoreBelowLowCutoff_ReturnsMediumOrHighGrade()
    {
        var engine = new ScoreCardEngine();
        var card = BuildCard();

        // Score = 10 (age 25-39) only => 10 < 40% of 100
        var result = engine.Evaluate(card, new Dictionary<string, string>
        {
            ["age"] = "25",
        });

        Assert.Equal(10, result.TotalScore);
        Assert.Equal(RiskGrade.High, result.RiskGrade); // 10 < 40
    }

    [Fact]
    public void Evaluate_ScoreAtMediumCutoff_ReturnsMediumGrade()
    {
        var card = ScoreCard.Create("Test", 100);
        var field = card.AddField("score", "Score");
        field.AddRule(ScorecardOperator.GreaterThanOrEqual, "40", 50); // Score 50 >= 40% of 100

        var engine = new ScoreCardEngine();
        var result = engine.Evaluate(card, new Dictionary<string, string> { ["score"] = "50" });

        Assert.Equal(50, result.TotalScore);
        Assert.Equal(RiskGrade.Medium, result.RiskGrade); // 50 >= 40 but < 60
    }

    [Fact]
    public void Evaluate_ScoreAtLowCutoff_ReturnsLowGrade()
    {
        var card = ScoreCard.Create("Test", 100);
        var field = card.AddField("score", "Score");
        field.AddRule(ScorecardOperator.GreaterThanOrEqual, "60", 70); // Score 70 >= 60% of 100

        var engine = new ScoreCardEngine();
        var result = engine.Evaluate(card, new Dictionary<string, string> { ["score"] = "70" });

        Assert.Equal(70, result.TotalScore);
        Assert.Equal(RiskGrade.Low, result.RiskGrade);
    }

    [Fact]
    public void Evaluate_MissingInput_SkipsRule()
    {
        var engine = new ScoreCardEngine();
        var card = BuildCard();

        var result = engine.Evaluate(card, new Dictionary<string, string>());

        Assert.Equal(0, result.TotalScore);
        Assert.All(result.Breakdown, b => Assert.True(b.SkippedBecauseMissingInput || !b.Matched));
    }

    [Fact]
    public void Evaluate_ScoreCappedAtMaxScore()
    {
        var card = ScoreCard.Create("Test", 50);
        var f1 = card.AddField("a", "A");
        f1.AddRule(ScorecardOperator.Equal, "x", 30);
        var f2 = card.AddField("b", "B");
        f2.AddRule(ScorecardOperator.Equal, "y", 40); // Total would be 70, capped to 50

        var engine = new ScoreCardEngine();
        var result = engine.Evaluate(card, new() { ["a"] = "x", ["b"] = "y" });

        Assert.Equal(50, result.TotalScore);
    }

    [Fact]
    public void DetermineRiskGrade_EdgeCases()
    {
        Assert.Equal(RiskGrade.Low, ScoreCardEngine.DetermineRiskGrade(60, 100));
        Assert.Equal(RiskGrade.Medium, ScoreCardEngine.DetermineRiskGrade(59, 100));
        Assert.Equal(RiskGrade.Medium, ScoreCardEngine.DetermineRiskGrade(40, 100));
        Assert.Equal(RiskGrade.High, ScoreCardEngine.DetermineRiskGrade(39, 100));
        Assert.Equal(RiskGrade.High, ScoreCardEngine.DetermineRiskGrade(0, 100));
        Assert.Equal(RiskGrade.High, ScoreCardEngine.DetermineRiskGrade(0, 0)); // degenerate case
    }

    [Fact]
    public void Evaluate_BetweenOperator_WorksCorrectly()
    {
        var engine = new ScoreCardEngine();
        var card = ScoreCard.Create("Test", 100);
        var field = card.AddField("age", "Age");
        field.AddRule(ScorecardOperator.Between, "20,39", 10);

        Assert.Equal(10, engine.Evaluate(card, new() { ["age"] = "20" }).TotalScore); // boundary
        Assert.Equal(10, engine.Evaluate(card, new() { ["age"] = "39" }).TotalScore); // boundary
        Assert.Equal(0, engine.Evaluate(card, new() { ["age"] = "19" }).TotalScore);  // below
        Assert.Equal(0, engine.Evaluate(card, new() { ["age"] = "40" }).TotalScore);  // above
    }

    [Fact]
    public void Evaluate_InOperator_WorksCorrectly()
    {
        var engine = new ScoreCardEngine();
        var card = ScoreCard.Create("Test", 100);
        var field = card.AddField("status", "Status");
        field.AddRule(ScorecardOperator.In, "ACTIVE,EMPLOYED", 15);

        Assert.Equal(15, engine.Evaluate(card, new() { ["status"] = "ACTIVE" }).TotalScore);
        Assert.Equal(15, engine.Evaluate(card, new() { ["status"] = "EMPLOYED" }).TotalScore);
        Assert.Equal(0, engine.Evaluate(card, new() { ["status"] = "RETIRED" }).TotalScore);
    }

    [Fact]
    public void Evaluate_ContainsOperator_CaseInsensitive()
    {
        var engine = new ScoreCardEngine();
        var card = ScoreCard.Create("Test", 100);
        var field = card.AddField("notes", "Notes");
        field.AddRule(ScorecardOperator.Contains, "employed", 10);

        Assert.Equal(10, engine.Evaluate(card, new() { ["notes"] = "Self-Employed" }).TotalScore);
        Assert.Equal(0, engine.Evaluate(card, new() { ["notes"] = "Retired" }).TotalScore);
    }
}

public class LoanApplicationDomainTests
{
    [Fact]
    public void Create_GeneratesApplicationNo()
    {
        var app = LoanApplication.Create(
            Guid.NewGuid(), "PERSONAL", "John Doe", "NRC-001", "09000000000",
            100000m, "DIRECT", DisbursementDestinationType.Bank,
            "TestBureau", "Credit", true);

        Assert.StartsWith("PERSONAL-", app.ApplicationNo);
        Assert.Equal(LoanApplicationStatus.Draft, app.Status);
        Assert.Empty(app.DecisionHistory);
    }

    [Fact]
    public void Create_WithSubmittedStatus_AddsSystemDecisionEvent()
    {
        var app = LoanApplication.Create(
            Guid.NewGuid(), "PERSONAL", "John Doe", "NRC-001", "09000000000",
            100000m, "DIRECT", DisbursementDestinationType.Bank,
            "TestBureau", "Credit", true,
            LoanApplicationStatus.Submitted);

        Assert.Single(app.DecisionHistory);
        Assert.Equal(ApplicationDecisionActor.System, app.DecisionHistory[0].Actor);
        Assert.Equal(LoanApplicationStatus.Submitted, app.DecisionHistory[0].ToStatus);
    }

    [Fact]
    public void UpdateStatus_FromSubmitted_ToCheckerPending_AddsMakerDecision()
    {
        var app = LoanApplication.Create(
            Guid.NewGuid(), "PERSONAL", "John Doe", "NRC-001", "09000000000",
            100000m, "DIRECT", DisbursementDestinationType.Bank,
            "TestBureau", "Credit", true,
            LoanApplicationStatus.Submitted);

        app.UpdateStatus(LoanApplicationStatus.CheckerPending);

        Assert.Equal(LoanApplicationStatus.CheckerPending, app.Status);
        // 1 SYSTEM (initial) + 1 MAKER
        var makerEvent = app.DecisionHistory.Last();
        Assert.Equal(ApplicationDecisionActor.Maker, makerEvent.Actor);
        Assert.Equal("Submitted to checker", makerEvent.Note);
    }

    [Fact]
    public void UpdateStatus_FromCheckerPending_ToApproved_AddsCheckerDecision()
    {
        var app = LoanApplication.Create(
            Guid.NewGuid(), "PERSONAL", "John", "NRC-001", "09000000",
            100000m, "DIRECT", DisbursementDestinationType.Bank,
            "Bureau", "Credit", true,
            LoanApplicationStatus.CheckerPending);

        app.UpdateStatus(LoanApplicationStatus.Approved);

        var lastEvent = app.DecisionHistory.Last();
        Assert.Equal(ApplicationDecisionActor.Checker, lastEvent.Actor);
        Assert.Equal("Approved by checker", lastEvent.Note);
    }

    [Fact]
    public void UpdateStatus_ToSameStatus_IsNoOp()
    {
        var app = LoanApplication.Create(
            Guid.NewGuid(), "PERSONAL", "John", "NRC-001", "09000000",
            100000m, "DIRECT", DisbursementDestinationType.Bank,
            "Bureau", "Credit", true);

        var before = app.UpdatedAt;
        app.UpdateStatus(LoanApplicationStatus.Draft);

        Assert.Equal(before, app.UpdatedAt);
    }

    [Fact]
    public void AdvanceWorkflowStage_AddsEvent()
    {
        var app = LoanApplication.Create(
            Guid.NewGuid(), "PERSONAL", "John", "NRC-001", "09000000",
            100000m, "DIRECT", DisbursementDestinationType.Bank,
            "Bureau", "Credit", true);

        app.AdvanceWorkflowStage(0, "node-start", "Start");

        Assert.Single(app.WorkflowHistory);
        Assert.Equal(0, app.WorkflowStageIndex);
    }

    [Fact]
    public void AdvanceWorkflowStage_DoesNotRegressIndex()
    {
        var app = LoanApplication.Create(
            Guid.NewGuid(), "PERSONAL", "John", "NRC-001", "09000000",
            100000m, "DIRECT", DisbursementDestinationType.Bank,
            "Bureau", "Credit", true);

        app.AdvanceWorkflowStage(2, "node-2", "Step 2");
        app.AdvanceWorkflowStage(1, "node-1", "Step 1"); // should be ignored

        Assert.Equal(2, app.WorkflowStageIndex);
        Assert.Single(app.WorkflowHistory);
    }

    [Fact]
    public void ResetWorkflowProgress_ClearsHistory()
    {
        var app = LoanApplication.Create(
            Guid.NewGuid(), "PERSONAL", "John", "NRC-001", "09000000",
            100000m, "DIRECT", DisbursementDestinationType.Bank,
            "Bureau", "Credit", true);

        app.AdvanceWorkflowStage(0, "n1", "Step 1");
        app.AdvanceWorkflowStage(1, "n2", "Step 2");
        app.ResetWorkflowProgress();

        Assert.Empty(app.WorkflowHistory);
        Assert.Equal(-1, app.WorkflowStageIndex);
    }

    [Fact]
    public void Create_ClampsNegativeAge()
    {
        var app = LoanApplication.Create(
            Guid.NewGuid(), "PERSONAL", "John", "NRC-001", "09000000",
            100000m, "DIRECT", DisbursementDestinationType.Bank,
            "Bureau", "Credit", true,
            age: -5);

        Assert.Equal(0, app.Age);
    }

    [Fact]
    public void Create_ClampsNegativeRequestedAmount()
    {
        var app = LoanApplication.Create(
            Guid.NewGuid(), "PERSONAL", "John", "NRC-001", "09000000",
            -50000m, "DIRECT", DisbursementDestinationType.Bank,
            "Bureau", "Credit", true);

        Assert.Equal(0m, app.RequestedAmount);
    }
}

public class WorkflowEntityTests
{
    [Fact]
    public void Create_Workflow_HasCorrectName()
    {
        var wf = Workflow.Create("  My Workflow  ");
        Assert.Equal("My Workflow", wf.Name);
    }

    [Fact]
    public void Create_Workflow_ThrowsOnEmptyName()
    {
        Assert.Throws<ArgumentException>(() => Workflow.Create("   "));
    }

    [Fact]
    public void AddNode_ThenEdge_TrackedCorrectly()
    {
        var wf = Workflow.Create("Test");
        wf.AddNode("start", "Start", WorkflowNodeType.Start);
        wf.AddNode("end", "End", WorkflowNodeType.End);
        wf.AddEdge("e1", "start", "end");

        Assert.Equal(2, wf.Nodes.Count);
        Assert.Single(wf.Edges);
    }
}
