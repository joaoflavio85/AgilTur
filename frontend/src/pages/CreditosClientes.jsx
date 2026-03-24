import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import {
  listarCreditos,
  criarCredito,
  detalharCredito,
  utilizarCredito,
  obterAlertasCreditos,
  obterDashboardCreditos,
} from "../services/creditosApi";

const statusOptions = ["ATIVO", "PARCIAL", "UTILIZADO", "EXPIRADO"];
const motivos = ["CANCELAMENTO", "REEMBOLSO", "BONUS", "OUTROS"];

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(v || 0));
const formatarMoedaInput = (value) => {
  const digitos = String(value || "").replace(/\D/g, "");
  if (!digitos) return "";
  const numero = Number(digitos) / 100;
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const parseMoedaInput = (value) => {
  const digitos = String(value || "").replace(/\D/g, "");
  if (!digitos) return 0;
  return Number(digitos) / 100;
};

const indicadorCor = (item) => {
  if (item.status === "EXPIRADO" || Number(item.diasParaVencer) < 0) return "#fee2e2";
  if (Number(item.diasParaVencer) <= 7) return "#fef3c7";
  return "#dcfce7";
};

export default function CreditosClientes() {
  const [clientes, setClientes] = useState([]);
  const [creditos, setCreditos] = useState([]);
  const [alertas, setAlertas] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fClienteId, setFClienteId] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fValidadeInicio, setFValidadeInicio] = useState("");
  const [fValidadeFim, setFValidadeFim] = useState("");
  const [buscaClienteCadastro, setBuscaClienteCadastro] = useState("");

  const [cadastroModal, setCadastroModal] = useState(false);
  const [detalheModal, setDetalheModal] = useState(false);
  const [utilizarModal, setUtilizarModal] = useState(false);

  const [detalhe, setDetalhe] = useState(null);
  const [creditoSelecionado, setCreditoSelecionado] = useState(null);

  const [novo, setNovo] = useState({
    clienteId: "",
    clienteNome: "",
    clienteTelefone: "",
    valorTotal: "",
    dataGeracao: new Date().toISOString().slice(0, 10),
    dataValidade: "",
    motivo: "CANCELAMENTO",
    observacoes: "",
  });

  const [uso, setUso] = useState({
    valorUtilizado: "",
    dataUtilizacao: new Date().toISOString().slice(0, 10),
    observacao: "",
    vendaId: "",
  });

  const carregarClientes = async () => {
    try {
      const { data } = await api.get("/clientes");
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      setClientes([]);
    }
  };

  const carregar = async () => {
    setLoading(true);
    setError("");
    try {
      const [lista, dadosAlertas, dadosDashboard] = await Promise.all([
        listarCreditos({
          clienteId: fClienteId || undefined,
          status: fStatus || undefined,
          validadeInicio: fValidadeInicio || undefined,
          validadeFim: fValidadeFim || undefined,
        }),
        obterAlertasCreditos(),
        obterDashboardCreditos(),
      ]);
      setCreditos(Array.isArray(lista) ? lista : []);
      setAlertas(dadosAlertas || null);
      setDashboard(dadosDashboard || null);
    } catch (e) {
      setError(e?.response?.data?.error || "Falha ao carregar modulo de creditos.");
      setCreditos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarClientes();
  }, []);

  useEffect(() => {
    carregar();
  }, []);

  const abrirCadastro = () => {
    setNovo({
      clienteId: "",
      clienteNome: "",
      clienteTelefone: "",
      valorTotal: "",
      dataGeracao: new Date().toISOString().slice(0, 10),
      dataValidade: "",
      motivo: "CANCELAMENTO",
      observacoes: "",
    });
    setCadastroModal(true);
    setBuscaClienteCadastro("");
  };

  const clientesFiltradosCadastro = useMemo(() => {
    const q = String(buscaClienteCadastro || "").trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter((c) => {
      const nome = String(c?.nome || "").toLowerCase();
      const telefone = String(c?.telefone || "").toLowerCase();
      const cpf = String(c?.cpf || "").toLowerCase();
      const email = String(c?.email || "").toLowerCase();
      return nome.includes(q) || telefone.includes(q) || cpf.includes(q) || email.includes(q);
    });
  }, [buscaClienteCadastro, clientes]);

  const onClienteChange = (id) => {
    const cliente = clientes.find((c) => String(c.id) === String(id));
    setNovo((prev) => ({
      ...prev,
      clienteId: id,
      clienteNome: cliente?.nome || "",
      clienteTelefone: cliente?.telefone || "",
    }));
  };

  const salvarCredito = async () => {
    try {
      await criarCredito({
        clienteId: Number(novo.clienteId),
        clienteNome: novo.clienteNome,
        clienteTelefone: novo.clienteTelefone || null,
        valorTotal: parseMoedaInput(novo.valorTotal),
        dataGeracao: novo.dataGeracao,
        dataValidade: novo.dataValidade,
        motivo: novo.motivo,
        observacoes: novo.observacoes || null,
      });
      setCadastroModal(false);
      await carregar();
    } catch (e) {
      const semConexao = e?.code === "ERR_NETWORK" || String(e?.message || "").toLowerCase().includes("network error");
      if (semConexao) {
        alert("API de Creditos offline. Inicie a API .NET em http://localhost:5198.");
        return;
      }
      alert(e?.response?.data?.error || "Erro ao criar credito.");
    }
  };

  const abrirDetalhe = async (item) => {
    try {
      const data = await detalharCredito(item.id);
      setDetalhe(data);
      setDetalheModal(true);
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao carregar detalhe do credito.");
    }
  };

  const abrirUso = (item) => {
    setCreditoSelecionado(item);
    setUso({
      valorUtilizado: "",
      dataUtilizacao: new Date().toISOString().slice(0, 10),
      observacao: "",
      vendaId: "",
    });
    setUtilizarModal(true);
  };

  const confirmarUso = async () => {
    if (!creditoSelecionado) return;
    try {
      await utilizarCredito(creditoSelecionado.id, {
        valorUtilizado: Number(uso.valorUtilizado || 0),
        dataUtilizacao: uso.dataUtilizacao,
        observacao: uso.observacao || null,
        vendaId: uso.vendaId || null,
      });
      setUtilizarModal(false);
      setCreditoSelecionado(null);
      await carregar();
    } catch (e) {
      alert(e?.response?.data?.error || "Erro ao utilizar credito.");
    }
  };

  const enviarAlertaWhatsApp = async (item) => {
    const telefone = String(item?.clienteTelefone || "").replace(/\D/g, "");
    if (!telefone || telefone.length < 10) {
      alert("Cliente sem telefone valido no cadastro do credito.");
      return;
    }

    const mensagem = `Ola ${item.clienteNome}, seu credito de ${fmt(item.saldoDisponivel)} vence em ${item.diasParaVencer} dia(s).`;
    try {
      await api.post("/whatsapp/chatbot/enviar-mensagem", {
        number: telefone,
        mensagem,
      });
      alert("Alerta enviado via WhatsApp.");
    } catch (e) {
      alert(e?.response?.data?.error || "Falha ao enviar alerta por WhatsApp.");
    }
  };

  const enviarWhatsAppCredito = async (item) => {
    const telefone = String(item?.clienteTelefone || "").replace(/\D/g, "");
    if (!telefone || telefone.length < 10) {
      alert("Cliente sem telefone valido no cadastro do credito.");
      return;
    }

    const validade = item?.dataValidade
      ? new Date(item.dataValidade).toLocaleDateString("pt-BR")
      : "nao informada";

    const mensagem = [
      `Ola ${item?.clienteNome || "cliente"}, tudo bem?`,
      "Identificamos que voce possui um credito ativo conosco:",
      `- Valor total: ${fmt(item?.valorTotal || 0)}`,
      `- Valor utilizado: ${fmt(item?.valorUtilizado || 0)}`,
      `- Saldo disponivel: ${fmt(item?.saldoDisponivel || 0)}`,
      `- Validade: ${validade}`,
      "Se quiser, podemos te ajudar a utilizar esse credito em uma nova viagem.",
    ].join("\n");

    try {
      await api.post("/whatsapp/chatbot/enviar-mensagem", {
        number: telefone,
        mensagem,
        clienteId: item?.clienteId,
      });
      alert("Mensagem sobre credito enviada via WhatsApp.");
    } catch (e) {
      alert(e?.response?.data?.error || "Falha ao enviar mensagem de credito por WhatsApp.");
    }
  };

  const indicadoresResumo = useMemo(() => ({
    ativos: dashboard?.totalAtivos || 0,
    vencendo: dashboard?.totalAVencer7Dias || 0,
    expirados: dashboard?.totalExpirados || 0,
    valorAtivo: dashboard?.valorAtivo || 0,
  }), [dashboard]);

  return (
    <div>
      <div className="page-header">
        <h1>Creditos de Clientes</h1>
        <button className="btn btn-primary" onClick={abrirCadastro}>+ Novo Credito</button>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 10, marginBottom: 12 }}>
        <div className="card" style={{ padding: 14 }}><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Total em creditos ativos</div><div style={{ fontSize: 24, fontWeight: 700 }}>{fmt(indicadoresResumo.valorAtivo)}</div></div>
        <div className="card" style={{ padding: 14 }}><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Creditos a vencer (7 dias)</div><div style={{ fontSize: 24, fontWeight: 700, color: "var(--warning)" }}>{indicadoresResumo.vencendo}</div></div>
        <div className="card" style={{ padding: 14 }}><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Creditos expirados</div><div style={{ fontSize: 24, fontWeight: 700, color: "var(--danger)" }}>{indicadoresResumo.expirados}</div></div>
        <div className="card" style={{ padding: 14 }}><div style={{ fontSize: 12, color: "var(--text-muted)" }}>Creditos ativos</div><div style={{ fontSize: 24, fontWeight: 700 }}>{indicadoresResumo.ativos}</div></div>
      </div>

      <div className="filters" style={{ marginBottom: 12 }}>
        <select className="form-control" style={{ width: 230 }} value={fClienteId} onChange={(e) => setFClienteId(e.target.value)}>
          <option value="">Todos os clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        <select className="form-control" style={{ width: 180 }} value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">Todos os status</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <input type="date" className="form-control" style={{ width: 170 }} value={fValidadeInicio} onChange={(e) => setFValidadeInicio(e.target.value)} />
        <input type="date" className="form-control" style={{ width: 170 }} value={fValidadeFim} onChange={(e) => setFValidadeFim(e.target.value)} />

        <button className="btn btn-outline" onClick={carregar}>Aplicar filtros</button>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <h3 style={{ marginBottom: 8 }}>Alertas inteligentes</h3>
        {!alertas ? (
          <div className="text-muted">Sem dados de alerta.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {[...(alertas.vencendoEm1Dia || []), ...(alertas.vencendoEm3Dias || []), ...(alertas.vencendoEm7Dias || [])]
              .slice(0, 10)
              .map((a) => (
                <div key={`al-${a.id}`} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 10, background: "var(--surface2)", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.clienteNome}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Saldo {fmt(a.saldoDisponivel)} | vence em {a.diasParaVencer} dia(s)</div>
                  </div>
                  <button className="btn btn-sm btn-success" onClick={() => enviarAlertaWhatsApp(a)}>WhatsApp</button>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Valor total</th>
              <th>Valor utilizado</th>
              <th>Saldo</th>
              <th>Validade</th>
              <th>Status</th>
              <th>Indicador</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><div className="loading"><div className="spinner" /></div></td></tr>
            ) : creditos.length === 0 ? (
              <tr><td colSpan={8}><div className="empty-state">Nenhum credito encontrado.</div></td></tr>
            ) : creditos.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.clienteNome}</strong></td>
                <td>{fmt(c.valorTotal)}</td>
                <td>{fmt(c.valorUtilizado)}</td>
                <td>{fmt(c.saldoDisponivel)}</td>
                <td>{new Date(c.dataValidade).toLocaleDateString("pt-BR")}</td>
                <td><span className="badge badge-default">{c.status}</span></td>
                <td>
                  <span style={{ background: indicadorCor(c), padding: "4px 10px", borderRadius: 12, fontSize: 12, fontWeight: 700 }}>
                    {c.indicador === "VERMELHO" ? "🔴 Vencido" : c.indicador === "AMARELO" ? "🟡 Proximo" : "🟢 Dentro do prazo"}
                  </span>
                </td>
                <td>
                  <div className="actions">
                    <button className="btn btn-sm btn-success" onClick={() => enviarWhatsAppCredito(c)}>WhatsApp</button>
                    <button className="btn btn-sm btn-outline" onClick={() => abrirDetalhe(c)}>Detalhar</button>
                    <button className="btn btn-sm btn-primary" disabled={c.status === "EXPIRADO" || c.status === "UTILIZADO"} onClick={() => abrirUso(c)}>Utilizar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cadastroModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setCadastroModal(false)}>
          <div className="modal" style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <h3>Novo Credito</h3>
              <button className="btn-icon" onClick={() => setCadastroModal(false)}>x</button>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Cliente *</label>
                <input
                  className="form-control"
                  placeholder="Buscar cliente cadastrado por nome, telefone, CPF ou email"
                  value={buscaClienteCadastro}
                  onChange={(e) => setBuscaClienteCadastro(e.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <select className="form-control" value={novo.clienteId} onChange={(e) => onClienteChange(e.target.value)}>
                  <option value="">Selecione...</option>
                  {clientesFiltradosCadastro.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Valor do credito *</label>
                <input className="form-control" value={novo.valorTotal} onChange={(e) => setNovo((p) => ({ ...p, valorTotal: formatarMoedaInput(e.target.value) }))} placeholder="R$ 0,00" />
              </div>
              <div className="form-group">
                <label>Data de geracao *</label>
                <input className="form-control" type="date" value={novo.dataGeracao} onChange={(e) => setNovo((p) => ({ ...p, dataGeracao: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Data de validade *</label>
                <input className="form-control" type="date" value={novo.dataValidade} onChange={(e) => setNovo((p) => ({ ...p, dataValidade: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Motivo *</label>
                <select className="form-control" value={novo.motivo} onChange={(e) => setNovo((p) => ({ ...p, motivo: e.target.value }))}>
                  {motivos.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Telefone (snapshot)</label>
                <input className="form-control" value={novo.clienteTelefone} onChange={(e) => setNovo((p) => ({ ...p, clienteTelefone: e.target.value }))} />
              </div>
              <div className="form-group form-full">
                <label>Observacoes</label>
                <textarea className="form-control" rows={3} value={novo.observacoes} onChange={(e) => setNovo((p) => ({ ...p, observacoes: e.target.value }))} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setCadastroModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarCredito}>Salvar credito</button>
            </div>
          </div>
        </div>
      )}

      {utilizarModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setUtilizarModal(false)}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <h3>Utilizar Credito</h3>
              <button className="btn-icon" onClick={() => setUtilizarModal(false)}>x</button>
            </div>

            <div className="alert" style={{ marginBottom: 12 }}>
              Saldo disponivel: <strong>{fmt(creditoSelecionado?.saldoDisponivel || 0)}</strong>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Valor utilizado *</label>
                <input className="form-control" type="number" step="0.01" value={uso.valorUtilizado} onChange={(e) => setUso((p) => ({ ...p, valorUtilizado: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Data de utilizacao *</label>
                <input className="form-control" type="date" value={uso.dataUtilizacao} onChange={(e) => setUso((p) => ({ ...p, dataUtilizacao: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Venda/Reserva ID (opcional)</label>
                <input className="form-control" value={uso.vendaId} onChange={(e) => setUso((p) => ({ ...p, vendaId: e.target.value }))} />
              </div>
              <div className="form-group form-full">
                <label>Observacao</label>
                <textarea className="form-control" rows={3} value={uso.observacao} onChange={(e) => setUso((p) => ({ ...p, observacao: e.target.value }))} />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setUtilizarModal(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarUso}>Confirmar utilizacao</button>
            </div>
          </div>
        </div>
      )}

      {detalheModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDetalheModal(false)}>
          <div className="modal" style={{ maxWidth: 760 }}>
            <div className="modal-header">
              <h3>Historico do Credito</h3>
              <button className="btn-icon" onClick={() => setDetalheModal(false)}>x</button>
            </div>

            <div className="form-grid" style={{ marginBottom: 12 }}>
              <div className="form-group"><label>Cliente</label><input className="form-control" disabled value={detalhe?.clienteNome || ""} /></div>
              <div className="form-group"><label>Status</label><input className="form-control" disabled value={detalhe?.status || ""} /></div>
              <div className="form-group"><label>Valor total</label><input className="form-control" disabled value={fmt(detalhe?.valorTotal || 0)} /></div>
              <div className="form-group"><label>Saldo</label><input className="form-control" disabled value={fmt(detalhe?.saldoDisponivel || 0)} /></div>
            </div>

            <div className="table-container" style={{ boxShadow: "none" }}>
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Tipo</th>
                    <th>Valor</th>
                    <th>Observacao</th>
                    <th>Venda/Reserva</th>
                  </tr>
                </thead>
                <tbody>
                  {(detalhe?.historico || []).length === 0 ? (
                    <tr><td colSpan={5}><div className="empty-state">Sem movimentacoes.</div></td></tr>
                  ) : (detalhe?.historico || []).map((m) => (
                    <tr key={m.id}>
                      <td>{new Date(m.dataMovimentacao).toLocaleString("pt-BR")}</td>
                      <td>{m.tipo}</td>
                      <td>{fmt(m.valor)}</td>
                      <td>{m.observacao || "-"}</td>
                      <td>{m.vendaId || "-"}</td>
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
