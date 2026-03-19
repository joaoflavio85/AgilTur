const prisma = require('../config/database');

class EmpresaRepository {
  async findById(id) {
    return prisma.empresa.findUnique({
      where: { id: Number(id) },
    });
  }

  async findBySubdominio(subdominio) {
    return prisma.empresa.findFirst({
      where: { subdominio, ativo: true },
      orderBy: { id: 'asc' },
    });
  }

  async findFirst() {
    return prisma.empresa.findFirst({
      where: { ativo: true },
      orderBy: { id: 'asc' },
    });
  }

  async upsertPrincipal(data) {
    const empresa = await this.findFirst();

    if (!empresa) {
      return prisma.empresa.create({ data });
    }

    return prisma.empresa.update({
      where: { id: empresa.id },
      data,
    });
  }

  async updateById(id, data) {
    return prisma.empresa.update({
      where: { id: Number(id) },
      data,
    });
  }
}

module.exports = new EmpresaRepository();
