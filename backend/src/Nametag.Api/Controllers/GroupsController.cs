using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Group;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class GroupsController : ControllerBase
{
    private readonly IGroupService _groupService;
    private readonly ICurrentUserService _currentUserService;

    public GroupsController(IGroupService groupService, ICurrentUserService currentUserService)
    {
        _groupService = groupService;
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
    public async Task<IActionResult> GetGroups()
    {
        var groups = await _groupService.GetGroupsAsync(GetUserId());
        return Ok(new { groups });
    }

    [HttpPost]
    public async Task<IActionResult> CreateGroup([FromBody] CreateGroupRequest request)
    {
        var group = await _groupService.CreateGroupAsync(GetUserId(), request);
        return StatusCode(StatusCodes.Status201Created, new { group });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetGroupById(Guid id)
    {
        var group = await _groupService.GetGroupByIdAsync(GetUserId(), id);
        return Ok(new { group });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateGroup(Guid id, [FromBody] UpdateGroupRequest request)
    {
        var group = await _groupService.UpdateGroupAsync(GetUserId(), id, request);
        return Ok(new { group });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteGroup(Guid id, [FromQuery] bool deletePeople = false)
    {
        await _groupService.SoftDeleteGroupAsync(GetUserId(), id, deletePeople);
        return Ok(new { message = "Group deleted successfully" });
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> RestoreGroup(Guid id)
    {
        var group = await _groupService.RestoreGroupAsync(GetUserId(), id);
        return Ok(new { group });
    }

    [HttpDelete("{id:guid}/permanent")]
    public async Task<IActionResult> PermanentDeleteGroup(Guid id)
    {
        await _groupService.PermanentDeleteGroupAsync(GetUserId(), id);
        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddMember(Guid id, [FromBody] AddGroupMemberRequest request)
    {
        await _groupService.AddMemberAsync(GetUserId(), id, request.PersonId);
        return Ok(new { success = true });
    }

    [HttpDelete("{id:guid}/members/{personId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid personId)
    {
        await _groupService.RemoveMemberAsync(GetUserId(), id, personId);
        return Ok(new { success = true });
    }
}

