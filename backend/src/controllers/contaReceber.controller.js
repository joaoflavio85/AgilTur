const { z } = require('zod');
const contaReceberService = require('../services/contaReceber.service');

const contaSchema = z.object({
  vendaId: z.number().or(z.string().transform(Number)),
  valor: z.number().or(z.string().transform(Number)),
  formaPagamento: z.enum(['CARTAO', 'BOLETO', 'PIX', 'OPERADORA']).optional().nullable(),
  origem: z.enum(['MANUAL', 'COMISSAO', 'ASAAS_BOLETO']).optional(),
  dataVencimento: z.string(),
  dataPagamento: z.string().optional().nullable(),
  status: z.enum(['PENDENTE', 'PAGO', 'ATRASADO']).optional(),
});

/**
 * Controller de Contas a Receber
 */
class ContaReceberController {
  async listar(req, res, next) {
    try {
      const {
        status,
        vendaId,
        origem,
        formaPagamento,
        clienteId,
        clienteNome,
        operadoraId,
        dataVencimentoInicio,
        dataVencimentoFim,
      } = req.query;
      const contas = await contaReceberService.listar(
        {
          status,
          vendaId,
          origem,
          formaPagamento,
          clienteId,
          clienteNome,
          operadoraId,
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
      const conta = await contaReceberService.buscarPorId(req.params.id, req.usuario);
      res.json(conta);
    } catch (error) { next(error); }
  }

  async criar(req, res, next) {
    try {
      const data = contaSchema.parse(req.body);
      const conta = await contaReceberService.criar(data, req.usuario);
      res.status(201).json(conta);
    } catch (error) { next(error); }
  }

  async atualizar(req, res, next) {
    try {
      const data = contaSchema.partial().parse(req.body);
      const conta = await contaReceberService.atualizar(req.params.id, data, req.usuario);
      res.json(conta);
    } catch (error) { next(error); }
  }

  async registrarPagamento(req, res, next) {
    try {
      const conta = await contaReceberService.registrarPagamento(req.params.id, req.usuario);
      res.json(conta);
    } catch (error) { next(error); }
  }

  async excluir(req, res, next) {
    try {
      await contaReceberService.excluir(req.params.id, req.usuario);
      res.json({ message: 'Conta a receber excluída com sucesso.' });
    } catch (error) { next(error); }
  }

  async gerarBoletoAsaas(req, res, next) {
    try {
      const resultado = await contaReceberService.gerarBoletoAsaas(req.params.id, req.usuario);
      res.json(resultado);
    } catch (error) { next(error); }
  }

  async webhookAsaas(req, res, next) {
    try {
      const resultado = await contaReceberService.processarWebhookAsaas(req.body, req.headers);
      res.json(resultado);
    } catch (error) { next(error); }
  }
}

module.exports = new ContaReceberController();
