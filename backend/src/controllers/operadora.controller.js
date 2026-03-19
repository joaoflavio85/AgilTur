const { z } = require('zod');
const operadoraService = require('../services/operadora.service');

const operadoraSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter no minimo 2 caracteres.'),
  cnpj: z.string().max(18, 'CNPJ invalido.').optional().nullable(),
  telefone: z.string().max(20).optional().nullable(),
  email: z.string().email('Email invalido.').optional().nullable(),
  ativo: z.boolean().optional(),
});

/**
 * Controller de Operadoras
 */
class OperadoraController {
  async listar(req, res, next) {
    try {
      const { search } = req.query;
      const operadoras = await operadoraService.listar({ search });
      res.json(operadoras);
    } catch (error) {
      next(error);
    }
  }

  async buscarPorId(req, res, next) {
    try {
      const operadora = await operadoraService.buscarPorId(req.params.id);
      res.json(operadora);
    } catch (error) {
      next(error);
    }
  }

  async criar(req, res, next) {
    try {
      const data = operadoraSchema.parse(req.body);
      const operadora = await operadoraService.criar(data);
      res.status(201).json(operadora);
    } catch (error) {
      next(error);
    }
  }

  async atualizar(req, res, next) {
    try {
      const data = operadoraSchema.partial().parse(req.body);
      const operadora = await operadoraService.atualizar(req.params.id, data);
      res.json(operadora);
    } catch (error) {
      next(error);
    }
  }

  async excluir(req, res, next) {
    try {
      await operadoraService.excluir(req.params.id);
      res.json({ message: 'Operadora excluida com sucesso.' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OperadoraController();
