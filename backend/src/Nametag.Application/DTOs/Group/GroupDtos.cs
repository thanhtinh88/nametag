namespace Nametag.Application.DTOs.Group;

public class PersonSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? Nickname { get; set; }
    public string? DisplayNameOverride { get; set; }
    public string? Photo { get; set; }
}

public class PersonGroupDto
{
    public Guid PersonId { get; set; }
    public Guid GroupId { get; set; }
    public DateTime AddedAt { get; set; }
    public PersonSummaryDto? Person { get; set; }
}

public class GroupDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; }
    public List<PersonGroupDto> People { get; set; } = new();
}

public class CreateGroupRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public List<Guid>? PeopleIds { get; set; }
}

public class UpdateGroupRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
}

public class AddGroupMemberRequest
{
    public Guid PersonId { get; set; }
}

