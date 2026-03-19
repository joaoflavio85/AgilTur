const jwt = require('jsonwebtoken');
const { setTenantId } = require('../config/tenant-context');

/**
 * Middleware de autenticação JWT
 * Verifica se o token é válido e injeta os dados do usuário na requisição
 */
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Em modo SaaS por subdominio, impede reutilizar token entre tenants.
    if (req.tenant?.id && decoded?.tenantId && Number(req.tenant.id) !== Number(decoded.tenantId)) {
      return res.status(403).json({ error: 'Token nao pertence ao tenant do subdominio atual.' });
    }

    if (!req.tenant?.id && decoded?.tenantId) {
      req.tenant = {
        id: Number(decoded.tenantId),
        subdominio: decoded.tenantSubdominio || null,
      };
    }

    if (req.tenant?.id) {
      setTenantId(req.tenant.id);
    }

    req.usuario = decoded; // { id, nome, email, perfil }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Faça login novamente.' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

/**
 * Middleware de autorização por perfil
 * Uso: authorize('ADMIN') ou authorize('ADMIN', 'AGENTE')
 */
const authorize = (...perfis) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    if (!perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({ error: 'Acesso negado. Permissão insuficiente.' });
    }

    next();
  };
};

module.exports = { authMiddleware, authorize };
