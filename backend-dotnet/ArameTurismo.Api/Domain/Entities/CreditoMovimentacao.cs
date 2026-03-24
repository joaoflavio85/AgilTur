namespace ArameTurismo.Api.Domain.Entities;

public class CreditoMovimentacao
{
    public Guid Id { get; set; }
    public Guid CreditoId { get; set; }
    public DateTime DataMovimentacao { get; set; } = DateTime.UtcNow;
    public string Tipo { get; set; } = CreditoTipoMovimentacao.Criacao;
    public decimal Valor { get; set; }
    public string? Observacao { get; set; }
    public string? VendaId { get; set; }

    public CreditoCliente? Credito { get; set; }
}
