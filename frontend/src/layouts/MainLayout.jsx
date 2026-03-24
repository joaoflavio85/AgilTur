import { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './MainLayout.css';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/agenda', label: 'Agenda', icon: '🗓️' },
  { to: '/clientes', label: 'Cliente', icon: '👥' },
  { to: '/propostas', label: 'Propostas', icon: '📝' },
  { to: '/creditos', label: 'Creditos', icon: '🎟️' },
  { to: '/vendas', label: 'Vendas', icon: '💼' },
  { to: '/pos-venda', label: 'Pos Vendas', icon: '⭐' },
];

const navGroups = [
  {
    label: 'Financeiro',
    items: [
      { to: '/contas-pagar', label: 'Contas a Pagar', icon: '📋' },
      { to: '/contas-receber', label: 'Contas a Receber', icon: '💰' },
      { to: '/brindes', label: 'Brindes', icon: '🎁' },
    ],
  },
  {
    label: 'Configuracao',
    items: [
      { to: '/empresa', label: 'Empresa', icon: '🏬' },
      { to: '/operadoras', label: 'Operadoras', icon: '🏢' },
      { to: '/usuarios', label: 'Usuarios', icon: '🔑' },
      { to: '/modelos-pos-venda', label: 'Modelo de Pos Venda', icon: '🧩' },
      { to: '/centros-custo', label: 'Centro de Custo', icon: '🏷️' },
      { to: '/auditoria', label: 'Auditoria', icon: '🧾' },
    ],
  },
];

export default function MainLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});
  const podeVerItem = (item) => {
    if (item.to === '/contas-pagar' && usuario?.perfil !== 'ADMIN') return false;
    if (item.to === '/contas-receber' && usuario?.perfil !== 'ADMIN') return false;
    if (item.to === '/brindes' && usuario?.perfil !== 'ADMIN') return false;
    if (item.to === '/empresa' && usuario?.perfil !== 'ADMIN') return false;
    if (item.to === '/operadoras' && usuario?.perfil !== 'ADMIN') return false;
    if (item.to === '/centros-custo' && usuario?.perfil !== 'ADMIN') return false;
    if (item.to === '/modelos-pos-venda' && usuario?.perfil !== 'ADMIN') return false;
    if (item.to === '/auditoria' && usuario?.perfil !== 'ADMIN') return false;
    if (item.to === '/usuarios' && usuario?.perfil !== 'ADMIN') return false;
    return true;
  };

  const navItemsFiltrados = navItems.filter(podeVerItem);
  const navGroupsFiltrados = useMemo(
    () => navGroups
      .map((group) => ({ ...group, items: group.items.filter(podeVerItem) }))
      .filter((group) => group.items.length > 0),
    [usuario?.perfil],
  );

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next = {};
      let changed = Object.keys(prev).length !== navGroupsFiltrados.length;

      navGroupsFiltrados.forEach((group) => {
        const currentValue = prev[group.label];
        const value = currentValue ?? false;
        next[group.label] = value;
        if (currentValue !== value) changed = true;
      });

      if (!changed) {
        return prev;
      }

      return next;
    });
  }, [navGroupsFiltrados]);

  const toggleGroup = (groupLabel) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupLabel]: !(prev[groupLabel] ?? false),
    }));
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          {!logoError ? (
            <img src="/api/empresa/logo" alt="Logo" className="logo-img" onError={() => setLogoError(true)} />
          ) : (
            <div className="logo-icon">✈️</div>
          )}
          <div>
            <div className="logo-title">AgilTur</div>
            <div className="logo-sub">Sistema</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItemsFiltrados.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          {navGroupsFiltrados.map((group) => (
            <div key={group.label} className="nav-group">
              <button
                type="button"
                className="nav-group-toggle"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={expandedGroups[group.label] ?? false}
              >
                <span className="nav-group-title">{group.label}</span>
                <span className={`nav-group-chevron ${(expandedGroups[group.label] ?? false) ? 'expanded' : ''}`}>▾</span>
              </button>

              {(expandedGroups[group.label] ?? false) && group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `nav-item nav-subitem ${isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{usuario?.nome?.charAt(0).toUpperCase()}</div>
            <div>
              <div className="user-name">{usuario?.nome}</div>
              <div className="user-role">{usuario?.perfil}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Sair">⏻</button>
        </div>
      </aside>

      {/* Main */}
      <div className="main-wrapper">
        <header className="navbar">
          <div className="navbar-brand">Sistema de Gestão</div>
          <div className="navbar-right">
            <span className="navbar-user">Olá, {usuario?.nome?.split(' ')[0]}!</span>
          </div>
        </header>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
