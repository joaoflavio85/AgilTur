const contaPagarRepository = require('../repositories/contaPagar.repository');
const centroCustoRepository = require('../repositories/centroCusto.repository');
const auditoriaService = require('./auditoria.service');

/**
 * Serviço de Contas a Pagar
 */
class ContaPagarService {
  normalizarFiltros(filtros = {}) {
    const normalized = {
      status: filtros.status || undefined,
      centroCustoId: filtros.centroCustoId ? Number(filtros.centroCustoId) : undefined,
      dataVencimentoInicio: filtros.dataVencimentoInicio || undefined,
      dataVencimentoFim: filtros.dataVencimentoFim || undefined,
    };

    if (normalized.centroCustoId !== undefined && Number.isNaN(normalized.centroCustoId)) {
      const err = new Error('Centro de custo invalido no filtro.');
      err.statusCode = 400;
      throw err;
    }

    return normalized;
  }

  async validarCentroCusto(centroCustoId) {
    const centro = await centroCustoRepository.findById(Number(centroCustoId));
    if (!centro) {
      const err = new Error('Centro de custo nao encontrado.');
      err.statusCode = 404;
      throw err;
    }

    if (!centro.ativo) {
      const err = new Error('Centro de custo inativo.');
      err.statusCode = 409;
      throw err;
    }
  }

  async listar(filtros) {
    await contaPagarRepository.atualizarAtrasadas();
    const filtrosNormalizados = this.normalizarFiltros(filtros);
    return contaPagarRepository.findAll(filtrosNormalizados);
  }

  async buscarPorId(id) {
    const conta = await contaPagarRepository.findById(Number(id));
    if (!conta) {
      const err = new Error('Conta a pagar não encontrada.');
      err.statusCode = 404;
      throw err;
    }
    return conta;
  }

  async criar(data, usuario) {
    await this.validarCentroCusto(data.centroCustoId);

    const conta = await contaPagarRepository.create({
      ...data,
      centroCustoId: Number(data.centroCustoId),
      valor: Number(data.valor),
      dataVencimento: new Date(data.dataVencimento),
    });

    await auditoriaService.registrar({
      entidade: 'CONTA_PAGAR',
      acao: 'CRIACAO',
      registroId: conta.id,
      usuario,
      depois: {
        status: conta.status,
        valor: conta.valor,
        fornecedor: conta.fornecedor,
        centroCustoId: conta.centroCustoId,
      },
    });

    return conta;
  }

  async atualizar(id, data, usuario) {
    const contaAntes = await this.buscarPorId(id);

    const dadosAtualizacao = { ...data };
    if (data.valor) dadosAtualizacao.valor = Number(data.valor);
    if (data.centroCustoId !== undefined) {
      await this.validarCentroCusto(data.centroCustoId);
      dadosAtualizacao.centroCustoId = Number(data.centroCustoId);
    }
    if (data.dataVencimento) dadosAtualizacao.dataVencimento = new Date(data.dataVencimento);
    if (data.dataPagamento) dadosAtualizacao.dataPagamento = new Date(data.dataPagamento);

    const contaAtualizada = await contaPagarRepository.update(Number(id), dadosAtualizacao);

    await auditoriaService.registrar({
      entidade: 'CONTA_PAGAR',
      acao: 'ATUALIZACAO',
      registroId: contaAtualizada.id,
      usuario,
      antes: {
        status: contaAntes.status,
        valor: contaAntes.valor,
      },
      depois: {
        status: contaAtualizada.status,
        valor: contaAtualizada.valor,
      },
    });

    return contaAtualizada;
  }

  async registrarPagamento(id, usuario) {
    const contaAntes = await this.buscarPorId(id);
    const contaPaga = await contaPagarRepository.update(Number(id), {
      status: 'PAGO',
      dataPagamento: new Date(),
    });

    await auditoriaService.registrar({
      entidade: 'CONTA_PAGAR',
      acao: 'REGISTRO_PAGAMENTO',
      registroId: contaPaga.id,
      usuario,
      antes: { status: contaAntes.status },
      depois: { status: contaPaga.status },
    });

    return contaPaga;
  }

  async excluir(id, usuario) {
    const contaAntes = await this.buscarPorId(id);
    const contaCancelada = await contaPagarRepository.delete(Number(id));

    await auditoriaService.registrar({
      entidade: 'CONTA_PAGAR',
      acao: 'EXCLUSAO_LOGICA',
      registroId: contaCancelada.id,
      usuario,
      antes: { status: contaAntes.status },
      depois: { status: contaCancelada.status },
    });

    return contaCancelada;
  }
}

module.exports = new ContaPagarService();
