import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_ORCAMENTOS_API_URL || "http://localhost:5198/api",
  timeout: 15000,
});

export async function listarOrcamentosPorProposta(propostaId) {
  const { data } = await api.get(`/propostas/${propostaId}/orcamentos`);
  return data;
}

export async function salvarOrcamento(propostaId, payload) {
  const { data } = await api.post(`/propostas/${propostaId}/orcamentos`, payload);
  return data;
}

export async function atualizarOrcamento(id, payload) {
  const { data } = await api.put(`/orcamentos/${id}`, payload);
  return data;
}

export async function excluirOrcamento(id) {
  await api.delete(`/orcamentos/${id}`);
}

export async function duplicarOrcamento(id) {
  const { data } = await api.post(`/orcamentos/${id}/duplicar`);
  return data;
}

export async function publicarOrcamento(id) {
  const { data } = await api.post(`/orcamentos/${id}/publicar`);
  return data;
}

export async function publicarTodosOrcamentosDaProposta(propostaId) {
  const { data } = await api.post(`/propostas/${propostaId}/orcamentos/publicar-todos`);
  return data;
}

export function getPdfUrl(id, context = {}) {
  const params = new URLSearchParams();
  Object.entries(context).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.append(key, String(value));
    }
  });

  const query = params.toString();
  return `${api.defaults.baseURL}/orcamentos/${id}/pdf${query ? `?${query}` : ""}`;
}
