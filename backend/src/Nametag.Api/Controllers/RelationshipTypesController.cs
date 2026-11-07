using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Relationship;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/relationship-types")]
public class RelationshipTypesController : ControllerBase
{
    private readonly IRelationshipService _relationshipService;
    private readonly ICurrentUserService _currentUserService;

    public RelationshipTypesController(IRelationshipService relationshipService, ICurrentUserService currentUserService)
    {
        _relationshipService = relationshipService;
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
    public async Task<IActionResult> GetRelationshipTypes()
    {
        var relationshipTypes = await _relationshipService.GetRelationshipTypesAsync(GetUserId());
        return Ok(new { relationshipTypes });
    }

    [HttpPost]
    public async Task<IActionResult> CreateRelationshipType([FromBody] CreateRelationshipTypeRequest request)
    {
        var relationshipType = await _relationshipService.CreateRelationshipTypeAsync(GetUserId(), request);
        return StatusCode(StatusCodes.Status201Created, new { relationshipType });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetRelationshipTypeById(Guid id)
    {
        var relationshipType = await _relationshipService.GetRelationshipTypeByIdAsync(GetUserId(), id);
        return Ok(new { relationshipType });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateRelationshipType(Guid id, [FromBody] UpdateRelationshipTypeRequest request)
    {
        var relationshipType = await _relationshipService.UpdateRelationshipTypeAsync(GetUserId(), id, request);
        return Ok(new { relationshipType });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteRelationshipType(Guid id)
    {
        await _relationshipService.SoftDeleteRelationshipTypeAsync(GetUserId(), id);
        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> RestoreRelationshipType(Guid id)
    {
        var relationshipType = await _relationshipService.RestoreRelationshipTypeAsync(GetUserId(), id);
        return Ok(new { relationshipType });
    }

    [HttpDelete("{id:guid}/permanent")]
    public async Task<IActionResult> PermanentDeleteRelationshipType(Guid id)
    {
        await _relationshipService.PermanentDeleteRelationshipTypeAsync(GetUserId(), id);
        return Ok(new { success = true });
    }
}

