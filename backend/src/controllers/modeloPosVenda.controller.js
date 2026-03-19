const { z } = require('zod');
const modeloPosVendaService = require('../services/modeloPosVenda.service');

const schema = z.object({
  tipoServico: z.enum(['AEREO', 'HOTEL', 'PACOTE', 'CRUZEIRO', 'RODOVIARIO', 'SEGURO_VIAGEM', 'OUTROS']),
  operadoraId: z.coerce.number().int().positive().optional().nullable(),
  tipoAcao: z.enum(['TROCA_RESERVA', 'CANCELAMENTO', 'EMISSAO_VOUCHER', 'ENTREGA_BRINDE', 'CHECKIN_VOO']),
  descricaoPadrao: z.string().min(1, 'Descricao obrigatoria.').max(1000),
  ordem: z.coerce.number().int().min(1).optional(),
  ativo: z.boolean().optional(),
});

class ModeloPosVendaController {
  async listar(req, res, next) {
    try {
      const { tipoServico, operadoraId, ativo } = req.query;
      const ativoBool = ativo === undefined ? undefined : ativo === 'true';
      const dados = await modeloPosVendaService.listar({ tipoServico, operadoraId, ativo: ativoBool });
      res.json(dados);
    } catch (error) {
      next(error);
    }
  }

  async resolver(req, res, next) {
    try {
      const { tipoServico, operadoraId } = req.query;
      if (!tipoServico) {
        const err = new Error('tipoServico e obrigatorio.');
        err.statusCode = 400;
        throw err;
      }
      const dados = await modeloPosVendaService.resolver({ tipoServico, operadoraId });
      res.json(dados);
    } catch (error) {
      next(error);
    }
  }

  async buscarPorId(req, res, next) {
    try {
      const modelo = await modeloPosVendaService.buscarPorId(req.params.id);
      res.json(modelo);
    } catch (error) {
      next(error);
    }
  }

  async criar(req, res, next) {
    try {
      const data = schema.parse(req.body);
      const modelo = await modeloPosVendaService.criar(data);
      res.status(201).json(modelo);
    } catch (error) {
      next(error);
    }
  }

  async atualizar(req, res, next) {
    try {
      const data = schema.partial().parse(req.body);
      const modelo = await modeloPosVendaService.atualizar(req.params.id, data);
      res.json(modelo);
    } catch (error) {
      next(error);
    }
  }

  async excluir(req, res, next) {
    try {
      await modeloPosVendaService.excluir(req.params.id);
      res.json({ message: 'Modelo de pos-venda excluido com sucesso.' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ModeloPosVendaController();
