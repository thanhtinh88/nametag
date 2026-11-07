using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Gang;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class GangsController : ControllerBase
{
    private readonly IGangService _gangService;
    private readonly ICurrentUserService _currentUserService;

    public GangsController(IGangService gangService, ICurrentUserService currentUserService)
    {
        _gangService = gangService;
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
    public async Task<IActionResult> GetGangs()
    {
        var gangs = await _gangService.GetGangsAsync(GetUserId());
        return Ok(new { gangs });
    }

    [HttpPost]
    public async Task<IActionResult> CreateGang([FromBody] CreateGangRequest request)
    {
        var gang = await _gangService.CreateGangAsync(GetUserId(), request);
        return StatusCode(StatusCodes.Status201Created, new { gang });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetGangById(Guid id)
    {
        var gang = await _gangService.GetGangByIdAsync(GetUserId(), id);
        return Ok(new { gang });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateGang(Guid id, [FromBody] UpdateGangRequest request)
    {
        var gang = await _gangService.UpdateGangAsync(GetUserId(), id, request);
        return Ok(new { gang });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteGang(Guid id)
    {
        await _gangService.DeleteGangAsync(GetUserId(), id);
        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/members")]
    public async Task<IActionResult> AddOrUpdateMember(Guid id, [FromBody] AddGangMemberRequest request)
    {
        var membership = await _gangService.AddOrUpdateMemberAsync(GetUserId(), id, request);
        return Ok(new { membership });
    }

    [HttpDelete("{id:guid}/members/{personId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid id, Guid personId)
    {
        await _gangService.RemoveMemberAsync(GetUserId(), id, personId);
        return Ok(new { success = true });
    }
}
