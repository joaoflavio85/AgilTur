const clienteRepository = require('../repositories/cliente.repository');
const prisma = require('../config/database');
const auditoriaService = require('./auditoria.service');

const CPF_TECNICO_TAG = '[CPF_TECNICO]';

/**
 * Serviço de Clientes
 */
class ClienteService {
  gerarCpfTecnico() {
    const base = `${Date.now()}${Math.floor(Math.random() * 100000)}`.replace(/\D/g, '');
    return `000${base.slice(-8).padStart(8, '0')}`;
  }

  adicionarTagCpfTecnico(observacoes) {
    const texto = String(observacoes || '').trim();
    if (!texto) return CPF_TECNICO_TAG;
    if (texto.includes(CPF_TECNICO_TAG)) return texto;
    return `${CPF_TECNICO_TAG} ${texto}`;
  }

  removerTagCpfTecnico(observacoes) {
    const texto = String(observacoes || '');
    return texto.replace(CPF_TECNICO_TAG, '').trim();
  }

  async gerarCpfTecnicoUnico() {
    for (let i = 0; i < 8; i += 1) {
      const candidato = this.gerarCpfTecnico();
      const existente = await clienteRepository.findByCpf(candidato);
      if (!existente) return candidato;
    }

    const err = new Error('Nao foi possivel gerar CPF tecnico unico para o cliente.');
    err.statusCode = 500;
    throw err;
  }

  async listar(filtros) {
    return clienteRepository.findAll(filtros);
  }

