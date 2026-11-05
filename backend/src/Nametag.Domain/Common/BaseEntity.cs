namespace Nametag.Domain.Common;

public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.CreateVersion7();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public abstract class BaseAuditableEntity : BaseEntity
{
    public Guid UserId { get; set; }
}

public interface ISoftDeletable
{
    public DateTime? DeletedAt { get; set; }
}

