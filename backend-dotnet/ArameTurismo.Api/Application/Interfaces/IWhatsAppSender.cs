namespace ArameTurismo.Api.Application.Interfaces;

public interface IWhatsAppSender
{
    Task SendAsync(string toPhone, string message, CancellationToken ct);
}
