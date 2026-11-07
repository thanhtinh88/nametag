using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.EvidenceMap;
using Nametag.Application.Services;
using Nametag.Application.Validators.EvidenceMap;
using Xunit;

namespace Nametag.UnitTests;

public class FakeEvidenceMapService : IEvidenceMapService
{
    public Task<EvidenceMapOverviewDto> GetEvidenceMapAsync(Guid userId, Guid eventId, CancellationToken ct = default)
    {
        return Task.FromResult(new EvidenceMapOverviewDto
        {
            Markers = new List<EvidenceMapMarkerDto>
            {
                new() { Id = Guid.NewGuid(), EventId = eventId, Label = "Camera 1", MarkerType = "CAMERA" }
            },
            Routes = new List<EvidenceMapRouteDto>
            {
                new() { Id = Guid.NewGuid(), EventId = eventId, Label = "Route 1", RouteType = "CONFIRMED_PATH" }
            },
            Drawings = new List<EvidenceMapDrawingDto>
            {
                new() { Id = Guid.NewGuid(), EventId = eventId, Label = "Perimeter", DrawingType = "POLYGON" }
            },
            DefaultCenter = new DefaultCenterDto { Latitude = 21.0285, Longitude = 105.8542 }
        });
    }

    public Task<EvidenceMapMarkerDto> CreateMarkerAsync(Guid userId, Guid eventId, CreateMarkerRequest request, CancellationToken ct = default)
    {
        return Task.FromResult(new EvidenceMapMarkerDto
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            Label = request.Label,
            MarkerType = request.MarkerType,
            Latitude = request.Latitude,
            Longitude = request.Longitude
        });
    }

    public Task<EvidenceMapMarkerDto> UpdateMarkerAsync(Guid userId, Guid eventId, Guid markerId, UpdateMarkerRequest request, CancellationToken ct = default)
    {
        return Task.FromResult(new EvidenceMapMarkerDto
        {
            Id = markerId,
            EventId = eventId,
            Label = request.Label ?? "Updated",
            MarkerType = request.MarkerType ?? "CAMERA"
        });
    }

    public Task DeleteMarkerAsync(Guid userId, Guid eventId, Guid markerId, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }

    public Task<EvidenceMapRouteDto> CreateRouteAsync(Guid userId, Guid eventId, CreateRouteRequest request, CancellationToken ct = default)
    {
        return Task.FromResult(new EvidenceMapRouteDto
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            Label = request.Label,
            RouteType = request.RouteType,
            Waypoints = request.Waypoints
        });
    }

    public Task<EvidenceMapRouteDto> UpdateRouteAsync(Guid userId, Guid eventId, Guid routeId, UpdateRouteRequest request, CancellationToken ct = default)
    {
        return Task.FromResult(new EvidenceMapRouteDto
        {
            Id = routeId,
            EventId = eventId,
            Label = request.Label ?? "Updated Route",
            RouteType = request.RouteType ?? "CONFIRMED_PATH"
        });
    }

    public Task DeleteRouteAsync(Guid userId, Guid eventId, Guid routeId, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }

    public Task<EvidenceMapDrawingDto> CreateDrawingAsync(Guid userId, Guid eventId, CreateDrawingRequest request, CancellationToken ct = default)
    {
        return Task.FromResult(new EvidenceMapDrawingDto
        {
            Id = Guid.NewGuid(),
            EventId = eventId,
            Label = request.Label,
            DrawingType = request.DrawingType,
            Coordinates = request.Coordinates
        });
    }

    public Task<EvidenceMapDrawingDto> UpdateDrawingAsync(Guid userId, Guid eventId, Guid drawingId, UpdateDrawingRequest request, CancellationToken ct = default)
    {
        return Task.FromResult(new EvidenceMapDrawingDto
        {
            Id = drawingId,
            EventId = eventId,
            Label = request.Label ?? "Updated Drawing",
            DrawingType = request.DrawingType ?? "POLYGON"
        });
    }

    public Task DeleteDrawingAsync(Guid userId, Guid eventId, Guid drawingId, CancellationToken ct = default)
    {
        return Task.CompletedTask;
    }
}

