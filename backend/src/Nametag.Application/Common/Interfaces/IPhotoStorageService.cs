namespace Nametag.Application.Common.Interfaces;

public interface IPhotoStorageService
{
    Task<string> SaveUserPhotoAsync(Guid userId, Stream stream, CancellationToken cancellationToken = default);
    Task DeleteUserPhotoAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<(byte[] Bytes, string MimeType)?> ReadUserPhotoAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<string> SavePersonPhotoAsync(Guid userId, Guid personId, Stream stream, CancellationToken cancellationToken = default);
    Task DeletePersonPhotoAsync(Guid userId, Guid personId, CancellationToken cancellationToken = default);
    Task<(byte[] Bytes, string MimeType)?> ReadPersonPhotoAsync(Guid userId, Guid personId, CancellationToken cancellationToken = default);

    Task<string> SaveMarkPhotoAsync(Guid userId, Guid personId, Stream stream, CancellationToken cancellationToken = default);
    Task<(byte[] Bytes, string MimeType)?> ReadMarkPhotoAsync(Guid userId, string filename, CancellationToken cancellationToken = default);

    Task<(byte[] Bytes, string MimeType)> ConvertHeicToJpegAsync(Stream stream, CancellationToken cancellationToken = default);
}
