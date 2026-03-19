import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyPagination = { page: 1, pageSize: 20, total: 0, totalPages: 1 };

const fmtDateTime = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR');
};

const parseJsonSafe = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export default function Auditoria() {
  const { usuario } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [entidade, setEntidade] = useState('');
  const [acao, setAcao] = useState('');
  const [usuarioId, setUsuarioId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const [pagination, setPagination] = useState(emptyPagination);
  const [eventoSelecionado, setEventoSelecionado] = useState(null);

  const carregar = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/auditoria', {
        params: {
          entidade: entidade || undefined,
          acao: acao || undefined,
          usuarioId: usuarioId || undefined,
          dataInicio: dataInicio || undefined,
          dataFim: dataFim || undefined,
          page: pagination.page,
          pageSize: pagination.pageSize,
        },
      });

      setItems(data.items || []);
      setPagination((prev) => ({
        ...prev,
        ...(data.pagination || emptyPagination),
      }));
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar auditoria.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [pagination.page, pagination.pageSize, entidade, acao, usuarioId, dataInicio, dataFim]);

  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [entidade, acao, usuarioId, dataInicio, dataFim]);

  if (usuario?.perfil !== 'ADMIN') {
    return (
      <div className="card">
        <h2>Acesso restrito</h2>
        <p className="text-muted" style={{ marginTop: 8 }}>
          Apenas administradores podem acessar a auditoria.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Auditoria</h1>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="form-grid-3">
          <div className="form-group">
            <label>Entidade</label>
            <input className="form-control" value={entidade} onChange={(e) => setEntidade(e.target.value)} placeholder="Ex: VENDA" />
          </div>
          <div className="form-group">
            <label>Acao</label>
            <input className="form-control" value={acao} onChange={(e) => setAcao(e.target.value)} placeholder="Ex: ATUALIZACAO" />
          </div>
          <div className="form-group">
            <label>ID Usuario</label>
            <input className="form-control" value={usuarioId} onChange={(e) => setUsuarioId(e.target.value)} placeholder="Ex: 1" />
          </div>
          <div className="form-group">
            <label>Data Inicio</label>
            <input type="date" className="form-control" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Data Fim</label>
            <input type="date" className="form-control" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <label>&nbsp;</label>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => {
                setEntidade('');
                setAcao('');
                setUsuarioId('');
                setDataInicio('');
                setDataFim('');
              }}
            >
              Limpar filtros
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, fontSize: 14 }}>
        <span><strong>Registros:</strong> {pagination.total}</span>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Entidade</th>
              <th>Acao</th>
              <th>Registro</th>
              <th>Usuario</th>
              <th>Resumo</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <div className="loading"><div className="spinner" /></div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7}><div className="empty-state">Nenhum evento encontrado.</div></td>
              </tr>
            ) : (
              items.map((item) => {
                const antes = parseJsonSafe(item.antesJson);
                const depois = parseJsonSafe(item.depoisJson);

                return (
                  <tr key={item.id}>
                    <td>{fmtDateTime(item.dataEvento)}</td>
                    <td><span className="badge badge-default">{item.entidade}</span></td>
                    <td><span className="badge badge-info">{item.acao}</span></td>
                    <td>#{item.registroId || '-'}</td>
                    <td>
                      <strong>{item.usuarioNome || '-'}</strong>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.usuarioEmail || '-'}</div>
                    </td>
                    <td style={{ maxWidth: 260 }}>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        Antes: {antes ? 'sim' : 'nao'} | Depois: {depois ? 'sim' : 'nao'}
                      </div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        Perfil: {item.usuarioPerfil || '-'}
                      </div>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline"
                        type="button"
                        onClick={() => setEventoSelecionado(item)}
                      >
                        Ver detalhes
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            Pagina {pagination.page} de {pagination.totalPages}
          </span>
          <select
            className="form-control"
            style={{ width: 110 }}
            value={pagination.pageSize}
            onChange={(e) => setPagination((prev) => ({ ...prev, pageSize: Number(e.target.value), page: 1 }))}
          >
            {[20, 50, 100].map((size) => <option key={size} value={size}>{size}/pag</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
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

      {eventoSelecionado && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEventoSelecionado(null)}>
          <div className="modal" style={{ maxWidth: 900 }}>
            <div className="modal-header">
              <h3>Evento #{eventoSelecionado.id}</h3>
              <button className="btn-icon" onClick={() => setEventoSelecionado(null)}>x</button>
            </div>

            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label>Data</label>
                <div>{fmtDateTime(eventoSelecionado.dataEvento)}</div>
              </div>
              <div className="form-group">
                <label>Entidade / Acao</label>
                <div>{eventoSelecionado.entidade} / {eventoSelecionado.acao}</div>
              </div>
              <div className="form-group">
                <label>Registro</label>
                <div>#{eventoSelecionado.registroId || '-'}</div>
              </div>
              <div className="form-group">
                <label>Usuario</label>
                <div>{eventoSelecionado.usuarioNome || '-'} ({eventoSelecionado.usuarioEmail || '-'})</div>
              </div>
            </div>

            <div className="form-grid" style={{ gap: 12 }}>
              <div className="form-group form-full">
                <label>Antes</label>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  {JSON.stringify(parseJsonSafe(eventoSelecionado.antesJson), null, 2) || '-'}
                </pre>
              </div>
              <div className="form-group form-full">
                <label>Depois</label>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  {JSON.stringify(parseJsonSafe(eventoSelecionado.depoisJson), null, 2) || '-'}
                </pre>
              </div>
              <div className="form-group form-full">
                <label>Metadados</label>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, margin: 0, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                  {JSON.stringify(parseJsonSafe(eventoSelecionado.metadadosJson), null, 2) || '-'}
                </pre>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => setEventoSelecionado(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
