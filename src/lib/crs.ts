export type CrStatus = "pendente" | "vencido" | "pago";

export type CrTitle = {
  id: number;
  revenda: string;
  cliente: string;
  codCliente: string;
  titulo: string;
  situacao: string;
  valor: number;
  saldo: number;
  emissao: string;
  vencimento: string;
  pagamento: string;
  tarifaVenda: number;
  tarifaEnvio: number;
  despesaTotal: number;
  freteComprador: number;
  descontosBonus: number;
  valorLiquido: number;
  vendaCancelada: string;
  solucao: string;
};

export type CrTitleInput = Omit<CrTitle, "id">;

export type ImportRecord = {
  id: number;
  filename: string;
  revendaCount: number;
  titleCount: number;
  createdAt: string;
};

export function fmtBRL(v: number): string {
  return (
    "R$ " +
    Number(v || 0)
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  );
}

export function parseBR(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  const p = String(dateStr).split("/");
  if (p.length !== 3) return null;
  const d = new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfToday(fromIso?: string): Date {
  if (fromIso) {
    const [y, m, d] = fromIso.split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function isPendente(r: CrTitle): boolean {
  const sit = String(r.situacao || "")
    .trim()
    .toUpperCase();
  if (sit === "PT") return false;
  return !r.pagamento || Number(r.saldo) > 0;
}

export function isVencido(r: CrTitle, today = startOfToday()): boolean {
  if (!isPendente(r)) return false;
  const v = parseBR(r.vencimento);
  return Boolean(v && v < today);
}

export function diasAtraso(r: CrTitle, today = startOfToday()): number {
  const v = parseBR(r.vencimento);
  if (!v) return 0;
  const diff = Math.floor((today.getTime() - v.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
}

export function statusOf(r: CrTitle, today = startOfToday()): CrStatus {
  if (!isPendente(r)) return "pago";
  return isVencido(r, today) ? "vencido" : "pendente";
}

export function pendingValue(r: CrTitle): number {
  if (!isPendente(r)) return 0;
  return Number(r.saldo) > 0 ? Number(r.saldo) : Number(r.valor);
}

export function isVendaCancelada(r: Pick<CrTitle, "vendaCancelada">): boolean {
  const v = String(r.vendaCancelada ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!v) return false;
  if (["nao", "n", "no", "false", "0", "-", "nao cancelada"].includes(v)) return false;
  return true;
}

/** Amount written in the "Venda Cancelada" column — never valor líquido or valor da venda. */
export function valorCancelado(r: Pick<CrTitle, "vendaCancelada">): number {
  const raw = String(r.vendaCancelada ?? "").trim().replace(/\s/g, "").replace(/R\$/gi, "");
  if (!raw) return 0;
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }
  const br = Number(raw.replace(/\./g, "").replace(",", "."));
  if (Number.isFinite(br) && /[\d]/.test(raw)) return br;
  return 0;
}

export const STATUS_LABEL: Record<CrStatus, string> = {
  pendente: "Pendente",
  vencido: "Vencido",
  pago: "Recebido",
};

export function dataAsCsv(rows: CrTitle[], today = startOfToday()): string {
  const header = [
    "Revenda",
    "Cliente",
    "Título",
    "Situação",
    "Valor",
    "Saldo",
    "Emissão",
    "Vencimento",
    "Pagamento",
    "TarifaVenda",
    "TarifaEnvio",
    "TotalDespesas",
    "FreteComprador",
    "DescontosBonus",
    "ValorLiquido",
    "VendaCancelada",
    "DiasAtraso",
    "Status",
    "Solução",
  ].join(";");
  const lines = rows.map((r) =>
    [
      r.revenda,
      r.cliente,
      r.titulo,
      r.situacao,
      r.valor.toFixed(2),
      r.saldo.toFixed(2),
      r.emissao,
      r.vencimento,
      r.pagamento || "",
      (r.tarifaVenda || 0).toFixed(2),
      (r.tarifaEnvio || 0).toFixed(2),
      (r.despesaTotal || 0).toFixed(2),
      (r.freteComprador || 0).toFixed(2),
      (r.descontosBonus || 0).toFixed(2),
      r.valorLiquido.toFixed(2),
      r.vendaCancelada,
      diasAtraso(r, today),
      statusOf(r, today),
      (r.solucao || "").replace(/;/g, ","),
    ].join(";"),
  );
  return [header, ...lines].join("\n");
}
