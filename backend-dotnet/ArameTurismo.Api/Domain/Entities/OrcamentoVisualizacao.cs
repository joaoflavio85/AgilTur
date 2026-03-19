namespace ArameTurismo.Api.Domain.Entities;

public class OrcamentoVisualizacao
{
    public Guid Id { get; set; }
    public Guid OrcamentoId { get; set; }
    public DateTime DataVisualizacao { get; set; } = DateTime.UtcNow;
    public string? IpHash { get; set; }
    public string? UserAgent { get; set; }
    public string? Origem { get; set; }

    public Orcamento? Orcamento { get; set; }
}
