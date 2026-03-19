const { z } = require('zod');
const posVendaService = require('../services/posVenda.service');

const posVendaSchema = z.object({
  vendaId: z.number().or(z.string().transform(Number)),
  tipoAcao: z.enum(['TROCA_RESERVA', 'CANCELAMENTO', 'EMISSAO_VOUCHER', 'ENTREGA_BRINDE', 'CHECKIN_VOO']),
  descricao: z.string().min(1, 'Descrição obrigatória.'),
  dataAcao: z.string().optional(),
  responsavel: z.string().min(1, 'Responsável obrigatório.'),
  status: z.enum(['ABERTO', 'CONCLUIDO']).optional(),
});

/**
 * Controller de Pós-Venda
 */
class PosVendaController {
  async listar(req, res, next) {
    try {
      const { vendaId, clienteId, clienteNome, dataAcaoInicio, dataAcaoFim, status } = req.query;
      const registros = await posVendaService.listar({ vendaId, clienteId, clienteNome, dataAcaoInicio, dataAcaoFim, status });
      res.json(registros);
    } catch (error) { next(error); }
  }

  async buscarPorId(req, res, next) {
    try {
      const registro = await posVendaService.buscarPorId(req.params.id);
      res.json(registro);
    } catch (error) { next(error); }
  }

  async criar(req, res, next) {
    try {
      const data = posVendaSchema.parse(req.body);
      const registro = await posVendaService.criar(data);
      res.status(201).json(registro);
    } catch (error) { next(error); }
  }

  async atualizar(req, res, next) {
    try {
      const data = posVendaSchema.partial().parse(req.body);
      const registro = await posVendaService.atualizar(req.params.id, data);
      res.json(registro);
    } catch (error) { next(error); }
  }

  async excluir(req, res, next) {
    try {
      await posVendaService.excluir(req.params.id);
      res.json({ message: 'Registro de pós-venda excluído com sucesso.' });
    } catch (error) { next(error); }
  }
}

module.exports = new PosVendaController();
