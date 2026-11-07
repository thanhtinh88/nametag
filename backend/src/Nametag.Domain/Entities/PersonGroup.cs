namespace Nametag.Domain.Entities;

public class PersonGroup
{
    public Guid PersonId { get; set; }
    public Guid GroupId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Person? Person { get; set; }
    public Group? Group { get; set; }
}

