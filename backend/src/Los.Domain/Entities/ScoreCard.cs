using Los.Domain.Common;
using Los.Domain.Enums;

namespace Los.Domain.Entities;

/// <summary>
/// Risk scorecard containing fields and rules for scoring loan applicants.
/// </summary>
public class ScoreCard : BaseEntity
{
    public string ScorecardCode { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public int MaxScore { get; private set; }

    private readonly List<ScoreCardField> _fields = [];
    public IReadOnlyList<ScoreCardField> Fields => _fields.AsReadOnly();

    protected ScoreCard() { }

    public static ScoreCard Create(string name, int maxScore, string? scorecardCode = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (maxScore <= 0) throw new ArgumentOutOfRangeException(nameof(maxScore), "MaxScore must be positive.");

        return new ScoreCard
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Name = name.Trim(),
            MaxScore = maxScore,
            ScorecardCode = scorecardCode?.Trim() ?? $"SC-{Guid.NewGuid():N}"[..12].ToUpperInvariant()
        };
    }

    public void Update(string name, int maxScore)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        if (maxScore <= 0) throw new ArgumentOutOfRangeException(nameof(maxScore));
        Name = name.Trim();
        MaxScore = maxScore;
        SetUpdatedAt();
    }

    public ScoreCardField AddField(string field, string description)
    {
        var f = ScoreCardField.Create(field, description, Id);
        _fields.Add(f);
        SetUpdatedAt();
        return f;
    }

    public void SetFields(IEnumerable<ScoreCardField> fields)
    {
        _fields.Clear();
        _fields.AddRange(fields);
        SetUpdatedAt();
    }
}

public class ScoreCardField : BaseEntity
{
    public string Field { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public Guid ScoreCardId { get; private set; }

    private readonly List<ScorecardRule> _rules = [];
    public IReadOnlyList<ScorecardRule> Rules => _rules.AsReadOnly();

    protected ScoreCardField() { }

    internal static ScoreCardField Create(string field, string description, Guid scoreCardId)
    {
        return new ScoreCardField
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Field = field.Trim(),
            Description = string.IsNullOrWhiteSpace(description) ? HumanizeFieldName(field) : description.Trim(),
            ScoreCardId = scoreCardId
        };
    }

    /// <summary>Public factory for use by Application layer when replacing fields on update.</summary>
    public static ScoreCardField CreatePublic(string field, string description, Guid scoreCardId) =>
        Create(field, description, scoreCardId);

    public ScorecardRule AddRule(ScorecardOperator op, string value, int score)
    {
        var rule = ScorecardRule.Create(Field, op, value, score, Id);
        _rules.Add(rule);
        SetUpdatedAt();
        return rule;
    }

    public void SetRules(IEnumerable<ScorecardRule> rules)
    {
        _rules.Clear();
        _rules.AddRange(rules);
        SetUpdatedAt();
    }

    private static string HumanizeFieldName(string field)
    {
        var result = System.Text.RegularExpressions.Regex.Replace(field, @"([a-z0-9])([A-Z])", "$1 $2");
        result = result.Replace("_", " ").Replace("-", " ");
        return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(result.ToLower());
    }
}

public class ScorecardRule : BaseEntity
{
    public string Field { get; private set; } = string.Empty;
    public ScorecardOperator Operator { get; private set; }
    public string Value { get; private set; } = string.Empty;
    public int Score { get; private set; }
    public Guid ScoreCardFieldId { get; private set; }

    protected ScorecardRule() { }

    internal static ScorecardRule Create(string field, ScorecardOperator op, string value, int score, Guid fieldId)
    {
        return new ScorecardRule
        {
            Id = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            Field = field.Trim(),
            Operator = op,
            Value = value,
            Score = score,
            ScoreCardFieldId = fieldId
        };
    }
}
