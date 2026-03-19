# Aramé Turismo — Frontend

Interface web do sistema de gestão da Agência Aramé Turismo.

## Tecnologias

- React 18
- Vite
- React Router DOM v6
- Axios
- Context API (autenticação)

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Rodar em desenvolvimento

```bash
npm run dev
```

Frontend disponível em: `http://localhost:5173`

> O Vite já está configurado com proxy para `http://localhost:3001`, então as chamadas `/api/*` são redirecionadas automaticamente para o backend.

### 2.1 Teste local do modo SaaS (subdominio)

Opcionalmente, crie `.env` no frontend com:

```env
VITE_TENANT_SUBDOMAIN=cliente-a
```

Quando definido, o frontend envia `x-tenant-subdomain` automaticamente para a API.

### 3. Build para produção

```bash
npm run build
```

---

## Páginas do Sistema

| Rota | Página |
|------|--------|
| `/login` | Login |
| `/` | Dashboard |
| `/clientes` | Gestão de Clientes |
| `/vendas` | Gestão de Vendas |
| `/contas-receber` | Contas a Receber |
| `/contas-pagar` | Contas a Pagar |
| `/pos-venda` | Pós-Venda |
| `/usuarios` | Gestão de Usuários |
| `/agenda` | Agenda de Viagens |

---

## Estrutura

```
src/
├── pages/      → Uma página por módulo
├── layouts/    → MainLayout (sidebar + navbar)
├── context/    → AuthContext (JWT)
├── services/   → api.js (instância Axios)
└── App.jsx     → Roteamento principal
```
