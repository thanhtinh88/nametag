using FluentValidation;
using Nametag.Application.DTOs.EvidenceMap;

namespace Nametag.Application.Validators.EvidenceMap;

public class CreateMarkerRequestValidator : AbstractValidator<CreateMarkerRequest>
{
    private static readonly string[] ValidMarkerTypes = ["CAMERA", "BTS", "CRIME_SCENE", "PHYSICAL_EVIDENCE", "WITNESS", "CUSTOM"];
    private static readonly string[] ValidCameraStatuses = ["CAPTURED", "CLEAR", "BLIND_BROKEN"];

    public CreateMarkerRequestValidator()
    {
        RuleFor(x => x.Label)
            .NotEmpty().WithMessage("Tên điểm không được để trống")
            .MaximumLength(200);

        RuleFor(x => x.MarkerType)
            .Must(x => string.IsNullOrEmpty(x) || ValidMarkerTypes.Contains(x))
            .WithMessage("Invalid marker type");

        RuleFor(x => x.Latitude)
            .InclusiveBetween(-90, 90).WithMessage("Latitude must be between -90 and 90");

        RuleFor(x => x.Longitude)
            .InclusiveBetween(-180, 180).WithMessage("Longitude must be between -180 and 180");

        RuleFor(x => x.CameraDirection)
            .InclusiveBetween(0, 360).When(x => x.CameraDirection.HasValue);

        RuleFor(x => x.CameraFovDeg)
            .InclusiveBetween(10, 360).When(x => x.CameraFovDeg.HasValue);

        RuleFor(x => x.CameraStatus)
            .Must(x => string.IsNullOrEmpty(x) || ValidCameraStatuses.Contains(x))
            .When(x => !string.IsNullOrEmpty(x.CameraStatus));

        RuleFor(x => x.BtsRadiusMeters)
            .InclusiveBetween(10, 50000).When(x => x.BtsRadiusMeters.HasValue);

        RuleFor(x => x.BtsAzimuthDeg)
            .InclusiveBetween(0, 360).When(x => x.BtsAzimuthDeg.HasValue);
    }
}

public class UpdateMarkerRequestValidator : AbstractValidator<UpdateMarkerRequest>
{
    private static readonly string[] ValidMarkerTypes = ["CAMERA", "BTS", "CRIME_SCENE", "PHYSICAL_EVIDENCE", "WITNESS", "CUSTOM"];
    private static readonly string[] ValidCameraStatuses = ["CAPTURED", "CLEAR", "BLIND_BROKEN"];

    public UpdateMarkerRequestValidator()
    {
        RuleFor(x => x.Label)
            .NotEmpty().When(x => x.Label != null).WithMessage("Tên điểm không được để trống")
            .MaximumLength(200);

        RuleFor(x => x.MarkerType)
            .Must(x => string.IsNullOrEmpty(x) || ValidMarkerTypes.Contains(x))
            .When(x => !string.IsNullOrEmpty(x.MarkerType));

        RuleFor(x => x.Latitude!.Value)
            .InclusiveBetween(-90, 90).When(x => x.Latitude.HasValue);

        RuleFor(x => x.Longitude!.Value)
            .InclusiveBetween(-180, 180).When(x => x.Longitude.HasValue);

        RuleFor(x => x.CameraDirection)
            .InclusiveBetween(0, 360).When(x => x.CameraDirection.HasValue);

        RuleFor(x => x.CameraFovDeg)
            .InclusiveBetween(10, 360).When(x => x.CameraFovDeg.HasValue);

        RuleFor(x => x.CameraStatus)
            .Must(x => string.IsNullOrEmpty(x) || ValidCameraStatuses.Contains(x))
            .When(x => !string.IsNullOrEmpty(x.CameraStatus));

        RuleFor(x => x.BtsRadiusMeters)
            .InclusiveBetween(10, 50000).When(x => x.BtsRadiusMeters.HasValue);

        RuleFor(x => x.BtsAzimuthDeg)
            .InclusiveBetween(0, 360).When(x => x.BtsAzimuthDeg.HasValue);
    }
}

public class CreateRouteRequestValidator : AbstractValidator<CreateRouteRequest>
{
    private static readonly string[] ValidRouteTypes = ["CONFIRMED_PATH", "SUSPECTED_PATH", "RELATION_LINK"];

    public CreateRouteRequestValidator()
    {
        RuleFor(x => x.Label)
            .NotEmpty().WithMessage("Tên lộ trình không được để trống")
            .MaximumLength(200);

        RuleFor(x => x.RouteType)
            .Must(x => ValidRouteTypes.Contains(x)).WithMessage("Invalid route type");

        RuleFor(x => x.Waypoints)
            .NotNull()
            .Must(x => x != null && x.Count >= 2).WithMessage("Lộ trình cần ít nhất 2 điểm");

        RuleForEach(x => x.Waypoints).ChildRules(wp =>
        {
            wp.RuleFor(w => w.Lat).InclusiveBetween(-90, 90);
            wp.RuleFor(w => w.Lng).InclusiveBetween(-180, 180);
        });
    }
}

