import axios from "axios";

const baseURL = String(import.meta.env.VITE_CREDITOS_API_URL || "http://localhost:5198/api").trim();

const creditosApi = axios.create({
  baseURL,
  timeout: 15000,
});

creditosApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function listarCreditos(params = {}) {
  const { data } = await creditosApi.get("/creditos", { params });
  return data;
}

export async function criarCredito(payload) {
  const { data } = await creditosApi.post("/creditos", payload);
  return data;
}

export async function atualizarCredito(id, payload) {
  const { data } = await creditosApi.put(`/creditos/${id}`, payload);
  return data;
}

export async function detalharCredito(id) {
  const { data } = await creditosApi.get(`/creditos/${id}`);
  return data;
}

export async function utilizarCredito(id, payload) {
  const { data } = await creditosApi.post(`/creditos/${id}/utilizar`, payload);
  return data;
}

export async function obterAlertasCreditos() {
  const { data } = await creditosApi.get("/creditos/alertas");
  return data;
}

export async function obterDashboardCreditos() {
  const { data } = await creditosApi.get("/creditos/dashboard");
  return data;
}
