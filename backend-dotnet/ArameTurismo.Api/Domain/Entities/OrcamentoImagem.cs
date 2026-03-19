namespace ArameTurismo.Api.Domain.Entities;

public class OrcamentoImagem
{
    public Guid Id { get; set; }
    public Guid OrcamentoId { get; set; }
    public string Url { get; set; } = string.Empty;
    public string? Legenda { get; set; }
    public int Ordem { get; set; }
    public string Tipo { get; set; } = "DESTINO";

    public Orcamento? Orcamento { get; set; }
}
