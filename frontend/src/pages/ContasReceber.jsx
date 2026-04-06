import { useState, useEffect } from 'react';
import api from '../services/api';

const STATUS = ['PENDENTE','PAGO','ATRASADO'];
const FORMAS_PAGAMENTO = ['CARTAO', 'BOLETO', 'PIX', 'OPERADORA'];
const STATUS_PADRAO_FILTRO = ['PENDENTE', 'ATRASADO'];
const ITENS_POR_PAGINA = 30;
const statusBadge = { PENDENTE:'badge-warning', PAGO:'badge-success', ATRASADO:'badge-danger' };
const fmtCurr = (v) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0);
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const empty = { vendaId:'', valor:'', formaPagamento:'', origem:'MANUAL', dataVencimento:'', status:'PENDENTE' };

const toInputDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPeriodoPadrao = () => {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 2, 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
  return {
    inicio: toInputDate(inicio),
    fim: toInputDate(fim),
  };
};

const fmtFormaPagamento = (forma) => ({
  CARTAO: 'Cartao',
  BOLETO: 'Boleto',
  PIX: 'Pix',
  OPERADORA: 'Operadora',
}[forma] || '—');

const fmtOrigem = (origem) => ({
  MANUAL: 'Manual',
  COMISSAO: 'Comissao',
  ASAAS_BOLETO: 'Asaas',
}[origem] || origem || '—');

