import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const fmtCurr = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));

const brindeEmpty = { nome: '', estoque: 0, estoqueMinimo: 0, custoMedio: 0 };
const entradaEmpty = { brindeId: '', quantidade: '', custoUnitario: '', fornecedorNome: '', dataVencimento: '', despesaId: '', observacao: '' };
const saidaEmpty = { brindeId: '', quantidade: '', clienteId: '', clienteNome: '', vendaId: '', observacao: '' };

export default function Brindes() {
  const [brindes, setBrindes] = useState([]);
  const [movs, setMovs] = useState([]);
  const [despesas, setDespesas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [vendas, setVendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState('ESTOQUE');
  const [filtroBrindeId, setFiltroBrindeId] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [filtroBusca, setFiltroBusca] = useState('');

  const [novoBrinde, setNovoBrinde] = useState(brindeEmpty);
  const [entrada, setEntrada] = useState(entradaEmpty);
  const [saida, setSaida] = useState(saidaEmpty);
  const [saving, setSaving] = useState(false);

  const carregar = async () => {
    setLoading(true);
    setErro('');
    try {
      const [b, m, d] = await Promise.all([
        api.get('/brindes'),
        api.get('/brindes/movimentacoes', {
          params: {
            brindeId: filtroBrindeId || undefined,
            tipo: filtroTipo || undefined,
            dataInicio: filtroDataInicio || undefined,
            dataFim: filtroDataFim || undefined,
          },
        }),
        api.get('/centros-custo', { params: { ativo: true } }),
      ]);

      const [cResp, vResp] = await Promise.all([
        api.get('/clientes'),
        api.get('/vendas', { params: { page: 1, pageSize: 300 } }),
      ]);

      const vendasData = Array.isArray(vResp.data) ? vResp.data : (vResp.data?.items || []);
      setBrindes(Array.isArray(b.data) ? b.data : []);
      setMovs(Array.isArray(m.data) ? m.data : []);
      setDespesas(Array.isArray(d.data) ? d.data : []);
      setClientes(Array.isArray(cResp.data) ? cResp.data : []);
      setVendas(vendasData);
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao carregar modulo de brindes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, [filtroBrindeId, filtroTipo, filtroDataInicio, filtroDataFim]);

  const totalEstoque = useMemo(() => brindes.reduce((acc, b) => acc + Number(b.valorEstoque || 0), 0), [brindes]);

  const criarBrinde = async () => {
    setSaving(true);
    try {
      await api.post('/brindes', {
        nome: novoBrinde.nome,
        estoque: Number(novoBrinde.estoque || 0),
        estoqueMinimo: Number(novoBrinde.estoqueMinimo || 0),
        custoMedio: Number(novoBrinde.custoMedio || 0),
      });
      setNovoBrinde(brindeEmpty);
      await carregar();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao criar brinde.');
    } finally {
      setSaving(false);
    }
  };

  const lancarEntrada = async () => {
    setSaving(true);
    try {
      await api.post('/brindes/entrada', {
        ...entrada,
        brindeId: Number(entrada.brindeId),
        quantidade: Number(entrada.quantidade),
        custoUnitario: Number(entrada.custoUnitario),
        despesaId: Number(entrada.despesaId),
      });
      setEntrada(entradaEmpty);
      await carregar();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao lancar entrada.');
    } finally {
      setSaving(false);
    }
  };

  const lancarSaida = async () => {
    setSaving(true);
    try {
      const clienteSelecionado = clientes.find((c) => Number(c.id) === Number(saida.clienteId));
      await api.post('/brindes/saida', {
        ...saida,
        brindeId: Number(saida.brindeId),
        quantidade: Number(saida.quantidade),
        clienteNome: clienteSelecionado?.nome || saida.clienteNome,
        vendaId: saida.vendaId ? Number(saida.vendaId) : null,
      });
      setSaida(saidaEmpty);
      await carregar();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao lancar saida.');
    } finally {
      setSaving(false);
    }
  };

  const vendasClienteSelecionado = useMemo(() => {
    if (!saida.clienteId) return [];
    return vendas.filter((v) => Number(v.clienteId) === Number(saida.clienteId));
  }, [saida.clienteId, vendas]);

  const movsFiltradasBusca = useMemo(() => {
    const q = String(filtroBusca || '').trim().toLowerCase();
    if (!q) return movs;
    return movs.filter((m) => {
      const nomeBrinde = String(m.brinde?.nome || '').toLowerCase();
      const nomePessoa = String(m.fornecedorNome || m.clienteNome || '').toLowerCase();
      const obs = String(m.observacao || '').toLowerCase();
      return nomeBrinde.includes(q) || nomePessoa.includes(q) || obs.includes(q);
    });
  }, [movs, filtroBusca]);

  return (
    <div>
      <div className="page-header">
        <h1>Brindes</h1>
      </div>

      {erro && <div className="alert alert-error" style={{ marginBottom: 12 }}>{erro}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <button className={`btn ${aba === 'ESTOQUE' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAba('ESTOQUE')}>Estoque</button>
        <button className={`btn ${aba === 'ENTRADA' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAba('ENTRADA')}>Entrada</button>
        <button className={`btn ${aba === 'SAIDA' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setAba('SAIDA')}>Saida</button>
      </div>

      <div className="filters" style={{ marginBottom: 12 }}>
        <select className="form-control" style={{ width: 220 }} value={filtroBrindeId} onChange={(e) => setFiltroBrindeId(e.target.value)}>
          <option value="">Todos os brindes</option>
          {brindes.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
        </select>
        <select className="form-control" style={{ width: 170 }} value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">Todos os tipos</option>
          <option value="ENTRADA">Entrada</option>
          <option value="SAIDA">Saida</option>
        </select>
        <input type="date" className="form-control" style={{ width: 170 }} value={filtroDataInicio} onChange={(e) => setFiltroDataInicio(e.target.value)} />
        <input type="date" className="form-control" style={{ width: 170 }} value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
        <input className="form-control" style={{ width: 260 }} placeholder="Buscar por brinde, fornecedor, cliente ou observacao" value={filtroBusca} onChange={(e) => setFiltroBusca(e.target.value)} />
        <button className="btn btn-outline" onClick={() => { setFiltroBrindeId(''); setFiltroTipo(''); setFiltroDataInicio(''); setFiltroDataFim(''); setFiltroBusca(''); }}>Limpar</button>
      </div>

      {aba === 'ESTOQUE' && (
        <>
          <div className="card" style={{ marginBottom: 12, padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Valor total em estoque</div>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{fmtCurr(totalEstoque)}</div>
          </div>

          <div className="card" style={{ marginBottom: 12 }}>
            <h3 style={{ marginBottom: 10 }}>Cadastro de brindes</h3>
            <div className="form-grid">
              <div className="form-group"><label>Nome</label><input className="form-control" value={novoBrinde.nome} onChange={(e) => setNovoBrinde((p) => ({ ...p, nome: e.target.value }))} /></div>
              <div className="form-group"><label>Estoque inicial</label><input type="number" className="form-control" value={novoBrinde.estoque} onChange={(e) => setNovoBrinde((p) => ({ ...p, estoque: e.target.value }))} /></div>
              <div className="form-group"><label>Estoque minimo</label><input type="number" className="form-control" value={novoBrinde.estoqueMinimo} onChange={(e) => setNovoBrinde((p) => ({ ...p, estoqueMinimo: e.target.value }))} /></div>
              <div className="form-group"><label>Custo medio</label><input type="number" step="0.01" className="form-control" value={novoBrinde.custoMedio} onChange={(e) => setNovoBrinde((p) => ({ ...p, custoMedio: e.target.value }))} /></div>
            </div>
            <div className="modal-footer" style={{ padding: 0, marginTop: 10 }}>
              <button className="btn btn-primary" disabled={saving || !novoBrinde.nome} onClick={criarBrinde}>Salvar brinde</button>
            </div>
          </div>

          <div className="table-container" style={{ marginBottom: 12 }}>
            <table>
              <thead>
                <tr>
                  <th>Brinde</th>
                  <th>Estoque</th>
                  <th>Estoque minimo</th>
                  <th>Custo medio</th>
                  <th>Valor em estoque</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6}><div className="loading"><div className="spinner" /></div></td></tr>
                ) : brindes.length === 0 ? (
                  <tr><td colSpan={6}><div className="empty-state">Nenhum brinde cadastrado.</div></td></tr>
                ) : brindes.map((b) => (
                  <tr key={b.id}>
                    <td><strong>{b.nome}</strong></td>
                    <td>{b.estoque}</td>
                    <td>{b.estoqueMinimo}</td>
                    <td>{fmtCurr(b.custoMedio)}</td>
                    <td>{fmtCurr(b.valorEstoque)}</td>
                    <td>{b.estoqueBaixo ? <span className="badge badge-danger">Estoque baixo</span> : <span className="badge badge-success">Ok</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {aba === 'ENTRADA' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginBottom: 10 }}>Entrada de Brindes</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Brinde</label>
              <select className="form-control" value={entrada.brindeId} onChange={(e) => setEntrada((p) => ({ ...p, brindeId: e.target.value }))}>
                <option value="">Selecione...</option>
                {brindes.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Quantidade</label><input type="number" className="form-control" value={entrada.quantidade} onChange={(e) => setEntrada((p) => ({ ...p, quantidade: e.target.value }))} /></div>
            <div className="form-group"><label>Custo unitario</label><input type="number" step="0.01" className="form-control" value={entrada.custoUnitario} onChange={(e) => setEntrada((p) => ({ ...p, custoUnitario: e.target.value }))} /></div>
            <div className="form-group"><label>Fornecedor</label><input className="form-control" value={entrada.fornecedorNome} onChange={(e) => setEntrada((p) => ({ ...p, fornecedorNome: e.target.value }))} /></div>
            <div className="form-group"><label>Data vencimento</label><input type="date" className="form-control" value={entrada.dataVencimento} onChange={(e) => setEntrada((p) => ({ ...p, dataVencimento: e.target.value }))} /></div>
            <div className="form-group">
              <label>Despesa (obrigatorio)</label>
              <select className="form-control" value={entrada.despesaId} onChange={(e) => setEntrada((p) => ({ ...p, despesaId: e.target.value }))}>
                <option value="">Selecione...</option>
                {despesas.map((d) => <option key={d.id} value={d.id}>{d.id} - {d.descricao}</option>)}
              </select>
            </div>
            <div className="form-group form-full"><label>Observacao</label><input className="form-control" value={entrada.observacao} onChange={(e) => setEntrada((p) => ({ ...p, observacao: e.target.value }))} /></div>
          </div>
          <div className="modal-footer" style={{ padding: 0, marginTop: 10 }}>
            <button className="btn btn-primary" disabled={saving || !entrada.brindeId || !entrada.quantidade || !entrada.custoUnitario || !entrada.fornecedorNome || !entrada.despesaId} onClick={lancarEntrada}>Salvar entrada</button>
          </div>
        </div>
      )}

      {aba === 'SAIDA' && (
        <div className="card" style={{ marginBottom: 12 }}>
          <h3 style={{ marginBottom: 10 }}>Saida de Brindes</h3>
          <div className="form-grid">
            <div className="form-group">
              <label>Brinde</label>
              <select className="form-control" value={saida.brindeId} onChange={(e) => setSaida((p) => ({ ...p, brindeId: e.target.value }))}>
                <option value="">Selecione...</option>
                {brindes.map((b) => <option key={b.id} value={b.id}>{b.nome}</option>)}
              </select>
            </div>
            <div className="form-group"><label>Quantidade</label><input type="number" className="form-control" value={saida.quantidade} onChange={(e) => setSaida((p) => ({ ...p, quantidade: e.target.value }))} /></div>
            <div className="form-group">
              <label>Cliente</label>
              <select
                className="form-control"
                value={saida.clienteId}
                onChange={(e) => setSaida((p) => ({ ...p, clienteId: e.target.value, vendaId: '' }))}
              >
                <option value="">Selecione...</option>
                {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Venda (opcional)</label>
              <select
                className="form-control"
                value={saida.vendaId}
                onChange={(e) => setSaida((p) => ({ ...p, vendaId: e.target.value }))}
                disabled={!saida.clienteId}
              >
                <option value="">Selecione...</option>
                {vendasClienteSelecionado.map((v) => (
                  <option key={v.id} value={v.id}>#{v.id} - {v.idReserva || 'sem reserva'} - {v.tipoServico}</option>
                ))}
              </select>
            </div>
            <div className="form-group form-full"><label>Observacao</label><input className="form-control" value={saida.observacao} onChange={(e) => setSaida((p) => ({ ...p, observacao: e.target.value }))} /></div>
          </div>
          <div className="modal-footer" style={{ padding: 0, marginTop: 10 }}>
            <button className="btn btn-primary" disabled={saving || !saida.brindeId || !saida.quantidade || !saida.clienteId} onClick={lancarSaida}>Salvar saida</button>
          </div>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Brinde</th>
              <th>Tipo</th>
              <th>Quantidade</th>
              <th>Custo unit.</th>
              <th>Valor total</th>
              <th>Fornecedor/Cliente</th>
              <th>DespesaId</th>
            </tr>
          </thead>
          <tbody>
            {movsFiltradasBusca.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state">Sem movimentacoes.</div></td></tr>
            ) : movsFiltradasBusca.slice(0, 100).map((m) => (
              <tr key={m.id}>
                <td>{m.dataMovimentacao ? new Date(m.dataMovimentacao).toLocaleString('pt-BR') : '-'}</td>
                <td>{m.brinde?.nome || `#${m.brindeId}`}</td>
                <td>{m.tipo}</td>
                <td>{m.quantidade}</td>
                <td>{fmtCurr(m.custoUnitario)}</td>
                <td>{fmtCurr(m.valorTotal)}</td>
                <td>{m.fornecedorNome || m.clienteNome || '-'}</td>
                <td>{m.despesaId || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
