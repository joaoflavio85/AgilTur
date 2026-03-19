namespace ArameTurismo.Api.Domain.Entities;

public class Orcamento
{
    public Guid Id { get; set; }
    public Guid PropostaId { get; set; }
    public int Versao { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Destino { get; set; } = string.Empty;
    public string? Hotel { get; set; }
    public string? DescricaoDestino { get; set; }
    public string? DescricaoHotel { get; set; }
    public string? Roteiro { get; set; }
    public string? Destaques { get; set; }
    public DateOnly? DataInicio { get; set; }
    public DateOnly? DataFim { get; set; }
    public bool TemAereo { get; set; }
    public string? CompanhiaAerea { get; set; }
    public string? HorarioVooIda { get; set; }
    public string? HorarioVooVolta { get; set; }
    public string? AeroportoIda { get; set; }
    public string? AeroportoVolta { get; set; }
    public int NumeroPessoas { get; set; }
    public decimal ValorTotal { get; set; }
    public int? QtdParcelasCartao { get; set; }
    public decimal? ValorParcelaCartao { get; set; }
    public decimal? ValorPix { get; set; }
    public string? LinkPropostaFornecedor { get; set; }
    public string Moeda { get; set; } = "BRL";
    public string? FormaPagamento { get; set; }
    public string? Observacoes { get; set; }
    public string? Condicoes { get; set; }
    public string Status { get; set; } = OrcamentoStatus.Rascunho;
    public bool IsPublicado { get; set; }
    public string? PublicToken { get; set; }
    public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
    public DateTime DataAtualizacao { get; set; } = DateTime.UtcNow;
    public Guid CriadoPorAgenteId { get; set; }

    public Proposta? Proposta { get; set; }
    public ICollection<OrcamentoImagem> Imagens { get; set; } = new List<OrcamentoImagem>();
    public ICollection<HistoricoOrcamento> Historicos { get; set; } = new List<HistoricoOrcamento>();
    public ICollection<OrcamentoVisualizacao> Visualizacoes { get; set; } = new List<OrcamentoVisualizacao>();
}
