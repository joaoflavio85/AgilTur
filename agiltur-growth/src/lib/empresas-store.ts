import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type Plano = "START" | "PRO" | "ENTERPRISE";

export type BackendSync = {
  status: "success" | "failed" | "not-configured";
  tenantId?: number;
  message?: string;
};

export type EmpresaRecord = {
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
  backendSync: BackendSync;
};

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "empresas.json");

export const subdomainRegex = /^[a-z0-9-]{3,40}$/;

export const toStringSafe = (value: unknown) => String(value || "").trim();

export const normalizeSubdomain = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

export async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });
  try {
    await readFile(dataFile, "utf-8");
  } catch {
    await writeFile(dataFile, "[]", "utf-8");
  }
}

export async function loadEmpresas(): Promise<EmpresaRecord[]> {
  await ensureDataFile();
  const content = await readFile(dataFile, "utf-8");

  try {
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? (parsed as EmpresaRecord[]) : [];
  } catch {
    return [];
  }
}

export async function saveEmpresas(empresas: EmpresaRecord[]) {
  await writeFile(dataFile, JSON.stringify(empresas, null, 2), "utf-8");
}
