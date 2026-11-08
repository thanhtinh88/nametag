using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/photos")]
public class PhotosController : ControllerBase
{
    private readonly IPhotoStorageService _photoStorageService;
    private readonly ICurrentUserService _currentUserService;

    public PhotosController(
        IPhotoStorageService photoStorageService,
        ICurrentUserService currentUserService)
    {
        _photoStorageService = photoStorageService;
        _currentUserService = currentUserService;
    }

    [HttpGet("user")]
    public async Task<IActionResult> GetUserPhoto(CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException("User not authenticated");

        var result = await _photoStorageService.ReadUserPhotoAsync(userId, cancellationToken);
        if (result == null)
            return NotFound();

        Response.Headers.CacheControl = "private, no-store";
        return File(result.Value.Bytes, result.Value.MimeType);
    }

    [HttpGet("{personId:guid}")]
    public async Task<IActionResult> GetPersonPhoto(Guid personId, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException("User not authenticated");

        var result = await _photoStorageService.ReadPersonPhotoAsync(userId, personId, cancellationToken);
        if (result == null)
            return NotFound();

        Response.Headers.CacheControl = "private, no-store";
        return File(result.Value.Bytes, result.Value.MimeType);
    }

    [HttpGet("marks/{filename}")]
    public async Task<IActionResult> GetMarkPhoto(string filename, CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedException("User not authenticated");

        var result = await _photoStorageService.ReadMarkPhotoAsync(userId, filename, cancellationToken);
        if (result == null)
            return NotFound();

        Response.Headers.CacheControl = "private, max-age=3600";
        return File(result.Value.Bytes, result.Value.MimeType);
    }

    [HttpPost("convert")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    public async Task<IActionResult> ConvertPhoto(CancellationToken cancellationToken)
    {
        if (!Request.HasFormContentType)
            throw new BadRequestException("Invalid form data");

        var form = await Request.ReadFormAsync(cancellationToken);
        var file = form.Files["photo"];
        if (file == null || file.Length == 0)
            throw new BadRequestException("No photo file provided");

        if (file.Length > 50 * 1024 * 1024)
            throw new PayloadTooLargeException("Photo exceeds maximum size of 50MB");

        using var stream = file.OpenReadStream();
        var (bytes, mimeType) = await _photoStorageService.ConvertHeicToJpegAsync(stream, cancellationToken);

        return File(bytes, mimeType);
    }
}
