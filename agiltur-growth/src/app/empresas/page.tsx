"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Empresa = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  responsavel: string;
  email: string;
  telefone: string;
  subdominio: string;
  plano: "START" | "PRO" | "ENTERPRISE";
  observacoes: string;
  urlSugerida: string;
  criadoEm: string;
  backendSync: {
    status: "success" | "failed" | "not-configured";
    tenantId?: number;
    message?: string;
  };
};

const planoOptions = ["", "START", "PRO", "ENTERPRISE"];
const syncOptions = ["", "success", "failed", "not-configured"];

const badgeLabel = (status: Empresa["backendSync"]["status"]) => {
  if (status === "success") return "Sincronizado";
  if (status === "failed") return "Falha";
  return "Nao configurado";
};

export default function EmpresasPage() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [plano, setPlano] = useState("");
  const [sync, setSync] = useState("");

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (plano) params.set("plano", plano);
    if (sync) params.set("sync", sync);
    return params.toString();
  }, [q, plano, sync]);

  const carregar = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/empresas${query ? `?${query}` : ""}`, { cache: "no-store" });
      const data = (await response.json()) as { empresas?: Empresa[]; error?: string };

      if (!response.ok) {
        setError(data.error || "Falha ao carregar empresas.");
        setEmpresas([]);
        return;
      }

      setEmpresas(Array.isArray(data.empresas) ? data.empresas : []);
    } catch {
      setError("Falha de conexao ao listar empresas.");
      setEmpresas([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <main>
      <div className="shell">
        <header className="topbar">
          <Link href="/" className="brand">
            AGILTUR
          </Link>
          <div className="pill">Painel de empresas SaaS</div>
        </header>
      </div>

      <section className="form-wrap">
        <h1 className="section-title">EMPRESAS CADASTRADAS</h1>
        <p className="section-sub">
          Consulte cadastros criados pela landing, aplique filtros e baixe a proposta comercial em
          PDF para cada novo lead.
        </p>

        <div className="form-grid" style={{ marginTop: 14 }}>
          <div className="field">
            <label htmlFor="q">Busca</label>
            <input
              id="q"
              placeholder="Razao social, fantasia, email ou subdominio"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="plano">Plano</label>
            <select id="plano" value={plano} onChange={(e) => setPlano(e.target.value)}>
              {planoOptions.map((item) => (
                <option key={item || "TODOS"} value={item}>
                  {item || "Todos"}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="sync">Status de sincronizacao</label>
            <select id="sync" value={sync} onChange={(e) => setSync(e.target.value)}>
              {syncOptions.map((item) => (
                <option key={item || "TODOS"} value={item}>
                  {item || "Todos"}
                </option>
              ))}
            </select>
          </div>

          <div className="field" style={{ alignSelf: "end" }}>
            <button className="btn btn-secondary" type="button" onClick={carregar}>
              Atualizar
            </button>
          </div>
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div style={{ marginTop: 18, overflowX: "auto" }}>
          <table className="table-grid">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Plano</th>
                <th>Subdominio</th>
                <th>Backend</th>
                <th>Criado em</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6}>Carregando...</td>
                </tr>
              ) : empresas.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nenhuma empresa encontrada.</td>
                </tr>
              ) : (
                empresas.map((empresa) => (
                  <tr key={empresa.id}>
                    <td>
                      <strong>{empresa.nomeFantasia}</strong>
                      <div className="hint">{empresa.razaoSocial}</div>
                      <div className="hint">{empresa.email}</div>
                    </td>
                    <td>{empresa.plano}</td>
                    <td>
                      <a href={empresa.urlSugerida} target="_blank" rel="noreferrer">
                        {empresa.subdominio}
                      </a>
                    </td>
                    <td>
                      <span className={`status-badge status-${empresa.backendSync?.status || "not-configured"}`}>
                        {badgeLabel(empresa.backendSync?.status || "not-configured")}
                      </span>
                      <div className="hint">{empresa.backendSync?.message || "-"}</div>
                    </td>
                    <td>{new Date(empresa.criadoEm).toLocaleString("pt-BR")}</td>
                    <td>
                      <div className="row-actions">
                        <a className="btn btn-secondary" href={`/api/empresas/${empresa.id}/proposta-pdf`} target="_blank" rel="noreferrer">
                          PDF
                        </a>
                        <a className="btn btn-secondary" href={empresa.urlSugerida} target="_blank" rel="noreferrer">
                          URL
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="hero-actions" style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" href="/nova-empresa">
            Criar nova empresa
          </Link>
          <Link className="btn btn-secondary" href="/">
            Voltar para landing
          </Link>
        </div>
      </section>
    </main>
  );
}
