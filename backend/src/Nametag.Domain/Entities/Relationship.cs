using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class Relationship : BaseEntity, ISoftDeletable
{
    public Guid PersonId { get; set; }
    public Guid RelatedPersonId { get; set; }
    public Guid? RelationshipTypeId { get; set; }
    public string VerificationStatus { get; set; } = "CONFIRMED";
    public string? Confidence { get; set; } = "HIGH";
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Source { get; set; }
    public string? Notes { get; set; }
    public DateTime? DeletedAt { get; set; }

    // Navigation
    public Person? Person { get; set; }
    public Person? RelatedPerson { get; set; }
    public RelationshipType? RelationshipType { get; set; }
}

