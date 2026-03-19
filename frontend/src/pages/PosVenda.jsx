import { useState, useEffect } from 'react';
import api from '../services/api';

const ACOES = ['TROCA_RESERVA','CANCELAMENTO','EMISSAO_VOUCHER','ENTREGA_BRINDE','CHECKIN_VOO'];
const STATUS = ['ABERTO', 'CONCLUIDO'];
const ACOES_LABEL = { TROCA_RESERVA:'Troca de Reserva', CANCELAMENTO:'Cancelamento', EMISSAO_VOUCHER:'Emissão de Voucher', ENTREGA_BRINDE:'Entrega de Brinde', CHECKIN_VOO:'Check-in / Voo' };
const STATUS_LABEL = { ABERTO: 'Em Aberto', CONCLUIDO: 'Concluido' };
const fmtDate = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—';
const empty = { vendaId:'', tipoAcao:'EMISSAO_VOUCHER', descricao:'', dataAcao:'', responsavel:'', status:'ABERTO' };
const toInputDate = (date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const getDefaultDateRange = () => {
  const hoje = new Date();
  return {
    inicio: toInputDate(addDays(hoje, -7)),
    fim: toInputDate(addDays(hoje, 15)),
  };
};

const avaliarPrazo = (dataAcao) => {
  if (!dataAcao) return 'normal';

  const data = new Date(dataAcao);
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const inicioAmanha = new Date(inicioHoje);
  inicioAmanha.setDate(inicioAmanha.getDate() + 1);
  const inicioDepoisAmanha = new Date(inicioAmanha);
  inicioDepoisAmanha.setDate(inicioDepoisAmanha.getDate() + 1);

  if (data < inicioHoje) return 'atrasado';
  if (data >= inicioHoje && data < inicioDepoisAmanha) return 'atencao';
  return 'normal';
};

export default function PosVenda() {
  const intervaloPadrao = getDefaultDateRange();
  const [registros, setRegistros] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroClienteNome, setFiltroClienteNome] = useState('');
  const [filtroClienteNomeDebounced, setFiltroClienteNomeDebounced] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('ABERTO');
  const [filtroDataInicio, setFiltroDataInicio] = useState(intervaloPadrao.inicio);
  const [filtroDataFim, setFiltroDataFim] = useState(intervaloPadrao.fim);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [buscaVenda, setBuscaVenda] = useState('');
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const [r, v, c] = await Promise.all([
        api.get('/pos-venda', {
          params: {
            clienteNome: filtroClienteNomeDebounced || undefined,
            status: filtroStatus || undefined,
            dataAcaoInicio: filtroDataInicio || undefined,
            dataAcaoFim: filtroDataFim || undefined,
          },
        }),
        api.get('/vendas'),
      ]);

      const vendasLista = Array.isArray(v.data) ? v.data : v.data?.items || [];
      const registrosOrdenados = [...(r.data || [])].sort((a, b) => new Date(a.dataAcao) - new Date(b.dataAcao));

      setRegistros(registrosOrdenados);
      setVendas(vendasLista);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltroClienteNomeDebounced(filtroClienteNome);
    }, 300);

    return () => clearTimeout(timer);
  }, [filtroClienteNome]);

  useEffect(() => { carregar(); }, [filtroClienteNomeDebounced, filtroStatus, filtroDataInicio, filtroDataFim]);

  const abrirCriar = () => { setForm(empty); setBuscaVenda(''); setEditId(null); setError(''); setModal(true); };
  const abrirEditar = (r) => {
    setForm({ vendaId:r.vendaId, tipoAcao:r.tipoAcao, descricao:r.descricao, dataAcao:r.dataAcao?.split('T')[0]||'', responsavel:r.responsavel, status:r.status || 'ABERTO' });
    setBuscaVenda(`${r.venda?.cliente?.nome || ''} #${r.vendaId}`.trim());
    setEditId(r.id); setError(''); setModal(true);
  };

  const salvar = async () => {
    setError(''); setSaving(true);
    try {
      const payload = { ...form, vendaId: Number(form.vendaId) };
      if (editId) await api.put(`/pos-venda/${editId}`, payload);
      else await api.post('/pos-venda', payload);
      setModal(false); carregar();
    } catch(e) { setError(e.response?.data?.error || 'Erro.'); }
    finally { setSaving(false); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir registro?')) return;
    try { await api.delete(`/pos-venda/${id}`); carregar(); }
    catch(e) { alert(e.response?.data?.error || 'Erro.'); }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const vendasFiltradas = vendas
    .filter((v) => {
      if (!buscaVenda.trim()) return true;
      const termo = buscaVenda.toLowerCase();
      const alvo = `${v.id} ${v.idReserva || ''} ${v.tipoServico || ''} ${v.cliente?.nome || ''} ${v.operadora?.nome || ''}`.toLowerCase();
      return alvo.includes(termo);
    })
    .slice(0, 120);

  return (
    <div>
      <div className="page-header">
        <h1>Pós-Venda</h1>
        <button className="btn btn-primary" onClick={abrirCriar}>+ Novo Registro</button>
      </div>

      <div className="filters">
        <input
          className="form-control"
          style={{width:260}}
          value={filtroClienteNome}
          onChange={(e) => setFiltroClienteNome(e.target.value)}
          placeholder="Buscar cliente por nome"
        />

        <select className="form-control" style={{width:180}} value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          {STATUS.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
          <option value="">Todos</option>
        </select>

        <input
          type="date"
          className="form-control"
          style={{width:170}}
          value={filtroDataInicio}
          onChange={(e) => setFiltroDataInicio(e.target.value)}
          title="Data inicial"
        />
        <input
          type="date"
          className="form-control"
          style={{width:170}}
          value={filtroDataFim}
          onChange={(e) => setFiltroDataFim(e.target.value)}
          title="Data final"
        />

        <button
          className="btn btn-outline"
          type="button"
          onClick={() => {
            setFiltroClienteNome('');
            setFiltroStatus('ABERTO');
            setFiltroDataInicio(intervaloPadrao.inicio);
            setFiltroDataFim(intervaloPadrao.fim);
          }}
        >
          Janela padrao
        </button>

        <button
          className="btn btn-outline"
          type="button"
          onClick={() => {
            setFiltroClienteNome('');
            setFiltroStatus('ABERTO');
            setFiltroDataInicio(intervaloPadrao.inicio);
            setFiltroDataFim(intervaloPadrao.fim);
          }}
        >
          Limpar
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Venda / Cliente</th><th>Ação</th><th>Status</th><th>Descrição</th><th>Data</th><th>Responsável</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7}><div className="loading"><div className="spinner"/></div></td></tr>
            : registros.length === 0 ? <tr><td colSpan={7}><div className="empty-state">Nenhum registro encontrado.</div></td></tr>
            : registros.map((r) => (
              <tr
                key={r.id}
                style={
                  avaliarPrazo(r.dataAcao) === 'atrasado'
                    ? { background: '#fee2e2' }
                    : avaliarPrazo(r.dataAcao) === 'atencao'
                      ? { background: '#fff7e6' }
                      : undefined
                }
              >
                <td><strong>{r.venda?.cliente?.nome}</strong><br/><span style={{fontSize:12,color:'var(--text-muted)'}}>Venda #{r.vendaId}</span></td>
                <td><span className="badge badge-info">{ACOES_LABEL[r.tipoAcao] || r.tipoAcao}</span></td>
                <td><span className={`badge ${r.status === 'CONCLUIDO' ? 'badge-success' : 'badge-warning'}`}>{STATUS_LABEL[r.status] || r.status || 'Em Aberto'}</span></td>
                <td style={{maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.descricao}</td>
                <td>
                  {fmtDate(r.dataAcao)}
                  <br/>
                  <span
                    className={`badge ${avaliarPrazo(r.dataAcao) === 'atrasado' ? 'badge-danger' : avaliarPrazo(r.dataAcao) === 'atencao' ? 'badge-warning' : 'badge-default'}`}
                    style={{marginTop:4}}
                  >
                    {avaliarPrazo(r.dataAcao) === 'atrasado' ? 'Atrasado' : avaliarPrazo(r.dataAcao) === 'atencao' ? 'Hoje/Amanha' : 'No prazo'}
                  </span>
                </td>
                <td>{r.responsavel}</td>
                <td>
                  <div className="actions">
                    <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(r)}>✏️</button>
                    <button className="btn btn-sm btn-danger" onClick={() => excluir(r.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId ? 'Editar Pós-Venda' : 'Novo Registro Pós-Venda'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-grid">
              <div className="form-group form-full">
                <label>Buscar venda</label>
                <input
                  className="form-control"
                  value={buscaVenda}
                  onChange={(e) => setBuscaVenda(e.target.value)}
                  placeholder="Busque por cliente, ID venda, ID reserva, operadora ou tipo"
                />
                <div style={{marginTop:6,fontSize:12,color:'var(--text-muted)'}}>
                  Exibindo {vendasFiltradas.length} vendas filtradas para selecao.
                </div>
              </div>
              <div className="form-group form-full">
                <label>Venda *</label>
                <select className="form-control" value={form.vendaId} onChange={f('vendaId')}>
                  <option value="">Selecione...</option>
                  {vendasFiltradas.map((v) => (
                    <option key={v.id} value={v.id}>
                      #{v.id} - {v.cliente?.nome} - {v.operadora?.nome || 'Sem operadora'} - {v.idReserva || 'Sem reserva'} - {v.tipoServico}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tipo de Ação *</label>
                <select className="form-control" value={form.tipoAcao} onChange={f('tipoAcao')}>
                  {ACOES.map((a) => <option key={a} value={a}>{ACOES_LABEL[a]}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Data da Ação</label>
                <input type="date" className="form-control" value={form.dataAcao} onChange={f('dataAcao')} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={form.status} onChange={f('status')}>
                  {STATUS.map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
                </select>
              </div>
              <div className="form-group form-full">
                <label>Descrição *</label>
                <textarea className="form-control" rows={3} value={form.descricao} onChange={f('descricao')} placeholder="Descreva a ação realizada..." />
              </div>
              <div className="form-group form-full">
                <label>Responsável *</label>
                <input className="form-control" value={form.responsavel} onChange={f('responsavel')} placeholder="Nome do responsável" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
