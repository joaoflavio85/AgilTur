const prisma = require('../config/database');

/**
 * Repositório de Contas a Pagar
 */
class ContaPagarRepository {
  async findAll({ status, centroCustoId, dataVencimentoInicio, dataVencimentoFim } = {}) {
    const where = {
      status: status || { not: 'CANCELADO' },
    };

    if (centroCustoId) {
      where.centroCustoId = Number(centroCustoId);
    }

    if (dataVencimentoInicio || dataVencimentoFim) {
      where.dataVencimento = {};
      if (dataVencimentoInicio) {
        const inicio = new Date(dataVencimentoInicio);
        inicio.setHours(0, 0, 0, 0);
        where.dataVencimento.gte = inicio;
      }
      if (dataVencimentoFim) {
        const fim = new Date(dataVencimentoFim);
        fim.setHours(23, 59, 59, 999);
        where.dataVencimento.lte = fim;
      }
    }

    return prisma.contaPagar.findMany({
      where,
      include: {
        centroCusto: true,
      },
      orderBy: { dataVencimento: 'asc' },
    });
  }

  async findById(id) {
    return prisma.contaPagar.findUnique({
      where: { id },
      include: {
        centroCusto: true,
      },
    });
  }

  async create(data) {
    return prisma.contaPagar.create({ data });
  }

  async update(id, data) {
    return prisma.contaPagar.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.contaPagar.update({
      where: { id },
      data: {
        status: 'CANCELADO',
      },
    });
  }

  async atualizarAtrasadas() {
    const hoje = new Date();
    return prisma.contaPagar.updateMany({
      where: {
        status: 'PENDENTE',
        dataVencimento: { lt: hoje },
      },
      data: { status: 'ATRASADO' },
    });
  }

  async findPendentes() {
    return prisma.contaPagar.findMany({
      where: { status: { in: ['PENDENTE', 'ATRASADO'] } },
      include: {
        centroCusto: true,
      },
      orderBy: { dataVencimento: 'asc' },
    });
  }
}

module.exports = new ContaPagarRepository();
