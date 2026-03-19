const prisma = require('../config/database');

/**
 * Repositorio de Centros de Custo
 */
class CentroCustoRepository {
  async findAll({ ativo } = {}) {
    const where = {};
    if (typeof ativo === 'boolean') where.ativo = ativo;

    return prisma.centroCusto.findMany({
      where,
      orderBy: { descricao: 'asc' },
    });
  }

  async findById(id) {
    return prisma.centroCusto.findUnique({
      where: { id },
      include: {
        contasPagar: {
          select: { id: true },
          take: 1,
        },
      },
    });
  }

  async findByDescricao(descricao) {
    return prisma.centroCusto.findFirst({
      where: {
        descricao: {
          equals: descricao,
        },
      },
    });
  }

  async create(data) {
    return prisma.centroCusto.create({ data });
  }

  async update(id, data) {
    return prisma.centroCusto.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.centroCusto.delete({ where: { id } });
  }
}

module.exports = new CentroCustoRepository();
