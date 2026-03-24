const { z } = require('zod');
const empresaService = require('../services/empresa.service');

const emptyToNull = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const empresaSchema = z.object({
  razaoSocial: z.preprocess(emptyToNull, z.string().min(2, 'Razao social obrigatoria.')),
  nomeFantasia: z.preprocess(emptyToNull, z.string().optional().nullable()),
  cnpj: z.preprocess(emptyToNull, z.string().optional().nullable()),
  subdominio: z.preprocess(emptyToNull, z.string().regex(/^[a-z0-9-]{3,40}$/, 'Subdominio invalido. Use letras, numeros e hifen (3-40).').optional().nullable()),
  email: z.preprocess(emptyToNull, z.string().email().optional().nullable()),
  telefone: z.preprocess(emptyToNull, z.string().optional().nullable()),
  asaasApiKey: z.preprocess(emptyToNull, z.string().optional().nullable()),
  asaasBaseUrl: z.preprocess(emptyToNull, z.string().url().optional().nullable()),
  asaasSandbox: z.boolean().optional(),
  percentualBonificacaoIndicacao: z.number().or(z.string().transform(Number)).optional(),
});

class EmpresaController {
  async obter(req, res, next) {
    try {
      const empresa = await empresaService.obter(req.tenant || null);
      res.json(empresa);
    } catch (error) {
      next(error);
    }
  }

  async salvar(req, res, next) {
    try {
      const data = empresaSchema.parse(req.body || {});
      const empresa = await empresaService.salvar(data, req.usuario, req.tenant || null);
      res.json(empresa);
    } catch (error) {
      next(error);
    }
  }

  async obterLogo(req, res, next) {
    try {
      const logoPath = empresaService.obterLogoPath();
      if (!logoPath) {
        return res.status(404).json({ error: 'Logo nao configurada.' });
      }

      return res.sendFile(logoPath);
    } catch (error) {
      return next(error);
    }
  }

  async uploadLogo(req, res, next) {
    try {
      const resultado = await empresaService.salvarLogo(req.file, req.usuario);
      res.json(resultado);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new EmpresaController();
