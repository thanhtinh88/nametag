using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DeletedController : ControllerBase
{
    private readonly IDeletedService _deletedService;
    private readonly ICurrentUserService _currentUserService;

    public DeletedController(
        IDeletedService deletedService,
        ICurrentUserService currentUserService)
    {
        _deletedService = deletedService;
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
    public async Task<IActionResult> GetDeleted([FromQuery] string? type)
    {
        var result = await _deletedService.GetDeletedAsync(GetUserId(), type);
        return Ok(result);
    }
}

