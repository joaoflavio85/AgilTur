const prisma = require('../config/database');

/**
 * Repositório de Usuários
 * Responsável por todas as operações de banco de dados de usuários
 */
class UsuarioRepository {
  async findAll() {
    return prisma.usuario.findMany({
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        perfil: true,
        ativo: true,
        dataCriacao: true,
      },
      orderBy: { nome: 'asc' },
    });
  }

  async findById(id) {
    return prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        perfil: true,
        ativo: true,
        dataCriacao: true,
      },
    });
  }

  async findByEmail(email) {
    return prisma.usuario.findFirst({ where: { email } });
  }

  async create(data) {
    return prisma.usuario.create({
      data,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        perfil: true,
        ativo: true,
        dataCriacao: true,
      },
    });
  }

  async update(id, data) {
    return prisma.usuario.update({
      where: { id },
      data,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        perfil: true,
        ativo: true,
        dataCriacao: true,
      },
    });
  }

  async delete(id) {
    return prisma.usuario.update({
      where: { id },
      data: { ativo: false },
    });
  }
}

module.exports = new UsuarioRepository();
