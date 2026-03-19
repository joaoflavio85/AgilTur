using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using ArameTurismo.Api.Application.DTOs;
using ArameTurismo.Api.Application.Interfaces;
using ArameTurismo.Api.Infrastructure.Options;
using Microsoft.Extensions.Options;

namespace ArameTurismo.Api.Infrastructure.Services;

public class OpenAiOrcamentoIaService(
    HttpClient httpClient,
    IOptions<OpenAiOptions> openAiOptions,
    ILogger<OpenAiOrcamentoIaService> logger) : IOrcamentoIaService
{
    private readonly HttpClient _httpClient = httpClient;
    private readonly OpenAiOptions _openAiOptions = openAiOptions.Value;
    private readonly ILogger<OpenAiOrcamentoIaService> _logger = logger;

    public async Task<OrcamentoIaOutputDto> GerarAsync(OrcamentoIaInputDto input, CancellationToken ct)
    {
        var apiKey = string.IsNullOrWhiteSpace(input.ApiKey) ? _openAiOptions.ApiKey : input.ApiKey;
        var model = string.IsNullOrWhiteSpace(input.Modelo) ? _openAiOptions.Model : input.Modelo;
        var promptSistema = string.IsNullOrWhiteSpace(input.PromptSistema)
            ? "Voce e consultor de viagens da ARAME TURISMO. Responda SOMENTE JSON valido com as chaves: titulo e descricaoDestino."
            : input.PromptSistema;

        var temperatura = input.Temperatura.HasValue ? (double)input.Temperatura.Value : 0.7;
        temperatura = Math.Clamp(temperatura, 0.0, 2.0);

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("API Key de IA nao configurada na Empresa.");
        }

        try
        {
            _httpClient.BaseAddress = new Uri(_openAiOptions.BaseUrl.TrimEnd('/') + "/");
            _httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
            var promptUsuario = $"Palavras-chave: {input.PalavrasChave}. Contexto cliente: {input.ContextoCliente ?? "nao informado"}.";

            var body = new
            {
                model,
                input = new object[]
                {
                    new { role = "system", content = new[] { new { type = "input_text", text = promptSistema } } },
                    new { role = "user", content = new[] { new { type = "input_text", text = promptUsuario } } }
                },
                temperature = temperatura
            };

            using var request = new HttpRequestMessage(HttpMethod.Post, "responses")
            {
                Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json")
            };

            using var response = await _httpClient.SendAsync(request, ct);
            var responseBody = await response.Content.ReadAsStringAsync(ct);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Falha OpenAI: {StatusCode} - {Body}", response.StatusCode, responseBody);
                var detalhe = ExtrairMensagemErroOpenAi(responseBody);
                var status = (int)response.StatusCode;
                throw new InvalidOperationException($"Falha ao consultar OpenAI ({status}). {detalhe}");
            }

            var texto = ExtrairTextoResposta(responseBody);
            if (string.IsNullOrWhiteSpace(texto))
            {
                throw new InvalidOperationException("OpenAI retornou conteudo vazio.");
            }

            var resultado = JsonSerializer.Deserialize<OrcamentoIaOutputDto>(texto, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (resultado is null)
            {
                throw new InvalidOperationException("Nao foi possivel interpretar o JSON retornado pela OpenAI.");
            }

            return NormalizarSaida(resultado, input.PalavrasChave);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Erro ao gerar conteudo com IA.");
            throw;
        }
    }

    private static OrcamentoIaOutputDto NormalizarSaida(OrcamentoIaOutputDto output, string palavrasChave)
    {
        var baseTitulo = string.IsNullOrWhiteSpace(palavrasChave) ? "Viagem Personalizada" : palavrasChave.Trim();
        output.Titulo = string.IsNullOrWhiteSpace(output.Titulo) ? $"{baseTitulo} - ARAME TURISMO" : output.Titulo;
        output.DescricaoDestino = string.IsNullOrWhiteSpace(output.DescricaoDestino)
            ? $"Experiencia personalizada para {baseTitulo}, com foco em conforto, praticidade e momentos memoraveis."
            : output.DescricaoDestino;

        // O requisito atual da tela pede preencher somente titulo e descricao do destino.
        output.DescricaoHotel = string.Empty;
        output.Roteiro = string.Empty;
        output.Destaques = new List<string>();
        output.ImagensSugeridas = new List<string>();
        return output;
    }

    private static string? ExtrairTextoResposta(string responseBody)
    {
        using var document = JsonDocument.Parse(responseBody);
        var root = document.RootElement;

        if (root.TryGetProperty("output_text", out var outputText) && outputText.ValueKind == JsonValueKind.String)
        {
            return outputText.GetString();
        }

        if (root.TryGetProperty("output", out var outputArray) && outputArray.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in outputArray.EnumerateArray())
            {
                if (!item.TryGetProperty("content", out var content) || content.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                foreach (var contentItem in content.EnumerateArray())
                {
                    if (!contentItem.TryGetProperty("text", out var textElement) || textElement.ValueKind != JsonValueKind.String)
                    {
                        continue;
                    }

                    var text = textElement.GetString();
                    if (!string.IsNullOrWhiteSpace(text))
                    {
                        return text;
                    }
                }
            }
        }

        return null;
    }

    private static string ExtrairMensagemErroOpenAi(string responseBody)
    {
        try
        {
            using var document = JsonDocument.Parse(responseBody);
            var root = document.RootElement;

            if (root.TryGetProperty("error", out var errorElement))
            {
                if (errorElement.ValueKind == JsonValueKind.String)
                {
                    return errorElement.GetString() ?? "Erro desconhecido da OpenAI.";
                }

                if (errorElement.ValueKind == JsonValueKind.Object &&
                    errorElement.TryGetProperty("message", out var messageElement) &&
                    messageElement.ValueKind == JsonValueKind.String)
                {
                    return messageElement.GetString() ?? "Erro desconhecido da OpenAI.";
                }
            }

            if (root.TryGetProperty("message", out var rootMessage) && rootMessage.ValueKind == JsonValueKind.String)
            {
                return rootMessage.GetString() ?? "Erro desconhecido da OpenAI.";
            }

            return "Verifique API Key, modelo e prompt da Empresa.";
        }
        catch
        {
            return "Verifique API Key, modelo e prompt da Empresa.";
        }
    }
}
