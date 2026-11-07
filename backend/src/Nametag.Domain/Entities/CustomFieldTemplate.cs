using Nametag.Domain.Common;
using Nametag.Domain.Enums;

namespace Nametag.Domain.Entities;

public class CustomFieldTemplate : BaseAuditableEntity, ISoftDeletable
{
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public CustomFieldType Type { get; set; }
    public List<string> Options { get; set; } = new();
    public int Order { get; set; } = 0;
    public DateTime? DeletedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public ICollection<PersonCustomFieldValue> Values { get; set; } = new List<PersonCustomFieldValue>();
}

