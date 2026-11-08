using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Nametag.Application.Common.Exceptions;
using Nametag.Application.Common.Interfaces;
using NetVips;

namespace Nametag.Infrastructure.Services;

public class PhotoStorageService : IPhotoStorageService
{
    private const int MaxPhotoSize = 50 * 1024 * 1024; // 50MB
    private const long SharpMaxInputPixels = 100 * 1024 * 1024; // 100MP
    private const string UserPhotoId = "_avatar";

    private readonly IAppDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<PhotoStorageService> _logger;
    private string? _validatedBasePath;

    public PhotoStorageService(
        IAppDbContext dbContext,
        IConfiguration configuration,
        ILogger<PhotoStorageService> logger)
    {
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
    }

    public int GetPhotoSize()
    {
        var envVal = Environment.GetEnvironmentVariable("PHOTO_SIZE")
                     ?? _configuration["PhotoStorage:Size"];
        return int.TryParse(envVal, out var s) && s > 0 ? s : 256;
    }

    public int GetJpegQuality()
    {
        var envVal = Environment.GetEnvironmentVariable("PHOTO_QUALITY")
                     ?? _configuration["PhotoStorage:Quality"];
        return int.TryParse(envVal, out var q) && q > 0 ? q : 80;
    }

    public string GetPhotoStoragePath()
    {
        if (_validatedBasePath != null)
            return _validatedBasePath;

        var configured = Environment.GetEnvironmentVariable("PHOTO_STORAGE_PATH")
                         ?? _configuration["PhotoStorage:Path"]
                         ?? "./data/photos";

        _validatedBasePath = ValidateStoragePath(configured);
        return _validatedBasePath;
    }

    public static string ValidateStoragePath(string storagePath)
    {
        if (storagePath.Contains(".."))
            throw new InvalidOperationException("PHOTO_STORAGE_PATH contains invalid path traversal");

        return Path.GetFullPath(storagePath);
    }

    public static void ValidateFilePath(string filePath, string basePath)
    {
        if (filePath.Contains('\0'))
            throw new BadRequestException("File path contains null bytes");

        var resolved = Path.GetFullPath(filePath);
        var resolvedBase = Path.GetFullPath(basePath);

        if (!resolved.StartsWith(resolvedBase + Path.DirectorySeparatorChar, StringComparison.Ordinal)
            && resolved != resolvedBase)
        {
            throw new BadRequestException("File path attempts to escape storage directory");
        }
    }

    public static bool IsPhotoFilename(string? photo)
    {
        if (string.IsNullOrWhiteSpace(photo)) return false;
        return !photo.StartsWith("data:", StringComparison.OrdinalIgnoreCase)
               && !photo.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
               && !photo.StartsWith("https://", StringComparison.OrdinalIgnoreCase);
    }

    public static string? DetectFormat(ReadOnlySpan<byte> buffer)
    {
        if (buffer.Length < 4) return null;

        // JPEG: FF D8 FF
        if (buffer[0] == 0xFF && buffer[1] == 0xD8 && buffer[2] == 0xFF) return "jpg";

        // PNG: 89 50 4E 47
        if (buffer[0] == 0x89 && buffer[1] == 0x50 && buffer[2] == 0x4E && buffer[3] == 0x47) return "png";

        // GIF: 47 49 46
        if (buffer[0] == 0x47 && buffer[1] == 0x49 && buffer[2] == 0x46) return "gif";

        // WebP: 52 49 46 46 (RIFF) ... 57 45 42 50 (WEBP)
        if (buffer.Length >= 12
            && buffer[0] == 0x52 && buffer[1] == 0x49 && buffer[2] == 0x46 && buffer[3] == 0x46
            && buffer[8] == 0x57 && buffer[9] == 0x45 && buffer[10] == 0x42 && buffer[11] == 0x50)
        {
            return "webp";
        }

        // HEIC/HEIF: offset 4 'ftyp', offset 8 brand
        if (buffer.Length >= 12)
        {
            if (buffer[4] == (byte)'f' && buffer[5] == (byte)'t' && buffer[6] == (byte)'y' && buffer[7] == (byte)'p')
            {
                var brand = System.Text.Encoding.ASCII.GetString(buffer.Slice(8, 4));
                if (brand is "heic" or "heix" or "mif1" or "msf1" or "hevc")
                    return "heic";
            }
        }

        return null;
    }

