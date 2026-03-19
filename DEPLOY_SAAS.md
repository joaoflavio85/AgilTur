# Deploy SaaS por Subdominio (Arame Turismo)

## 1. Objetivo

Disponibilizar o sistema em modo SaaS com acesso por subdominio:

- `https://cliente-a.seudominio.com`
- `https://cliente-b.seudominio.com`

## 2. Pre-requisitos

- Dominio proprio (ex.: `seudominio.com`)
- Servidor Linux (Ubuntu recomendado)
- Node.js LTS
- SQL Server acessivel
- Certificado SSL (Let's Encrypt)

## 3. DNS (Wildcard)

No provedor DNS, crie:

- `A` para raiz: `@ -> IP_DO_SERVIDOR`
- `A` wildcard: `* -> IP_DO_SERVIDOR`

Se usar Cloudflare, mantenha proxied conforme sua estrategia.

## 4. Backend (Node)

No servidor:

```bash
cd /var/www/arame-turismo/backend
npm install
npx prisma generate
npm run start
```

Recomendado usar PM2:

```bash
npm i -g pm2
pm2 start src/server.js --name arame-backend
pm2 save
pm2 startup
```

## 5. Frontend (Vite build)

```bash
cd /var/www/arame-turismo/frontend
npm install
npm run build
```

Publicar conteudo de `dist/` via Nginx/Caddy.

## 6. Nginx (exemplo)

```nginx
server {
  listen 80;
  server_name seudominio.com *.seudominio.com;

  root /var/www/arame-turismo/frontend/dist;
  index index.html;

  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  location / {
    try_files $uri /index.html;
  }
}
```

Depois habilite SSL com Certbot:

```bash
sudo certbot --nginx -d seudominio.com -d '*.seudominio.com'
```

## 7. Caddy (alternativa simples)

```caddy
seudominio.com, *.seudominio.com {
  root * /var/www/arame-turismo/frontend/dist
  file_server

  handle_path /api/* {
    reverse_proxy 127.0.0.1:3001 {
      header_up Host {host}
      header_up X-Forwarded-Host {host}
    }
  }

  try_files {path} /index.html
}
```

## 8. Tenant por subdominio

Ja implementado no backend:

- Resolve tenant por host/subdominio
- Aceita fallback por header `x-tenant-subdomain`
- Token JWT contem `tenantId`
- Bloqueia token de tenant diferente

## 9. Onboarding de novo cliente

1. Criar registro em `Empresa`.
2. Definir `subdominio` unico (ex.: `cliente-a`).
3. Criar usuario ADMIN para esse tenant.
4. Entregar URL: `https://cliente-a.seudominio.com`.

## 10. Teste rapido

- Acesse `https://cliente-a.seudominio.com/login`
- Faça login com usuario do tenant
- Verifique `GET /api/auth/tenant` retornando tenant correto
- Tente token de outro tenant (deve bloquear)

## 11. Observacoes de producao

- Habilitar backup diario do banco
- Monitorar logs de API e Nginx/Caddy
- Rotacionar `JWT_SECRET`
- Definir politicas de senha e auditoria
