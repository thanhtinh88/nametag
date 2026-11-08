using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Nametag.Api.Controllers;
using Nametag.Application.DTOs.Cron;
using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class CronControllerTests
{
    private class FakePurgeDeletedService : IPurgeDeletedService
    {
        public PurgeDeletedResultDto Result { get; set; } = new()
        {
            Success = true,
            RetentionDays = 30,
            CutoffDate = DateTime.UtcNow.AddDays(-30).ToString("o"),
            Purged = new PurgedCountsDto
            {
                People = 2,
                Groups = 1,
                Relationships = 3,
                RelationshipTypes = 0,
                ImportantDates = 4,
                PersonGroups = 2
            }
        };

        public Task<PurgeDeletedResultDto> PurgeDeletedAsync(int retentionDays = 30, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Result);
        }
    }

    private class FakeGeocodeQueueService : IGeocodeQueueService
    {
        public GeocodeCronResultDto Result { get; set; } = new()
        {
            Success = true,
            Processed = 10,
            Geocoded = 8,
            Failed = 1,
            Pending = 1,
            Skipped = 0,
            RateLimited = false
        };

        public Task<GeocodeCronResultDto> ProcessGeocodeQueueAsync(CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Result);
        }
    }

    private const string ExpectedSecret = "test-cron-secret-12345";

    private (CronController Controller, FakePurgeDeletedService PurgeService, FakeGeocodeQueueService GeocodeService) CreateController(string? secret = ExpectedSecret)
    {
        var inMemorySettings = new Dictionary<string, string?>();
        if (secret != null)
        {
            inMemorySettings["CRON_SECRET"] = secret;
        }

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        var purgeService = new FakePurgeDeletedService();
        var geocodeService = new FakeGeocodeQueueService();

        var controller = new CronController(
            purgeService,
            geocodeService,
            config,
            NullLogger<CronController>.Instance
        );

        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        return (controller, purgeService, geocodeService);
    }

    [Fact]
    public async Task PurgeDeleted_MissingAuthHeader_ReturnsUnauthorized()
    {
        var (controller, _, _) = CreateController();

        var actionResult = await controller.PurgeDeleted(CancellationToken.None);

        var unauthorized = Assert.IsType<UnauthorizedObjectResult>(actionResult);
        Assert.NotNull(unauthorized.Value);
    }

    [Fact]
    public async Task PurgeDeleted_InvalidBearerSecret_ReturnsUnauthorized()
    {
        var (controller, _, _) = CreateController();
        controller.HttpContext.Request.Headers.Authorization = "Bearer wrong-secret";

        var actionResult = await controller.PurgeDeleted(CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(actionResult);
    }

    [Fact]
    public async Task PurgeDeleted_ValidBearerSecret_ReturnsOk()
    {
        var (controller, _, _) = CreateController();
        controller.HttpContext.Request.Headers.Authorization = $"Bearer {ExpectedSecret}";

        var actionResult = await controller.PurgeDeleted(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var resultDto = Assert.IsType<PurgeDeletedResultDto>(okResult.Value);
        Assert.True(resultDto.Success);
        Assert.Equal(2, resultDto.Purged.People);
        Assert.Equal(30, resultDto.RetentionDays);
    }

    [Fact]
    public async Task Geocode_MissingAuthHeader_ReturnsUnauthorized()
    {
        var (controller, _, _) = CreateController();

        var actionResult = await controller.Geocode(CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(actionResult);
    }

    [Fact]
    public async Task Geocode_InvalidBearerSecret_ReturnsUnauthorized()
    {
        var (controller, _, _) = CreateController();
        controller.HttpContext.Request.Headers.Authorization = "Bearer invalid-token";

        var actionResult = await controller.Geocode(CancellationToken.None);

        Assert.IsType<UnauthorizedObjectResult>(actionResult);
    }

    [Fact]
    public async Task Geocode_ValidBearerSecret_ReturnsOk()
    {
        var (controller, _, geocodeService) = CreateController();
        controller.HttpContext.Request.Headers.Authorization = $"Bearer {ExpectedSecret}";

        var actionResult = await controller.Geocode(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var resultDto = Assert.IsType<GeocodeCronResultDto>(okResult.Value);
        Assert.True(resultDto.Success);
        Assert.Equal(10, resultDto.Processed);
        Assert.Equal(8, resultDto.Geocoded);
    }

    [Fact]
    public async Task Geocode_WhenDisabled_ReturnsDisabledResponse()
    {
        var (controller, _, geocodeService) = CreateController();
        controller.HttpContext.Request.Headers.Authorization = $"Bearer {ExpectedSecret}";
        geocodeService.Result = new GeocodeCronResultDto
        {
            Success = true,
            Disabled = true,
            Reason = "Geocoding disabled"
        };

        var actionResult = await controller.Geocode(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var resultDto = Assert.IsType<GeocodeCronResultDto>(okResult.Value);
        Assert.True(resultDto.Success);
        Assert.True(resultDto.Disabled);
        Assert.Equal("Geocoding disabled", resultDto.Reason);
    }

    [Fact]
    public async Task Geocode_WhenAlreadyRunning_ReturnsAlreadyRunningResponse()
    {
        var (controller, _, geocodeService) = CreateController();
        controller.HttpContext.Request.Headers.Authorization = $"Bearer {ExpectedSecret}";
        geocodeService.Result = new GeocodeCronResultDto
        {
            Success = true,
            AlreadyRunning = true,
            Reason = "A geocode run is already in progress"
        };

        var actionResult = await controller.Geocode(CancellationToken.None);

        var okResult = Assert.IsType<OkObjectResult>(actionResult);
        var resultDto = Assert.IsType<GeocodeCronResultDto>(okResult.Value);
        Assert.True(resultDto.Success);
        Assert.True(resultDto.AlreadyRunning);
    }
}
