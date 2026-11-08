namespace Nametag.Application.Common.Exceptions;

public class ImmichNotConfiguredException : Exception
{
    public ImmichNotConfiguredException() : base("IMMICH_NOT_CONFIGURED")
    {
    }
}

public class ImmichException : Exception
{
    public int StatusCode { get; }

    public ImmichException(string message, int statusCode = 502) : base(message)
    {
        StatusCode = statusCode;
    }
}
