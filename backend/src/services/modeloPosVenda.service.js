const modeloPosVendaRepository = require('../repositories/modeloPosVenda.repository');

const TIPOS_SERVICO = ['AEREO', 'HOTEL', 'PACOTE', 'CRUZEIRO', 'RODOVIARIO', 'SEGURO_VIAGEM', 'OUTROS'];
const TIPOS_ACAO = ['TROCA_RESERVA', 'CANCELAMENTO', 'EMISSAO_VOUCHER', 'ENTREGA_BRINDE', 'CHECKIN_VOO'];

class ModeloPosVendaService {
  validarTipoServico(tipoServico) {
    if (!TIPOS_SERVICO.includes(tipoServico)) {
      const err = new Error('Tipo de servico invalido para modelo de pos-venda.');
      err.statusCode = 400;
      throw err;
    }
  }

  validarTipoAcao(tipoAcao) {
    if (!TIPOS_ACAO.includes(tipoAcao)) {
      const err = new Error('Tipo de acao invalido para modelo de pos-venda.');
      err.statusCode = 400;
      throw err;
    }
  }

  async listar(filtros = {}) {
    const normalizados = {
      tipoServico: filtros.tipoServico || undefined,
      operadoraId: filtros.operadoraId ? Number(filtros.operadoraId) : undefined,
      ativo: filtros.ativo === undefined ? undefined : filtros.ativo,
    };

    if (normalizados.tipoServico) this.validarTipoServico(normalizados.tipoServico);

    return modeloPosVendaRepository.findAll(normalizados);
  }

  async buscarPorId(id) {
    const modelo = await modeloPosVendaRepository.findById(Number(id));
    if (!modelo) {
      const err = new Error('Modelo de pos-venda nao encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return modelo;
  }

  async resolver({ tipoServico, operadoraId }) {
    this.validarTipoServico(tipoServico);

    const { especificos, genericos } = await modeloPosVendaRepository.findForResolver({
      tipoServico,
      operadoraId: operadoraId ? Number(operadoraId) : undefined,
    });

    if (especificos.length > 0) {
      return {
        origem: 'OPERADORA',
        itens: especificos,
      };
    }

    return {
      origem: 'PADRAO',
      itens: genericos,
    };
  }

  async criar(data) {
    this.validarTipoServico(data.tipoServico);
    this.validarTipoAcao(data.tipoAcao);

    return modeloPosVendaRepository.create({
      tipoServico: data.tipoServico,
      operadoraId: data.operadoraId ? Number(data.operadoraId) : null,
      tipoAcao: data.tipoAcao,
      descricaoPadrao: data.descricaoPadrao,
      ordem: data.ordem ? Number(data.ordem) : 1,
      ativo: data.ativo ?? true,
    });
  }

  async atualizar(id, data) {
    await this.buscarPorId(id);

    const payload = { ...data };
    if (payload.tipoServico) this.validarTipoServico(payload.tipoServico);
    if (payload.tipoAcao) this.validarTipoAcao(payload.tipoAcao);
    if (payload.operadoraId !== undefined) payload.operadoraId = payload.operadoraId ? Number(payload.operadoraId) : null;
    if (payload.ordem !== undefined) payload.ordem = Number(payload.ordem);

    return modeloPosVendaRepository.update(Number(id), payload);
  }

  async excluir(id) {
    await this.buscarPorId(id);
    return modeloPosVendaRepository.delete(Number(id));
  }
}

module.exports = new ModeloPosVendaService();
