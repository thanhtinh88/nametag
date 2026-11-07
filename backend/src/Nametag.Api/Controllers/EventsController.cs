using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Event;
using Nametag.Application.Services;

namespace Nametag.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class EventsController : ControllerBase
{
    private readonly IEventService _eventService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IValidator<CreateEventRequest> _createValidator;
    private readonly IValidator<UpdateEventRequest> _updateValidator;
    private readonly IValidator<AddEventPersonRequest> _addPersonValidator;
    private readonly IValidator<UpdateEventPersonRequest> _updatePersonValidator;
    private readonly IValidator<BulkEventActionRequest> _bulkValidator;

    public EventsController(
        IEventService eventService,
        ICurrentUserService currentUserService,
        IValidator<CreateEventRequest> createValidator,
        IValidator<UpdateEventRequest> updateValidator,
        IValidator<AddEventPersonRequest> addPersonValidator,
        IValidator<UpdateEventPersonRequest> updatePersonValidator,
        IValidator<BulkEventActionRequest> bulkValidator)
    {
        _eventService = eventService;
        _currentUserService = currentUserService;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _addPersonValidator = addPersonValidator;
        _updatePersonValidator = updatePersonValidator;
        _bulkValidator = bulkValidator;
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
    public async Task<IActionResult> GetEvents([FromQuery] EventListQuery query)
    {
        var events = await _eventService.GetEventsAsync(GetUserId(), query);
        return Ok(new { events });
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetEventById(Guid id)
    {
        var ev = await _eventService.GetEventByIdAsync(GetUserId(), id);
        return Ok(new { @event = ev });
    }

    [HttpPost]
    public async Task<IActionResult> CreateEvent([FromBody] CreateEventRequest request)
    {
        var validationResult = await _createValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validationResult.Errors);
        }

        var ev = await _eventService.CreateEventAsync(GetUserId(), request);
        return StatusCode(StatusCodes.Status201Created, new { @event = ev });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateEvent(Guid id, [FromBody] UpdateEventRequest request)
    {
        var validationResult = await _updateValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validationResult.Errors);
        }

        var ev = await _eventService.UpdateEventAsync(GetUserId(), id, request);
        return Ok(new { @event = ev });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteEvent(Guid id)
    {
        await _eventService.SoftDeleteEventAsync(GetUserId(), id);
        return Ok(new { message = "Event deleted successfully" });
    }

    [HttpPost("{id:guid}/restore")]
    public async Task<IActionResult> RestoreEvent(Guid id)
    {
        var ev = await _eventService.RestoreEventAsync(GetUserId(), id);
        return Ok(new { @event = ev });
    }

    [HttpDelete("{id:guid}/permanent")]
    public async Task<IActionResult> PermanentDeleteEvent(Guid id)
    {
        await _eventService.PermanentDeleteEventAsync(GetUserId(), id);
        return Ok(new { success = true });
    }

    [HttpPost("{id:guid}/people")]
    public async Task<IActionResult> AddPerson(Guid id, [FromBody] AddEventPersonRequest request)
    {
        var validationResult = await _addPersonValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validationResult.Errors);
        }

        var personEvent = await _eventService.AddPersonAsync(GetUserId(), id, request);
        return StatusCode(StatusCodes.Status201Created, new { personEvent });
    }

    [HttpPut("{id:guid}/people")]
    public async Task<IActionResult> UpdatePerson(Guid id, [FromBody] UpdateEventPersonRequest request)
    {
        var validationResult = await _updatePersonValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validationResult.Errors);
        }

        var personEvent = await _eventService.UpdatePersonAsync(GetUserId(), id, request);
        return Ok(new { personEvent });
    }

    [HttpDelete("{id:guid}/people")]
    public async Task<IActionResult> RemovePerson(Guid id, [FromQuery] Guid? linkId, [FromQuery] Guid? personId)
    {
        await _eventService.RemovePersonAsync(GetUserId(), id, linkId, personId);
        return Ok(new { message = "Removed person from event" });
    }

    [HttpPost("bulk")]
    public async Task<IActionResult> BulkAction([FromBody] BulkEventActionRequest request)
    {
        var validationResult = await _bulkValidator.ValidateAsync(request);
        if (!validationResult.IsValid)
        {
            throw new Nametag.Application.Common.Exceptions.ValidationException(validationResult.Errors);
        }

        var result = await _eventService.BulkActionAsync(GetUserId(), request);
        return Ok(result);
    }
}
