const prisma = require('../config/database');

/**
 * Repositório de Clientes
 */
class ClienteRepository {
  async findAll({ search } = {}) {
    return prisma.cliente.findMany({
      where: search
        ? {
            OR: [
              { nome: { contains: search } },
              { cpf: { contains: search } },
              { email: { contains: search } },
              { telefone: { contains: search } },
            ],
          }
        : undefined,
      orderBy: { nome: 'asc' },
    });
  }

  async findById(id) {
    return prisma.cliente.findUnique({
      where: { id },
      include: {
        vendas: {
          include: {
            agente: { select: { id: true, nome: true } },
          },
          orderBy: { dataVenda: 'desc' },
        },
      },
    });
  }

  async findByCpf(cpf) {
    return prisma.cliente.findFirst({ where: { cpf } });
  }

  async create(data) {
    return prisma.cliente.create({ data });
  }

  async update(id, data) {
    return prisma.cliente.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.cliente.delete({ where: { id } });
  }
}

module.exports = new ClienteRepository();
