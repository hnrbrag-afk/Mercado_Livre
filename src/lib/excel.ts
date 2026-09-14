import * as XLSX from "xlsx";
import type { CrTitleInput } from "./crs";

export const REQUIRED_COLS = [
  "Revenda (aba da planilha)",
  "Nome/Cliente",
  "Título",
  "Sit",
  "Valor",
  "Saldo",
  "Emissão",
  "Vencimento",
  "Pagamento",
  "Tarifa de Venda",
  "Tarifa/Envio",
  "Total Despesa(s)",
  "Frete pago Comprador",
  "Descontos e Bônus",
  "Valor Líquido",
];

export type ParseResult = {
  titles: CrTitleInput[];
  unmatchedSheets: string[];
};

function excelDateToStr(v: unknown): string {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return (
      String(v.getDate()).padStart(2, "0") +
      "/" +
      String(v.getMonth() + 1).padStart(2, "0") +
      "/" +
      v.getFullYear()
    );
  }
  if (typeof v === "number" && v > 20000 && v < 60000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return (
      String(d.getUTCDate()).padStart(2, "0") +
      "/" +
      String(d.getUTCMonth() + 1).padStart(2, "0") +
      "/" +
      d.getUTCFullYear()
    );
  }
  const s = v == null ? "" : String(v).trim();
  if (!s) return "";
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return s;
}

function findCol(
  headers: string[],
  mustHave: string[],
  mustNotHave: string[] = [],
): string | undefined {
  return headers.find((h) => {
    const l = h.toLowerCase();
    return (
      mustHave.some((w) => l.includes(w)) &&
      !mustNotHave.some((w) => l.includes(w))
    );
  });
}

function scoreHeaderRow(arr: unknown[]): number {
  const lower = arr.map((c) => String(c ?? "").toLowerCase());
  let score = 0;
  ["nome", "cliente", "título", "titulo", "valor", "vencimento", "pagamento", "tarifa"].forEach(
    (w) => {
      if (lower.some((c) => c.includes(w))) score += 1;
    },
  );
  return score;
}

function cancelCell(v: unknown): string {
  if (v == null || v === "") return "";
  if (typeof v === "boolean") return v ? "sim" : "";
  if (typeof v === "number") {
    if (!Number.isFinite(v) || v === 0) return "";
    return String(v);
  }
  return String(v).trim();
}

function toNum(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/\s/g, "").replace("R$", "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : Number(v) || 0;
}

export function parseWorkbook(buffer: ArrayBuffer): ParseResult {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const titles: CrTitleInput[] = [];
  const unmatchedSheets: string[] = [];

  wb.SheetNames.forEach((sheetName) => {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) return;
    const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: true,
    });
    if (rows.length < 2) return;

    let bestIdx = 0;
    let bestScore = -1;
    for (let i = 0; i < Math.min(rows.length, 12); i++) {
      const s = scoreHeaderRow(rows[i] ?? []);
      if (s > bestScore) {
        bestScore = s;
        bestIdx = i;
      }
    }
    if (bestScore < 3) {
      unmatchedSheets.push(sheetName);
      return;
    }

    const headers = (rows[bestIdx] ?? []).map((h) => String(h ?? ""));
    const nomeKey = findCol(headers, ["nome"]) ?? findCol(headers, ["cliente"]);
    const clienteKey = findCol(headers, ["cliente"]);
    const tituloKey = findCol(headers, ["título", "titulo"]);
    const sitKey = findCol(headers, ["sit"]);
    const valorKey = findCol(headers, ["valor"], ["líquido", "liquido"]);
    const saldoKey = findCol(headers, ["saldo"]);
    const emissaoKey = findCol(headers, ["emiss"]);
    const vencKey = findCol(headers, ["vencimento"]);
    const pagKey = findCol(headers, ["pagamento"]);
    const tarifaVendaKey = findCol(headers, ["tarifa"], ["envio"]);
    const tarifaEnvioKey = findCol(headers, ["envio"]);
    const despesaKey = findCol(headers, ["despesa"]);
    const freteKey = findCol(headers, ["frete"]);
    const descontoKey = findCol(headers, ["desconto"]);
    const liquidoKey = findCol(headers, ["líquido", "liquido"]);
    const canceladaKey = findCol(headers, ["cancelad"]);
    const solucaoKey = findCol(headers, ["solução", "solucao"]);

    if (!nomeKey || !valorKey || !vencKey) {
      unmatchedSheets.push(sheetName);
      return;
    }

    for (let i = bestIdx + 1; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const obj: Record<string, unknown> = {};
      headers.forEach((h, idx) => {
        obj[h] = row[idx];
      });
      const cliente = String(obj[nomeKey] ?? "").trim();
      if (!cliente) continue;
      const valor = toNum(obj[valorKey]);
      titles.push({
        revenda: sheetName,
        cliente,
        codCliente: clienteKey ? String(obj[clienteKey] ?? "") : "",
        titulo: tituloKey ? String(obj[tituloKey] ?? "") : "",
        situacao: sitKey ? String(obj[sitKey] ?? "") : "",
        valor,
        saldo: saldoKey ? toNum(obj[saldoKey]) : 0,
        emissao: emissaoKey ? excelDateToStr(obj[emissaoKey]) : "",
        vencimento: vencKey ? excelDateToStr(obj[vencKey]) : "",
        pagamento: pagKey ? excelDateToStr(obj[pagKey]) : "",
        tarifaVenda: tarifaVendaKey ? toNum(obj[tarifaVendaKey]) : 0,
        tarifaEnvio: tarifaEnvioKey ? toNum(obj[tarifaEnvioKey]) : 0,
        despesaTotal: despesaKey ? toNum(obj[despesaKey]) : 0,
        freteComprador: freteKey ? toNum(obj[freteKey]) : 0,
        descontosBonus: descontoKey ? toNum(obj[descontoKey]) : 0,
        valorLiquido: liquidoKey ? toNum(obj[liquidoKey]) : valor,
        vendaCancelada: canceladaKey ? cancelCell(obj[canceladaKey]) : "",
        solucao: solucaoKey ? String(obj[solucaoKey] ?? "") : "",
      });
    }
  });

  return { titles, unmatchedSheets };
}
