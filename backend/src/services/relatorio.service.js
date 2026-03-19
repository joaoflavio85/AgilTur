const prisma = require('../config/database');

/**
 * Serviço de Relatórios
 */
class RelatorioService {
  inicioDoMes(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  }

  fimDoMes(date) {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  adicionarMeses(date, delta) {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1, 0, 0, 0, 0);
  }

  chaveMes(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  labelMes(date) {
    return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
  }

  etapaNormalizada(etapa) {
    const map = {
      LEAD: 'LEAD',
      COTACAO: 'COTACAO',
      PROPOSTA: 'COTACAO',
      RESERVA: 'RESERVA',
      NEGOCIACAO: 'RESERVA',
      VENDA: 'VENDA',
    };

    return map[String(etapa || '').toUpperCase()] || 'OUTROS';
  }

  parseMesReferencia(mesReferencia) {
    const texto = String(mesReferencia || '').trim();
    const match = texto.match(/^(\d{4})-(\d{2})$/);
    if (!match) return null;

    const ano = Number(match[1]);
    const mes = Number(match[2]);
    if (mes < 1 || mes > 12) return null;
    return new Date(ano, mes - 1, 1, 0, 0, 0, 0);
  }

  async montarInsightsAdmin({ mesReferencia } = {}) {
    const baseMes = this.parseMesReferencia(mesReferencia) || new Date();
    const inicioMesAtual = this.inicioDoMes(baseMes);
    const inicioMesAnterior = this.adicionarMeses(inicioMesAtual, -1);
    const fimMesAnterior = new Date(inicioMesAtual.getTime() - 1);
    const inicioJanela6Meses = this.adicionarMeses(inicioMesAtual, -5);
    const inicioJanela90Dias = new Date();
    inicioJanela90Dias.setDate(inicioJanela90Dias.getDate() - 90);

    const [
      comissaoMesAtual,
      comissaoMesAnterior,
      contasStatus,
      propostasMesAtual,
      propostasFechadasMesAtual,
      propostasAbertasEtapa,
      vendasUltimos6Meses,
      vendasOperadora90Dias,
      despesasPagasMes,
      vendasPagasPorAgenteMes,
    ] = await Promise.all([
      prisma.venda.aggregate({
        where: { dataVenda: { gte: inicioMesAtual }, status: 'PAGA' },
        _sum: { valorComissao: true },
        _count: { id: true },
      }),
      prisma.venda.aggregate({
        where: { dataVenda: { gte: inicioMesAnterior, lte: fimMesAnterior }, status: 'PAGA' },
        _sum: { valorComissao: true },
        _count: { id: true },
      }),
      prisma.contaReceber.groupBy({
        by: ['status'],
        where: { status: { in: ['PENDENTE', 'ATRASADO', 'PAGO'] } },
        _sum: { valor: true },
        _count: { id: true },
      }),
      prisma.proposta.count({ where: { dataCriacao: { gte: inicioMesAtual } } }),
      prisma.proposta.count({ where: { status: 'FECHADA', dataFechamento: { gte: inicioMesAtual } } }),
      prisma.proposta.findMany({ where: { status: 'ABERTA' }, select: { etapa: true } }),
      prisma.venda.findMany({
        where: { dataVenda: { gte: inicioJanela6Meses } },
        select: { dataVenda: true, valorTotal: true },
      }),
      prisma.venda.findMany({
        where: { dataVenda: { gte: inicioJanela90Dias } },
        select: { valorTotal: true, operadora: { select: { nome: true } } },
      }),
      prisma.contaPagar.aggregate({
        where: {
          status: 'PAGO',
          dataPagamento: { gte: inicioMesAtual, lte: this.fimDoMes(inicioMesAtual) },
        },
        _sum: { valor: true },
        _count: { id: true },
      }),
      prisma.venda.groupBy({
        by: ['agenteId'],
        where: {
          status: 'PAGA',
          dataVenda: { gte: inicioMesAtual, lte: this.fimDoMes(inicioMesAtual) },
        },
        _sum: { valorComissao: true },
        _count: { id: true },
      }),
    ]);

    const valorMesAtual = Number(comissaoMesAtual._sum.valorComissao) || 0;
    const valorMesAnterior = Number(comissaoMesAnterior._sum.valorComissao) || 0;
    const qtdMesAtual = comissaoMesAtual._count.id || 0;

    const variacaoMensalPercent = valorMesAnterior > 0
      ? ((valorMesAtual - valorMesAnterior) / valorMesAnterior) * 100
      : (valorMesAtual > 0 ? 100 : 0);

    const ticketMedio = qtdMesAtual > 0 ? valorMesAtual / qtdMesAtual : 0;
    const despesasPagasValor = Number(despesasPagasMes._sum.valor) || 0;
    const lucroEstimado = valorMesAtual - despesasPagasValor;
    const margemLucratividadePercent = valorMesAtual > 0 ? (lucroEstimado / valorMesAtual) * 100 : 0;

    const statusMap = contasStatus.reduce((acc, item) => {
      acc[item.status] = {
        quantidade: item._count.id || 0,
        valor: Number(item._sum.valor) || 0,
      };
      return acc;
    }, {});

    const valorPendente = statusMap.PENDENTE?.valor || 0;
    const valorAtrasado = statusMap.ATRASADO?.valor || 0;
    const carteiraAberta = valorPendente + valorAtrasado;
    const inadimplenciaPercent = carteiraAberta > 0 ? (valorAtrasado / carteiraAberta) * 100 : 0;

    const taxaConversaoMes = propostasMesAtual > 0
      ? (propostasFechadasMesAtual / propostasMesAtual) * 100
      : 0;

    const meses = Array.from({ length: 6 }, (_, idx) => this.adicionarMeses(inicioMesAtual, idx - 5));
    const serieMes = meses.map((m) => ({
      key: this.chaveMes(m),
      label: this.labelMes(m),
      valor: 0,
      quantidade: 0,
    }));
    const idxMes = Object.fromEntries(serieMes.map((m, i) => [m.key, i]));

    vendasUltimos6Meses.forEach((v) => {
      const d = new Date(v.dataVenda);
      const key = this.chaveMes(new Date(d.getFullYear(), d.getMonth(), 1));
      const idx = idxMes[key];
      if (idx === undefined) return;
      serieMes[idx].valor += Number(v.valorTotal) || 0;
      serieMes[idx].quantidade += 1;
    });

    const etapas = { LEAD: 0, COTACAO: 0, RESERVA: 0, VENDA: 0, OUTROS: 0 };
    propostasAbertasEtapa.forEach((p) => {
      const etapa = this.etapaNormalizada(p.etapa);
      etapas[etapa] = (etapas[etapa] || 0) + 1;
    });

    const funilEtapas = [
      { etapa: 'LEAD', quantidade: etapas.LEAD || 0 },
      { etapa: 'COTACAO', quantidade: etapas.COTACAO || 0 },
      { etapa: 'RESERVA', quantidade: etapas.RESERVA || 0 },
      { etapa: 'VENDA', quantidade: etapas.VENDA || 0 },
    ];

    const mapOperadoras = {};
    vendasOperadora90Dias.forEach((v) => {
      const nome = v.operadora?.nome || 'Sem operadora';
      if (!mapOperadoras[nome]) {
        mapOperadoras[nome] = { operadora: nome, valor: 0, quantidade: 0 };
      }
      mapOperadoras[nome].valor += Number(v.valorTotal) || 0;
      mapOperadoras[nome].quantidade += 1;
    });

    const topOperadoras = Object.values(mapOperadoras)
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);

    const agentesIds = vendasPagasPorAgenteMes.map((item) => Number(item.agenteId));
    const agentes = agentesIds.length
      ? await prisma.usuario.findMany({ where: { id: { in: agentesIds } }, select: { id: true, nome: true } })
      : [];
    const nomeAgentePorId = Object.fromEntries(agentes.map((a) => [Number(a.id), a.nome]));

    const vendasPorAgenteMes = vendasPagasPorAgenteMes
      .map((item) => ({
        agente: nomeAgentePorId[Number(item.agenteId)] || `Agente #${item.agenteId}`,
        valorComissao: Number(item._sum.valorComissao) || 0,
        totalVendas: item._count.id || 0,
      }))
      .sort((a, b) => b.valorComissao - a.valorComissao);

    return {
      periodoReferencia: {
        inicioMesAtual,
        inicioMesAnterior,
      },
      kpis: {
        faturamentoMesAtual: valorMesAtual,
        faturamentoMesAnterior: valorMesAnterior,
        variacaoMensalPercent,
        ticketMedio,
        taxaConversaoMes,
        carteiraAberta,
        inadimplenciaPercent,
        despesasPagasMes: despesasPagasValor,
        lucroEstimado,
        margemLucratividadePercent,
      },
      graficos: {
        vendasMensais: serieMes,
        topOperadoras,
        funilEtapas,
        comparativoComissaoDespesasMes: [
          { label: 'Comissoes (vendas pagas)', valor: valorMesAtual },
          { label: 'Despesas pagas', valor: despesasPagasValor },
        ],
        vendasPorAgenteMes,
      },
    };
  }

