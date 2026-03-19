namespace ArameTurismo.Api.Domain.Entities;

public class Proposta
{
    public Guid Id { get; set; }
    public Guid ClienteId { get; set; }
    public Guid AgenteId { get; set; }
    public string Status { get; set; } = "ABERTA";
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;

    public ICollection<Orcamento> Orcamentos { get; set; } = new List<Orcamento>();
}
