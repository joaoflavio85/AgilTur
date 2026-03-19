const prisma = require('../config/database');

/**
 * Repositório de Pós-Venda
 */
class PosVendaRepository {
  async findAll({ vendaId, clienteId, clienteNome, dataAcaoInicio, dataAcaoFim, status } = {}) {
    const where = {
      ...(vendaId && { vendaId: Number(vendaId) }),
      ...((clienteId || clienteNome) && {
        venda: {
          ...(clienteId && { clienteId: Number(clienteId) }),
          ...(clienteNome && { cliente: { nome: { contains: clienteNome.trim() } } }),
        },
      }),
      ...(status && { status }),
    };

    if (dataAcaoInicio || dataAcaoFim) {
      where.dataAcao = {};
      if (dataAcaoInicio) {
        const inicio = new Date(dataAcaoInicio);
        inicio.setHours(0, 0, 0, 0);
        where.dataAcao.gte = inicio;
      }
      if (dataAcaoFim) {
        const fim = new Date(dataAcaoFim);
        fim.setHours(23, 59, 59, 999);
        where.dataAcao.lte = fim;
      }
    }

    return prisma.posVenda.findMany({
      where,
      include: {
        venda: {
          include: {
            cliente: { select: { id: true, nome: true } },
          },
        },
      },
      orderBy: { dataAcao: 'asc' },
    });
  }

  async findById(id) {
    return prisma.posVenda.findUnique({
      where: { id },
      include: {
        venda: {
          include: {
            cliente: true,
          },
        },
      },
    });
  }

  async create(data) {
    return prisma.posVenda.create({
      data,
      include: {
        venda: {
          include: {
            cliente: { select: { id: true, nome: true } },
          },
        },
      },
    });
  }

  async update(id, data) {
    return prisma.posVenda.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.posVenda.delete({ where: { id } });
  }
}

module.exports = new PosVendaRepository();
