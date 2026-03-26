using Los.Domain.Entities;
using Los.Domain.Enums;

namespace Los.Domain.Services;

/// <summary>
/// Ported from scorecard-engine.ts — evaluates an applicant's input values
/// against scorecard rules and returns a risk grade and score breakdown.
/// </summary>
public class ScoreCardEngine
{
    public ScoreEngineResult Evaluate(ScoreCard scoreCard, Dictionary<string, string> inputs)
    {
        var fields = scoreCard.Fields;

        // Infer field types for correct operator evaluation
        var perFieldKind = fields.ToDictionary(
            f => f.Field,
            f => InferFieldKind(f.Rules));

        // Flatten all rules with their field metadata
        var flatRules = fields.SelectMany(f =>
            f.Rules.Select(r => new { Rule = r, FieldDescription = f.Description, FieldName = f.Field }))
            .ToList();

        var breakdown = flatRules.Select(item =>
        {
            var actualRaw = inputs.GetValueOrDefault(item.FieldName, string.Empty);
            var kind = perFieldKind.GetValueOrDefault(item.FieldName, FieldKind.String);
            var actual = ParseActualValue(actualRaw, kind);
            var missingInput = actual is null;
            var matched = !missingInput && MatchOperator(item.Rule.Operator, item.Rule.Value, actual!);

            return new RuleBreakdownItem
            {
                Field = item.FieldName,
                FieldDescription = item.FieldDescription,
                Operator = item.Rule.Operator,
                RuleValue = item.Rule.Value,
                Score = item.Rule.Score,
                Matched = matched,
                ActualValue = actual?.ToString(),
                SkippedBecauseMissingInput = missingInput
            };
        }).ToList();

        var rawTotal = breakdown.Where(b => b.Matched).Sum(b => b.Score);
        var totalScore = Math.Min(rawTotal, scoreCard.MaxScore);
        var matchedCount = breakdown.Count(b => b.Matched);

        var riskGrade = DetermineRiskGrade(totalScore, scoreCard.MaxScore);

        return new ScoreEngineResult
        {
            MaxScore = scoreCard.MaxScore,
            TotalScore = totalScore,
            MatchedRules = matchedCount,
            RiskGrade = riskGrade,
            Breakdown = breakdown
        };
    }

    public static RiskGrade DetermineRiskGrade(int totalScore, int maxScore)
    {
        if (maxScore <= 0) return RiskGrade.High;
        var lowCutoff = maxScore * 0.6;
        var mediumCutoff = maxScore * 0.4;
        if (totalScore >= lowCutoff) return RiskGrade.Low;
        if (totalScore >= mediumCutoff) return RiskGrade.Medium;
        return RiskGrade.High;
    }

    private static FieldKind InferFieldKind(IEnumerable<ScorecardRule> rules)
    {
        var ruleList = rules.ToList();
        if (ruleList.Any(r => r.Operator is
            ScorecardOperator.GreaterThan or
            ScorecardOperator.LessThan or
            ScorecardOperator.GreaterThanOrEqual or
            ScorecardOperator.LessThanOrEqual or
            ScorecardOperator.Between))
            return FieldKind.Number;

        if (ruleList.Any(r =>
        {
            var v = r.Value.Trim().ToLowerInvariant();
            return v is "true" or "false";
        }))
            return FieldKind.Boolean;

        return FieldKind.String;
    }

    private static object? ParseActualValue(string raw, FieldKind kind)
    {
        var trimmed = raw.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;

        return kind switch
        {
            FieldKind.Number => double.TryParse(trimmed, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var num) ? num : null,
            FieldKind.Boolean => trimmed.ToLowerInvariant() switch
            {
                "true" => (object)true,
                "false" => false,
                _ => null
            },
            _ => trimmed
        };
    }

    private static bool MatchOperator(ScorecardOperator op, string ruleValue, object actual)
    {
        return op switch
        {
            ScorecardOperator.Equal => MatchEqual(ruleValue, actual),
            ScorecardOperator.NotEqual => !MatchEqual(ruleValue, actual),
            ScorecardOperator.GreaterThan => actual is double d && double.TryParse(ruleValue,
                System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var ev) && d > ev,
            ScorecardOperator.LessThan => actual is double d2 && double.TryParse(ruleValue,
                System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var ev2) && d2 < ev2,
            ScorecardOperator.GreaterThanOrEqual => actual is double d3 && double.TryParse(ruleValue,
                System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var ev3) && d3 >= ev3,
            ScorecardOperator.LessThanOrEqual => actual is double d4 && double.TryParse(ruleValue,
                System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var ev4) && d4 <= ev4,
            ScorecardOperator.Between => MatchBetween(ruleValue, actual),
            ScorecardOperator.In => MatchIn(ruleValue, actual),
            ScorecardOperator.NotIn => !MatchIn(ruleValue, actual),
            ScorecardOperator.Contains => actual?.ToString()?.Contains(ruleValue, StringComparison.OrdinalIgnoreCase) ?? false,
            _ => false
        };
    }

    private static bool MatchEqual(string ruleValue, object actual)
    {
        return actual switch
        {
            double d => double.TryParse(ruleValue, System.Globalization.NumberStyles.Any,
                System.Globalization.CultureInfo.InvariantCulture, out var expected) && d == expected,
            bool b => ruleValue.Trim().ToLowerInvariant() == "true" == b,
            _ => actual?.ToString() == ruleValue
        };
    }

    private static bool MatchBetween(string ruleValue, object actual)
    {
        if (actual is not double dActual) return false;

        var normalized = System.Text.RegularExpressions.Regex.Replace(ruleValue.Trim(), @"\s+to\s+", ",", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
        normalized = System.Text.RegularExpressions.Regex.Replace(normalized, @"\.\.+", ",");
        normalized = System.Text.RegularExpressions.Regex.Replace(normalized, @"\s*-\s*", ",");

        var parts = normalized.Split(',').Select(s => s.Trim()).Where(s => !string.IsNullOrEmpty(s)).ToArray();
        if (parts.Length != 2) return false;

        return double.TryParse(parts[0], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var min)
            && double.TryParse(parts[1], System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var max)
            && dActual >= min && dActual <= max;
    }

    private static bool MatchIn(string ruleValue, object actual)
    {
        var list = ruleValue.Split(',').Select(s => s.Trim()).ToList();
        return list.Contains(actual?.ToString() ?? string.Empty);
    }
}

public enum FieldKind { Number, Boolean, String }

public class ScoreEngineResult
{
    public int MaxScore { get; init; }
    public int TotalScore { get; init; }
    public int MatchedRules { get; init; }
    public RiskGrade RiskGrade { get; init; }
    public List<RuleBreakdownItem> Breakdown { get; init; } = [];
}

public class RuleBreakdownItem
{
    public string Field { get; init; } = string.Empty;
    public string FieldDescription { get; init; } = string.Empty;
    public ScorecardOperator Operator { get; init; }
    public string RuleValue { get; init; } = string.Empty;
    public int Score { get; init; }
    public bool Matched { get; init; }
    public string? ActualValue { get; init; }
    public bool SkippedBecauseMissingInput { get; init; }
}
