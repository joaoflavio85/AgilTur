using ArameTurismo.Api.Application.Interfaces;

namespace ArameTurismo.Api.Infrastructure.Services;

public class CreditoExpiracaoBackgroundService(
    IServiceProvider serviceProvider,
    ILogger<CreditoExpiracaoBackgroundService> logger) : BackgroundService
{
    private readonly IServiceProvider _serviceProvider = serviceProvider;
    private readonly ILogger<CreditoExpiracaoBackgroundService> _logger = logger;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var creditoService = scope.ServiceProvider.GetRequiredService<ICreditoService>();
                var expirados = await creditoService.ExpirarCreditosAutomaticamenteAsync(stoppingToken);
                if (expirados > 0)
                {
                    _logger.LogInformation("Expiracao automatica de creditos executada. Total: {Total}", expirados);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Falha ao executar rotina de expiracao automatica de creditos.");
            }

            await Task.Delay(TimeSpan.FromHours(24), stoppingToken);
        }
    }
}
