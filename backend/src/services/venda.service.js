const prisma = require('../config/database');
const fs = require('fs');
const path = require('path');
const vendaRepository = require('../repositories/venda.repository');
const auditoriaService = require('./auditoria.service');

const FORMAS_PAGAMENTO = ['CARTAO', 'BOLETO', 'PIX', 'OPERADORA'];
const PERCENTUAL_BONIFICACAO_PADRAO = 5;

const toNumber = (value, fieldName) => {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    const err = new Error(`Campo ${fieldName} inválido.`);
    err.statusCode = 400;
    throw err;
  }
  return parsed;
};

const round2 = (value) => Math.round(Number(value) * 100) / 100;
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Serviço de Vendas
 */
class VendaService {
  async obterPercentualBonificacaoIndicacao(tx) {
    const empresa = await tx.empresa.findFirst({
      where: { ativo: true },
      orderBy: { id: 'asc' },
      select: { percentualBonificacaoIndicacao: true },
    });

    const percentual = Number(empresa?.percentualBonificacaoIndicacao);
    if (!Number.isFinite(percentual) || percentual < 0) return PERCENTUAL_BONIFICACAO_PADRAO;
    return percentual;
  }

  async validarIndicacao(tx, { clienteId, clienteIndicadorId, vendaPorIndicacao }) {
    const indicadorId = clienteIndicadorId ? Number(clienteIndicadorId) : null;
    const indicadoId = Number(clienteId);

    if (!vendaPorIndicacao && !indicadorId) {
      return null;
    }

    if (vendaPorIndicacao && !indicadorId) {
      const err = new Error('Informe o cliente indicador quando a venda for por indicacao.');
      err.statusCode = 400;
      throw err;
    }

    if (indicadorId === indicadoId) {
      const err = new Error('Cliente nao pode indicar a si mesmo.');
      err.statusCode = 400;
      throw err;
    }

    const indicadorExiste = await tx.cliente.findUnique({ where: { id: indicadorId } });
    if (!indicadorExiste) {
      const err = new Error('Cliente indicador nao encontrado.');
      err.statusCode = 400;
      throw err;
    }

    return indicadorId;
  }

  async sincronizarIndicacaoVenda(tx, venda, usuario) {
    if (!venda.vendaPorIndicacao || !venda.clienteIndicadorId) {
      await tx.indicacaoCliente.deleteMany({ where: { vendaId: venda.id } });
      return;
    }

    const percentualBonificacao = await this.obterPercentualBonificacaoIndicacao(tx);
    const fator = percentualBonificacao / 100;
    const bonificacaoGerada = round2(Number(venda.valorComissao || 0) * fator);

    const existente = await tx.indicacaoCliente.findFirst({ where: { vendaId: venda.id } });

    if (existente) {
      await tx.indicacaoCliente.update({
        where: { id: existente.id },
        data: {
          clienteIndicadorId: Number(venda.clienteIndicadorId),
          clienteIndicadoId: Number(venda.clienteId),
          valorComissaoVenda: Number(venda.valorComissao || 0),
          bonificacaoGerada,
          percentualBonificacaoAplicado: percentualBonificacao,
          dataIndicacao: venda.dataVenda,
          observacoes: `Indicacao vinculada automaticamente pela venda #${venda.id}`,
        },
      });
      return;
    }

    await tx.indicacaoCliente.create({
      data: {
        clienteIndicadorId: Number(venda.clienteIndicadorId),
        clienteIndicadoId: Number(venda.clienteId),
        vendaId: venda.id,
        valorComissaoVenda: Number(venda.valorComissao || 0),
        bonificacaoGerada,
        percentualBonificacaoAplicado: percentualBonificacao,
        statusBonificacao: 'PENDENTE',
        dataIndicacao: venda.dataVenda,
        observacoes: `Indicacao vinculada automaticamente pela venda #${venda.id}`,
      },
    });

    await auditoriaService.registrar({
      entidade: 'INDICACAO_CLIENTE',
      acao: 'CRIACAO_AUTOMATICA',
      usuario,
      metadados: {
        vendaId: venda.id,
        clienteIndicadorId: Number(venda.clienteIndicadorId),
        clienteIndicadoId: Number(venda.clienteId),
      },
      depois: {
        percentualBonificacaoAplicado: percentualBonificacao,
        bonificacaoGerada,
        valorComissaoVenda: Number(venda.valorComissao || 0),
      },
    });
  }

