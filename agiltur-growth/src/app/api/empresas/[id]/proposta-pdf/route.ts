import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import { loadEmpresas } from "@/lib/empresas-store";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function planoInfo(plano: string) {
  if (plano === "PRO") {
    return {
      mensalidade: 997,
      implantacao: 2490,
      titulo: "Plano Pro",
    };
  }

  if (plano === "ENTERPRISE") {
    return {
      mensalidade: 2490,
      implantacao: 4900,
      titulo: "Plano Enterprise",
    };
  }

  return {
    mensalidade: 497,
    implantacao: 1490,
    titulo: "Plano Start",
  };
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const empresas = await loadEmpresas();
  const empresa = empresas.find((item) => item.id === id);

  if (!empresa) {
    return NextResponse.json({ error: "Empresa nao encontrada." }, { status: 404 });
  }

  const plano = planoInfo(empresa.plano);
  const hoje = new Date().toLocaleDateString("pt-BR");

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 120,
    color: rgb(0.05, 0.32, 0.47),
  });

  page.drawText("AGILTUR", {
    x: 42,
    y: height - 70,
    size: 34,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Proposta Comercial de Implantacao SaaS", {
    x: 42,
    y: height - 96,
    size: 12,
    font: fontRegular,
    color: rgb(0.89, 0.95, 1),
  });

  let y = height - 160;

  const addLine = (label: string, value: string) => {
    page.drawText(label, {
      x: 42,
      y,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.12, 0.18),
    });
    page.drawText(value, {
      x: 190,
      y,
      size: 11,
      font: fontRegular,
      color: rgb(0.2, 0.23, 0.3),
    });
    y -= 22;
  };

  addLine("Data:", hoje);
  addLine("Empresa:", empresa.razaoSocial);
  addLine("Nome fantasia:", empresa.nomeFantasia);
  addLine("Responsavel:", empresa.responsavel);
  addLine("Email:", empresa.email);
  addLine("Telefone:", empresa.telefone);
  addLine("Subdominio:", empresa.subdominio);
  addLine("URL sugerida:", empresa.urlSugerida);

  y -= 8;
  page.drawLine({
    start: { x: 42, y },
    end: { x: width - 42, y },
    thickness: 1,
    color: rgb(0.82, 0.84, 0.88),
  });

  y -= 28;
  page.drawText("Escopo do pacote", {
    x: 42,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.06, 0.28, 0.38),
  });

  y -= 22;
  const escopo = [
    `${plano.titulo} AGILTUR`,
    "CRM, Propostas, Vendas e Pos-venda",
    "Modulo Financeiro conforme plano contratado",
    "Onboarding da operacao e configuracao inicial",
    "Suporte para go-live assistido",
  ];

  escopo.forEach((item) => {
    page.drawText(`- ${item}`, {
      x: 54,
      y,
      size: 11,
      font: fontRegular,
      color: rgb(0.2, 0.23, 0.3),
    });
    y -= 18;
  });

  y -= 6;
  page.drawText("Investimento", {
    x: 42,
    y,
    size: 14,
    font: fontBold,
    color: rgb(0.06, 0.28, 0.38),
  });

  y -= 24;
  addLine("Plano:", plano.titulo);
  addLine("Mensalidade:", currency.format(plano.mensalidade));
  addLine("Implantacao unica:", currency.format(plano.implantacao));

  y -= 18;
  page.drawText("Validade da proposta: 15 dias corridos.", {
    x: 42,
    y,
    size: 10,
    font: fontRegular,
    color: rgb(0.38, 0.41, 0.48),
  });

  page.drawText("Documento gerado automaticamente pelo AGILTUR Growth.", {
    x: 42,
    y: 40,
    size: 9,
    font: fontRegular,
    color: rgb(0.45, 0.49, 0.56),
  });

  const bytes = await pdfDoc.save();
  const fileName = `proposta-${empresa.subdominio}.pdf`;

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=\"${fileName}\"`,
      "Cache-Control": "no-store",
    },
  });
}
