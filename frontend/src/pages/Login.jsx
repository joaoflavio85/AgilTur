import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', senha: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.senha);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-decoration">
          <div className="deco-circle c1" />
          <div className="deco-circle c2" />
          <div className="deco-circle c3" />
          <div className="login-brand">
            {!logoError ? (
              <img src="/api/empresa/logo" alt="Logo" className="login-brand-logo" onError={() => setLogoError(true)} />
            ) : (
              <div className="login-brand-icon">✈️</div>
            )}
            <h1>ÁgilTur</h1>
            <p>Sistema de Gestão da Agência</p>
          </div>
          <div className="login-features">
            <div className="feature"><span>🌎</span> Gestão de Viagens</div>
            <div className="feature"><span>💼</span> Controle de Vendas</div>
            <div className="feature"><span>💰</span> Financeiro Integrado</div>
            <div className="feature"><span>⭐</span> Pós-Venda Completo</div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-box">
          <div className="login-header">
            <h2>Bem-vindo de volta</h2>
            <p>Faça login para acessar o sistema</p>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                className="form-control"
                placeholder="seu@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Senha</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={form.senha}
                onChange={(e) => setForm({ ...form, senha: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
              {loading ? (
                <><div className="spinner" style={{width:18,height:18,borderWidth:2}} /> Entrando...</>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <p className="login-hint">
            Credencial padrão: <strong>admin@agiltur.com</strong> / <strong>123456</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
