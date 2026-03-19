export function montarMensagemWhatsApp({ nomeCliente, destino, linkPublico }) {
  return [
    `Ola, ${nomeCliente || "cliente"}!`,
    `Seu orcamento para ${destino || "a viagem"} esta pronto.`,
    "",
    `Confira no link: ${linkPublico}`,
    "",
    "Se quiser, ajusto hotel, datas e forma de pagamento agora.",
    "- ARAME TURISMO"
  ].join("\n");
}
