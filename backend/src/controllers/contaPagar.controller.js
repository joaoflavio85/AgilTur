const { z } = require('zod');
const contaPagarService = require('../services/contaPagar.service');

const contaSchema = z.object({
  centroCustoId: z.coerce.number().int().positive('Centro de custo obrigatorio.'),
  descricao: z.string().min(1, 'Descrição obrigatória.'),
  fornecedor: z.string().min(1, 'Fornecedor obrigatório.'),
  valor: z.number().or(z.string().transform(Number)),
  dataVencimento: z.string(),
  dataPagamento: z.string().optional().nullable(),
  status: z.enum(['PENDENTE', 'PAGO', 'ATRASADO']).optional(),
});

/**
 * Controller de Contas a Pagar
 */
class ContaPagarController {
  async listar(req, res, next) {
    try {
      const { status, centroCustoId, dataVencimentoInicio, dataVencimentoFim } = req.query;
      const contas = await contaPagarService.listar(
        {
          status,
          centroCustoId,
          dataVencimentoInicio,
          dataVencimentoFim,
        },
        req.usuario,
      );
      res.json(contas);
    } catch (error) { next(error); }
  }

  async buscarPorId(req, res, next) {
    try {
      const conta = await contaPagarService.buscarPorId(req.params.id, req.usuario);
      res.json(conta);
    } catch (error) { next(error); }
  }

  async criar(req, res, next) {
    try {
      const data = contaSchema.parse(req.body);
      const conta = await contaPagarService.criar(data, req.usuario);
      res.status(201).json(conta);
    } catch (error) { next(error); }
  }

  async atualizar(req, res, next) {
    try {
      const data = contaSchema.partial().parse(req.body);
      const conta = await contaPagarService.atualizar(req.params.id, data, req.usuario);
      res.json(conta);
    } catch (error) { next(error); }
  }

  async registrarPagamento(req, res, next) {
    try {
      const conta = await contaPagarService.registrarPagamento(req.params.id, req.usuario);
      res.json(conta);
    } catch (error) { next(error); }
  }

  async excluir(req, res, next) {
    try {
      await contaPagarService.excluir(req.params.id, req.usuario);
      res.json({ message: 'Conta a pagar excluída com sucesso.' });
    } catch (error) { next(error); }
  }
}

module.exports = new ContaPagarController();
