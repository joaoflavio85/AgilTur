const prisma = require('../config/database');
const brindeRepository = require('../repositories/brinde.repository');
const centroCustoRepository = require('../repositories/centroCusto.repository');
const auditoriaService = require('./auditoria.service');
const { getTenantId } = require('../config/tenant-context');

const round2 = (v) => Math.round(Number(v || 0) * 100) / 100;

class BrindeService {
  toNumber(valor, campo) {
    const n = Number(valor);
    if (Number.isNaN(n)) {
      const err = new Error(`Campo ${campo} invalido.`);
      err.statusCode = 400;
      throw err;
    }
    return n;
  }

  enriquecerEstoque(item) {
    const estoque = Number(item.estoque || 0);
    const custoMedio = Number(item.custoMedio || 0);
    const estoqueMinimo = Number(item.estoqueMinimo || 0);
    return {
      ...item,
      valorEstoque: round2(estoque * custoMedio),
      estoqueBaixo: estoque <= estoqueMinimo,
    };
  }

  async listarBrindes() {
    const itens = await brindeRepository.findAll();
    return itens.map((item) => this.enriquecerEstoque(item));
  }

  async criarBrinde(data, usuario) {
    const nome = String(data?.nome || '').trim();
    const estoque = this.toNumber(data?.estoque ?? 0, 'estoque');
    const estoqueMinimo = this.toNumber(data?.estoqueMinimo ?? 0, 'estoqueMinimo');
    const custoMedio = this.toNumber(data?.custoMedio ?? 0, 'custoMedio');

    if (nome.length < 2) {
      const err = new Error('Nome do brinde obrigatorio.');
      err.statusCode = 400;
      throw err;
    }

    const criado = await brindeRepository.create({
      nome,
      estoque: Math.max(0, Math.trunc(estoque)),
      estoqueMinimo: Math.max(0, Math.trunc(estoqueMinimo)),
      custoMedio: Math.max(0, round2(custoMedio)),
    });

    await auditoriaService.registrar({
      entidade: 'BRINDE',
      acao: 'CRIACAO',
      registroId: criado.id,
      usuario,
      depois: { nome: criado.nome, estoque: criado.estoque, custoMedio: criado.custoMedio },
    });

    return this.enriquecerEstoque(criado);
  }

  async validarDespesaId(despesaId) {
    const centro = await centroCustoRepository.findById(Number(despesaId));
    if (!centro) {
      const err = new Error('DespesaId invalido. Centro de custo nao encontrado.');
      err.statusCode = 400;
      throw err;
    }

    if (!centro.ativo) {
      const err = new Error('DespesaId invalido. Centro de custo inativo.');
      err.statusCode = 409;
      throw err;
    }
  }

  async entrada(data, usuario) {
    const brindeId = Number(data?.brindeId);
    const quantidade = Math.trunc(this.toNumber(data?.quantidade, 'quantidade'));
    const custoUnitario = this.toNumber(data?.custoUnitario, 'custoUnitario');
    const fornecedorNome = String(data?.fornecedorNome || '').trim();
    const despesaId = Number(data?.despesaId);

    if (!brindeId || brindeId <= 0) {
      const err = new Error('BrindeId obrigatorio.');
      err.statusCode = 400;
      throw err;
    }

    if (!despesaId || despesaId <= 0) {
      const err = new Error('DespesaId e obrigatorio para entrada de brinde.');
      err.statusCode = 400;
      throw err;
    }

    if (quantidade <= 0) {
      const err = new Error('Quantidade deve ser maior que zero.');
      err.statusCode = 400;
      throw err;
    }

    if (custoUnitario <= 0) {
      const err = new Error('Custo unitario deve ser maior que zero.');
      err.statusCode = 400;
      throw err;
    }

    if (!fornecedorNome) {
      const err = new Error('FornecedorNome e obrigatorio na entrada.');
      err.statusCode = 400;
      throw err;
    }

    await this.validarDespesaId(despesaId);

    return prisma.$transaction(async (tx) => {
      const tenantId = getTenantId();

      const brinde = await tx.brinde.findUnique({ where: { id: brindeId } });
      if (!brinde) {
        const err = new Error('Brinde nao encontrado.');
        err.statusCode = 404;
        throw err;
      }

      const valorTotal = round2(quantidade * custoUnitario);
      const estoqueAtual = Number(brinde.estoque || 0);
      const custoAtual = Number(brinde.custoMedio || 0);
      const novoEstoque = estoqueAtual + quantidade;
      const novoCustoMedio = novoEstoque > 0
        ? round2(((estoqueAtual * custoAtual) + (quantidade * custoUnitario)) / novoEstoque)
        : 0;

      const movimentacao = await tx.brindeMovimentacao.create({
        data: {
          ...(tenantId ? { empresaId: tenantId } : {}),
          brindeId,
          tipo: 'ENTRADA',
          quantidade,
          custoUnitario,
          valorTotal,
          dataMovimentacao: data?.dataMovimentacao ? new Date(data.dataMovimentacao) : new Date(),
          fornecedorNome,
          despesaId,
          observacao: data?.observacao || null,
        },
      });

      const brindeAtualizado = await tx.brinde.update({
        where: { id: brindeId },
        data: {
          estoque: novoEstoque,
          custoMedio: novoCustoMedio,
        },
      });

      const dataVencimento = data?.dataVencimento ? new Date(data.dataVencimento) : new Date();

      await tx.contaPagar.create({
        data: {
          ...(tenantId ? { empresaId: tenantId } : {}),
          centroCustoId: despesaId,
          descricao: `Compra de brindes - ${brinde.nome}`,
          fornecedor: fornecedorNome,
          valor: valorTotal,
          dataVencimento,
          status: 'PENDENTE',
        },
      });

      await auditoriaService.registrar({
        entidade: 'BRINDE_MOVIMENTACAO',
        acao: 'ENTRADA',
        registroId: movimentacao.id,
        usuario,
        depois: {
          brindeId,
          quantidade,
          custoUnitario,
          valorTotal,
          despesaId,
          estoqueFinal: brindeAtualizado.estoque,
        },
      });

      return {
        movimentacao,
        brinde: this.enriquecerEstoque(brindeAtualizado),
      };
    });
  }

