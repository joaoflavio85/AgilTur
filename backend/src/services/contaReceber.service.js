const contaReceberRepository = require('../repositories/contaReceber.repository');
const auditoriaService = require('./auditoria.service');

/**
 * Serviço de Contas a Receber
 */
class ContaReceberService {
  validarWebhookToken(headers = {}) {
    const expected = (process.env.ASAAS_WEBHOOK_TOKEN || '').trim();
    if (!expected) return;

    const informed = String(headers['asaas-access-token'] || headers['Asaas-Access-Token'] || '').trim();
    if (!informed || informed !== expected) {
      const err = new Error('Token de webhook Asaas invalido.');
      err.statusCode = 401;
      throw err;
    }
  }

  extrairContaIdDaReferencia(externalReference) {
    const texto = String(externalReference || '');
    const match = texto.match(/^CONTA_RECEBER_(\d+)$/i);
    return match ? Number(match[1]) : null;
  }

  statusAsaasPago(status) {
    return ['RECEIVED', 'CONFIRMED', 'RECEIVED_IN_CASH'].includes(String(status || '').toUpperCase());
  }

  async processarWebhookAsaas(payload, headers = {}) {
    this.validarWebhookToken(headers);

    const event = String(payload?.event || '').toUpperCase();
    const payment = payload?.payment || {};
    const paymentStatus = String(payment?.status || '').toUpperCase();
    const contaId = this.extrairContaIdDaReferencia(payment?.externalReference);

    if (!event || !payment?.id) {
      return { ok: true, ignored: true, reason: 'payload_incompleto' };
    }

    if (!contaId) {
      return { ok: true, ignored: true, reason: 'external_reference_ausente_ou_invalida' };
    }

    const conta = await contaReceberRepository.findById(Number(contaId));
    if (!conta) {
      return { ok: true, ignored: true, reason: 'conta_nao_encontrada' };
    }

    if (!this.statusAsaasPago(paymentStatus)) {
      return { ok: true, ignored: true, reason: `status_${paymentStatus || 'desconhecido'}` };
    }

    if (conta.status !== 'PAGO') {
      const dataPagamento = payment?.clientPaymentDate || payment?.paymentDate
        ? new Date(payment.clientPaymentDate || payment.paymentDate)
        : new Date();

      await contaReceberRepository.update(Number(conta.id), {
        status: 'PAGO',
        dataPagamento,
        formaPagamento: conta.formaPagamento || 'BOLETO',
        origem: 'ASAAS_BOLETO',
      });

      await auditoriaService.registrar({
        entidade: 'CONTA_RECEBER',
        acao: 'BAIXA_AUTOMATICA_ASAAS',
        registroId: conta.id,
        usuario: null,
        antes: { status: conta.status, dataPagamento: conta.dataPagamento },
        depois: { status: 'PAGO', dataPagamento },
        metadados: {
          asaasEvent: event,
          asaasStatus: paymentStatus,
          asaasPaymentId: payment.id,
          externalReference: payment.externalReference,
        },
      });
    }

    return { ok: true, processed: true, contaReceberId: conta.id, status: 'PAGO' };
  }

  resolveAsaasBaseUrl({ empresaConfig }) {
    const sandboxUrl = 'https://sandbox.asaas.com/api/v3';
    const productionUrl = 'https://api.asaas.com/v3';
    const known = [sandboxUrl, productionUrl];

    const envBaseUrl = (process.env.ASAAS_BASE_URL || '').trim();
    const empresaBaseUrl = (empresaConfig?.asaasBaseUrl || '').trim();
    const empresaSandbox = typeof empresaConfig?.asaasSandbox === 'boolean' ? empresaConfig.asaasSandbox : undefined;

    if (empresaBaseUrl) {
      if (empresaSandbox === true && empresaBaseUrl === productionUrl) return sandboxUrl;
      if (empresaSandbox === false && empresaBaseUrl === sandboxUrl) return productionUrl;
      return empresaBaseUrl;
    }

    if (empresaSandbox === true) return sandboxUrl;
    if (empresaSandbox === false) return productionUrl;

    if (envBaseUrl && known.includes(envBaseUrl)) return envBaseUrl;
    if (envBaseUrl) return envBaseUrl;
    return sandboxUrl;
  }

  getAsaasConfig() {
    return contaReceberRepository.findEmpresaAsaasConfig().then((empresaConfig) => {
      const apiKey = empresaConfig?.asaasApiKey || process.env.ASAAS_API_KEY;
      const baseUrl = this.resolveAsaasBaseUrl({ empresaConfig });

      if (!apiKey) {
        const err = new Error('Configuração do Asaas ausente. Configure em Empresa ou no backend/.env.');
        err.statusCode = 500;
        throw err;
      }

      return { apiKey, baseUrl: baseUrl.replace(/\/+$/, '') };
    });
  }

  limparDocumento(valor) {
    return String(valor || '').replace(/\D/g, '');
  }

