using Los.Domain.Entities;
using Los.Domain.Enums;

namespace Los.Domain.Services;

/// <summary>
/// Ported from scorecard-engine-advanced.ts — FICO-weighted scoring with ECL calculation.
/// </summary>
public class ScoreCardEngineAdvanced
{
    private static readonly Dictionary<string, double> FicoWeights = new()
    {
        ["paymentHistory"] = 0.35,
        ["creditUtilization"] = 0.30,
        ["creditHistoryLength"] = 0.15,
        ["creditMix"] = 0.10,
        ["newCredit"] = 0.10
    };

    private static readonly Dictionary<string, string[]> FicoAliases = new()
    {
        ["paymentHistory"] = ["paymenthistory", "payment_history", "paymenthistoryscore"],
        ["creditUtilization"] = ["creditutilization", "credit_utilization", "utilization", "utilizationratio"],
        ["creditHistoryLength"] = ["credithistorylength", "credit_history_length", "lengthofcredithistory", "historylength"],
        ["creditMix"] = ["creditmix", "credit_mix", "mixofcredit"],
        ["newCredit"] = ["newcredit", "new_credit", "recentcredit", "newaccounts"]
    };

    private static readonly string[] CreditBalanceAliases = ["creditbalance", "credit_balance", "totalcreditbalance", "outstandingbalance", "usedcredit"];
    private static readonly string[] CreditLimitAliases = ["creditlimit", "credit_limit", "totalcreditlimit", "totallimit", "availablecreditlimit"];
    private static readonly string[] PdAliases = ["pd", "probabilityofdefault", "probability_of_default", "defaultprobability"];
    private static readonly string[] LgdAliases = ["lgd", "lossgivendefault", "loss_given_default"];
    private static readonly string[] EadAliases = ["ead", "exposureatdefault", "exposure_at_default", "exposure"];
    private static readonly string[] DiscountFactorAliases = ["discountfactor", "discount_factor", "df"];
    private static readonly string[] EadFallbackAliases = ["requestedamount", "requested_amount", "loanamount", "loan_amount", "principal", "outstandingbalance"];

    private readonly ScoreCardEngine _baseEngine = new();

    public ScoreEngineAdvancedResult Evaluate(ScoreCard scoreCard, Dictionary<string, string> inputs)
    {
        // Compute credit utilization and inject into inputs if derivable
        var utilization = ComputeCreditUtilization(inputs);
        var evaluationInputs = utilization.HasValue
            ? new Dictionary<string, string>(inputs)
                {
                    ["creditUtilization"] = utilization.Value.ToString(System.Globalization.CultureInfo.InvariantCulture),
                    ["credit_utilization"] = utilization.Value.ToString(System.Globalization.CultureInfo.InvariantCulture)
                }
            : inputs;

        var baseResult = _baseEngine.Evaluate(scoreCard, evaluationInputs);

        var ecl = ComputeExpectedCreditLoss(evaluationInputs);
        var ficoScore = ComputeFicoWeightedScore(evaluationInputs);

        double totalScore;
        if (ficoScore.HasValue)
        {
            totalScore = (ficoScore.Value / 100.0) * scoreCard.MaxScore;
        }
        else
        {
            totalScore = ComputeTechnicalScaledScore(scoreCard, baseResult.TotalScore);
        }

        totalScore = Math.Min(totalScore, scoreCard.MaxScore);
        var riskGrade = ScoreCardEngine.DetermineRiskGrade((int)totalScore, scoreCard.MaxScore);

        return new ScoreEngineAdvancedResult
        {
            MaxScore = scoreCard.MaxScore,
            TotalScore = (int)totalScore,
            MatchedRules = baseResult.MatchedRules,
            RiskGrade = riskGrade,
            Breakdown = baseResult.Breakdown,
            Ecl = ecl
        };
    }

