const { z } = require('zod');
const vendaService = require('../services/venda.service');

const formasPagamentoSchema = z.object({
  formaPagamento: z.enum(['CARTAO', 'BOLETO', 'PIX', 'OPERADORA']),
  valor: z.number().or(z.string().transform(Number)).refine((v) => Number(v) > 0, 'Valor do pagamento deve ser maior que zero.'),
  dataVencimento: z.string().optional().nullable(),
});

const vendaSchema = z.object({
  clienteId: z.number().or(z.string().transform(Number)),
  clienteIndicadorId: z.number().or(z.string().transform(Number)).optional().nullable(),
  vendaPorIndicacao: z.boolean().optional(),
  operadoraId: z.number().or(z.string().transform(Number)),
  idReserva: z.string().min(1, 'ID da reserva obrigatorio.').max(20, 'ID da reserva deve ter no maximo 20 caracteres.'),
  tipoServico: z.enum(['AEREO', 'HOTEL', 'PACOTE', 'CRUZEIRO', 'RODOVIARIO', 'SEGURO_VIAGEM', 'OUTROS']),
  descricao: z.string().min(1, 'Descrição obrigatória.'),
  observacoes: z.string().optional().nullable(),
  valorTotal: z.number().or(z.string().transform(Number)),
  valorComissao: z.number().or(z.string().transform(Number)).optional(),
  status: z.enum(['ABERTA', 'PAGA', 'CANCELADA']).optional(),
  dataViagemInicio: z.string().optional().nullable(),
  dataViagemFim: z.string().optional().nullable(),
  pagamentos: z.array(formasPagamentoSchema).optional(),
});

/**
 * Controller de Vendas
 */
class VendaController {
  async listar(req, res, next) {
    try {
      const {
        clienteId,
        clienteNome,
        agenteId,
        operadoraId,
        status,
        vendaPorIndicacao,
        tipoServico,
        idReserva,
        dataVendaInicio,
        dataVendaFim,
        page,
        pageSize,
      } = req.query;
      const vendas = await vendaService.listar({
        clienteId,
        clienteNome,
        agenteId,
        operadoraId,
        status,
        vendaPorIndicacao,
        tipoServico,
        idReserva,
        dataVendaInicio,
        dataVendaFim,
        page,
        pageSize,
        usuario: req.usuario,
      });
      res.json(vendas);
    } catch (error) { next(error); }
  }

  async buscarPorId(req, res, next) {
    try {
      const venda = await vendaService.buscarPorId(req.params.id, req.usuario);
      res.json(venda);
    } catch (error) { next(error); }
  }

  async criar(req, res, next) {
    try {
      const data = vendaSchema.parse(req.body);
      const venda = await vendaService.criar({
        ...data,
        agenteId: req.usuario.id,
      }, req.usuario);
      res.status(201).json(venda);
    } catch (error) { next(error); }
  }

  async atualizar(req, res, next) {
    try {
      const data = vendaSchema.partial().parse(req.body);
      const venda = await vendaService.atualizar(req.params.id, data, req.usuario);
      res.json(venda);
    } catch (error) { next(error); }
  }

  async anexarPdf(req, res, next) {
    try {
      const venda = await vendaService.anexarPdf(req.params.id, req.file, req.usuario);
      res.json(venda);
    } catch (error) { next(error); }
  }

  async baixarAnexoPdf(req, res, next) {
    try {
      const { caminhoAbsoluto, nomeArquivo } = await vendaService.obterAnexoPdf(req.params.id, req.usuario);
      const safeName = String(nomeArquivo || 'anexo.pdf').replace(/[\r\n"]/g, '');
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
      res.sendFile(caminhoAbsoluto);
    } catch (error) { next(error); }
  }

  async removerAnexoPdf(req, res, next) {
    try {
      const venda = await vendaService.removerAnexoPdf(req.params.id, req.usuario);
      res.json(venda);
    } catch (error) { next(error); }
  }

  async excluir(req, res, next) {
    try {
      await vendaService.excluir(req.params.id, req.usuario);
      res.json({ message: 'Venda excluída com sucesso.' });
    } catch (error) { next(error); }
  }
}

module.exports = new VendaController();
