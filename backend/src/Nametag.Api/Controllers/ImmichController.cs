using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Immich;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/immich")]
public class ImmichController : ControllerBase
{
    private readonly IImmichService _immichService;
    private readonly ICurrentUserService _currentUserService;

    public ImmichController(
        IImmichService immichService,
        ICurrentUserService currentUserService)
    {
        _immichService = immichService;
        _currentUserService = currentUserService;
    }

    private Guid GetUserId() => _currentUserService.UserId
        ?? throw new UnauthorizedException("User not authenticated");

    [HttpGet("connection")]
    public async Task<IActionResult> GetConnection(CancellationToken ct)
    {
        var connection = await _immichService.GetConnectionAsync(GetUserId(), ct);
        return Ok(new { connection });
    }

    [HttpPut("connection")]
    public async Task<IActionResult> SaveConnection([FromBody] SaveImmichConnectionRequest request, CancellationToken ct)
    {
        var connection = await _immichService.SaveConnectionAsync(GetUserId(), request, ct);
        return Ok(new { connection });
    }

    [HttpDelete("connection")]
    public async Task<IActionResult> DeleteConnection(CancellationToken ct)
    {
        await _immichService.DeleteConnectionAsync(GetUserId(), ct);
        return Ok(new { success = true });
    }

    [HttpPost("connection/test")]
    public async Task<IActionResult> TestConnection([FromBody] TestImmichConnectionRequest request, CancellationToken ct)
    {
        var result = await _immichService.TestConnectionAsync(GetUserId(), request, ct);
        return Ok(result);
    }

    [HttpGet("assets")]
    public async Task<IActionResult> GetAssets(
        [FromQuery] string? personId,
        [FromQuery] string? albumId,
        CancellationToken ct)
    {
        var (assets, publicUrl) = await _immichService.GetAssetsAsync(GetUserId(), personId, albumId, ct);
        return Ok(new { assets, publicUrl });
    }

    [HttpGet("assets/{assetId}/{variant}")]
    public async Task<IActionResult> StreamAsset(string assetId, string variant, CancellationToken ct)
    {
        var rangeHeader = Request.Headers.Range.ToString();
        var result = await _immichService.StreamAssetBinaryAsync(GetUserId(), assetId, variant, rangeHeader, ct);

        foreach (var (header, value) in result.Headers)
        {
            Response.Headers[header] = value;
        }

        return new FileStreamResult(result.Stream, result.ContentType ?? "application/octet-stream")
        {
            EnableRangeProcessing = true
        };
    }

    [HttpGet("albums")]
    public async Task<IActionResult> GetAlbums(CancellationToken ct)
    {
        var albums = await _immichService.GetAlbumsAsync(GetUserId(), ct);
        return Ok(new { albums });
    }

    [HttpGet("people")]
    public async Task<IActionResult> GetPeople([FromQuery] string? q, CancellationToken ct)
    {
        var people = await _immichService.GetPeopleAsync(GetUserId(), q, ct);
        return Ok(new { people });
    }

    [HttpGet("people/{immichPersonId}/thumbnail")]
    public async Task<IActionResult> StreamPersonThumbnail(string immichPersonId, CancellationToken ct)
    {
        var result = await _immichService.StreamPersonThumbnailAsync(GetUserId(), immichPersonId, ct);

        foreach (var (header, value) in result.Headers)
        {
            Response.Headers[header] = value;
        }

        return new FileStreamResult(result.Stream, result.ContentType ?? "image/jpeg");
    }
}
