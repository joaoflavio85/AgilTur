using ArameTurismo.Api.Application.Interfaces;
using ArameTurismo.Api.Infrastructure.Options;
using Microsoft.Extensions.Options;
using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace ArameTurismo.Api.Infrastructure.Services;

public class TwilioWhatsAppSender(IOptions<TwilioOptions> twilioOptions) : IWhatsAppSender
{
    private readonly TwilioOptions _twilioOptions = twilioOptions.Value;

    public async Task SendAsync(string toPhone, string message, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_twilioOptions.AccountSid) ||
            string.IsNullOrWhiteSpace(_twilioOptions.AuthToken) ||
            string.IsNullOrWhiteSpace(_twilioOptions.WhatsAppFrom))
        {
            throw new InvalidOperationException("Configuracao Twilio incompleta.");
        }

        TwilioClient.Init(_twilioOptions.AccountSid, _twilioOptions.AuthToken);
        _ = await MessageResource.CreateAsync(
            from: new PhoneNumber(_twilioOptions.WhatsAppFrom),
            to: new PhoneNumber(toPhone),
            body: message);
    }
}
