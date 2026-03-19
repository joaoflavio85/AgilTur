# Modulo de Orcamentos Inteligentes - ARAME TURISMO

Este diretorio contem um esqueleto funcional em .NET 8 para o modulo de Orcamentos Inteligentes integrado ao CRM.

## Estrutura criada

- ArameTurismo.Api/Domain/Entities: modelos de dominio (Proposta, Orcamento, Historico e Visualizacao).
- ArameTurismo.Api/Application/DTOs: contratos de entrada e saida.
- ArameTurismo.Api/Application/Interfaces: interfaces de servicos.
- ArameTurismo.Api/Infrastructure/Data/AppDbContext.cs: mapeamento EF Core para SQL Server.
- ArameTurismo.Api/Infrastructure/Services:
  - OrcamentoService.cs: CRUD, duplicacao, publicacao, historico e visualizacao.
  - OpenAiOrcamentoIaService.cs: geracao com IA (OpenAI) com fallback local.
  - QuestPdfOrcamentoPdfService.cs: geracao de PDF.
- ArameTurismo.Api/Controllers:
  - OrcamentosController.cs: endpoints internos CRM.
  - OrcamentoPublicoController.cs: link publico (HTML/JSON) e tracking.
- ArameTurismo.Api/Sql/create_orcamentos_module.sql: script SQL completo.
- ArameTurismo.Api/Templates/orcamento-template.html: template visual base.

## Endpoints principais

- POST /api/propostas/{propostaId}/orcamentos
- GET /api/propostas/{propostaId}/orcamentos
- GET /api/orcamentos/{id}
- PUT /api/orcamentos/{id}
- POST /api/orcamentos/{id}/duplicar
- POST /api/orcamentos/{id}/publicar
- POST /api/orcamentos/{id}/enviar
- GET /api/orcamentos/{id}/pdf
- POST /api/orcamentos/gerar-com-ia
- GET /o/{token}
- GET /api/public/orcamentos/{token}

## Configuracao

1. Ajuste a conexao SQL Server em appsettings.json.
2. Configure OpenAI.ApiKey em appsettings.Development.json ou variavel de ambiente.
3. Execute migracoes ou rode o script SQL em ArameTurismo.Api/Sql/create_orcamentos_module.sql.

## Build e execucao

- dotnet build backend-dotnet/ArameTurismo.sln
- dotnet run --project backend-dotnet/ArameTurismo.Api/ArameTurismo.Api.csproj

## Migration aplicada (ambiente local)

- A migration `InitialOrcamentosModule` foi criada e aplicada em `arame_turismo_dev` via SQLEXPRESS.
- Comando utilizado para update:
  - dotnet ef database update --project backend-dotnet/ArameTurismo.Api/ArameTurismo.Api.csproj --startup-project backend-dotnet/ArameTurismo.Api/ArameTurismo.Api.csproj --connection "Server=localhost\\SQLEXPRESS;Database=arame_turismo_dev;Integrated Security=True;TrustServerCertificate=True;"

## Credenciais reais (User Secrets)

- O projeto foi preparado com User Secrets.
- Script utilitario:
  - backend-dotnet/configure-secrets.ps1
- Exemplo de uso:
  - ./backend-dotnet/configure-secrets.ps1 -TwilioAccountSid "..." -TwilioAuthToken "..." -TwilioWhatsAppFrom "whatsapp:+55..." -SmtpHost "smtp.seudominio.com" -SmtpPort 587 -SmtpUsername "..." -SmtpPassword "..." -SmtpFromEmail "comercial@arame.com" -SmtpFromName "ARAME TURISMO"

## Envio com template HTML e fallback

- Endpoint de envio: `POST /api/orcamentos/{id}/enviar`
- Para envio por Email com fallback em WhatsApp, enviar payload com:
  - `meioEnvio = "EMAIL"`
  - `destinatario = "email@cliente.com"`
  - `whatsAppFallback = "whatsapp:+55..."` (opcional)
- Em caso de falha no email e fallback informado, o sistema tenta WhatsApp automaticamente e registra em historico como `EMAIL_FALLBACK_WHATSAPP`.

## Scaffold frontend

Foram adicionados arquivos base em frontend/src/features/orcamentos para acelerar a implementacao das telas:

- pages/PropostaOrcamentosPage.jsx
- components/OrcamentoEditor.jsx
- components/OrcamentoPreview.jsx
- services/orcamentosApi.js
- templates/whatsappTemplate.js

Esses arquivos sao um ponto de partida e podem ser integrados ao roteamento existente do frontend atual.
