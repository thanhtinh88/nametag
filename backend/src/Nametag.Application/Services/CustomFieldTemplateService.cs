using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;
using FluentValidation;
using Microsoft.EntityFrameworkCore;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.CustomFieldTemplate;
using Nametag.Domain.Entities;
using Nametag.Domain.Enums;
using ValidationException = Nametag.Application.Common.Exceptions.ValidationException;

namespace Nametag.Application.Services;

public class CustomFieldTemplateService : ICustomFieldTemplateService
{
    private readonly IAppDbContext _context;
    private readonly IValidator<CreateCustomFieldTemplateRequest> _createValidator;
    private readonly IValidator<UpdateCustomFieldTemplateRequest> _updateValidator;
    private readonly IValidator<ReorderCustomFieldTemplatesRequest> _reorderValidator;

    public CustomFieldTemplateService(
        IAppDbContext context,
        IValidator<CreateCustomFieldTemplateRequest> createValidator,
        IValidator<UpdateCustomFieldTemplateRequest> updateValidator,
        IValidator<ReorderCustomFieldTemplatesRequest> reorderValidator)
    {
        _context = context;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _reorderValidator = reorderValidator;
    }

    public static string DeriveSlug(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        // Normalize and remove diacritics
        var normalizedString = input.Normalize(NormalizationForm.FormD);
        var sb = new StringBuilder();

        foreach (var c in normalizedString)
        {
            var unicodeCategory = CharUnicodeInfo.GetUnicodeCategory(c);
            if (unicodeCategory != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }

        var clean = sb.ToString().Normalize(NormalizationForm.FormC).ToLowerInvariant();
        clean = Regex.Replace(clean, @"[^a-z0-9\s-]", "");
        clean = clean.Trim();
        clean = Regex.Replace(clean, @"\s+", "-");
        clean = Regex.Replace(clean, @"-+", "-");
        return clean.Trim('-');
    }

    private static (string From, string To)? DetectOptionRename(List<string> oldOptions, List<string> newOptions)
    {
        var oldSet = new HashSet<string>(oldOptions);
        var newSet = new HashSet<string>(newOptions);

        var removed = oldOptions.Where(o => !newSet.Contains(o)).ToList();
        var added = newOptions.Where(o => !oldSet.Contains(o)).ToList();

        if (removed.Count == 1 && added.Count == 1)
        {
            return (removed[0], added[0]);
        }

        return null;
    }

    public async Task<List<CustomFieldTemplateDto>> GetTemplatesAsync(Guid userId, CancellationToken ct = default)
    {
        var templates = await _context.CustomFieldTemplates
            .AsNoTracking()
            .Where(t => t.UserId == userId && t.DeletedAt == null)
            .Include(t => t.Values)
            .OrderBy(t => t.Order)
            .ThenBy(t => t.CreatedAt)
            .ToListAsync(ct);

        return templates.Select(MapToDto).ToList();
    }

    public async Task<CustomFieldTemplateDto> GetTemplateByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var template = await _context.CustomFieldTemplates
            .AsNoTracking()
            .Where(t => t.Id == id && t.UserId == userId && t.DeletedAt == null)
            .Include(t => t.Values)
            .FirstOrDefaultAsync(ct);

        if (template == null)
        {
            throw new NotFoundException("Custom field template not found");
        }

        return MapToDto(template);
    }

