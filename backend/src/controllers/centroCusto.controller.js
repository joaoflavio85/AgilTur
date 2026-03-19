const { z } = require('zod');
const centroCustoService = require('../services/centroCusto.service');

const centroSchema = z.object({
  descricao: z.string().min(2, 'Descricao deve ter no minimo 2 caracteres.'),
  ativo: z.boolean().optional(),
});

/**
 * Controller de Centros de Custo
 */
class CentroCustoController {
  async listar(req, res, next) {
    try {
      const { ativo } = req.query;
      const ativoBool =
        ativo === undefined
          ? undefined
          : String(ativo).toLowerCase() === 'true';

      const centros = await centroCustoService.listar({ ativo: ativoBool });
      res.json(centros);
    } catch (error) {
      next(error);
    }
  }

  async buscarPorId(req, res, next) {
    try {
      const centro = await centroCustoService.buscarPorId(req.params.id);
      res.json(centro);
    } catch (error) {
      next(error);
    }
  }

  async criar(req, res, next) {
    try {
      const data = centroSchema.parse(req.body);
      const centro = await centroCustoService.criar(data);
      res.status(201).json(centro);
    } catch (error) {
      next(error);
    }
  }

  async atualizar(req, res, next) {
    try {
      const data = centroSchema.partial().parse(req.body);
      const centro = await centroCustoService.atualizar(req.params.id, data);
      res.json(centro);
    } catch (error) {
      next(error);
    }
  }

  async excluir(req, res, next) {
    try {
      await centroCustoService.excluir(req.params.id);
      res.json({ message: 'Centro de custo excluido com sucesso.' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CentroCustoController();
