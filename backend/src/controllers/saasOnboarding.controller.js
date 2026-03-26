const { z } = require('zod');
const empresaRepository = require('../repositories/empresa.repository');

const payloadSchema = z.object({
  razaoSocial: z.string().min(2, 'Razao social obrigatoria.'),
  nomeFantasia: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  telefone: z.string().optional().nullable(),
  subdominio: z.string().regex(/^[a-z0-9-]{3,40}$/, 'Subdominio invalido.'),
  plano: z.enum(['START', 'PRO', 'ENTERPRISE']).optional().default('START'),
  observacoes: z.string().optional().nullable(),
});

const sanitize = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

class SaasOnboardingController {
  async criarTenant(req, res, next) {
    try {
      const expectedKey = String(process.env.SAAS_ONBOARDING_API_KEY || '').trim();
      const providedKey = String(req.headers['x-saas-api-key'] || '').trim();

      if (!expectedKey) {
        return res.status(503).json({ error: 'Integracao de onboarding nao configurada no servidor.' });
      }

      if (!providedKey || providedKey !== expectedKey) {
        return res.status(401).json({ error: 'Chave de onboarding invalida.' });
      }

      const parsed = payloadSchema.parse(req.body || {});

      const existente = await empresaRepository.findBySubdominioAnyStatus(parsed.subdominio);
      if (existente) {
        return res.status(409).json({ error: 'Subdominio ja cadastrado no backend principal.' });
      }

      const empresaCriada = await empresaRepository.createTenant({
        razaoSocial: parsed.razaoSocial.trim(),
        nomeFantasia: sanitize(parsed.nomeFantasia),
        email: sanitize(parsed.email),
        telefone: sanitize(parsed.telefone),
        subdominio: parsed.subdominio.trim(),
      });

      return res.status(201).json({
        mensagem: 'Tenant criado no backend principal com sucesso.',
        tenant: {
          id: empresaCriada.id,
          razaoSocial: empresaCriada.razaoSocial,
          nomeFantasia: empresaCriada.nomeFantasia,
          subdominio: empresaCriada.subdominio,
          plano: parsed.plano,
          observacoes: sanitize(parsed.observacoes),
          criadoEm: empresaCriada.dataCriacao,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
}

module.exports = new SaasOnboardingController();