  async saida(data, usuario) {
    const brindeId = Number(data?.brindeId);
    const quantidade = Math.trunc(this.toNumber(data?.quantidade, 'quantidade'));
    const clienteNome = String(data?.clienteNome || '').trim();

    if (!brindeId || brindeId <= 0) {
      const err = new Error('BrindeId obrigatorio.');
      err.statusCode = 400;
      throw err;
    }

    if (quantidade <= 0) {
      const err = new Error('Quantidade deve ser maior que zero.');
      err.statusCode = 400;
      throw err;
    }

    if (!clienteNome) {
      const err = new Error('ClienteNome obrigatorio na saida.');
      err.statusCode = 400;
      throw err;
    }

    return prisma.$transaction(async (tx) => {
      const tenantId = getTenantId();

      const brinde = await tx.brinde.findUnique({ where: { id: brindeId } });
      if (!brinde) {
        const err = new Error('Brinde nao encontrado.');
        err.statusCode = 404;
        throw err;
      }

      const estoqueAtual = Number(brinde.estoque || 0);
      if (quantidade > estoqueAtual) {
        const err = new Error('Nao e permitido estoque negativo. Quantidade indisponivel.');
        err.statusCode = 409;
        throw err;
      }

      const custoUnitario = Number(brinde.custoMedio || 0);
      const valorTotal = round2(custoUnitario * quantidade);
      const novoEstoque = estoqueAtual - quantidade;

      const movimentacao = await tx.brindeMovimentacao.create({
        data: {
          ...(tenantId ? { empresaId: tenantId } : {}),
          brindeId,
          tipo: 'SAIDA',
          quantidade,
          custoUnitario,
          valorTotal,
          dataMovimentacao: data?.dataMovimentacao ? new Date(data.dataMovimentacao) : new Date(),
          clienteNome,
          vendaId: data?.vendaId ? Number(data.vendaId) : null,
          observacao: data?.observacao || null,
        },
      });

      const brindeAtualizado = await tx.brinde.update({
        where: { id: brindeId },
        data: { estoque: novoEstoque },
      });

      await auditoriaService.registrar({
        entidade: 'BRINDE_MOVIMENTACAO',
        acao: 'SAIDA',
        registroId: movimentacao.id,
        usuario,
        depois: {
          brindeId,
          quantidade,
          valorTotal,
          clienteNome,
          vendaId: data?.vendaId ? Number(data.vendaId) : null,
          estoqueFinal: brindeAtualizado.estoque,
        },
      });

      return {
        movimentacao,
        brinde: this.enriquecerEstoque(brindeAtualizado),
      };
    });
  }

  async listarMovimentacoes(filtros) {
    return brindeRepository.listarMovimentacoes({
      brindeId: filtros?.brindeId || undefined,
      tipo: filtros?.tipo || undefined,
      dataInicio: filtros?.dataInicio || undefined,
      dataFim: filtros?.dataFim || undefined,
    });
  }
}

module.exports = new BrindeService();
