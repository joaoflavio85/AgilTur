const empresaRepository = require('../repositories/empresa.repository');

const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const limparHost = (host = '') => String(host).trim().toLowerCase().split(':')[0];

const extrairSubdominio = (req) => {
  const fromHeader = String(req.headers['x-tenant-subdomain'] || '').trim().toLowerCase();
  if (fromHeader) return fromHeader;

  const host = limparHost(req.headers['x-forwarded-host'] || req.headers.host || req.hostname || '');
  if (!host || DEV_HOSTS.has(host)) return null;

  const partes = host.split('.').filter(Boolean);
  if (partes.length < 3) return null;

  return partes[0];
};

const tenantMiddleware = async (req, res, next) => {
  try {
    const subdominio = extrairSubdominio(req);

    if (!subdominio) {
      req.tenant = null;
      return next();
    }

    const empresa = await empresaRepository.findBySubdominio(subdominio);
    if (!empresa) {
      return res.status(404).json({ error: 'Tenant nao encontrado para este subdominio.' });
    }

    if (!empresa.ativo) {
      return res.status(403).json({ error: 'Tenant inativo.' });
    }

    req.tenant = {
      id: empresa.id,
      subdominio: empresa.subdominio,
      razaoSocial: empresa.razaoSocial,
      nomeFantasia: empresa.nomeFantasia,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = tenantMiddleware;
