using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Interfaces;
using Nametag.Application.DTOs.Immich;
using Nametag.Application.Services;
using Xunit;

namespace Nametag.UnitTests;

public class ImmichControllerTests
{
    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; } = Guid.NewGuid();
        public string? UserEmail { get; set; } = "user@example.com";
        public bool IsAuthenticated => UserId.HasValue;
    }

    private class FakeImmichService : IImmichService
    {
        public ImmichConnectionDto? Connection { get; set; } = new ImmichConnectionDto
        {
            ServerUrl = "https://immich.example.com",
            Enabled = true,
            HasApiKey = true
        };

        public Task<ImmichConnectionDto?> GetConnectionAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(Connection);

        public Task<ImmichConnectionDto> SaveConnectionAsync(Guid userId, SaveImmichConnectionRequest request, CancellationToken ct = default)
        {
            Connection = new ImmichConnectionDto
            {
                ServerUrl = request.ServerUrl,
                PublicUrl = request.PublicUrl,
                Enabled = request.Enabled ?? true,
                HasApiKey = true
            };
            return Task.FromResult(Connection);
        }

        public Task DeleteConnectionAsync(Guid userId, CancellationToken ct = default)
        {
            Connection = null;
            return Task.CompletedTask;
        }

        public Task<TestImmichConnectionResponse> TestConnectionAsync(Guid userId, TestImmichConnectionRequest request, CancellationToken ct = default) =>
            Task.FromResult(new TestImmichConnectionResponse { Ok = true, UserName = "Admin", Version = "1.100.0" });

        public Task<(List<ImmichAssetDto> Assets, string PublicUrl)> GetAssetsAsync(Guid userId, string? personId, string? albumId, CancellationToken ct = default) =>
            Task.FromResult((new List<ImmichAssetDto>
            {
                new() { Id = "asset-1", OriginalFileName = "photo.jpg" }
            }, "https://immich.example.com"));

        public Task<List<ImmichAlbumSummaryDto>> GetAlbumsAsync(Guid userId, CancellationToken ct = default) =>
            Task.FromResult(new List<ImmichAlbumSummaryDto>
            {
                new() { Id = "album-1", AlbumName = "Case 101 Evidence", AssetCount = 12 }
            });

        public Task<List<ImmichPersonSummaryDto>> GetPeopleAsync(Guid userId, string? query, CancellationToken ct = default) =>
            Task.FromResult(new List<ImmichPersonSummaryDto>
            {
                new() { Id = "person-1", Name = "Suspect A" }
            });

        public Task<ImmichBinaryStreamResult> StreamAssetBinaryAsync(Guid userId, string assetId, string variant, string? rangeHeader, CancellationToken ct = default) =>
            Task.FromResult(new ImmichBinaryStreamResult { Stream = new MemoryStream(), ContentType = "image/jpeg" });

        public Task<ImmichBinaryStreamResult> StreamPersonThumbnailAsync(Guid userId, string immichPersonId, CancellationToken ct = default) =>
            Task.FromResult(new ImmichBinaryStreamResult { Stream = new MemoryStream(), ContentType = "image/jpeg" });

        public Task<object> LinkPersonImmichAsync(Guid userId, Guid personId, PersonImmichLinkRequest request, CancellationToken ct = default) =>
            Task.FromResult<object>(new { id = personId, immichPersonId = request.ImmichPersonId, immichAlbumId = request.ImmichAlbumId });

        public Task<(string Filename, string PhotoUrl)> SetPersonPhotoFromImmichAsync(Guid userId, Guid personId, string assetId, CancellationToken ct = default) =>
            Task.FromResult(($"photo_{personId}.jpg", $"/api/photos/photo_{personId}.jpg"));

        public Task<object> LinkEventImmichAsync(Guid userId, Guid eventId, EventImmichLinkRequest request, CancellationToken ct = default) =>
            Task.FromResult<object>(new { id = eventId, immichAlbumId = request.ImmichAlbumId });
    }

    [Fact]
    public async Task GetConnection_ReturnsConnection()
    {
        var fakeUser = new FakeCurrentUserService();
        var fakeService = new FakeImmichService();
        var controller = new ImmichController(fakeService, fakeUser);

        var result = await controller.GetConnection(CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task SaveConnection_ReturnsUpdatedConnection()
    {
        var fakeUser = new FakeCurrentUserService();
        var fakeService = new FakeImmichService();
        var controller = new ImmichController(fakeService, fakeUser);

        var req = new SaveImmichConnectionRequest { ServerUrl = "https://new-immich.test", ApiKey = "secret" };
        var result = await controller.SaveConnection(req, CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task DeleteConnection_ReturnsSuccess()
    {
        var fakeUser = new FakeCurrentUserService();
        var fakeService = new FakeImmichService();
        var controller = new ImmichController(fakeService, fakeUser);

        var result = await controller.DeleteConnection(CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task TestConnection_ReturnsOkResult()
    {
        var fakeUser = new FakeCurrentUserService();
        var fakeService = new FakeImmichService();
        var controller = new ImmichController(fakeService, fakeUser);

        var result = await controller.TestConnection(new TestImmichConnectionRequest(), CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(result);
        var resp = Assert.IsType<TestImmichConnectionResponse>(ok.Value);
        Assert.True(resp.Ok);
    }

    [Fact]
    public async Task GetAlbums_ReturnsAlbumList()
    {
        var fakeUser = new FakeCurrentUserService();
        var fakeService = new FakeImmichService();
        var controller = new ImmichController(fakeService, fakeUser);

        var result = await controller.GetAlbums(CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    [Fact]
    public async Task GetPeople_ReturnsPeopleList()
    {
        var fakeUser = new FakeCurrentUserService();
        var fakeService = new FakeImmichService();
        var controller = new ImmichController(fakeService, fakeUser);

        var result = await controller.GetPeople(null, CancellationToken.None);
        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }
}
