using Nametag.Application.DTOs.Immich;

namespace Nametag.Application.Services;

public interface IImmichService
{
    Task<ImmichConnectionDto?> GetConnectionAsync(Guid userId, CancellationToken ct = default);
    Task<ImmichConnectionDto> SaveConnectionAsync(Guid userId, SaveImmichConnectionRequest request, CancellationToken ct = default);
    Task DeleteConnectionAsync(Guid userId, CancellationToken ct = default);
    Task<TestImmichConnectionResponse> TestConnectionAsync(Guid userId, TestImmichConnectionRequest request, CancellationToken ct = default);

    Task<(List<ImmichAssetDto> Assets, string PublicUrl)> GetAssetsAsync(Guid userId, string? personId, string? albumId, CancellationToken ct = default);
    Task<List<ImmichAlbumSummaryDto>> GetAlbumsAsync(Guid userId, CancellationToken ct = default);
    Task<List<ImmichPersonSummaryDto>> GetPeopleAsync(Guid userId, string? query, CancellationToken ct = default);

    Task<ImmichBinaryStreamResult> StreamAssetBinaryAsync(Guid userId, string assetId, string variant, string? rangeHeader, CancellationToken ct = default);
    Task<ImmichBinaryStreamResult> StreamPersonThumbnailAsync(Guid userId, string immichPersonId, CancellationToken ct = default);

    Task<object> LinkPersonImmichAsync(Guid userId, Guid personId, PersonImmichLinkRequest request, CancellationToken ct = default);
    Task<(string Filename, string PhotoUrl)> SetPersonPhotoFromImmichAsync(Guid userId, Guid personId, string assetId, CancellationToken ct = default);
    Task<object> LinkEventImmichAsync(Guid userId, Guid eventId, EventImmichLinkRequest request, CancellationToken ct = default);
}
