using Nametag.Application.DTOs.Group;

namespace Nametag.Application.DTOs.Relationship;

public class RelationshipTypeSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Color { get; set; }
}

public class RelationshipTypeDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Category { get; set; } = "CRIMINAL";
    public string DirectionType { get; set; } = "BIDIRECTIONAL";
    public string? LineStyle { get; set; } = "SOLID";
    public string? Color { get; set; }
    public Guid? InverseId { get; set; }
    public RelationshipTypeSummaryDto? Inverse { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class CreateRelationshipTypeRequest
{
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string? DirectionType { get; set; }
    public string? LineStyle { get; set; }
    public string? Color { get; set; }
    public Guid? InverseId { get; set; }
    public string? InverseLabel { get; set; }
    public bool? Symmetric { get; set; }
}

public class UpdateRelationshipTypeRequest : CreateRelationshipTypeRequest
{
}

public class RelationshipDto
{
    public Guid Id { get; set; }
    public Guid PersonId { get; set; }
    public Guid RelatedPersonId { get; set; }
    public Guid? RelationshipTypeId { get; set; }
    public string VerificationStatus { get; set; } = "CONFIRMED";
    public string? Confidence { get; set; } = "HIGH";
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Source { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public PersonSummaryDto? Person { get; set; }
    public PersonSummaryDto? RelatedPerson { get; set; }
    public RelationshipTypeSummaryDto? RelationshipType { get; set; }
}

public class CreateRelationshipRequest
{
    public Guid PersonId { get; set; }
    public Guid RelatedPersonId { get; set; }
    public Guid? RelationshipTypeId { get; set; }
    public string? VerificationStatus { get; set; }
    public string? Confidence { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Source { get; set; }
    public string? Notes { get; set; }
}

public class UpdateRelationshipRequest
{
    public Guid? RelationshipTypeId { get; set; }
    public string? VerificationStatus { get; set; }
    public string? Confidence { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Source { get; set; }
    public string? Notes { get; set; }
}