    public static bool IsValidImageBuffer(ReadOnlySpan<byte> buffer)
    {
        var fmt = DetectFormat(buffer);
        return fmt is "jpg" or "png" or "gif" or "webp";
    }

    public static bool IsHeicBuffer(ReadOnlySpan<byte> buffer)
    {
        return DetectFormat(buffer) == "heic";
    }

    private async Task<string> EnsureUserPhotoDirAsync(Guid userId)
    {
        var basePath = GetPhotoStoragePath();
        var userDir = Path.Combine(basePath, userId.ToString());
        ValidateFilePath(userDir, basePath);
        if (!Directory.Exists(userDir))
        {
            Directory.CreateDirectory(userDir);
        }
        return await Task.FromResult(userDir);
    }

    private static async Task AtomicWriteAsync(string filePath, byte[] data, CancellationToken ct)
    {
        var dir = Path.GetDirectoryName(filePath)!;
        var tmp = Path.Combine(dir, $".nametag-tmp-{Guid.NewGuid():N}");
        await File.WriteAllBytesAsync(tmp, data, ct);
        try
        {
            File.Move(tmp, filePath, overwrite: true);
        }
        catch
        {
            if (File.Exists(tmp))
            {
                try { File.Delete(tmp); } catch { }
            }
            throw;
        }
    }

    private (byte[] Data, string Ext, string MimeType) ProcessPhoto(byte[] buffer)
    {
        if (buffer.Length > MaxPhotoSize)
            throw new BadRequestException($"Photo exceeds maximum size of {MaxPhotoSize / (1024 * 1024)}MB");

        if (!IsValidImageBuffer(buffer))
            throw new BadRequestException("Unsupported image format. Supported: JPEG, PNG, GIF, WebP");

        using var image = Image.NewFromBuffer(buffer);
        if ((long)image.Width * image.Height > SharpMaxInputPixels)
            throw new BadRequestException("Image dimensions too large");

        using var oriented = image.Autorot();
        int targetSize = GetPhotoSize();

        Image processed;
        bool disposeProcessed = false;

        if (oriented.Width > targetSize || oriented.Height > targetSize)
        {
            processed = oriented.ThumbnailImage(targetSize, height: targetSize, crop: Enums.Interesting.Centre, size: Enums.Size.Down);
            disposeProcessed = true;
        }
        else
        {
            processed = oriented;
        }

        try
        {
            bool hasAlpha = processed.HasAlpha();
            if (hasAlpha)
            {
                var png = processed.PngsaveBuffer(keep: (int)Enums.ForeignKeep.None);
                return (png, "png", "image/png");
            }
            else
            {
                int q = GetJpegQuality();
                var jpg = processed.JpegsaveBuffer(q: q, keep: (int)Enums.ForeignKeep.None);
                return (jpg, "jpg", "image/jpeg");
            }
        }
        finally
        {
            if (disposeProcessed)
            {
                processed.Dispose();
            }
        }
    }

    private void DeleteMatchingPhotos(Guid userId, string prefix)
    {
        try
        {
            var basePath = GetPhotoStoragePath();
            var dirPath = Path.Combine(basePath, userId.ToString());
            ValidateFilePath(dirPath, basePath);

            if (!Directory.Exists(dirPath)) return;

            foreach (var file in Directory.GetFiles(dirPath))
            {
                var nameWithoutExt = Path.GetFileNameWithoutExtension(file);
                if (nameWithoutExt.Equals(prefix, StringComparison.OrdinalIgnoreCase))
                {
                    try { File.Delete(file); } catch { }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete photos with prefix {Prefix} for user {UserId}", prefix, userId);
        }
    }

    public async Task<string> SaveUserPhotoAsync(Guid userId, Stream stream, CancellationToken cancellationToken = default)
    {
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, cancellationToken);
        var bytes = ms.ToArray();

        var (data, ext, _) = ProcessPhoto(bytes);
        var dirPath = await EnsureUserPhotoDirAsync(userId);
        DeleteMatchingPhotos(userId, UserPhotoId);

        var filename = $"{UserPhotoId}.{ext}";
        var filePath = Path.Combine(dirPath, filename);
        ValidateFilePath(filePath, GetPhotoStoragePath());

        await AtomicWriteAsync(filePath, data, cancellationToken);
        return filename;
    }

    public Task DeleteUserPhotoAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        DeleteMatchingPhotos(userId, UserPhotoId);
        return Task.CompletedTask;
    }

