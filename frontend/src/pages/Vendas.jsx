import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';

const TIPOS = ['AEREO','HOTEL','PACOTE','CRUZEIRO','RODOVIARIO','SEGURO_VIAGEM','OUTROS'];
const STATUS_VENDA = ['ABERTA','PAGA','CANCELADA'];
const FORMAS_PAGAMENTO = ['CARTAO', 'BOLETO', 'PIX', 'OPERADORA'];
const ACOES_POS_VENDA = ['TROCA_RESERVA','CANCELAMENTO','EMISSAO_VOUCHER','ENTREGA_BRINDE','CHECKIN_VOO'];
const ACOES_POS_VENDA_LABEL = {
  TROCA_RESERVA: 'Troca de Reserva',
  CANCELAMENTO: 'Cancelamento',
  EMISSAO_VOUCHER: 'Emissao de Voucher',
  ENTREGA_BRINDE: 'Entrega de Brinde',
  CHECKIN_VOO: 'Check-in / Voo',
};
const MODELOS_POS_VENDA = {
  BASICO: [
    { tipoAcao: 'EMISSAO_VOUCHER', descricao: 'Emitir voucher e validar dados finais com o cliente.' },
    { tipoAcao: 'CHECKIN_VOO', descricao: 'Agendar lembrete de check-in e envio de orientacoes.' },
  ],
  PACOTE: [
    { tipoAcao: 'EMISSAO_VOUCHER', descricao: 'Emitir vouchers (hotel, traslado e servicos do pacote).' },
    { tipoAcao: 'ENTREGA_BRINDE', descricao: 'Separar e registrar entrega de kit/brinde da viagem.' },
    { tipoAcao: 'CHECKIN_VOO', descricao: 'Programar suporte de check-in e contato pre-embarque.' },
  ],
  AEREO: [
    { tipoAcao: 'CHECKIN_VOO', descricao: 'Agendar aviso de check-in e confirmar regras de bagagem.' },
    { tipoAcao: 'EMISSAO_VOUCHER', descricao: 'Enviar localizador, e-ticket e comprovantes da emissao.' },
  ],
  HOTEL: [
    { tipoAcao: 'EMISSAO_VOUCHER', descricao: 'Emitir voucher de hospedagem e confirmar politica de cancelamento.' },
    { tipoAcao: 'TROCA_RESERVA', descricao: 'Monitorar ajustes de acomodacao solicitados pelo cliente.' },
  ],
  CRUZEIRO: [
    { tipoAcao: 'EMISSAO_VOUCHER', descricao: 'Enviar comprovantes e documentacao de embarque do cruzeiro.' },
    { tipoAcao: 'CHECKIN_VOO', descricao: 'Acompanhar prazos de check-in online da companhia maritima.' },
  ],
  RODOVIARIO: [
    { tipoAcao: 'EMISSAO_VOUCHER', descricao: 'Enviar bilhete/confirmacao e orientacoes de embarque.' },
  ],
  SEGURO_VIAGEM: [
    { tipoAcao: 'EMISSAO_VOUCHER', descricao: 'Enviar apolice e canais de acionamento do seguro.' },
  ],
  OUTROS: [
    { tipoAcao: 'EMISSAO_VOUCHER', descricao: 'Registrar entrega de comprovantes e condicoes contratadas.' },
  ],
};
const empty = {
  clienteId:'',
  operadoraId:'',
  idReserva:'',
  tipoServico:'PACOTE',
  descricao:'',
  observacoes:'',
  valorTotal:'',
  valorComissao:'',
  status:'ABERTA',
  dataViagemInicio:'',
  dataViagemFim:'',
  pagamentos: [{ formaPagamento: 'PIX', valor: '', dataVencimento: '' }],
};

const statusBadge = { ABERTA:'badge-info', PAGA:'badge-success', CANCELADA:'badge-danger' };
const fmtCurr = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const fmtFormaPagamento = (forma) => ({
  CARTAO: 'Cartao',
  BOLETO: 'Boleto',
  PIX: 'Pix',
  OPERADORA: 'Operadora',
}[forma] || forma || '—');

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    inicio: toInputDate(firstDay),
    fim: toInputDate(lastDay),
  };
};

