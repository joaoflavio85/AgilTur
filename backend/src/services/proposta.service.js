const prisma = require('../config/database');
const propostaRepository = require('../repositories/proposta.repository');
const auditoriaService = require('./auditoria.service');
const { getTenantId } = require('../config/tenant-context');

const MOTIVOS_PERDA_PADRAO = [
  'Cliente Não Respondeu',
  'Cliente Achou Caro',
  'Vai deixar para outro oportunidade',
  'Esposo(a) não quiz',
  'Outro',
];

class PropostaService {
  parseBoolean(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;
    const norm = String(value).trim().toLowerCase();
    return norm === '1' || norm === 'true' || norm === 'sim';
  }

  normalizarEtapa(etapa) {
    if (!etapa) return etapa;
    if (etapa === 'PROPOSTA') return 'RESERVA';
    if (etapa === 'NEGOCIACAO') return 'VENDA';
    return etapa;
  }

  normalizarEtapaPayload(data = {}) {
    if (data.etapa === undefined) return data;
    return {
      ...data,
      etapa: this.normalizarEtapa(data.etapa),
    };
  }

  async listarMotivosPerda() {
    await this.garantirMotivosPerdaPadrao();
    return propostaRepository.listMotivosPerda();
  }

  async garantirMotivosPerdaPadrao() {
    for (const descricao of MOTIVOS_PERDA_PADRAO) {
      const existente = await propostaRepository.findMotivoPerdaByDescricao(descricao);
      if (existente) {
        if (!existente.ativo) {
          await propostaRepository.ativarMotivoPerda(existente.id);
        }
        continue;
      }

      try {
        await propostaRepository.createMotivoPerda(descricao);
      } catch (error) {
        // Em bancos com collation acento/case-insensitive, o unique pode acusar duplicidade.
        if (error?.code !== 'P2002') {
          throw error;
        }
      }
    }
  }

  async cadastrarMotivoPerda(data, usuario) {
    const descricao = String(data?.descricao || '').trim();

    if (descricao.length < 3) {
      const err = new Error('Descricao do motivo deve ter pelo menos 3 caracteres.');
      err.statusCode = 400;
      throw err;
    }

    const existente = await propostaRepository.findMotivoPerdaByDescricao(descricao);
    if (existente) {
      if (!existente.ativo) {
        const err = new Error('Motivo ja cadastrado, porem inativo.');
        err.statusCode = 409;
        throw err;
      }
      return existente;
    }

    const motivo = await propostaRepository.createMotivoPerda(descricao);

    await auditoriaService.registrar({
      entidade: 'MOTIVO_PERDA_PROPOSTA',
      acao: 'CRIACAO',
      registroId: motivo.id,
      usuario,
      depois: { descricao: motivo.descricao, ativo: motivo.ativo },
    });

    return motivo;
  }

  calcularPercentual(parte, total) {
    if (!total) return 0;
    return Number(((Number(parte) / Number(total)) * 100).toFixed(2));
  }

  validarAcesso(proposta, usuario) {
    if (!usuario || usuario.perfil === 'ADMIN') return;

    if (Number(proposta.agenteId) !== Number(usuario.id)) {
      const err = new Error('Acesso negado para esta proposta.');
      err.statusCode = 403;
      throw err;
    }
  }

  escopoAgente(usuario, agenteIdInformado) {
    if (usuario?.perfil === 'ADMIN') {
      return agenteIdInformado || undefined;
    }
    return usuario?.id;
  }

  async listar(filtros, usuario) {
    const page = filtros?.page ? Number(filtros.page) : undefined;
    const pageSize = filtros?.pageSize ? Math.min(Number(filtros.pageSize), 100) : undefined;

    return propostaRepository.findAll({
      status: filtros?.status || undefined,
      etapa: filtros?.etapa || undefined,
      clienteId: filtros?.clienteId || undefined,
      agenteId: this.escopoAgente(usuario, filtros?.agenteId),
      search: filtros?.search || undefined,
      dataInicio: filtros?.dataInicio || undefined,
      dataFim: filtros?.dataFim || undefined,
      includeAbertasForaPeriodo: this.parseBoolean(filtros?.includeAbertasForaPeriodo, true),
      page: Number.isInteger(page) && page > 0 ? page : undefined,
      pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : undefined,
    });
  }

