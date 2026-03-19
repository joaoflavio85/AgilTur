const prisma = require('../config/database');

/**
 * Repositório de Vendas
 */
class VendaRepository {
  buildWhere({
    clienteId,
    clienteNome,
    agenteId,
    operadoraId,
    status,
    tipoServico,
    idReserva,
    dataVendaInicio,
    dataVendaFim,
  } = {}) {
    const dataVenda = {
      ...(dataVendaInicio && { gte: new Date(dataVendaInicio) }),
      ...(dataVendaFim && { lte: new Date(dataVendaFim) }),
    };

    return {
      ...(clienteId && { clienteId: Number(clienteId) }),
      ...(clienteNome && { cliente: { nome: { contains: clienteNome.trim() } } }),
      ...(agenteId && { agenteId: Number(agenteId) }),
      ...(operadoraId && { operadoraId: Number(operadoraId) }),
      ...(status && { status }),
      ...(tipoServico && { tipoServico }),
      ...(idReserva && { idReserva: { contains: idReserva.trim(), mode: 'insensitive' } }),
      ...(Object.keys(dataVenda).length > 0 && { dataVenda }),
    };
  }

  async findAll(filters = {}) {
    const where = this.buildWhere(filters);

    return prisma.venda.findMany({
      where,
      include: {
        cliente: { select: { id: true, nome: true, cpf: true } },
        agente: { select: { id: true, nome: true } },
        operadora: { select: { id: true, nome: true, cnpj: true } },
        pagamentos: true,
      },
      orderBy: { dataVenda: 'desc' },
    });
  }

  async findAllPaged({ page, pageSize, ...filters } = {}) {
    const where = this.buildWhere(filters);
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [items, total, totals] = await Promise.all([
      prisma.venda.findMany({
        where,
        include: {
          cliente: { select: { id: true, nome: true, cpf: true } },
          agente: { select: { id: true, nome: true } },
          operadora: { select: { id: true, nome: true, cnpj: true } },
          pagamentos: true,
        },
        orderBy: { dataVenda: 'desc' },
        skip,
        take,
      }),
      prisma.venda.count({ where }),
      prisma.venda.aggregate({
        where,
        _sum: { valorComissao: true },
      }),
    ]);

    return {
      items,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total,
        totalPages: Math.max(1, Math.ceil(total / Number(pageSize))),
        totalComissao: Number(totals._sum.valorComissao) || 0,
      },
    };
  }

  async findById(id) {
    return prisma.venda.findUnique({
      where: { id },
      include: {
        cliente: true,
        agente: { select: { id: true, nome: true, email: true } },
        operadora: true,
        pagamentos: true,
        contasReceber: true,
        posVendas: true,
      },
    });
  }

  async create(data) {
    const { pagamentos, ...dadosVenda } = data;

    return prisma.venda.create({
      data: {
        ...dadosVenda,
        ...(Array.isArray(pagamentos) && {
          pagamentos: {
            create: pagamentos,
          },
        }),
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        agente: { select: { id: true, nome: true } },
        operadora: { select: { id: true, nome: true } },
        pagamentos: true,
      },
    });
  }

  async update(id, data) {
    const { pagamentos, ...dadosVenda } = data;

    return prisma.venda.update({
      where: { id },
      data: {
        ...dadosVenda,
        ...(Array.isArray(pagamentos) && {
          pagamentos: {
            deleteMany: {},
            create: pagamentos,
          },
        }),
      },
      include: {
        cliente: { select: { id: true, nome: true } },
        agente: { select: { id: true, nome: true } },
        operadora: { select: { id: true, nome: true } },
        pagamentos: true,
      },
    });
  }

  async delete(id) {
    return prisma.venda.update({
      where: { id },
      data: { status: 'CANCELADA' },
    });
  }

  // Busca vendas com viagem iniciando ou em andamento hoje
  async findViagensHoje() {
    const hoje = new Date();
    const inicioHoje = new Date(hoje);
    inicioHoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);

    return prisma.venda.findMany({
      where: {
        status: { not: 'CANCELADA' },
        dataViagemInicio: { lte: fimHoje },
        OR: [
          { dataViagemFim: null },
          { dataViagemFim: { gte: inicioHoje } },
        ],
      },
      include: {
        cliente: true,
        agente: { select: { id: true, nome: true } },
        operadora: { select: { id: true, nome: true } },
      },
      orderBy: { dataViagemFim: 'asc' },
    });
  }

  // Busca viagens futuras
  async findViagensFuturas(dataInicio, dataFim) {
    const hoje = new Date();
    const inicioAmanha = new Date(hoje);
    inicioAmanha.setHours(0, 0, 0, 0);
    inicioAmanha.setDate(inicioAmanha.getDate() + 1);

    const inicioFiltro = dataInicio ? new Date(dataInicio) : inicioAmanha;
    inicioFiltro.setHours(0, 0, 0, 0);

    const fimFiltro = dataFim ? new Date(dataFim) : null;
    if (fimFiltro) {
      fimFiltro.setHours(23, 59, 59, 999);
    }

    return prisma.venda.findMany({
      where: {
        status: { not: 'CANCELADA' },
        dataViagemInicio: {
          gte: inicioFiltro,
          ...(fimFiltro && { lte: fimFiltro }),
        },
      },
      include: {
        cliente: true,
        agente: { select: { id: true, nome: true } },
        operadora: { select: { id: true, nome: true } },
      },
      orderBy: { dataViagemInicio: 'asc' },
    });
  }

  // Relatório por período
  async findByPeriodo(dataInicio, dataFim) {
    return prisma.venda.findMany({
      where: {
        dataVenda: {
          gte: new Date(dataInicio),
          lte: new Date(dataFim),
        },
      },
      include: {
        cliente: { select: { nome: true } },
        agente: { select: { nome: true } },
        operadora: { select: { nome: true } },
      },
      orderBy: { dataVenda: 'desc' },
    });
  }

  // Relatório por agente
  async findByAgente(agenteId, dataInicio, dataFim) {
    return prisma.venda.groupBy({
      by: ['agenteId'],
      where: {
        ...(agenteId && { agenteId: Number(agenteId) }),
        dataVenda: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(dataFim) }),
        },
      },
      _sum: { valorTotal: true },
      _count: { id: true },
    });
  }
}

module.exports = new VendaRepository();
