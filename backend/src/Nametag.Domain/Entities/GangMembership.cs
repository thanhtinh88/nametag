using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class GangMembership : BaseEntity
{
    public Guid GangId { get; set; }
    public Gang Gang { get; set; } = null!;

    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;

    public string Role { get; set; } = "MEMBER";
    public string? Notes { get; set; }
    public DateTime? JoinedAt { get; set; }
    public DateTime? LeftAt { get; set; }
}

