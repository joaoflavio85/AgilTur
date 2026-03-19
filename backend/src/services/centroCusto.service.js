const centroCustoRepository = require('../repositories/centroCusto.repository');

/**
 * Servico de Centros de Custo
 */
class CentroCustoService {
  async listar(filtros = {}) {
    const ativo = typeof filtros.ativo === 'boolean' ? filtros.ativo : undefined;
    return centroCustoRepository.findAll({ ativo });
  }

  async buscarPorId(id) {
    const centro = await centroCustoRepository.findById(Number(id));
    if (!centro) {
      const err = new Error('Centro de custo nao encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return centro;
  }

  async criar(data) {
    const descricao = data.descricao.trim();
    const existente = await centroCustoRepository.findByDescricao(descricao);
    if (existente) {
      const err = new Error('Ja existe um centro de custo com esta descricao.');
      err.statusCode = 409;
      throw err;
    }

    return centroCustoRepository.create({
      descricao,
      ativo: data.ativo ?? true,
    });
  }

  async atualizar(id, data) {
    await this.buscarPorId(id);

    const dadosAtualizacao = { ...data };
    if (typeof data.descricao === 'string') {
      const descricao = data.descricao.trim();
      const existente = await centroCustoRepository.findByDescricao(descricao);
      if (existente && existente.id !== Number(id)) {
        const err = new Error('Ja existe um centro de custo com esta descricao.');
        err.statusCode = 409;
        throw err;
      }
      dadosAtualizacao.descricao = descricao;
    }

    return centroCustoRepository.update(Number(id), dadosAtualizacao);
  }

  async excluir(id) {
    const centro = await this.buscarPorId(id);
    if (centro.contasPagar?.length) {
      const err = new Error('Nao e possivel excluir centro de custo com contas a pagar vinculadas.');
      err.statusCode = 409;
      throw err;
    }

    return centroCustoRepository.delete(Number(id));
  }
}

module.exports = new CentroCustoService();