  async obterMetricasFunil(filtros, usuario) {
    const agenteId = this.escopoAgente(usuario, filtros?.agenteId);
    const { porEtapaStatus, total, totalFechadas, totalPerdidas, motivosRaw } = await propostaRepository.getFunilMetricas({
      agenteId,
      dataInicio: filtros?.dataInicio || undefined,
      dataFim: filtros?.dataFim || undefined,
    });

    const etapasBase = ['LEAD', 'COTACAO', 'RESERVA', 'VENDA'];
    const mapa = new Map();
    etapasBase.forEach((etapa) => {
      mapa.set(etapa, {
        etapa,
        total: 0,
        abertas: 0,
        fechadas: 0,
        perdidas: 0,
        taxaConversao: 0,
      });
    });

    porEtapaStatus.forEach((item) => {
      const etapaNormalizada = this.normalizarEtapa(item.etapa);
      const curr = mapa.get(etapaNormalizada) || {
        etapa: etapaNormalizada,
        total: 0,
        abertas: 0,
        fechadas: 0,
        perdidas: 0,
        taxaConversao: 0,
      };

      const qtd = item._count?._all || 0;
      curr.total += qtd;
      if (item.status === 'ABERTA') curr.abertas += qtd;
      if (item.status === 'FECHADA') curr.fechadas += qtd;
      if (item.status === 'PERDIDA') curr.perdidas += qtd;
      mapa.set(etapaNormalizada, curr);
    });

    const porEtapa = Array.from(mapa.values()).map((item) => ({
      ...item,
      taxaConversao: this.calcularPercentual(item.fechadas, item.total),
    }));

    const motivosPerda = motivosRaw
      .map((item) => ({
        motivo: item.motivoPerda || 'Sem motivo informado',
        quantidade: item._count?._all || 0,
      }))
      .sort((a, b) => b.quantidade - a.quantidade);

    return {
      resumo: {
        total,
        abertas: Math.max(0, total - totalFechadas - totalPerdidas),
        fechadas: totalFechadas,
        perdidas: totalPerdidas,
        taxaConversaoGeral: this.calcularPercentual(totalFechadas, total),
        taxaPerdaGeral: this.calcularPercentual(totalPerdidas, total),
      },
      porEtapa,
      motivosPerda,
    };
  }

  async buscarPorId(id, usuario) {
    const proposta = await propostaRepository.findById(id);
    if (!proposta) {
      const err = new Error('Proposta não encontrada.');
      err.statusCode = 404;
      throw err;
    }

    this.validarAcesso(proposta, usuario);
    return proposta;
  }

  async criar(data, usuario) {
    const payload = this.normalizarEtapaPayload(data);

    const proposta = await propostaRepository.create({
      ...payload,
      clienteId: Number(data.clienteId),
      agenteId: Number(usuario.id),
      operadoraId: data.operadoraId ? Number(data.operadoraId) : null,
      valorEstimado: Number(data.valorEstimado),
      valorComissao: Number(data.valorComissao || 0),
      dataViagemInicio: data.dataViagemInicio ? new Date(data.dataViagemInicio) : null,
      dataViagemFim: data.dataViagemFim ? new Date(data.dataViagemFim) : null,
      proximaAcaoEm: data.proximaAcaoEm ? new Date(data.proximaAcaoEm) : null,
    });

    await auditoriaService.registrar({
      entidade: 'PROPOSTA',
      acao: 'CRIACAO',
      registroId: proposta.id,
      usuario,
      depois: {
        status: proposta.status,
        etapa: proposta.etapa,
        valorEstimado: proposta.valorEstimado,
      },
    });

    return proposta;
  }

  async atualizar(id, data, usuario) {
    const propostaAtual = await this.buscarPorId(id, usuario);

    if (propostaAtual.status === 'FECHADA') {
      const err = new Error('Não é possível editar proposta fechada.');
      err.statusCode = 409;
      throw err;
    }

    const dataNormalizada = this.normalizarEtapaPayload(data);

    const payload = {
      ...dataNormalizada,
      ...(data.clienteId !== undefined && { clienteId: Number(data.clienteId) }),
      ...(data.operadoraId !== undefined && { operadoraId: data.operadoraId ? Number(data.operadoraId) : null }),
      ...(data.valorEstimado !== undefined && { valorEstimado: Number(data.valorEstimado) }),
      ...(data.valorComissao !== undefined && { valorComissao: Number(data.valorComissao) }),
      ...(data.dataViagemInicio !== undefined && { dataViagemInicio: data.dataViagemInicio ? new Date(data.dataViagemInicio) : null }),
      ...(data.dataViagemFim !== undefined && { dataViagemFim: data.dataViagemFim ? new Date(data.dataViagemFim) : null }),
      ...(data.proximaAcaoEm !== undefined && { proximaAcaoEm: data.proximaAcaoEm ? new Date(data.proximaAcaoEm) : null }),
    };

    if (data.status === 'PERDIDA') {
      if (!data.motivoPerda || String(data.motivoPerda).trim().length < 3) {
        const err = new Error('Informe o motivo de perda ao marcar proposta como perdida.');
        err.statusCode = 400;
        throw err;
      }

      payload.motivoPerda = String(data.motivoPerda).trim();
      payload.dataPerda = new Date();
    }

    if (data.status && data.status !== 'PERDIDA') {
      payload.motivoPerda = null;
      payload.dataPerda = null;
    }

    const proposta = await propostaRepository.update(id, payload);

    await auditoriaService.registrar({
      entidade: 'PROPOSTA',
      acao: 'ATUALIZACAO',
      registroId: proposta.id,
      usuario,
      antes: { status: propostaAtual.status, etapa: propostaAtual.etapa },
      depois: { status: proposta.status, etapa: proposta.etapa },
    });

    return proposta;
  }