    public async Task<CustomFieldTemplateDto> CreateTemplateAsync(Guid userId, CreateCustomFieldTemplateRequest request, CancellationToken ct = default)
    {
        var validationResult = await _createValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors.First().ErrorMessage);
        }

        var trimmedName = request.Name.Trim();
        var slug = DeriveSlug(trimmedName);
        if (string.IsNullOrEmpty(slug))
        {
            throw new BadRequestException("Name must contain at least one alphanumeric character");
        }

        var existingWithSlug = await _context.CustomFieldTemplates
            .AnyAsync(t => t.UserId == userId && t.Slug == slug && t.DeletedAt == null, ct);
        if (existingWithSlug)
        {
            throw new ConflictException("A custom field with this name already exists");
        }

        if (!Enum.TryParse<CustomFieldType>(request.Type, true, out var typeEnum))
        {
            throw new BadRequestException("Invalid custom field type");
        }

        var lastOrder = await _context.CustomFieldTemplates
            .Where(t => t.UserId == userId && t.DeletedAt == null)
            .OrderByDescending(t => t.Order)
            .Select(t => (int?)t.Order)
            .FirstOrDefaultAsync(ct);

        var nextOrder = (lastOrder ?? -1) + 1;

        var template = new CustomFieldTemplate
        {
            UserId = userId,
            Name = trimmedName,
            Slug = slug,
            Type = typeEnum,
            Options = request.Options ?? new List<string>(),
            Order = nextOrder
        };

        _context.CustomFieldTemplates.Add(template);
        await _context.SaveChangesAsync(ct);

        return MapToDto(template);
    }

    public async Task<CustomFieldTemplateDto> UpdateTemplateAsync(Guid userId, Guid id, UpdateCustomFieldTemplateRequest request, CancellationToken ct = default)
    {
        var validationResult = await _updateValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors.First().ErrorMessage);
        }

        var template = await _context.CustomFieldTemplates
            .Where(t => t.Id == id && t.UserId == userId && t.DeletedAt == null)
            .Include(t => t.Values)
            .FirstOrDefaultAsync(ct);

        if (template == null)
        {
            throw new NotFoundException("Custom field template not found");
        }

        if (request.Name != null)
        {
            template.Name = request.Name.Trim();
        }

        if (request.Options != null)
        {
            if (template.Type == CustomFieldType.SELECT)
            {
                var rename = DetectOptionRename(template.Options, request.Options);
                if (rename.HasValue)
                {
                    var valuesToUpdate = await _context.PersonCustomFieldValues
                        .Where(v => v.TemplateId == id && v.Value == rename.Value.From)
                        .ToListAsync(ct);

                    foreach (var val in valuesToUpdate)
                    {
                        val.Value = rename.Value.To;
                    }
                }
            }

            template.Options = request.Options;
        }

        await _context.SaveChangesAsync(ct);

        return MapToDto(template);
    }

    public async Task DeleteTemplateAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var template = await _context.CustomFieldTemplates
            .Where(t => t.Id == id && t.UserId == userId && t.DeletedAt == null)
            .FirstOrDefaultAsync(ct);

        if (template == null)
        {
            throw new NotFoundException("Custom field template not found");
        }

        template.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    public async Task ReorderTemplatesAsync(Guid userId, ReorderCustomFieldTemplatesRequest request, CancellationToken ct = default)
    {
        var validationResult = await _reorderValidator.ValidateAsync(request, ct);
        if (!validationResult.IsValid)
        {
            throw new ValidationException(validationResult.Errors.First().ErrorMessage);
        }

        var activeTemplates = await _context.CustomFieldTemplates
            .Where(t => t.UserId == userId && t.DeletedAt == null)
            .ToListAsync(ct);

        if (activeTemplates.Count != request.Ids.Count)
        {
            throw new BadRequestException("Reorder must include all active templates");
        }

        var activeIdSet = activeTemplates.Select(t => t.Id).ToHashSet();
        if (request.Ids.Any(id => !activeIdSet.Contains(id)))
        {
            throw new BadRequestException("Reorder must include all active templates");
        }

        var templateDict = activeTemplates.ToDictionary(t => t.Id);
        for (var i = 0; i < request.Ids.Count; i++)
        {
            var id = request.Ids[i];
            templateDict[id].Order = i;
        }

        await _context.SaveChangesAsync(ct);
    }

    private static CustomFieldTemplateDto MapToDto(CustomFieldTemplate t)
    {
        return new CustomFieldTemplateDto
        {
            Id = t.Id,
            Name = t.Name,
            Slug = t.Slug,
            Type = t.Type.ToString(),
            Options = t.Options ?? new List<string>(),
            Order = t.Order,
            CreatedAt = t.CreatedAt,
            UpdatedAt = t.UpdatedAt,
            _count = new CustomFieldTemplateCountDto
            {
                Values = t.Values?.Count ?? 0
            }
        };
    }
}
