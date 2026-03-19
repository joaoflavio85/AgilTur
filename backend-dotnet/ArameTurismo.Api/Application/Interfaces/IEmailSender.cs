namespace ArameTurismo.Api.Application.Interfaces;

public interface IEmailSender
{
    Task SendAsync(string toEmail, string subject, string body, bool isHtml, CancellationToken ct);
}