    private static double? ComputeCreditUtilization(Dictionary<string, string> inputs)
    {
        var normalized = NormalizeInputKeys(inputs);

        // Try direct utilization value
        var directUtil = GetDouble(normalized, FicoAliases["creditUtilization"]);
        if (directUtil.HasValue) return Math.Max(0, directUtil.Value);

        // Derive from balance / limit
        var balance = GetDouble(normalized, CreditBalanceAliases);
        var limit = GetDouble(normalized, CreditLimitAliases);
        if (!balance.HasValue || !limit.HasValue || limit.Value <= 0) return null;

        return Math.Max(0, (balance.Value / limit.Value) * 100);
    }

    private static EclResult? ComputeExpectedCreditLoss(Dictionary<string, string> inputs)
    {
        var normalized = NormalizeInputKeys(inputs);

        var rawPd = GetDouble(normalized, PdAliases);
        var rawLgd = GetDouble(normalized, LgdAliases);
        if (!rawPd.HasValue || !rawLgd.HasValue) return null;

        var pd = NormalizeProbability(rawPd.Value);
        var lgd = NormalizeProbability(rawLgd.Value);
        if (!pd.HasValue || !lgd.HasValue) return null;

        var ead = GetDouble(normalized, EadAliases) ?? GetDouble(normalized, EadFallbackAliases);
        if (!ead.HasValue || ead.Value < 0) return null;

        var rawDf = GetDouble(normalized, DiscountFactorAliases);
        var df = rawDf.HasValue ? Math.Max(0, rawDf.Value) : 1.0;

        return new EclResult
        {
            Pd = pd.Value,
            Lgd = lgd.Value,
            Ead = ead.Value,
            DiscountFactor = df,
            ExpectedCreditLoss = pd.Value * lgd.Value * ead.Value * df
        };
    }

    private static double? ComputeFicoWeightedScore(Dictionary<string, string> inputs)
    {
        var normalized = NormalizeInputKeys(inputs);
        var weightedScore = 0.0;

        foreach (var (factor, weight) in FicoWeights)
        {
            var aliases = FicoAliases[factor];
            var rawValue = GetDouble(normalized, aliases);
            if (!rawValue.HasValue) return null;
            weightedScore += Math.Clamp(rawValue.Value, 0, 100) * weight;
        }

        return weightedScore;
    }

    private static double ComputeTechnicalScaledScore(ScoreCard card, int rawMatchedScore)
    {
        var maxRawScore = card.Fields.Sum(f => f.Rules.Select(r => (double)r.Score).DefaultIfEmpty(0).Max());
        if (maxRawScore <= 0 || card.MaxScore <= 0) return 0;
        return Math.Min((Math.Max(0, rawMatchedScore) / maxRawScore) * card.MaxScore, card.MaxScore);
    }

    private static Dictionary<string, string> NormalizeInputKeys(Dictionary<string, string> inputs) =>
        inputs.ToDictionary(kv => NormalizeKey(kv.Key), kv => kv.Value);

    private static string NormalizeKey(string key) =>
        System.Text.RegularExpressions.Regex.Replace(key.Trim().ToLowerInvariant(), @"[^a-z0-9]", string.Empty);

    private static double? GetDouble(Dictionary<string, string> normalized, string[] aliases)
    {
        foreach (var alias in aliases.Select(NormalizeKey))
        {
            if (normalized.TryGetValue(alias, out var raw)
                && double.TryParse(raw, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var val))
                return val;
        }
        return null;
    }

    private static double? NormalizeProbability(double value)
    {
        if (!double.IsFinite(value) || value < 0) return null;
        if (value <= 1) return value;
        if (value <= 100) return value / 100.0;
        return null;
    }
}

public class ScoreEngineAdvancedResult : ScoreEngineResult
{
    public EclResult? Ecl { get; init; }
}

public class EclResult
{
    public double Pd { get; init; }
    public double Lgd { get; init; }
    public double Ead { get; init; }
    public double DiscountFactor { get; init; }
    public double ExpectedCreditLoss { get; init; }
}