  getEscopoVenda(usuario) {
    if (!usuario || usuario.perfil === 'ADMIN') {
      return {};
    }

    return { agenteId: Number(usuario.id) };
  }

  async vendasPorPeriodo(dataInicio, dataFim, usuario) {
    if (!dataInicio || !dataFim) {
      const err = new Error('dataInicio e dataFim são obrigatórios.');
      err.statusCode = 400;
      throw err;
    }

    const escopoVenda = this.getEscopoVenda(usuario);

    const vendas = await prisma.venda.findMany({
      where: {
        ...escopoVenda,
        dataVenda: {
          gte: new Date(dataInicio),
          lte: new Date(dataFim + 'T23:59:59'),
        },
      },
      include: {
        cliente: { select: { nome: true } },
        agente: { select: { nome: true } },
      },
      orderBy: { dataVenda: 'desc' },
    });

    const totalValor = vendas.reduce((acc, v) => acc + Number(v.valorTotal), 0);

    return {
      periodo: { dataInicio, dataFim },
      totalVendas: vendas.length,
      totalValor,
      vendas,
    };
  }

  async vendasPorAgente(dataInicio, dataFim, usuario) {
    const where = {};
    if (dataInicio && dataFim) {
      where.dataVenda = {
        gte: new Date(dataInicio),
        lte: new Date(dataFim + 'T23:59:59'),
      };
    }

    const whereUsuarios = {
      ativo: true,
      ...(usuario?.perfil !== 'ADMIN' && { id: Number(usuario.id) }),
    };

    if (usuario?.perfil !== 'ADMIN') {
      where.agenteId = Number(usuario.id);
    }

    const agentes = await prisma.usuario.findMany({
      where: whereUsuarios,
      select: {
        id: true,
        nome: true,
        vendas: {
          where,
          select: {
            id: true,
            valorTotal: true,
            status: true,
          },
        },
      },
    });

    return agentes.map((agente) => ({
      agente: { id: agente.id, nome: agente.nome },
      totalVendas: agente.vendas.length,
      totalValor: agente.vendas.reduce((acc, v) => acc + Number(v.valorTotal), 0),
      vendas: agente.vendas,
    }));
  }

