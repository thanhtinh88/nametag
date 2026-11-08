using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Nametag.Api.Controllers;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Xunit;

namespace Nametag.UnitTests;

public class PhotosControllerTests
{
    private class FakeCurrentUserService : ICurrentUserService
    {
        public Guid? UserId { get; set; } = Guid.NewGuid();
        public string? UserEmail { get; set; } = "user@example.com";
        public bool IsAuthenticated => UserId.HasValue;
    }

    private class FakePhotoStorageService : IPhotoStorageService
    {
        public byte[] ReturnBytes { get; set; } = new byte[] { 0xFF, 0xD8, 0xFF, 0xD9 };
        public string ReturnMime { get; set; } = "image/jpeg";
        public bool ReturnNull { get; set; }

        public Task<string> SaveUserPhotoAsync(Guid userId, Stream stream, CancellationToken cancellationToken = default) =>
            Task.FromResult("_avatar.jpg");

        public Task DeleteUserPhotoAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task<(byte[] Bytes, string MimeType)?> ReadUserPhotoAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.FromResult(ReturnNull ? null : ((byte[], string)?)(ReturnBytes, ReturnMime));

        public Task<string> SavePersonPhotoAsync(Guid userId, Guid personId, Stream stream, CancellationToken cancellationToken = default) =>
            Task.FromResult($"{personId}.jpg");

        public Task DeletePersonPhotoAsync(Guid userId, Guid personId, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task<(byte[] Bytes, string MimeType)?> ReadPersonPhotoAsync(Guid userId, Guid personId, CancellationToken cancellationToken = default) =>
            Task.FromResult(ReturnNull ? null : ((byte[], string)?)(ReturnBytes, ReturnMime));

        public Task<string> SaveMarkPhotoAsync(Guid userId, Guid personId, Stream stream, CancellationToken cancellationToken = default) =>
            Task.FromResult($"mark_{personId}_12345.jpg");

        public Task<(byte[] Bytes, string MimeType)?> ReadMarkPhotoAsync(Guid userId, string filename, CancellationToken cancellationToken = default) =>
            Task.FromResult(ReturnNull ? null : ((byte[], string)?)(ReturnBytes, ReturnMime));

        public Task<(byte[] Bytes, string MimeType)> ConvertHeicToJpegAsync(Stream stream, CancellationToken cancellationToken = default) =>
            Task.FromResult((ReturnBytes, ReturnMime));
    }

    [Fact]
    public async Task GetUserPhoto_ReturnsFileResult_WhenFound()
    {
        var fakeCurrentUserService = new FakeCurrentUserService();
        var fakeStorageService = new FakePhotoStorageService();
        var controller = new PhotosController(fakeStorageService, fakeCurrentUserService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var result = await controller.GetUserPhoto(CancellationToken.None);

        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("image/jpeg", fileResult.ContentType);
        Assert.Equal("private, no-store", controller.Response.Headers.CacheControl.ToString());
    }

    [Fact]
    public async Task GetUserPhoto_ReturnsNotFound_WhenNull()
    {
        var fakeCurrentUserService = new FakeCurrentUserService();
        var fakeStorageService = new FakePhotoStorageService { ReturnNull = true };
        var controller = new PhotosController(fakeStorageService, fakeCurrentUserService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var result = await controller.GetUserPhoto(CancellationToken.None);

        Assert.IsType<NotFoundResult>(result);
    }

    [Fact]
    public async Task GetPersonPhoto_ReturnsFileResult_WhenFound()
    {
        var fakeCurrentUserService = new FakeCurrentUserService();
        var fakeStorageService = new FakePhotoStorageService();
        var controller = new PhotosController(fakeStorageService, fakeCurrentUserService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var personId = Guid.NewGuid();
        var result = await controller.GetPersonPhoto(personId, CancellationToken.None);

        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("image/jpeg", fileResult.ContentType);
        Assert.Equal("private, no-store", controller.Response.Headers.CacheControl.ToString());
    }

    [Fact]
    public async Task GetMarkPhoto_ReturnsFileResult_WithMaxAgeHeader()
    {
        var fakeCurrentUserService = new FakeCurrentUserService();
        var fakeStorageService = new FakePhotoStorageService();
        var controller = new PhotosController(fakeStorageService, fakeCurrentUserService)
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext()
            }
        };

        var result = await controller.GetMarkPhoto("mark_123.jpg", CancellationToken.None);

        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("image/jpeg", fileResult.ContentType);
        Assert.Equal("private, max-age=3600", controller.Response.Headers.CacheControl.ToString());
    }
}
