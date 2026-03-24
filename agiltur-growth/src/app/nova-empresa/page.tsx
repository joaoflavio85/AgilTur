"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type EmpresaPayload = {
  razaoSocial: string;
  nomeFantasia: string;
  responsavel: string;
  email: string;
  telefone: string;
  subdominio: string;
  plano: "START" | "PRO" | "ENTERPRISE";
  observacoes?: string;
};

type EmpresaResponse = {
  id: string;
  mensagem: string;
  empresa: {
    razaoSocial: string;
    nomeFantasia: string;
    subdominio: string;
    plano: string;
    urlSugerida: string;
    criadoEm: string;
  };
};

const emptyState: EmpresaPayload = {
  razaoSocial: "",
  nomeFantasia: "",
  responsavel: "",
  email: "",
  telefone: "",
  subdominio: "",
  plano: "START",
  observacoes: "",
};

const normalizarSubdominio = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

export default function NovaEmpresaPage() {
  const [form, setForm] = useState<EmpresaPayload>(emptyState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<EmpresaResponse | null>(null);
  const [saving, setSaving] = useState(false);

  const dominioBase = useMemo(() => {
    if (typeof window === "undefined") return "agiltur.local";
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") return "agiltur.local";
    const parts = host.split(".").filter(Boolean);
    if (parts.length >= 2) return parts.slice(-2).join(".");
    return "agiltur.local";
  }, []);

  const suggestedUrl = form.subdominio
    ? `https://${normalizarSubdominio(form.subdominio)}.${dominioBase}`
    : "";

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess(null);

    setSaving(true);
    try {
      const response = await fetch("/api/empresas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          subdominio: normalizarSubdominio(form.subdominio),
        }),
      });

      const data = (await response.json()) as EmpresaResponse | { error: string };
      if (!response.ok) {
        setError((data as { error?: string }).error || "Falha ao cadastrar empresa.");
        return;
      }

      setSuccess(data as EmpresaResponse);
      setForm(emptyState);
    } catch {
      setError("Falha de conexao ao salvar empresa. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main>
      <div className="shell">
        <header className="topbar">
          <Link href="/" className="brand">
            AGILTUR
          </Link>
          <div className="pill">Onboarding de nova empresa</div>
        </header>
      </div>

      <section className="form-wrap">
        <h1 className="section-title">CRIAR NOVA EMPRESA SAAS</h1>
        <p className="section-sub">
          Preencha os dados abaixo para iniciar o onboarding da empresa no AGILTUR. O cadastro
          gera um subdominio sugerido para o novo tenant.
        </p>

        <form className="form-grid" onSubmit={onSubmit}>
          <div className="field span-2">
            <label htmlFor="razaoSocial">Razao social</label>
            <input
              id="razaoSocial"
              value={form.razaoSocial}
              onChange={(e) => setForm((prev) => ({ ...prev, razaoSocial: e.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="nomeFantasia">Nome fantasia</label>
            <input
              id="nomeFantasia"
              value={form.nomeFantasia}
              onChange={(e) => setForm((prev) => ({ ...prev, nomeFantasia: e.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="responsavel">Responsavel</label>
            <input
              id="responsavel"
              value={form.responsavel}
              onChange={(e) => setForm((prev) => ({ ...prev, responsavel: e.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="email">Email comercial</label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="telefone">Telefone</label>
            <input
              id="telefone"
              value={form.telefone}
              onChange={(e) => setForm((prev) => ({ ...prev, telefone: e.target.value }))}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="subdominio">Subdominio desejado</label>
            <input
              id="subdominio"
              value={form.subdominio}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, subdominio: normalizarSubdominio(e.target.value) }))
              }
              required
              pattern="[a-z0-9-]+"
              title="Use apenas letras minusculas, numeros e hifen."
            />
            <span className="hint">Somente letras minusculas, numeros e hifen.</span>
          </div>

          <div className="field">
            <label htmlFor="plano">Plano inicial</label>
            <select
              id="plano"
              value={form.plano}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  plano: e.target.value as EmpresaPayload["plano"],
                }))
              }
            >
              <option value="START">Start</option>
              <option value="PRO">Pro</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>

          <div className="field span-2">
            <label htmlFor="observacoes">Observacoes comerciais</label>
            <textarea
              id="observacoes"
              value={form.observacoes}
              onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Ex: origem do lead, prazo de implantacao, necessidades especiais"
            />
          </div>

          <div className="field span-2">
            <span className="hint">
              URL sugerida para o tenant: {suggestedUrl || "preencha o subdominio"}
            </span>
          </div>

          <div className="hero-actions span-2">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Criar empresa"}
            </button>
            <Link className="btn btn-secondary" href="/">
              Voltar para landing
            </Link>
          </div>
        </form>

        {error ? <div className="error">{error}</div> : null}

        {success ? (
          <div className="success">
            <p>{success.mensagem}</p>
            <p>
              Tenant criado: <strong>{success.empresa.nomeFantasia}</strong>
            </p>
            <p>
              URL sugerida: <code>{success.empresa.urlSugerida}</code>
            </p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
