namespace ArameTurismo.Api.Application.DTOs;

public class CriarCreditoDto
{
    public int ClienteId { get; set; }
    public string ClienteNome { get; set; } = string.Empty;
    public string? ClienteTelefone { get; set; }
    public decimal ValorTotal { get; set; }
    public DateTime DataGeracao { get; set; }
    public DateTime DataValidade { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public string? Observacoes { get; set; }
}

public class AtualizarCreditoDto
{
    public DateTime? DataValidade { get; set; }
    public string? Motivo { get; set; }
    public string? Observacoes { get; set; }
    public string? ClienteTelefone { get; set; }
}

public class UtilizarCreditoDto
{
    public decimal ValorUtilizado { get; set; }
    public DateTime DataUtilizacao { get; set; } = DateTime.UtcNow;
    public string? Observacao { get; set; }
    public string? VendaId { get; set; }
}

public class CreditoMovimentacaoDto
{
    public Guid Id { get; set; }
    public DateTime DataMovimentacao { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public string? Observacao { get; set; }
    public string? VendaId { get; set; }
}

public class CreditoClienteDto
{
    public Guid Id { get; set; }
    public int ClienteId { get; set; }
    public string ClienteNome { get; set; } = string.Empty;
    public string? ClienteTelefone { get; set; }
    public decimal ValorTotal { get; set; }
    public decimal ValorUtilizado { get; set; }
    public decimal SaldoDisponivel { get; set; }
    public DateTime DataGeracao { get; set; }
    public DateTime DataValidade { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Motivo { get; set; } = string.Empty;
    public string? Observacoes { get; set; }
    public int DiasParaVencer { get; set; }
    public string Indicador { get; set; } = "VERDE";
}

public class CreditoDetalheDto : CreditoClienteDto
{
    public IReadOnlyList<CreditoMovimentacaoDto> Historico { get; set; } = [];
}

public class CreditoAlertaItemDto
{
    public Guid Id { get; set; }
    public int ClienteId { get; set; }
    public string ClienteNome { get; set; } = string.Empty;
    public string? ClienteTelefone { get; set; }
    public decimal SaldoDisponivel { get; set; }
    public DateTime DataValidade { get; set; }
    public int DiasParaVencer { get; set; }
}

public class CreditoAlertasDto
{
    public IReadOnlyList<CreditoAlertaItemDto> VencendoEm7Dias { get; set; } = [];
    public IReadOnlyList<CreditoAlertaItemDto> VencendoEm3Dias { get; set; } = [];
    public IReadOnlyList<CreditoAlertaItemDto> VencendoEm1Dia { get; set; } = [];
    public int TotalAtivos { get; set; }
    public int TotalExpirados { get; set; }
    public decimal ValorTotalAtivo { get; set; }
}

public class CreditoDashboardDto
{
    public int TotalAtivos { get; set; }
    public int TotalExpirados { get; set; }
    public int TotalAVencer7Dias { get; set; }
    public decimal ValorAtivo { get; set; }
}
