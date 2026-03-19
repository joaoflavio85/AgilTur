const prisma = require('../config/database');

/**
 * Repositório de Contas a Receber
 */
class ContaReceberRepository {
  async findAll({
    status,
    vendaId,
    origem,
    formaPagamento,
    clienteId,
    clienteNome,
    operadoraId,
    dataVencimentoInicio,
    dataVencimentoFim,
    agenteId,
  } = {}) {
    const where = {
      ...(status ? { status } : { status: { not: 'CANCELADO' } }),
      ...(vendaId && { vendaId: Number(vendaId) }),
      ...(origem && { origem }),
      ...(formaPagamento && { formaPagamento }),
      ...(agenteId && { venda: { agenteId: Number(agenteId) } }),
    };

    if (clienteId || clienteNome || operadoraId) {
      where.venda = {
        ...(where.venda || {}),
        ...(clienteId ? { clienteId: Number(clienteId) } : {}),
        ...(clienteNome ? { cliente: { nome: { contains: clienteNome.trim() } } } : {}),
        ...(operadoraId ? { operadoraId: Number(operadoraId) } : {}),
      };
    }

    if (dataVencimentoInicio || dataVencimentoFim) {
      where.dataVencimento = {};
      if (dataVencimentoInicio) {
        const inicio = new Date(dataVencimentoInicio);
        inicio.setHours(0, 0, 0, 0);
        where.dataVencimento.gte = inicio;
      }
      if (dataVencimentoFim) {
        const fim = new Date(dataVencimentoFim);
        fim.setHours(23, 59, 59, 999);
        where.dataVencimento.lte = fim;
      }
    }

    return prisma.contaReceber.findMany({
      where,
      include: {
        venda: {
          include: {
            cliente: { select: { id: true, nome: true, cpf: true, email: true, telefone: true } },
            agente: { select: { id: true, nome: true } },
            operadora: { select: { id: true, nome: true } },
          },
        },
      },
      orderBy: { dataVencimento: 'asc' },
    });
  }

  async findById(id) {
    return prisma.contaReceber.findUnique({
      where: { id },
      include: {
        venda: {
          include: {
            cliente: { select: { id: true, nome: true, cpf: true, email: true, telefone: true } },
            agente: { select: { id: true, nome: true } },
            operadora: { select: { id: true, nome: true } },
          },
        },
      },
    });
  }

  async findVendaById(vendaId) {
    return prisma.venda.findUnique({
      where: { id: Number(vendaId) },
      select: { id: true, agenteId: true },
    });
  }

  async create(data) {
    return prisma.contaReceber.create({ data });
  }

  async update(id, data) {
    return prisma.contaReceber.update({ where: { id }, data });
  }

  async delete(id) {
    return prisma.contaReceber.update({
      where: { id },
      data: {
        status: 'CANCELADO',
      },
    });
  }

  // Atualiza contas vencidas automaticamente
  async atualizarAtrasadas() {
    const hoje = new Date();
    return prisma.contaReceber.updateMany({
      where: {
        status: 'PENDENTE',
        dataVencimento: { lt: hoje },
      },
      data: { status: 'ATRASADO' },
    });
  }

  async findPendentes() {
    return prisma.contaReceber.findMany({
      where: { status: { in: ['PENDENTE', 'ATRASADO'] } },
      include: {
        venda: {
          include: { cliente: { select: { nome: true } } },
        },
      },
      orderBy: { dataVencimento: 'asc' },
    });
  }

  async findEmpresaAsaasConfig() {
    return prisma.empresa.findFirst({
      where: { ativo: true },
      orderBy: { id: 'asc' },
      select: {
        asaasApiKey: true,
        asaasBaseUrl: true,
        asaasSandbox: true,
      },
    });
  }

  async findUltimoBoletoAsaasPorConta(contaReceberId) {
    return prisma.auditoriaEvento.findFirst({
      where: {
        entidade: 'CONTA_RECEBER',
        acao: 'GERACAO_BOLETO_ASAAS',
        registroId: Number(contaReceberId),
      },
      orderBy: { dataEvento: 'desc' },
      select: {
        id: true,
        dataEvento: true,
        depoisJson: true,
      },
    });
  }
}

module.exports = new ContaReceberRepository();
