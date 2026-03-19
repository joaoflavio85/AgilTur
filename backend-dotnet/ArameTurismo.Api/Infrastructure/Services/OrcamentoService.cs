using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Globalization;
using ArameTurismo.Api.Application.DTOs;
using ArameTurismo.Api.Application.Interfaces;
using ArameTurismo.Api.Domain.Entities;
using ArameTurismo.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ArameTurismo.Api.Infrastructure.Services;

public class OrcamentoService(
    AppDbContext dbContext,
    IEmailSender emailSender,
    IWhatsAppSender whatsAppSender,
    IConfiguration configuration) : IOrcamentoService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly AppDbContext _dbContext = dbContext;
    private readonly IEmailSender _emailSender = emailSender;
    private readonly IWhatsAppSender _whatsAppSender = whatsAppSender;
    private readonly IConfiguration _configuration = configuration;

    public async Task<OrcamentoDto> CriarAsync(Guid propostaId, Guid agenteId, CriarOrcamentoDto dto, CancellationToken ct)
    {
        var propostaExiste = await _dbContext.Propostas.AnyAsync(x => x.Id == propostaId, ct);
        if (!propostaExiste)
        {
            var proposta = new Proposta
            {
                Id = propostaId,
                ClienteId = Guid.Empty,
                AgenteId = agenteId,
                Status = "ABERTA",
                DataCriacao = DateTime.UtcNow
            };

            _dbContext.Propostas.Add(proposta);
            await _dbContext.SaveChangesAsync(ct);
        }

        var proximaVersao = await _dbContext.Orcamentos
            .Where(x => x.PropostaId == propostaId)
            .Select(x => (int?)x.Versao)
            .MaxAsync(ct) ?? 0;

        var entity = new Orcamento
        {
            Id = Guid.NewGuid(),
            PropostaId = propostaId,
            Versao = proximaVersao + 1,
            Titulo = dto.Titulo,
            Destino = dto.Destino,
            TemAereo = dto.TemAereo,
            CompanhiaAerea = dto.TemAereo ? dto.CompanhiaAerea : null,
            HorarioVooIda = dto.TemAereo ? dto.HorarioVooIda : null,
            HorarioVooVolta = dto.TemAereo ? dto.HorarioVooVolta : null,
            AeroportoIda = dto.TemAereo ? dto.AeroportoIda : null,
            AeroportoVolta = dto.TemAereo ? dto.AeroportoVolta : null,
            Hotel = dto.Hotel,
            DescricaoDestino = dto.DescricaoDestino,
            DescricaoHotel = dto.DescricaoHotel,
            Roteiro = dto.Roteiro,
            Destaques = JsonSerializer.Serialize(dto.Destaques ?? new List<string>(), JsonOptions),
            DataInicio = dto.DataInicio,
            DataFim = dto.DataFim,
            NumeroPessoas = dto.NumeroPessoas,
            ValorTotal = dto.ValorTotal,
            QtdParcelasCartao = dto.QtdParcelasCartao,
            ValorParcelaCartao = CalcularParcela(dto.ValorTotal, dto.QtdParcelasCartao, dto.ValorParcelaCartao),
            ValorPix = dto.ValorPix,
            LinkPropostaFornecedor = dto.LinkPropostaFornecedor,
            FormaPagamento = dto.FormaPagamento,
            Observacoes = dto.Observacoes,
            Condicoes = dto.Condicoes,
            CriadoPorAgenteId = agenteId,
            DataCriacao = DateTime.UtcNow,
            DataAtualizacao = DateTime.UtcNow,
            Imagens = dto.Imagens.Select(x => new OrcamentoImagem
            {
                Id = Guid.NewGuid(),
                Url = x.Url,
                Legenda = x.Legenda,
                Ordem = x.Ordem,
                Tipo = x.Tipo
            }).ToList()
        };

        _dbContext.Orcamentos.Add(entity);
        await _dbContext.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<IReadOnlyList<OrcamentoDto>> ListarPorPropostaAsync(Guid propostaId, CancellationToken ct)
    {
        var dados = await _dbContext.Orcamentos
            .AsNoTracking()
            .Include(x => x.Imagens)
            .Where(x => x.PropostaId == propostaId)
            .OrderByDescending(x => x.Versao)
            .ToListAsync(ct);

        return dados.Select(Map).ToList();
    }

    public async Task<OrcamentoDto?> ObterPorIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await _dbContext.Orcamentos
            .AsNoTracking()
            .Include(x => x.Imagens)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        return entity is null ? null : Map(entity);
    }

    public async Task<OrcamentoDto?> AtualizarAsync(Guid id, AtualizarOrcamentoDto dto, CancellationToken ct)
    {
        var entity = await _dbContext.Orcamentos
            .Include(x => x.Imagens)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (entity is null)
        {
            return null;
        }

        entity.Titulo = dto.Titulo;
        entity.Destino = dto.Destino;
        entity.TemAereo = dto.TemAereo;
        entity.CompanhiaAerea = dto.TemAereo ? dto.CompanhiaAerea : null;
        entity.HorarioVooIda = dto.TemAereo ? dto.HorarioVooIda : null;
        entity.HorarioVooVolta = dto.TemAereo ? dto.HorarioVooVolta : null;
        entity.AeroportoIda = dto.TemAereo ? dto.AeroportoIda : null;
        entity.AeroportoVolta = dto.TemAereo ? dto.AeroportoVolta : null;
        entity.Hotel = dto.Hotel;
        entity.DescricaoDestino = dto.DescricaoDestino;
        entity.DescricaoHotel = dto.DescricaoHotel;
        entity.Roteiro = dto.Roteiro;
        entity.Destaques = JsonSerializer.Serialize(dto.Destaques ?? new List<string>(), JsonOptions);
        entity.DataInicio = dto.DataInicio;
        entity.DataFim = dto.DataFim;
        entity.NumeroPessoas = dto.NumeroPessoas;
        entity.ValorTotal = dto.ValorTotal;
        entity.QtdParcelasCartao = dto.QtdParcelasCartao;
        entity.ValorParcelaCartao = CalcularParcela(dto.ValorTotal, dto.QtdParcelasCartao, dto.ValorParcelaCartao);
        entity.ValorPix = dto.ValorPix;
        entity.LinkPropostaFornecedor = dto.LinkPropostaFornecedor;
        entity.FormaPagamento = dto.FormaPagamento;
        entity.Observacoes = dto.Observacoes;
        entity.Condicoes = dto.Condicoes;
        entity.Status = dto.Status;
        entity.DataAtualizacao = DateTime.UtcNow;

        _dbContext.OrcamentoImagens.RemoveRange(entity.Imagens);
        entity.Imagens = dto.Imagens.Select(x => new OrcamentoImagem
        {
            Id = Guid.NewGuid(),
            OrcamentoId = entity.Id,
            Url = x.Url,
            Legenda = x.Legenda,
            Ordem = x.Ordem,
            Tipo = x.Tipo
        }).ToList();

        await _dbContext.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<bool> ExcluirAsync(Guid id, CancellationToken ct)
    {
        var entity = await _dbContext.Orcamentos.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null)
        {
            return false;
        }

        _dbContext.Orcamentos.Remove(entity);
        await _dbContext.SaveChangesAsync(ct);
        return true;
    }

    public async Task<OrcamentoDto?> DuplicarAsync(Guid id, Guid agenteId, CancellationToken ct)
    {
        var original = await _dbContext.Orcamentos
            .Include(x => x.Imagens)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (original is null)
        {
            return null;
        }

        var proximaVersao = await _dbContext.Orcamentos
            .Where(x => x.PropostaId == original.PropostaId)
            .Select(x => (int?)x.Versao)
            .MaxAsync(ct) ?? 0;

        var novo = new Orcamento
        {
            Id = Guid.NewGuid(),
            PropostaId = original.PropostaId,
            Versao = proximaVersao + 1,
            Titulo = original.Titulo,
            Destino = original.Destino,
            TemAereo = original.TemAereo,
            CompanhiaAerea = original.CompanhiaAerea,
            HorarioVooIda = original.HorarioVooIda,
            HorarioVooVolta = original.HorarioVooVolta,
            AeroportoIda = original.AeroportoIda,
            AeroportoVolta = original.AeroportoVolta,
            Hotel = original.Hotel,
            DescricaoDestino = original.DescricaoDestino,
            DescricaoHotel = original.DescricaoHotel,
            Roteiro = original.Roteiro,
            Destaques = original.Destaques,
            DataInicio = original.DataInicio,
            DataFim = original.DataFim,
            NumeroPessoas = original.NumeroPessoas,
            ValorTotal = original.ValorTotal,
            QtdParcelasCartao = original.QtdParcelasCartao,
            ValorParcelaCartao = original.ValorParcelaCartao,
            ValorPix = original.ValorPix,
            LinkPropostaFornecedor = original.LinkPropostaFornecedor,
            Moeda = original.Moeda,
            FormaPagamento = original.FormaPagamento,
            Observacoes = original.Observacoes,
            Condicoes = original.Condicoes,
            Status = OrcamentoStatus.Rascunho,
            IsPublicado = false,
            PublicToken = null,
            CriadoPorAgenteId = agenteId,
            DataCriacao = DateTime.UtcNow,
            DataAtualizacao = DateTime.UtcNow,
            Imagens = original.Imagens.Select(x => new OrcamentoImagem
            {
                Id = Guid.NewGuid(),
                Url = x.Url,
                Legenda = x.Legenda,
                Ordem = x.Ordem,
                Tipo = x.Tipo
            }).ToList()
        };

        _dbContext.Orcamentos.Add(novo);
        await _dbContext.SaveChangesAsync(ct);
        return Map(novo);
    }

    public async Task<string?> PublicarAsync(Guid id, CancellationToken ct)
    {
        var entity = await _dbContext.Orcamentos.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null)
        {
            return null;
        }

        if (string.IsNullOrWhiteSpace(entity.PublicToken))
        {
            entity.PublicToken = GerarTokenSeguro();
        }

        entity.IsPublicado = true;
        entity.DataAtualizacao = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(ct);
        return entity.PublicToken;
    }

    public async Task RegistrarEnvioAsync(Guid id, RegistrarEnvioDto dto, CancellationToken ct)
    {
        var entity = await _dbContext.Orcamentos.FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null)
        {
            throw new KeyNotFoundException("Orcamento nao encontrado.");
        }

        if (!entity.IsPublicado)
        {
            if (string.IsNullOrWhiteSpace(entity.PublicToken))
            {
                entity.PublicToken = GerarTokenSeguro();
            }

            entity.IsPublicado = true;
        }

        var baseUrl = _configuration["Publico:BaseUrl"] ?? "https://app.arame.com/o";
        var linkPublico = $"{baseUrl}/{entity.PublicToken}";
        var mensagemPadrao = $"Ola! Seu orcamento da ARAME TURISMO esta pronto: {linkPublico}";
        var mensagemFinal = string.IsNullOrWhiteSpace(dto.Mensagem) ? mensagemPadrao : dto.Mensagem;
        var statusEnvio = "ENVIADO";
        var meioEnvioFinal = (dto.MeioEnvio ?? MeioEnvioOrcamento.WhatsApp).Trim().ToUpperInvariant();
        string? erroEnvio = null;

        try
        {
            if (meioEnvioFinal == MeioEnvioOrcamento.Email)
            {
                if (string.IsNullOrWhiteSpace(dto.Destinatario))
                {
                    throw new InvalidOperationException("Destinatario de email nao informado.");
                }

                var assunto = string.IsNullOrWhiteSpace(dto.Assunto)
                    ? $"Orcamento de viagem - {entity.Destino}"
                    : dto.Assunto;

                var corpoEmailHtml = MontarEmailHtml(entity, linkPublico, mensagemFinal);

                try
                {
                    await _emailSender.SendAsync(dto.Destinatario, assunto, corpoEmailHtml, true, ct);
                }
                catch (Exception emailEx)
                {
                    if (!string.IsNullOrWhiteSpace(dto.WhatsAppFallback))
                    {
                        var mensagemFallback = $"{mensagemFinal}\n\n(Envio por email indisponivel no momento. Segue via WhatsApp.)";
                        await _whatsAppSender.SendAsync(dto.WhatsAppFallback, mensagemFallback, ct);
                        meioEnvioFinal = "EMAIL_FALLBACK_WHATSAPP";
                        erroEnvio = $"Fallback aplicado apos falha no email: {emailEx.Message}";
                    }
                    else
                    {
                        throw;
                    }
                }
            }
            else
            {
                if (string.IsNullOrWhiteSpace(dto.Destinatario))
                {
                    throw new InvalidOperationException("Numero de WhatsApp nao informado.");
                }

                await _whatsAppSender.SendAsync(dto.Destinatario, mensagemFinal, ct);
                meioEnvioFinal = MeioEnvioOrcamento.WhatsApp;
            }
        }
        catch (Exception ex)
        {
            statusEnvio = "FALHA";
            erroEnvio = ex.Message;
        }

        var historico = new HistoricoOrcamento
        {
            Id = Guid.NewGuid(),
            OrcamentoId = id,
            DataEnvio = DateTime.UtcNow,
            MeioEnvio = meioEnvioFinal,
            Status = statusEnvio,
            Destinatario = dto.Destinatario,
            Mensagem = string.IsNullOrWhiteSpace(erroEnvio) ? mensagemFinal : $"{mensagemFinal}\nERRO: {erroEnvio}"
        };

        entity.Status = statusEnvio == "ENVIADO" ? OrcamentoStatus.Enviado : entity.Status;
        entity.DataAtualizacao = DateTime.UtcNow;
        _dbContext.HistoricoOrcamentos.Add(historico);
        await _dbContext.SaveChangesAsync(ct);

        if (statusEnvio == "FALHA")
        {
            throw new InvalidOperationException($"Falha no envio: {erroEnvio}");
        }
    }

    public async Task RegistrarVisualizacaoAsync(string token, string? ipHash, string? userAgent, string? origem, CancellationToken ct)
    {
        var entity = await _dbContext.Orcamentos.FirstOrDefaultAsync(x => x.PublicToken == token && x.IsPublicado, ct);
        if (entity is null)
        {
            return;
        }

        var visualizacao = new OrcamentoVisualizacao
        {
            Id = Guid.NewGuid(),
            OrcamentoId = entity.Id,
            DataVisualizacao = DateTime.UtcNow,
            IpHash = ipHash,
            UserAgent = userAgent,
            Origem = origem
        };

        _dbContext.OrcamentoVisualizacoes.Add(visualizacao);
        await _dbContext.SaveChangesAsync(ct);
    }

    public async Task<OrcamentoDto?> ObterPorTokenAsync(string token, CancellationToken ct)
    {
        var entity = await _dbContext.Orcamentos
            .AsNoTracking()
            .Include(x => x.Imagens)
            .FirstOrDefaultAsync(x => x.PublicToken == token && x.IsPublicado, ct);

        return entity is null ? null : Map(entity);
    }

    private static string GerarTokenSeguro()
    {
        Span<byte> random = stackalloc byte[24];
        RandomNumberGenerator.Fill(random);
        return Convert.ToBase64String(random).Replace('+', '-').Replace('/', '_').TrimEnd('=');
    }

    private static decimal? CalcularParcela(decimal valorTotal, int? qtdParcelas, decimal? valorParcelaInformado)
    {
        if (qtdParcelas.HasValue && qtdParcelas.Value > 0)
        {
            return Math.Round(valorTotal / qtdParcelas.Value, 2, MidpointRounding.AwayFromZero);
        }

        return valorParcelaInformado;
    }

        private static string MontarEmailHtml(Orcamento orcamento, string linkPublico, string mensagem)
        {
                var cultura = new CultureInfo("pt-BR");
                var valor = string.Format(cultura, "{0:C}", orcamento.ValorTotal);
                var datas = $"{orcamento.DataInicio:dd/MM/yyyy} a {orcamento.DataFim:dd/MM/yyyy}";

                return $@"<!doctype html>
<html lang='pt-BR'>
<head>
    <meta charset='utf-8' />
    <meta name='viewport' content='width=device-width, initial-scale=1.0' />
    <title>{orcamento.Titulo}</title>
</head>
<body style='margin:0;padding:0;background:#f3f6fb;font-family:Segoe UI,Arial,sans-serif;color:#1f2937;'>
    <table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='padding:24px 12px;'>
        <tr>
            <td align='center'>
                <table role='presentation' width='680' cellspacing='0' cellpadding='0' style='max-width:680px;background:#ffffff;border-radius:14px;overflow:hidden;'>
                    <tr>
                        <td style='background:#0f766e;padding:24px;color:#ffffff;'>
                            <h1 style='margin:0;font-size:24px;'>ARAME TURISMO</h1>
                            <p style='margin:8px 0 0 0;font-size:14px;'>Seu orcamento personalizado esta pronto</p>
                        </td>
                    </tr>
                    <tr>
                        <td style='padding:24px;'>
                            <h2 style='margin:0 0 8px 0;font-size:20px;color:#0f172a;'>{orcamento.Titulo}</h2>
                            <p style='margin:0 0 16px 0;font-size:14px;color:#334155;'>{mensagem}</p>

                            <table role='presentation' width='100%' cellspacing='0' cellpadding='0' style='margin-bottom:16px;'>
                                <tr>
                                    <td style='padding:10px;background:#f8fafc;border:1px solid #e2e8f0;'>Destino</td>
                                    <td style='padding:10px;background:#f8fafc;border:1px solid #e2e8f0;'><strong>{orcamento.Destino}</strong></td>
                                </tr>
                                <tr>
                                    <td style='padding:10px;background:#f8fafc;border:1px solid #e2e8f0;'>Hotel</td>
                                    <td style='padding:10px;background:#f8fafc;border:1px solid #e2e8f0;'>{orcamento.Hotel ?? "Nao informado"}</td>
                                </tr>
                                <tr>
                                    <td style='padding:10px;background:#f8fafc;border:1px solid #e2e8f0;'>Datas</td>
                                    <td style='padding:10px;background:#f8fafc;border:1px solid #e2e8f0;'>{datas}</td>
                                </tr>
                                <tr>
                                    <td style='padding:10px;background:#f8fafc;border:1px solid #e2e8f0;'>Pessoas</td>
                                    <td style='padding:10px;background:#f8fafc;border:1px solid #e2e8f0;'>{orcamento.NumeroPessoas}</td>
                                </tr>
                                <tr>
                                    <td style='padding:10px;background:#f8fafc;border:1px solid #e2e8f0;'>Valor total</td>
                                    <td style='padding:10px;background:#f8fafc;border:1px solid #e2e8f0;'><strong>{valor}</strong></td>
                                </tr>
                                <tr>
                                    <td style='padding:10px;background:#f8fafc;border:1px solid #e2e8f0;'>Pagamento</td>
                                    <td style='padding:10px;background:#f8fafc;border:1px solid #e2e8f0;'>{orcamento.FormaPagamento ?? "A combinar"}</td>
                                </tr>
                            </table>

                            <a href='{linkPublico}' style='display:inline-block;padding:12px 18px;background:#0f766e;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;'>Ver orcamento completo</a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
        }

    private static OrcamentoDto Map(Orcamento x)
    {
        var destaques = new List<string>();
        if (!string.IsNullOrWhiteSpace(x.Destaques))
        {
            destaques = JsonSerializer.Deserialize<List<string>>(x.Destaques, JsonOptions) ?? new List<string>();
        }

        return new OrcamentoDto
        {
            Id = x.Id,
            PropostaId = x.PropostaId,
            Versao = x.Versao,
            Titulo = x.Titulo,
            Destino = x.Destino,
            TemAereo = x.TemAereo,
            CompanhiaAerea = x.CompanhiaAerea,
            HorarioVooIda = x.HorarioVooIda,
            HorarioVooVolta = x.HorarioVooVolta,
            AeroportoIda = x.AeroportoIda,
            AeroportoVolta = x.AeroportoVolta,
            Hotel = x.Hotel,
            DescricaoDestino = x.DescricaoDestino,
            DescricaoHotel = x.DescricaoHotel,
            Roteiro = x.Roteiro,
            Destaques = destaques,
            DataInicio = x.DataInicio,
            DataFim = x.DataFim,
            NumeroPessoas = x.NumeroPessoas,
            ValorTotal = x.ValorTotal,
            QtdParcelasCartao = x.QtdParcelasCartao,
            ValorParcelaCartao = x.ValorParcelaCartao,
            ValorPix = x.ValorPix,
            LinkPropostaFornecedor = x.LinkPropostaFornecedor,
            Moeda = x.Moeda,
            FormaPagamento = x.FormaPagamento,
            Observacoes = x.Observacoes,
            Condicoes = x.Condicoes,
            Status = x.Status,
            IsPublicado = x.IsPublicado,
            PublicToken = x.PublicToken,
            DataCriacao = x.DataCriacao,
            DataAtualizacao = x.DataAtualizacao,
            Imagens = x.Imagens.Select(i => new OrcamentoImagemDto(i.Url, i.Legenda, i.Ordem, i.Tipo)).ToList()
        };
    }
}
