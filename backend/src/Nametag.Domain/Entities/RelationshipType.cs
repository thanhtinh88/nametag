using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class RelationshipType : BaseAuditableEntity, ISoftDeletable
{
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Category { get; set; } = "CRIMINAL";
    public string DirectionType { get; set; } = "BIDIRECTIONAL";
    public string? LineStyle { get; set; } = "SOLID";
    public string? Color { get; set; }
    public Guid? InverseId { get; set; }
    public DateTime? DeletedAt { get; set; }

    // Navigation
    public User? User { get; set; }
    public RelationshipType? Inverse { get; set; }
    public ICollection<RelationshipType> InverseOf { get; set; } = new List<RelationshipType>();
    public ICollection<Relationship> Relationships { get; set; } = new List<Relationship>();
    public ICollection<Person> PeopleWithRelation { get; set; } = new List<Person>();
}

