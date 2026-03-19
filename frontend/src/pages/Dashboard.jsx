import { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className={`stat-card stat-${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

function formatCurrency(val) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
}

function formatPercent(val) {
  return `${Number(val || 0).toFixed(1).replace('.', ',')}%`;
}

function HorizontalBars({ title, items = [], valueFormatter = (v) => v }) {
  const max = Math.max(...items.map((i) => Number(i.valor || i.quantidade || 0)), 1);

  return (
    <div className="admin-chart-card">
      <h4>{title}</h4>
      <div className="h-bars">
        {items.map((item) => {
          const raw = Number(item.valor ?? item.quantidade ?? 0);
          const width = Math.max(6, (raw / max) * 100);
          const label = item.label || item.operadora || item.etapa;
          return (
            <div key={label} className="h-bar-row">
              <div className="h-bar-top">
                <span>{label}</span>
                <strong>{valueFormatter(raw)}</strong>
              </div>
              <div className="h-bar-track">
                <div className="h-bar-fill" style={{ width: `${width}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function dateOnly(value) {
  if (!value) return null;
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(value) {
  const target = dateOnly(value);
  if (!target) return null;
  const today = dateOnly(new Date());
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const [dados, setDados] = useState(null);
  const [dadosAgente, setDadosAgente] = useState({ propostas: [], funil: null, viagensHojeTotal: 0, posVendas: [] });
  const [loading, setLoading] = useState(true);
  const [mesReferencia, setMesReferencia] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const adminInsights = dados?.insightsAdmin;
  const lucroEstimado = Number(adminInsights?.kpis?.lucroEstimado || 0);
  const lucroClasse = lucroEstimado > 0 ? 'is-positive' : lucroEstimado < 0 ? 'is-negative' : 'is-neutral';

  useEffect(() => {
    const carregar = async () => {
      setLoading(true);
      try {
        if (usuario?.perfil === 'ADMIN') {
          const rel = await api.get('/relatorios/dashboard', { params: { mesReferencia } });
          setDados(rel.data);
          setDadosAgente({ propostas: [], funil: null, viagensHojeTotal: 0, posVendas: [] });
          return;
        }

        const [rel, propostasResp, funilResp, agendaResp, posVendaResp] = await Promise.all([
          api.get('/relatorios/dashboard'),
          api.get('/propostas', { params: { status: 'ABERTA', page: 1, pageSize: 200 } }),
          api.get('/propostas/funil'),
          api.get('/agenda'),
          api.get('/pos-venda', { params: { status: 'ABERTO' } }),
        ]);

        const propostasData = propostasResp?.data;
        const propostas = Array.isArray(propostasData) ? propostasData : (propostasData?.items || []);

        setDados(rel.data);
        setDadosAgente({
          propostas,
          funil: funilResp?.data || null,
          viagensHojeTotal: Number(agendaResp?.data?.viajandoHoje?.total || 0),
          posVendas: Array.isArray(posVendaResp?.data) ? posVendaResp.data : [],
        });
      } catch {
        setDados(null);
        setDadosAgente({ propostas: [], funil: null, viagensHojeTotal: 0, posVendas: [] });
      } finally {
        setLoading(false);
      }
    };

    carregar();
  }, [usuario?.perfil, mesReferencia]);

  if (loading) return <div className="loading"><div className="spinner" /> Carregando...</div>;

  const hoje = dateOnly(new Date());
  const propostasAbertas = dadosAgente.propostas || [];
  const acoesPosVenda = (dadosAgente.posVendas || []).filter((a) => String(a.status || 'ABERTO') !== 'CONCLUIDO');
  const tarefasAtrasadas = acoesPosVenda.filter((a) => {
    const d = dateOnly(a.dataAcao);
    return d && d < hoje;
  });
  const tarefasHoje = acoesPosVenda.filter((a) => {
    const d = dateOnly(a.dataAcao);
    return d && d.getTime() === hoje.getTime();
  });
  const tarefasSemana = acoesPosVenda.filter((a) => {
    const faltam = daysUntil(a.dataAcao);
    return faltam !== null && faltam >= 0 && faltam <= 7;
  });

  const proximasAcoes = [...acoesPosVenda]
    .filter((a) => !!a.dataAcao)
    .sort((a, b) => new Date(a.dataAcao).getTime() - new Date(b.dataAcao).getTime())
    .slice(0, 6);

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span className="text-muted" style={{fontSize:13}}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          {usuario?.perfil === 'ADMIN' && (
            <input
              type="month"
              className="form-control"
              style={{ width: 170 }}
              value={mesReferencia}
              onChange={(e) => setMesReferencia(e.target.value)}
            />
          )}
        </div>
      </div>

      {usuario?.perfil === 'ADMIN' ? (
        <div className="stats-grid">
          <StatCard
            icon="💼"
            label="Total de Vendas"
            value={dados?.totalVendas ?? 0}
            sub={formatCurrency(dados?.valorTotalVendas)}
            color="blue"
          />
          <StatCard
            icon="💰"
            label="Contas a Receber"
            value={dados?.contasReceberPendentes?.quantidade ?? 0}
            sub={formatCurrency(dados?.contasReceberPendentes?.valor)}
            color="green"
          />
          <StatCard
            icon="📋"
            label="Contas a Pagar"
            value={dados?.contasPagarPendentes?.quantidade ?? 0}
            sub={formatCurrency(dados?.contasPagarPendentes?.valor)}
            color="orange"
          />
          <StatCard
            icon="✈️"
            label="Clientes em Viagem"
            value={dados?.clientesEmViagem ?? 0}
            sub="viajando hoje"
            color="purple"
          />
        </div>
      ) : (
        <>
          <div className="stats-grid agent-grid">
            <StatCard
              icon="🧩"
              label="Propostas Abertas"
              value={propostasAbertas.length}
              sub="pipeline atual"
              color="blue"
            />
            <StatCard
              icon="⏰"
              label="Ações Atrasadas"
              value={tarefasAtrasadas.length}
              sub="baseado no pós-venda"
              color="orange"
            />
            <StatCard
              icon="📅"
              label="Ações para Hoje"
              value={tarefasHoje.length}
              sub="acompanhamentos do dia"
              color="green"
            />
            <StatCard
              icon="✈️"
              label="Clientes em Viagem"
              value={dadosAgente.viagensHojeTotal}
              sub="viajando hoje"
              color="purple"
            />
          </div>

          <div className="agent-panels-grid">
            <div className="admin-chart-card">
              <h4>Minha Rotina da Semana</h4>
              <div className="agent-list">
                <div className="agent-list-item"><span>Tarefas nos próximos 7 dias</span><strong>{tarefasSemana.length}</strong></div>
                <div className="agent-list-item"><span>Propostas fechadas no período</span><strong>{dadosAgente.funil?.resumo?.fechadas || 0}</strong></div>
                <div className="agent-list-item"><span>Propostas perdidas no período</span><strong>{dadosAgente.funil?.resumo?.perdidas || 0}</strong></div>
                <div className="agent-list-item"><span>Taxa de conversão pessoal</span><strong>{formatPercent(dadosAgente.funil?.resumo?.taxaConversaoGeral || 0)}</strong></div>
              </div>
            </div>

            <HorizontalBars
              title="Meu Pipeline por Etapa"
              items={[
                { label: 'Lead', quantidade: (dadosAgente.funil?.porEtapa || []).find((x) => x.etapa === 'LEAD')?.total || 0 },
                { label: 'Cotacao', quantidade: (dadosAgente.funil?.porEtapa || []).find((x) => x.etapa === 'COTACAO')?.total || 0 },
                { label: 'Reserva', quantidade: (dadosAgente.funil?.porEtapa || []).find((x) => x.etapa === 'RESERVA')?.total || 0 },
                { label: 'Venda', quantidade: (dadosAgente.funil?.porEtapa || []).find((x) => x.etapa === 'VENDA')?.total || 0 },
              ]}
              valueFormatter={(v) => String(v)}
            />

            <div className="admin-chart-card">
              <h4>Próximas Ações</h4>
              <div className="agent-list">
                {proximasAcoes.length === 0 && <div className="agent-list-empty">Sem ações agendadas.</div>}
                {proximasAcoes.map((acao) => {
                  const faltam = daysUntil(acao.dataAcao);
                  const etiqueta = faltam < 0 ? 'atrasada' : faltam === 0 ? 'hoje' : `${faltam} dia(s)`;
                  return (
                    <div key={acao.id} className="agent-list-item">
                      <span>#{acao.id} - {acao.venda?.cliente?.nome || 'Cliente'} - {acao.tipoAcao}</span>
                      <strong>{etiqueta}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {usuario?.perfil === 'ADMIN' && adminInsights && (
        <>
          <div className="admin-kpis-grid">
            <div className="admin-kpi-card">
              <span>Faturamento do Mês</span>
              <strong>{formatCurrency(adminInsights.kpis.faturamentoMesAtual)}</strong>
              <small>{formatPercent(adminInsights.kpis.variacaoMensalPercent)} vs mês anterior</small>
            </div>
            <div className="admin-kpi-card">
              <span>Ticket Médio</span>
              <strong>{formatCurrency(adminInsights.kpis.ticketMedio)}</strong>
              <small>venda média no mês atual</small>
            </div>
            <div className="admin-kpi-card">
              <span>Conversão de Propostas</span>
              <strong>{formatPercent(adminInsights.kpis.taxaConversaoMes)}</strong>
              <small>propostas fechadas no mês</small>
            </div>
            <div className="admin-kpi-card">
              <span>Inadimplência</span>
              <strong>{formatPercent(adminInsights.kpis.inadimplenciaPercent)}</strong>
              <small>sobre carteira aberta</small>
            </div>
            <div className="admin-kpi-card">
              <span>Despesas Pagas no Mês</span>
              <strong>{formatCurrency(adminInsights.kpis.despesasPagasMes)}</strong>
              <small>desembolso já realizado</small>
            </div>
            <div className={`admin-kpi-card ${lucroClasse}`}>
              <span>Lucro Estimado (Comissão - Despesas)</span>
              <strong>{formatCurrency(adminInsights.kpis.lucroEstimado)}</strong>
              <small>{formatPercent(adminInsights.kpis.margemLucratividadePercent)} de margem</small>
            </div>
          </div>

          <div className="admin-charts-grid">
            <HorizontalBars
              title="Faturamento Últimos 6 Meses"
              items={adminInsights.graficos.vendasMensais.map((m) => ({ label: m.label, valor: m.valor }))}
              valueFormatter={(v) => formatCurrency(v)}
            />

            <HorizontalBars
              title="Top Operadoras (90 dias)"
              items={adminInsights.graficos.topOperadoras}
              valueFormatter={(v) => formatCurrency(v)}
            />

            <HorizontalBars
              title="Comissões x Despesas (Mês)"
              items={adminInsights.graficos.comparativoComissaoDespesasMes}
              valueFormatter={(v) => formatCurrency(v)}
            />

            <HorizontalBars
              title="Vendas por Agente (Comissão no mês)"
              items={adminInsights.graficos.vendasPorAgenteMes.map((a) => ({
                label: `${a.agente} (${a.totalVendas})`,
                valor: a.valorComissao,
              }))}
              valueFormatter={(v) => formatCurrency(v)}
            />

            <HorizontalBars
              title="Funil de Propostas Abertas"
              items={adminInsights.graficos.funilEtapas.map((f) => ({ etapa: f.etapa, quantidade: f.quantidade }))}
              valueFormatter={(v) => String(v)}
            />
          </div>
        </>
      )}
    </div>
  );
}
