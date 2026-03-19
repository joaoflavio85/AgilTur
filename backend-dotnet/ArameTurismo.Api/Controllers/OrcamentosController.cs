using ArameTurismo.Api.Application.DTOs;
using ArameTurismo.Api.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Security.Cryptography;
using System.Text;

namespace ArameTurismo.Api.Controllers;

[ApiController]
[Route("api")]
public class OrcamentosController(
    IOrcamentoService orcamentoService,
    IOrcamentoPdfService orcamentoPdfService,
    IConfiguration configuration) : ControllerBase
{
    private readonly IOrcamentoService _orcamentoService = orcamentoService;
    private readonly IOrcamentoPdfService _orcamentoPdfService = orcamentoPdfService;
    private readonly IConfiguration _configuration = configuration;

    [HttpPost("propostas/{propostaId}/orcamentos")]
    public async Task<ActionResult<OrcamentoDto>> Criar(string propostaId, [FromBody] CriarOrcamentoDto dto, CancellationToken ct)
    {
        var propostaGuid = ParseOrCreateGuid(propostaId);
        var agenteId = Guid.TryParse(Request.Headers["x-agente-id"], out var parsed) ? parsed : Guid.Empty;
        var result = await _orcamentoService.CriarAsync(propostaGuid, agenteId, dto, ct);
        return CreatedAtAction(nameof(ObterPorId), new { id = result.Id }, result);
    }

    [HttpGet("propostas/{propostaId}/orcamentos")]
    public async Task<ActionResult<IReadOnlyList<OrcamentoDto>>> ListarPorProposta(string propostaId, CancellationToken ct)
    {
        var propostaGuid = ParseOrCreateGuid(propostaId);
        var result = await _orcamentoService.ListarPorPropostaAsync(propostaGuid, ct);
        return Ok(result);
    }

    [HttpGet("orcamentos/{id:guid}")]
    public async Task<ActionResult<OrcamentoDto>> ObterPorId(Guid id, CancellationToken ct)
    {
        var result = await _orcamentoService.ObterPorIdAsync(id, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("orcamentos/{id:guid}")]
    public async Task<ActionResult<OrcamentoDto>> Atualizar(Guid id, [FromBody] AtualizarOrcamentoDto dto, CancellationToken ct)
    {
        var result = await _orcamentoService.AtualizarAsync(id, dto, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("orcamentos/{id:guid}")]
    public async Task<IActionResult> Excluir(Guid id, CancellationToken ct)
    {
        var ok = await _orcamentoService.ExcluirAsync(id, ct);
        return ok ? NoContent() : NotFound();
    }

    [HttpPost("orcamentos/{id:guid}/duplicar")]
    public async Task<ActionResult<OrcamentoDto>> Duplicar(Guid id, CancellationToken ct)
    {
        var agenteId = Guid.TryParse(Request.Headers["x-agente-id"], out var parsed) ? parsed : Guid.Empty;
        var result = await _orcamentoService.DuplicarAsync(id, agenteId, ct);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPost("orcamentos/{id:guid}/publicar")]
    public async Task<ActionResult<object>> Publicar(Guid id, CancellationToken ct)
    {
        var token = await _orcamentoService.PublicarAsync(id, ct);
        if (token is null)
        {
            return NotFound();
        }

        var baseUrl = _configuration["Publico:BaseUrl"] ?? "https://app.arame.com/o";
        return Ok(new { token, linkPublico = $"{baseUrl}/{token}" });
    }

    [HttpPost("propostas/{propostaId}/orcamentos/publicar-todos")]
    public async Task<ActionResult<object>> PublicarTodosDaProposta(string propostaId, CancellationToken ct)
    {
        var propostaGuid = ParseOrCreateGuid(propostaId);
        var orcamentos = await _orcamentoService.ListarPorPropostaAsync(propostaGuid, ct);
        if (orcamentos.Count == 0)
        {
            return NotFound(new { error = "Nao ha orcamentos para publicar nesta proposta." });
        }

        var token = EncodePropostaToken(propostaGuid);
        var baseUrl = _configuration["Publico:BaseUrlPropostas"] ?? "https://app.arame.com/o/propostas";
        return Ok(new { token, linkPublico = $"{baseUrl}/{token}" });
    }

    [HttpPost("orcamentos/{id:guid}/enviar")]
    public async Task<IActionResult> RegistrarEnvio(Guid id, [FromBody] RegistrarEnvioDto dto, CancellationToken ct)
    {
        await _orcamentoService.RegistrarEnvioAsync(id, dto, ct);
        return NoContent();
    }

    [HttpGet("orcamentos/{id:guid}/pdf")]
    public async Task<IActionResult> GerarPdf(
        Guid id,
        [FromQuery] string? empresaNome,
        [FromQuery] string? empresaLogoUrl,
        [FromQuery] string? clienteNome,
        [FromQuery] string? clienteEmail,
        [FromQuery] string? clienteTelefone,
        CancellationToken ct)
    {
        var context = new OrcamentoPdfContext
        {
            EmpresaNome = empresaNome,
            EmpresaLogoUrl = empresaLogoUrl,
            ClienteNome = clienteNome,
            ClienteEmail = clienteEmail,
            ClienteTelefone = clienteTelefone,
        };

        var bytes = await _orcamentoPdfService.GerarPdfAsync(id, context, ct);
        return File(bytes, "application/pdf", $"orcamento-{id}.pdf");
    }

    private static Guid ParseOrCreateGuid(string rawId)
    {
        if (Guid.TryParse(rawId, out var parsed))
        {
            return parsed;
        }

        var normalized = $"crm-proposta:{rawId}";
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(normalized));
        var guidBytes = new byte[16];
        Array.Copy(hash, guidBytes, 16);

        return new Guid(guidBytes);
    }

    private static string EncodePropostaToken(Guid propostaId)
    {
        return Convert.ToBase64String(propostaId.ToByteArray())
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }
}
