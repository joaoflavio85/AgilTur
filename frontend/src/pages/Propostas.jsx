import { useEffect, useRef, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const TIPOS = ['AEREO', 'HOTEL', 'PACOTE', 'CRUZEIRO', 'RODOVIARIO', 'SEGURO_VIAGEM', 'OUTROS'];
const ETAPAS = ['LEAD', 'COTACAO', 'RESERVA', 'VENDA'];
const STATUS = ['ABERTA', 'FECHADA', 'PERDIDA'];

const etapaLabel = {
  LEAD: 'Lead',
  COTACAO: 'Cotacao',
  RESERVA: 'Reserva',
  VENDA: 'Venda',
};

const etapaLegacyMap = {
  PROPOSTA: 'RESERVA',
  NEGOCIACAO: 'VENDA',
};

const normalizarEtapa = (etapa) => etapaLegacyMap[etapa] || etapa || 'LEAD';
const proximaEtapaMap = { LEAD: 'COTACAO', COTACAO: 'RESERVA', RESERVA: 'VENDA', VENDA: null };
const etapaAnteriorMap = { LEAD: null, COTACAO: 'LEAD', RESERVA: 'COTACAO', VENDA: 'RESERVA' };
const diasDesde = (dataIso) => Math.max(0, Math.floor((Date.now() - new Date(dataIso).getTime()) / 86400000));
const gerarCpfTemporario = () => {
  const base = `${Date.now()}${Math.floor(Math.random() * 1000)}`.replace(/\D/g, '');
  return base.slice(-11).padStart(11, '0');
};

const statusLabel = {
  ABERTA: 'Aberta',
  FECHADA: 'Fechada',
  PERDIDA: 'Perdida',
};

const empty = {
  clienteId: '',
  operadoraId: '',
  idReserva: '',
  etapa: 'LEAD',
  tipoServico: 'PACOTE',
  descricao: '',
  observacoes: '',
  qtdPessoas: '1',
  qtdCriancas: '0',
  idadesCriancas: '',
  valorEstimado: '',
  valorComissao: '',
  dataViagemInicio: '',
  dataViagemFim: '',
};

const fmtCurr = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const formatarMoedaInput = (value) => {
  const digitos = String(value || '').replace(/\D/g, '');
  if (!digitos) return '';
  const numero = Number(digitos) / 100;
  return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const parseMoedaInput = (value) => {
  const digitos = String(value || '').replace(/\D/g, '');
  if (!digitos) return 0;
  return Number(digitos) / 100;
};

const toIntSafe = (value, fallback = 0) => {
  const parsed = parseInt(String(value || '').replace(/\D/g, ''), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const normalizarTelefone = (value) => String(value || '').replace(/\D/g, '');
const VALIDADE_PROPOSTA_HORAS = 24;
const JANELA_VENCIDAS_HORAS = 240;

const montarDescricaoCotacao = ({ qtdPessoas, qtdCriancas, dataViagemInicio, dataViagemFim }) => {
  const adultos = Math.max(1, toIntSafe(qtdPessoas, 1));
  const criancas = Math.max(0, toIntSafe(qtdCriancas, 0));
  const ida = dataViagemInicio || 'a definir';
  const volta = dataViagemFim || 'a definir';
  return `Solicitacao de cotacao: ${adultos} pessoa(s), ${criancas} crianca(s), ida ${ida}, volta ${volta}`;
};

const montarObservacoesCotacao = ({ observacoes, qtdPessoas, qtdCriancas, idadesCriancas, dataViagemInicio, dataViagemFim }) => {
  const adultos = Math.max(1, toIntSafe(qtdPessoas, 1));
  const criancas = Math.max(0, toIntSafe(qtdCriancas, 0));
  const linhas = [
    '[SOLICITACAO_COTACAO]',
    `QTD_PESSOAS: ${adultos}`,
    `QTD_CRIANCAS: ${criancas}`,
    `IDADES_CRIANCAS: ${idadesCriancas || '-'}`,
    `DATA_IDA: ${dataViagemInicio || '-'}`,
    `DATA_VOLTA: ${dataViagemFim || '-'}`,
  ];

  if (observacoes && observacoes.trim()) {
    linhas.push('OBSERVACAO_CLIENTE:');
    linhas.push(observacoes.trim());
  }

  return linhas.join('\n');
};

function periodoAtual() {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return {
    inicio: inicio.toISOString().slice(0, 10),
    fim: fim.toISOString().slice(0, 10),
  };
}

export default function Propostas() {
  const { usuario, isAdmin } = useAuth();
  const navigate = useNavigate();

  const [propostas, setPropostas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [operadoras, setOperadoras] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [motivosPerdaCadastro, setMotivosPerdaCadastro] = useState([]);
  const [clienteModal, setClienteModal] = useState(false);
  const [clienteSaving, setClienteSaving] = useState(false);
  const [clienteError, setClienteError] = useState('');
  const [novoCliente, setNovoCliente] = useState({ nome: '', cpf: '', telefone: '', email: '' });
  const [buscaCliente, setBuscaCliente] = useState('');
  const [ticketBusca, setTicketBusca] = useState('');
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketError, setTicketError] = useState('');
  const [ticketResultado, setTicketResultado] = useState(null);
  const [perdaModal, setPerdaModal] = useState({
    aberto: false,
    propostaId: null,
    motivoPerdaId: '',
    salvando: false,
    erro: '',
  });
  const [converterModal, setConverterModal] = useState({
    aberto: false,
    propostaId: null,
    clienteNome: '',
    operadoraId: '',
    idReserva: '',
    valorComissao: '',
    dataViagemInicio: '',
    dataViagemFim: '',
    observacoes: '',
    salvando: false,
    erro: '',
  });
  const [reagendarModal, setReagendarModal] = useState({
    aberto: false,
    propostaId: null,
    clienteNome: '',
    proximaAcaoEm: '',
    salvando: false,
    erro: '',
  });
  const [whatsModal, setWhatsModal] = useState({
    aberto: false,
    propostaId: null,
    clienteNome: '',
    telefone: '',
    ticketId: '',
    mensagem: '',
    enviando: false,
    erro: '',
  });

  const periodoDefault = periodoAtual();
  const [fStatus, setFStatus] = useState('');
  const [fEtapa, setFEtapa] = useState('');
  const [fSearch, setFSearch] = useState('');
  const [fAgenteId, setFAgenteId] = useState('');
  const [fDataInicio, setFDataInicio] = useState(periodoDefault.inicio);
  const [fDataFim, setFDataFim] = useState(periodoDefault.fim);
  const [fIncluirAbertasForaPeriodo, setFIncluirAbertasForaPeriodo] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [funil, setFunil] = useState({
    resumo: { total: 0, abertas: 0, fechadas: 0, perdidas: 0, taxaConversaoGeral: 0, taxaPerdaGeral: 0 },
    porEtapa: [],
    motivosPerda: [],
  });
  const ticketInputRef = useRef(null);
  const clienteSelectRef = useRef(null);
  const qtdPessoasRef = useRef(null);
  const qtdCriancasRef = useRef(null);
  const dataInicioRef = useRef(null);
  const dataFimRef = useRef(null);

  const carregarOpcoes = async () => {
    try {
      const { data } = await api.get('/clientes');
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      setClientes([]);
    }

    try {
      const { data } = await api.get('/operadoras');
      setOperadoras(Array.isArray(data) ? data : []);
    } catch {
      setOperadoras([]);
    }

    try {
      const { data } = await api.get('/propostas/motivos-perda');
      setMotivosPerdaCadastro(data || []);
    } catch {
      setMotivosPerdaCadastro([]);
    }

    if (isAdmin) {
      try {
        const { data } = await api.get('/usuarios');
        setAgentes((data || []).filter((item) => item.perfil === 'AGENTE' && item.ativo));
      } catch {
        setAgentes([]);
      }
    }
  };

  const carregar = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/propostas', {
        params: {
          status: fStatus || undefined,
          etapa: fEtapa || undefined,
          search: fSearch || undefined,
          agenteId: isAdmin ? (fAgenteId || undefined) : undefined,
          dataInicio: fDataInicio || undefined,
          dataFim: fDataFim || undefined,
          includeAbertasForaPeriodo: fIncluirAbertasForaPeriodo,
          page: pagination.page,
          pageSize: pagination.pageSize,
        },
      });

      if (Array.isArray(data)) {
        setPropostas(data);
        setPagination((prev) => ({ ...prev, total: data.length, totalPages: 1 }));
      } else {
        setPropostas(data.items || []);
        setPagination((prev) => ({ ...prev, ...(data.pagination || {}) }));
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao carregar propostas.');
    } finally {
      setLoading(false);
    }
  };

  const carregarFunil = async () => {
    try {
      const { data } = await api.get('/propostas/funil', {
        params: {
          agenteId: isAdmin ? (fAgenteId || undefined) : undefined,
          dataInicio: fDataInicio || undefined,
          dataFim: fDataFim || undefined,
        },
      });
      setFunil(data);
    } catch {
      setFunil({
        resumo: { total: 0, abertas: 0, fechadas: 0, perdidas: 0, taxaConversaoGeral: 0, taxaPerdaGeral: 0 },
        porEtapa: [],
        motivosPerda: [],
      });
    }
  };

  useEffect(() => {
    carregarOpcoes();
  }, [isAdmin]);

  useEffect(() => {
    carregar();
  }, [fStatus, fEtapa, fSearch, fAgenteId, fDataInicio, fDataFim, fIncluirAbertasForaPeriodo, pagination.page, pagination.pageSize]);

  useEffect(() => {
    carregarFunil();
  }, [fAgenteId, fDataInicio, fDataFim]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [fStatus, fEtapa, fSearch, fAgenteId, fDataInicio, fDataFim, fIncluirAbertasForaPeriodo]);

  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const onValorEstimadoChange = (e) => {
    setForm((prev) => ({ ...prev, valorEstimado: formatarMoedaInput(e.target.value) }));
  };

  const abrirCriar = async () => {
    setForm(empty);
    setEditId(null);
    setError('');
    setBuscaCliente('');
    setTicketBusca('');
    setTicketError('');
    setTicketResultado(null);
    setModal(true);
    setTimeout(() => ticketInputRef.current?.focus(), 0);
  };

  const focarCampo = (ref) => {
    const el = ref?.current;
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (_) {
      // no-op
    }
    el.focus();
  };

  const focarPrimeiroObrigatorioPendente = (snapshotForm) => {
    if (editId) return;

    const estado = snapshotForm || form;
    if (!estado?.clienteId) {
      focarCampo(clienteSelectRef);
      return;
    }

    if (toIntSafe(estado.qtdPessoas, 0) <= 0) {
      focarCampo(qtdPessoasRef);
      return;
    }

    if (toIntSafe(estado.qtdCriancas, -1) < 0) {
      focarCampo(qtdCriancasRef);
      return;
    }

    if (!estado.dataViagemInicio) {
      focarCampo(dataInicioRef);
      return;
    }

    if (!estado.dataViagemFim) {
      focarCampo(dataFimRef);
    }
  };

  const abrirEditar = (p) => {
    setForm({
      clienteId: p.clienteId || '',
      descricao: p.descricao,
      observacoes: p.observacoes || '',
      tipoServico: p.tipoServico || 'PACOTE',
      valorEstimado: formatarMoedaInput(Number(p.valorEstimado || 0) * 100),
    });
    setEditId(p.id);
    setError('');
    setBuscaCliente('');
    setTicketResultado(null);
    setModal(true);
  };

  const limparFiltros = () => {
    const padrao = periodoAtual();
    setFStatus('');
    setFEtapa('');
    setFSearch('');
    setFAgenteId('');
    setFDataInicio(padrao.inicio);
    setFDataFim(padrao.fim);
    setFIncluirAbertasForaPeriodo(true);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const salvar = async () => {
    setSaving(true);
    setError('');
    try {
      if (editId) {
        const payloadEdicao = {
          clienteId: Number(form.clienteId),
          descricao: String(form.descricao || '').trim(),
        };
        await api.put(`/propostas/${editId}`, payloadEdicao);
      } else {
        const descricaoCotacao = montarDescricaoCotacao(form);
        const observacoesCotacao = montarObservacoesCotacao(form);

        const payloadCriacao = {
          ...form,
          clienteId: Number(form.clienteId),
          operadoraId: form.operadoraId ? Number(form.operadoraId) : null,
          idReserva: form.idReserva || null,
          tipoServico: form.tipoServico || 'PACOTE',
          descricao: form.descricao?.trim() ? form.descricao : descricaoCotacao,
          observacoes: observacoesCotacao,
          valorEstimado: 0,
          valorComissao: Number(form.valorComissao || 0),
          qtdPessoas: undefined,
          qtdCriancas: undefined,
          idadesCriancas: undefined,
        };

        await api.post('/propostas', payloadCriacao);
      }

      setModal(false);
      await carregar();
      await carregarFunil();
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar proposta.');
    } finally {
      setSaving(false);
    }
  };

  const abrirCadastroCliente = (prefill = null) => {
    setNovoCliente({
      nome: prefill?.nome || '',
      cpf: '',
      telefone: prefill?.telefone || '',
      email: prefill?.email || '',
    });
    setClienteError('');
    setClienteModal(true);
  };

  const aplicarContatoTicket = (contato) => {
    if (!contato) return;

    setBuscaCliente('');
    if (contato.clienteId) {
      setForm((prev) => ({ ...prev, clienteId: String(contato.clienteId) }));
      return { modo: 'cliente-vinculado', clienteId: String(contato.clienteId) };
    }

    const telefoneContato = normalizarTelefone(contato.telefone);
    if (telefoneContato) {
      const clienteEncontrado = clientes.find((item) => normalizarTelefone(item.telefone) === telefoneContato);
      if (clienteEncontrado?.id) {
        setForm((prev) => ({ ...prev, clienteId: String(clienteEncontrado.id) }));
        return {
          modo: 'cliente-existente-telefone',
          clienteId: String(clienteEncontrado.id),
          clienteNome: clienteEncontrado.nome,
        };
      }
    }

    abrirCadastroCliente({
      nome: contato.nome || '',
      telefone: contato.telefone || '',
      email: '',
    });

    return { modo: 'novo-cliente' };
  };

  const buscarContatoPorTicket = async () => {
    const ticketId = String(ticketBusca || '').trim();
    if (!ticketId) {
      setTicketError('Informe o numero do ticket.');
      return;
    }

    setTicketLoading(true);
    setTicketError('');
    try {
      const { data } = await api.post('/whatsapp/chatbot/importar-contato', { ticketId });
      const contato = data?.contato;
      if (!contato?.telefone) {
        setTicketError('Ticket encontrado, mas sem telefone para importar.');
        return;
      }

      const resultado = aplicarContatoTicket({
        nome: contato.nome || 'Contato sem nome',
        telefone: contato.telefone,
        clienteId: null,
      });

      const proximoForm = {
        ...form,
        ...(resultado?.clienteId ? { clienteId: resultado.clienteId } : {}),
      };
      setTimeout(() => focarPrimeiroObrigatorioPendente(proximoForm), 80);

      if (resultado?.modo === 'cliente-existente-telefone' || resultado?.modo === 'cliente-vinculado') {
        const clienteId = resultado?.clienteId;
        const cliente = clientes.find((item) => String(item.id) === String(clienteId));
        setTicketResultado({
          ticketId,
          nome: contato.nome || cliente?.nome || 'Contato sem nome',
          telefone: contato.telefone,
          clienteNome: cliente?.nome || resultado?.clienteNome || null,
          selecionadoAutomaticamente: true,
        });
      } else {
        setTicketResultado({
          ticketId,
          nome: contato.nome || 'Contato sem nome',
          telefone: contato.telefone,
          clienteNome: null,
          selecionadoAutomaticamente: false,
        });
      }
    } catch (e) {
      setTicketError(e.response?.data?.error || 'Nao foi possivel importar este ticket.');
      setTicketResultado(null);
    } finally {
      setTicketLoading(false);
    }
  };

  const salvarNovoCliente = async () => {
    setClienteSaving(true);
    setClienteError('');
    try {
      const payload = {
        nome: novoCliente.nome,
        // Backend atual exige CPF; quando vazio, usamos identificador tecnico temporario.
        cpf: novoCliente.cpf || gerarCpfTemporario(),
        telefone: novoCliente.telefone || undefined,
        email: novoCliente.email || undefined,
      };

      const { data } = await api.post('/clientes', payload);
      await carregarOpcoes();
      setForm((prev) => ({ ...prev, clienteId: String(data.id) }));
      setClienteModal(false);
      const proximoForm = { ...form, clienteId: String(data.id) };
      setTimeout(() => focarPrimeiroObrigatorioPendente(proximoForm), 80);
    } catch (e) {
      setClienteError(e.response?.data?.error || 'Erro ao cadastrar cliente.');
    } finally {
      setClienteSaving(false);
    }
  };

  const fecharGerandoVenda = async (id) => {
    if (!confirm('Fechar proposta e gerar venda automaticamente?')) return;

    try {
      await api.patch(`/propostas/${id}/fechar`);
      await carregar();
      await carregarFunil();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao fechar proposta.');
    }
  };

  const abrirConverterVenda = (proposta) => {
    setConverterModal({
      aberto: true,
      propostaId: proposta.id,
      clienteNome: proposta.cliente?.nome || '-',
      operadoraId: proposta.operadoraId ? String(proposta.operadoraId) : '',
      idReserva: proposta.idReserva || '',
      valorComissao: proposta.valorComissao ? String(proposta.valorComissao) : '',
      dataViagemInicio: proposta.dataViagemInicio ? proposta.dataViagemInicio.split('T')[0] : '',
      dataViagemFim: proposta.dataViagemFim ? proposta.dataViagemFim.split('T')[0] : '',
      observacoes: proposta.observacoes || '',
      salvando: false,
      erro: '',
    });
  };

  const confirmarConverterVenda = async () => {
    if (!converterModal.operadoraId || !converterModal.idReserva.trim()) {
      setConverterModal((prev) => ({
        ...prev,
        erro: 'Informe Operadora e ID da Reserva para converter em venda.',
      }));
      return;
    }

    setConverterModal((prev) => ({ ...prev, salvando: true, erro: '' }));
    try {
      await api.put(`/propostas/${converterModal.propostaId}`, {
        operadoraId: Number(converterModal.operadoraId),
        idReserva: converterModal.idReserva.trim(),
        valorComissao: converterModal.valorComissao === '' ? 0 : Number(converterModal.valorComissao),
        dataViagemInicio: converterModal.dataViagemInicio || null,
        dataViagemFim: converterModal.dataViagemFim || null,
        observacoes: converterModal.observacoes || null,
      });

      await api.patch(`/propostas/${converterModal.propostaId}/fechar`);
      setConverterModal({
        aberto: false,
        propostaId: null,
        clienteNome: '',
        operadoraId: '',
        idReserva: '',
        valorComissao: '',
        dataViagemInicio: '',
        dataViagemFim: '',
        observacoes: '',
        salvando: false,
        erro: '',
      });
      await carregar();
      await carregarFunil();
    } catch (e) {
      setConverterModal((prev) => ({
        ...prev,
        salvando: false,
        erro: e.response?.data?.error || 'Erro ao converter reserva em venda.',
      }));
    }
  };

  const etapaDaProposta = (proposta) => {
    if (proposta.status === 'FECHADA') return 'VENDA';
    return normalizarEtapa(proposta.etapa);
  };

  const avancarEtapa = async (proposta) => {
    if (proposta.status !== 'ABERTA') return;

    const etapaAtual = etapaDaProposta(proposta);
    const proxima = proximaEtapaMap[etapaAtual];

    if (!proxima) return;
    if (etapaAtual === 'RESERVA') {
      abrirConverterVenda(proposta);
      return;
    }

    try {
      await api.put(`/propostas/${proposta.id}`, { etapa: proxima });
      await carregar();
      await carregarFunil();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao avancar etapa.');
    }
  };

  const voltarEtapa = async (proposta) => {
    if (proposta.status !== 'ABERTA') return;

    const etapaAtual = etapaDaProposta(proposta);
    const anterior = etapaAnteriorMap[etapaAtual];
    if (!anterior) return;

    try {
      await api.put(`/propostas/${proposta.id}`, { etapa: anterior });
      await carregar();
      await carregarFunil();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao voltar etapa.');
    }
  };

  const abrirReagendar = (proposta) => {
    setReagendarModal({
      aberto: true,
      propostaId: proposta.id,
      clienteNome: proposta.cliente?.nome || '-',
      proximaAcaoEm: proposta.proximaAcaoEm ? proposta.proximaAcaoEm.split('T')[0] : '',
      salvando: false,
      erro: '',
    });
  };

  const salvarReagendamento = async () => {
    if (!reagendarModal.proximaAcaoEm) {
      setReagendarModal((prev) => ({ ...prev, erro: 'Informe a data da proxima acao.' }));
      return;
    }

    setReagendarModal((prev) => ({ ...prev, salvando: true, erro: '' }));
    try {
      await api.put(`/propostas/${reagendarModal.propostaId}`, {
        proximaAcaoEm: reagendarModal.proximaAcaoEm,
      });
      setReagendarModal({ aberto: false, propostaId: null, clienteNome: '', proximaAcaoEm: '', salvando: false, erro: '' });
      await carregar();
    } catch (e) {
      setReagendarModal((prev) => ({
        ...prev,
        salvando: false,
        erro: e.response?.data?.error || 'Erro ao reagendar proxima acao.',
      }));
    }
  };

  const abrirModalPerda = (id) => {
    api.get('/propostas/motivos-perda').then((resp) => {
      setMotivosPerdaCadastro(resp.data || []);
    }).catch(() => {
      setMotivosPerdaCadastro([]);
    });

    setPerdaModal({
      aberto: true,
      propostaId: id,
      motivoPerdaId: '',
      salvando: false,
      erro: '',
    });
  };

  const excluirProposta = async (proposta) => {
    const etapaAtual = etapaDaProposta(proposta);
    const podeExcluir = etapaAtual === 'LEAD' || etapaAtual === 'COTACAO';

    if (!podeExcluir) {
      alert('Exclusao permitida apenas para propostas nas etapas LEAD ou COTACAO.');
      return;
    }

    if (!confirm(`Excluir a proposta do cliente ${proposta.cliente?.nome || 'selecionado'}?`)) return;

    try {
      await api.delete(`/propostas/${proposta.id}`);
      await carregar();
      await carregarFunil();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao excluir proposta.');
    }
  };

  const confirmarPerda = async () => {
    const motivoPerdaId = perdaModal.motivoPerdaId ? Number(perdaModal.motivoPerdaId) : null;

    if (!motivoPerdaId) {
      setPerdaModal((prev) => ({
        ...prev,
        erro: 'Selecione um motivo de perda.',
      }));
      return;
    }

    setPerdaModal((prev) => ({ ...prev, salvando: true, erro: '' }));
    try {
      await api.patch(`/propostas/${perdaModal.propostaId}/perder`, {
        motivoPerdaId,
      });
      setPerdaModal({ aberto: false, propostaId: null, motivoPerdaId: '', salvando: false, erro: '' });
      await carregar();
      await carregarFunil();
      const { data } = await api.get('/propostas/motivos-perda');
      setMotivosPerdaCadastro(data || []);
    } catch (e) {
      setPerdaModal((prev) => ({
        ...prev,
        salvando: false,
        erro: e.response?.data?.error || 'Erro ao marcar proposta como perdida.',
      }));
    }
  };

  const bloqueioSalvar =
    saving ||
    !form.clienteId ||
    (editId
      ? !String(form.descricao || '').trim()
      : (
        !form.dataViagemInicio
        || !form.dataViagemFim
        || toIntSafe(form.qtdPessoas, 0) <= 0
        || toIntSafe(form.qtdCriancas, 0) < 0
      ));

  const funilPorEtapa = ETAPAS.map((etapa) => {
    const item = (funil.porEtapa || []).find((et) => normalizarEtapa(et.etapa) === etapa);
    return item || { etapa, total: 0, abertas: 0, fechadas: 0, perdidas: 0, taxaConversao: 0 };
  });

  const crmColunas = ETAPAS.reduce((acc, etapa) => ({ ...acc, [etapa]: [] }), {});
  propostas
    .filter((p) => p.status !== 'PERDIDA')
    .forEach((p) => {
      const etapa = etapaDaProposta(p);
      if (crmColunas[etapa]) crmColunas[etapa].push(p);
    });

  const clientesFiltrados = clientes.filter((c) => {
    const q = buscaCliente.trim().toLowerCase();
    if (!q) return true;
    const nome = String(c.nome || '').toLowerCase();
    const cpf = String(c.cpf || '').toLowerCase();
    const email = String(c.email || '').toLowerCase();
    const telefone = String(c.telefone || '').toLowerCase();
    return nome.includes(q) || cpf.includes(q) || email.includes(q) || telefone.includes(q);
  });

  const propostasAbertasForaPeriodo = propostas.filter((p) => {
    if (p.status !== 'ABERTA') return false;
    if (!fDataInicio && !fDataFim) return false;

    const dataCriacao = new Date(p.dataCriacao);
    const inicio = fDataInicio ? new Date(`${fDataInicio}T00:00:00`) : null;
    const fim = fDataFim ? new Date(`${fDataFim}T23:59:59`) : null;

    if (inicio && dataCriacao < inicio) return true;
    if (fim && dataCriacao > fim) return true;
    return false;
  });

  const horasRestantesValidade = (proposta) => {
    const inicio = new Date(proposta?.dataCriacao || 0).getTime();
    if (!inicio) return -999;
    const limite = inicio + VALIDADE_PROPOSTA_HORAS * 60 * 60 * 1000;
    return (limite - Date.now()) / (60 * 60 * 1000);
  };

  const propostasAbertas = propostas.filter((p) => p.status === 'ABERTA');
  const followupsAVencer = propostasAbertas
    .map((p) => ({ ...p, horasRestantes: horasRestantesValidade(p) }))
    .filter((p) => p.horasRestantes > 0 && p.horasRestantes <= VALIDADE_PROPOSTA_HORAS)
    .sort((a, b) => a.horasRestantes - b.horasRestantes);

  const followupsVencidas240h = propostasAbertas
    .map((p) => ({ ...p, horasRestantes: horasRestantesValidade(p) }))
    .filter((p) => p.horasRestantes <= 0 && p.horasRestantes >= -JANELA_VENCIDAS_HORAS)
    .sort((a, b) => b.horasRestantes - a.horasRestantes);

  const abrirWhatsAppFollowup = (proposta) => {
    const telefone = normalizarTelefone(proposta?.cliente?.telefone);
    if (!telefone || telefone.length < 10) {
      alert('Cliente sem telefone valido para WhatsApp.');
      return;
    }

    setWhatsModal({
      aberto: true,
      propostaId: proposta.id,
      clienteNome: proposta?.cliente?.nome || 'Cliente',
      telefone,
      ticketId: String(proposta?.ticketId || ''),
      mensagem: `Ola ${proposta?.cliente?.nome || ''}, tudo bem? Estou retornando sobre a proposta #${proposta.id}. Posso te ajudar a concluir hoje?`,
      enviando: false,
      erro: '',
    });
  };

  const enviarMensagemFollowup = async () => {
    const mensagem = String(whatsModal.mensagem || '').trim();
    if (!mensagem) {
      setWhatsModal((prev) => ({ ...prev, erro: 'Digite a mensagem antes de enviar.' }));
      return;
    }

    const telefone = normalizarTelefone(whatsModal.telefone);
    const ticketId = String(whatsModal.ticketId || '').trim();
    if (!telefone && !ticketId) {
      setWhatsModal((prev) => ({ ...prev, erro: 'Informe telefone ou ticketId para envio.' }));
      return;
    }

    setWhatsModal((prev) => ({ ...prev, enviando: true, erro: '' }));
    try {
      await api.post('/whatsapp/chatbot/enviar-mensagem', {
        number: telefone || undefined,
        ticketId: ticketId || undefined,
        mensagem,
        propostaId: whatsModal.propostaId,
      });

      setWhatsModal({
        aberto: false,
        propostaId: null,
        clienteNome: '',
        telefone: '',
        ticketId: '',
        mensagem: '',
        enviando: false,
        erro: '',
      });
      alert('Mensagem enviada com sucesso via ChatBot.');
    } catch (e) {
      setWhatsModal((prev) => ({
        ...prev,
        enviando: false,
        erro: e.response?.data?.error || 'Nao foi possivel enviar mensagem via ChatBot.',
      }));
    }
  };

  const propostasConvertidasEmVenda = propostas.filter((p) => p.status === 'FECHADA' || (Array.isArray(p.vendas) && p.vendas.length > 0));

  const clienteSelecionado = clientes.find((c) => String(c.id) === String(form.clienteId));

  return (
    <div>
      <div className="page-header">
        <h1>CRM de Propostas</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={abrirCriar}>+ Nova Oportunidade</button>
        </div>
      </div>

      <div className="alert" style={{ marginBottom: 12 }}>
        Fluxo rapido: 1) Clique em Nova Oportunidade 2) Busque pelo numero do ticket 3) Confira cliente selecionado automaticamente 4) Preencha datas e salve.
      </div>

      <div className="filters">
        <select className="form-control" style={{ width: 170 }} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS.map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
        </select>

        <select className="form-control" style={{ width: 170 }} value={fEtapa} onChange={(e) => setFEtapa(e.target.value)}>
          <option value="">Todas as etapas</option>
          {ETAPAS.map((e) => <option key={e} value={e}>{etapaLabel[e]}</option>)}
        </select>

        {isAdmin && (
          <select className="form-control" style={{ width: 220 }} value={fAgenteId} onChange={(e) => setFAgenteId(e.target.value)}>
            <option value="">Todos os agentes</option>
            {agentes.map((ag) => <option key={ag.id} value={ag.id}>{ag.nome}</option>)}
          </select>
        )}

        <input
          type="date"
          className="form-control"
          style={{ width: 170 }}
          value={fDataInicio}
          onChange={(e) => setFDataInicio(e.target.value)}
          title="Data inicial"
        />

        <input
          type="date"
          className="form-control"
          style={{ width: 170 }}
          value={fDataFim}
          onChange={(e) => setFDataFim(e.target.value)}
          title="Data final"
        />

        <input
          className="form-control"
          style={{ width: 240 }}
          placeholder="Buscar por cliente, reserva ou descricao"
          value={fSearch}
          onChange={(e) => setFSearch(e.target.value)}
        />

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-muted)' }}>
          <input
            type="checkbox"
            checked={fIncluirAbertasForaPeriodo}
            onChange={(e) => setFIncluirAbertasForaPeriodo(e.target.checked)}
          />
          Incluir abertas fora do periodo
        </label>

        <button className="btn btn-outline" onClick={limparFiltros}>Limpar filtros</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      {fIncluirAbertasForaPeriodo && propostasAbertasForaPeriodo.length > 0 && (
        <div className="alert" style={{ marginBottom: 12 }}>
          <strong>Lembrete CRM:</strong> existem {propostasAbertasForaPeriodo.length} oportunidade(s) em aberto fora do periodo selecionado.
          {' '}Use o botao <strong>Reagendar</strong> no Kanban para definir a proxima acao.
        </div>
      )}

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h3 style={{ marginBottom: 10 }}>Follow-up de validade (24h)</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            A vencer (ate 24h): <strong>{followupsAVencer.length}</strong> | Vencidas nas ultimas {JANELA_VENCIDAS_HORAS}h: <strong>{followupsVencidas240h.length}</strong>
          </div>

          {!followupsAVencer.length && !followupsVencidas240h.length ? (
            <div className="empty-state" style={{ minHeight: 80 }}>Nenhuma proposta aberta em janela critica de validade.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {followupsVencidas240h.length > 0 && (
                <>
                  <div style={{ fontWeight: 600, color: 'var(--danger)' }}>Vencidas (ultimas {JANELA_VENCIDAS_HORAS}h)</div>
                  {followupsVencidas240h.slice(0, 10).map((p) => {
                    const etapaAtual = etapaDaProposta(p);
                    const podeExcluir = etapaAtual === 'LEAD' || etapaAtual === 'COTACAO';
                    return (
                      <div key={`followup-vencida-${p.id}`} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, background: '#fff5f5', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.cliente?.nome || 'Sem cliente'} | Proposta #{p.id}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vencida ha {Math.abs(p.horasRestantes).toFixed(1)}h</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-sm btn-success" onClick={() => abrirWhatsAppFollowup(p)}>WhatsApp</button>
                          <button className="btn btn-sm btn-outline" onClick={() => navigate(`/propostas/${p.id}/orcamentos`)}>Orcamentos</button>
                          <button className="btn btn-sm btn-outline" onClick={() => abrirReagendar(p)}>Reagendar</button>
                          <button className="btn btn-sm btn-danger" disabled={!podeExcluir} title={podeExcluir ? 'Excluir proposta' : 'Exclusao permitida apenas em LEAD ou COTACAO'} onClick={() => excluirProposta(p)}>Excluir</button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {followupsAVencer.length > 0 && (
                <>
                  <div style={{ fontWeight: 600, color: 'var(--warning)' }}>A vencer (proximas 24h)</div>
                  {followupsAVencer.slice(0, 10).map((p) => {
                    const etapaAtual = etapaDaProposta(p);
                    const podeExcluir = etapaAtual === 'LEAD' || etapaAtual === 'COTACAO';
                    const critico = p.horasRestantes <= 6;
                    return (
                      <div key={`followup-a-vencer-${p.id}`} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, background: critico ? '#fff7e6' : 'var(--surface2)', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.cliente?.nome || 'Sem cliente'} | Proposta #{p.id}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {critico ? 'Critico: ' : ''}Vence em {p.horasRestantes.toFixed(1)}h
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-sm btn-success" onClick={() => abrirWhatsAppFollowup(p)}>WhatsApp</button>
                          <button className="btn btn-sm btn-outline" onClick={() => navigate(`/propostas/${p.id}/orcamentos`)}>Orcamentos</button>
                          <button className="btn btn-sm btn-outline" onClick={() => abrirReagendar(p)}>Reagendar</button>
                          <button className="btn btn-sm btn-danger" disabled={!podeExcluir} title={podeExcluir ? 'Excluir proposta' : 'Exclusao permitida apenas em LEAD ou COTACAO'} onClick={() => excluirProposta(p)}>Excluir</button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 }}>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total no periodo</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{funil.resumo?.total || 0}</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Taxa de ganho</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--success)' }}>{funil.resumo?.taxaConversaoGeral || 0}%</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Perda geral</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--danger)' }}>{funil.resumo?.taxaPerdaGeral || 0}%</div>
        </div>
        <div className="card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Fechadas</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{funil.resumo?.fechadas || 0}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h3 style={{ marginBottom: 10 }}>Pipeline CRM por etapa</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 10 }}>
          {funilPorEtapa.map((et) => (
            <div key={et.etapa} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: 'var(--surface2)' }}>
              <div style={{ fontWeight: 700 }}>{etapaLabel[et.etapa] || et.etapa}</div>
              <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-muted)' }}>Total: {et.total}</div>
              <div style={{ marginTop: 4, fontSize: 13 }}>Abertas: {et.abertas}</div>
              <div style={{ marginTop: 4, fontSize: 13, color: 'var(--success)' }}>Fechadas: {et.fechadas}</div>
              <div style={{ marginTop: 4, fontSize: 13, color: 'var(--danger)' }}>Perdidas: {et.perdidas}</div>
              <div style={{ marginTop: 8, fontWeight: 600 }}>Conversao: {et.taxaConversao}%</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h3 style={{ marginBottom: 10 }}>Visao operacional (Kanban CRM)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(220px, 1fr))', gap: 10, overflowX: 'auto' }}>
          {ETAPAS.map((etapa) => {
            const cards = crmColunas[etapa] || [];
            const totalValor = cards.reduce((acc, item) => acc + Number(item.valorEstimado || 0), 0);
            return (
              <div key={etapa} style={{ border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface2)', minHeight: 260 }}>
                <div style={{ padding: 10, borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700 }}>{etapaLabel[etapa]}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{cards.length} oportunidade(s) | {fmtCurr(totalValor)}</div>
                </div>
                <div style={{ padding: 10, display: 'grid', gap: 8, maxHeight: 520, overflowY: 'auto' }}>
                  {cards.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Sem oportunidades nesta etapa.</div>
                  ) : cards.map((p) => (
                    <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, background: 'var(--surface)' }}>
                      <div style={{ fontWeight: 600 }}>{p.cliente?.nome || 'Sem cliente'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{p.tipoServico} | {fmtCurr(p.valorEstimado)}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Em aberto ha {diasDesde(p.dataCriacao)} dia(s)</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Proxima acao: {p.proximaAcaoEm ? new Date(p.proximaAcaoEm).toLocaleDateString('pt-BR') : 'Nao definida'}
                      </div>
                      {p.status === 'ABERTA' && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(p)}>Editar</button>
                          <button className="btn btn-sm btn-outline" onClick={() => navigate(`/propostas/${p.id}/orcamentos`)}>Orcamentos</button>
                          <button className="btn btn-sm btn-danger" onClick={() => abrirModalPerda(p.id)}>Perdida</button>
                        </div>
                      )}
                      {p.status === 'ABERTA' && (
                        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={!etapaAnteriorMap[etapaDaProposta(p)]}
                            onClick={() => voltarEtapa(p)}
                            title="Voltar para a etapa anterior"
                          >
                            ← Voltar
                          </button>
                          <button
                            className="btn btn-sm btn-success"
                            disabled={!proximaEtapaMap[etapaDaProposta(p)]}
                            onClick={() => avancarEtapa(p)}
                            title={etapaDaProposta(p) === 'RESERVA' ? 'Converter reserva em venda' : 'Avancar para a proxima etapa'}
                          >
                            {etapaDaProposta(p) === 'RESERVA' ? '✓ Converter venda' : 'Avancar →'}
                          </button>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => abrirReagendar(p)}
                            title="Definir proxima data de acompanhamento"
                          >
                            Reagendar
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h3 style={{ marginBottom: 10 }}>Motivos de perda</h3>
        {funil.motivosPerda?.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {funil.motivosPerda.map((item) => (
              <div key={item.motivo} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border)', paddingBottom: 6 }}>
                <span>{item.motivo}</span>
                <strong>{item.quantidade}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ minHeight: 70 }}>Sem perdas no periodo selecionado.</div>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Reserva</th>
              <th>Etapa</th>
              <th>Status</th>
              <th>Valor Est.</th>
              <th>Comissao</th>
              <th>Agente</th>
              <th>Venda</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}><div className="loading"><div className="spinner" /></div></td></tr>
            ) : propostasConvertidasEmVenda.length === 0 ? (
              <tr><td colSpan={9}><div className="empty-state">Nenhuma proposta convertida em venda no periodo.</div></td></tr>
            ) : propostasConvertidasEmVenda.map((p) => {
              const vendaVinculada = p.vendas?.[0];
              const etapaAtual = etapaDaProposta(p);
              return (
              <tr key={p.id}>
                <td>
                  <strong>{p.cliente?.nome}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.tipoServico}</div>
                </td>
                <td>{p.idReserva || '-'}</td>
                <td><span className="badge badge-default">{etapaLabel[etapaAtual] || etapaAtual}</span></td>
                <td>
                  <span className={`badge ${p.status === 'FECHADA' ? 'badge-success' : p.status === 'PERDIDA' ? 'badge-danger' : 'badge-info'}`}>
                    {statusLabel[p.status] || p.status}
                  </span>
                </td>
                <td>{fmtCurr(p.valorEstimado)}</td>
                <td>{fmtCurr(p.valorComissao)}</td>
                <td>{p.agente?.nome || '-'}</td>
                <td>{vendaVinculada?.id ? `#${vendaVinculada.id}` : '-'}</td>
                <td>
                  <div className="actions">
                    {vendaVinculada?.id && (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => navigate(`/vendas?reserva=${encodeURIComponent(p.idReserva || '')}`)}
                      >
                        Abrir venda
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8, marginBottom: 4, fontSize: 13, color: 'var(--text-muted)' }}>
        Registro rapido de perda: ao clicar em <strong>Perdida</strong>, o sistema exige motivo e inclui nas metricas do funil.
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Pagina {pagination.page} de {pagination.totalPages} | Registros: {pagination.total}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            className="form-control"
            style={{ width: 100 }}
            value={pagination.pageSize}
            onChange={(e) => setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))}
          >
            {[10, 20, 50].map((size) => <option key={size} value={size}>{size}/pag</option>)}
          </select>
          <button className="btn btn-outline" disabled={pagination.page <= 1 || loading} onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}>Anterior</button>
          <button className="btn btn-outline" disabled={pagination.page >= pagination.totalPages || loading} onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}>Proxima</button>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <h3>{editId ? 'Editar Oportunidade' : 'Nova Solicitacao de Cotacao'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>x</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {!editId && (
              <div className="proposta-quick-panel">
                <div className="form-group form-full">
                  <label>Importar por numero do ticket (ChatBot)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      ref={ticketInputRef}
                      className="form-control"
                      placeholder="Ex.: 112848"
                      value={ticketBusca}
                      onChange={(e) => setTicketBusca(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          buscarContatoPorTicket();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={buscarContatoPorTicket}
                      disabled={ticketLoading}
                    >
                      {ticketLoading ? 'Buscando...' : 'Buscar Ticket'}
                    </button>
                  </div>
                  <small style={{ color: 'var(--text-muted)' }}>
                    Ao buscar o ticket, o sistema tenta selecionar automaticamente um cliente ja cadastrado pelo telefone.
                  </small>
                  {ticketError && <small style={{ color: 'var(--danger)' }}>{ticketError}</small>}
                </div>

                {ticketResultado && (
                  <div className="form-group form-full">
                    <div className="alert alert-success" style={{ marginBottom: 0 }}>
                      Ticket {ticketResultado.ticketId} importado: {ticketResultado.nome} ({ticketResultado.telefone}).
                      {ticketResultado.selecionadoAutomaticamente && ticketResultado.clienteNome
                        ? ` Cliente selecionado automaticamente: ${ticketResultado.clienteNome}.`
                        : ' Cliente nao encontrado; finalize o cadastro rapido para continuar.'}
                    </div>
                  </div>
                )}

                <div className="proposta-quick-grid">
                  <div className="form-group">
                    <label>Pesquisar cliente cadastrado</label>
                    <input
                      className="form-control"
                      placeholder="Buscar por nome, CPF, email ou telefone"
                      value={buscaCliente}
                      onChange={(e) => setBuscaCliente(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Cliente *</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select ref={clienteSelectRef} className="form-control" value={form.clienteId} onChange={f('clienteId')}>
                        <option value="">Selecione...</option>
                        {clientesFiltrados.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <button type="button" className="btn btn-success" onClick={abrirCadastroCliente}>+ Cliente</button>
                    </div>
                    {clienteSelecionado && (
                      <small style={{ color: 'var(--success)' }}>
                        Cliente selecionado: {clienteSelecionado.nome} {clienteSelecionado.telefone ? `| ${clienteSelecionado.telefone}` : ''}
                      </small>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="form-grid">
              {editId && (
                <>
                  <div className="form-group form-full">
                    <label>Pesquisar cliente cadastrado</label>
                    <input
                      className="form-control"
                      placeholder="Buscar por nome, CPF, email ou telefone"
                      value={buscaCliente}
                      onChange={(e) => setBuscaCliente(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label>Cliente *</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select className="form-control" value={form.clienteId} onChange={f('clienteId')}>
                        <option value="">Selecione...</option>
                        {clientesFiltrados.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                      </select>
                      <button type="button" className="btn btn-success" onClick={abrirCadastroCliente}>+ Cliente</button>
                    </div>
                  </div>
                </>
              )}

              {editId && (
                <div className="form-group">
                  <label>Etapa</label>
                  <select className="form-control" value={form.etapa} onChange={f('etapa')}>
                    {ETAPAS.map((e) => <option key={e} value={e}>{etapaLabel[e]}</option>)}
                  </select>
                </div>
              )}

              {!editId ? (
                <>
                  <div className="form-group">
                    <label>Qtd. de Pessoas *</label>
                    <input
                      ref={qtdPessoasRef}
                      type="number"
                      min="1"
                      className="form-control"
                      value={form.qtdPessoas}
                      onChange={f('qtdPessoas')}
                    />
                  </div>

                  <div className="form-group">
                    <label>Qtd. de Criancas *</label>
                    <input
                      ref={qtdCriancasRef}
                      type="number"
                      min="0"
                      className="form-control"
                      value={form.qtdCriancas}
                      onChange={f('qtdCriancas')}
                    />
                  </div>

                  <div className="form-group form-full">
                    <label>Idade das Criancas</label>
                    <input
                      className="form-control"
                      value={form.idadesCriancas}
                      onChange={f('idadesCriancas')}
                      placeholder="Ex.: 4, 7, 11"
                    />
                  </div>

                  <div className="form-group">
                    <label>Data da Viagem *</label>
                    <input ref={dataInicioRef} type="date" className="form-control" value={form.dataViagemInicio} onChange={f('dataViagemInicio')} />
                  </div>

                  <div className="form-group">
                    <label>Data da Volta *</label>
                    <input ref={dataFimRef} type="date" className="form-control" value={form.dataViagemFim} onChange={f('dataViagemFim')} />
                  </div>

                  <div className="form-group form-full">
                    <label>Observacao</label>
                    <textarea className="form-control" rows={3} value={form.observacoes} onChange={f('observacoes')} placeholder="Preferencias do cliente, destino, hotel, voo, etc." />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group form-full">
                    <label>Descricao *</label>
                    <textarea className="form-control" rows={2} value={form.descricao} onChange={f('descricao')} />
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={bloqueioSalvar}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Responsavel: <strong>{usuario?.nome || 'Usuario logado'}</strong> (automatico)
            </div>
          </div>
        </div>
      )}

      {clienteModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setClienteModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3>Novo Cliente Rapido</h3>
              <button className="btn-icon" onClick={() => setClienteModal(false)}>x</button>
            </div>

            {clienteError && <div className="alert alert-error">{clienteError}</div>}

            <div className="form-grid">
              <div className="form-group form-full">
                <label>Nome *</label>
                <input
                  className="form-control"
                  value={novoCliente.nome}
                  onChange={(e) => setNovoCliente((prev) => ({ ...prev, nome: e.target.value }))}
                  placeholder="Nome completo"
                />
              </div>
              <div className="form-group">
                <label>CPF</label>
                <input
                  className="form-control"
                  value={novoCliente.cpf}
                  onChange={(e) => setNovoCliente((prev) => ({ ...prev, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input
                  className="form-control"
                  value={novoCliente.telefone}
                  onChange={(e) => setNovoCliente((prev) => ({ ...prev, telefone: e.target.value }))}
                  placeholder="(11) 99999-0000"
                />
              </div>
              <div className="form-group form-full">
                <label>Email</label>
                <input
                  className="form-control"
                  type="email"
                  value={novoCliente.email}
                  onChange={(e) => setNovoCliente((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="cliente@email.com"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setClienteModal(false)}>Cancelar</button>
              <button
                className="btn btn-primary"
                onClick={salvarNovoCliente}
                disabled={clienteSaving || !novoCliente.nome}
              >
                {clienteSaving ? 'Salvando...' : 'Salvar Cliente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {perdaModal.aberto && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setPerdaModal({ aberto: false, propostaId: null, motivoPerdaId: '', salvando: false, erro: '' })}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Marcar proposta como perdida</h3>
              <button className="btn-icon" onClick={() => setPerdaModal({ aberto: false, propostaId: null, motivoPerdaId: '', salvando: false, erro: '' })}>x</button>
            </div>

            {perdaModal.erro && <div className="alert alert-error">{perdaModal.erro}</div>}

            <div className="form-group">
              <label>Motivo cadastrado</label>
              <select
                className="form-control"
                value={perdaModal.motivoPerdaId}
                onChange={(e) => setPerdaModal((prev) => ({ ...prev, motivoPerdaId: e.target.value }))}
              >
                <option value="">Selecione um motivo...</option>
                {motivosPerdaCadastro.map((motivo) => (
                  <option key={motivo.id} value={motivo.id}>{motivo.descricao}</option>
                ))}
              </select>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setPerdaModal({ aberto: false, propostaId: null, motivoPerdaId: '', salvando: false, erro: '' })}>Cancelar</button>
              <button className="btn btn-danger" disabled={perdaModal.salvando} onClick={confirmarPerda}>
                {perdaModal.salvando ? 'Salvando...' : 'Confirmar perda'}
              </button>
            </div>
          </div>
        </div>
      )}

      {converterModal.aberto && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setConverterModal((prev) => ({ ...prev, aberto: false }))}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>Converter Reserva em Venda</h3>
              <button className="btn-icon" onClick={() => setConverterModal((prev) => ({ ...prev, aberto: false }))}>x</button>
            </div>

            {converterModal.erro && <div className="alert alert-error">{converterModal.erro}</div>}

            <div className="form-grid">
              <div className="form-group form-full">
                <label>Cliente</label>
                <input className="form-control" value={converterModal.clienteNome} disabled />
              </div>

              <div className="form-group">
                <label>Operadora *</label>
                <select
                  className="form-control"
                  value={converterModal.operadoraId}
                  onChange={(e) => setConverterModal((prev) => ({ ...prev, operadoraId: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {operadoras.map((op) => <option key={op.id} value={op.id}>{op.nome}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>ID Reserva *</label>
                <input
                  className="form-control"
                  maxLength={20}
                  value={converterModal.idReserva}
                  onChange={(e) => setConverterModal((prev) => ({ ...prev, idReserva: e.target.value }))}
                  placeholder="Ex.: ABC12345"
                />
              </div>

              <div className="form-group">
                <label>Valor Comissao</label>
                <input
                  type="number"
                  step="0.01"
                  className="form-control"
                  value={converterModal.valorComissao}
                  onChange={(e) => setConverterModal((prev) => ({ ...prev, valorComissao: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Data Viagem Inicio</label>
                <input
                  type="date"
                  className="form-control"
                  value={converterModal.dataViagemInicio}
                  onChange={(e) => setConverterModal((prev) => ({ ...prev, dataViagemInicio: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Data Viagem Fim</label>
                <input
                  type="date"
                  className="form-control"
                  value={converterModal.dataViagemFim}
                  onChange={(e) => setConverterModal((prev) => ({ ...prev, dataViagemFim: e.target.value }))}
                />
              </div>

              <div className="form-group form-full">
                <label>Observacoes</label>
                <textarea
                  className="form-control"
                  rows={2}
                  value={converterModal.observacoes}
                  onChange={(e) => setConverterModal((prev) => ({ ...prev, observacoes: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setConverterModal((prev) => ({ ...prev, aberto: false }))}>Cancelar</button>
              <button className="btn btn-success" disabled={converterModal.salvando} onClick={confirmarConverterVenda}>
                {converterModal.salvando ? 'Convertendo...' : 'Confirmar conversao'}
              </button>
            </div>
          </div>
        </div>
      )}

      {reagendarModal.aberto && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setReagendarModal({ aberto: false, propostaId: null, clienteNome: '', proximaAcaoEm: '', salvando: false, erro: '' })}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3>Reagendar Proxima Acao</h3>
              <button className="btn-icon" onClick={() => setReagendarModal({ aberto: false, propostaId: null, clienteNome: '', proximaAcaoEm: '', salvando: false, erro: '' })}>x</button>
            </div>

            {reagendarModal.erro && <div className="alert alert-error">{reagendarModal.erro}</div>}

            <div className="form-grid">
              <div className="form-group form-full">
                <label>Cliente</label>
                <input className="form-control" disabled value={reagendarModal.clienteNome} />
              </div>
              <div className="form-group form-full">
                <label>Proxima acao em *</label>
                <input
                  type="date"
                  className="form-control"
                  value={reagendarModal.proximaAcaoEm}
                  onChange={(e) => setReagendarModal((prev) => ({ ...prev, proximaAcaoEm: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setReagendarModal({ aberto: false, propostaId: null, clienteNome: '', proximaAcaoEm: '', salvando: false, erro: '' })}>Cancelar</button>
              <button className="btn btn-primary" disabled={reagendarModal.salvando} onClick={salvarReagendamento}>
                {reagendarModal.salvando ? 'Salvando...' : 'Salvar Reagendamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {whatsModal.aberto && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setWhatsModal({ aberto: false, propostaId: null, clienteNome: '', telefone: '', ticketId: '', mensagem: '', enviando: false, erro: '' })}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>Enviar WhatsApp (ChatBot)</h3>
              <button className="btn-icon" onClick={() => setWhatsModal({ aberto: false, propostaId: null, clienteNome: '', telefone: '', ticketId: '', mensagem: '', enviando: false, erro: '' })}>x</button>
            </div>

            {whatsModal.erro && <div className="alert alert-error">{whatsModal.erro}</div>}

            <div className="form-grid">
              <div className="form-group form-full">
                <label>Cliente</label>
                <input className="form-control" disabled value={whatsModal.clienteNome} />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input
                  className="form-control"
                  value={whatsModal.telefone}
                  onChange={(e) => setWhatsModal((prev) => ({ ...prev, telefone: e.target.value }))}
                  placeholder="5511999999999"
                />
              </div>
              <div className="form-group">
                <label>Ticket ID (opcional)</label>
                <input
                  className="form-control"
                  value={whatsModal.ticketId}
                  onChange={(e) => setWhatsModal((prev) => ({ ...prev, ticketId: e.target.value }))}
                  placeholder="Ex.: 12345"
                />
              </div>
              <div className="form-group form-full">
                <label>Mensagem *</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={whatsModal.mensagem}
                  onChange={(e) => setWhatsModal((prev) => ({ ...prev, mensagem: e.target.value }))}
                  placeholder="Digite a mensagem de follow-up"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setWhatsModal({ aberto: false, propostaId: null, clienteNome: '', telefone: '', ticketId: '', mensagem: '', enviando: false, erro: '' })}>Cancelar</button>
              <button className="btn btn-success" disabled={whatsModal.enviando} onClick={enviarMensagemFollowup}>
                {whatsModal.enviando ? 'Enviando...' : 'Enviar agora via ChatBot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
