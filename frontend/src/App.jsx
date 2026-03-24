import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clientes from './pages/Clientes';
import Operadoras from './pages/Operadoras';
import Propostas from './pages/Propostas';
import Vendas from './pages/Vendas';
import ContasReceber from './pages/ContasReceber';
import ContasPagar from './pages/ContasPagar';
import CentrosCusto from './pages/CentrosCusto';
import PosVenda from './pages/PosVenda';
import ModelosPosVenda from './pages/ModelosPosVenda';
import Usuarios from './pages/Usuarios';
import Agenda from './pages/Agenda';
import Auditoria from './pages/Auditoria';
import Empresa from './pages/Empresa';
import CreditosClientes from './pages/CreditosClientes';
import Brindes from './pages/Brindes';
import PropostaOrcamentosPage from './features/orcamentos/pages/PropostaOrcamentosPage';

function ProtectedRoute({ children }) {
  const { usuario, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner" /></div>;
  if (!usuario) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { usuario } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={usuario ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="operadoras" element={usuario?.perfil === 'ADMIN' ? <Operadoras /> : <Navigate to="/" replace />} />
        <Route path="propostas" element={<Propostas />} />
        <Route path="creditos" element={<CreditosClientes />} />
        <Route path="propostas/:propostaId/orcamentos" element={<PropostaOrcamentosPage />} />
        <Route path="vendas" element={<Vendas />} />
        <Route path="contas-receber" element={usuario?.perfil === 'ADMIN' ? <ContasReceber /> : <Navigate to="/" replace />} />
        <Route path="contas-pagar" element={usuario?.perfil === 'ADMIN' ? <ContasPagar /> : <Navigate to="/" replace />} />
        <Route path="brindes" element={usuario?.perfil === 'ADMIN' ? <Brindes /> : <Navigate to="/" replace />} />
        <Route path="centros-custo" element={usuario?.perfil === 'ADMIN' ? <CentrosCusto /> : <Navigate to="/" replace />} />
        <Route path="pos-venda" element={<PosVenda />} />
        <Route path="modelos-pos-venda" element={usuario?.perfil === 'ADMIN' ? <ModelosPosVenda /> : <Navigate to="/" replace />} />
        <Route path="usuarios" element={usuario?.perfil === 'ADMIN' ? <Usuarios /> : <Navigate to="/" replace />} />
        <Route path="auditoria" element={usuario?.perfil === 'ADMIN' ? <Auditoria /> : <Navigate to="/" replace />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="empresa" element={usuario?.perfil === 'ADMIN' ? <Empresa /> : <Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
