using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.EvidenceMap;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/events/{eventId:guid}/evidence-map")]
public class EvidenceMapController : ControllerBase
{
    private readonly IEvidenceMapService _evidenceMapService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<CreateMarkerRequest> _createMarkerValidator;
    private readonly IValidator<UpdateMarkerRequest> _updateMarkerValidator;
    private readonly IValidator<CreateRouteRequest> _createRouteValidator;
    private readonly IValidator<UpdateRouteRequest> _updateRouteValidator;
    private readonly IValidator<CreateDrawingRequest> _createDrawingValidator;
    private readonly IValidator<UpdateDrawingRequest> _updateDrawingValidator;

    public EvidenceMapController(
        IEvidenceMapService evidenceMapService,
        ICurrentUserService currentUserService,
        IValidator<CreateMarkerRequest> createMarkerValidator,
        IValidator<UpdateMarkerRequest> updateMarkerValidator,
        IValidator<CreateRouteRequest> createRouteValidator,
        IValidator<UpdateRouteRequest> updateRouteValidator,
        IValidator<CreateDrawingRequest> createDrawingValidator,
        IValidator<UpdateDrawingRequest> updateDrawingValidator)
    {
        _evidenceMapService = evidenceMapService;
        _currentUserService = currentUserService;
        _createMarkerValidator = createMarkerValidator;
        _updateMarkerValidator = updateMarkerValidator;
        _createRouteValidator = createRouteValidator;
        _updateRouteValidator = updateRouteValidator;
        _createDrawingValidator = createDrawingValidator;
        _updateDrawingValidator = updateDrawingValidator;
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
    public async Task<IActionResult> GetEvidenceMap(Guid eventId)
    {
        var result = await _evidenceMapService.GetEvidenceMapAsync(GetUserId(), eventId);
        return Ok(result);
    }

    [HttpPost("markers")]
    public async Task<IActionResult> CreateMarker(Guid eventId, [FromBody] CreateMarkerRequest request)
    {
        var validation = await _createMarkerValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validation.Errors);
        }

        var marker = await _evidenceMapService.CreateMarkerAsync(GetUserId(), eventId, request);
        return StatusCode(StatusCodes.Status201Created, new { marker });
    }

    [HttpPut("markers/{markerId:guid}")]
    public async Task<IActionResult> UpdateMarker(Guid eventId, Guid markerId, [FromBody] UpdateMarkerRequest request)
    {
        var validation = await _updateMarkerValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validation.Errors);
        }

        var marker = await _evidenceMapService.UpdateMarkerAsync(GetUserId(), eventId, markerId, request);
        return Ok(new { marker });
    }

    [HttpDelete("markers/{markerId:guid}")]
    public async Task<IActionResult> DeleteMarker(Guid eventId, Guid markerId)
    {
        await _evidenceMapService.DeleteMarkerAsync(GetUserId(), eventId, markerId);
        return Ok(new { deleted = true });
    }

    [HttpPost("routes")]
    public async Task<IActionResult> CreateRoute(Guid eventId, [FromBody] CreateRouteRequest request)
    {
        var validation = await _createRouteValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validation.Errors);
        }

        var route = await _evidenceMapService.CreateRouteAsync(GetUserId(), eventId, request);
        return StatusCode(StatusCodes.Status201Created, new { route });
    }

    [HttpPut("routes/{routeId:guid}")]
    public async Task<IActionResult> UpdateRoute(Guid eventId, Guid routeId, [FromBody] UpdateRouteRequest request)
    {
        var validation = await _updateRouteValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validation.Errors);
        }

        var route = await _evidenceMapService.UpdateRouteAsync(GetUserId(), eventId, routeId, request);
        return Ok(new { route });
    }

    [HttpDelete("routes/{routeId:guid}")]
    public async Task<IActionResult> DeleteRoute(Guid eventId, Guid routeId)
    {
        await _evidenceMapService.DeleteRouteAsync(GetUserId(), eventId, routeId);
        return Ok(new { deleted = true });
    }

    [HttpPost("drawings")]
    public async Task<IActionResult> CreateDrawing(Guid eventId, [FromBody] CreateDrawingRequest request)
    {
        var validation = await _createDrawingValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validation.Errors);
        }

        var drawing = await _evidenceMapService.CreateDrawingAsync(GetUserId(), eventId, request);
        return StatusCode(StatusCodes.Status201Created, new { drawing });
    }

    [HttpPut("drawings/{drawingId:guid}")]
    public async Task<IActionResult> UpdateDrawing(Guid eventId, Guid drawingId, [FromBody] UpdateDrawingRequest request)
    {
        var validation = await _updateDrawingValidator.ValidateAsync(request);
        if (!validation.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validation.Errors);
        }

        var drawing = await _evidenceMapService.UpdateDrawingAsync(GetUserId(), eventId, drawingId, request);
        return Ok(new { drawing });
    }

    [HttpDelete("drawings/{drawingId:guid}")]
    public async Task<IActionResult> DeleteDrawing(Guid eventId, Guid drawingId)
    {
        await _evidenceMapService.DeleteDrawingAsync(GetUserId(), eventId, drawingId);
        return Ok(new { deleted = true });
    }
}

