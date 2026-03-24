const { z } = require('zod');
const brindeService = require('../services/brinde.service');

const brindeSchema = z.object({
  nome: z.string().min(2),
  estoque: z.number().or(z.string().transform(Number)).optional(),
  estoqueMinimo: z.number().or(z.string().transform(Number)).optional(),
  custoMedio: z.number().or(z.string().transform(Number)).optional(),
});

const entradaSchema = z.object({
  brindeId: z.number().or(z.string().transform(Number)),
  quantidade: z.number().or(z.string().transform(Number)),
  custoUnitario: z.number().or(z.string().transform(Number)),
  fornecedorNome: z.string().min(2),
  dataVencimento: z.string(),
  despesaId: z.number().or(z.string().transform(Number)),
  dataMovimentacao: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
});

const saidaSchema = z.object({
  brindeId: z.number().or(z.string().transform(Number)),
  quantidade: z.number().or(z.string().transform(Number)),
  clienteNome: z.string().min(2),
  vendaId: z.number().or(z.string().transform(Number)).optional().nullable(),
  dataMovimentacao: z.string().optional().nullable(),
  observacao: z.string().optional().nullable(),
});

class BrindeController {
  async listar(req, res, next) {
    try {
      const itens = await brindeService.listarBrindes();
      res.json(itens);
    } catch (error) { next(error); }
  }

  async criar(req, res, next) {
    try {
      const data = brindeSchema.parse(req.body || {});
      const item = await brindeService.criarBrinde(data, req.usuario);
      res.status(201).json(item);
    } catch (error) { next(error); }
  }

  async entrada(req, res, next) {
    try {
      const data = entradaSchema.parse(req.body || {});
      const item = await brindeService.entrada(data, req.usuario);
      res.status(201).json(item);
    } catch (error) { next(error); }
  }

  async saida(req, res, next) {
    try {
      const data = saidaSchema.parse(req.body || {});
      const item = await brindeService.saida(data, req.usuario);
      res.status(201).json(item);
    } catch (error) { next(error); }
  }

  async movimentacoes(req, res, next) {
    try {
      const itens = await brindeService.listarMovimentacoes({
        brindeId: req.query.brindeId,
        tipo: req.query.tipo,
        dataInicio: req.query.dataInicio,
        dataFim: req.query.dataFim,
      });
      res.json(itens);
    } catch (error) { next(error); }
  }
}

module.exports = new BrindeController();
