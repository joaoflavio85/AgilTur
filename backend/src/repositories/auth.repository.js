const prisma = require('../config/database');

/**
 * Repositório de autenticação
 * Responsável por consultas ao banco relacionadas a auth
 */
class AuthRepository {
  async findByEmail(email, tenantId) {
    return prisma.usuario.findFirst({
      where: {
        email,
        ...(tenantId ? { empresaId: Number(tenantId) } : {}),
      },
    });
  }
}

module.exports = new AuthRepository();
