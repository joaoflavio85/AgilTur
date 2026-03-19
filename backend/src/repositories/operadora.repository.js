const prisma = require('../config/database');

/**
 * Repositorio de Operadoras
 */
class OperadoraRepository {
  async findAll({ search } = {}) {
    return prisma.operadora.findMany({
      where: search
        ? {
            OR: [
              { nome: { contains: search } },
              { cnpj: { contains: search } },
              { email: { contains: search } },
              { telefone: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { nome: 'asc' },
    });
  }

  async findById(id) {
    return prisma.operadora.findUnique({
      where: { id },
      include: {
        vendas: {
          include: {
            cliente: { select: { id: true, nome: true } },
            agente: { select: { id: true, nome: true } },
          },
          orderBy: { dataVenda: 'desc' },
        },
      },
    });
  }

  async findByCnpj(cnpj) {
    if (!cnpj) return null;
    return prisma.operadora.findFirst({ where: { cnpj } });
  }

  async create(data) {
    return prisma.operadora.create({ data });
  }

  async update(id, data) {
    return prisma.operadora.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.operadora.delete({ where: { id } });
  }
}

module.exports = new OperadoraRepository();
