const prisma = require('../config/database');

class BrindeRepository {
  async findAll() {
    return prisma.brinde.findMany({
      orderBy: { nome: 'asc' },
    });
  }

  async findById(id) {
    return prisma.brinde.findUnique({ where: { id: Number(id) } });
  }

  async create(data) {
    return prisma.brinde.create({ data });
  }

  async update(id, data) {
    return prisma.brinde.update({ where: { id: Number(id) }, data });
  }

  async createMovimentacao(tx, data) {
    return tx.brindeMovimentacao.create({ data });
  }

  async listarMovimentacoes({ brindeId, tipo, dataInicio, dataFim } = {}) {
    const dataMovimentacao = {
      ...(dataInicio && { gte: new Date(dataInicio) }),
      ...(dataFim && { lte: new Date(dataFim) }),
    };

    return prisma.brindeMovimentacao.findMany({
      where: {
        ...(brindeId && { brindeId: Number(brindeId) }),
        ...(tipo && { tipo }),
        ...(Object.keys(dataMovimentacao).length > 0 && { dataMovimentacao }),
      },
      include: {
        brinde: { select: { id: true, nome: true } },
      },
      orderBy: { dataMovimentacao: 'desc' },
    });
  }
}

module.exports = new BrindeRepository();
