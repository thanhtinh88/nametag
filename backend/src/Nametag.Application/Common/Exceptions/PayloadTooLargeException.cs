namespace Nametag.Application.Common.Exceptions;

public class PayloadTooLargeException : Exception
{
    public PayloadTooLargeException(string message) : base(message)
    {
    }
}