    public async Task<(byte[] Bytes, string MimeType)?> ReadUserPhotoAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var user = await _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null || !IsPhotoFilename(user.Photo))
            return null;

        return await ReadFileAsync(userId, user.Photo!, cancellationToken);
    }

    public async Task<string> SavePersonPhotoAsync(Guid userId, Guid personId, Stream stream, CancellationToken cancellationToken = default)
    {
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, cancellationToken);
        var bytes = ms.ToArray();

        var (data, ext, _) = ProcessPhoto(bytes);
        var dirPath = await EnsureUserPhotoDirAsync(userId);
        DeleteMatchingPhotos(userId, personId.ToString());

        var filename = $"{personId}.{ext}";
        var filePath = Path.Combine(dirPath, filename);
        ValidateFilePath(filePath, GetPhotoStoragePath());

        await AtomicWriteAsync(filePath, data, cancellationToken);
        return filename;
    }

    public Task DeletePersonPhotoAsync(Guid userId, Guid personId, CancellationToken cancellationToken = default)
    {
        DeleteMatchingPhotos(userId, personId.ToString());
        return Task.CompletedTask;
    }

    public async Task<(byte[] Bytes, string MimeType)?> ReadPersonPhotoAsync(Guid userId, Guid personId, CancellationToken cancellationToken = default)
    {
        var person = await _dbContext.People.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Id == personId && p.UserId == userId && p.DeletedAt == null, cancellationToken);

        if (person == null || !IsPhotoFilename(person.Photo))
            return null;

        return await ReadFileAsync(userId, person.Photo!, cancellationToken);
    }

    public async Task<string> SaveMarkPhotoAsync(Guid userId, Guid personId, Stream stream, CancellationToken cancellationToken = default)
    {
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, cancellationToken);
        var bytes = ms.ToArray();

        var (data, ext, _) = ProcessPhoto(bytes);
        var dirPath = await EnsureUserPhotoDirAsync(userId);

        var randomHex = Guid.NewGuid().ToString("N")[..12];
        var filename = $"mark_{personId}_{randomHex}.{ext}";
        var filePath = Path.Combine(dirPath, filename);
        ValidateFilePath(filePath, GetPhotoStoragePath());

        await AtomicWriteAsync(filePath, data, cancellationToken);
        return filename;
    }

    public async Task<(byte[] Bytes, string MimeType)?> ReadMarkPhotoAsync(Guid userId, string filename, CancellationToken cancellationToken = default)
    {
        if (!IsPhotoFilename(filename))
            return null;

        return await ReadFileAsync(userId, filename, cancellationToken);
    }

    public async Task<(byte[] Bytes, string MimeType)> ConvertHeicToJpegAsync(Stream stream, CancellationToken cancellationToken = default)
    {
        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, cancellationToken);
        var buffer = ms.ToArray();

        if (buffer.Length > MaxPhotoSize)
            throw new PayloadTooLargeException($"Photo exceeds maximum size of {MaxPhotoSize / (1024 * 1024)}MB");

        if (!IsHeicBuffer(buffer))
            throw new BadRequestException("File is not HEIC/HEIF format. Only HEIC files need conversion.");

        using var image = Image.NewFromBuffer(buffer);
        if ((long)image.Width * image.Height > SharpMaxInputPixels)
            throw new BadRequestException("Image dimensions too large");

        using var oriented = image.Autorot();
        int quality = GetJpegQuality();
        var jpg = oriented.JpegsaveBuffer(q: quality, keep: (int)Enums.ForeignKeep.None);

        return (jpg, "image/jpeg");
    }

    private async Task<(byte[] Bytes, string MimeType)?> ReadFileAsync(Guid userId, string filename, CancellationToken cancellationToken)
    {
        var basePath = GetPhotoStoragePath();
        var filePath = Path.Combine(basePath, userId.ToString(), filename);
        ValidateFilePath(filePath, basePath);

        if (!File.Exists(filePath))
            return null;

        var ext = Path.GetExtension(filename).TrimStart('.').ToLowerInvariant();
        var mime = ext switch
        {
            "png" => "image/png",
            "gif" => "image/gif",
            "webp" => "image/webp",
            _ => "image/jpeg"
        };

        var bytes = await File.ReadAllBytesAsync(filePath, cancellationToken);
        return (bytes, mime);
    }
}
