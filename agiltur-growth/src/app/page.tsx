import Link from "next/link";

export default function Home() {
  return (
    <main>
      <div className="shell">
        <header className="topbar">
          <div className="brand">AGILTUR</div>
          <div className="pill">SaaS para agencias de viagens</div>
        </header>

        <section className="hero">
          <article className="hero-card">
            <h1 className="headline">VENDA MAIS. OPERE MELHOR. ESCALE SUA AGENCIA.</h1>
            <p className="lead">
              O AGILTUR centraliza comercial, financeiro, pos-venda e comunicacao em uma
              plataforma unica para agencias de viagens. Estrutura pronta para SaaS por
              subdominio e expansao por unidades.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/nova-empresa">
                Criar nova empresa SaaS
              </Link>
              <a className="btn btn-secondary" href="#planos">
                Ver planos
              </a>
            </div>
          </article>

          <aside className="hero-card">
            <div className="stat-grid">
              <article className="stat">
                <strong>360°</strong>
                <span>Visao completa da operacao</span>
              </article>
              <article className="stat">
                <strong>SaaS</strong>
                <span>Multiempresa por subdominio</span>
              </article>
              <article className="stat">
                <strong>API</strong>
                <span>Integracoes com financeiro e chatbot</span>
              </article>
              <article className="stat">
                <strong>Go-live</strong>
                <span>Implantacao assistida em semanas</span>
              </article>
            </div>
          </aside>
        </section>

        <section className="section" id="modulos">
          <h2 className="section-title">O SISTEMA COMPLETO PARA AGENCIAS</h2>
          <p className="section-sub">
            Do primeiro contato do cliente ate o pos-venda, o AGILTUR organiza o fluxo da sua
            equipe e entrega visibilidade real para decisao.
          </p>

          <div className="feature-grid">
            <article className="feature">
              <h3>CRM e Comercial</h3>
              <p>Clientes, propostas, funil, motivos de perda e vendas com anexos.</p>
            </article>
            <article className="feature">
              <h3>Financeiro</h3>
              <p>Contas a receber/pagar, centros de custo, boletos e acompanhamento de caixa.</p>
            </article>
            <article className="feature">
              <h3>Pos-venda</h3>
              <p>Agenda de viagens, modelos de relacionamento e acompanhamento operacional.</p>
            </article>
            <article className="feature">
              <h3>Comunicacao</h3>
              <p>WhatsApp/ChatBot com historico e trilha de auditoria para governanca.</p>
            </article>
            <article className="feature">
              <h3>Escala SaaS</h3>
              <p>Tenant por subdominio para operar varias unidades com dados isolados.</p>
            </article>
            <article className="feature">
              <h3>Modulos avancados</h3>
              <p>Orcamentos inteligentes, PDF, IA e creditos para fortalecer a conversao.</p>
            </article>
          </div>
        </section>

        <section className="section" id="planos">
          <h2 className="section-title">PLANOS PARA CADA FASE DA AGENCIA</h2>
          <p className="section-sub">
            Comece no plano ideal e evolua sem trocar de plataforma.
          </p>

          <div className="pricing">
            <article className="plan">
              <h3>Start</h3>
              <div className="price">R$ 497</div>
              <ul>
                <li>CRM, propostas, vendas e agenda</li>
                <li>3 usuarios incluidos</li>
                <li>Suporte comercial</li>
              </ul>
            </article>

            <article className="plan">
              <h3>Pro</h3>
              <div className="price">R$ 997</div>
              <ul>
                <li>Tudo do Start + financeiro completo</li>
                <li>Asaas + WhatsApp/ChatBot</li>
                <li>8 usuarios incluidos</li>
              </ul>
            </article>

            <article className="plan">
              <h3>Enterprise</h3>
              <div className="price">R$ 2.490+</div>
              <ul>
                <li>Multiunidade por subdominio</li>
                <li>Governanca e SLA avancados</li>
                <li>Expansao sob demanda</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="cta">
          <div>
            <h2>QUER LANCAR UMA NOVA EMPRESA NO SAAS?</h2>
            <p>Cadastre os dados da empresa e gere o onboarding inicial com dominio sugerido.</p>
          </div>
          <Link className="btn btn-primary" href="/nova-empresa">
            Abrir onboarding
          </Link>
        </section>

        <p className="footer-note">AGILTUR • Plataforma SaaS para crescimento de agencias de viagens</p>
      </div>
    </main>
  );
}