public class EvidenceMapControllerTests
{
    private readonly FakeEvidenceMapService _service;
    private readonly FakeCurrentUserService _currentUserService;
    private readonly EvidenceMapController _controller;
    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _eventId = Guid.NewGuid();

    public EvidenceMapControllerTests()
    {
        _service = new FakeEvidenceMapService();
        _currentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new EvidenceMapController(
            _service,
            _currentUserService,
            new CreateMarkerRequestValidator(),
            new UpdateMarkerRequestValidator(),
            new CreateRouteRequestValidator(),
            new UpdateRouteRequestValidator(),
            new CreateDrawingRequestValidator(),
            new UpdateDrawingRequestValidator()
        );
    }

    [Fact]
    public async Task GetEvidenceMap_ReturnsOk()
    {
        var result = await _controller.GetEvidenceMap(_eventId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var overview = Assert.IsType<EvidenceMapOverviewDto>(okResult.Value);
        Assert.Single(overview.Markers);
        Assert.Single(overview.Routes);
        Assert.Single(overview.Drawings);
        Assert.NotNull(overview.DefaultCenter);
    }

    [Fact]
    public async Task CreateMarker_ReturnsCreated()
    {
        var request = new CreateMarkerRequest
        {
            Label = "Test Cam",
            MarkerType = "CAMERA",
            Latitude = 21.0m,
            Longitude = 105.8m
        };

        var result = await _controller.CreateMarker(_eventId, request);
        var createdResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(201, createdResult.StatusCode);
    }

    [Fact]
    public async Task UpdateMarker_ReturnsOk()
    {
        var markerId = Guid.NewGuid();
        var request = new UpdateMarkerRequest { Label = "Cam New" };

        var result = await _controller.UpdateMarker(_eventId, markerId, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DeleteMarker_ReturnsOk()
    {
        var markerId = Guid.NewGuid();
        var result = await _controller.DeleteMarker(_eventId, markerId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task CreateRoute_ReturnsCreated()
    {
        var request = new CreateRouteRequest
        {
            Label = "Escape Route",
            RouteType = "CONFIRMED_PATH",
            Waypoints = new List<RouteWaypointDto>
            {
                new() { Lat = 21.0, Lng = 105.8 },
                new() { Lat = 21.1, Lng = 105.9 }
            }
        };

        var result = await _controller.CreateRoute(_eventId, request);
        var createdResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(201, createdResult.StatusCode);
    }

    [Fact]
    public async Task UpdateRoute_ReturnsOk()
    {
        var routeId = Guid.NewGuid();
        var request = new UpdateRouteRequest { Label = "Route Modified" };

        var result = await _controller.UpdateRoute(_eventId, routeId, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DeleteRoute_ReturnsOk()
    {
        var routeId = Guid.NewGuid();
        var result = await _controller.DeleteRoute(_eventId, routeId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task CreateDrawing_ReturnsCreated()
    {
        var request = new CreateDrawingRequest
        {
            Label = "Zone A",
            DrawingType = "POLYGON",
            Coordinates = new List<DrawingCoordDto>
            {
                new() { Lat = 21.0, Lng = 105.8 }
            }
        };

        var result = await _controller.CreateDrawing(_eventId, request);
        var createdResult = Assert.IsType<ObjectResult>(result);
        Assert.Equal(201, createdResult.StatusCode);
    }

    [Fact]
    public async Task UpdateDrawing_ReturnsOk()
    {
        var drawingId = Guid.NewGuid();
        var request = new UpdateDrawingRequest { Label = "Zone B" };

        var result = await _controller.UpdateDrawing(_eventId, drawingId, request);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task DeleteDrawing_ReturnsOk()
    {
        var drawingId = Guid.NewGuid();
        var result = await _controller.DeleteDrawing(_eventId, drawingId);
        var okResult = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(okResult.Value);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }
}
