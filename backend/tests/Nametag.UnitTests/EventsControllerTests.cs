using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Event;
using Nametag.Application.Services;
using Nametag.Application.Validators.Event;
using Nametag.Domain.Enums;
using Xunit;

namespace Nametag.UnitTests;

public class EventsControllerTests
{
    private readonly FakeEventService _fakeEventService;
    private readonly FakeCurrentUserService _fakeCurrentUserService;
    private readonly EventsController _controller;
    private readonly Guid _userId = Guid.NewGuid();

    public EventsControllerTests()
    {
        _fakeEventService = new FakeEventService();
        _fakeCurrentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new EventsController(
            _fakeEventService,
            _fakeCurrentUserService,
            new CreateEventRequestValidator(),
            new UpdateEventRequestValidator(),
            new AddEventPersonRequestValidator(),
            new UpdateEventPersonRequestValidator(),
            new BulkEventActionRequestValidator());
    }

    [Fact]
    public async Task GetEvents_ReturnsOk()
    {
        var result = await _controller.GetEvents(new EventListQuery());
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task GetEventById_ReturnsOk()
    {
        var eventId = Guid.NewGuid();
        var result = await _controller.GetEventById(eventId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task CreateEvent_ReturnsCreated()
    {
        var request = new CreateEventRequest
        {
            Title = "Case Kickoff",
            Category = "Briefing",
            Status = EventStatus.PLANNED
        };
        var result = await _controller.CreateEvent(request);
        var objResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objResult.StatusCode);
    }

    [Fact]
    public async Task UpdateEvent_ReturnsOk()
    {
        var eventId = Guid.NewGuid();
        var request = new UpdateEventRequest
        {
            Title = "Updated Kickoff Title"
        };
        var result = await _controller.UpdateEvent(eventId, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DeleteEvent_ReturnsOk()
    {
        var eventId = Guid.NewGuid();
        var result = await _controller.DeleteEvent(eventId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task RestoreEvent_ReturnsOk()
    {
        var eventId = Guid.NewGuid();
        var result = await _controller.RestoreEvent(eventId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task PermanentDeleteEvent_ReturnsOk()
    {
        var eventId = Guid.NewGuid();
        var result = await _controller.PermanentDeleteEvent(eventId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task AddPerson_ReturnsCreated()
    {
        var eventId = Guid.NewGuid();
        var request = new AddEventPersonRequest
        {
            PersonId = Guid.NewGuid(),
            Role = "Lead Investigator",
            InvolvementType = "WITNESS",
            VerificationStatus = "CONFIRMED"
        };
        var result = await _controller.AddPerson(eventId, request);
        var objResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status201Created, objResult.StatusCode);
    }

    [Fact]
    public async Task UpdatePerson_ReturnsOk()
    {
        var eventId = Guid.NewGuid();
        var request = new UpdateEventPersonRequest
        {
            PersonId = Guid.NewGuid(),
            Role = "Updated Role"
        };
        var result = await _controller.UpdatePerson(eventId, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task RemovePerson_ReturnsOk()
    {
        var eventId = Guid.NewGuid();
        var personId = Guid.NewGuid();
        var result = await _controller.RemovePerson(eventId, null, personId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task BulkAction_ReturnsOk()
    {
        var request = new BulkEventActionRequest
        {
            Action = "delete",
            SelectAll = true
        };
        var result = await _controller.BulkAction(request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }

    private class FakeEventService : IEventService
    {
        public Task<List<EventDto>> GetEventsAsync(Guid userId, EventListQuery query, CancellationToken ct = default)
        {
            return Task.FromResult(new List<EventDto>
            {
                new() { Id = Guid.NewGuid(), Title = "Robbery Case", Status = EventStatus.ONGOING }
            });
        }

        public Task<EventDto> GetEventByIdAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new EventDto { Id = id, Title = "Robbery Case", Status = EventStatus.ONGOING });
        }

        public Task<EventDto> CreateEventAsync(Guid userId, CreateEventRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new EventDto { Id = Guid.NewGuid(), Title = request.Title, Status = request.Status ?? EventStatus.PLANNED });
        }

        public Task<EventDto> UpdateEventAsync(Guid userId, Guid id, UpdateEventRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new EventDto { Id = id, Title = request.Title ?? "Updated Event", Status = EventStatus.ONGOING });
        }

        public Task SoftDeleteEventAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<EventDto> RestoreEventAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.FromResult(new EventDto { Id = id, Title = "Restored Event" });
        }

        public Task PermanentDeleteEventAsync(Guid userId, Guid id, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<EventParticipantDto> AddPersonAsync(Guid userId, Guid eventId, AddEventPersonRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new EventParticipantDto
            {
                Id = Guid.NewGuid(),
                EventId = eventId,
                PersonId = request.PersonId,
                Role = request.Role
            });
        }

        public Task<EventParticipantDto> UpdatePersonAsync(Guid userId, Guid eventId, UpdateEventPersonRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new EventParticipantDto
            {
                Id = request.Id ?? Guid.NewGuid(),
                EventId = eventId,
                PersonId = request.PersonId ?? Guid.NewGuid(),
                Role = request.Role
            });
        }

        public Task RemovePersonAsync(Guid userId, Guid eventId, Guid? linkId, Guid? personId, CancellationToken ct = default)
        {
            return Task.CompletedTask;
        }

        public Task<BulkActionResultDto> BulkActionAsync(Guid userId, BulkEventActionRequest request, CancellationToken ct = default)
        {
            return Task.FromResult(new BulkActionResultDto { Success = true, AffectedCount = 1 });
        }
    }
}

