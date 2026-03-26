import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  type BackendSync,
  type EmpresaRecord,
  type Plano,
  loadEmpresas,
  normalizeSubdomain,
  saveEmpresas,
  subdomainRegex,
  toStringSafe,
} from "@/lib/empresas-store";

async function syncWithCoreBackend(record: EmpresaRecord): Promise<BackendSync> {
  const apiUrl = String(process.env.AGILTUR_CORE_API_URL || "").trim();
  const apiKey = String(process.env.AGILTUR_CORE_API_KEY || "").trim();

  if (!apiUrl || !apiKey) {
    return {
      status: "not-configured",
      message: "Integracao com backend principal nao configurada no landing app.",
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-saas-api-key": apiKey,
      },
      body: JSON.stringify({
        razaoSocial: record.razaoSocial,
        nomeFantasia: record.nomeFantasia,
        email: record.email,
        telefone: record.telefone,
        subdominio: record.subdominio,
        plano: record.plano,
        observacoes: record.observacoes,
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      tenant?: { id?: number };
    };

    if (!response.ok) {
      return {
        status: "failed",
        message: payload.error || "Falha ao sincronizar com backend principal.",
      };
    }

    return {
      status: "success",
      tenantId: payload.tenant?.id,
      message: "Tenant criado no backend principal.",
    };
  } catch {
    return {
      status: "failed",
      message: "Erro de conexao com backend principal durante sincronizacao.",
    };
  }
}

export async function GET(request: Request) {
  const empresas = await loadEmpresas();

  const { searchParams } = new URL(request.url);
  const q = toStringSafe(searchParams.get("q") || "").toLowerCase();
  const plano = toStringSafe(searchParams.get("plano") || "").toUpperCase();
  const sync = toStringSafe(searchParams.get("sync") || "").toLowerCase();

  const filtradas = empresas.filter((item) => {
    if (plano && item.plano !== plano) return false;
    if (sync && item.backendSync?.status !== sync) return false;

    if (!q) return true;
    const bag = [item.razaoSocial, item.nomeFantasia, item.email, item.subdominio]
      .join(" ")
      .toLowerCase();
    return bag.includes(q);
  });

  return NextResponse.json({ total: filtradas.length, empresas: filtradas });
}

export async function POST(request: Request) {
  const body = await request.json();

  const razaoSocial = toStringSafe(body?.razaoSocial);
  const nomeFantasia = toStringSafe(body?.nomeFantasia);
  const responsavel = toStringSafe(body?.responsavel);
  const email = toStringSafe(body?.email).toLowerCase();
  const telefone = toStringSafe(body?.telefone);
  const subdominio = normalizeSubdomain(toStringSafe(body?.subdominio));
  const plano = toStringSafe(body?.plano).toUpperCase() as Plano;
  const observacoes = toStringSafe(body?.observacoes);

  if (!razaoSocial || !nomeFantasia || !responsavel || !email || !telefone || !subdominio) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatorios." }, { status: 400 });
  }

  if (!subdomainRegex.test(subdominio)) {
    return NextResponse.json(
      { error: "Subdominio invalido. Use 3-40 caracteres com letras minusculas, numeros e hifen." },
      { status: 400 },
    );
  }

  if (!["START", "PRO", "ENTERPRISE"].includes(plano)) {
    return NextResponse.json({ error: "Plano invalido." }, { status: 400 });
  }

  const empresas = await loadEmpresas();
  const subdominioExiste = empresas.some((item) => item.subdominio === subdominio);

  if (subdominioExiste) {
    return NextResponse.json({ error: "Subdominio ja utilizado. Escolha outro." }, { status: 409 });
  }

  const dominioBase = process.env.NEXT_PUBLIC_BASE_DOMAIN || "agiltur.local";

  const record: EmpresaRecord = {
    id: randomUUID(),
    razaoSocial,
    nomeFantasia,
    responsavel,
    email,
    telefone,
    subdominio,
    plano,
    observacoes,
    urlSugerida: `https://${subdominio}.${dominioBase}`,
    criadoEm: new Date().toISOString(),
    backendSync: { status: "not-configured" },
  };

  record.backendSync = await syncWithCoreBackend(record);

  empresas.unshift(record);
  await saveEmpresas(empresas);

  return NextResponse.json(
    {
      id: record.id,
      mensagem: "Empresa cadastrada com sucesso. Onboarding iniciado.",
      empresa: {
        razaoSocial: record.razaoSocial,
        nomeFantasia: record.nomeFantasia,
        subdominio: record.subdominio,
        plano: record.plano,
        urlSugerida: record.urlSugerida,
        criadoEm: record.criadoEm,
        backendSync: record.backendSync,
      },
      links: {
        propostaPdf: `/api/empresas/${record.id}/proposta-pdf`,
      },
    },
    { status: 201 },
  );
}