  async excluir(id, usuario) {
    const proposta = await this.buscarPorId(id, usuario);
    const etapaAtual = this.normalizarEtapa(proposta.etapa);
    const podeExcluir = etapaAtual === 'LEAD' || etapaAtual === 'COTACAO';

    if (!podeExcluir) {
      const err = new Error('Exclusao permitida apenas para propostas nas etapas LEAD ou COTACAO.');
      err.statusCode = 409;
      throw err;
    }

    await propostaRepository.delete(id);

    await auditoriaService.registrar({
      entidade: 'PROPOSTA',
      acao: 'EXCLUSAO',
      registroId: proposta.id,
      usuario,
      antes: {
        status: proposta.status,
        etapa: proposta.etapa,
        clienteId: proposta.clienteId,
      },
    });
  }

  async fecharEGerarVenda(id, usuario) {
    const proposta = await this.buscarPorId(id, usuario);

    if (proposta.status === 'FECHADA') {
      const err = new Error('Proposta já está fechada.');
      err.statusCode = 409;
      throw err;
    }

    if (!proposta.operadoraId) {
      const err = new Error('Informe a operadora antes de fechar a proposta.');
      err.statusCode = 400;
      throw err;
    }

    if (!proposta.idReserva || proposta.idReserva.trim().length === 0) {
      const err = new Error('Informe o ID da reserva antes de fechar a proposta.');
      err.statusCode = 400;
      throw err;
    }

    return prisma.$transaction(async (tx) => {
      const tenantId = getTenantId();

      const vendaExistente = await tx.venda.findFirst({ where: { propostaId: proposta.id } });
      if (vendaExistente) {
        const err = new Error('Esta proposta ja possui venda vinculada.');
        err.statusCode = 409;
        throw err;
      }

      const venda = await tx.venda.create({
        data: {
          ...(tenantId ? { empresaId: tenantId } : {}),
          propostaId: proposta.id,
          clienteId: proposta.clienteId,
          agenteId: proposta.agenteId,
          operadoraId: proposta.operadoraId,
          idReserva: proposta.idReserva,
          tipoServico: proposta.tipoServico,
          descricao: proposta.descricao,
          observacoes: proposta.observacoes,
          valorTotal: proposta.valorEstimado,
          valorComissao: proposta.valorComissao,
          status: 'ABERTA',
          dataViagemInicio: proposta.dataViagemInicio,
          dataViagemFim: proposta.dataViagemFim,
        },
      });

      const propostaFechada = await tx.proposta.update({
        where: { id: proposta.id },
        data: {
          status: 'FECHADA',
          dataFechamento: new Date(),
          etapa: 'VENDA',
          motivoPerda: null,
          dataPerda: null,
        },
        include: {
          cliente: { select: { id: true, nome: true, cpf: true } },
          agente: { select: { id: true, nome: true } },
          operadora: { select: { id: true, nome: true } },
          vendas: {
            select: { id: true, status: true, dataVenda: true },
            orderBy: { dataVenda: 'desc' },
          },
        },
      });

      await auditoriaService.registrar({
        entidade: 'PROPOSTA',
        acao: 'FECHAMENTO_COM_VENDA',
        registroId: proposta.id,
        usuario,
        antes: { status: proposta.status },
        depois: { status: propostaFechada.status, vendaId: venda.id },
      });

      return propostaFechada;
    });
  }

  async marcarPerdida(id, data, usuario) {
    const proposta = await this.buscarPorId(id, usuario);

    if (proposta.status === 'FECHADA') {
      const err = new Error('Não é possível marcar como perdida uma proposta já fechada.');
      err.statusCode = 409;
      throw err;
    }

    await this.garantirMotivosPerdaPadrao();

    const motivo = await propostaRepository.findMotivoPerdaById(data?.motivoPerdaId);
    if (!motivo || !motivo.ativo) {
      const err = new Error('Selecione um motivo de perda valido.');
      err.statusCode = 400;
      throw err;
    }

    const atualizada = await propostaRepository.update(id, {
      status: 'PERDIDA',
      motivoPerda: motivo.descricao,
      dataPerda: new Date(),
    });

    await auditoriaService.registrar({
      entidade: 'PROPOSTA',
      acao: 'MARCADA_PERDIDA',
      registroId: proposta.id,
      usuario,
      antes: { status: proposta.status },
      depois: { status: atualizada.status, motivoPerda: atualizada.motivoPerda },
    });

    return atualizada;
  }
}

module.exports = new PropostaService();
