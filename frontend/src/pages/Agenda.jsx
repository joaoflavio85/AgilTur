import { useState, useEffect } from 'react';
import api from '../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';
const toDateInputValue = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const getDiasParaData = (dataAlvo) => {
  if (!dataAlvo) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const alvo = new Date(dataAlvo);
  alvo.setHours(0, 0, 0, 0);

  const diffMs = alvo.getTime() - hoje.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export default function Agenda() {
  const hoje = new Date();
  const dataInicioPadrao = toDateInputValue(hoje);
  const dataFimPadrao = toDateInputValue(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 30));

  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState(dataInicioPadrao);
  const [dataFim, setDataFim] = useState(dataFimPadrao);

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await api.get('/agenda', { params: { dataInicio: dataInicio || undefined, dataFim: dataFim || undefined } });
      setDados(r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const viagensViajandoHoje = dados?.viajandoHoje?.viagens || [];
  const idsClientesViajandoHoje = new Set(
    viagensViajandoHoje.map((v) => Number(v?.cliente?.id || 0)).filter((id) => id > 0),
  );
  const viagensFuturasFiltradas = (dados?.viagensFuturas?.viagens || []).filter((v) => {
    const clienteId = Number(v?.cliente?.id || 0);
    return clienteId <= 0 || !idsClientesViajandoHoje.has(clienteId);
  });

  return (
    <div>
      <div className="page-header">
        <h1>Agenda de Viagens</h1>
      </div>

      <div className="filters">
        <div className="form-group">
          <label style={{fontSize:12,color:'var(--text-muted)'}}>DATA INÍCIO</label>
          <input type="date" className="form-control" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>
        <div className="form-group">
          <label style={{fontSize:12,color:'var(--text-muted)'}}>DATA FIM</label>
          <input type="date" className="form-control" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={carregar} style={{alignSelf:'flex-end'}}>Filtrar</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /> Carregando...</div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:28}}>
          {/* Viajando hoje */}
          <div>
            <h3 style={{marginBottom:14,fontSize:16,display:'flex',alignItems:'center',gap:8}}>
              ✈️ Viajando Hoje
              <span className="badge badge-danger">{dados?.viajandoHoje?.total || 0}</span>
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Cliente</th><th>Destino / Serviço</th><th>Tipo</th><th>Partida</th><th>Retorno</th><th>Agente</th></tr>
                </thead>
                <tbody>
                  {dados?.viajandoHoje?.viagens?.length === 0 ? (
                    <tr><td colSpan={6}><div className="empty-state">Nenhum cliente viajando hoje.</div></td></tr>
                  ) : dados?.viajandoHoje?.viagens?.map((v) => (
                    <tr key={v.id}>
                      <td><strong>{v.cliente?.nome}</strong><br/><span style={{fontSize:12,color:'var(--text-muted)'}}>{v.cliente?.telefone}</span></td>
                      <td>{v.descricao}</td>
                      <td><span className="badge badge-default">{v.tipoServico}</span></td>
                      <td>{fmtDate(v.dataViagemInicio)}</td>
                      <td>{fmtDate(v.dataViagemFim)}</td>
                      <td>{v.agente?.nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Viagens futuras */}
          <div>
            <h3 style={{marginBottom:14,fontSize:16,display:'flex',alignItems:'center',gap:8}}>
              🗓️ Viagens Futuras
              <span className="badge badge-info">{viagensFuturasFiltradas.length}</span>
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Cliente</th><th>Destino / Serviço</th><th>Tipo</th><th>Partida</th><th>Retorno</th><th>Faltam</th><th>Agente</th></tr>
                </thead>
                <tbody>
                  {viagensFuturasFiltradas.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state">Nenhuma viagem futura cadastrada.</div></td></tr>
                  ) : viagensFuturasFiltradas.map((v) => {
                    const diasRestantes = getDiasParaData(v.dataViagemInicio);
                    const estaProxima = diasRestantes !== null && diasRestantes >= 0 && diasRestantes < 7;

                    return (
                    <tr key={v.id} style={estaProxima ? { background: '#fff7ed' } : undefined}>
                      <td><strong>{v.cliente?.nome}</strong><br/><span style={{fontSize:12,color:'var(--text-muted)'}}>{v.cliente?.telefone}</span></td>
                      <td>{v.descricao}</td>
                      <td><span className="badge badge-default">{v.tipoServico}</span></td>
                      <td>{fmtDate(v.dataViagemInicio)}</td>
                      <td>{fmtDate(v.dataViagemFim)}</td>
                      <td>
                        <span className={`badge ${estaProxima ? 'badge-danger' : 'badge-info'}`}>
                          {diasRestantes === null ? '-' : `${diasRestantes} dia${diasRestantes === 1 ? '' : 's'}`}
                        </span>
                      </td>
                      <td>{v.agente?.nome}</td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
