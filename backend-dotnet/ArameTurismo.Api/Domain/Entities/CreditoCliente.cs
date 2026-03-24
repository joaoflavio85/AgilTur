namespace ArameTurismo.Api.Domain.Entities;

public class CreditoCliente
{
    public Guid Id { get; set; }
    public int ClienteId { get; set; }
    public string ClienteNome { get; set; } = string.Empty;
    public string? ClienteTelefone { get; set; }
    public decimal ValorTotal { get; set; }
    public decimal ValorUtilizado { get; set; }
    public DateTime DataGeracao { get; set; }
    public DateTime DataValidade { get; set; }
    public string Status { get; set; } = CreditoStatus.Ativo;
    public string Motivo { get; set; } = string.Empty;
    public string? Observacoes { get; set; }
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
    public DateTime DataAtualizacao { get; set; } = DateTime.UtcNow;

    public ICollection<CreditoMovimentacao> Movimentacoes { get; set; } = new List<CreditoMovimentacao>();
}
