using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Relationship;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class RelationshipsController : ControllerBase
{
    private readonly IRelationshipService _relationshipService;
    private readonly ICurrentUserService _currentUserService;

    public RelationshipsController(IRelationshipService relationshipService, ICurrentUserService currentUserService)
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
    public async Task<IActionResult> GetRelationships()
    {
        var relationships = await _relationshipService.GetRelationshipsAsync(GetUserId());
        return Ok(new { relationships });
    }

    [HttpPost]
    public async Task<IActionResult> CreateRelationship([FromBody] CreateRelationshipRequest request)
    {
        var relationship = await _relationshipService.CreateRelationshipAsync(GetUserId(), request);
        return StatusCode(StatusCodes.Status201Created, new { relationship });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetRelationshipById(Guid id)
    {
        var relationship = await _relationshipService.GetRelationshipByIdAsync(GetUserId(), id);
        return Ok(new { relationship });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateRelationship(Guid id, [FromBody] UpdateRelationshipRequest request)
    {
        var relationship = await _relationshipService.UpdateRelationshipAsync(GetUserId(), id, request);
        return Ok(new { relationship });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteRelationship(Guid id)
    {
        await _relationshipService.SoftDeleteRelationshipAsync(GetUserId(), id);
        return Ok(new { message = "Relationship deleted successfully" });
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> RestoreRelationship(Guid id)
    {
        var relationship = await _relationshipService.RestoreRelationshipAsync(GetUserId(), id);
        return Ok(new { relationship });
    }

    [HttpDelete("{id:guid}/permanent")]
    public async Task<IActionResult> PermanentDeleteRelationship(Guid id)
    {
        await _relationshipService.PermanentDeleteRelationshipAsync(GetUserId(), id);
        return Ok(new { success = true });
    }
}

