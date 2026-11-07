using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class PersonCustomField : BaseEntity
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;
    public string Key { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string? Type { get; set; }
}

