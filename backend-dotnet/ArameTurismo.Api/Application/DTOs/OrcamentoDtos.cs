namespace ArameTurismo.Api.Application.DTOs;

public record OrcamentoImagemDto(string Url, string? Legenda, int Ordem, string Tipo);

public class CriarOrcamentoDto
{
    public string Titulo { get; set; } = string.Empty;
    public string Destino { get; set; } = string.Empty;
    public bool TemAereo { get; set; }
    public string? CompanhiaAerea { get; set; }
    public string? HorarioVooIda { get; set; }
    public string? HorarioVooVolta { get; set; }
    public string? AeroportoIda { get; set; }
    public string? AeroportoVolta { get; set; }
    public string? Hotel { get; set; }
    public string? DescricaoDestino { get; set; }
    public string? DescricaoHotel { get; set; }
    public string? Roteiro { get; set; }
    public List<string>? Destaques { get; set; }
    public DateOnly? DataInicio { get; set; }
    public DateOnly? DataFim { get; set; }
    public int NumeroPessoas { get; set; }
    public decimal ValorTotal { get; set; }
    public int? QtdParcelasCartao { get; set; }
    public decimal? ValorParcelaCartao { get; set; }
    public decimal? ValorPix { get; set; }
    public string? LinkPropostaFornecedor { get; set; }
    public string? FormaPagamento { get; set; }
    public string? Observacoes { get; set; }
    public string? Condicoes { get; set; }
    public List<OrcamentoImagemDto> Imagens { get; set; } = new();
}

public class AtualizarOrcamentoDto : CriarOrcamentoDto
{
    public string Status { get; set; } = "RASCUNHO";
}

public class OrcamentoDto
{
    public Guid Id { get; set; }
    public Guid PropostaId { get; set; }
    public int Versao { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Destino { get; set; } = string.Empty;
    public bool TemAereo { get; set; }
    public string? CompanhiaAerea { get; set; }
    public string? HorarioVooIda { get; set; }
    public string? HorarioVooVolta { get; set; }
    public string? AeroportoIda { get; set; }
    public string? AeroportoVolta { get; set; }
    public string? Hotel { get; set; }
    public string? DescricaoDestino { get; set; }
    public string? DescricaoHotel { get; set; }
    public string? Roteiro { get; set; }
    public List<string> Destaques { get; set; } = new();
    public DateOnly? DataInicio { get; set; }
    public DateOnly? DataFim { get; set; }
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
    public string Status { get; set; } = "RASCUNHO";
    public bool IsPublicado { get; set; }
    public string? PublicToken { get; set; }
    public DateTime DataCriacao { get; set; }
    public DateTime DataAtualizacao { get; set; }
    public List<OrcamentoImagemDto> Imagens { get; set; } = new();
}

public class RegistrarEnvioDto
{
    public string MeioEnvio { get; set; } = "WHATSAPP";
    public string? Destinatario { get; set; }
    public string? Assunto { get; set; }
    public string? Mensagem { get; set; }
    public string? WhatsAppFallback { get; set; }
}
