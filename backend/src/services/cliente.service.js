const clienteRepository = require('../repositories/cliente.repository');

/**
 * Serviço de Clientes
 */
class ClienteService {
  async listar(filtros) {
    return clienteRepository.findAll(filtros);
  }

  async buscarPorId(id) {
    const cliente = await clienteRepository.findById(Number(id));
    if (!cliente) {
      const err = new Error('Cliente não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return cliente;
  }

  async criar(data) {
    // Verifica se CPF já existe
    const cpfExistente = await clienteRepository.findByCpf(data.cpf);
    if (cpfExistente) {
      const err = new Error('CPF já cadastrado.');
      err.statusCode = 409;
      throw err;
    }

    return clienteRepository.create(data);
  }

  async atualizar(id, data) {
    await this.buscarPorId(id);

    // Se está atualizando CPF, verifica duplicidade
    if (data.cpf) {
      const cpfExistente = await clienteRepository.findByCpf(data.cpf);
      if (cpfExistente && cpfExistente.id !== Number(id)) {
        const err = new Error('CPF já cadastrado por outro cliente.');
        err.statusCode = 409;
        throw err;
      }
    }

    return clienteRepository.update(Number(id), data);
  }

  async excluir(id, usuario) {
    if (usuario?.perfil !== 'ADMIN') {
      const err = new Error('Apenas ADMIN pode excluir clientes.');
      err.statusCode = 403;
      throw err;
    }

    await this.buscarPorId(id);
    return clienteRepository.delete(Number(id));
  }
}

module.exports = new ClienteService();
