namespace ChaosCoordinator.Domain;

/// <summary>Up to 4 per household, app-enforced (not a DB constraint). E.g. "Morning" done by 08:00.</summary>
public class ChoreGroup
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public string Name { get; set; } = "";
    public TimeOnly DoneByTime { get; set; }
    public int Order { get; set; }

    public ICollection<Chore> Chores { get; set; } = new List<Chore>();
}

public class Chore
{
    public Guid Id { get; set; }
    public Guid GroupId { get; set; }
    public ChoreGroup? Group { get; set; }

    public string Title { get; set; } = "";
    public string? Instructions { get; set; }
    public RecurrenceType RecurrenceType { get; set; }

    /// <summary>CSV of weekday ints (0=Sunday..6=Saturday) for RecurrenceType.CustomDays, e.g. "1,4" (Mon,Thu).</summary>
    public string? RecurrenceDays { get; set; }

    public bool PhotoRequired { get; set; }
    public bool Archived { get; set; }

    /// <summary>Specific one-off time of day this chore should alarm, independent of the group's
    /// shared DoneByTime deadline — e.g. "take medicine" at 14:00. Null means no alarm.</summary>
    public TimeOnly? AlarmTime { get; set; }

    public ICollection<ChoreAssignment> Assignments { get; set; } = new List<ChoreAssignment>();
    public ICollection<ChoreCompletion> Completions { get; set; } = new List<ChoreCompletion>();
}

/// <summary>Join table: many-to-many chore &lt;-&gt; assignee.</summary>
public class ChoreAssignment
{
    public Guid ChoreId { get; set; }
    public Chore? Chore { get; set; }

    public Guid UserId { get; set; }
    public User? User { get; set; }
}

/// <summary>One row per (ChoreId, Date) occurrence — recurring chores need per-occurrence completion state.</summary>
public class ChoreCompletion
{
    public Guid Id { get; set; }
    public Guid ChoreId { get; set; }
    public Chore? Chore { get; set; }

    public DateOnly Date { get; set; }

    public Guid CompletedById { get; set; }
    public User? CompletedBy { get; set; }

    public DateTime CompletedAt { get; set; }
    public string? PhotoUrl { get; set; }
}
