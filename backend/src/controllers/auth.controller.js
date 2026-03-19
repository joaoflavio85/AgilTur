const { z } = require('zod');
const authService = require('../services/auth.service');

const loginSchema = z.object({
  email: z.string().email('Email inválido.'),
  senha: z.string().min(1, 'Senha obrigatória.'),
});

/**
 * Controller de Autenticação
 */
class AuthController {
  async login(req, res, next) {
    try {
      const { email, senha } = loginSchema.parse(req.body);
      const resultado = await authService.login(email, senha, req.tenant || null);
      return res.json(resultado);
    } catch (error) {
      next(error);
    }
  }

  async me(req, res) {
    return res.json({ usuario: req.usuario, tenant: req.tenant || null });
  }

  async tenant(req, res) {
    return res.json({ tenant: req.tenant || null });
  }
}

module.exports = new AuthController();
