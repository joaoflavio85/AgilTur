import { useEffect, useState } from 'react';
import api from '../services/api';

const empty = {
  nome: '',
  cnpj: '',
  telefone: '',
  email: '',
  ativo: true,
};

export default function Operadoras() {
  const [operadoras, setOperadoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const carregar = async (termo) => {
    setLoading(true);
    try {
      const r = await api.get('/operadoras', { params: { search: termo || undefined } });
      setOperadoras(r.data);
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

  const abrirEditar = (o) => {
    setForm({
      nome: o.nome || '',
      cnpj: o.cnpj || '',
      telefone: o.telefone || '',
      email: o.email || '',
      ativo: o.ativo,
    });
    setEditId(o.id);
    setError('');
    setModal(true);
  };

  const salvar = async () => {
    setError('');
    setSaving(true);
    try {
      if (editId) await api.put(`/operadoras/${editId}`, form);
      else await api.post('/operadoras', form);
      setModal(false);
      carregar(search);
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar operadora.');
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (id) => {
    if (!confirm('Deseja excluir esta operadora?')) return;
    try {
      await api.delete(`/operadoras/${id}`);
      carregar(search);
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao excluir operadora.');
    }
  };

  const buscar = (e) => {
    e.preventDefault();
    carregar(search);
  };

  const f = (k) => (e) => {
    const value = k === 'ativo' ? e.target.checked : e.target.value;
    setForm({ ...form, [k]: value });
  };

  return (
    <div>
      <div className="page-header">
        <h1>Operadoras</h1>
        <button className="btn btn-primary" onClick={abrirCriar}>+ Nova Operadora</button>
      </div>

      <form className="filters" onSubmit={buscar}>
        <input
          className="form-control search-input"
          placeholder="Buscar por nome, CNPJ, email ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="submit" className="btn btn-outline">Buscar</button>
        {search && <button type="button" className="btn btn-outline" onClick={() => { setSearch(''); carregar(); }}>Limpar</button>}
      </form>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th><th>CNPJ</th><th>Telefone</th><th>Email</th><th>Status</th><th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loading"><div className="spinner" /></div></td></tr>
            ) : operadoras.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state">Nenhuma operadora encontrada.</div></td></tr>
            ) : operadoras.map((o) => (
              <tr key={o.id}>
                <td><strong>{o.nome}</strong></td>
                <td>{o.cnpj || '-'}</td>
                <td>{o.telefone || '-'}</td>
                <td>{o.email || '-'}</td>
                <td>
                  <span className={`badge ${o.ativo ? 'badge-success' : 'badge-default'}`}>
                    {o.ativo ? 'ATIVA' : 'INATIVA'}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(o)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => excluir(o.id)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <h3>{editId ? 'Editar Operadora' : 'Nova Operadora'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>X</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-grid">
              <div className="form-group form-full">
                <label>Nome *</label>
                <input className="form-control" value={form.nome} onChange={f('nome')} placeholder="Nome da operadora" />
              </div>
              <div className="form-group">
                <label>CNPJ</label>
                <input className="form-control" value={form.cnpj} onChange={f('cnpj')} placeholder="00.000.000/0000-00" />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input className="form-control" value={form.telefone} onChange={f('telefone')} placeholder="(00) 00000-0000" />
              </div>
              <div className="form-group form-full">
                <label>Email</label>
                <input type="email" className="form-control" value={form.email} onChange={f('email')} placeholder="contato@operadora.com" />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input id="operadora-ativa" type="checkbox" checked={form.ativo} onChange={f('ativo')} />
                <label htmlFor="operadora-ativa">Operadora ativa</label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={saving || !form.nome}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
