namespace ChaosCoordinator.Domain;

public class Project
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public string Name { get; set; } = "";
    public DateTime CreatedAt { get; set; }

    public ICollection<ProjectTask> Tasks { get; set; } = new List<ProjectTask>();
}

public class ProjectTask
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public Project? Project { get; set; }

    public string Title { get; set; } = "";
    public bool Done { get; set; }

    public Guid? AssigneeId { get; set; }
    public User? Assignee { get; set; }

    public int Order { get; set; }
}
