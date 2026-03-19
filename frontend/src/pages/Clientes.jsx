import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const empty = {
  nome: '', cpf: '', rg: '', dataNascimento: '', telefone: '',
  email: '', endereco: '', observacoes: ''
};

export default function Clientes() {
  const { isAdmin } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const carregar = async (s) => {
    setLoading(true);
    try {
      const r = await api.get('/clientes', { params: { search: s || undefined } });
      setClientes(r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const abrirCriar = () => { setForm(empty); setEditId(null); setError(''); setModal(true); };
  const abrirEditar = (c) => {
    setForm({
      nome: c.nome || '', cpf: c.cpf || '', rg: c.rg || '',
      dataNascimento: c.dataNascimento ? c.dataNascimento.split('T')[0] : '',
      telefone: c.telefone || '', email: c.email || '',
      endereco: c.endereco || '', observacoes: c.observacoes || ''
    });
    setEditId(c.id);
    setError('');
    setModal(true);
  };

  const salvar = async () => {
    setError(''); setSaving(true);
    try {
      if (editId) await api.put(`/clientes/${editId}`, form);
      else await api.post('/clientes', form);
      setModal(false);
      carregar(search);
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar.');
    } finally { setSaving(false); }
  };

  const excluir = async (id) => {
    if (!confirm('Deseja excluir este cliente?')) return;
    try {
      await api.delete(`/clientes/${id}`);
      carregar(search);
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao excluir.');
    }
  };

  const buscar = (e) => {
    e.preventDefault();
    carregar(search);
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="page-header">
        <h1>Clientes</h1>
        <button className="btn btn-primary" onClick={abrirCriar}>+ Novo Cliente</button>
      </div>

      <form className="filters" onSubmit={buscar}>
        <input
          className="form-control search-input"
          placeholder="Buscar por nome, CPF ou email..."
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
              <th>Nome</th><th>CPF</th><th>Telefone</th><th>Email</th><th>Cadastro</th><th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6}><div className="loading"><div className="spinner" /></div></td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={6}><div className="empty-state">Nenhum cliente encontrado.</div></td></tr>
            ) : clientes.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.nome}</strong></td>
                <td>{c.cpf}</td>
                <td>{c.telefone || '—'}</td>
                <td>{c.email || '—'}</td>
                <td>{new Date(c.dataCadastro).toLocaleDateString('pt-BR')}</td>
                <td>
                  <div className="actions">
                    <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(c)}>✏️ Editar</button>
                    {isAdmin && <button className="btn btn-sm btn-danger" onClick={() => excluir(c.id)}>🗑️</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{maxWidth:680}}>
            <div className="modal-header">
              <h3>{editId ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-grid">
              <div className="form-group form-full">
                <label>Nome *</label>
                <input className="form-control" value={form.nome} onChange={f('nome')} placeholder="Nome completo" />
              </div>
              <div className="form-group">
                <label>CPF *</label>
                <input className="form-control" value={form.cpf} onChange={f('cpf')} placeholder="000.000.000-00" />
              </div>
              <div className="form-group">
                <label>RG</label>
                <input className="form-control" value={form.rg} onChange={f('rg')} placeholder="00.000.000-0" />
              </div>
              <div className="form-group">
                <label>Data de Nascimento</label>
                <input type="date" className="form-control" value={form.dataNascimento} onChange={f('dataNascimento')} />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input className="form-control" value={form.telefone} onChange={f('telefone')} placeholder="(11) 99999-0000" />
              </div>
              <div className="form-group form-full">
                <label>Email</label>
                <input type="email" className="form-control" value={form.email} onChange={f('email')} placeholder="cliente@email.com" />
              </div>
              <div className="form-group form-full">
                <label>Endereço</label>
                <input className="form-control" value={form.endereco} onChange={f('endereco')} placeholder="Rua, número, bairro, cidade/UF" />
              </div>
              <div className="form-group form-full">
                <label>Observações</label>
                <textarea className="form-control" rows={3} value={form.observacoes} onChange={f('observacoes')} placeholder="Observações gerais sobre o cliente..." />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
