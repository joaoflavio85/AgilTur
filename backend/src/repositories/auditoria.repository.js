const prisma = require('../config/database');

class AuditoriaRepository {
  async create(data) {
    return prisma.auditoriaEvento.create({ data });
  }

  async findAll({ entidade, acao, usuarioId, dataInicio, dataFim, page = 1, pageSize = 20 } = {}) {
    const where = {
      ...(entidade && { entidade }),
      ...(acao && { acao }),
      ...(usuarioId && { usuarioId: Number(usuarioId) }),
      ...((dataInicio || dataFim) && {
        dataEvento: {
          ...(dataInicio && { gte: new Date(dataInicio) }),
          ...(dataFim && { lte: new Date(`${dataFim}T23:59:59`) }),
        },
      }),
    };

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

    const [items, total] = await Promise.all([
      prisma.auditoriaEvento.findMany({
        where,
        orderBy: { dataEvento: 'desc' },
        skip,
        take,
      }),
      prisma.auditoriaEvento.count({ where }),
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
}

module.exports = new AuditoriaRepository();
