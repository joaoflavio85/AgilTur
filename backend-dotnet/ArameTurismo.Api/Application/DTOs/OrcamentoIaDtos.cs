namespace ArameTurismo.Api.Application.DTOs;

public class OrcamentoIaInputDto
{
    public string PalavrasChave { get; set; } = string.Empty;
    public string? ContextoCliente { get; set; }
    public string? ApiKey { get; set; }
    public string? Modelo { get; set; }
    public decimal? Temperatura { get; set; }
    public string? PromptSistema { get; set; }
}

public class OrcamentoIaOutputDto
{
    public string Titulo { get; set; } = string.Empty;
    public string DescricaoDestino { get; set; } = string.Empty;
    public string DescricaoHotel { get; set; } = string.Empty;
    public string Roteiro { get; set; } = string.Empty;
    public List<string> Destaques { get; set; } = new();
    public List<string> ImagensSugeridas { get; set; } = new();
}