  async asaasRequest(path, { method = 'GET', body, apiKey, baseUrl }) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        access_token: apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const asaasMsg = Array.isArray(json?.errors) && json.errors.length
        ? json.errors.map((item) => item.description).join(' | ')
        : (json?.message || 'Falha na integração com Asaas.');
      const hint = /nao pertence a este ambiente|não pertence a este ambiente/i.test(asaasMsg)
        ? ' Verifique em Empresa se o ambiente (Sandbox/Producao) corresponde a chave API informada.'
        : '';
      const err = new Error(`Asaas: ${asaasMsg}.${hint}`);
      err.statusCode = response.status >= 400 && response.status < 500 ? 400 : 502;
      throw err;
    }

    return json;
  }

  async obterOuCriarClienteAsaas(conta, config) {
    const cliente = conta?.venda?.cliente;
    if (!cliente?.nome) {
      const err = new Error('Cliente da venda não encontrado para gerar boleto.');
      err.statusCode = 400;
      throw err;
    }

    const cpfCnpj = this.limparDocumento(cliente.cpf);
    const email = conta?.venda?.cliente?.email || undefined;

    if (cpfCnpj.length >= 11) {
      const found = await this.asaasRequest(`/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`, { ...config });
      if (Array.isArray(found?.data) && found.data.length > 0) {
        return found.data[0];
      }
    }

    const payload = {
      name: cliente.nome,
      cpfCnpj: cpfCnpj.length >= 11 ? cpfCnpj : undefined,
      email,
      mobilePhone: this.limparDocumento(cliente.telefone) || undefined,
      notificationDisabled: false,
    };

    return this.asaasRequest('/customers', {
      method: 'POST',
      body: payload,
      ...config,
    });
  }
  normalizarFiltros(filtros = {}) {
    const normalized = {
      ...filtros,
      vendaId: filtros.vendaId ? Number(filtros.vendaId) : undefined,
      clienteId: filtros.clienteId ? Number(filtros.clienteId) : undefined,
      clienteNome: filtros.clienteNome ? String(filtros.clienteNome).trim() : undefined,
      operadoraId: filtros.operadoraId ? Number(filtros.operadoraId) : undefined,
      dataVencimentoInicio: filtros.dataVencimentoInicio || undefined,
      dataVencimentoFim: filtros.dataVencimentoFim || undefined,
    };

    if (normalized.vendaId !== undefined && Number.isNaN(normalized.vendaId)) {
      const err = new Error('Venda invalida no filtro.');
      err.statusCode = 400;
      throw err;
    }

    if (normalized.clienteId !== undefined && Number.isNaN(normalized.clienteId)) {
      const err = new Error('Cliente invalido no filtro.');
      err.statusCode = 400;
      throw err;
    }

    if (normalized.operadoraId !== undefined && Number.isNaN(normalized.operadoraId)) {
      const err = new Error('Operadora invalida no filtro.');
      err.statusCode = 400;
      throw err;
    }

    return normalized;
  }

  validarAcessoConta(conta, usuario) {
    if (!usuario || usuario.perfil === 'ADMIN') return;

    if (Number(conta.venda?.agente?.id) !== Number(usuario.id)) {
      const err = new Error('Acesso negado para esta conta a receber.');
      err.statusCode = 403;
      throw err;
    }
  }

  async validarAcessoVenda(vendaId, usuario) {
    if (!usuario || usuario.perfil === 'ADMIN') return;

    const venda = await contaReceberRepository.findVendaById(vendaId);
    if (!venda) {
      const err = new Error('Venda não encontrada para a conta a receber.');
      err.statusCode = 400;
      throw err;
    }

    if (Number(venda.agenteId) !== Number(usuario.id)) {
      const err = new Error('Acesso negado para lançar conta a receber desta venda.');
      err.statusCode = 403;
      throw err;
    }
  }

  async listar(filtros, usuario) {
    // Atualiza status atrasados antes de listar
    await contaReceberRepository.atualizarAtrasadas();

    const agenteId = usuario?.perfil === 'ADMIN' ? undefined : usuario?.id;
    const filtrosNormalizados = this.normalizarFiltros(filtros);
    return contaReceberRepository.findAll({ ...filtrosNormalizados, agenteId });
  }

  async buscarPorId(id, usuario) {
    const conta = await contaReceberRepository.findById(Number(id));
    if (!conta) {
      const err = new Error('Conta a receber não encontrada.');
      err.statusCode = 404;
      throw err;
    }

    this.validarAcessoConta(conta, usuario);

    return conta;
  }

  async criar(data, usuario) {
    await this.validarAcessoVenda(data.vendaId, usuario);

    const conta = await contaReceberRepository.create({
      ...data,
      vendaId: Number(data.vendaId),
      valor: Number(data.valor),
      formaPagamento: data.formaPagamento || null,
      origem: data.origem || 'MANUAL',
      dataVencimento: new Date(data.dataVencimento),
    });

    await auditoriaService.registrar({
      entidade: 'CONTA_RECEBER',
      acao: 'CRIACAO',
      registroId: conta.id,
      usuario,
      depois: {
        status: conta.status,
        valor: conta.valor,
        vendaId: conta.vendaId,
      },
    });

    return conta;
  }

  async atualizar(id, data, usuario) {
    const contaAntes = await this.buscarPorId(id, usuario);

    if (data.vendaId !== undefined) {
      await this.validarAcessoVenda(data.vendaId, usuario);
    }

    const dadosAtualizacao = { ...data };
    if (data.valor) dadosAtualizacao.valor = Number(data.valor);
    if (data.formaPagamento !== undefined) dadosAtualizacao.formaPagamento = data.formaPagamento || null;
    if (data.origem) dadosAtualizacao.origem = data.origem;
    if (data.dataVencimento) dadosAtualizacao.dataVencimento = new Date(data.dataVencimento);
    if (data.dataPagamento) dadosAtualizacao.dataPagamento = new Date(data.dataPagamento);

    const contaAtualizada = await contaReceberRepository.update(Number(id), dadosAtualizacao);

    await auditoriaService.registrar({
      entidade: 'CONTA_RECEBER',
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
    const contaAntes = await this.buscarPorId(id, usuario);
    const contaPaga = await contaReceberRepository.update(Number(id), {
      status: 'PAGO',
      dataPagamento: new Date(),
    });

    await auditoriaService.registrar({
      entidade: 'CONTA_RECEBER',
      acao: 'REGISTRO_PAGAMENTO',
      registroId: contaPaga.id,
      usuario,
      antes: { status: contaAntes.status },
      depois: { status: contaPaga.status },
    });

    return contaPaga;
  }

  async excluir(id, usuario) {
    const contaAntes = await this.buscarPorId(id, usuario);
    const contaCancelada = await contaReceberRepository.delete(Number(id));

    await auditoriaService.registrar({
      entidade: 'CONTA_RECEBER',
      acao: 'EXCLUSAO_LOGICA',
      registroId: contaCancelada.id,
      usuario,
      antes: { status: contaAntes.status },
      depois: { status: contaCancelada.status },
    });

    return contaCancelada;
  }

  async gerarBoletoAsaas(id, usuario) {
    const conta = await this.buscarPorId(id, usuario);

    const ultimoEvento = await contaReceberRepository.findUltimoBoletoAsaasPorConta(conta.id);
    if (ultimoEvento?.depoisJson) {
      try {
        const dados = JSON.parse(ultimoEvento.depoisJson);
        const existingUrl = dados?.bankSlipUrl || dados?.invoiceUrl;
        if (existingUrl) {
          return {
            contaReceberId: conta.id,
            vendaId: conta.vendaId,
            asaasPaymentId: dados?.asaasPaymentId || null,
            status: dados?.status || null,
            invoiceUrl: dados?.invoiceUrl || null,
            bankSlipUrl: dados?.bankSlipUrl || null,
            dueDate: dados?.dueDate || null,
            value: dados?.value || Number(conta.valor),
            jaExistia: true,
            geradoEm: ultimoEvento.dataEvento,
          };
        }
      } catch (_) {
        // Se o historico estiver invalido, segue fluxo e gera um novo boleto.
      }
    }

    if (conta.status === 'PAGO') {
      const err = new Error('Não é possível gerar boleto para conta já paga.');
      err.statusCode = 409;
      throw err;
    }

    if (conta.status === 'CANCELADO') {
      const err = new Error('Não é possível gerar boleto para conta cancelada.');
      err.statusCode = 409;
      throw err;
    }

    const config = await this.getAsaasConfig();
    const clienteAsaas = await this.obterOuCriarClienteAsaas(conta, config);

    const dueDate = new Date(conta.dataVencimento);
    const dueDateIso = dueDate.toISOString().slice(0, 10);

    const payment = await this.asaasRequest('/payments', {
      method: 'POST',
      body: {
        customer: clienteAsaas.id,
        billingType: 'BOLETO',
        value: Number(conta.valor),
        dueDate: dueDateIso,
        description: `Conta a receber #${conta.id} | Venda #${conta.vendaId}`,
        externalReference: `CONTA_RECEBER_${conta.id}`,
      },
      ...config,
    });

    await contaReceberRepository.update(Number(conta.id), {
      formaPagamento: 'BOLETO',
      origem: 'ASAAS_BOLETO',
    });

    await auditoriaService.registrar({
      entidade: 'CONTA_RECEBER',
      acao: 'GERACAO_BOLETO_ASAAS',
      registroId: conta.id,
      usuario,
      depois: {
        asaasPaymentId: payment.id,
        status: payment.status,
        invoiceUrl: payment.invoiceUrl,
        bankSlipUrl: payment.bankSlipUrl,
        dueDate: payment.dueDate,
        value: payment.value,
      },
    });

    return {
      contaReceberId: conta.id,
      vendaId: conta.vendaId,
      asaasPaymentId: payment.id,
      status: payment.status,
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl,
      dueDate: payment.dueDate,
      value: payment.value,
      jaExistia: false,
    };
  }
}

module.exports = new ContaReceberService();
