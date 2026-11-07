using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Dashboard;
using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class FakeDashboardService : IDashboardService
{
    public Task<DashboardStatsDto> GetStatsAsync(Guid userId, CancellationToken ct = default)
    {
        return Task.FromResult(new DashboardStatsDto
        {
            PeopleCount = 42,
            GroupsCount = 5,
            UpcomingEvents = new List<UpcomingEventDto>
            {
                new()
                {
                    Id = "important-1",
                    PersonName = "John Doe",
                    Type = "important_date",
                    Title = "Birthday",
                    DaysUntil = 3,
                    Date = DateTime.UtcNow.AddDays(3)
                }
            }
        });
    }

    public Task<DashboardGraphDto> GetGraphAsync(Guid userId, DashboardGraphQuery query, CancellationToken ct = default)
    {
        return Task.FromResult(new DashboardGraphDto
        {
            Nodes = new List<GraphNodeDto>
            {
                new() { Id = "person-1", Label = "John Doe", NodeType = "person", ThreatLevel = "HIGH" },
                new() { Id = "event-1", Label = "📅 Case 101", NodeType = "event" }
            },
            Edges = new List<GraphEdgeDto>
            {
                new() { Source = "person-1", Target = "event-1", Type = "Suspect", Color = "#EF4444" }
            }
        });
    }
}

public class DashboardControllerTests
{
    private readonly FakeDashboardService _service;
    private readonly FakeCurrentUserService _currentUserService;
    private readonly DashboardController _controller;
    private readonly Guid _userId = Guid.NewGuid();

    public DashboardControllerTests()
    {
        _service = new FakeDashboardService();
        _currentUserService = new FakeCurrentUserService { UserId = _userId };
        _controller = new DashboardController(_service, _currentUserService);
    }

    [Fact]
    public async Task GetStats_ReturnsOk()
    {
        var result = await _controller.GetStats();
        var okResult = Assert.IsType<OkObjectResult>(result);
        var stats = Assert.IsType<DashboardStatsDto>(okResult.Value);
        Assert.Equal(42, stats.PeopleCount);
        Assert.Equal(5, stats.GroupsCount);
        Assert.Single(stats.UpcomingEvents);
    }

    [Fact]
    public async Task GetGraph_ReturnsOk()
    {
        var query = new DashboardGraphQuery { CaseId = "some-case" };
        var result = await _controller.GetGraph(query);
        var okResult = Assert.IsType<OkObjectResult>(result);
        var graph = Assert.IsType<DashboardGraphDto>(okResult.Value);
        Assert.Equal(2, graph.Nodes.Count);
        Assert.Single(graph.Edges);
    }

    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; }
        public string? UserEmail { get; set; }
        public bool IsAuthenticated => UserId.HasValue;
    }
}
