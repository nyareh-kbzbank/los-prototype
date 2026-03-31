using Los.Application.Features.Scorecards;
using Los.Application.Features.LoanApplications;
using Los.Domain.Entities;
using Los.Domain.Enums;
using Los.Domain.Interfaces;
using Los.Domain.Services;
using NSubstitute;
using Xunit;

namespace Los.Application.Tests;

public class ScorecardHandlerTests
{
    private static ScoreCard BuildTestCard()
    {
        var card = ScoreCard.Create("Test Card", 100, "SC-TEST-01");
        var field = card.AddField("age", "Age");
        field.AddRule(ScorecardOperator.Between, "20,39", 10);
        field.AddRule(ScorecardOperator.Between, "40,60", 20);
        return card;
    }

    [Fact]
    public async Task EvaluateScoreCard_CardNotFound_ReturnsFailure()
    {
        var repo = Substitute.For<IScoreCardRepository>();
        repo.GetByIdAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((ScoreCard?)null);

        var handler = new EvaluateScoreCardHandler(repo, new ScoreCardEngine());
        var result = await handler.Handle(
            new EvaluateScoreCardQuery(Guid.NewGuid(), new Dictionary<string, string>()),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Contains("not found", result.Error, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task EvaluateScoreCard_WithValidInputs_ReturnsResult()
    {
        var card = BuildTestCard();
        var repo = Substitute.For<IScoreCardRepository>();
        repo.GetByIdAsync(card.Id, Arg.Any<CancellationToken>()).Returns(card);

        var handler = new EvaluateScoreCardHandler(repo, new ScoreCardEngine());
        var result = await handler.Handle(
            new EvaluateScoreCardQuery(card.Id, new Dictionary<string, string> { ["age"] = "30" }),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(10, result.Value!.TotalScore);
        Assert.Equal("HIGH", result.Value.RiskGrade); // 10 < 40% of 100
    }

    [Fact]
    public async Task GetScorecards_ReturnsAllCards()
    {
        var cards = new List<ScoreCard> { BuildTestCard() };
        var repo = Substitute.For<IScoreCardRepository>();
        repo.GetAllWithFieldsAsync(Arg.Any<CancellationToken>()).Returns(cards);

        var handler = new GetScoreCardsHandler(repo);
        var result = await handler.Handle(new GetScoreCardsQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task CreateScoreCard_WithEmptyName_ReturnsFailure()
    {
        var repo = Substitute.For<IScoreCardRepository>();
        var handler = new CreateScoreCardHandler(repo);

        var result = await handler.Handle(
            new CreateScoreCardCommand("", 100, null, []),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task CreateScoreCard_Valid_ReturnsCreatedCard()
    {
        var repo = Substitute.For<IScoreCardRepository>();
        repo.AddAsync(Arg.Any<ScoreCard>(), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        repo.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(1);

        var handler = new CreateScoreCardHandler(repo);
        var result = await handler.Handle(
            new CreateScoreCardCommand("New Card", 100, "SC-001", [
                new("age", "Age", [new(ScorecardOperator.Between, "20,40", 10)])
            ]),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("New Card", result.Value!.Name);
        Assert.Single(result.Value.Fields);
    }
}

public class LoanApplicationHandlerTests
{
    [Fact]
    public async Task CreateLoanApplication_Valid_ReturnsApplication()
    {
        var repo = Substitute.For<ILoanApplicationRepository>();
        repo.AddAsync(Arg.Any<LoanApplication>(), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        repo.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(1);

        var handler = new CreateLoanApplicationHandler(repo);
        var cmd = new CreateLoanApplicationCommand(
            SetupId: Guid.NewGuid(),
            ProductCode: "PERSONAL",
            BeneficiaryName: "John Doe",
            NationalId: "NRC-001",
            Phone: "09000000000",
            RequestedAmount: 100000m,
            ChannelCode: "DIRECT",
            DestinationType: DisbursementDestinationType.Bank,
            BureauProvider: "CTOS",
            BureauPurpose: "Credit",
            BureauConsent: true);

        var result = await handler.Handle(cmd, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("John Doe", result.Value!.BeneficiaryName);
        Assert.StartsWith("PERSONAL-", result.Value.ApplicationNo);
    }

    [Fact]
    public async Task CreateLoanApplication_EmptyBeneficiaryName_ReturnsFailure()
    {
        var repo = Substitute.For<ILoanApplicationRepository>();
        var handler = new CreateLoanApplicationHandler(repo);

        var result = await handler.Handle(new CreateLoanApplicationCommand(
            Guid.NewGuid(), "PERSONAL", "", "NRC-001", "09000000",
            100000m, "DIRECT", DisbursementDestinationType.Bank,
            "Bureau", "Credit", true), CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task UpdateStatus_ApplicationNotFound_ReturnsFailure()
    {
        var repo = Substitute.For<ILoanApplicationRepository>();
        repo.GetWithHistoryAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns((LoanApplication?)null);

        var handler = new UpdateLoanApplicationStatusHandler(repo);
        var result = await handler.Handle(
            new UpdateLoanApplicationStatusCommand(Guid.NewGuid(), LoanApplicationStatus.Approved),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task UpdateStatus_ValidTransition_UpdatesStatus()
    {
        var app = LoanApplication.Create(
            Guid.NewGuid(), "PERSONAL", "Jane Doe", "NRC-002", "09111111111",
            50000m, "DIRECT", DisbursementDestinationType.Bank,
            "Bureau", "Credit", true,
            LoanApplicationStatus.Submitted);

        var repo = Substitute.For<ILoanApplicationRepository>();
        repo.GetWithHistoryAsync(app.Id, Arg.Any<CancellationToken>()).Returns(app);
        repo.SaveChangesAsync(Arg.Any<CancellationToken>()).Returns(1);

        var handler = new UpdateLoanApplicationStatusHandler(repo);
        var result = await handler.Handle(
            new UpdateLoanApplicationStatusCommand(app.Id, LoanApplicationStatus.CheckerPending),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("CHECKER_PENDING", result.Value!.Status);
    }

    [Fact]
    public async Task GetLoanApplications_NoFilter_ReturnsAll()
    {
        var apps = new List<LoanApplication>
        {
            LoanApplication.Create(Guid.NewGuid(), "P1", "Alice", "NRC-A", "09000001",
                100000m, "DIRECT", DisbursementDestinationType.Bank, "Bureau", "Credit", true),
            LoanApplication.Create(Guid.NewGuid(), "P2", "Bob", "NRC-B", "09000002",
                200000m, "DIRECT", DisbursementDestinationType.Wallet, "Bureau", "Credit", false)
        };

        var repo = Substitute.For<ILoanApplicationRepository>();
        repo.GetAllOrderedAsync(Arg.Any<CancellationToken>()).Returns(apps);

        var handler = new GetLoanApplicationsHandler(repo);
        var result = await handler.Handle(new GetLoanApplicationsQuery(), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Count);
    }
}
