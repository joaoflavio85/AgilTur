import axios from "axios";

const baseUrls = [
  String(import.meta.env.VITE_ORCAMENTOS_API_URL || "").trim(),
  "http://localhost:5198/api",
].filter(Boolean);

const createClient = (baseURL) => {
  const client = axios.create({ baseURL, timeout: 15000 });
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  return client;
};

const clients = baseUrls.map((url) => ({ url, client: createClient(url) }));

const shouldTryNext = (error) => {
  if (!error) return false;
  if (error.code === "ERR_NETWORK" || error.code === "ECONNABORTED") return true;
  const status = error.response?.status;
  return status === 404 || status === 502 || status === 503;
};

async function requestWithFallback(method, path, payload) {
  let lastError = null;

  for (let i = 0; i < clients.length; i += 1) {
    const { client } = clients[i];
    try {
      if (method === "get" || method === "delete") {
        const { data } = await client[method](path);
        return { data, baseURL: clients[i].url };
      }

      const { data } = await client[method](path, payload);
      return { data, baseURL: clients[i].url };
    } catch (error) {
      lastError = error;
      if (!shouldTryNext(error) || i === clients.length - 1) {
        throw error;
      }
    }
  }

  throw lastError;
}

export async function listarOrcamentosPorProposta(propostaId) {
  const { data } = await requestWithFallback("get", `/propostas/${propostaId}/orcamentos`);
  return data;
}

export async function salvarOrcamento(propostaId, payload) {
  const { data } = await requestWithFallback("post", `/propostas/${propostaId}/orcamentos`, payload);
  return data;
}

export async function atualizarOrcamento(id, payload) {
  const { data } = await requestWithFallback("put", `/orcamentos/${id}`, payload);
  return data;
}

export async function excluirOrcamento(id) {
  await requestWithFallback("delete", `/orcamentos/${id}`);
}

export async function duplicarOrcamento(id) {
  const { data } = await requestWithFallback("post", `/orcamentos/${id}/duplicar`);
  return data;
}

export async function publicarOrcamento(id) {
  const { data } = await requestWithFallback("post", `/orcamentos/${id}/publicar`);
  return data;
}

export async function publicarTodosOrcamentosDaProposta(propostaId) {
  const { data } = await requestWithFallback("post", `/propostas/${propostaId}/orcamentos/publicar-todos`);
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
  const base = baseUrls[0] || "http://localhost:5198/api";
  return `${base}/orcamentos/${id}/pdf${query ? `?${query}` : ""}`;
}