  toAbsoluteFilePath(storedPath) {
    if (!storedPath) return null;
    if (path.isAbsolute(storedPath)) return storedPath;
    return path.resolve(BACKEND_ROOT, storedPath);
  }

  toStoredRelativePath(absolutePath) {
    return path.relative(BACKEND_ROOT, absolutePath).replace(/\\/g, '/');
  }

  safeRemoveFile(filePath) {
    if (!filePath) return;
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.warn('Nao foi possivel remover arquivo antigo de anexo:', error.message);
    }
  }

  validarAcessoVenda(venda, usuario) {
    if (!usuario || usuario.perfil === 'ADMIN') return;

    if (Number(venda.agenteId) !== Number(usuario.id)) {
      const err = new Error('Acesso negado para esta venda.');
      err.statusCode = 403;
      throw err;
    }
  }

  normalizarPagamentos(pagamentos, { obrigatorio = false, exigirVencimento = false } = {}) {
    if (!Array.isArray(pagamentos) || pagamentos.length === 0) {
      if (!obrigatorio) return [];
      const err = new Error('Informe ao menos uma forma de pagamento.');
      err.statusCode = 400;
      throw err;
    }

    return pagamentos.map((pagamento, index) => {
      const formaPagamento = pagamento.formaPagamento;
      const valor = toNumber(pagamento.valor, 'valor do pagamento');
      const dataVencimento = pagamento.dataVencimento ? new Date(pagamento.dataVencimento) : null;

      if (!FORMAS_PAGAMENTO.includes(formaPagamento)) {
        const err = new Error(`Forma de pagamento inválida: ${formaPagamento}.`);
        err.statusCode = 400;
        throw err;
      }

      if (valor <= 0) {
        const err = new Error('Valor da forma de pagamento deve ser maior que zero.');
        err.statusCode = 400;
        throw err;
      }

      if (exigirVencimento && !dataVencimento) {
        const err = new Error(`Informe data de vencimento para o pagamento ${index + 1}.`);
        err.statusCode = 400;
        throw err;
      }

      return { formaPagamento, valor, dataVencimento };
    });
  }

  validarSomaPagamentosComissao(valorComissao, pagamentos) {
    const somaPagamentos = round2(
      pagamentos.reduce((acc, pagamento) => acc + Number(pagamento.valor), 0)
    );
    const totalComissao = round2(valorComissao);

    if (Math.abs(somaPagamentos - totalComissao) > 0.01) {
      const err = new Error('A soma das formas de pagamento deve ser igual ao valor total da comissao.');
      err.statusCode = 400;
      throw err;
    }
  }

  async sincronizarContasReceberComissao(tx, vendaId, pagamentos) {
    await tx.contaReceber.deleteMany({
      where: {
        vendaId,
        origem: 'COMISSAO',
      },
    });

    if (!pagamentos.length) {
      return;
    }

    await tx.contaReceber.createMany({
      data: pagamentos.map((parcela) => ({
        vendaId,
        valor: parcela.valor,
        formaPagamento: parcela.formaPagamento,
        origem: 'COMISSAO',
        dataVencimento: parcela.dataVencimento,
        status: 'PENDENTE',
      })),
    });
  }

  async listar(filtros) {
    const pageNumber = filtros?.page ? Number(filtros.page) : null;
    const pageSizeNumber = filtros?.pageSize ? Number(filtros.pageSize) : null;
    const paginar = Number.isInteger(pageNumber) && Number.isInteger(pageSizeNumber) && pageNumber > 0 && pageSizeNumber > 0;
    const page = paginar ? pageNumber : undefined;
    const pageSize = paginar ? Math.min(pageSizeNumber, 100) : undefined;

    const agenteIdEscopo = filtros?.usuario?.perfil === 'ADMIN'
      ? (filtros?.agenteId || undefined)
      : filtros?.usuario?.id;

    const filtrosBase = {
      ...filtros,
      agenteId: agenteIdEscopo,
      clienteNome: filtros?.clienteNome?.trim() || undefined,
      vendaPorIndicacao: filtros?.vendaPorIndicacao === undefined || filtros?.vendaPorIndicacao === ''
        ? undefined
        : (String(filtros?.vendaPorIndicacao).toLowerCase() === 'true' || String(filtros?.vendaPorIndicacao) === '1'),
      idReserva: filtros?.idReserva?.trim() || undefined,
      dataVendaInicio: filtros?.dataVendaInicio || undefined,
      dataVendaFim: filtros?.dataVendaFim || undefined,
    };

    if (!paginar) {
      return vendaRepository.findAll(filtrosBase);
    }

    return vendaRepository.findAllPaged({
      ...filtrosBase,
      page,
      pageSize,
    });
  }

  async buscarPorId(id, usuario) {
    const venda = await vendaRepository.findById(Number(id));
    if (!venda) {
      const err = new Error('Venda não encontrada.');
      err.statusCode = 404;
      throw err;
    }

    this.validarAcessoVenda(venda, usuario);

    return venda;
  }

  async criar(data, usuario) {
    if (data.valorComissao === undefined) {
      const err = new Error('Informe o valor da comissão da venda.');
      err.statusCode = 400;
      throw err;
    }

    const valorTotal = toNumber(data.valorTotal, 'valorTotal');
    const valorComissao = toNumber(data.valorComissao ?? 0, 'valorComissao');
    const statusFinal = data.status || 'ABERTA';
    const pagamentos = this.normalizarPagamentos(data.pagamentos, {
      obrigatorio: statusFinal === 'PAGA',
      exigirVencimento: statusFinal === 'PAGA',
    });

    if (valorComissao < 0) {
      const err = new Error('Valor de comissão não pode ser negativo.');
      err.statusCode = 400;
      throw err;
    }

    if (statusFinal === 'PAGA') {
      this.validarSomaPagamentosComissao(valorComissao, pagamentos);
    }

    return prisma.$transaction(async (tx) => {
      const operadora = await tx.operadora.findUnique({ where: { id: Number(data.operadoraId) } });
      if (!operadora) {
        const err = new Error('Operadora nao encontrada.');
        err.statusCode = 400;
        throw err;
      }

      const indicadorId = await this.validarIndicacao(tx, {
        clienteId: data.clienteId,
        clienteIndicadorId: data.clienteIndicadorId,
        vendaPorIndicacao: Boolean(data.vendaPorIndicacao),
      });

      const vendaCriada = await tx.venda.create({
        data: {
          ...data,
          clienteId: Number(data.clienteId),
          clienteIndicadorId: indicadorId,
          vendaPorIndicacao: Boolean(data.vendaPorIndicacao) || Boolean(indicadorId),
          agenteId: Number(data.agenteId),
          operadoraId: Number(data.operadoraId),
          valorTotal,
          valorComissao,
          dataViagemInicio: data.dataViagemInicio ? new Date(data.dataViagemInicio) : null,
          dataViagemFim: data.dataViagemFim ? new Date(data.dataViagemFim) : null,
          pagamentos: pagamentos.length ? { create: pagamentos } : undefined,
        },
      });

      if (statusFinal === 'PAGA') {
        await this.sincronizarContasReceberComissao(tx, vendaCriada.id, pagamentos);
      }

      await this.sincronizarIndicacaoVenda(tx, vendaCriada, usuario);

      const vendaCompleta = await tx.venda.findUnique({
        where: { id: vendaCriada.id },
        include: {
          cliente: { select: { id: true, nome: true, cpf: true } },
          clienteIndicador: { select: { id: true, nome: true, cpf: true } },
          agente: { select: { id: true, nome: true } },
          operadora: { select: { id: true, nome: true } },
          pagamentos: true,
        },
      });

      await auditoriaService.registrar({
        entidade: 'VENDA',
        acao: 'CRIACAO',
        registroId: vendaCriada.id,
        usuario,
        depois: {
          status: vendaCompleta.status,
          valorTotal: vendaCompleta.valorTotal,
          valorComissao: vendaCompleta.valorComissao,
        },
      });

      return vendaCompleta;
    });
  }

  async atualizar(id, data, usuario) {
    const vendaAtual = await this.buscarPorId(id, usuario);

    if (
      usuario?.perfil !== 'ADMIN'
      && vendaAtual.status === 'PAGA'
      && data.status !== undefined
      && data.status !== vendaAtual.status
    ) {
      const err = new Error('AGENTE nao pode alterar o status de venda ja paga.');
      err.statusCode = 403;
      throw err;
    }

    if (usuario?.perfil !== 'ADMIN') {
      delete data.agenteId;
    }

    const statusFinal = data.status || vendaAtual.status;

    const pagamentosFinais = data.pagamentos
      ? this.normalizarPagamentos(data.pagamentos, {
          obrigatorio: statusFinal === 'PAGA',
          exigirVencimento: statusFinal === 'PAGA',
        })
      : vendaAtual.pagamentos.map((pagamento) => ({
          formaPagamento: pagamento.formaPagamento,
          valor: Number(pagamento.valor),
          dataVencimento: pagamento.dataVencimento,
        }));

    const valorTotalFinal = data.valorTotal !== undefined
      ? toNumber(data.valorTotal, 'valorTotal')
      : Number(vendaAtual.valorTotal);

    const valorComissaoFinal = data.valorComissao !== undefined
      ? toNumber(data.valorComissao, 'valorComissao')
      : Number(vendaAtual.valorComissao || 0);

    if (valorComissaoFinal < 0) {
      const err = new Error('Valor de comissão não pode ser negativo.');
      err.statusCode = 400;
      throw err;
    }

    if (statusFinal === 'PAGA') {
      this.validarSomaPagamentosComissao(valorComissaoFinal, pagamentosFinais);
    }

    const precisaSincronizarComissao = statusFinal === 'PAGA' && (
      vendaAtual.status !== 'PAGA' ||
      data.valorComissao !== undefined ||
      data.pagamentos !== undefined
    );

    return prisma.$transaction(async (tx) => {
      const clienteIdFinal = data.clienteId !== undefined ? Number(data.clienteId) : Number(vendaAtual.clienteId);
      const indicadorIdInformado = data.clienteIndicadorId !== undefined
        ? data.clienteIndicadorId
        : vendaAtual.clienteIndicadorId;
      const vendaPorIndicacaoFinal = data.vendaPorIndicacao !== undefined
        ? Boolean(data.vendaPorIndicacao)
        : Boolean(vendaAtual.vendaPorIndicacao);

      const indicadorIdFinal = await this.validarIndicacao(tx, {
        clienteId: clienteIdFinal,
        clienteIndicadorId: indicadorIdInformado,
        vendaPorIndicacao: vendaPorIndicacaoFinal,
      });

      const vendaAtualizada = await tx.venda.update({
        where: { id: Number(id) },
        data: {
          ...data,
          ...(data.clienteId !== undefined && { clienteId: Number(data.clienteId) }),
          clienteIndicadorId: indicadorIdFinal,
          vendaPorIndicacao: vendaPorIndicacaoFinal || Boolean(indicadorIdFinal),
          ...(data.agenteId !== undefined && { agenteId: Number(data.agenteId) }),
          ...(data.operadoraId !== undefined && { operadoraId: Number(data.operadoraId) }),
          ...(data.valorTotal !== undefined && { valorTotal: valorTotalFinal }),
          ...(data.valorComissao !== undefined && { valorComissao: valorComissaoFinal }),
          ...(data.dataViagemInicio !== undefined && {
            dataViagemInicio: data.dataViagemInicio ? new Date(data.dataViagemInicio) : null,
          }),
          ...(data.dataViagemFim !== undefined && {
            dataViagemFim: data.dataViagemFim ? new Date(data.dataViagemFim) : null,
          }),
          ...(data.pagamentos !== undefined && {
            pagamentos: {
              deleteMany: {},
              create: pagamentosFinais,
            },
          }),
        },
      });

      if (precisaSincronizarComissao) {
        await this.sincronizarContasReceberComissao(tx, vendaAtualizada.id, pagamentosFinais);
      }

      await this.sincronizarIndicacaoVenda(tx, vendaAtualizada, usuario);

      if (statusFinal !== 'PAGA' && vendaAtual.status === 'PAGA') {
        await tx.contaReceber.deleteMany({
          where: {
            vendaId: vendaAtualizada.id,
            origem: 'COMISSAO',
          },
        });
      }

      const vendaCompleta = await tx.venda.findUnique({
        where: { id: vendaAtualizada.id },
        include: {
          cliente: { select: { id: true, nome: true, cpf: true } },
          clienteIndicador: { select: { id: true, nome: true, cpf: true } },
          agente: { select: { id: true, nome: true } },
          operadora: { select: { id: true, nome: true } },
          pagamentos: true,
        },
      });

      await auditoriaService.registrar({
        entidade: 'VENDA',
        acao: 'ATUALIZACAO',
        registroId: vendaAtualizada.id,
        usuario,
        antes: {
          status: vendaAtual.status,
          valorTotal: vendaAtual.valorTotal,
          valorComissao: vendaAtual.valorComissao,
        },
        depois: {
          status: vendaCompleta.status,
          valorTotal: vendaCompleta.valorTotal,
          valorComissao: vendaCompleta.valorComissao,
        },
      });

      return vendaCompleta;
    });
  }

  async excluir(id, usuario) {
    if (usuario?.perfil !== 'ADMIN') {
      const err = new Error('Apenas ADMIN pode excluir vendas.');
      err.statusCode = 403;
      throw err;
    }

    const venda = await this.buscarPorId(id, usuario);
    const resultado = await vendaRepository.delete(Number(id));

    await auditoriaService.registrar({
      entidade: 'VENDA',
      acao: 'EXCLUSAO_LOGICA',
      registroId: Number(id),
      usuario,
      antes: { status: venda.status },
      depois: { status: resultado.status },
    });

    return resultado;
  }

  async anexarPdf(id, file, usuario) {
    if (!file) {
      const err = new Error('Envie um arquivo PDF para anexar.');
      err.statusCode = 400;
      throw err;
    }

    const vendaAtual = await this.buscarPorId(id, usuario);
    const caminhoAntigo = this.toAbsoluteFilePath(vendaAtual.anexoPdfPath);
    const caminhoNovoRelativo = this.toStoredRelativePath(file.path);

    const vendaAtualizada = await vendaRepository.update(Number(id), {
      anexoPdfNome: file.originalname,
      anexoPdfPath: caminhoNovoRelativo,
    });

    if (caminhoAntigo && caminhoAntigo !== file.path) {
      this.safeRemoveFile(caminhoAntigo);
    }

    await auditoriaService.registrar({
      entidade: 'VENDA',
      acao: 'ANEXO_PDF',
      registroId: Number(id),
      usuario,
      depois: {
        anexoPdfNome: vendaAtualizada.anexoPdfNome,
      },
    });

    return vendaAtualizada;
  }

  async obterAnexoPdf(id, usuario) {
    const venda = await this.buscarPorId(id, usuario);
    if (!venda.anexoPdfPath) {
      const err = new Error('Venda sem anexo PDF.');
      err.statusCode = 404;
      throw err;
    }

    const caminhoAbsoluto = this.toAbsoluteFilePath(venda.anexoPdfPath);
    if (!fs.existsSync(caminhoAbsoluto)) {
      const err = new Error('Arquivo PDF nao encontrado no servidor.');
      err.statusCode = 404;
      throw err;
    }

    return {
      caminhoAbsoluto,
      nomeArquivo: venda.anexoPdfNome || path.basename(caminhoAbsoluto),
    };
  }

  async removerAnexoPdf(id, usuario) {
    const venda = await this.buscarPorId(id, usuario);
    const caminhoAbsoluto = this.toAbsoluteFilePath(venda.anexoPdfPath);

    const vendaAtualizada = await vendaRepository.update(Number(id), {
      anexoPdfNome: null,
      anexoPdfPath: null,
    });

    this.safeRemoveFile(caminhoAbsoluto);

    await auditoriaService.registrar({
      entidade: 'VENDA',
      acao: 'ANEXO_PDF_REMOVIDO',
      registroId: Number(id),
      usuario,
      antes: { anexoPdfNome: venda.anexoPdfNome },
      depois: { anexoPdfNome: null },
    });

    return vendaAtualizada;
  }
}

module.exports = new VendaService();
