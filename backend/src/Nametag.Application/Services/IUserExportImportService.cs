using Nametag.Application.DTOs.User;

namespace Nametag.Application.Services;

public interface IUserExportImportService
{
    Task<UserExportDataDto> ExportUserDataAsync(Guid userId, string? groupIdsParam, CancellationToken ct = default);
    Task<ImportValidateResponseDto> ValidateImportDataAsync(Guid userId, ImportDataRequest request, CancellationToken ct = default);
    Task<ImportResponseDto> ImportUserDataAsync(Guid userId, ImportDataRequest request, CancellationToken ct = default);
}

