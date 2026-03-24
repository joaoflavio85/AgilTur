using ArameTurismo.Api.Application.DTOs;

namespace ArameTurismo.Api.Application.Interfaces;

public interface ICreditoService
{
    Task<CreditoClienteDto> CriarAsync(CriarCreditoDto dto, CancellationToken ct);
    Task<IReadOnlyList<CreditoClienteDto>> ListarAsync(int? clienteId, string? status, DateTime? validadeInicio, DateTime? validadeFim, CancellationToken ct);
    Task<CreditoDetalheDto?> ObterPorIdAsync(Guid id, CancellationToken ct);
    Task<CreditoClienteDto?> AtualizarAsync(Guid id, AtualizarCreditoDto dto, CancellationToken ct);
    Task<CreditoClienteDto> UtilizarAsync(Guid id, UtilizarCreditoDto dto, CancellationToken ct);
    Task<int> ExpirarCreditosAutomaticamenteAsync(CancellationToken ct);
    Task<CreditoAlertasDto> ObterAlertasAsync(CancellationToken ct);
    Task<CreditoDashboardDto> ObterDashboardAsync(CancellationToken ct);
}
