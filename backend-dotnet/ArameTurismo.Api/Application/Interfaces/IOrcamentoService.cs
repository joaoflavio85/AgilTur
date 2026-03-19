using ArameTurismo.Api.Application.DTOs;

namespace ArameTurismo.Api.Application.Interfaces;

public interface IOrcamentoService
{
    Task<OrcamentoDto> CriarAsync(Guid propostaId, Guid agenteId, CriarOrcamentoDto dto, CancellationToken ct);
    Task<IReadOnlyList<OrcamentoDto>> ListarPorPropostaAsync(Guid propostaId, CancellationToken ct);
    Task<OrcamentoDto?> ObterPorIdAsync(Guid id, CancellationToken ct);
    Task<OrcamentoDto?> AtualizarAsync(Guid id, AtualizarOrcamentoDto dto, CancellationToken ct);
    Task<bool> ExcluirAsync(Guid id, CancellationToken ct);
    Task<OrcamentoDto?> DuplicarAsync(Guid id, Guid agenteId, CancellationToken ct);
    Task<string?> PublicarAsync(Guid id, CancellationToken ct);
    Task RegistrarEnvioAsync(Guid id, RegistrarEnvioDto dto, CancellationToken ct);
    Task RegistrarVisualizacaoAsync(string token, string? ipHash, string? userAgent, string? origem, CancellationToken ct);
    Task<OrcamentoDto?> ObterPorTokenAsync(string token, CancellationToken ct);
}
