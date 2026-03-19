namespace ArameTurismo.Api.Application.Interfaces;

public class OrcamentoPdfContext
{
    public string? EmpresaNome { get; set; }
    public string? EmpresaLogoUrl { get; set; }
    public string? ClienteNome { get; set; }
    public string? ClienteEmail { get; set; }
    public string? ClienteTelefone { get; set; }
}

public interface IOrcamentoPdfService
{
    Task<byte[]> GerarPdfAsync(Guid orcamentoId, OrcamentoPdfContext context, CancellationToken ct);
}
