using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Map;
using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class FakeMapService : IMapService
{
    public Task<MapMarkersResponseDto> GetMarkersAsync(Guid userId, CancellationToken ct = default)
    {
        return Task.FromResult(new MapMarkersResponseDto
        {
            Markers = new List<MapMarkerDto>
            {
                new() { Id = "addr_1", PersonName = "Subject A", Latitude = 21.0285, Longitude = 105.8542, Source = "address" }
            },
            Groups = new List<MapGroupDto>
            {
                new() { Id = Guid.NewGuid(), Name = "Group 1", Color = "#3B82F6" }
            },
            PendingCount = 2,
            FailedCount = 1,
            GeocodingEnabled = true
        });
    }

    public Task<object> RetryGeocodeAsync(Guid userId, GeocodeRetryRequest request, CancellationToken ct = default)
    {
        return Task.FromResult<object>(new { outcome = new { status = "pending" } });
    }
}

public class MapControllerTests
{
    private readonly FakeMapService _service;
    private readonly FakeCurrentUserService _currentUserService;
    private readonly MapController _controller;
    private readonly Guid _userId = Guid.NewGuid();

    public MapControllerTests()
    {
        _service = new FakeMapService();
        _currentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new MapController(_service, _currentUserService);
    }

    [Fact]
    public async Task GetMarkers_ReturnsOk()
    {
        var result = await _controller.GetMarkers();
        var okResult = Assert.IsType<OkObjectResult>(result);
        var resp = Assert.IsType<MapMarkersResponseDto>(okResult.Value);
        Assert.Single(resp.Markers);
        Assert.Equal(2, resp.PendingCount);
        Assert.True(resp.GeocodingEnabled);
    }

    [Fact]
    public async Task RetryGeocode_ReturnsOk()
    {
        var request = new GeocodeRetryRequest { AddressId = Guid.NewGuid() };
        var result = await _controller.RetryGeocode(request);
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
