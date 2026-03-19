using System.Globalization;
using ArameTurismo.Api.Application.Interfaces;
using ArameTurismo.Api.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;
using QuestPDF.Drawing;

namespace ArameTurismo.Api.Infrastructure.Services;

public class QuestPdfOrcamentoPdfService(AppDbContext dbContext) : IOrcamentoPdfService
{
    private readonly AppDbContext _dbContext = dbContext;
    private static readonly HttpClient Http = new();

    public async Task<byte[]> GerarPdfAsync(Guid orcamentoId, OrcamentoPdfContext context, CancellationToken ct)
    {
        var orcamento = await _dbContext.Orcamentos
            .AsNoTracking()
            .Include(x => x.Imagens)
            .FirstOrDefaultAsync(x => x.Id == orcamentoId, ct);

        if (orcamento is null)
        {
            throw new KeyNotFoundException("Orcamento nao encontrado.");
        }

        var cultura = new CultureInfo("pt-BR");
        var valor = string.Format(cultura, "{0:C}", orcamento.ValorTotal);
        var periodo = $"{orcamento.DataInicio:dd/MM/yyyy} a {orcamento.DataFim:dd/MM/yyyy}";
        var empresaNome = string.IsNullOrWhiteSpace(context.EmpresaNome) ? "ARAME TURISMO" : context.EmpresaNome;
        var clienteNome = string.IsNullOrWhiteSpace(context.ClienteNome) ? "Nao informado" : context.ClienteNome;
        var clienteEmail = string.IsNullOrWhiteSpace(context.ClienteEmail) ? "Nao informado" : context.ClienteEmail;
        var clienteTelefone = string.IsNullOrWhiteSpace(context.ClienteTelefone) ? "Nao informado" : context.ClienteTelefone;
        byte[]? logoBytes = await BaixarLogoAsync(context.EmpresaLogoUrl, ct);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Margin(35);
                page.Size(PageSizes.A4);
                page.DefaultTextStyle(x => x.FontSize(11));

                page.Header().Column(col =>
                {
                    col.Item().Background("#0F2F5C").Padding(16).Row(row =>
                    {
                        row.RelativeItem().Column(info =>
                        {
                            info.Item().Text(empresaNome).FontColor(Colors.White).SemiBold().FontSize(18);
                            info.Item().Text("PROPOSTA COMERCIAL").FontColor("#BFDBFE").FontSize(10);
                        });

                        if (logoBytes is not null)
                        {
                            row.ConstantItem(120).Height(40).AlignRight().Image(logoBytes).FitHeight();
                        }
                    });

                    col.Item().Border(1).BorderColor("#CBD5E1").Padding(12).Column(info =>
                    {
                        info.Item().Text(orcamento.Titulo).Bold().FontSize(14);
                        info.Item().Text($"Destino: {orcamento.Destino}");
                        info.Item().Text($"Periodo: {periodo}");
                    });
                });

                page.Content().PaddingVertical(15).Column(col =>
                {
                    col.Spacing(10);

                    col.Item().Border(1).BorderColor("#E2E8F0").Padding(12).Column(section =>
                    {
                        section.Item().Text("Dados do cliente").SemiBold().FontColor("#1E293B");
                        section.Item().Text($"Nome: {clienteNome}");
                        section.Item().Text($"Email: {clienteEmail}");
                        section.Item().Text($"Telefone: {clienteTelefone}");
                    });

                    col.Item().Border(1).BorderColor("#E2E8F0").Padding(12).Column(section =>
                    {
                        section.Spacing(4);
                        section.Item().Text("Resumo comercial").SemiBold().FontColor("#1E293B");
                        section.Item().Row(r =>
                        {
                            r.RelativeItem().Text($"Hotel: {orcamento.Hotel ?? "Nao informado"}");
                            r.RelativeItem().AlignRight().Text($"Pessoas: {orcamento.NumeroPessoas}");
                        });

                        section.Item().LineHorizontal(1).LineColor("#E2E8F0");
                        section.Item().Row(r =>
                        {
                            r.RelativeItem().Text("Valor total").SemiBold();
                            r.RelativeItem().AlignRight().Text(valor).Bold().FontColor("#0F766E");
                        });
                        section.Item().Text($"Parcelas no cartao: {(orcamento.QtdParcelasCartao.HasValue && orcamento.QtdParcelasCartao > 0 ? $"{orcamento.QtdParcelasCartao}x de {string.Format(cultura, "{0:C}", orcamento.ValorParcelaCartao)}" : "Nao informado")}");
                        section.Item().Text($"Valor no PIX: {(orcamento.ValorPix.HasValue ? string.Format(cultura, "{0:C}", orcamento.ValorPix) : "Nao informado")}");
                    });

                    if (orcamento.TemAereo)
                    {
                        col.Item().Border(1).BorderColor("#E2E8F0").Padding(12).Column(section =>
                        {
                            section.Item().Text("Dados aereos").SemiBold().FontColor("#1E293B");
                            section.Item().Text($"Companhia: {orcamento.CompanhiaAerea ?? "Nao informado"}");
                            section.Item().Text($"Voo ida: {orcamento.AeroportoIda ?? "-"} - {orcamento.HorarioVooIda ?? "-"}");
                            section.Item().Text($"Voo volta: {orcamento.AeroportoVolta ?? "-"} - {orcamento.HorarioVooVolta ?? "-"}");
                        });
                    }

                    if (!string.IsNullOrWhiteSpace(orcamento.LinkPropostaFornecedor))
                    {
                        col.Item().Border(1).BorderColor("#E2E8F0").Padding(12).Column(section =>
                        {
                            section.Item().Text("Link da proposta do fornecedor").SemiBold().FontColor("#1E293B");
                            section.Item().Text(orcamento.LinkPropostaFornecedor).FontColor("#1D4ED8");
                        });
                    }

                    col.Item().Border(1).BorderColor("#E2E8F0").Padding(12).Column(section =>
                    {
                        section.Item().Text("Descricao do destino").SemiBold().FontColor("#1E293B");
                        section.Item().Text(orcamento.DescricaoDestino ?? "Sem descricao.");
                    });

                });

                page.Footer().Column(col =>
                {
                    col.Item().LineHorizontal(1).LineColor("#CBD5E1");
                    col.Item().PaddingTop(4).AlignCenter().Text("Documento comercial gerado automaticamente").FontSize(9).FontColor("#475569");
                    col.Item().AlignCenter().Text("Valores Sugeitos a alteracao sem aviso previo").FontSize(9).SemiBold().FontColor("#B91C1C");
                });
            });
        });

        return document.GeneratePdf();
    }

    private static async Task<byte[]?> BaixarLogoAsync(string? logoUrl, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(logoUrl))
        {
            return null;
        }

        try
        {
            return await Http.GetByteArrayAsync(logoUrl, ct);
        }
        catch
        {
            return null;
        }
    }
}
