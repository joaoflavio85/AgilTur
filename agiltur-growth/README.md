## AGILTUR Growth

Landing page comercial + onboarding SaaS para captacao de novas empresas do AGILTUR.

Funcionalidades principais:
- Landing page de venda do produto.
- Cadastro de nova empresa SaaS em `/nova-empresa`.
- Painel de empresas com filtros em `/empresas`.
- Geracao de proposta comercial em PDF por empresa.
- Integracao opcional com backend principal para criar tenant real.

## Como rodar

1. Instale dependencias:

```bash
npm install
```

2. Crie seu `.env.local` baseado em `.env.example`.

3. Rode em desenvolvimento:

```bash
npm run dev
```

4. Acesse:
- `http://localhost:3000` (landing)
- `http://localhost:3000/nova-empresa` (onboarding)
- `http://localhost:3000/empresas` (painel)

## Integracao com backend principal

Configure no `.env.local`:

```env
NEXT_PUBLIC_BASE_DOMAIN=agencia.local
AGILTUR_CORE_API_URL=http://localhost:3001/api/public/saas/tenants
AGILTUR_CORE_API_KEY=sua-chave
```

- Quando configurado, cada novo cadastro tenta criar o tenant real no backend principal.
- O status da sincronizacao aparece na resposta do cadastro e no painel `/empresas`.

## Endpoint interno

- `GET /api/empresas` lista empresas (aceita `q`, `plano`, `sync`)
- `POST /api/empresas` cria empresa e tenta sincronizar com backend
- `GET /api/empresas/:id/proposta-pdf` gera PDF da proposta comercial

## Build

```bash
npm run lint
npm run build
```

