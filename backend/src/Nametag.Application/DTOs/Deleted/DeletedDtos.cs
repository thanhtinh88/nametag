namespace Nametag.Application.DTOs.Deleted;

public class DeletedPersonDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? Nickname { get; set; }
    public string? DisplayNameOverride { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class DeletedGroupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class DeletedRelationshipPersonSummary
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
}

public class DeletedRelationshipTypeSummary
{
    public Guid Id { get; set; }
    public string Label { get; set; } = string.Empty;
}

public class DeletedRelationshipDto
{
    public Guid Id { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DeletedRelationshipPersonSummary Person { get; set; } = null!;
    public DeletedRelationshipPersonSummary RelatedPerson { get; set; } = null!;
    public DeletedRelationshipTypeSummary? RelationshipType { get; set; }
}

public class DeletedRelationshipTypeDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? Color { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class DeletedImportantDateDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public DateTime? DeletedAt { get; set; }
    public DeletedRelationshipPersonSummary Person { get; set; } = null!;
}

public class DeletedEventDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Category { get; set; }
    public string Status { get; set; } = "PLANNED";
    public DateTime? DeletedAt { get; set; }
}

public class DeletedGangDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
    public DateTime? DeletedAt { get; set; }
}

public class DeletedCustomFieldTemplateDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public DateTime? DeletedAt { get; set; }
}

public class DeletedResponseDto
{
    public object Deleted { get; set; } = new List<object>();
    public int RetentionDays { get; set; } = 30;
    public string CutoffDate { get; set; } = string.Empty;
}

