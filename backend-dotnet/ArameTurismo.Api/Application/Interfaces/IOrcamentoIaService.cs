using ArameTurismo.Api.Application.DTOs;

namespace ArameTurismo.Api.Application.Interfaces;

public interface IOrcamentoIaService
{
    Task<OrcamentoIaOutputDto> GerarAsync(OrcamentoIaInputDto input, CancellationToken ct);
}
