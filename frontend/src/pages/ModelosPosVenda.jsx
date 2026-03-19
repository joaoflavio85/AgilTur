import { useEffect, useState } from 'react';
import api from '../services/api';

const TIPOS_SERVICO = ['AEREO', 'HOTEL', 'PACOTE', 'CRUZEIRO', 'RODOVIARIO', 'SEGURO_VIAGEM', 'OUTROS'];
const TIPOS_ACAO = ['TROCA_RESERVA', 'CANCELAMENTO', 'EMISSAO_VOUCHER', 'ENTREGA_BRINDE', 'CHECKIN_VOO'];
const ACOES_LABEL = {
  TROCA_RESERVA: 'Troca de Reserva',
  CANCELAMENTO: 'Cancelamento',
  EMISSAO_VOUCHER: 'Emissao de Voucher',
  ENTREGA_BRINDE: 'Entrega de Brinde',
  CHECKIN_VOO: 'Check-in / Voo',
};

const empty = {
  tipoServico: 'PACOTE',
  operadoraId: '',
  tipoAcao: 'EMISSAO_VOUCHER',
  descricaoPadrao: '',
  ordem: 1,
  ativo: true,
};

export default function ModelosPosVenda() {
  const [modelos, setModelos] = useState([]);
  const [operadoras, setOperadoras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [filtroTipoServico, setFiltroTipoServico] = useState('');
  const [filtroOperadoraId, setFiltroOperadoraId] = useState('');
  const [filtroAtivo, setFiltroAtivo] = useState('true');

  const carregar = async () => {
    setLoading(true);
    try {
      const params = {
        tipoServico: filtroTipoServico || undefined,
        operadoraId: filtroOperadoraId || undefined,
        ativo: filtroAtivo === '' ? undefined : filtroAtivo,
      };

      const [modelosResp, operadorasResp] = await Promise.all([
        api.get('/modelos-pos-venda', { params }),
        api.get('/operadoras'),
      ]);

      setModelos(modelosResp.data || []);
      setOperadoras(operadorasResp.data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, [filtroTipoServico, filtroOperadoraId, filtroAtivo]);

  const abrirCriar = () => {
    setForm(empty);
    setEditId(null);
    setError('');
    setModal(true);
  };

  const abrirEditar = (modelo) => {
    setForm({
      tipoServico: modelo.tipoServico,
      operadoraId: modelo.operadoraId || '',
      tipoAcao: modelo.tipoAcao,
      descricaoPadrao: modelo.descricaoPadrao,
      ordem: modelo.ordem || 1,
      ativo: modelo.ativo,
    });
    setEditId(modelo.id);
    setError('');
    setModal(true);
  };

  const salvar = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        operadoraId: form.operadoraId ? Number(form.operadoraId) : null,
        ordem: Number(form.ordem) || 1,
      };

      if (editId) await api.put(`/modelos-pos-venda/${editId}`, payload);
      else await api.post('/modelos-pos-venda', payload);

      setModal(false);
      carregar();
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar modelo.');
    } finally {
      setSaving(false);
    }
  };

  const excluir = async (id) => {
    if (!confirm('Excluir este modelo de pos-venda?')) return;
    try {
      await api.delete(`/modelos-pos-venda/${id}`);
      carregar();
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao excluir modelo.');
    }
  };

  const f = (key) => (e) => {
    const value = key === 'ativo' ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      <div className="page-header">
        <h1>Modelos de Pos-Venda</h1>
        <button className="btn btn-primary" onClick={abrirCriar}>+ Novo Modelo</button>
      </div>

      <div className="filters">
        <select className="form-control" style={{ width: 180 }} value={filtroTipoServico} onChange={(e) => setFiltroTipoServico(e.target.value)}>
          <option value="">Todos os tipos</option>
          {TIPOS_SERVICO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
        </select>

        <select className="form-control" style={{ width: 220 }} value={filtroOperadoraId} onChange={(e) => setFiltroOperadoraId(e.target.value)}>
          <option value="">Todas as operadoras</option>
          {operadoras.map((operadora) => <option key={operadora.id} value={operadora.id}>{operadora.nome}</option>)}
        </select>

        <select className="form-control" style={{ width: 180 }} value={filtroAtivo} onChange={(e) => setFiltroAtivo(e.target.value)}>
          <option value="true">Somente ativos</option>
          <option value="false">Somente inativos</option>
          <option value="">Todos</option>
        </select>

        <button
          className="btn btn-outline"
          onClick={() => {
            setFiltroTipoServico('');
            setFiltroOperadoraId('');
            setFiltroAtivo('true');
          }}
        >
          Limpar filtros
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Tipo Servico</th>
              <th>Operadora</th>
              <th>Acao</th>
              <th>Descricao</th>
              <th>Ordem</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7}><div className="loading"><div className="spinner" /></div></td></tr>
            ) : modelos.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state">Nenhum modelo encontrado.</div></td></tr>
            ) : modelos.map((modelo) => (
              <tr key={modelo.id}>
                <td><span className="badge badge-default">{modelo.tipoServico}</span></td>
                <td>{modelo.operadora?.nome || 'Todas'}</td>
                <td>{ACOES_LABEL[modelo.tipoAcao] || modelo.tipoAcao}</td>
                <td style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{modelo.descricaoPadrao}</td>
                <td>{modelo.ordem}</td>
                <td><span className={`badge ${modelo.ativo ? 'badge-success' : 'badge-default'}`}>{modelo.ativo ? 'ATIVO' : 'INATIVO'}</span></td>
                <td>
                  <div className="actions">
                    <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(modelo)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={() => excluir(modelo.id)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth: 740 }}>
            <div className="modal-header">
              <h3>{editId ? 'Editar Modelo de Pos-Venda' : 'Novo Modelo de Pos-Venda'}</h3>
              <button className="btn-icon" onClick={() => setModal(false)}>X</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-grid">
              <div className="form-group">
                <label>Tipo de Servico *</label>
                <select className="form-control" value={form.tipoServico} onChange={f('tipoServico')}>
                  {TIPOS_SERVICO.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Operadora</label>
                <select className="form-control" value={form.operadoraId} onChange={f('operadoraId')}>
                  <option value="">Todas</option>
                  {operadoras.map((operadora) => <option key={operadora.id} value={operadora.id}>{operadora.nome}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Tipo de Acao *</label>
                <select className="form-control" value={form.tipoAcao} onChange={f('tipoAcao')}>
                  {TIPOS_ACAO.map((acao) => <option key={acao} value={acao}>{ACOES_LABEL[acao]}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Ordem *</label>
                <input type="number" min={1} className="form-control" value={form.ordem} onChange={f('ordem')} />
              </div>

              <div className="form-group form-full">
                <label>Descricao Padrao *</label>
                <textarea className="form-control" rows={4} value={form.descricaoPadrao} onChange={f('descricaoPadrao')} />
              </div>

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input id="modelo-pos-ativo" type="checkbox" checked={form.ativo} onChange={f('ativo')} />
                <label htmlFor="modelo-pos-ativo">Modelo ativo</label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvar} disabled={saving || !form.descricaoPadrao.trim()}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
