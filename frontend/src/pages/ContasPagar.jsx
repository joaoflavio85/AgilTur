import { useState, useEffect } from 'react';
import api from '../services/api';

const STATUS = ['PENDENTE','PAGO','ATRASADO'];
const STATUS_PADRAO_FILTRO = ['PENDENTE', 'ATRASADO'];
const statusBadge = { PENDENTE:'badge-warning', PAGO:'badge-success', ATRASADO:'badge-danger' };
const fmtCurr = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const empty = { centroCustoId:'', descricao:'', fornecedor:'', valor:'', dataVencimento:'', status:'PENDENTE' };
const toDateInputValue = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getPeriodoPadrao = () => {
  const hoje = new Date();
  return {
    inicio: toDateInputValue(new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1)),
    fim: toDateInputValue(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)),
  };
};

export default function ContasPagar() {
  const periodoPadrao = getPeriodoPadrao();

  const [contas, setContas] = useState([]);
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState(STATUS_PADRAO_FILTRO);
  const [filtroCentroCustoId, setFiltroCentroCustoId] = useState('');
  const [filtroVencInicio, setFiltroVencInicio] = useState(periodoPadrao.inicio);
  const [filtroVencFim, setFiltroVencFim] = useState(periodoPadrao.fim);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await api.get('/contas-pagar', {
        params: {
          centroCustoId: filtroCentroCustoId || undefined,
          dataVencimentoInicio: filtroVencInicio || undefined,
          dataVencimentoFim: filtroVencFim || undefined,
        },
      });
      setContas(r.data);
    } finally { setLoading(false); }
  };

  const carregarCentrosCusto = async () => {
    const r = await api.get('/centros-custo', { params: { ativo: true } });
    setCentrosCusto(r.data || []);
  };

  useEffect(() => {
    carregarCentrosCusto();
  }, []);

  useEffect(() => {
    carregar();
  }, [filtroCentroCustoId, filtroVencInicio, filtroVencFim]);

  const abrirCriar = () => { setForm(empty); setEditId(null); setError(''); setModal(true); };
  const abrirEditar = (c) => {
    setForm({ centroCustoId:String(c.centroCustoId || ''), descricao:c.descricao, fornecedor:c.fornecedor, valor:c.valor, dataVencimento:c.dataVencimento.split('T')[0], status:c.status });
    setEditId(c.id); setError(''); setModal(true);
  };

  const salvar = async () => {
    setError(''); setSaving(true);
    try {
      const payload = { ...form, valor: Number(form.valor) };
      if (editId) await api.put(`/contas-pagar/${editId}`, payload);
      else await api.post('/contas-pagar', payload);
      setModal(false); carregar();
    } catch(e) { setError(e.response?.data?.error || 'Erro.'); }
    finally { setSaving(false); }
  };

  const pagar = async (id) => {
    if (!confirm('Registrar pagamento?')) return;
    try { await api.patch(`/contas-pagar/${id}/pagar`); carregar(); }
    catch(e) { alert(e.response?.data?.error || 'Erro.'); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir?')) return;
    try { await api.delete(`/contas-pagar/${id}`); carregar(); }
    catch(e) { alert(e.response?.data?.error || 'Erro.'); }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleStatus = (status) => {
    setFiltroStatus((atual) => {
      if (atual.includes(status)) return atual.filter((item) => item !== status);
      return [...atual, status];
    });
  };

  const contasFiltradas = contas.filter((c) => (
    filtroStatus.length === 0 ? true : filtroStatus.includes(c.status)
  ));
  const total = contasFiltradas.filter(c => c.status !== 'PAGO').reduce((a, c) => a + Number(c.valor), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Contas a Pagar</h1>
        <button className="btn btn-primary" onClick={abrirCriar}>+ Nova Conta</button>
      </div>

      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'16px 20px',marginBottom:20}}>
        <span style={{fontSize:12,color:'var(--text-muted)'}}>TOTAL PENDENTE</span>
        <div style={{fontSize:22,fontWeight:700,fontFamily:'Sora,sans-serif',color:'var(--danger)'}}>{fmtCurr(total)}</div>
      </div>

      <div className="filters">
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'0 8px',minHeight:42,border:'1px solid var(--border)',borderRadius:10,background:'var(--surface2)'}}>
          {STATUS.map((s) => (
            <label key={s} style={{display:'flex',alignItems:'center',gap:6,fontSize:13,cursor:'pointer'}}>
              <input
                type="checkbox"
                checked={filtroStatus.includes(s)}
                onChange={() => toggleStatus(s)}
              />
              {s}
            </label>
          ))}
        </div>
        <select className="form-control" style={{width:260}} value={filtroCentroCustoId} onChange={(e) => setFiltroCentroCustoId(e.target.value)}>
          <option value="">Todos os centros de custo</option>
          {centrosCusto.map((centro) => (
            <option key={centro.id} value={centro.id}>{centro.id} - {centro.descricao}</option>
          ))}
        </select>
        <input
          type="date"
          className="form-control"
          style={{width:170}}
          value={filtroVencInicio}
          onChange={(e) => setFiltroVencInicio(e.target.value)}
          title="Vencimento de"
        />
        <input
          type="date"
          className="form-control"
          style={{width:170}}
          value={filtroVencFim}
          onChange={(e) => setFiltroVencFim(e.target.value)}
          title="Vencimento ate"
        />
        <button
          className="btn btn-outline"
          onClick={() => {
            const periodo = getPeriodoPadrao();
            setFiltroStatus(STATUS_PADRAO_FILTRO);
            setFiltroCentroCustoId('');
            setFiltroVencInicio(periodo.inicio);
            setFiltroVencFim(periodo.fim);
          }}
        >
          Limpar filtros
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Centro de Custo</th><th>Descrição</th><th>Fornecedor</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={7}><div className="loading"><div className="spinner"/></div></td></tr>
            : contasFiltradas.length === 0 ? <tr><td colSpan={7}><div className="empty-state">Nenhuma conta encontrada.</div></td></tr>
            : contasFiltradas.map((c) => (
              <tr key={c.id}>
                <td>{c.centroCusto?.descricao || '-'}</td>
                <td><strong>{c.descricao}</strong></td>
                <td>{c.fornecedor}</td>
                <td><strong>{fmtCurr(c.valor)}</strong></td>
                <td>{fmtDate(c.dataVencimento)}</td>
                <td><span className={`badge ${statusBadge[c.status]}`}>{c.status}</span></td>
                <td>
                  <div className="actions">
                    {c.status !== 'PAGO' && <button className="btn btn-sm btn-success" onClick={() => pagar(c.id)}>✓ Pagar</button>}
                    <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(c)}>✏️</button>
                    <button className="btn btn-sm btn-danger" onClick={() => excluir(c.id)}>🗑️</button>
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
              <h3>{editId ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-grid">
              <div className="form-group form-full">
                <label>Centro de Custo *</label>
                <select className="form-control" value={form.centroCustoId} onChange={f('centroCustoId')}>
                  <option value="">Selecione...</option>
                  {centrosCusto.map((centro) => (
                    <option key={centro.id} value={centro.id}>{centro.id} - {centro.descricao}</option>
                  ))}
                </select>
              </div>
              <div className="form-group form-full">
                <label>Descrição *</label>
                <input className="form-control" value={form.descricao} onChange={f('descricao')} placeholder="Ex: Passagens aéreas - Cancún" />
              </div>
              <div className="form-group">
                <label>Fornecedor *</label>
                <input className="form-control" value={form.fornecedor} onChange={f('fornecedor')} placeholder="LATAM, Hotel XYZ..." />
              </div>
              <div className="form-group">
                <label>Valor (R$) *</label>
                <input type="number" step="0.01" className="form-control" value={form.valor} onChange={f('valor')} />
              </div>
              <div className="form-group">
                <label>Vencimento *</label>
                <input type="date" className="form-control" value={form.dataVencimento} onChange={f('dataVencimento')} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-control" value={form.status} onChange={f('status')}>
                  {STATUS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={saving || !form.centroCustoId}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
