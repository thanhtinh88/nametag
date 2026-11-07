namespace Nametag.Application.DTOs.Gang;

public class GangMemberPersonDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Surname { get; set; }
    public string? Nickname { get; set; }
    public string? Photo { get; set; }
    public string? ManagementLevel { get; set; }
    public string? ThreatLevel { get; set; }
}

public class GangMemberDto
{
    public Guid Id { get; set; }
    public Guid GangId { get; set; }
    public Guid PersonId { get; set; }
    public string Role { get; set; } = "MEMBER";
    public string? Notes { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime? LeftAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public GangMemberPersonDto? Person { get; set; }
}

public class GangDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Turf { get; set; }
    public string? Color { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<GangMemberDto> Members { get; set; } = new();
}

public class CreateGangRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Turf { get; set; }
    public string? Color { get; set; }
}

public class UpdateGangRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Turf { get; set; }
    public string? Color { get; set; }
}

public class AddGangMemberRequest
{
    public Guid PersonId { get; set; }
    public string? Role { get; set; } = "MEMBER";
    public string? Notes { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime? LeftAt { get; set; }
}

