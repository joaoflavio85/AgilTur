using ArameTurismo.Api.Application.DTOs;
using ArameTurismo.Api.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ArameTurismo.Api.Controllers;

[ApiController]
[Route("api/creditos")]
public class CreditosController(ICreditoService creditoService) : ControllerBase
{
    private readonly ICreditoService _creditoService = creditoService;

    [HttpPost]
    public async Task<ActionResult<CreditoClienteDto>> Criar([FromBody] CriarCreditoDto dto, CancellationToken ct)
    {
        var result = await _creditoService.CriarAsync(dto, ct);
        return CreatedAtAction(nameof(ObterPorId), new { id = result.Id }, result);
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CreditoClienteDto>>> Listar(
        [FromQuery] int? clienteId,
        [FromQuery] string? status,
        [FromQuery] DateTime? validadeInicio,
        [FromQuery] DateTime? validadeFim,
        CancellationToken ct)
    {
        var result = await _creditoService.ListarAsync(clienteId, status, validadeInicio, validadeFim, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CreditoDetalheDto>> ObterPorId(Guid id, CancellationToken ct)
    {
        var result = await _creditoService.ObterPorIdAsync(id, ct);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CreditoClienteDto>> Atualizar(Guid id, [FromBody] AtualizarCreditoDto dto, CancellationToken ct)
    {
        var result = await _creditoService.AtualizarAsync(id, dto, ct);
        if (result is null) return NotFound();
        return Ok(result);
    }

    [HttpPost("{id:guid}/utilizar")]
    public async Task<ActionResult<CreditoClienteDto>> Utilizar(Guid id, [FromBody] UtilizarCreditoDto dto, CancellationToken ct)
    {
        var result = await _creditoService.UtilizarAsync(id, dto, ct);
        return Ok(result);
    }

    [HttpGet("alertas")]
    public async Task<ActionResult<CreditoAlertasDto>> Alertas(CancellationToken ct)
    {
        var result = await _creditoService.ObterAlertasAsync(ct);
        return Ok(result);
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<CreditoDashboardDto>> Dashboard(CancellationToken ct)
    {
        var result = await _creditoService.ObterDashboardAsync(ct);
        return Ok(result);
    }
}
