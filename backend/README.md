# Aramé Turismo — Backend

API REST para o sistema de gestão da Agência de Viagens Aramé Turismo.

## Tecnologias

- Node.js + Express
- SQL Server (local)
- Prisma ORM
- JWT + bcryptjs
- Zod (validação)

## Modo SaaS por Subdominio

O backend agora suporta resolucao de tenant por subdominio:

- Exemplo: `cliente1.seudominio.com` -> tenant `cliente1`
- Header alternativo (dev/proxy): `x-tenant-subdomain: cliente1`

### Regras

- O tenant e resolvido em middleware global antes das rotas.
- O login (`/api/auth/login`) gera token com `tenantId`/`tenantSubdominio`.
- Rotas autenticadas bloqueiam token usado em subdominio diferente.

### Cadastro de tenant

Use a tela/rota de `Empresa` para definir o campo `subdominio`.

No SQL, garanta a coluna e indice unico em `empresas.subdominio` (ja incluido em `prisma/create_tables.sql`).

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais do SQL Server:

```env
DATABASE_URL="sqlserver://localhost:1433;database=arame_turismo;user=sa;password=SuaSenha123;trustServerCertificate=true"
JWT_SECRET="seu_secret_aqui"
```

### 3. Criar o banco de dados

No SQL Server Management Studio (SSMS) ou Azure Data Studio, execute:

```sql
CREATE DATABASE arame_turismo;
```

Ou execute o script completo:
```
prisma/create_tables.sql
```

### 4. Executar migrations do Prisma

```bash
npx prisma migrate dev --name init
```

### 5. Popular banco com dados iniciais (seed)

```bash
npm run seed
```

Isso cria:
- Admin: `admin@arameturismo.com` / `123456`
- Agente: `agente@arameturismo.com` / `123456`
- Clientes e vendas de exemplo

### 6. Rodar o servidor

```bash
npm run dev
```

Servidor disponível em: `http://localhost:3001`

---

## Endpoints da API

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/auth/login | Login |
| GET | /api/auth/me | Dados do usuário logado |

### Usuários
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/usuarios | Listar todos |
| GET | /api/usuarios/:id | Buscar por ID |
| POST | /api/usuarios | Criar (ADMIN) |
| PUT | /api/usuarios/:id | Atualizar (ADMIN) |
| DELETE | /api/usuarios/:id | Desativar (ADMIN) |

### Clientes
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/clientes?search= | Listar / Buscar |
| GET | /api/clientes/:id | Buscar por ID |
| POST | /api/clientes | Criar |
| PUT | /api/clientes/:id | Atualizar |
| DELETE | /api/clientes/:id | Excluir |

### Vendas
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/vendas | Listar |
| POST | /api/vendas | Criar |
| PUT | /api/vendas/:id | Atualizar |
| DELETE | /api/vendas/:id | Excluir |

### Contas a Receber
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/contas-receber | Listar |
| POST | /api/contas-receber | Criar |
| PUT | /api/contas-receber/:id | Atualizar |
| PATCH | /api/contas-receber/:id/pagar | Registrar pagamento |
| DELETE | /api/contas-receber/:id | Excluir |

### Contas a Pagar
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/contas-pagar | Listar |
| POST | /api/contas-pagar | Criar |
| PUT | /api/contas-pagar/:id | Atualizar |
| PATCH | /api/contas-pagar/:id/pagar | Registrar pagamento |
| DELETE | /api/contas-pagar/:id | Excluir |

### Pós-Venda
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/pos-venda | Listar |
| POST | /api/pos-venda | Criar |
| PUT | /api/pos-venda/:id | Atualizar |
| DELETE | /api/pos-venda/:id | Excluir |

### Agenda
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/agenda | Clientes viajando hoje e futuros |

### WhatsApp (simulação)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/whatsapp/config | Buscar configuração |
| POST | /api/whatsapp/config | Salvar configuração |
| POST | /api/whatsapp/enviar | Simular envio |

### Relatórios
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/relatorios/dashboard | Resumo do dashboard |
| GET | /api/relatorios/vendas-periodo | Vendas por período |
| GET | /api/relatorios/vendas-por-agente | Vendas por agente |
| GET | /api/relatorios/contas-receber-pendentes | CR pendentes |
| GET | /api/relatorios/contas-pagar-pendentes | CP pendentes |
| GET | /api/relatorios/clientes-em-viagem | Clientes em viagem |

---

## Arquitetura

```
src/
├── controllers/   → Recebe req, retorna res
├── services/      → Regras de negócio
├── repositories/  → Acesso ao banco via Prisma
├── routes/        → Definição das rotas
├── middlewares/   → Auth JWT + tratamento de erros
└── config/        → Configuração do Prisma
```
