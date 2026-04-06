import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const VALIDADE_PROPOSTA_HORAS = 24;
const JANELA_VENCIDAS_HORAS = 240;

const normalizarTelefone = (value) => String(value || '').replace(/\D/g, '');

const horasRestantesValidade = (proposta) => {
  const inicio = new Date(proposta?.dataCriacao || 0).getTime();
  if (!inicio) return -999;
  const limite = inicio + VALIDADE_PROPOSTA_HORAS * 60 * 60 * 1000;
  return (limite - Date.now()) / (60 * 60 * 1000);
};

export default function PropostasFollowup() {
  const navigate = useNavigate();

  const [propostas, setPropostas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [whatsModal, setWhatsModal] = useState({
    aberto: false,
    propostaId: null,
    clienteNome: '',
    telefone: '',
    ticketId: '',
    mensagem: '',
    enviando: false,
    erro: '',
  });

  const carregar = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/propostas', {
        params: {
          status: 'ABERTA',
          page: 1,
          pageSize: 200,
        },
      });
      const items = Array.isArray(data) ? data : (data?.items || []);
      setPropostas(items);
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao carregar follow-up das propostas.');
      setPropostas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const followupsAVencer = propostas
    .map((p) => ({ ...p, horasRestantes: horasRestantesValidade(p) }))
    .filter((p) => p.horasRestantes > 0 && p.horasRestantes <= VALIDADE_PROPOSTA_HORAS)
    .sort((a, b) => a.horasRestantes - b.horasRestantes);

  const followupsVencidas240h = propostas
    .map((p) => ({ ...p, horasRestantes: horasRestantesValidade(p) }))
    .filter((p) => p.horasRestantes <= 0 && p.horasRestantes >= -JANELA_VENCIDAS_HORAS)
    .sort((a, b) => b.horasRestantes - a.horasRestantes);

  const abrirWhatsAppFollowup = (proposta) => {
    const telefone = normalizarTelefone(proposta?.cliente?.telefone);
    if (!telefone || telefone.length < 10) {
      alert('Cliente sem telefone valido para WhatsApp.');
      return;
    }

    setWhatsModal({
      aberto: true,
      propostaId: proposta.id,
      clienteNome: proposta?.cliente?.nome || 'Cliente',
      telefone,
      ticketId: String(proposta?.ticketId || ''),
      mensagem: `Ola ${proposta?.cliente?.nome || ''}, tudo bem? Estou retornando sobre a proposta #${proposta.id}. Posso te ajudar a concluir hoje?`,
      enviando: false,
      erro: '',
    });
  };

  const enviarMensagemFollowup = async () => {
    const mensagem = String(whatsModal.mensagem || '').trim();
    if (!mensagem) {
      setWhatsModal((prev) => ({ ...prev, erro: 'Digite a mensagem antes de enviar.' }));
      return;
    }

    const telefone = normalizarTelefone(whatsModal.telefone);
    const ticketId = String(whatsModal.ticketId || '').trim();
    if (!telefone && !ticketId) {
      setWhatsModal((prev) => ({ ...prev, erro: 'Informe telefone ou ticketId para envio.' }));
      return;
    }

    setWhatsModal((prev) => ({ ...prev, enviando: true, erro: '' }));
    try {
      await api.post('/whatsapp/chatbot/enviar-mensagem', {
        number: telefone || undefined,
        ticketId: ticketId || undefined,
        mensagem,
        propostaId: whatsModal.propostaId,
      });

      setWhatsModal({
        aberto: false,
        propostaId: null,
        clienteNome: '',
        telefone: '',
        ticketId: '',
        mensagem: '',
        enviando: false,
        erro: '',
      });
      alert('Mensagem enviada com sucesso via ChatBot.');
    } catch (e) {
      setWhatsModal((prev) => ({
        ...prev,
        enviando: false,
        erro: e.response?.data?.error || 'Nao foi possivel enviar mensagem via ChatBot.',
      }));
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Follow-up de Propostas</h1>
        <button className="btn btn-outline" onClick={() => navigate('/propostas')}>Abrir CRM de Propostas</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="card" style={{ padding: 16, marginBottom: 12 }}>
        <h3 style={{ marginBottom: 10 }}>Validade de propostas (24h)</h3>
        <div style={{ display: 'grid', gap: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            A vencer (ate 24h): <strong>{followupsAVencer.length}</strong> | Vencidas nas ultimas {JANELA_VENCIDAS_HORAS}h: <strong>{followupsVencidas240h.length}</strong>
          </div>

          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : !followupsAVencer.length && !followupsVencidas240h.length ? (
            <div className="empty-state" style={{ minHeight: 80 }}>Nenhuma proposta aberta em janela critica de validade.</div>
          ) : (
            <div style={{ display: 'grid', gap: 8 }}>
              {followupsVencidas240h.length > 0 && (
                <>
                  <div style={{ fontWeight: 600, color: 'var(--danger)' }}>Vencidas (ultimas {JANELA_VENCIDAS_HORAS}h)</div>
                  {followupsVencidas240h.slice(0, 20).map((p) => (
                    <div key={`followup-vencida-${p.id}`} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, background: '#fff5f5', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.cliente?.nome || 'Sem cliente'} | Proposta #{p.id}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Vencida ha {Math.abs(p.horasRestantes).toFixed(1)}h</div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-sm btn-success" onClick={() => abrirWhatsAppFollowup(p)}>WhatsApp</button>
                        <button className="btn btn-sm btn-outline" onClick={() => navigate(`/propostas/${p.id}/orcamentos`)}>Orcamentos</button>
                      </div>
                    </div>
                  ))}
                </>
              )}

              {followupsAVencer.length > 0 && (
                <>
                  <div style={{ fontWeight: 600, color: 'var(--warning)' }}>A vencer (proximas 24h)</div>
                  {followupsAVencer.slice(0, 20).map((p) => {
                    const critico = p.horasRestantes <= 6;
                    return (
                      <div key={`followup-a-vencer-${p.id}`} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 10, background: critico ? '#fff7e6' : 'var(--surface2)', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.cliente?.nome || 'Sem cliente'} | Proposta #{p.id}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {critico ? 'Critico: ' : ''}Vence em {p.horasRestantes.toFixed(1)}h
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button className="btn btn-sm btn-success" onClick={() => abrirWhatsAppFollowup(p)}>WhatsApp</button>
                          <button className="btn btn-sm btn-outline" onClick={() => navigate(`/propostas/${p.id}/orcamentos`)}>Orcamentos</button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {whatsModal.aberto && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setWhatsModal({ aberto: false, propostaId: null, clienteNome: '', telefone: '', ticketId: '', mensagem: '', enviando: false, erro: '' })}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>Enviar WhatsApp (ChatBot)</h3>
              <button className="btn-icon" onClick={() => setWhatsModal({ aberto: false, propostaId: null, clienteNome: '', telefone: '', ticketId: '', mensagem: '', enviando: false, erro: '' })}>x</button>
            </div>

            {whatsModal.erro && <div className="alert alert-error">{whatsModal.erro}</div>}

            <div className="form-grid">
              <div className="form-group form-full">
                <label>Cliente</label>
                <input className="form-control" disabled value={whatsModal.clienteNome} />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input
                  className="form-control"
                  value={whatsModal.telefone}
                  onChange={(e) => setWhatsModal((prev) => ({ ...prev, telefone: e.target.value }))}
                  placeholder="5511999999999"
                />
              </div>
              <div className="form-group">
                <label>Ticket ID (opcional)</label>
                <input
                  className="form-control"
                  value={whatsModal.ticketId}
                  onChange={(e) => setWhatsModal((prev) => ({ ...prev, ticketId: e.target.value }))}
                  placeholder="Ex.: 12345"
                />
              </div>
              <div className="form-group form-full">
                <label>Mensagem *</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={whatsModal.mensagem}
                  onChange={(e) => setWhatsModal((prev) => ({ ...prev, mensagem: e.target.value }))}
                  placeholder="Digite a mensagem de follow-up"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setWhatsModal({ aberto: false, propostaId: null, clienteNome: '', telefone: '', ticketId: '', mensagem: '', enviando: false, erro: '' })}>Cancelar</button>
              <button className="btn btn-success" disabled={whatsModal.enviando} onClick={enviarMensagemFollowup}>
                {whatsModal.enviando ? 'Enviando...' : 'Enviar agora via ChatBot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
