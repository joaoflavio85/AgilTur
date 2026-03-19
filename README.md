# ✈️ Aramé Turismo — Sistema de Gestão

Sistema web completo para gerenciamento de agência de viagens.

## Estrutura do Projeto

```
arame-turismo/
├── backend/     → API Node.js + Express + SQL Server
└── frontend/    → React + Vite
```

---

## 🚀 Como rodar o projeto

### Pré-requisitos

- Node.js v18+
- SQL Server (local) rodando na porta 1433
- npm ou yarn

---

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Edite o .env com suas credenciais SQL Server
npx prisma migrate dev --name init
npm run seed
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Scripts na raiz (atalhos)

```bash
npm run dev:backend
npm run dev:frontend
npm run build:frontend
```

---

## Acesso

| Item | Valor |
|------|-------|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api |
| Login Admin | admin@arameturismo.com |
| Senha Admin | 123456 |

---

## Módulos

- **Dashboard** — Visão geral com totais e acesso rápido
- **Clientes** — CRUD com busca
- **Vendas** — CRUD com filtros por status e tipo
- **Contas a Receber** — Com registro de pagamento
- **Contas a Pagar** — Com registro de pagamento
- **Pós-Venda** — Registro de ações pós-venda
- **Agenda** — Viajando hoje + próximas viagens
- **Usuários** — Gestão (somente ADMIN)
- **WhatsApp** — Simulação de envio de mensagens

---

## SaaS por subdominio

O projeto agora tem base para operacao SaaS com acesso por subdominio:

- `https://cliente-a.seudominio.com`
- `https://cliente-b.seudominio.com`

### Como o tenant e identificado

- Prioridade 1: header `x-tenant-subdomain`
- Prioridade 2: host/subdominio da requisicao

### Configuracao

1. Cadastre o `subdominio` na tela `Empresa` (ou API `/api/empresa`).
2. Configure DNS wildcard para `*.seudominio.com`.
3. Configure proxy reverso para encaminhar para frontend/backend mantendo o host.

### Ambiente local

Para testar sem DNS wildcard, no frontend use a variavel:

```env
VITE_TENANT_SUBDOMAIN=cliente-a
```

Isso envia automaticamente o header `x-tenant-subdomain` em todas as chamadas da API.

Guia completo de deploy: `DEPLOY_SAAS.md`.

---

## Credenciais de exemplo

| Usuário | Email | Senha | Perfil |
|---------|-------|-------|--------|
| Admin | admin@arameturismo.com | 123456 | ADMIN |
| Agente | agente@arameturismo.com | 123456 | AGENTE |
