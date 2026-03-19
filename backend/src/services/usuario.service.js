const bcrypt = require('bcryptjs');
const usuarioRepository = require('../repositories/usuario.repository');

/**
 * Serviço de Usuários
 * Regras de negócio para gerenciamento de usuários/agentes
 */
class UsuarioService {
  async listar() {
    return usuarioRepository.findAll();
  }

  async buscarPorId(id) {
    const usuario = await usuarioRepository.findById(Number(id));
    if (!usuario) {
      const err = new Error('Usuário não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return usuario;
  }

  async criar(data) {
    // Verifica se email já existe
    const emailExistente = await usuarioRepository.findByEmail(data.email);
    if (emailExistente) {
      const err = new Error('Email já cadastrado.');
      err.statusCode = 409;
      throw err;
    }

    // Criptografa a senha
    const senhaHash = await bcrypt.hash(data.senha, 10);

    return usuarioRepository.create({ ...data, senha: senhaHash });
  }

  async atualizar(id, data) {
    await this.buscarPorId(id);

    // Se está atualizando email, verifica duplicidade
    if (data.email) {
      const emailExistente = await usuarioRepository.findByEmail(data.email);
      if (emailExistente && emailExistente.id !== Number(id)) {
        const err = new Error('Email já cadastrado por outro usuário.');
        err.statusCode = 409;
        throw err;
      }
    }

    // Se está atualizando senha, criptografa
    if (data.senha) {
      data.senha = await bcrypt.hash(data.senha, 10);
    }

    return usuarioRepository.update(Number(id), data);
  }

  async desativar(id) {
    await this.buscarPorId(id);
    return usuarioRepository.delete(Number(id));
  }
}

module.exports = new UsuarioService();
