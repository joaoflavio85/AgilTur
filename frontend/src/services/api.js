import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

const resolveTenantSubdomain = () => {
  const fromEnv = String(import.meta.env.VITE_TENANT_SUBDOMAIN || '').trim().toLowerCase();
  if (fromEnv) return fromEnv;

  const hostname = String(window.location.hostname || '').trim().toLowerCase();
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return '';

  const parts = hostname.split('.').filter(Boolean);
  if (parts.length < 3) return '';
  return parts[0];
};

api.interceptors.request.use((config) => {
  const subdomain = resolveTenantSubdomain();
  if (subdomain) {
    config.headers = config.headers || {};
    config.headers['x-tenant-subdomain'] = subdomain;
  }
  return config;
});

// Interceptor de resposta — trata 401 globalmente
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
