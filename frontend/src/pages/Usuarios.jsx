import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const empty = { nome:'', email:'', senha:'', telefone:'', perfil:'AGENTE', ativo:true };

export default function Usuarios() {
  const { isAdmin } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const carregar = async () => {
    setLoading(true);
    try { const r = await api.get('/usuarios'); setUsuarios(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const abrirCriar = () => { setForm(empty); setEditId(null); setError(''); setModal(true); };
  const abrirEditar = (u) => {
    setForm({ nome:u.nome, email:u.email, senha:'', telefone:u.telefone||'', perfil:u.perfil, ativo:u.ativo });
    setEditId(u.id); setError(''); setModal(true);
  };

  const salvar = async () => {
    setError(''); setSaving(true);
    try {
      const payload = { ...form };
      if (editId && !payload.senha) delete payload.senha;
      if (editId) await api.put(`/usuarios/${editId}`, payload);
      else await api.post('/usuarios', payload);
      setModal(false); carregar();
    } catch(e) { setError(e.response?.data?.error || 'Erro.'); }
    finally { setSaving(false); }
  };

  const desativar = async (id) => {
    if (!confirm('Desativar usuário?')) return;
    try { await api.delete(`/usuarios/${id}`); carregar(); }
    catch(e) { alert(e.response?.data?.error || 'Erro.'); }
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  return (
    <div>
      <div className="page-header">
        <h1>Usuários</h1>
        {isAdmin && <button className="btn btn-primary" onClick={abrirCriar}>+ Novo Usuário</button>}
      </div>

      {!isAdmin && <div className="alert alert-error">Apenas administradores podem gerenciar usuários.</div>}

      <div className="table-container">
        <table>
          <thead>
            <tr><th>Nome</th><th>Email</th><th>Telefone</th><th>Perfil</th><th>Status</th>{isAdmin && <th>Ações</th>}</tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6}><div className="loading"><div className="spinner"/></div></td></tr>
            : usuarios.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.nome}</strong></td>
                <td>{u.email}</td>
                <td>{u.telefone || '—'}</td>
                <td><span className={`badge ${u.perfil==='ADMIN'?'badge-danger':'badge-info'}`}>{u.perfil}</span></td>
                <td><span className={`badge ${u.ativo?'badge-success':'badge-default'}`}>{u.ativo?'Ativo':'Inativo'}</span></td>
                {isAdmin && (
                  <td>
                    <div className="actions">
                      <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(u)}>✏️ Editar</button>
                      {u.ativo && <button className="btn btn-sm btn-danger" onClick={() => desativar(u.id)}>Desativar</button>}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h3>{editId ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <div className="form-grid">
              <div className="form-group form-full">
                <label>Nome *</label>
                <input className="form-control" value={form.nome} onChange={f('nome')} />
              </div>
              <div className="form-group">
                <label>Email *</label>
                <input type="email" className="form-control" value={form.email} onChange={f('email')} />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input className="form-control" value={form.telefone} onChange={f('telefone')} />
              </div>
              <div className="form-group">
                <label>Senha {editId ? '(deixe em branco para manter)' : '*'}</label>
                <input type="password" className="form-control" value={form.senha} onChange={f('senha')} placeholder="••••••" />
              </div>
              <div className="form-group">
                <label>Perfil</label>
                <select className="form-control" value={form.perfil} onChange={f('perfil')}>
                  <option value="AGENTE">AGENTE</option>
                  <option value="ADMIN">ADMIN</option>
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
