import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

type Plano = "START" | "PRO" | "ENTERPRISE";

type EmpresaRecord = {
  id: string;
  razaoSocial: string;
  nomeFantasia: string;
  responsavel: string;
  email: string;
  telefone: string;
  subdominio: string;
  plano: Plano;
  observacoes: string;
  urlSugerida: string;
  criadoEm: string;
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "empresas.json");

const subdomainRegex = /^[a-z0-9-]{3,40}$/;

const toString = (value: unknown) => String(value || "").trim();

const normalizeSubdomain = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf-8");
  } catch {
    await writeFile(dataFile, "[]", "utf-8");
  }
}

async function loadEmpresas(): Promise<EmpresaRecord[]> {
  await ensureDataFile();
  const content = await readFile(dataFile, "utf-8");
  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as EmpresaRecord[]) : [];
  } catch {
    return [];
  }
}

async function saveEmpresas(empresas: EmpresaRecord[]) {
  await writeFile(dataFile, JSON.stringify(empresas, null, 2), "utf-8");
}

export async function GET() {
  const empresas = await loadEmpresas();
  return NextResponse.json({ total: empresas.length, empresas });
}

export async function POST(request: Request) {
  const body = await request.json();

  const razaoSocial = toString(body?.razaoSocial);
  const nomeFantasia = toString(body?.nomeFantasia);
  const responsavel = toString(body?.responsavel);
  const email = toString(body?.email).toLowerCase();
  const telefone = toString(body?.telefone);
  const subdominio = normalizeSubdomain(toString(body?.subdominio));
  const plano = toString(body?.plano).toUpperCase() as Plano;
  const observacoes = toString(body?.observacoes);

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
  };

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
      },
    },
    { status: 201 },
  );
}
