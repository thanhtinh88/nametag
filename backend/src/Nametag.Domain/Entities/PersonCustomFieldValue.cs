using Nametag.Domain.Common;

namespace Nametag.Domain.Entities;

public class PersonCustomFieldValue : BaseEntity
{
    public Guid PersonId { get; set; }
    public Person Person { get; set; } = null!;

    public Guid TemplateId { get; set; }
    public CustomFieldTemplate Template { get; set; } = null!;

    public string Value { get; set; } = string.Empty;
}