const montarAcoesDoModelo = ({ modelo, venda, responsavelPadrao }) => {
  const modeloEscolhido = modelo === 'AUTO_LOCAL'
    ? (MODELOS_POS_VENDA[venda?.tipoServico] ? venda?.tipoServico : 'BASICO')
    : modelo;

  const base = MODELOS_POS_VENDA[modeloEscolhido] || MODELOS_POS_VENDA.BASICO;

  return base.map((item) => ({
    tipoAcao: item.tipoAcao,
    descricao: item.descricao,
    dataAcao: '',
    responsavel: responsavelPadrao || '',
  }));
};

const montarAcoesDoCadastro = ({ itens = [], responsavelPadrao }) => itens.map((item) => ({
  tipoAcao: item.tipoAcao,
  descricao: item.descricaoPadrao || '',
  dataAcao: '',
  responsavel: responsavelPadrao || '',
}));

export default function Vendas() {
  const { usuario, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const intervaloPadrao = getCurrentMonthRange();
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [operadoras, setOperadoras] = useState([]);
  const [agentes, setAgentes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [anexoPdfFile, setAnexoPdfFile] = useState(null);
  const [anexoAtual, setAnexoAtual] = useState(null);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ABERTA');
  const [filtroClienteNome, setFiltroClienteNome] = useState('');
  const [filtroClienteNomeDebounced, setFiltroClienteNomeDebounced] = useState('');
  const [filtroOperadoraId, setFiltroOperadoraId] = useState('');
  const [filtroAgenteId, setFiltroAgenteId] = useState('');
  const [filtroReserva, setFiltroReserva] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState(intervaloPadrao.inicio);
  const [filtroDataFim, setFiltroDataFim] = useState(intervaloPadrao.fim);
  const [modalPosVenda, setModalPosVenda] = useState(false);
  const [vendaPosVenda, setVendaPosVenda] = useState(null);
  const [acoesPosVenda, setAcoesPosVenda] = useState([{ tipoAcao: 'EMISSAO_VOUCHER', descricao: '', dataAcao: '', responsavel: '' }]);
  const [modeloPosVenda, setModeloPosVenda] = useState('CADASTRO');
  const [origemModeloPosVenda, setOrigemModeloPosVenda] = useState('');
  const [loadingModeloPosVenda, setLoadingModeloPosVenda] = useState(false);
  const [savingPosVenda, setSavingPosVenda] = useState(false);
  const [errorPosVenda, setErrorPosVenda] = useState('');

  const montarFiltros = () => ({
    status: filtroStatus || undefined,
    clienteNome: filtroClienteNomeDebounced || undefined,
    operadoraId: filtroOperadoraId || undefined,
    agenteId: isAdmin ? (filtroAgenteId || undefined) : undefined,
    idReserva: filtroReserva || undefined,
    dataVendaInicio: filtroDataInicio || undefined,
    dataVendaFim: filtroDataFim || undefined,
  });

  useEffect(() => {
    const reservaFromUrl = searchParams.get('reserva');
    if (reservaFromUrl) {
      setFiltroReserva(reservaFromUrl);
    }
  }, [searchParams]);

  const carregarVendas = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/vendas', {
        params: {
          ...montarFiltros(),
          page: pagination.page,
          pageSize: pagination.pageSize,
        },
      });

      if (Array.isArray(data)) {
        setVendas(data);
        setPagination((prev) => ({
          ...prev,
          total: data.length,
          totalPages: 1,
        }));
      } else {
        setVendas(data.items || []);
        setPagination((prev) => ({
          ...prev,
          ...(data.pagination || {}),
        }));
      }
    } finally { setLoading(false); }
  };

  const carregarOpcoes = async () => {
    const requisicoes = [api.get('/clientes'), api.get('/operadoras')];
    if (isAdmin) {
      requisicoes.push(api.get('/usuarios'));
    }

    const [c, o, u] = await Promise.all(requisicoes);
    setClientes(c.data);
    setOperadoras(o.data);

    if (isAdmin && u?.data) {
      setAgentes(u.data.filter((usuarioItem) => usuarioItem.perfil === 'AGENTE' && usuarioItem.ativo));
    }
  };

  useEffect(() => {
    carregarOpcoes();
  }, [isAdmin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltroClienteNomeDebounced(filtroClienteNome);
    }, 300);

    return () => clearTimeout(timer);
  }, [filtroClienteNome]);

  useEffect(() => {
    carregarVendas();
  }, [filtroStatus, filtroClienteNomeDebounced, filtroOperadoraId, filtroAgenteId, filtroReserva, filtroDataInicio, filtroDataFim, pagination.page, pagination.pageSize]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [filtroStatus, filtroClienteNomeDebounced, filtroOperadoraId, filtroAgenteId, filtroReserva, filtroDataInicio, filtroDataFim]);

  const abrirCriar = () => {
    setForm(empty);
    setAnexoPdfFile(null);
    setAnexoAtual(null);
    setEditId(null);
    setError('');
    setModal(true);
  };
  const abrirEditar = (v) => {
    setForm({
      clienteId: v.clienteId,
      operadoraId: v.operadoraId,
      idReserva: v.idReserva || '',
      tipoServico: v.tipoServico, descricao: v.descricao,
      observacoes: v.observacoes || '',
      valorTotal: v.valorTotal,
      valorComissao: v.valorComissao,
      status: v.status,
      dataViagemInicio: v.dataViagemInicio ? v.dataViagemInicio.split('T')[0] : '',
      dataViagemFim: v.dataViagemFim ? v.dataViagemFim.split('T')[0] : '',
      pagamentos: v.pagamentos?.length
        ? v.pagamentos.map((p) => ({
            formaPagamento: p.formaPagamento,
            valor: Number(p.valor),
            dataVencimento: p.dataVencimento ? p.dataVencimento.split('T')[0] : '',
          }))
        : [{ formaPagamento: 'PIX', valor: '', dataVencimento: '' }],
    });
    setAnexoPdfFile(null);
    setAnexoAtual(v.anexoPdfPath ? { nome: v.anexoPdfNome || 'anexo.pdf', path: v.anexoPdfPath } : null);
    setEditId(v.id); setError(''); setModal(true);
  };

  const carregarModeloCadastro = async (venda, responsavelPadrao) => {
    const { data } = await api.get('/modelos-pos-venda/resolver', {
      params: {
        tipoServico: venda?.tipoServico,
        operadoraId: venda?.operadoraId || undefined,
      },
    });

    const itens = data?.itens || [];
    if (!itens.length) {
      return null;
    }

    return {
      origem: data?.origem || 'CADASTRO',
      itens: montarAcoesDoCadastro({ itens, responsavelPadrao }),
    };
  };

  const abrirModalPosVenda = async (venda) => {
    const responsavelPadrao = usuario?.nome || '';
    setVendaPosVenda(venda);
    setModeloPosVenda('CADASTRO');
    setLoadingModeloPosVenda(true);

    try {
      const modeloCadastro = await carregarModeloCadastro(venda, responsavelPadrao);
      if (modeloCadastro) {
        setAcoesPosVenda(modeloCadastro.itens);
        setOrigemModeloPosVenda(modeloCadastro.origem === 'OPERADORA' ? 'Cadastro da operadora' : 'Cadastro padrao');
      } else {
        setAcoesPosVenda(montarAcoesDoModelo({ modelo: 'AUTO_LOCAL', venda, responsavelPadrao }));
        setOrigemModeloPosVenda('Template local (fallback)');
      }
    } catch {
      setAcoesPosVenda(montarAcoesDoModelo({ modelo: 'AUTO_LOCAL', venda, responsavelPadrao }));
      setOrigemModeloPosVenda('Template local (fallback)');
    } finally {
      setLoadingModeloPosVenda(false);
    }

    setErrorPosVenda('');
    setModalPosVenda(true);
  };

  const aplicarModeloPosVenda = async () => {
    const responsavelPadrao = usuario?.nome || '';
    setLoadingModeloPosVenda(true);
    setErrorPosVenda('');

    try {
      if (modeloPosVenda === 'CADASTRO') {
        const modeloCadastro = await carregarModeloCadastro(vendaPosVenda, responsavelPadrao);
        if (modeloCadastro) {
          setAcoesPosVenda(modeloCadastro.itens);
          setOrigemModeloPosVenda(modeloCadastro.origem === 'OPERADORA' ? 'Cadastro da operadora' : 'Cadastro padrao');
        } else {
          setAcoesPosVenda(montarAcoesDoModelo({ modelo: 'AUTO_LOCAL', venda: vendaPosVenda, responsavelPadrao }));
          setOrigemModeloPosVenda('Template local (fallback)');
          setErrorPosVenda('Nao ha cadastro para esse tipo/operadora. Foi aplicado o template local.');
        }
      } else {
        setAcoesPosVenda(
          montarAcoesDoModelo({
            modelo: modeloPosVenda,
            venda: vendaPosVenda,
            responsavelPadrao,
          }),
        );
        setOrigemModeloPosVenda('Template local');
      }
    } catch {
      setErrorPosVenda('Erro ao carregar modelo de pos-venda.');
    } finally {
      setLoadingModeloPosVenda(false);
    }
  };

  const atualizarAcaoPosVenda = (idx, key, value) => {
    const proximo = [...acoesPosVenda];
    proximo[idx] = { ...proximo[idx], [key]: value };
    setAcoesPosVenda(proximo);
  };

  const adicionarAcaoPosVenda = () => {
    setAcoesPosVenda((prev) => [
      ...prev,
      { tipoAcao: 'EMISSAO_VOUCHER', descricao: '', dataAcao: '', responsavel: usuario?.nome || '' },
    ]);
  };

  const removerAcaoPosVenda = (idx) => {
    if (acoesPosVenda.length === 1) return;
    setAcoesPosVenda((prev) => prev.filter((_, index) => index !== idx));
  };

  const salvarPosVenda = async () => {
    if (!vendaPosVenda?.id) return;

    const possuiInvalida = acoesPosVenda.some((acao) => !acao.tipoAcao || !acao.descricao?.trim() || !acao.responsavel?.trim());
    if (possuiInvalida) {
      setErrorPosVenda('Preencha tipo, descricao e responsavel em todas as acoes.');
      return;
    }

    setSavingPosVenda(true);
    setErrorPosVenda('');
    try {
      await Promise.all(
        acoesPosVenda.map((acao) => api.post('/pos-venda', {
          vendaId: vendaPosVenda.id,
          tipoAcao: acao.tipoAcao,
          descricao: acao.descricao.trim(),
          dataAcao: acao.dataAcao || undefined,
          responsavel: acao.responsavel.trim(),
        })),
      );
      setModalPosVenda(false);
    } catch (e) {
      setErrorPosVenda(e.response?.data?.error || 'Erro ao salvar acoes de pos-venda.');
    } finally {
      setSavingPosVenda(false);
    }
  };

  const salvar = async () => {
    setError(''); setSaving(true);
    try {
      const pagamentos = form.status === 'PAGA'
        ? form.pagamentos.map((p) => ({
            formaPagamento: p.formaPagamento,
            valor: Number(p.valor),
            dataVencimento: p.dataVencimento,
          }))
        : [];

      const payload = {
        ...form,
        clienteId: Number(form.clienteId),
        operadoraId: Number(form.operadoraId),
        valorTotal: Number(form.valorTotal),
        valorComissao: Number(form.valorComissao),
        idReserva: form.idReserva.trim(),
        pagamentos,
      };
      let response;
      if (editId) response = await api.put(`/vendas/${editId}`, payload);
      else response = await api.post('/vendas', payload);

      const vendaSalva = response?.data;

      if (anexoPdfFile && vendaSalva?.id) {
        const formData = new FormData();
        formData.append('arquivo', anexoPdfFile);
        await api.post(`/vendas/${vendaSalva.id}/anexo-pdf`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      setModal(false);
      setAnexoPdfFile(null);
      await carregarVendas();

      if (payload.status === 'PAGA' && vendaSalva?.id) {
        await abrirModalPosVenda(vendaSalva);
      }
    } catch (e) { setError(e.response?.data?.error || 'Erro ao salvar.'); }
    finally { setSaving(false); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir esta venda?')) return;
    try { await api.delete(`/vendas/${id}`); carregarVendas(); }
    catch (e) { alert(e.response?.data?.error || 'Erro ao excluir.'); }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const atualizarPagamento = (idx, key, value) => {
    const pagamentos = [...form.pagamentos];
    pagamentos[idx] = { ...pagamentos[idx], [key]: value };
    setForm({ ...form, pagamentos });
  };
  const adicionarPagamento = () => {
    setForm({
      ...form,
      pagamentos: [...form.pagamentos, { formaPagamento: 'PIX', valor: '', dataVencimento: '' }],
    });
  };
  const removerPagamento = (idx) => {
    if (form.pagamentos.length === 1) return;
    setForm({
      ...form,
      pagamentos: form.pagamentos.filter((_, index) => index !== idx),
    });
  };

  const pagamentosObrigatorios = form.status === 'PAGA';
  const somaPagamentos = form.pagamentos.reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
  const totalComissao = Number(form.valorComissao) || 0;
  const divergenciaPagamentos = pagamentosObrigatorios && Math.abs(somaPagamentos - totalComissao) > 0.01;
  const pagamentosInvalidos = pagamentosObrigatorios && form.pagamentos.some((p) => (
    !p.formaPagamento || !p.dataVencimento || !p.valor || Number(p.valor) <= 0
  ));
  const totalComissaoFiltrada = Number.isFinite(Number(pagination.totalComissao))
    ? Number(pagination.totalComissao)
    : vendas.reduce((acc, venda) => acc + (Number(venda.valorComissao) || 0), 0);
  const csvEscape = (valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`;

  const exportarCsv = async () => {
    try {
      const { data } = await api.get('/vendas', { params: montarFiltros() });
      const linhas = (Array.isArray(data) ? data : data.items || []).map((venda) => ([
        venda.id,
        venda.cliente?.nome || '',
        venda.operadora?.nome || '',
        venda.idReserva || '',
        venda.tipoServico || '',
        venda.status || '',
        Number(venda.valorTotal || 0).toFixed(2),
        Number(venda.valorComissao || 0).toFixed(2),
        venda.agente?.nome || '',
        venda.dataVenda ? new Date(venda.dataVenda).toLocaleDateString('pt-BR') : '',
      ]));

      const cabecalho = ['ID', 'Cliente', 'Operadora', 'ID Reserva', 'Tipo Servico', 'Status', 'Valor Total', 'Valor Comissao', 'Agente', 'Data Lancamento'];
      const csv = [cabecalho, ...linhas]
        .map((linha) => linha.map(csvEscape).join(';'))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vendas_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao exportar CSV.');
    }
  };

  const abrirAnexoPdf = async (vendaId) => {
    try {
      const response = await api.get(`/vendas/${vendaId}/anexo-pdf`, { responseType: 'blob' });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao abrir anexo PDF.');
    }
  };

  const removerAnexoPdf = async (vendaId) => {
    if (!confirm('Remover o anexo PDF desta venda?')) return;
    try {
      await api.delete(`/vendas/${vendaId}/anexo-pdf`);
      setAnexoAtual(null);
      setAnexoPdfFile(null);
      await carregarVendas();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao remover anexo PDF.');
    }
  };

  const bloqueioSalvar =
    saving ||
    !form.clienteId ||
    !form.operadoraId ||
    !form.idReserva ||
    form.idReserva.trim().length > 20 ||
    !form.descricao ||
    form.valorTotal === '' ||
    form.valorComissao === '' ||
    (pagamentosObrigatorios && (pagamentosInvalidos || divergenciaPagamentos));

  return (
    <div>
      <div className="page-header">
        <h1>Vendas</h1>
        <button className="btn btn-primary" onClick={abrirCriar}>+ Nova Venda</button>
      </div>

      <div className="filters">
        <input
          className="form-control"
          style={{width:260}}
          value={filtroClienteNome}
          onChange={(e) => setFiltroClienteNome(e.target.value)}
          placeholder="Buscar cliente por nome"
        />

        <select className="form-control" style={{width:220}} value={filtroOperadoraId} onChange={(e) => setFiltroOperadoraId(e.target.value)}>
          <option value="">Todas as operadoras</option>
          {operadoras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
        </select>

        {isAdmin && (
          <select className="form-control" style={{width:220}} value={filtroAgenteId} onChange={(e) => setFiltroAgenteId(e.target.value)}>
            <option value="">Todos os agentes</option>
            {agentes.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
          </select>
        )}

        <input
          className="form-control"
          style={{width:180}}
          value={filtroReserva}
          onChange={(e) => setFiltroReserva(e.target.value)}
          placeholder="ID Reserva"
        />

        <input
          type="date"
          className="form-control"
          style={{width:170}}
          value={filtroDataInicio}
          onChange={(e) => setFiltroDataInicio(e.target.value)}
          title="Data de lancamento inicial"
        />

        <input
          type="date"
          className="form-control"
          style={{width:170}}
          value={filtroDataFim}
          onChange={(e) => setFiltroDataFim(e.target.value)}
          title="Data de lancamento final"
        />

        <select className="form-control" style={{width:180}} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {STATUS_VENDA.map((s) => <option key={s}>{s}</option>)}
        </select>

        <button
          className="btn btn-outline"
          type="button"
          onClick={() => {
            setFiltroClienteNome('');
            setFiltroOperadoraId('');
            setFiltroAgenteId('');
            setFiltroReserva('');
            setFiltroStatus('ABERTA');
            setFiltroDataInicio(intervaloPadrao.inicio);
            setFiltroDataFim(intervaloPadrao.fim);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
        >
          Limpar
        </button>

        <button className="btn btn-outline" type="button" onClick={exportarCsv}>
          Exportar CSV
        </button>
      </div>

      <div style={{display:'flex',gap:16,marginBottom:12,fontSize:14}}>
        <span><strong>Registros:</strong> {pagination.total}</span>
        <span><strong>Total Comissao:</strong> {fmtCurr(totalComissaoFiltrada)}</span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Venda / Cliente</th><th>Operadora</th><th>ID Reserva</th><th>Tipo</th><th>Valor</th><th>Comissão</th><th>Pagamentos</th><th>Status</th><th>Viagem</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10}><div className="loading"><div className="spinner"/></div></td></tr>
            ) : vendas.length === 0 ? (
              <tr><td colSpan={10}><div className="empty-state">Nenhuma venda encontrada.</div></td></tr>
            ) : vendas.map((v) => (
              <tr key={v.id}>
                <td>
                  <strong>#{v.id} - {v.cliente?.nome}</strong>
                </td>
                <td>{v.operadora?.nome || '—'}</td>
                <td>{v.idReserva || '—'}</td>
                <td><span className="badge badge-default">{v.tipoServico}</span></td>
                <td><strong>{fmtCurr(v.valorTotal)}</strong></td>
                <td>{fmtCurr(v.valorComissao)}</td>
                <td style={{fontSize:12}}>
                  {v.pagamentos?.length
                    ? v.pagamentos.map((p) => `${fmtFormaPagamento(p.formaPagamento)}: ${fmtCurr(p.valor)}`).join(' | ')
                    : '—'}
                </td>
                <td><span className={`badge ${statusBadge[v.status]}`}>{v.status}</span></td>
                <td style={{fontSize:12}}>{fmtDate(v.dataViagemInicio)}{v.dataViagemFim ? ` → ${fmtDate(v.dataViagemFim)}` : ''}</td>
                <td>
                  <div className="actions">
                    {v.anexoPdfPath && <button className="btn btn-sm btn-outline" onClick={() => abrirAnexoPdf(v.id)}>PDF</button>}
                    <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(v)}>✏️</button>
                    {isAdmin && <button className="btn btn-sm btn-danger" onClick={() => excluir(v.id)}>🗑️</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:13,color:'var(--text-muted)'}}>Pagina {pagination.page} de {pagination.totalPages}</span>
          <select
            className="form-control"
            style={{width:90}}
            value={pagination.pageSize}
            onChange={(e) => setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))}
          >
            {[10, 20, 50].map((size) => <option key={size} value={size}>{size}/pag</option>)}
          </select>
        </div>

        <div style={{display:'flex',gap:8}}>
          <button
            className="btn btn-outline"
            type="button"
            disabled={pagination.page <= 1 || loading}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            Anterior
          </button>
          <button
            className="btn btn-outline"
            type="button"
            disabled={pagination.page >= pagination.totalPages || loading}
            onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Proxima
          </button>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{maxWidth:700}}>
            <div className="modal-header">
              <h3>{editId ? 'Editar Venda' : 'Nova Venda'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-grid">
              <div className="form-group">
                <label>Cliente *</label>
                <select className="form-control" value={form.clienteId} onChange={f('clienteId')}>
                  <option value="">Selecione...</option>
                  {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Operadora *</label>
                <select className="form-control" value={form.operadoraId} onChange={f('operadoraId')}>
                  <option value="">Selecione...</option>
                  {operadoras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>ID Reserva *</label>
                <input className="form-control" maxLength={20} value={form.idReserva} onChange={f('idReserva')} placeholder="Ex: ABC123456" />
              </div>
              <div className="form-group">
                <label>Tipo de Serviço *</label>
                <select className="form-control" value={form.tipoServico} onChange={f('tipoServico')}>
                  {TIPOS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  className="form-control"
                  value={form.status}
                  onChange={f('status')}
                  disabled={!isAdmin && editId && form.status === 'PAGA'}
                >
                  {STATUS_VENDA.map((s) => <option key={s}>{s}</option>)}
                </select>
                {!isAdmin && editId && form.status === 'PAGA' && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                    Venda paga: somente ADMIN pode alterar o status.
                  </div>
                )}
              </div>
              <div className="form-group form-full">
                <label>Descrição *</label>
                <textarea className="form-control" rows={2} value={form.descricao} onChange={f('descricao')} placeholder="Descreva o pacote/serviço..." />
              </div>
              <div className="form-group form-full">
                <label>Observação</label>
                <textarea className="form-control" rows={2} value={form.observacoes} onChange={f('observacoes')} placeholder="Observações sobre a viagem..." />
              </div>
              <div className="form-group form-full">
                <label>Anexo PDF</label>
                <input
                  type="file"
                  className="form-control"
                  accept="application/pdf,.pdf"
                  onChange={(e) => setAnexoPdfFile(e.target.files?.[0] || null)}
                />
                <div style={{marginTop:6,fontSize:12,color:'var(--text-muted)'}}>
                  {anexoPdfFile
                    ? `Novo arquivo selecionado: ${anexoPdfFile.name}`
                    : anexoAtual
                      ? `Arquivo atual: ${anexoAtual.nome}`
                      : 'Nenhum PDF anexado.'}
                </div>
                {editId && anexoAtual && (
                  <div style={{display:'flex',gap:8,marginTop:8}}>
                    <button type="button" className="btn btn-sm btn-outline" onClick={() => abrirAnexoPdf(editId)}>
                      Abrir PDF
                    </button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => removerAnexoPdf(editId)}>
                      Remover PDF
                    </button>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Valor Total (R$) *</label>
                <input type="number" step="0.01" className="form-control" value={form.valorTotal} onChange={f('valorTotal')} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label>Valor da Comissão (R$) *</label>
                <input type="number" step="0.01" className="form-control" value={form.valorComissao} onChange={f('valorComissao')} placeholder="0,00" />
              </div>
              <div className="form-group">
                <label>Início da Viagem</label>
                <input type="date" className="form-control" value={form.dataViagemInicio} onChange={f('dataViagemInicio')} />
              </div>
              <div className="form-group">
                <label>Fim da Viagem</label>
                <input type="date" className="form-control" value={form.dataViagemFim} onChange={f('dataViagemFim')} />
              </div>

              <div className="form-group form-full">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <label>Formas de Pagamento {pagamentosObrigatorios ? '*' : ''}</label>
                  {pagamentosObrigatorios && <button type="button" className="btn btn-sm btn-outline" onClick={adicionarPagamento}>+ Forma</button>}
                </div>

                {!pagamentosObrigatorios ? (
                  <div style={{fontSize:12,color:'var(--text-muted)'}}>
                    O preenchimento de forma de pagamento, valor e vencimento so e obrigatorio quando o status for PAGA.
                  </div>
                ) : (
                  <>
                    {form.pagamentos.map((pagamento, idx) => (
                      <div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:8,marginBottom:8}}>
                        <select
                          className="form-control"
                          value={pagamento.formaPagamento}
                          onChange={(e) => atualizarPagamento(idx, 'formaPagamento', e.target.value)}
                        >
                          {FORMAS_PAGAMENTO.map((forma) => <option key={forma} value={forma}>{fmtFormaPagamento(forma)}</option>)}
                        </select>
                        <input
                          type="number"
                          step="0.01"
                          className="form-control"
                          value={pagamento.valor}
                          onChange={(e) => atualizarPagamento(idx, 'valor', e.target.value)}
                          placeholder="Valor"
                        />
                        <input
                          type="date"
                          className="form-control"
                          value={pagamento.dataVencimento}
                          onChange={(e) => atualizarPagamento(idx, 'dataVencimento', e.target.value)}
                        />
                        <button type="button" className="btn btn-sm btn-danger" onClick={() => removerPagamento(idx)} disabled={form.pagamentos.length === 1}>-</button>
                      </div>
                    ))}

                    <div style={{fontSize:12,color:divergenciaPagamentos ? 'var(--danger)' : 'var(--text-muted)'}}>
                      Soma pagamentos: {fmtCurr(somaPagamentos)} | Total comissao: {fmtCurr(totalComissao)}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={bloqueioSalvar}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
            <div style={{marginTop:8,fontSize:12,color:'var(--text-muted)'}}>
              Agente responsavel: <strong>{usuario?.nome || 'Usuario logado'}</strong> (definido automaticamente)
            </div>
          </div>
        </div>
      )}

      {modalPosVenda && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalPosVenda(false)}>
          <div className="modal" style={{maxWidth:760}}>
            <div className="modal-header">
              <h3>Configurar Pos-Venda da Venda #{vendaPosVenda?.id}</h3>
              <button className="btn-icon" onClick={() => setModalPosVenda(false)}>✕</button>
            </div>

            <div style={{fontSize:13,color:'var(--text-muted)',marginBottom:12}}>
              {vendaPosVenda?.cliente?.nome ? `Cliente: ${vendaPosVenda.cliente.nome}` : ''}
              {vendaPosVenda?.operadora?.nome ? ` | Operadora: ${vendaPosVenda.operadora.nome}` : ''}
              {vendaPosVenda?.tipoServico ? ` | Tipo: ${vendaPosVenda.tipoServico}` : ''}
            </div>

            <div style={{fontSize:12,color:'var(--text-muted)',marginBottom:10}}>
              Origem do modelo: <strong>{origemModeloPosVenda || 'Nao definido'}</strong>
            </div>

            {errorPosVenda && <div className="alert alert-error">{errorPosVenda}</div>}

            <div className="form-grid" style={{marginBottom:12}}>
              <div className="form-group">
                <label>Modelo de checklist</label>
                <select className="form-control" value={modeloPosVenda} onChange={(e) => setModeloPosVenda(e.target.value)}>
                  <option value="CADASTRO">Cadastro (tipo + operadora)</option>
                  <option value="AUTO_LOCAL">Automatico local (por tipo de servico)</option>
                  <option value="BASICO">Basico</option>
                  <option value="PACOTE">Pacote</option>
                  <option value="AEREO">Aereo</option>
                  <option value="HOTEL">Hotel</option>
                  <option value="CRUZEIRO">Cruzeiro</option>
                  <option value="RODOVIARIO">Rodoviario</option>
                  <option value="SEGURO_VIAGEM">Seguro Viagem</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>
              <div className="form-group" style={{justifyContent:'flex-end'}}>
                <label>&nbsp;</label>
                <button type="button" className="btn btn-outline" onClick={aplicarModeloPosVenda} disabled={loadingModeloPosVenda}>
                  {loadingModeloPosVenda ? 'Aplicando...' : 'Aplicar modelo'}
                </button>
              </div>
            </div>

            <div className="form-group form-full">
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <label>Acoes de Pos-Venda</label>
                <button type="button" className="btn btn-sm btn-outline" onClick={adicionarAcaoPosVenda}>+ Acao</button>
              </div>

              {acoesPosVenda.map((acao, idx) => (
                <div key={idx} style={{display:'grid',gridTemplateColumns:'1.1fr 2fr 1fr 1.2fr auto',gap:8,marginBottom:8}}>
                  <select
                    className="form-control"
                    value={acao.tipoAcao}
                    onChange={(e) => atualizarAcaoPosVenda(idx, 'tipoAcao', e.target.value)}
                  >
                    {ACOES_POS_VENDA.map((tipo) => <option key={tipo} value={tipo}>{ACOES_POS_VENDA_LABEL[tipo]}</option>)}
                  </select>
                  <input
                    className="form-control"
                    value={acao.descricao}
                    onChange={(e) => atualizarAcaoPosVenda(idx, 'descricao', e.target.value)}
                    placeholder="Descreva a acao"
                  />
                  <input
                    type="date"
                    className="form-control"
                    value={acao.dataAcao}
                    onChange={(e) => atualizarAcaoPosVenda(idx, 'dataAcao', e.target.value)}
                  />
                  <input
                    className="form-control"
                    value={acao.responsavel}
                    onChange={(e) => atualizarAcaoPosVenda(idx, 'responsavel', e.target.value)}
                    placeholder="Responsavel"
                  />
                  <button
                    type="button"
                    className="btn btn-sm btn-danger"
                    onClick={() => removerAcaoPosVenda(idx)}
                    disabled={acoesPosVenda.length === 1}
                  >
                    -
                  </button>
                </div>
              ))}
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModalPosVenda(false)}>Fazer Depois</button>
              <button className="btn btn-primary" onClick={salvarPosVenda} disabled={savingPosVenda}>
                {savingPosVenda ? 'Salvando...' : 'Salvar Acoes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
