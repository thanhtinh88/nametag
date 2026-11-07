namespace Nametag.Application.DTOs.CustomFieldTemplate;

public class CustomFieldTemplateCountDto
{
    public int Values { get; set; }
}

public class CustomFieldTemplateDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public int Order { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public CustomFieldTemplateCountDto? _count { get; set; }
}

public class CreateCustomFieldTemplateRequest
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public List<string>? Options { get; set; }
}

public class UpdateCustomFieldTemplateRequest
{
    public string? Name { get; set; }
    public List<string>? Options { get; set; }
}

public class ReorderCustomFieldTemplatesRequest
{
    public List<Guid> Ids { get; set; } = new();
}