  async buscarPorId(id) {
    const cliente = await clienteRepository.findById(Number(id));
    if (!cliente) {
      const err = new Error('Cliente não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return cliente;
  }

  async criar(data) {
    const nome = String(data?.nome || '').trim();
    const telefone = String(data?.telefone || '').trim();

    if (nome.length < 2) {
      const err = new Error('Nome deve ter no minimo 2 caracteres.');
      err.statusCode = 400;
      throw err;
    }

    if (telefone.length < 10) {
      const err = new Error('Telefone e obrigatorio.');
      err.statusCode = 400;
      throw err;
    }

    const cpfInformado = data?.cpf ? String(data.cpf).trim() : '';
    const cpf = cpfInformado || await this.gerarCpfTecnicoUnico();

    const observacoes = cpfInformado
      ? this.removerTagCpfTecnico(data?.observacoes)
      : this.adicionarTagCpfTecnico(data?.observacoes);

    // Verifica se CPF já existe
    const cpfExistente = await clienteRepository.findByCpf(cpf);
    if (cpfExistente) {
      const err = new Error('CPF já cadastrado.');
      err.statusCode = 409;
      throw err;
    }

    return clienteRepository.create({
      ...data,
      nome,
      telefone,
      cpf,
      observacoes,
    });
  }

  async atualizar(id, data) {
    const clienteAtual = await this.buscarPorId(id);

    if (data.nome !== undefined) {
      const nome = String(data.nome || '').trim();
      if (nome.length < 2) {
        const err = new Error('Nome deve ter no minimo 2 caracteres.');
        err.statusCode = 400;
        throw err;
      }
      data.nome = nome;
    }

    if (data.telefone !== undefined) {
      const telefone = String(data.telefone || '').trim();
      if (telefone.length < 10) {
        const err = new Error('Telefone e obrigatorio.');
        err.statusCode = 400;
        throw err;
      }
      data.telefone = telefone;
    }

    // Se está atualizando CPF, trata limpeza e verifica duplicidade
    if (data.cpf !== undefined) {
      const cpfNormalizado = String(data.cpf || '').trim();
      data.cpf = cpfNormalizado || await this.gerarCpfTecnicoUnico();

      if (cpfNormalizado) {
        data.observacoes = this.removerTagCpfTecnico(
          data.observacoes !== undefined ? data.observacoes : clienteAtual.observacoes
        );
      } else {
        data.observacoes = this.adicionarTagCpfTecnico(
          data.observacoes !== undefined ? data.observacoes : clienteAtual.observacoes
        );
      }

      const cpfExistente = await clienteRepository.findByCpf(data.cpf);
      if (cpfExistente && cpfExistente.id !== Number(id)) {
        const err = new Error('CPF já cadastrado por outro cliente.');
        err.statusCode = 409;
        throw err;
      }
    }

    return clienteRepository.update(Number(id), data);
  }

  async excluir(id, usuario) {
    if (usuario?.perfil !== 'ADMIN') {
      const err = new Error('Apenas ADMIN pode excluir clientes.');
      err.statusCode = 403;
      throw err;
    }

    await this.buscarPorId(id);
    return clienteRepository.delete(Number(id));
  }

  async listarIndicacoesDoCliente(clienteId) {
    await this.buscarPorId(clienteId);

    const indicacoes = await prisma.indicacaoCliente.findMany({
      where: { clienteIndicadorId: Number(clienteId) },
      include: {
        clienteIndicado: { select: { id: true, nome: true, telefone: true } },
        venda: {
          select: {
            id: true,
            idReserva: true,
            dataVenda: true,
            valorComissao: true,
          },
        },
      },
      orderBy: { dataIndicacao: 'desc' },
    });

    return indicacoes;
  }

  async obterRankingIndicadores(limit = 10) {
    const agregados = await prisma.indicacaoCliente.groupBy({
      by: ['clienteIndicadorId'],
      _count: { _all: true },
      _sum: {
        valorComissaoVenda: true,
        bonificacaoGerada: true,
      },
      orderBy: {
        _count: { clienteIndicadorId: 'desc' },
      },
      take: Math.min(Math.max(Number(limit) || 10, 1), 50),
    });

    if (!agregados.length) return [];

    const clienteIds = agregados.map((item) => item.clienteIndicadorId);
    const clientes = await prisma.cliente.findMany({
      where: { id: { in: clienteIds } },
      select: { id: true, nome: true, telefone: true },
    });
    const mapa = new Map(clientes.map((c) => [c.id, c]));

    return agregados.map((item, idx) => {
      const cliente = mapa.get(item.clienteIndicadorId);
      return {
        posicao: idx + 1,
        clienteId: item.clienteIndicadorId,
        clienteNome: cliente?.nome || `Cliente #${item.clienteIndicadorId}`,
        clienteTelefone: cliente?.telefone || null,
        totalIndicacoes: item._count?._all || 0,
        somaComissao: Number(item._sum?.valorComissaoVenda || 0),
        somaBonificacao: Number(item._sum?.bonificacaoGerada || 0),
        topIndicador: idx < 3,
        sugestaoBonus: (item._count?._all || 0) >= 3,
      };
    });
  }

  async marcarBonificacaoPaga(indicacaoId, { dataPagamento, observacao } = {}, usuario = null) {
    const indicacao = await prisma.indicacaoCliente.findUnique({ where: { id: Number(indicacaoId) } });
    if (!indicacao) {
      const err = new Error('Indicacao nao encontrada.');
      err.statusCode = 404;
      throw err;
    }

    if (indicacao.statusBonificacao === 'PAGA') {
      return indicacao;
    }

    const dataPagamentoFinal = dataPagamento ? new Date(dataPagamento) : new Date();

    const atualizada = await prisma.indicacaoCliente.update({
      where: { id: Number(indicacaoId) },
      data: {
        statusBonificacao: 'PAGA',
        dataPagamentoBonificacao: dataPagamentoFinal,
        ...(observacao !== undefined
          ? {
              observacoes: observacao
                ? `${indicacao.observacoes ? `${indicacao.observacoes}\n` : ''}${String(observacao).trim()}`
                : indicacao.observacoes,
            }
          : {}),
      },
    });

    await auditoriaService.registrar({
      entidade: 'INDICACAO_CLIENTE',
      acao: 'BONIFICACAO_PAGA',
      registroId: Number(indicacaoId),
      usuario,
      antes: {
        statusBonificacao: indicacao.statusBonificacao,
        dataPagamentoBonificacao: indicacao.dataPagamentoBonificacao,
      },
      depois: {
        statusBonificacao: atualizada.statusBonificacao,
        dataPagamentoBonificacao: atualizada.dataPagamentoBonificacao,
        observacoes: atualizada.observacoes,
      },
    });

    return atualizada;
  }

  async desfazerBonificacaoPaga(indicacaoId, { observacao } = {}, usuario = null) {
    const indicacao = await prisma.indicacaoCliente.findUnique({ where: { id: Number(indicacaoId) } });
    if (!indicacao) {
      const err = new Error('Indicacao nao encontrada.');
      err.statusCode = 404;
      throw err;
    }

    const atualizada = await prisma.indicacaoCliente.update({
      where: { id: Number(indicacaoId) },
      data: {
        statusBonificacao: 'PENDENTE',
        dataPagamentoBonificacao: null,
        ...(observacao !== undefined
          ? {
              observacoes: observacao
                ? `${indicacao.observacoes ? `${indicacao.observacoes}\n` : ''}${String(observacao).trim()}`
                : indicacao.observacoes,
            }
          : {}),
      },
    });

    await auditoriaService.registrar({
      entidade: 'INDICACAO_CLIENTE',
      acao: 'BONIFICACAO_DESFEITA',
      registroId: Number(indicacaoId),
      usuario,
      antes: {
        statusBonificacao: indicacao.statusBonificacao,
        dataPagamentoBonificacao: indicacao.dataPagamentoBonificacao,
      },
      depois: {
        statusBonificacao: atualizada.statusBonificacao,
        dataPagamentoBonificacao: atualizada.dataPagamentoBonificacao,
        observacoes: atualizada.observacoes,
      },
    });

    return atualizada;
  }
}

module.exports = new ClienteService();
