const prisma = require('../config/database');

class ModeloPosVendaRepository {
  async findAll({ tipoServico, operadoraId, ativo } = {}) {
    return prisma.modeloPosVenda.findMany({
      where: {
        ...(tipoServico ? { tipoServico } : {}),
        ...(operadoraId !== undefined ? { operadoraId: Number(operadoraId) } : {}),
        ...(ativo !== undefined ? { ativo: Boolean(ativo) } : {}),
      },
      include: {
        operadora: { select: { id: true, nome: true } },
      },
      orderBy: [{ tipoServico: 'asc' }, { ordem: 'asc' }, { id: 'asc' }],
    });
  }

  async findById(id) {
    return prisma.modeloPosVenda.findUnique({
      where: { id },
      include: {
        operadora: { select: { id: true, nome: true } },
      },
    });
  }

  async findForResolver({ tipoServico, operadoraId }) {
    const [especificos, genericos] = await Promise.all([
      operadoraId
        ? prisma.modeloPosVenda.findMany({
            where: {
              tipoServico,
              operadoraId: Number(operadoraId),
              ativo: true,
            },
            orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
          })
        : Promise.resolve([]),
      prisma.modeloPosVenda.findMany({
        where: {
          tipoServico,
          operadoraId: null,
          ativo: true,
        },
        orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
      }),
    ]);

    return {
      especificos,
      genericos,
    };
  }

  async create(data) {
    return prisma.modeloPosVenda.create({ data });
  }

  async update(id, data) {
    return prisma.modeloPosVenda.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.modeloPosVenda.delete({ where: { id } });
  }
}

module.exports = new ModeloPosVendaRepository();
