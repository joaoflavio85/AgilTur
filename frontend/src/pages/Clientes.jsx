import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const empty = {
  nome: '', cpf: '', rg: '', dataNascimento: '', telefone: '',
  email: '', endereco: '', observacoes: ''
};

const somenteDigitos = (v) => String(v || '').replace(/\D/g, '');

const formatarCpf = (v) => {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

const formatarTelefone = (v) => {
  const d = somenteDigitos(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const isCpfTecnico = (cliente) => {
  const cpf = somenteDigitos(cliente?.cpf || '');
  const observacoes = String(cliente?.observacoes || '');
  return (cpf.length === 11 && cpf.startsWith('000')) || observacoes.includes('[CPF_TECNICO]');
};

const mapCampoLabel = {
  nome: 'Nome',
  cpf: 'CPF',
  rg: 'RG',
  dataNascimento: 'Data de nascimento',
  telefone: 'Telefone',
  email: 'Email',
  endereco: 'Endereco',
  observacoes: 'Observacoes',
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
  const [rankingIndicadores, setRankingIndicadores] = useState([]);
  const [indicacoesModal, setIndicacoesModal] = useState({
    aberto: false,
    cliente: null,
    loading: false,
    itens: [],
    ranking: [],
    erro: '',
  });
  const [whatsModal, setWhatsModal] = useState({
    aberto: false,
    clienteId: null,
    clienteNome: '',
    telefone: '',
    mensagem: '',
    enviando: false,
    erro: '',
  });

  const normalizarTelefone = (v) => somenteDigitos(v);
  const podeSalvar = String(form.nome || '').trim().length >= 2 && normalizarTelefone(form.telefone).length >= 10;

  const carregar = async (s) => {
    setLoading(true);
    try {
      const [r, rankingResp] = await Promise.all([
        api.get('/clientes', { params: { search: s || undefined } }),
        api.get('/clientes/indicacoes/ranking', { params: { limit: 50 } }),
      ]);
      setClientes(r.data);
      setRankingIndicadores(Array.isArray(rankingResp.data) ? rankingResp.data : []);
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao carregar clientes.');
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
      const payload = {
        ...form,
        nome: String(form.nome || '').trim(),
        telefone: normalizarTelefone(form.telefone),
        cpf: somenteDigitos(form.cpf),
      };

      if (editId) await api.put(`/clientes/${editId}`, payload);
      else await api.post('/clientes', payload);
      setModal(false);
      carregar(search);
    } catch (e) {
      const apiError = e.response?.data;
      const detalhes = Array.isArray(apiError?.detalhes) ? apiError.detalhes : [];

      if (detalhes.length) {
        const mensagens = detalhes.map((d) => {
          const campo = d?.campo ? (mapCampoLabel[d.campo] || d.campo) : 'Campo';
          const mensagem = d?.mensagem || 'Valor invalido.';
          return `${campo}: ${mensagem}`;
        });
        setError(mensagens.join(' | '));
      } else {
        setError(apiError?.error || 'Erro ao salvar.');
      }
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

  const abrirWhatsAppCliente = (cliente) => {
    const telefone = somenteDigitos(cliente?.telefone);
    if (!telefone || telefone.length < 10) {
      alert('Cliente sem telefone valido no cadastro.');
      return;
    }

    setWhatsModal({
      aberto: true,
      clienteId: cliente.id,
      clienteNome: cliente.nome || 'Cliente',
      telefone,
      mensagem: `Ola ${cliente.nome || ''}, tudo bem? Estou entrando em contato pela Arame Turismo para dar continuidade ao seu atendimento.`,
      enviando: false,
      erro: '',
    });
  };

  const enviarWhatsAppCliente = async () => {
    const telefone = somenteDigitos(whatsModal.telefone);
    const mensagem = String(whatsModal.mensagem || '').trim();

    if (!telefone || telefone.length < 10) {
      setWhatsModal((prev) => ({ ...prev, erro: 'Telefone invalido para envio.' }));
      return;
    }

    if (!mensagem) {
      setWhatsModal((prev) => ({ ...prev, erro: 'Digite a mensagem antes de enviar.' }));
      return;
    }

    setWhatsModal((prev) => ({ ...prev, enviando: true, erro: '' }));
    try {
      await api.post('/whatsapp/chatbot/enviar-mensagem', {
        number: telefone,
        mensagem,
        clienteId: whatsModal.clienteId,
      });

      setWhatsModal({
        aberto: false,
        clienteId: null,
        clienteNome: '',
        telefone: '',
        mensagem: '',
        enviando: false,
        erro: '',
      });
      alert('Mensagem enviada com sucesso via ChatBot.');
    } catch (e) {
      setWhatsModal((prev) => ({
        ...prev,
        enviando: false,
        erro: e.response?.data?.error || 'Falha ao enviar mensagem via ChatBot.',
      }));
    }
  };

  const abrirIndicacoesCliente = async (cliente) => {
    setIndicacoesModal({
      aberto: true,
      cliente,
      loading: true,
      itens: [],
      ranking: [],
      erro: '',
    });

    try {
      const [hist, ranking] = await Promise.all([
        api.get(`/clientes/${cliente.id}/indicacoes`),
        api.get('/clientes/indicacoes/ranking', { params: { limit: 10 } }),
      ]);

      setIndicacoesModal({
        aberto: true,
        cliente,
        loading: false,
        itens: Array.isArray(hist.data) ? hist.data : [],
        ranking: Array.isArray(ranking.data) ? ranking.data : [],
        erro: '',
      });
    } catch (e) {
      setIndicacoesModal((prev) => ({
        ...prev,
        loading: false,
        erro: e.response?.data?.error || 'Erro ao carregar indicacoes do cliente.',
      }));
    }
  };

  const marcarBonificacaoPaga = async (indicacaoId) => {
    try {
      await api.patch(`/clientes/indicacoes/${indicacaoId}/pagar-bonificacao`, {
        dataPagamento: new Date().toISOString(),
        observacao: 'Bonificacao marcada como paga via painel de clientes.',
      });

      if (indicacoesModal?.cliente?.id) {
        await abrirIndicacoesCliente(indicacoesModal.cliente);
      }
      await carregar(search);
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao marcar bonificacao como paga.');
    }
  };

  const desfazerBonificacaoPaga = async (indicacaoId) => {
    try {
      await api.patch(`/clientes/indicacoes/${indicacaoId}/desfazer-bonificacao`, {
        observacao: 'Pagamento de bonificacao desfeito via painel de clientes.',
      });

      if (indicacoesModal?.cliente?.id) {
        await abrirIndicacoesCliente(indicacoesModal.cliente);
      }
      await carregar(search);
    } catch (e) {
      alert(e.response?.data?.error || 'Erro ao desfazer pagamento de bonificacao.');
    }
  };

  const rankingMap = new Map(rankingIndicadores.map((r) => [Number(r.clienteId), r]));

  const buscar = (e) => {
    e.preventDefault();
    carregar(search);
  };

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const cpfTecnicoEmEdicao = editId && isCpfTecnico(form);

  return (
    <div>
      <div className="page-header">
        <h1>Clientes</h1>
        <button className="btn btn-primary" onClick={abrirCriar}>+ Novo Cliente</button>
      </div>

      <div className="alert" style={{ marginBottom: 12 }}>
        Cadastro rapido: apenas <strong>Nome</strong> e <strong>Telefone</strong> sao obrigatorios. CPF e opcional.
      </div>

      <form className="filters" onSubmit={buscar}>
        <input
          className="form-control search-input"
          placeholder="Buscar por nome, telefone, CPF ou email..."
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
            ) : clientes.map((c) => {
              const cpfTecnico = isCpfTecnico(c);
              return (
              <tr key={c.id} style={cpfTecnico ? { background: '#fff7e6' } : undefined}>
                <td>
                  <strong>{c.nome}</strong>
                  {rankingMap.get(Number(c.id))?.topIndicador && (
                    <span className="badge badge-warning" style={{ marginLeft: 8 }}>Top Indicador</span>
                  )}
                  {cpfTecnico && (
                    <span className="badge badge-danger" style={{ marginLeft: 8 }}>CPF tecnico</span>
                  )}
                </td>
                <td style={cpfTecnico ? { color: '#b45309', fontWeight: 700 } : undefined}>{c.cpf ? formatarCpf(c.cpf) : '—'}</td>
                <td>{c.telefone ? formatarTelefone(c.telefone) : '—'}</td>
                <td>{c.email || '—'}</td>
                <td>{new Date(c.dataCadastro).toLocaleDateString('pt-BR')}</td>
                <td>
                  <div className="actions">
                    <button className="btn btn-sm btn-success" onClick={() => abrirWhatsAppCliente(c)}>WhatsApp</button>
                    <button className="btn btn-sm btn-outline" onClick={() => abrirIndicacoesCliente(c)}>📊 Indicacoes</button>
                    <button className="btn btn-sm btn-outline" onClick={() => abrirEditar(c)}>✏️ Editar</button>
                    {isAdmin && <button className="btn btn-sm btn-danger" onClick={() => excluir(c.id)}>🗑️</button>}
                  </div>
                </td>
              </tr>
            );})}
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

            {cpfTecnicoEmEdicao && (
              <div className="alert" style={{ background: '#fff7e6', borderColor: '#fed7aa', color: '#9a3412' }}>
                Este cliente esta com <strong>CPF tecnico</strong>. Cadastre o CPF correto para regularizar o registro.
              </div>
            )}

            <div className="form-grid">
              <div className="form-group form-full">
                <label>Nome *</label>
                <input className="form-control" value={form.nome} onChange={f('nome')} placeholder="Nome completo" />
              </div>
              <div className="form-group">
                <label>CPF (opcional)</label>
                <input
                  className="form-control"
                  value={form.cpf}
                  onChange={(e) => setForm((prev) => ({ ...prev, cpf: formatarCpf(e.target.value) }))}
                  placeholder="000.000.000-00"
                />
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
                <label>Telefone *</label>
                <input
                  className="form-control"
                  value={form.telefone}
                  onChange={(e) => setForm((prev) => ({ ...prev, telefone: formatarTelefone(e.target.value) }))}
                  placeholder="(11) 99999-0000"
                />
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
              <button className="btn btn-primary" onClick={salvar} disabled={saving || !podeSalvar}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>

            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Campos obrigatorios: <strong>Nome</strong> e <strong>Telefone</strong>.
            </div>
          </div>
        </div>
      )}

      {whatsModal.aberto && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setWhatsModal({ aberto: false, clienteId: null, clienteNome: '', telefone: '', mensagem: '', enviando: false, erro: '' })}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h3>Enviar WhatsApp (ChatBot)</h3>
              <button className="btn-icon" onClick={() => setWhatsModal({ aberto: false, clienteId: null, clienteNome: '', telefone: '', mensagem: '', enviando: false, erro: '' })}>✕</button>
            </div>

            {whatsModal.erro && <div className="alert alert-error">{whatsModal.erro}</div>}

            <div className="form-grid">
              <div className="form-group form-full">
                <label>Cliente</label>
                <input className="form-control" disabled value={whatsModal.clienteNome} />
              </div>
              <div className="form-group form-full">
                <label>Telefone</label>
                <input
                  className="form-control"
                  value={whatsModal.telefone}
                  onChange={(e) => setWhatsModal((prev) => ({ ...prev, telefone: e.target.value }))}
                  placeholder="5511999999999"
                />
              </div>
              <div className="form-group form-full">
                <label>Mensagem *</label>
                <textarea
                  className="form-control"
                  rows={5}
                  value={whatsModal.mensagem}
                  onChange={(e) => setWhatsModal((prev) => ({ ...prev, mensagem: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setWhatsModal({ aberto: false, clienteId: null, clienteNome: '', telefone: '', mensagem: '', enviando: false, erro: '' })}>Cancelar</button>
              <button className="btn btn-success" disabled={whatsModal.enviando} onClick={enviarWhatsAppCliente}>
                {whatsModal.enviando ? 'Enviando...' : 'Enviar agora via ChatBot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {indicacoesModal.aberto && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIndicacoesModal({ aberto: false, cliente: null, loading: false, itens: [], ranking: [], erro: '' })}>
          <div className="modal" style={{ maxWidth: 920 }}>
            <div className="modal-header">
              <h3>📊 Indicacoes | {indicacoesModal.cliente?.nome}</h3>
              <button className="btn-icon" onClick={() => setIndicacoesModal({ aberto: false, cliente: null, loading: false, itens: [], ranking: [], erro: '' })}>✕</button>
            </div>

            {indicacoesModal.erro && <div className="alert alert-error">{indicacoesModal.erro}</div>}

            {indicacoesModal.loading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : (
              <>
                <div className="card" style={{ marginBottom: 12, padding: 14 }}>
                  <strong>Top Indicadores</strong>
                  <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
                    {indicacoesModal.ranking.slice(0, 5).map((r) => (
                      <div key={r.clienteId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span>{r.posicao}º {r.clienteNome} {r.topIndicador ? '⭐' : ''}</span>
                        <span>{r.totalIndicacoes} indicação(ões)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="alert" style={{ marginBottom: 12 }}>
                  {(() => {
                    const atual = indicacoesModal.ranking.find((r) => Number(r.clienteId) === Number(indicacoesModal.cliente?.id));
                    if (atual?.sugestaoBonus) {
                      return `Este cliente ja indicou ${atual.totalIndicacoes} pessoas, deseja oferecer bonus?`;
                    }
                    return 'Cliente ainda nao atingiu o gatilho automatico de sugestao de bonus.';
                  })()}
                </div>

                <div className="table-container" style={{ boxShadow: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Quem ele indicou</th>
                        <th>Data</th>
                        <th>Venda</th>
                        <th>Valor comissao</th>
                        <th>Bonificacao gerada</th>
                        <th>Status bonificacao</th>
                        <th>Acoes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indicacoesModal.itens.length === 0 ? (
                        <tr><td colSpan={7}><div className="empty-state">Nenhuma indicacao registrada para este cliente.</div></td></tr>
                      ) : indicacoesModal.itens.map((item) => (
                        <tr key={item.id}>
                          <td>{item.clienteIndicado?.nome || '-'}</td>
                          <td>{item.dataIndicacao ? new Date(item.dataIndicacao).toLocaleDateString('pt-BR') : '-'}</td>
                          <td>#{item.venda?.id || '-'}</td>
                          <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.valorComissaoVenda || 0))}</td>
                          <td>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.bonificacaoGerada || 0))}</td>
                          <td>
                            <span className={`badge ${item.statusBonificacao === 'PAGA' ? 'badge-success' : 'badge-warning'}`}>
                              {item.statusBonificacao || 'PENDENTE'}
                            </span>
                          </td>
                          <td>
                            {item.statusBonificacao !== 'PAGA' ? (
                              <button className="btn btn-sm btn-success" onClick={() => marcarBonificacaoPaga(item.id)}>
                                Marcar paga
                              </button>
                            ) : (
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                  {item.dataPagamentoBonificacao ? new Date(item.dataPagamentoBonificacao).toLocaleDateString('pt-BR') : 'Pago'}
                                </span>
                                <button className="btn btn-sm btn-outline" onClick={() => desfazerBonificacaoPaga(item.id)}>
                                  Desfazer
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