public class UpdateRouteRequestValidator : AbstractValidator<UpdateRouteRequest>
{
    private static readonly string[] ValidRouteTypes = ["CONFIRMED_PATH", "SUSPECTED_PATH", "RELATION_LINK"];

    public UpdateRouteRequestValidator()
    {
        RuleFor(x => x.Label)
            .NotEmpty().When(x => x.Label != null).WithMessage("Tên lộ trình không được để trống")
            .MaximumLength(200);

        RuleFor(x => x.RouteType)
            .Must(x => string.IsNullOrEmpty(x) || ValidRouteTypes.Contains(x))
            .When(x => !string.IsNullOrEmpty(x.RouteType));

        RuleFor(x => x.Waypoints)
            .Must(x => x == null || x.Count >= 2).WithMessage("Lộ trình cần ít nhất 2 điểm")
            .When(x => x.Waypoints != null);

        RuleForEach(x => x.Waypoints).ChildRules(wp =>
        {
            wp.RuleFor(w => w.Lat).InclusiveBetween(-90, 90);
            wp.RuleFor(w => w.Lng).InclusiveBetween(-180, 180);
        }).When(x => x.Waypoints != null);
    }
}

public class CreateDrawingRequestValidator : AbstractValidator<CreateDrawingRequest>
{
    private static readonly string[] ValidDrawingTypes = ["FREEHAND", "LINE", "POLYGON", "RECTANGLE", "CIRCLE", "TEXT"];
    private static readonly string[] ValidStrokeStyles = ["SOLID", "DASHED"];

    public CreateDrawingRequestValidator()
    {
        RuleFor(x => x.DrawingType)
            .Must(x => ValidDrawingTypes.Contains(x)).WithMessage("Invalid drawing type");

        RuleFor(x => x.StrokeWidth)
            .InclusiveBetween(1, 16);

        RuleFor(x => x.StrokeStyle)
            .Must(x => ValidStrokeStyles.Contains(x));

        RuleFor(x => x.FillOpacity)
            .InclusiveBetween(0, 1);

        RuleFor(x => x.Coordinates)
            .NotNull()
            .Must(x => x != null && x.Count >= 1).WithMessage("Coordinates required");

        RuleForEach(x => x.Coordinates).ChildRules(c =>
        {
            c.RuleFor(coord => coord.Lat).InclusiveBetween(-90, 90);
            c.RuleFor(coord => coord.Lng).InclusiveBetween(-180, 180);
        });

        RuleFor(x => x.RadiusMeters)
            .InclusiveBetween(1, 100000).When(x => x.RadiusMeters.HasValue);
    }
}

public class UpdateDrawingRequestValidator : AbstractValidator<UpdateDrawingRequest>
{
    private static readonly string[] ValidDrawingTypes = ["FREEHAND", "LINE", "POLYGON", "RECTANGLE", "CIRCLE", "TEXT"];
    private static readonly string[] ValidStrokeStyles = ["SOLID", "DASHED"];

    public UpdateDrawingRequestValidator()
    {
        RuleFor(x => x.DrawingType)
            .Must(x => string.IsNullOrEmpty(x) || ValidDrawingTypes.Contains(x))
            .When(x => !string.IsNullOrEmpty(x.DrawingType));

        RuleFor(x => x.StrokeWidth!.Value)
            .InclusiveBetween(1, 16).When(x => x.StrokeWidth.HasValue);

        RuleFor(x => x.StrokeStyle)
            .Must(x => string.IsNullOrEmpty(x) || ValidStrokeStyles.Contains(x))
            .When(x => !string.IsNullOrEmpty(x.StrokeStyle));

        RuleFor(x => x.FillOpacity!.Value)
            .InclusiveBetween(0, 1).When(x => x.FillOpacity.HasValue);

        RuleFor(x => x.Coordinates)
            .Must(x => x == null || x.Count >= 1).WithMessage("Coordinates required")
            .When(x => x.Coordinates != null);

        RuleForEach(x => x.Coordinates).ChildRules(c =>
        {
            c.RuleFor(coord => coord.Lat).InclusiveBetween(-90, 90);
            c.RuleFor(coord => coord.Lng).InclusiveBetween(-180, 180);
        }).When(x => x.Coordinates != null);

        RuleFor(x => x.RadiusMeters)
            .InclusiveBetween(1, 100000).When(x => x.RadiusMeters.HasValue);
    }
}
