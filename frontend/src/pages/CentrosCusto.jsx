import { useEffect, useState } from 'react';
import api from '../services/api';

const empty = {
  descricao: '',
  ativo: true,
};

export default function CentrosCusto() {
  const [centros, setCentros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await api.get('/centros-custo');
      setCentros(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const abrirCriar = () => {
    setForm(empty);
    setEditId(null);
    setError('');
    setModal(true);
  };

  const abrirEditar = (centro) => {
    setForm({
      descricao: centro.descricao || '',
      ativo: centro.ativo,
    });
    setEditId(centro.id);
    setError('');
    setModal(true);
  };

  const salvar = async () => {
    setError('');
    setSaving(true);
    try {
      if (editId) await api.put(`/centros-custo/${editId}`, form);
      else await api.post('/centros-custo', form);
      setModal(false);
      carregar();
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar centro de custo.');
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (id) => {
    if (!confirm('Deseja excluir este centro de custo?')) return;
    try {
      await api.delete(`/centros-custo/${id}`);
      carregar();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao excluir centro de custo.');
    }
  };

  const f = (k) => (e) => {
    const value = k === 'ativo' ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: value });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Centros de Custo</h1>
        <button className="btn btn-primary" onClick={abrirCriar}>+ Novo Centro</button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Descricao</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4}><div className="loading"><div className="spinner" /></div></td></tr>
            ) : centros.length === 0 ? (
              <tr><td colSpan={4}><div className="empty-state">Nenhum centro de custo encontrado.</div></td></tr>
            ) : centros.map((centro) => (
              <tr key={centro.id}>
                <td>{centro.id}</td>
                <td><strong>{centro.descricao}</strong></td>
                <td>
                  <span className={`badge ${centro.ativo ? 'badge-success' : 'badge-default'}`}>
                    {centro.ativo ? 'ATIVO' : 'INATIVO'}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(centro)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => excluir(centro.id)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h3>{editId ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>X</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-grid">
              <div className="form-group form-full">
                <label>Descricao *</label>
                <input
                  className="form-control"
                  value={form.descricao}
                  onChange={f('descricao')}
                  placeholder="Ex: Marketing, Operacional, TI"
                />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input id="centro-ativo" type="checkbox" checked={form.ativo} onChange={f('ativo')} />
                <label htmlFor="centro-ativo">Centro de custo ativo</label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={saving || !form.descricao.trim()}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
