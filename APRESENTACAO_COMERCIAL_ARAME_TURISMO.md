# Apresentacao Comercial - AGILTUR (SaaS para Agencias de Viagens)

## 1. Visao geral

O AGILTUR e uma plataforma completa para operacao, vendas, financeiro e relacionamento de agencias de viagens.

Proposta de valor:
- Centralizar toda a operacao em um unico sistema.
- Aumentar conversao comercial com controle de propostas e funil.
- Melhorar previsibilidade financeira com contas a pagar/receber e relatorios.
- Escalar no modelo SaaS por subdominio (multiempresa/multitenant).

## 2. Publico-alvo

- Agencias de viagens de pequeno, medio e grande porte.
- Operacoes com equipe comercial, financeiro e pos-venda.
- Empresas que precisam separar dados por marca, unidade ou franquia.

## 3. Dores que o sistema resolve

- Informacoes espalhadas em planilhas e WhatsApp sem historico estruturado.
- Falta de visao do funil comercial e dos motivos de perda.
- Dificuldade para controlar fluxo de caixa da operacao.
- Falta de padronizacao no pos-venda e na comunicacao com o cliente.
- Dificuldade para escalar para varias empresas/unidades com seguranca.

## 4. Funcionalidades completas (inventario de modulos)

### 4.1 Acesso, seguranca e governanca

- Login com JWT.
- Perfis de acesso (ADMIN e AGENTE).
- Protecao de rotas por permissao.
- Auditoria de eventos para rastreabilidade.
- Isolamento por tenant no modo SaaS por subdominio.
- Bloqueio de uso de token em tenant diferente.

### 4.2 Dashboard e indicadores

- Dashboard com resumo operacional e financeiro.
- Visao rapida de indicadores para tomada de decisao.
- Relatorios de apoio para acompanhamento de performance.

### 4.3 CRM e Comercial

- Gestao de Clientes (cadastro, busca, edicao e historico basico).
- Gestao de Operadoras.
- Gestao de Propostas:
  - CRUD de propostas.
  - Funil de propostas.
  - Cadastro e analise de motivos de perda.
  - Fechamento/encerramento de propostas.
- Gestao de Vendas:
  - CRUD de vendas.
  - Vinculo com cliente e proposta.
  - Upload, download e remocao de anexo PDF da venda.

### 4.4 Pos-venda e experiencia do cliente

- Gestao de Pos-venda:
  - Registro de acoes e acompanhamentos.
  - Controle operacional de atividades apos fechamento.
- Modelos de Pos-venda:
  - CRUD de modelos (ADMIN).
  - Resolucao automatica de modelo por contexto (tipo de servico/operadora).
- Agenda de Viagens:
  - Clientes viajando hoje.
  - Proximas viagens.

### 4.5 Financeiro

- Contas a Receber:
  - CRUD completo.
  - Registro de pagamento.
  - Filtros por status, origem, forma de pagamento, cliente, operadora e periodo.
- Contas a Pagar:
  - CRUD completo.
  - Registro de pagamento.
- Centros de Custo:
  - Cadastro e controle administrativo.
- Relatorios financeiros:
  - Contas a receber pendentes.
  - Contas a pagar pendentes.

### 4.6 Integracoes de cobranca e recebimento

- Integracao com Asaas para geracao de boleto em contas a receber.
- Webhook de retorno Asaas para atualizacao de eventos financeiros.
- Configuracao de credenciais por empresa (tenant).

### 4.7 Comunicacao e WhatsApp/ChatBot

- Configuracao de canal de WhatsApp.
- Envio de mensagens.
- Listagem de conversas ativas.
- Integracao com provedor ChatBot:
  - Importacao de contato por numero ou ticket.
  - Sincronizacao de conversas recentes.
  - Envio de mensagem via ChatBot.
  - Endpoint de webhook para eventos recebidos.
- Registro de eventos de comunicacao em auditoria.

### 4.8 Gestao administrativa

- Gestao de usuarios (ADMIN).
- Gestao de dados da empresa (tenant):
  - Informacoes institucionais.
  - Upload de logo.
  - Parametros de integracao (ex.: Asaas).
- Modulo de Auditoria com filtros para compliance e governanca.

### 4.9 Brindes e relacionamento

- Cadastro de brindes.
- Controle de estoque de brindes.
- Registro de entradas e saidas.
- Historico de movimentacoes.

### 4.10 Modulos avancados (expansao comercial)

- Orcamentos Inteligentes (.NET):
  - Criacao e edicao de orcamentos por proposta.
  - Duplicacao e publicacao de versoes.
  - Link publico de visualizacao.
  - Geracao de PDF.
  - Envio com fallback (email para WhatsApp).
  - Geracao assistida por IA (quando configurado).
- Creditos de Clientes (API dedicada):
  - Cadastro, consulta e uso de creditos.
  - Alertas e dashboard de creditos.

## 5. SaaS por dominio/subdominio (diferencial de escala)

O sistema suporta operacao multiempresa com isolamento por tenant:
- Exemplo: cliente-a.seudominio.com e cliente-b.seudominio.com.
- Resolucao por host/subdominio com fallback por header tecnico.
- Estrutura pronta para franquias, grupos e multiplas marcas.

Beneficios:
- Escalabilidade comercial sem duplicar sistema.
- Separacao de dados por cliente/unidade.
- Padrao unico de operacao com governanca central.

## 6. Diferenciais competitivos

- Plataforma unica: comercial + financeiro + pos-venda + comunicacao.
- Governanca nativa: perfis, auditoria e segregacao por tenant.
- Integracao financeira com boleto e webhook.
- Jornada comercial completa: da proposta ao pos-venda.
- Base pronta para IA e automacao de orcamentos.
- Arquitetura moderna web (API + frontend React + opcao de modulos .NET especializados).

## 7. Resultado esperado para o cliente

- Reducao de retrabalho operacional.
- Aumento de controle sobre conversao e desempenho comercial.
- Melhoria do fluxo de caixa e previsibilidade financeira.
- Ganho de qualidade no atendimento e no pos-venda.
- Capacidade de escalar operacao no modelo SaaS com seguranca.

## 8. Modelo de implantacao sugerido

Fase 1 - Kickoff e parametrizacao:
- Cadastro da empresa, usuarios, operadoras e centros de custo.
- Configuracao de dominio/subdominio e acessos.

Fase 2 - Go-live operacional:
- Treinamento das equipes comercial e financeiro.
- Inicio de operacao com propostas, vendas e contas.

Fase 3 - Evolucao:
- Ativacao de integracoes (Asaas, ChatBot, WhatsApp).
- Ativacao de modulos avancados (Orcamentos Inteligentes e Creditos).

## 9. Roteiro curto para apresentacao de vendas (10-15 minutos)

1. Contexto de mercado e dores das agencias.
2. Visao geral da plataforma AGILTUR.
3. Demonstracao do fluxo ponta a ponta:
   - Cliente -> Proposta -> Venda -> Contas -> Pos-venda -> Relatorios.
4. Diferenciais: SaaS por subdominio, auditoria e integracoes.
5. Caso de uso de expansao (multiplas unidades/franquias).
6. Proposta de implantacao e proximos passos.

## 10. Proximos passos comerciais

- Agendar demo guiada com dados reais da agencia.
- Definir escopo inicial (modulos obrigatorios + avancados).
- Planejar cronograma de implantacao e treinamento.
- Formalizar proposta tecnica e comercial.
