using Nametag.Application.DTOs.CustomFieldTemplate;

namespace Nametag.Application.Services;

public interface ICustomFieldTemplateService
{
    Task<List<CustomFieldTemplateDto>> GetTemplatesAsync(Guid userId, CancellationToken ct = default);
    Task<CustomFieldTemplateDto> GetTemplateByIdAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task<CustomFieldTemplateDto> CreateTemplateAsync(Guid userId, CreateCustomFieldTemplateRequest request, CancellationToken ct = default);
    Task<CustomFieldTemplateDto> UpdateTemplateAsync(Guid userId, Guid id, UpdateCustomFieldTemplateRequest request, CancellationToken ct = default);
    Task DeleteTemplateAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task ReorderTemplatesAsync(Guid userId, ReorderCustomFieldTemplatesRequest request, CancellationToken ct = default);
}

