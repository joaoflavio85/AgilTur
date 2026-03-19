const posVendaRepository = require('../repositories/posVenda.repository');

/**
 * Serviço de Pós-Venda
 */
class PosVendaService {
  normalizarFiltros(filtros = {}) {
    const normalizados = {
      vendaId: filtros.vendaId ? Number(filtros.vendaId) : undefined,
      clienteId: filtros.clienteId ? Number(filtros.clienteId) : undefined,
      clienteNome: filtros.clienteNome ? String(filtros.clienteNome).trim() : undefined,
      dataAcaoInicio: filtros.dataAcaoInicio || undefined,
      dataAcaoFim: filtros.dataAcaoFim || undefined,
      status: filtros.status || undefined,
    };

    if (normalizados.vendaId !== undefined && Number.isNaN(normalizados.vendaId)) {
      const err = new Error('Filtro de venda invalido.');
      err.statusCode = 400;
      throw err;
    }

    if (normalizados.clienteId !== undefined && Number.isNaN(normalizados.clienteId)) {
      const err = new Error('Filtro de cliente invalido.');
      err.statusCode = 400;
      throw err;
    }

    if (normalizados.status && !['ABERTO', 'CONCLUIDO'].includes(normalizados.status)) {
      const err = new Error('Filtro de status invalido.');
      err.statusCode = 400;
      throw err;
    }

    return normalizados;
  }

  async listar(filtros) {
    const filtrosNormalizados = this.normalizarFiltros(filtros);
    return posVendaRepository.findAll(filtrosNormalizados);
  }

  async buscarPorId(id) {
    const posVenda = await posVendaRepository.findById(Number(id));
    if (!posVenda) {
      const err = new Error('Registro de pós-venda não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return posVenda;
  }

  async criar(data) {
    return posVendaRepository.create({
      ...data,
      vendaId: Number(data.vendaId),
      dataAcao: data.dataAcao ? new Date(data.dataAcao) : new Date(),
      status: data.status || 'ABERTO',
    });
  }

  async atualizar(id, data) {
    await this.buscarPorId(id);
    const dadosAtualizacao = { ...data };
    if (data.dataAcao) dadosAtualizacao.dataAcao = new Date(data.dataAcao);
    return posVendaRepository.update(Number(id), dadosAtualizacao);
  }

  async excluir(id) {
    await this.buscarPorId(id);
    return posVendaRepository.delete(Number(id));
  }
}

module.exports = new PosVendaService();
