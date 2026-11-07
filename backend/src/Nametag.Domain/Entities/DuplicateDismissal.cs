using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class DuplicateDismissal : BaseEntity
{
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid PersonAId { get; set; }
    public Person PersonA { get; set; } = null!;

    public Guid PersonBId { get; set; }
    public Person PersonB { get; set; } = null!;
}

