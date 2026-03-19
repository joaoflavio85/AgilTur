using System.Net;
using System.Security.Cryptography;
using System.Text;
using ArameTurismo.Api.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ArameTurismo.Api.Controllers;

[ApiController]
public class OrcamentoPublicoController(IOrcamentoService orcamentoService) : ControllerBase
{
    private readonly IOrcamentoService _orcamentoService = orcamentoService;

    [HttpGet("api/public/propostas/{token}")]
    public async Task<IActionResult> ObterListaJson(string token, CancellationToken ct)
    {
        if (!TryDecodePropostaToken(token, out var propostaId))
        {
            return NotFound();
        }

        var lista = await _orcamentoService.ListarPorPropostaAsync(propostaId, ct);
        if (lista.Count == 0)
        {
            return NotFound();
        }

        return Ok(lista);
    }

    [HttpGet("api/public/orcamentos/{token}")]
    public async Task<IActionResult> ObterJson(string token, CancellationToken ct)
    {
        var result = await _orcamentoService.ObterPorTokenAsync(token, ct);
        if (result is null)
        {
            return NotFound();
        }

        await RegistrarVisualizacao(token, "LINK_DIRETO", ct);
        return Ok(result);
    }

    [HttpGet("o/{token}")]
    public async Task<IActionResult> ObterHtml(string token, CancellationToken ct)
    {
        var result = await _orcamentoService.ObterPorTokenAsync(token, ct);
        if (result is null)
        {
            return NotFound("Orcamento nao encontrado.");
        }

        await RegistrarVisualizacao(token, "LINK_DIRETO", ct);

        var imagemCapa = result.Imagens.OrderBy(x => x.Ordem).FirstOrDefault()?.Url
            ?? "https://images.unsplash.com/photo-1488646953014-85cb44e25828";

        var html = $@"<!doctype html>
<html lang='pt-br'>
<head>
<meta charset='utf-8'/>
<meta name='viewport' content='width=device-width,initial-scale=1'/>
<title>{Encode(result.Titulo)}</title>
<style>
body {{ font-family: 'Segoe UI', sans-serif; margin:0; color:#1f2937; background:#f8fafc; }}
.header {{ background:#0f766e; color:white; padding:32px 20px; }}
.container {{ max-width:960px; margin:20px auto; background:white; border-radius:16px; overflow:hidden; box-shadow:0 12px 30px rgba(0,0,0,.08); }}
.capa {{ width:100%; height:320px; object-fit:cover; }}
.section {{ padding:24px; border-bottom:1px solid #e5e7eb; }}
.grid {{ display:grid; grid-template-columns: repeat(auto-fit,minmax(180px,1fr)); gap:16px; }}
.card {{ background:#f1f5f9; border-radius:12px; padding:14px; }}
.btn {{ display:inline-block; margin-top:18px; background:#0f766e; color:white; padding:12px 18px; text-decoration:none; border-radius:10px; font-weight:600; }}
.small {{ color:#475569; }}
</style>
</head>
<body>
<div class='container'>
<img class='capa' src='{Encode(imagemCapa)}' alt='Destino' />
<div class='header'>
<h1>{Encode(result.Titulo)}</h1>
<p>{Encode(result.Destino)}</p>
</div>
<div class='section'>
<h2>Descricao do destino</h2>
<p>{Encode(result.DescricaoDestino ?? "")}</p>
</div>
<div class='section'>
<h2>Hotel selecionado</h2>
<p><strong>{Encode(result.Hotel ?? "Nao informado")}</strong></p>
<p>{Encode(result.DescricaoHotel ?? "")}</p>
</div>
<div class='section grid'>
<div class='card'><div class='small'>Datas</div><div>{Encode($"{result.DataInicio:dd/MM/yyyy} a {result.DataFim:dd/MM/yyyy}")}</div></div>
<div class='card'><div class='small'>Pessoas</div><div>{result.NumeroPessoas}</div></div>
<div class='card'><div class='small'>Valor total</div><div>R$ {result.ValorTotal:N2}</div></div>
<div class='card'><div class='small'>Parcelas no cartao</div><div>{(result.QtdParcelasCartao.HasValue && result.QtdParcelasCartao > 0 ? $"{result.QtdParcelasCartao}x de R$ {result.ValorParcelaCartao:N2}" : "Nao informado")}</div></div>
<div class='card'><div class='small'>Valor no PIX</div><div>{(result.ValorPix.HasValue ? $"R$ {result.ValorPix:N2}" : "Nao informado")}</div></div>
</div>
{(result.TemAereo ? $@"<div class='section'>
<h2>Informacoes de voo</h2>
<p><strong>Companhia:</strong> {Encode(result.CompanhiaAerea ?? "Nao informado")}</p>
<p><strong>Ida:</strong> {Encode(result.AeroportoIda ?? "-")} - {Encode(result.HorarioVooIda ?? "-")}</p>
<p><strong>Volta:</strong> {Encode(result.AeroportoVolta ?? "-")} - {Encode(result.HorarioVooVolta ?? "-")}</p>
</div>" : string.Empty)}
{(!string.IsNullOrWhiteSpace(result.LinkPropostaFornecedor) ? $@"<div class='section'>
<h2>Proposta do fornecedor</h2>
<a class='btn' href='{Encode(result.LinkPropostaFornecedor)}' target='_blank' rel='noreferrer'>Abrir proposta original</a>
</div>" : string.Empty)}
<div class='section'>
<h2>Observacoes e condicoes</h2>
<p>{Encode(result.Observacoes ?? "")}</p>
<p>{Encode(result.Condicoes ?? "")}</p>
</div>
</div>
</body>
</html>";

        return Content(html, "text/html", Encoding.UTF8);
    }

        [HttpGet("o/propostas/{token}")]
        public async Task<IActionResult> ObterListaHtml(string token, CancellationToken ct)
        {
                if (!TryDecodePropostaToken(token, out var propostaId))
                {
                        return NotFound("Link de proposta invalido.");
                }

                var lista = await _orcamentoService.ListarPorPropostaAsync(propostaId, ct);
                if (lista.Count == 0)
                {
                        return NotFound("Nenhum orcamento encontrado para esta proposta.");
                }

                var cards = string.Join("", lista.OrderByDescending(x => x.Versao).Select(x => $@"
<article class='card'>
    <h2>{Encode(x.Titulo)}</h2>
    <p><strong>Destino:</strong> {Encode(x.Destino)}</p>
    <p><strong>Periodo:</strong> {Encode($"{x.DataInicio:dd/MM/yyyy} a {x.DataFim:dd/MM/yyyy}")}</p>
    <p><strong>Hotel:</strong> {Encode(x.Hotel ?? "Nao informado")}</p>
    <p>{Encode(x.DescricaoDestino ?? "")}</p>
    <p><strong>Aereo:</strong> {(x.TemAereo ? "Sim" : "Nao")}</p>
    {(x.TemAereo ? $"<p><strong>Voo ida:</strong> {Encode(x.AeroportoIda ?? "-")} - {Encode(x.HorarioVooIda ?? "-")}</p><p><strong>Voo volta:</strong> {Encode(x.AeroportoVolta ?? "-")} - {Encode(x.HorarioVooVolta ?? "-")}</p>" : string.Empty)}
    <p><strong>Valor:</strong> R$ {x.ValorTotal:N2}</p>
    <p><strong>Parcelas:</strong> {(x.QtdParcelasCartao.HasValue && x.QtdParcelasCartao > 0 ? $"{x.QtdParcelasCartao}x de R$ {x.ValorParcelaCartao:N2}" : "Nao informado")}</p>
    <p><strong>PIX:</strong> {(x.ValorPix.HasValue ? $"R$ {x.ValorPix:N2}" : "Nao informado")}</p>
    {(!string.IsNullOrWhiteSpace(x.LinkPropostaFornecedor) ? $"<p><a href='{Encode(x.LinkPropostaFornecedor)}' target='_blank' rel='noreferrer'>Abrir proposta do fornecedor</a></p>" : string.Empty)}
</article>"));

                var html = $@"<!doctype html>
<html lang='pt-br'>
<head>
<meta charset='utf-8'/>
<meta name='viewport' content='width=device-width,initial-scale=1'/>
<title>Orcamentos da proposta</title>
<style>
body {{ font-family:'Segoe UI',sans-serif; margin:0; background:#f8fafc; color:#1f2937; }}
.wrap {{ max-width:980px; margin:28px auto; padding:0 16px; }}
.head {{ background:#0f766e; color:#fff; border-radius:14px; padding:20px; margin-bottom:16px; }}
.list {{ display:grid; gap:12px; }}
.card {{ background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:16px; box-shadow:0 4px 12px rgba(0,0,0,.05); }}
.card h2 {{ margin:0 0 10px 0; }}
</style>
</head>
<body>
    <div class='wrap'>
        <div class='head'>
            <h1>Orcamentos da proposta</h1>
            <p>Compare as opcoes e fale com a ARAME TURISMO para finalizar.</p>
        </div>
        <section class='list'>{cards}</section>
    </div>
</body>
</html>";

                return Content(html, "text/html", Encoding.UTF8);
        }

    private async Task RegistrarVisualizacao(string token, string origem, CancellationToken ct)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = Request.Headers.UserAgent.ToString();
        var ipHash = string.IsNullOrWhiteSpace(ip) ? null : Hash(ip);

        await _orcamentoService.RegistrarVisualizacaoAsync(token, ipHash, userAgent, origem, ct);
    }

    private static string Hash(string value)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(value));
        return Convert.ToHexString(bytes);
    }

    private static bool TryDecodePropostaToken(string token, out Guid propostaId)
    {
        propostaId = Guid.Empty;
        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        try
        {
            var normalized = token.Replace('-', '+').Replace('_', '/');
            var padding = 4 - (normalized.Length % 4);
            if (padding < 4)
            {
                normalized = normalized + new string('=', padding);
            }

            var bytes = Convert.FromBase64String(normalized);
            if (bytes.Length != 16)
            {
                return false;
            }

            propostaId = new Guid(bytes);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static string Encode(string value) => WebUtility.HtmlEncode(value);
}
