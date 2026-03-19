namespace ArameTurismo.Api.Domain.Entities;

public class HistoricoOrcamento
{
    public Guid Id { get; set; }
    public Guid OrcamentoId { get; set; }
    public DateTime DataEnvio { get; set; } = DateTime.UtcNow;
    public string MeioEnvio { get; set; } = MeioEnvioOrcamento.WhatsApp;
    public string Status { get; set; } = "ENVIADO";
    public string? Destinatario { get; set; }
    public string? Mensagem { get; set; }

    public Orcamento? Orcamento { get; set; }
}
