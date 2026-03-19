const { z } = require('zod');
const usuarioService = require('../services/usuario.service');

const criarSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres.'),
  email: z.string().email('Email inválido.'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres.'),
  telefone: z.string().optional(),
  perfil: z.enum(['ADMIN', 'AGENTE']).optional(),
});

const atualizarSchema = criarSchema.partial().omit({ senha: true }).extend({
  senha: z.string().min(6).optional(),
  ativo: z.boolean().optional(),
});

/**
 * Controller de Usuários
 */
class UsuarioController {
  async listar(req, res, next) {
    try {
      const usuarios = await usuarioService.listar();
      res.json(usuarios);
    } catch (error) { next(error); }
  }

  async buscarPorId(req, res, next) {
    try {
      const usuario = await usuarioService.buscarPorId(req.params.id);
      res.json(usuario);
    } catch (error) { next(error); }
  }

  async criar(req, res, next) {
    try {
      const data = criarSchema.parse(req.body);
      const usuario = await usuarioService.criar(data);
      res.status(201).json(usuario);
    } catch (error) { next(error); }
  }

  async atualizar(req, res, next) {
    try {
      const data = atualizarSchema.parse(req.body);
      const usuario = await usuarioService.atualizar(req.params.id, data);
      res.json(usuario);
    } catch (error) { next(error); }
  }

  async desativar(req, res, next) {
    try {
      await usuarioService.desativar(req.params.id);
      res.json({ message: 'Usuário desativado com sucesso.' });
    } catch (error) { next(error); }
  }
}

module.exports = new UsuarioController();
