import { useState, useEffect } from 'react';
import api from '../services/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—';

export default function Agenda() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await api.get('/agenda', { params: { dataInicio: dataInicio || undefined, dataFim: dataFim || undefined } });
      setDados(r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

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
              <span className="badge badge-info">{dados?.viagensFuturas?.total || 0}</span>
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr><th>Cliente</th><th>Destino / Serviço</th><th>Tipo</th><th>Partida</th><th>Retorno</th><th>Agente</th></tr>
                </thead>
                <tbody>
                  {dados?.viagensFuturas?.viagens?.length === 0 ? (
                    <tr><td colSpan={6}><div className="empty-state">Nenhuma viagem futura cadastrada.</div></td></tr>
                  ) : dados?.viagensFuturas?.viagens?.map((v) => (
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
        </div>
      )}
    </div>
  );
}
