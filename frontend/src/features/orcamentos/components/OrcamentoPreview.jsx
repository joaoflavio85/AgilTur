export default function OrcamentoPreview({ orcamento }) {
  if (!orcamento) {
    return <div className="orcamento-preview-empty">Selecione ou crie um orcamento para visualizar.</div>;
  }

  return (
    <article className="orcamento-preview">
      <div className="orc-preview-cover">
        <h2>{orcamento.titulo || "Novo orcamento"}</h2>
        <p>{orcamento.destino || "Destino a definir"}</p>
      </div>

      <div className="orc-preview-section">
        <h3>Destino</h3>
        <p>{orcamento.descricaoDestino || "Sem descricao do destino."}</p>
      </div>

      <div className="orc-preview-section">
        <h3>Hotel</h3>
        <p><strong>{orcamento.hotel || "Nao informado"}</strong></p>
      </div>

      <div className="orc-preview-grid">
        <div>
          <small>Pessoas</small>
          <strong>{orcamento.numeroPessoas || 0}</strong>
        </div>
        <div>
          <small>Valor total</small>
          <strong>R$ {Number(orcamento.valorTotal || 0).toFixed(2)}</strong>
        </div>
        <div>
          <small>Parcelas</small>
          <strong>
            {orcamento.qtdParcelasCartao ? `${orcamento.qtdParcelasCartao}x de R$ ${Number(orcamento.valorParcelaCartao || 0).toFixed(2)}` : "Nao informado"}
          </strong>
        </div>
      </div>

      <div className="orc-preview-section">
        <h3>Pagamento</h3>
        <p><strong>Valor PIX:</strong> {orcamento.valorPix ? `R$ ${Number(orcamento.valorPix).toFixed(2)}` : "Nao informado"}</p>
      </div>

      <div className="orc-preview-section">
        <h3>Aereo</h3>
        {!orcamento.temAereo ? (
          <p>Nao</p>
        ) : (
          <>
            <p><strong>Companhia:</strong> {orcamento.companhiaAerea || "Nao informado"}</p>
            <p><strong>Ida:</strong> {orcamento.aeroportoIda || "-"} - {orcamento.horarioVooIda || "-"}</p>
            <p><strong>Volta:</strong> {orcamento.aeroportoVolta || "-"} - {orcamento.horarioVooVolta || "-"}</p>
          </>
        )}
      </div>

      {orcamento.linkPropostaFornecedor && (
        <div className="orc-preview-section">
          <h3>Proposta do fornecedor</h3>
          <a href={orcamento.linkPropostaFornecedor} target="_blank" rel="noreferrer">Abrir link da proposta</a>
        </div>
      )}
    </article>
  );
}
