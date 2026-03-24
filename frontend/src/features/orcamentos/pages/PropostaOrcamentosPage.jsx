import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../services/api";
import OrcamentoEditor from "../components/OrcamentoEditor";
import OrcamentoPreview from "../components/OrcamentoPreview";
import {
  atualizarOrcamento,
  excluirOrcamento,
  listarOrcamentosPorProposta,
  publicarOrcamento,
  publicarTodosOrcamentosDaProposta,
  salvarOrcamento,
  getPdfUrl,
} from "../services/orcamentosApi";
import "../orcamentos.css";

export default function PropostaOrcamentosPage({ propostaId }) {
  const params = useParams();
  const propostaIdFromRoute = propostaId || params.propostaId;
  const [orcamentos, setOrcamentos] = useState([]);
  const [selecionado, setSelecionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [emEdicao, setEmEdicao] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [empresaInfo, setEmpresaInfo] = useState(null);
  const [propostaInfo, setPropostaInfo] = useState(null);
  const [whatsModal, setWhatsModal] = useState({
    aberto: false,
    orcamentoId: null,
    clienteNome: "",
    telefone: "",
    mensagem: "",
    enviando: false,
    erro: "",
  });

  const somenteDigitos = (v) => String(v || "").replace(/\D/g, "");

  const normalizarOrcamento = (item) => ({
    id: item?.id ?? item?.Id,
    versao: item?.versao ?? item?.Versao ?? 1,
    titulo: item?.titulo ?? item?.Titulo ?? "",
    destino: item?.destino ?? item?.Destino ?? "",
    dataInicio: item?.dataInicio ?? item?.DataInicio ?? "",
    dataFim: item?.dataFim ?? item?.DataFim ?? "",
    temAereo: Boolean(item?.temAereo ?? item?.TemAereo),
    companhiaAerea: item?.companhiaAerea ?? item?.CompanhiaAerea ?? "",
    horarioVooIda: item?.horarioVooIda ?? item?.HorarioVooIda ?? "",
    horarioVooVolta: item?.horarioVooVolta ?? item?.HorarioVooVolta ?? "",
    aeroportoIda: item?.aeroportoIda ?? item?.AeroportoIda ?? "",
    aeroportoVolta: item?.aeroportoVolta ?? item?.AeroportoVolta ?? "",
    hotel: item?.hotel ?? item?.Hotel ?? "",
    descricaoDestino: item?.descricaoDestino ?? item?.DescricaoDestino ?? "",
    numeroPessoas: Number(item?.numeroPessoas ?? item?.NumeroPessoas ?? 0),
    valorTotal: Number(item?.valorTotal ?? item?.ValorTotal ?? 0),
    qtdParcelasCartao: item?.qtdParcelasCartao ?? item?.QtdParcelasCartao ?? "",
    valorParcelaCartao: item?.valorParcelaCartao ?? item?.ValorParcelaCartao ?? "",
    valorPix: item?.valorPix ?? item?.ValorPix ?? "",
    linkPropostaFornecedor: item?.linkPropostaFornecedor ?? item?.LinkPropostaFornecedor ?? "",
    dataCriacao: item?.dataCriacao ?? item?.DataCriacao ?? "",
  });

  const formatarDataHora = (value) => {
    if (!value) return "-";
    const data = new Date(value);
    if (Number.isNaN(data.getTime())) return "-";
    return data.toLocaleString("pt-BR");
  };

  const getErroMensagem = (err, fallback) => {
    const data = err?.response?.data;
    const fromData = data?.error || data?.detail || data?.title || data?.message;
    if (!fromData && (err?.code === "ERR_NETWORK" || String(err?.message || "").toLowerCase().includes("network error"))) {
      return "API de orcamentos offline. Inicie a API .NET em http://localhost:5198.";
    }
    const fromErr = err?.message;
    return fromData || fromErr || fallback;
  };

  useEffect(() => {
    if (!propostaIdFromRoute) return;

    listarOrcamentosPorProposta(propostaIdFromRoute)
      .then((data) => {
        const lista = Array.isArray(data) ? data.map(normalizarOrcamento) : [];
        setOrcamentos(lista);
        setSelecionado(lista[0] || null);
      })
      .catch((err) => {
        const detalhe = getErroMensagem(err, "API indisponivel");
        setErro(`Falha ao carregar orcamentos: ${detalhe}`);
      });
  }, [propostaIdFromRoute]);

  useEffect(() => {
    if (!propostaIdFromRoute) return;

    api.get("/empresa").then(({ data }) => setEmpresaInfo(data)).catch(() => {});
    api.get(`/propostas/${propostaIdFromRoute}`).then(({ data }) => setPropostaInfo(data)).catch(() => {});
  }, [propostaIdFromRoute]);

  const handleSalvar = async (payload) => {
    setLoading(true);
    setSucesso("");
    try {
      setErro("");
      const body = {
        ...payload,
        dataInicio: payload.dataInicio || null,
        dataFim: payload.dataFim || null,
        temAereo: Boolean(payload.temAereo),
        companhiaAerea: payload.temAereo ? (payload.companhiaAerea || null) : null,
        horarioVooIda: payload.temAereo ? (payload.horarioVooIda || null) : null,
        horarioVooVolta: payload.temAereo ? (payload.horarioVooVolta || null) : null,
        aeroportoIda: payload.temAereo ? (payload.aeroportoIda || null) : null,
        aeroportoVolta: payload.temAereo ? (payload.aeroportoVolta || null) : null,
        numeroPessoas: Number(payload.numeroPessoas || 0),
        valorTotal: Number(payload.valorTotal || 0),
        qtdParcelasCartao: payload.qtdParcelasCartao ? Number(payload.qtdParcelasCartao) : null,
        valorParcelaCartao: payload.valorParcelaCartao ? Number(payload.valorParcelaCartao) : null,
        valorPix: payload.valorPix ? Number(payload.valorPix) : null,
        linkPropostaFornecedor: payload.linkPropostaFornecedor || null,
      };

      if (emEdicao?.id) {
        const atualizado = await atualizarOrcamento(emEdicao.id, body);
        const normalizado = normalizarOrcamento(atualizado);
        setOrcamentos((prev) => prev.map((item) => (item.id === normalizado.id ? normalizado : item)));
        setSelecionado(normalizado);
        setEmEdicao(null);
        setSucesso("Orcamento atualizado com sucesso.");
      } else {
        const novo = await salvarOrcamento(propostaIdFromRoute, body);
        const normalizado = normalizarOrcamento(novo);
        setOrcamentos((prev) => [normalizado, ...prev]);
        setSelecionado(normalizado);
        setSucesso("Orcamento salvo com sucesso.");
      }
    } catch (err) {
      const detalhe = getErroMensagem(err, "API indisponivel");
      setErro(`Falha ao salvar orcamento: ${detalhe}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExcluir = async (id) => {
    try {
      await excluirOrcamento(id);
      setOrcamentos((prev) => prev.filter((item) => item.id !== id));
      if (selecionado?.id === id) {
        const restante = orcamentos.filter((item) => item.id !== id);
        setSelecionado(restante[0] || null);
      }
      if (emEdicao?.id === id) {
        setEmEdicao(null);
      }
      setConfirmDelete(null);
      setSucesso("Orcamento excluido com sucesso.");
    } catch (err) {
      const detalhe = getErroMensagem(err, "API indisponivel");
      setErro(`Falha ao excluir orcamento: ${detalhe}`);
    }
  };

  const handleEditar = (item) => {
    setEmEdicao(item);
    setSelecionado(item);
  };

  const handleCancelarEdicao = () => setEmEdicao(null);

  const pdfContext = {
    empresaNome: empresaInfo?.nomeFantasia || empresaInfo?.razaoSocial,
    empresaLogoUrl: empresaInfo?.logoUrl ? `${window.location.origin}${empresaInfo.logoUrl}` : "",
    clienteNome: propostaInfo?.cliente?.nome,
    clienteEmail: propostaInfo?.cliente?.email,
    clienteTelefone: propostaInfo?.cliente?.telefone,
  };

  const handlePublicar = async () => {
    if (!selecionado?.id) return;
    try {
      const data = await publicarOrcamento(selecionado.id);
      window.alert(`Link publico: ${data.linkPublico}`);
    } catch (err) {
      const detalhe = err?.response?.data?.title || err?.response?.data?.error || err?.message;
      window.alert(`Falha ao publicar: ${detalhe || "API indisponivel"}`);
    }
  };

  const handlePublicarTodos = async () => {
    try {
      setErro("");
      const data = await publicarTodosOrcamentosDaProposta(propostaIdFromRoute);
      window.alert(`Link com todos os orcamentos: ${data.linkPublico}`);
    } catch (err) {
      const detalhe = getErroMensagem(err, "API indisponivel");
      setErro(`Falha ao gerar link da proposta: ${detalhe}`);
    }
  };

  const abrirWhatsAppOrcamento = (item) => {
    const telefone = somenteDigitos(propostaInfo?.cliente?.telefone);
    if (!telefone || telefone.length < 10) {
      window.alert("Cliente sem telefone valido no cadastro.");
      return;
    }

    const clienteNome = propostaInfo?.cliente?.nome || "cliente";
    const periodo = item?.dataInicio && item?.dataFim
      ? `${item.dataInicio} a ${item.dataFim}`
      : "datas a confirmar";
    const resumo = [
      `Ola ${clienteNome}, tudo bem?`,
      `Segue resumo da proposta V${item?.versao || 1}:`,
      `- Titulo: ${item?.titulo || "Proposta sem titulo"}`,
      `- Destino: ${item?.destino || "Nao informado"}`,
      `- Periodo: ${periodo}`,
      `- Pessoas: ${Number(item?.numeroPessoas || 0)}`,
      `- Valor total: R$ ${Number(item?.valorTotal || 0).toFixed(2)}`,
    ].join("\n");

    setWhatsModal({
      aberto: true,
      orcamentoId: item?.id || null,
      clienteNome,
      telefone,
      mensagem: resumo,
      enviando: false,
      erro: "",
    });
  };

  const enviarWhatsAppOrcamento = async () => {
    const telefone = somenteDigitos(whatsModal.telefone);
    const mensagem = String(whatsModal.mensagem || "").trim();

    if (!telefone || telefone.length < 10) {
      setWhatsModal((prev) => ({ ...prev, erro: "Telefone invalido para envio." }));
      return;
    }

    if (!mensagem) {
      setWhatsModal((prev) => ({ ...prev, erro: "Digite a mensagem antes de enviar." }));
      return;
    }

    setWhatsModal((prev) => ({ ...prev, enviando: true, erro: "" }));
    try {
      await api.post("/whatsapp/chatbot/enviar-mensagem", {
        number: telefone,
        mensagem,
        propostaId: propostaIdFromRoute,
        orcamentoId: whatsModal.orcamentoId,
      });

      setWhatsModal({
        aberto: false,
        orcamentoId: null,
        clienteNome: "",
        telefone: "",
        mensagem: "",
        enviando: false,
        erro: "",
      });
      window.alert("Mensagem enviada com sucesso via ChatBot.");
    } catch (err) {
      setWhatsModal((prev) => ({
        ...prev,
        enviando: false,
        erro: err?.response?.data?.error || "Falha ao enviar mensagem via ChatBot.",
      }));
    }
  };

  return (
    <div className="orcamentos-shell">
      <header className="orcamentos-head">
        <div>
          <h1>Orcamentos Inteligentes</h1>
          <p>Monte propostas visuais para enviar em minutos.</p>
        </div>
        <button className="btn btn-primary" type="button" onClick={handlePublicarTodos}>Gerar link de todos os orcamentos</button>
      </header>

      {erro && <div className="alert alert-error">{erro}</div>}
  {sucesso && <div className="alert alert-success">{sucesso}</div>}

      <div className="orcamentos-page">
        <section className="orcamentos-col orcamentos-col-left">
          <div className="orcamentos-list card">
            <h2>Versoes da proposta</h2>
            {!orcamentos.length && <p className="text-muted">Nenhum orcamento salvo ainda.</p>}
            <ul>
              {orcamentos.map((item) => {
                const ativo = selecionado?.id === item.id;
                const resumoParcelas = item.qtdParcelasCartao && Number(item.qtdParcelasCartao) > 0
                  ? `${item.qtdParcelasCartao}x R$ ${Number(item.valorParcelaCartao || 0).toFixed(2)}`
                  : "Sem parcelamento";
                const resumoPix = item.valorPix ? `PIX R$ ${Number(item.valorPix).toFixed(2)}` : "PIX nao informado";
                return (
                  <li key={item.id}>
                    <div className={`orc-item ${ativo ? "active" : ""}`}>
                      <button type="button" className="orc-item-main" onClick={() => setSelecionado(item)}>
                      <div>
                        <strong>V{item.versao || 1}</strong>
                        <span>{item.titulo || "Sem titulo"}</span>
                        <div className="orc-item-badges">
                          {item.temAereo ? <span className="badge badge-info">Com aereo</span> : <span className="badge badge-default">Sem aereo</span>}
                          {item.linkPropostaFornecedor ? <span className="badge badge-success">Link fornecedor</span> : null}
                        </div>
                        <small className="orc-item-resumo">{resumoParcelas} | {resumoPix}</small>
                        <small className="orc-item-resumo">Criado em: {formatarDataHora(item.dataCriacao)}</small>
                      </div>
                      <small>R$ {Number(item.valorTotal || 0).toFixed(2)}</small>
                      </button>
                      <div className="orc-item-actions">
                        <button className="btn btn-success btn-sm" type="button" onClick={() => abrirWhatsAppOrcamento(item)}><span className="action-icon">💬</span>WhatsApp</button>
                        <button className="btn btn-outline btn-sm" type="button" onClick={() => handleEditar(item)}><span className="action-icon">✎</span>Editar</button>
                        <button className="btn btn-danger btn-sm" type="button" onClick={() => setConfirmDelete(item)}><span className="action-icon">×</span>Excluir</button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <OrcamentoEditor
            onSalvar={handleSalvar}
            loading={loading}
            initialData={emEdicao}
            isEditing={Boolean(emEdicao)}
            onCancelEdit={handleCancelarEdicao}
          />
        </section>

        <section className="orcamentos-col orcamentos-col-right">
          <div className="card">
            <div className="orc-preview-head">
              <h2>Preview do orcamento</h2>
              {selecionado?.id && (
                <div className="orc-preview-actions">
                  <button className="btn btn-primary" type="button" onClick={handlePublicar}>Gerar link publico</button>
                  <a className="btn btn-outline" href={getPdfUrl(selecionado.id, pdfContext)} target="_blank" rel="noreferrer">Gerar PDF</a>
                </div>
              )}
            </div>
          </div>

          <div className="card">
        <OrcamentoPreview orcamento={selecionado} />
          </div>
        </section>
      </div>

      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3>Excluir orcamento</h3>
            </div>
            <p>Deseja realmente excluir a versao <strong>V{confirmDelete.versao || 1}</strong>?</p>
            <p className="text-muted" style={{ marginTop: 8 }}>{confirmDelete.titulo || "Sem titulo"}</p>
            <div className="modal-footer">
              <button className="btn btn-outline" type="button" onClick={() => setConfirmDelete(null)} disabled={loading}>Cancelar</button>
              <button className="btn btn-danger" type="button" onClick={() => handleExcluir(confirmDelete.id)} disabled={loading}>Excluir</button>
            </div>
          </div>
        </div>
      )}

      {whatsModal.aberto && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setWhatsModal({ aberto: false, orcamentoId: null, clienteNome: "", telefone: "", mensagem: "", enviando: false, erro: "" })}>
          <div className="modal" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h3>Enviar WhatsApp (ChatBot)</h3>
              <button className="btn-icon" onClick={() => setWhatsModal({ aberto: false, orcamentoId: null, clienteNome: "", telefone: "", mensagem: "", enviando: false, erro: "" })}>x</button>
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
                  rows={6}
                  value={whatsModal.mensagem}
                  onChange={(e) => setWhatsModal((prev) => ({ ...prev, mensagem: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setWhatsModal({ aberto: false, orcamentoId: null, clienteNome: "", telefone: "", mensagem: "", enviando: false, erro: "" })}>Cancelar</button>
              <button className="btn btn-success" disabled={whatsModal.enviando} onClick={enviarWhatsAppOrcamento}>
                {whatsModal.enviando ? "Enviando..." : "Enviar agora via ChatBot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
