const { z } = require('zod');
const propostaService = require('../services/proposta.service');

const ETAPAS_VALIDAS = ['LEAD', 'COTACAO', 'RESERVA', 'VENDA', 'PROPOSTA', 'NEGOCIACAO'];

const propostaSchema = z.object({
  clienteId: z.number().or(z.string().transform(Number)),
  operadoraId: z.number().or(z.string().transform(Number)).optional().nullable(),
  idReserva: z.string().max(20).optional().nullable(),
  etapa: z.enum(ETAPAS_VALIDAS).optional(),
  status: z.enum(['ABERTA', 'FECHADA', 'PERDIDA']).optional(),
  tipoServico: z.enum(['AEREO', 'HOTEL', 'PACOTE', 'CRUZEIRO', 'RODOVIARIO', 'SEGURO_VIAGEM', 'OUTROS']),
  descricao: z.string().min(1, 'Descrição obrigatória.'),
  observacoes: z.string().optional().nullable(),
  motivoPerda: z.string().max(500).optional().nullable(),
  valorEstimado: z.number().or(z.string().transform(Number)),
  valorComissao: z.number().or(z.string().transform(Number)).optional(),
  dataViagemInicio: z.string().optional().nullable(),
  dataViagemFim: z.string().optional().nullable(),
  proximaAcaoEm: z.string().optional().nullable(),
});

const perdaSchema = z.object({
  motivoPerdaId: z.number().int().positive(),
});

const motivoPerdaCadastroSchema = z.object({
  descricao: z.string().trim().min(3, 'Descricao obrigatoria.').max(120),
});

class PropostaController {
  async listarMotivosPerda(req, res, next) {
    try {
      const motivos = await propostaService.listarMotivosPerda();
      res.json(motivos);
    } catch (error) {
      next(error);
    }
  }

  async cadastrarMotivoPerda(req, res, next) {
    try {
      const data = motivoPerdaCadastroSchema.parse(req.body || {});
      const motivo = await propostaService.cadastrarMotivoPerda(data, req.usuario);
      res.status(201).json(motivo);
    } catch (error) {
      next(error);
    }
  }

  async listar(req, res, next) {
    try {
      const { status, etapa, clienteId, agenteId, search, dataInicio, dataFim, includeAbertasForaPeriodo, page, pageSize } = req.query;
      const propostas = await propostaService.listar({
        status,
        etapa,
        clienteId,
        agenteId,
        search,
        dataInicio,
        dataFim,
        includeAbertasForaPeriodo,
        page,
        pageSize,
      }, req.usuario);
      res.json(propostas);
    } catch (error) {
      next(error);
    }
  }

  async buscarPorId(req, res, next) {
    try {
      const proposta = await propostaService.buscarPorId(req.params.id, req.usuario);
      res.json(proposta);
    } catch (error) {
      next(error);
    }
  }

  async criar(req, res, next) {
    try {
      const data = propostaSchema.parse(req.body);
      const proposta = await propostaService.criar(data, req.usuario);
      res.status(201).json(proposta);
    } catch (error) {
      next(error);
    }
  }

  async atualizar(req, res, next) {
    try {
      const data = propostaSchema.partial().parse(req.body);
      const proposta = await propostaService.atualizar(req.params.id, data, req.usuario);
      res.json(proposta);
    } catch (error) {
      next(error);
    }
  }

  async excluir(req, res, next) {
    try {
      await propostaService.excluir(req.params.id, req.usuario);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async fechar(req, res, next) {
    try {
      const proposta = await propostaService.fecharEGerarVenda(req.params.id, req.usuario);
      res.json(proposta);
    } catch (error) {
      next(error);
    }
  }

  async funil(req, res, next) {
    try {
      const { agenteId, dataInicio, dataFim } = req.query;
      const metricas = await propostaService.obterMetricasFunil({ agenteId, dataInicio, dataFim }, req.usuario);
      res.json(metricas);
    } catch (error) {
      next(error);
    }
  }

  async perder(req, res, next) {
    try {
      const data = perdaSchema.parse(req.body || {});
      const proposta = await propostaService.marcarPerdida(req.params.id, data, req.usuario);
      res.json(proposta);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PropostaController();
