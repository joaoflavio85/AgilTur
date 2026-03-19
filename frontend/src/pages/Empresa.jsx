import { useEffect, useState } from 'react';
import api from '../services/api';

const empty = {
  razaoSocial: '',
  nomeFantasia: '',
  cnpj: '',
  subdominio: '',
  email: '',
  telefone: '',
  asaasApiKey: '',
  asaasBaseUrl: 'https://sandbox.asaas.com/api/v3',
  asaasSandbox: true,
};

const ASAAS_SANDBOX_URL = 'https://sandbox.asaas.com/api/v3';
const ASAAS_PRODUCTION_URL = 'https://api.asaas.com/v3';

export default function Empresa() {
  const [form, setForm] = useState(empty);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoVersion, setLogoVersion] = useState(0);
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasAsaasApiKey, setHasAsaasApiKey] = useState(false);

  const carregar = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/empresa');
      if (data) {
        setForm({
          razaoSocial: data.razaoSocial || '',
          nomeFantasia: data.nomeFantasia || '',
          cnpj: data.cnpj || '',
          subdominio: data.subdominio || '',
          email: data.email || '',
          telefone: data.telefone || '',
          asaasApiKey: '',
          asaasBaseUrl: data.asaasBaseUrl || 'https://sandbox.asaas.com/api/v3',
          asaasSandbox: data.asaasSandbox ?? true,
        });
        setHasAsaasApiKey(Boolean(data.hasAsaasApiKey));
        setLogoUrl(data.logoUrl || '');
        setLogoVersion(Date.now());
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao carregar dados da empresa.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const f = (k) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (k === 'asaasSandbox') {
      setForm((prev) => ({
        ...prev,
        asaasSandbox: value,
        asaasBaseUrl: value ? ASAAS_SANDBOX_URL : ASAAS_PRODUCTION_URL,
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [k]: value }));
  };

  const salvar = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...form,
        asaasApiKey: form.asaasApiKey || undefined,
      };
      await api.put('/empresa', payload);

      if (logoFile) {
        const fd = new FormData();
        fd.append('arquivo', logoFile);
        const logoResp = await api.post('/empresa/logo', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setLogoUrl(logoResp?.data?.logoUrl || '/api/empresa/logo');
        setLogoVersion(Date.now());
        setLogoFile(null);
      }

      setSuccess('Configurações da empresa salvas com sucesso.');
      setForm((prev) => ({ ...prev, asaasApiKey: '' }));
      setHasAsaasApiKey(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao salvar empresa.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="loading"><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Empresa</h1>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 12 }}>{error}</div>}
      {success && <div className="alert" style={{ marginBottom: 12 }}>{success}</div>}

      <div className="card" style={{ padding: 16 }}>
        <div className="form-grid">
          <div className="form-group form-full">
            <label>Razao Social *</label>
            <input className="form-control" value={form.razaoSocial} onChange={f('razaoSocial')} />
          </div>

          <div className="form-group form-full">
            <label>Logo da Empresa</label>
            {logoUrl && (
              <div style={{ marginBottom: 8 }}>
                <img src={`${logoUrl}?v=${logoVersion}`} alt="Logo da empresa" style={{ maxHeight: 64, objectFit: 'contain' }} />
              </div>
            )}
            <input
              type="file"
              className="form-control"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
            <small style={{ color: '#666' }}>Envie PNG, JPG ou SVG (max. 2MB).</small>
          </div>

          <div className="form-group">
            <label>Nome Fantasia</label>
            <input className="form-control" value={form.nomeFantasia} onChange={f('nomeFantasia')} />
          </div>

          <div className="form-group">
            <label>CNPJ</label>
            <input className="form-control" value={form.cnpj} onChange={f('cnpj')} />
          </div>

          <div className="form-group">
            <label>Subdominio SaaS</label>
            <input
              className="form-control"
              value={form.subdominio}
              onChange={f('subdominio')}
              placeholder="ex: cliente-acme"
            />
            <small style={{ color: '#666' }}>Acesso do cliente: https://{form.subdominio || 'seu-subdominio'}.seudominio.com</small>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input className="form-control" type="email" value={form.email} onChange={f('email')} />
          </div>

          <div className="form-group">
            <label>Telefone</label>
            <input className="form-control" value={form.telefone} onChange={f('telefone')} />
          </div>

          <div className="form-group form-full">
            <label>Asaas API Key {hasAsaasApiKey ? '(ja configurada)' : ''}</label>
            <input
              className="form-control"
              value={form.asaasApiKey}
              onChange={f('asaasApiKey')}
              placeholder={hasAsaasApiKey ? 'Informe apenas se quiser substituir a chave atual' : 'Sua chave do Asaas'}
            />
          </div>

          <div className="form-group form-full">
            <label>Asaas Base URL</label>
            <input className="form-control" value={form.asaasBaseUrl} onChange={f('asaasBaseUrl')} />
            <small style={{ color: '#666' }}>
              Sandbox: {ASAAS_SANDBOX_URL} | Producao: {ASAAS_PRODUCTION_URL}
            </small>
          </div>

          <div className="form-group form-full" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input id="asaasSandbox" type="checkbox" checked={form.asaasSandbox} onChange={f('asaasSandbox')} />
            <label htmlFor="asaasSandbox" style={{ margin: 0 }}>Modo Sandbox Asaas</label>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: 0, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={salvar} disabled={saving || !form.razaoSocial}>
            {saving ? 'Salvando...' : 'Salvar Configuracoes'}
          </button>
        </div>
      </div>
    </div>
  );
}
