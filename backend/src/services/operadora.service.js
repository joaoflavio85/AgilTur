const operadoraRepository = require('../repositories/operadora.repository');

/**
 * Servico de Operadoras
 */
class OperadoraService {
  async listar(filtros) {
    return operadoraRepository.findAll(filtros);
  }

  async buscarPorId(id) {
    const operadora = await operadoraRepository.findById(Number(id));
    if (!operadora) {
      const err = new Error('Operadora nao encontrada.');
      err.statusCode = 404;
      throw err;
    }
    return operadora;
  }

  async criar(data) {
    if (data.cnpj) {
      const cnpjExistente = await operadoraRepository.findByCnpj(data.cnpj);
      if (cnpjExistente) {
        const err = new Error('CNPJ ja cadastrado.');
        err.statusCode = 409;
        throw err;
      }
    }

    return operadoraRepository.create(data);
  }

  async atualizar(id, data) {
    await this.buscarPorId(id);

    if (data.cnpj) {
      const cnpjExistente = await operadoraRepository.findByCnpj(data.cnpj);
      if (cnpjExistente && cnpjExistente.id !== Number(id)) {
        const err = new Error('CNPJ ja cadastrado por outra operadora.');
        err.statusCode = 409;
        throw err;
      }
    }

    return operadoraRepository.update(Number(id), data);
  }

  async excluir(id) {
    const operadora = await this.buscarPorId(id);

    if (operadora.vendas?.length) {
      const err = new Error('Nao e possivel excluir operadora com vendas vinculadas.');
      err.statusCode = 409;
      throw err;
    }

    return operadoraRepository.delete(Number(id));
  }
}

module.exports = new OperadoraService();