export default function ContasReceber() {
  const periodoPadrao = getPeriodoPadrao();
  const [contas, setContas] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [operadoras, setOperadoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState(STATUS_PADRAO_FILTRO);
  const [filtroClienteNome, setFiltroClienteNome] = useState('');
  const [filtroClienteNomeDebounced, setFiltroClienteNomeDebounced] = useState('');
  const [filtroOperadoraId, setFiltroOperadoraId] = useState('');
  const [filtroVencInicio, setFiltroVencInicio] = useState(periodoPadrao.inicio);
  const [filtroVencFim, setFiltroVencFim] = useState(periodoPadrao.fim);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const [c, v] = await Promise.all([
        api.get('/contas-receber', {
          params: {
            clienteNome: filtroClienteNomeDebounced || undefined,
            operadoraId: filtroOperadoraId || undefined,
            dataVencimentoInicio: filtroVencInicio || undefined,
            dataVencimentoFim: filtroVencFim || undefined,
          },
        }),
        api.get('/vendas'),
      ]);
      setContas(c.data || []); setVendas(v.data || []);
    } finally { setLoading(false); }
  };

  const carregarFiltros = async () => {
    const [operadorasResp] = await Promise.all([
      api.get('/operadoras'),
    ]);

    setOperadoras(operadorasResp.data || []);
  };

  useEffect(() => {
    carregarFiltros();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFiltroClienteNomeDebounced(filtroClienteNome);
    }, 300);

    return () => clearTimeout(timer);
  }, [filtroClienteNome]);

  useEffect(() => {
    carregar();
  }, [filtroClienteNomeDebounced, filtroOperadoraId, filtroVencInicio, filtroVencFim]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroStatus, filtroClienteNomeDebounced, filtroOperadoraId, filtroVencInicio, filtroVencFim]);

  const abrirCriar = () => { setForm(empty); setEditId(null); setError(''); setModal(true); };
  const abrirEditar = (c) => {
    setForm({
      vendaId: c.vendaId,
      valor: c.valor,
      formaPagamento: c.formaPagamento || '',
      origem: c.origem || 'MANUAL',
      dataVencimento: c.dataVencimento.split('T')[0],
      status: c.status,
    });
    setEditId(c.id); setError(''); setModal(true);
  };

  const salvar = async () => {
    setError(''); setSaving(true);
    try {
      const payload = { ...form, vendaId: Number(form.vendaId), valor: Number(form.valor) };
      if (editId) await api.put(`/contas-receber/${editId}`, payload);
      else await api.post('/contas-receber', payload);
      setModal(false); carregar();
    } catch(e) { setError(e.response?.data?.error || 'Erro.'); }
    finally { setSaving(false); }
  };

  const pagar = async (id) => {
    if (!confirm('Registrar pagamento desta conta?')) return;
    try { await api.patch(`/contas-receber/${id}/pagar`); carregar(); }
    catch(e) { alert(e.response?.data?.error || 'Erro.'); }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir esta conta?')) return;
    try { await api.delete(`/contas-receber/${id}`); carregar(); }
    catch(e) { alert(e.response?.data?.error || 'Erro.'); }
  };

  const gerarBoleto = async (id) => {
    try {
      const { data } = await api.post(`/contas-receber/${id}/gerar-boleto`);
      const url = data?.bankSlipUrl || data?.invoiceUrl;

      if (data?.jaExistia) {
        alert('Abrindo boleto Asaas ja existente para este registro.');
      }

      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
      } else {
        alert('Boleto gerado, mas sem URL retornada pelo Asaas.');
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao gerar boleto no Asaas.');
    }
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
  const totalRegistros = contasFiltradas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalRegistros / ITENS_POR_PAGINA));
  const paginaSegura = Math.min(paginaAtual, totalPaginas);
  const inicioPagina = (paginaSegura - 1) * ITENS_POR_PAGINA;
  const contasPagina = contasFiltradas.slice(inicioPagina, inicioPagina + ITENS_POR_PAGINA);
  const totalAtrasado = contasFiltradas
    .filter((c) => c.status === 'ATRASADO')
    .reduce((a, c) => a + Number(c.valor), 0);
  const totalPendente = contasFiltradas
    .filter((c) => c.status === 'PENDENTE')
    .reduce((a, c) => a + Number(c.valor), 0);
  const totalGeral = contasFiltradas.reduce((a, c) => a + Number(c.valor), 0);

  return (
    <div>
      <div className="page-header">
        <h1>Contas a Receber</h1>
        <button className="btn btn-primary" onClick={abrirCriar}>+ Nova Conta</button>
      </div>

      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:'16px 20px',marginBottom:20,display:'flex',gap:32}}>
        <div><span style={{fontSize:12,color:'var(--text-muted)'}}>TOTAL ATRASADO</span><div style={{fontSize:22,fontWeight:700,fontFamily:'Sora,sans-serif',color:'var(--danger)'}}>{fmtCurr(totalAtrasado)}</div></div>
        <div><span style={{fontSize:12,color:'var(--text-muted)'}}>TOTAL PENDENTE</span><div style={{fontSize:22,fontWeight:700,fontFamily:'Sora,sans-serif',color:'var(--warning)'}}>{fmtCurr(totalPendente)}</div></div>
        <div><span style={{fontSize:12,color:'var(--text-muted)'}}>TOTAL GERAL</span><div style={{fontSize:22,fontWeight:700,fontFamily:'Sora,sans-serif',color:'var(--success)'}}>{fmtCurr(totalGeral)}</div></div>
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
        <input
          className="form-control"
          style={{width:260}}
          value={filtroClienteNome}
          onChange={(e) => setFiltroClienteNome(e.target.value)}
          placeholder="Buscar cliente por nome"
        />
        <select className="form-control" style={{width:250}} value={filtroOperadoraId} onChange={(e) => setFiltroOperadoraId(e.target.value)}>
          <option value="">Todas as operadoras</option>
          {operadoras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
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
            setFiltroClienteNome('');
            setFiltroOperadoraId('');
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
            <tr><th>Cliente / Venda</th><th>Valor</th><th>Forma</th><th>Origem</th><th>Vencimento</th><th>Pagamento</th><th>Status</th><th>Ações</th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={8}><div className="loading"><div className="spinner"/></div></td></tr>
            : totalRegistros === 0 ? <tr><td colSpan={8}><div className="empty-state">Nenhuma conta encontrada.</div></td></tr>
            : contasPagina.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.venda?.cliente?.nome}</strong>
                  <br/>
                  <span style={{fontSize:12,color:'var(--text-muted)'}}>
                    {c.venda?.operadora?.nome ? `Operadora: ${c.venda.operadora.nome} | ` : ''}
                    Venda #{c.vendaId}
                  </span>
                </td>
                <td><strong>{fmtCurr(c.valor)}</strong></td>
                <td>{fmtFormaPagamento(c.formaPagamento)}</td>
                <td>
                  <span className={`badge ${c.origem === 'ASAAS_BOLETO' ? 'badge-info' : 'badge-default'}`}>
                    {c.origem === 'ASAAS_BOLETO' ? '💠 Asaas' : fmtOrigem(c.origem)}
                  </span>
                </td>
                <td>{fmtDate(c.dataVencimento)}</td>
                <td>{fmtDate(c.dataPagamento)}</td>
                <td><span className={`badge ${statusBadge[c.status]}`}>{c.status}</span></td>
                <td>
                  <div className="actions">
                    {c.status !== 'PAGO' && <button className="btn btn-sm btn-success" onClick={() => pagar(c.id)}>✓ Pagar</button>}
                    {c.origem === 'ASAAS_BOLETO' ? (
                      <button className="btn btn-sm btn-outline" onClick={() => gerarBoleto(c.id)}>Ver boleto</button>
                    ) : (
                      c.status !== 'PAGO' && c.status !== 'CANCELADO' && (
                        <button className="btn btn-sm btn-outline" onClick={() => gerarBoleto(c.id)}>Gerar boleto</button>
                      )
                    )}
                    <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(c)}>✏️</button>
                    <button className="btn btn-sm btn-danger" onClick={() => excluir(c.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Pagina {paginaSegura} de {totalPaginas} • {ITENS_POR_PAGINA}/pag
        </span>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-outline"
            type="button"
            disabled={paginaSegura <= 1 || loading}
            onClick={() => setPaginaAtual((prev) => Math.max(1, prev - 1))}
          >
            Anterior
          </button>
          <button
            className="btn btn-outline"
            type="button"
            disabled={paginaSegura >= totalPaginas || loading}
            onClick={() => setPaginaAtual((prev) => Math.min(totalPaginas, prev + 1))}
          >
            Proxima
          </button>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-grid">
              <div className="form-group form-full">
                <label>Venda *</label>
                <select className="form-control" value={form.vendaId} onChange={f('vendaId')}>
                  <option value="">Selecione...</option>
                  {vendas.map((v) => <option key={v.id} value={v.id}>#{v.id} - {v.cliente?.nome} - {v.tipoServico}</option>)}
                </select>
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
                <label>Forma de Pagamento</label>
                <select className="form-control" value={form.formaPagamento} onChange={f('formaPagamento')}>
                  <option value="">Selecione...</option>
                  {FORMAS_PAGAMENTO.map((fp) => <option key={fp} value={fp}>{fmtFormaPagamento(fp)}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Origem</label>
                <select className="form-control" value={form.origem} onChange={f('origem')}>
                  <option value="MANUAL">Manual</option>
                  <option value="COMISSAO">Comissao</option>
                  <option value="ASAAS_BOLETO">Asaas</option>
                </select>
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
              <button className="btn btn-primary" onClick={salvar} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