  async contasReceberPendentes(usuario) {
    const hoje = new Date();
    const escopoVenda = this.getEscopoVenda(usuario);

    // Atualiza atrasadas
    await prisma.contaReceber.updateMany({
      where: { status: 'PENDENTE', dataVencimento: { lt: hoje } },
      data: { status: 'ATRASADO' },
    });

    const contas = await prisma.contaReceber.findMany({
      where: {
        status: { in: ['PENDENTE', 'ATRASADO'] },
        ...(usuario?.perfil !== 'ADMIN' && { venda: escopoVenda }),
      },
      include: {
        venda: {
          include: { cliente: { select: { nome: true } } },
        },
      },
      orderBy: { dataVencimento: 'asc' },
    });

    const totalPendente = contas.filter((c) => c.status === 'PENDENTE').reduce((acc, c) => acc + Number(c.valor), 0);
    const totalAtrasado = contas.filter((c) => c.status === 'ATRASADO').reduce((acc, c) => acc + Number(c.valor), 0);

    return { totalPendente, totalAtrasado, contas };
  }

  async contasPagarPendentes(usuario) {
    if (usuario?.perfil !== 'ADMIN') {
      return { totalPendente: 0, totalAtrasado: 0, contas: [] };
    }

    const hoje = new Date();

    await prisma.contaPagar.updateMany({
      where: { status: 'PENDENTE', dataVencimento: { lt: hoje } },
      data: { status: 'ATRASADO' },
    });

    const contas = await prisma.contaPagar.findMany({
      where: { status: { in: ['PENDENTE', 'ATRASADO'] } },
      orderBy: { dataVencimento: 'asc' },
    });

    const totalPendente = contas.filter((c) => c.status === 'PENDENTE').reduce((acc, c) => acc + Number(c.valor), 0);
    const totalAtrasado = contas.filter((c) => c.status === 'ATRASADO').reduce((acc, c) => acc + Number(c.valor), 0);

    return { totalPendente, totalAtrasado, contas };
  }

