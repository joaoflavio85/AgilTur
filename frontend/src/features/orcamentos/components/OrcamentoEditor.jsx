import { useEffect, useState } from "react";

const modeloInicial = {
  titulo: "",
  destino: "",
  dataInicio: "",
  dataFim: "",
  temAereo: false,
  companhiaAerea: "",
  horarioVooIda: "",
  horarioVooVolta: "",
  aeroportoIda: "",
  aeroportoVolta: "",
  hotel: "",
  descricaoDestino: "",
  numeroPessoas: 2,
  valorTotal: "",
  qtdParcelasCartao: "",
  valorParcelaCartao: "",
  valorPix: "",
  linkPropostaFornecedor: "",
};

const parseCurrencyBRL = (value) => {
  const raw = String(value ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const number = Number(raw);
  return Number.isFinite(number) ? number : 0;
};

const formatCurrencyBRL = (value) => {
  const number = typeof value === "number" ? value : parseCurrencyBRL(value);
  if (!Number.isFinite(number) || number <= 0) return "";
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const CIAS_AEREAS = [
  { value: "LATAM", label: "LATAM", sigla: "LA", brand: "latam" },
  { value: "GOL", label: "GOL", sigla: "GO", brand: "gol" },
  { value: "AZUL", label: "AZUL", sigla: "AZ", brand: "azul" },
  { value: "AMERICAN AIRLINES", label: "AMERICAN AIRLINES", sigla: "AA", brand: "american" },
  { value: "AIR FRANCE", label: "AIR FRANCE", sigla: "AF", brand: "airfrance" },
  { value: "TAP", label: "TAP", sigla: "TP", brand: "tap" },
  { value: "COPA AIRLINES", label: "COPA AIRLINES", sigla: "CP", brand: "copa" },
  { value: "OUTRAS", label: "OUTRAS", sigla: "OO", brand: "outras" },
];

export default function OrcamentoEditor({ onSalvar, loading, initialData, isEditing, onCancelEdit }) {
  const [form, setForm] = useState(modeloInicial);
  const usaLinkFornecedor = String(form.linkPropostaFornecedor || "").trim().length > 0;

  useEffect(() => {
    if (!initialData) {
      setForm(modeloInicial);
      return;
    }

    setForm({
      ...modeloInicial,
      ...initialData,
      valorTotal: formatCurrencyBRL(initialData.valorTotal),
      valorPix: formatCurrencyBRL(initialData.valorPix),
      valorParcelaCartao: initialData.valorParcelaCartao ? Number(initialData.valorParcelaCartao).toFixed(2) : "",
    });
  }, [initialData]);

  const handleChange = (campo, valor) => {
    setForm((prev) => {
      const next = { ...prev, [campo]: valor };

      if (campo === "temAereo" && !valor) {
        next.companhiaAerea = "";
        next.horarioVooIda = "";
        next.horarioVooVolta = "";
        next.aeroportoIda = "";
        next.aeroportoVolta = "";
      }

      if (campo === "valorTotal" || campo === "qtdParcelasCartao") {
        const total = parseCurrencyBRL(campo === "valorTotal" ? valor : next.valorTotal || 0);
        const qtd = Number(campo === "qtdParcelasCartao" ? valor : next.qtdParcelasCartao || 0);
        next.valorParcelaCartao = qtd > 0 ? (total / qtd).toFixed(2) : "";
      }

      return next;
    });
  };

  const salvarOrcamento = async () => {
    await onSalvar({
      ...form,
      valorTotal: parseCurrencyBRL(form.valorTotal),
      valorPix: parseCurrencyBRL(form.valorPix),
    });

    if (!isEditing) {
      setForm(modeloInicial);
    }
  };

  return (
    <div className="orcamento-editor card">
      <div className="editor-block">
        <h3>Dados do orcamento</h3>
        <p className="text-muted">
          Voce pode preencher os campos manualmente ou apenas informar o link da proposta do fornecedor.
        </p>
        <div className="form-grid">
          <div className="form-group form-full">
            <label>Link da proposta do fornecedor</label>
            <input
              className="form-control"
              value={form.linkPropostaFornecedor}
              onChange={(e) => handleChange("linkPropostaFornecedor", e.target.value)}
              placeholder="https://fornecedor.com/proposta/..."
            />
          </div>

          {usaLinkFornecedor && (
            <div className="form-group form-full">
              <div className="alert" style={{ marginBottom: 0 }}>
                Link informado: os campos manuais abaixo ficam opcionais e foram desabilitados.
              </div>
            </div>
          )}

          <div className="form-group form-full">
            <label>Titulo</label>
            <input className="form-control" disabled={usaLinkFornecedor} value={form.titulo} onChange={(e) => handleChange("titulo", e.target.value)} placeholder="Ex: Porto Seguro - BA" />
          </div>

          <div className="form-group">
            <label>Destino</label>
            <input className="form-control" disabled={usaLinkFornecedor} value={form.destino} onChange={(e) => handleChange("destino", e.target.value)} placeholder="Destino" />
          </div>

          <div className="form-group">
            <label>Data inicial</label>
            <input className="form-control" disabled={usaLinkFornecedor} type="date" value={form.dataInicio} onChange={(e) => handleChange("dataInicio", e.target.value)} />
          </div>

          <div className="form-group">
            <label>Data final</label>
            <input className="form-control" disabled={usaLinkFornecedor} type="date" value={form.dataFim} onChange={(e) => handleChange("dataFim", e.target.value)} />
          </div>

          <div className="form-group" style={{ alignSelf: "end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input disabled={usaLinkFornecedor} type="checkbox" checked={Boolean(form.temAereo)} onChange={(e) => handleChange("temAereo", e.target.checked)} />
              Tem aereo?
            </label>
          </div>

          {form.temAereo && (
            <>
              <div className="form-group form-full">
                <label>Cia aerea</label>
                <div className={`cia-picker ${usaLinkFornecedor ? "is-disabled" : ""}`}>
                  {CIAS_AEREAS.map((cia) => {
                    const ativo = form.companhiaAerea === cia.value;
                    return (
                      <button
                        key={cia.value}
                        type="button"
                        className={`cia-option ${ativo ? "active" : ""}`}
                        disabled={usaLinkFornecedor}
                        onClick={() => handleChange("companhiaAerea", cia.value)}
                      >
                        <span className={`cia-fallback cia-${cia.brand}`}>{cia.sigla}</span>
                        <span>{cia.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label>Aeroporto ida</label>
                <input className="form-control" disabled={usaLinkFornecedor} value={form.aeroportoIda} onChange={(e) => handleChange("aeroportoIda", e.target.value)} />
              </div>

              <div className="form-group">
                <label>Horario voo ida</label>
                <input className="form-control" disabled={usaLinkFornecedor} value={form.horarioVooIda} onChange={(e) => handleChange("horarioVooIda", e.target.value)} placeholder="Ex: 08:40" />
              </div>

              <div className="form-group">
                <label>Aeroporto volta</label>
                <input className="form-control" disabled={usaLinkFornecedor} value={form.aeroportoVolta} onChange={(e) => handleChange("aeroportoVolta", e.target.value)} />
              </div>

              <div className="form-group">
                <label>Horario voo volta</label>
                <input className="form-control" disabled={usaLinkFornecedor} value={form.horarioVooVolta} onChange={(e) => handleChange("horarioVooVolta", e.target.value)} placeholder="Ex: 21:15" />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Hotel</label>
            <input className="form-control" disabled={usaLinkFornecedor} value={form.hotel} onChange={(e) => handleChange("hotel", e.target.value)} placeholder="Hotel" />
          </div>

          <div className="form-group form-full">
            <label>Descricao do destino</label>
            <textarea className="form-control" disabled={usaLinkFornecedor} rows={4} value={form.descricaoDestino} onChange={(e) => handleChange("descricaoDestino", e.target.value)} placeholder="Descricao do destino" />
          </div>

          <div className="form-group">
            <label>Numero de pessoas</label>
            <input className="form-control" disabled={usaLinkFornecedor} type="number" value={form.numeroPessoas} onChange={(e) => handleChange("numeroPessoas", Number(e.target.value))} placeholder="Numero de pessoas" />
          </div>

          <div className="form-group">
            <label>Valor total</label>
            <input
              className="form-control"
              disabled={usaLinkFornecedor}
              type="text"
              value={form.valorTotal}
              onChange={(e) => handleChange("valorTotal", e.target.value)}
              onBlur={() => handleChange("valorTotal", formatCurrencyBRL(form.valorTotal))}
              placeholder="R$ 0,00"
            />
          </div>

          <div className="form-group">
            <label>Qtd parcelas no cartao</label>
            <input className="form-control" disabled={usaLinkFornecedor} type="number" min="1" value={form.qtdParcelasCartao} onChange={(e) => handleChange("qtdParcelasCartao", e.target.value)} placeholder="Ex: 10" />
          </div>

          <div className="form-group">
            <label>Valor da parcela (auto)</label>
            <input className="form-control" type="number" value={form.valorParcelaCartao} readOnly placeholder="Calculado automaticamente" />
          </div>

          <div className="form-group">
            <label>Valor no PIX</label>
            <input
              className="form-control"
              disabled={usaLinkFornecedor}
              type="text"
              value={form.valorPix}
              onChange={(e) => handleChange("valorPix", e.target.value)}
              onBlur={() => handleChange("valorPix", formatCurrencyBRL(form.valorPix))}
              placeholder="R$ 0,00"
            />
          </div>
        </div>

        <div className="editor-actions">
          {isEditing && (
            <button className="btn btn-outline" type="button" onClick={onCancelEdit} disabled={loading}>
              Cancelar edicao
            </button>
          )}
          <button className="btn btn-primary" type="button" onClick={salvarOrcamento} disabled={loading}>
            {loading ? "Salvando..." : isEditing ? "Atualizar orcamento" : "Salvar orcamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
