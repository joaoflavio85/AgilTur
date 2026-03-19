const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/auth.repository');

/**
 * Serviço de Autenticação
 * Contém as regras de negócio de login e geração de token
 */
class AuthService {
  async login(email, senha, tenant = null) {
    // Busca usuário pelo email
    const usuario = await authRepository.findByEmail(email, tenant?.id || null);

    if (!usuario) {
      const err = new Error('Email ou senha inválidos.');
      err.statusCode = 401;
      throw err;
    }

    if (!usuario.ativo) {
      const err = new Error('Usuário desativado. Contate o administrador.');
      err.statusCode = 403;
      throw err;
    }

    // Verifica a senha
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
    if (!senhaCorreta) {
      const err = new Error('Email ou senha inválidos.');
      err.statusCode = 401;
      throw err;
    }

    // Gera o token JWT
    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        tenantId: tenant?.id || null,
        tenantSubdominio: tenant?.subdominio || null,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
      },
      tenant,
    };
  }
}

module.exports = new AuthService();
