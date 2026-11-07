using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.CustomFieldTemplate;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/custom-field-templates")]
public class CustomFieldTemplatesController : ControllerBase
{
    private readonly ICustomFieldTemplateService _templateService;
    private readonly ICurrentUserService _currentUserService;

    public CustomFieldTemplatesController(
        ICustomFieldTemplateService templateService,
        ICurrentUserService currentUserService)
    {
        _templateService = templateService;
        _currentUserService = currentUserService;
    }

    private Guid GetUserId()
    {
        var userId = _currentUserService.UserId;
        if (!userId.HasValue)
        {
            throw new UnauthorizedException("Unauthorized");
        }
        return userId.Value;
    }

    [HttpGet]
    public async Task<IActionResult> GetTemplates()
    {
        var templates = await _templateService.GetTemplatesAsync(GetUserId());
        return Ok(new { templates });
    }

    [HttpPost]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateCustomFieldTemplateRequest request)
    {
        var template = await _templateService.CreateTemplateAsync(GetUserId(), request);
        return StatusCode(StatusCodes.Status201Created, new { template });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetTemplateById(Guid id)
    {
        var template = await _templateService.GetTemplateByIdAsync(GetUserId(), id);
        return Ok(new { template });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] UpdateCustomFieldTemplateRequest request)
    {
        var template = await _templateService.UpdateTemplateAsync(GetUserId(), id, request);
        return Ok(new { template });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteTemplate(Guid id)
    {
        await _templateService.DeleteTemplateAsync(GetUserId(), id);
        return Ok(new { message = "Custom field template deleted successfully" });
    }

    [HttpPut("reorder")]
    public async Task<IActionResult> ReorderTemplates([FromBody] ReorderCustomFieldTemplatesRequest request)
    {
        await _templateService.ReorderTemplatesAsync(GetUserId(), request);
        return Ok(new { message = "Custom field templates reordered successfully" });
    }
}

