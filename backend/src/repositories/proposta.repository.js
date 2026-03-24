const prisma = require('../config/database');

class PropostaRepository {
  mapEtapaFiltro(etapa) {
    if (!etapa) return undefined;
    if (etapa === 'RESERVA') return ['RESERVA', 'PROPOSTA'];
    if (etapa === 'VENDA') return ['VENDA', 'NEGOCIACAO'];
    return [etapa];
  }

  async listMotivosPerda() {
    return prisma.motivoPerdaProposta.findMany({
      where: { ativo: true },
      orderBy: { descricao: 'asc' },
    });
  }

  async findMotivoPerdaById(id) {
    return prisma.motivoPerdaProposta.findUnique({
      where: { id: Number(id) },
    });
  }

  async findMotivoPerdaByDescricao(descricao) {
    return prisma.motivoPerdaProposta.findFirst({
      where: {
        descricao,
      },
    });
  }

  async createMotivoPerda(descricao) {
    return prisma.motivoPerdaProposta.create({
      data: { descricao, ativo: true },
    });
  }

  async ativarMotivoPerda(id) {
    return prisma.motivoPerdaProposta.update({
      where: { id: Number(id) },
      data: { ativo: true },
    });
  }

  buildWhere({ status, etapa, clienteId, agenteId, search, dataInicio, dataFim, includeAbertasForaPeriodo } = {}) {
    const inicio = dataInicio ? new Date(dataInicio) : null;
    const fim = dataFim ? new Date(dataFim) : null;

    if (fim) {
      fim.setHours(23, 59, 59, 999);
    }

    const etapasFiltro = this.mapEtapaFiltro(etapa);

    const whereBase = {
      ...(status && { status }),
      ...(etapasFiltro && { etapa: { in: etapasFiltro } }),
      ...(clienteId && { clienteId: Number(clienteId) }),
      ...(agenteId && { agenteId: Number(agenteId) }),
    };

    const andConditions = [];

    if (search) {
      andConditions.push({
        OR: [
          { descricao: { contains: search, mode: 'insensitive' } },
          { idReserva: { contains: search, mode: 'insensitive' } },
          { cliente: { is: { nome: { contains: search, mode: 'insensitive' } } } },
        ],
      });
    }

    if (inicio || fim) {
      const filtroDataCriacao = {
        dataCriacao: {
          ...(inicio && { gte: inicio }),
          ...(fim && { lte: fim }),
        },
      };

      const incluirAbertas = Boolean(includeAbertasForaPeriodo) && (!status || status === 'ABERTA');
      if (incluirAbertas) {
        andConditions.push({
          OR: [
            filtroDataCriacao,
            { status: 'ABERTA' },
          ],
        });
      } else {
        andConditions.push(filtroDataCriacao);
      }
    }

    return andConditions.length > 0
      ? { ...whereBase, AND: andConditions }
      : whereBase;
  }

  includeBase() {
    return {
      cliente: { select: { id: true, nome: true, cpf: true, telefone: true, email: true } },
      agente: { select: { id: true, nome: true } },
      operadora: { select: { id: true, nome: true } },
      vendas: {
        select: { id: true, status: true, dataVenda: true },
        orderBy: { dataVenda: 'desc' },
      },
    };
  }

  async getFunilMetricas(filters = {}) {
    const where = this.buildWhere(filters);
    const [porEtapaStatus, total, totalFechadas, totalPerdidas, motivosRaw] = await Promise.all([
      prisma.proposta.groupBy({
        by: ['etapa', 'status'],
        where,
        _count: { _all: true },
      }),
      prisma.proposta.count({ where }),
      prisma.proposta.count({ where: { ...where, status: 'FECHADA' } }),
      prisma.proposta.count({ where: { ...where, status: 'PERDIDA' } }),
      prisma.proposta.groupBy({
        by: ['motivoPerda'],
        where: {
          ...where,
          status: 'PERDIDA',
          motivoPerda: { not: null },
        },
        _count: { _all: true },
      }),
    ]);

    return {
      porEtapaStatus,
      total,
      totalFechadas,
      totalPerdidas,
      motivosRaw,
    };
  }

  async findAll({ page, pageSize, ...filters } = {}) {
    const where = this.buildWhere(filters);

    if (!page || !pageSize) {
      return prisma.proposta.findMany({
        where,
        include: this.includeBase(),
        orderBy: { dataCriacao: 'desc' },
      });
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [items, total] = await Promise.all([
      prisma.proposta.findMany({
        where,
        include: this.includeBase(),
        orderBy: { dataCriacao: 'desc' },
        skip,
        take,
      }),
      prisma.proposta.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.max(1, Math.ceil(total / Number(pageSize))),
      },
    };
  }

  async findById(id) {
    return prisma.proposta.findUnique({
      where: { id: Number(id) },
      include: this.includeBase(),
    });
  }

  async create(data) {
    return prisma.proposta.create({
      data,
      include: this.includeBase(),
    });
  }

  async update(id, data) {
    return prisma.proposta.update({
      where: { id: Number(id) },
      data,
      include: this.includeBase(),
    });
  }

  async delete(id) {
    return prisma.proposta.delete({
      where: { id: Number(id) },
    });
  }
}

module.exports = new PropostaRepository();