  async clientesEmViagem(usuario) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeFim = new Date(hoje);
    hojeFim.setHours(23, 59, 59);
    const escopoVenda = this.getEscopoVenda(usuario);

    const emViagem = await prisma.venda.findMany({
      where: {
        ...escopoVenda,
        status: { not: 'CANCELADA' },
        dataViagemInicio: { lte: hojeFim },
        dataViagemFim: { gte: hoje },
      },
      include: {
        cliente: { select: { id: true, nome: true, telefone: true } },
        agente: { select: { id: true, nome: true } },
      },
    });

    return { total: emViagem.length, clientes: emViagem };
  }

  async dashboard(usuario, filtros = {}) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeFim = new Date(hoje);
    hojeFim.setHours(23, 59, 59);
    const escopoVenda = this.getEscopoVenda(usuario);
    const escopoContaReceber = usuario?.perfil === 'ADMIN'
      ? {}
      : { venda: escopoVenda };

    const [totalVendas, contasReceberPendentes, contasPagarPendentes, clientesEmViagem] =
      await Promise.all([
        prisma.venda.aggregate({
          where: escopoVenda,
          _sum: { valorTotal: true },
          _count: { id: true },
        }),
        prisma.contaReceber.aggregate({
          where: {
            status: { in: ['PENDENTE', 'ATRASADO'] },
            ...escopoContaReceber,
          },
          _sum: { valor: true },
          _count: { id: true },
        }),
        usuario?.perfil === 'ADMIN'
          ? prisma.contaPagar.aggregate({
              where: { status: { in: ['PENDENTE', 'ATRASADO'] } },
              _sum: { valor: true },
              _count: { id: true },
            })
          : Promise.resolve({ _sum: { valor: 0 }, _count: { id: 0 } }),
        prisma.venda.count({
          where: {
            ...escopoVenda,
            status: { not: 'CANCELADA' },
            dataViagemInicio: { lte: hojeFim },
            dataViagemFim: { gte: hoje },
          },
        }),
      ]);

    const base = {
      totalVendas: totalVendas._count.id,
      valorTotalVendas: Number(totalVendas._sum.valorTotal) || 0,
      contasReceberPendentes: {
        quantidade: contasReceberPendentes._count.id,
        valor: Number(contasReceberPendentes._sum.valor) || 0,
      },
      contasPagarPendentes: {
        quantidade: contasPagarPendentes._count.id,
        valor: Number(contasPagarPendentes._sum.valor) || 0,
      },
      clientesEmViagem,
    };

    if (usuario?.perfil === 'ADMIN') {
      base.insightsAdmin = await this.montarInsightsAdmin(filtros);
    }

    return base;
  }
}

module.exports = new RelatorioService();
