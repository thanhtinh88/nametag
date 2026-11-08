using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using Nametag.Domain.Entities;
using Nametag.Infrastructure.Persistence;
using Nametag.Infrastructure.Services;
using Xunit;

namespace Nametag.UnitTests;

public class PhotoStorageServiceTests : IDisposable
{
    private readonly string _tempDir;
    private readonly PhotoStorageService _service;

    private static readonly byte[] Valid1x1Jpeg = [
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
        0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
        0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
        0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20,
        0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27,
        0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
        0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
        0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
        0x05, 0x06, 0x07, 0x08, 0x09, 0x0A, 0x0B, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F,
        0x00, 0xBF, 0x80, 0xFF, 0xD9
    ];

    private static readonly byte[] Valid1x1Png = [
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x60, 0x60, 0x60, 0x00,
        0x00, 0x00, 0x05, 0x00, 0x01, 0xa7, 0x35, 0x17, 0x22, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E,
        0x44, 0xAE, 0x42, 0x60, 0x82
    ];

    public PhotoStorageServiceTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), $"nametag-photos-test-{Guid.NewGuid():N}");
        Directory.CreateDirectory(_tempDir);

        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["PhotoStorage:Path"] = _tempDir,
                ["PhotoStorage:Size"] = "256",
                ["PhotoStorage:Quality"] = "80"
            })
            .Build();

        _service = new PhotoStorageService(null!, config, NullLogger<PhotoStorageService>.Instance);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
        {
            try { Directory.Delete(_tempDir, true); } catch { }
        }
    }

    [Fact]
    public void ValidateStoragePath_RejectsTraversal()
    {
        Assert.Throws<InvalidOperationException>(() => PhotoStorageService.ValidateStoragePath("/tmp/../etc"));
    }

    [Fact]
    public void ValidateFilePath_RejectsNullBytesAndEscape()
    {
        Assert.Throws<BadRequestException>(() => PhotoStorageService.ValidateFilePath("/tmp/foo\0bar", "/tmp"));
        Assert.Throws<BadRequestException>(() => PhotoStorageService.ValidateFilePath("/etc/passwd", "/tmp/photos"));
    }

    [Fact]
    public void IsPhotoFilename_IdentifiesFilenamesCorrectly()
    {
        Assert.True(PhotoStorageService.IsPhotoFilename("avatar.jpg"));
        Assert.True(PhotoStorageService.IsPhotoFilename("_avatar.png"));
        Assert.False(PhotoStorageService.IsPhotoFilename(null));
        Assert.False(PhotoStorageService.IsPhotoFilename(""));
        Assert.False(PhotoStorageService.IsPhotoFilename("data:image/jpeg;base64,..."));
        Assert.False(PhotoStorageService.IsPhotoFilename("https://example.com/avatar.jpg"));
    }

    [Fact]
    public void DetectFormat_SniffsImageTypes()
    {
        Assert.Equal("jpg", PhotoStorageService.DetectFormat(Valid1x1Jpeg));
        Assert.Equal("png", PhotoStorageService.DetectFormat(Valid1x1Png));
        Assert.Null(PhotoStorageService.DetectFormat(new byte[] { 0x01, 0x02, 0x03, 0x04 }));
    }

    [Fact]
    public async Task SaveUserPhotoAsync_SavesFileAndReturnsFilename()
    {
        var userId = Guid.NewGuid();
        using var stream = new MemoryStream(Valid1x1Jpeg);

        var filename = await _service.SaveUserPhotoAsync(userId, stream);

        Assert.NotNull(filename);
        Assert.StartsWith("_avatar.", filename);
        Assert.True(File.Exists(Path.Combine(_tempDir, userId.ToString(), filename)));
    }

    [Fact]
    public async Task DeleteUserPhotoAsync_CleansUpMatchingFiles()
    {
        var userId = Guid.NewGuid();
        using var stream = new MemoryStream(Valid1x1Jpeg);
        var filename = await _service.SaveUserPhotoAsync(userId, stream);
        Assert.True(File.Exists(Path.Combine(_tempDir, userId.ToString(), filename)));

        await _service.DeleteUserPhotoAsync(userId);

        Assert.False(File.Exists(Path.Combine(_tempDir, userId.ToString(), filename)));
    }

    [Fact]
    public async Task SavePersonPhotoAsync_SavesFileWithPersonId()
    {
        var userId = Guid.NewGuid();
        var personId = Guid.NewGuid();
        using var stream = new MemoryStream(Valid1x1Png);

        var filename = await _service.SavePersonPhotoAsync(userId, personId, stream);

        Assert.NotNull(filename);
        Assert.StartsWith(personId.ToString(), filename);
        Assert.True(File.Exists(Path.Combine(_tempDir, userId.ToString(), filename)));
    }

    [Fact]
    public async Task SaveMarkPhotoAsync_GeneratesIndependentMarkFilename()
    {
        var userId = Guid.NewGuid();
        var personId = Guid.NewGuid();
        using var stream = new MemoryStream(Valid1x1Jpeg);

        var filename = await _service.SaveMarkPhotoAsync(userId, personId, stream);

        Assert.NotNull(filename);
        Assert.StartsWith($"mark_{personId}_", filename);
        Assert.True(File.Exists(Path.Combine(_tempDir, userId.ToString(), filename)));
    }

    [Fact]
    public async Task ReadMarkPhotoAsync_ReturnsDataWhenFileExists()
    {
        var userId = Guid.NewGuid();
        var personId = Guid.NewGuid();
        using var stream = new MemoryStream(Valid1x1Jpeg);
        var filename = await _service.SaveMarkPhotoAsync(userId, personId, stream);

        var result = await _service.ReadMarkPhotoAsync(userId, filename);
        Assert.NotNull(result);
        Assert.Equal("image/jpeg", result.Value.MimeType);
        Assert.NotEmpty(result.Value.Bytes);
    }

    [Fact]
    public async Task ReadMarkPhotoAsync_ReturnsNullWhenFileMissing()
    {
        var userId = Guid.NewGuid();
        var result = await _service.ReadMarkPhotoAsync(userId, "nonexistent.jpg");
        Assert.Null(result);
    }

    [Fact]
    public async Task ProcessPhoto_RejectsInvalidFormat()
    {
        var userId = Guid.NewGuid();
        using var invalidStream = new MemoryStream(new byte[] { 0x00, 0x01, 0x02, 0x03, 0x04 });

        await Assert.ThrowsAsync<BadRequestException>(() =>
            _service.SaveUserPhotoAsync(userId, invalidStream));
    }
}
