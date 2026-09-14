import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Input, NativeSelect } from "@/components/ui/input";
import {
  type CrStatus,
  type CrTitle,
  type ImportRecord,
  diasAtraso,
  fmtBRL,
  statusOf,
  valorCancelado,
} from "@/lib/crs";

export function TitlesTable({
  titles,
  forceStatus,
  heading = "Títulos",
  emptyLabel = "Nenhum título com esses filtros.",
  showCancelado = false,
  onAsk,
}: {
  titles: CrTitle[];
  forceStatus?: CrStatus | "";
  heading?: string;
  emptyLabel?: string;
  showCancelado?: boolean;
  onAsk: (title: CrTitle) => void;
}) {
  const [q, setQ] = useState("");
  const [revenda, setRevenda] = useState("");
  const [status, setStatus] = useState<CrStatus | "">("");
  const statusSel = forceStatus || status;
  const revendas = useMemo(
    () => [...new Set(titles.map((r) => r.revenda))].sort(),
    [titles],
  );

  const rows = titles.filter((r) => {
    if (revenda && r.revenda !== revenda) return false;
    if (statusSel && statusOf(r) !== statusSel) return false;
    const query = q.trim().toLowerCase();
    if (
      query &&
      !(
        r.cliente.toLowerCase().includes(query) ||
        String(r.titulo).toLowerCase().includes(query) ||
        r.revenda.toLowerCase().includes(query)
      )
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="mb-8">
      <header className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-medium text-cream">{heading}</h2>
        <span className="text-xs text-muted">Clique numa linha para perguntar à IA sobre ela</span>
      </header>
      <div className="overflow-hidden rounded-lg bg-ledger">
        <div className="no-print flex flex-wrap gap-2.5 border-b border-ledger-line bg-ledger p-3.5">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente, título ou revenda…"
            className="h-11 max-w-[260px] flex-1 border-ledger-line bg-white text-ink placeholder:text-ledger-ink/50"
          />
          <NativeSelect
            value={revenda}
            onChange={(e) => setRevenda(e.target.value)}
            className="h-11 border-ledger-line bg-white text-ink"
          >
            <option value="">Todas as revendas</option>
            {revendas.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </NativeSelect>
          {forceStatus ? null : (
            <NativeSelect
              value={status}
              onChange={(e) => setStatus(e.target.value as CrStatus | "")}
              className="h-11 border-ledger-line bg-white text-ink"
            >
              <option value="">Todas as situações</option>
              <option value="vencido">Vencidos</option>
              <option value="pendente">Pendentes (não vencidos)</option>
              <option value="pago">Recebidos</option>
            </NativeSelect>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-xs text-ledger-ink">
            <thead>
              <tr className="bg-ledger-head">
                {[
                  "Revenda",
                  "Cliente",
                  "Título",
                  "Sit.",
                  "Valor",
                  "Vencimento",
                  "Pagamento",
                  "Dias atraso",
                  showCancelado ? "Venda cancelada" : "Vlr. Líquido",
                  "Status",
                ].map((h, i) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-3 py-2.5 font-semibold ${i < 3 ? "text-left font-sans" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-6 text-left font-sans text-ledger-ink/70">
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const st = statusOf(r);
                  return (
                    <tr
                      key={r.id}
                      className="cursor-pointer border-b border-ledger-line hover:bg-ledger-hover"
                      onClick={() => onAsk(r)}
                    >
                      <td className="px-3 py-2.5 text-left font-sans whitespace-normal">{r.revenda}</td>
                      <td className="px-3 py-2.5 text-left font-sans whitespace-normal">{r.cliente}</td>
                      <td className="px-3 py-2.5 text-left font-sans">{r.titulo}</td>
                      <td className="px-3 py-2.5 text-right">{r.situacao || "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(r.valor)}</td>
                      <td className="px-3 py-2.5 text-right">{r.vencimento || "—"}</td>
                      <td className="px-3 py-2.5 text-right">{r.pagamento || "—"}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {st === "vencido" ? diasAtraso(r) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {showCancelado
                          ? valorCancelado(r)
                            ? fmtBRL(valorCancelado(r))
                            : r.vendaCancelada || "—"
                          : fmtBRL(r.valorLiquido)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <StatusBadge
                          status={st}
                          extra={st === "vencido" ? `${diasAtraso(r)}d` : undefined}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function HistoricoTable({ records }: { records: ImportRecord[] }) {
  return (
    <div className="mb-8">
      <header className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-medium text-cream">Histórico de importações</h2>
        <span className="text-xs text-muted">Registrado na sua conta</span>
      </header>
      <div className="overflow-hidden rounded-lg bg-ledger">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-xs text-ledger-ink">
            <thead>
              <tr className="bg-ledger-head">
                {["Data/hora", "Arquivo", "Revendas", "Títulos importados"].map((h, i) => (
                  <th
                    key={h}
                    className={`whitespace-nowrap px-3 py-2.5 font-semibold ${i < 2 ? "text-left font-sans" : "text-right"}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-4 text-left font-sans text-ledger-ink/70">
                    Nenhuma importação registrada ainda — os dados exibidos são o exemplo inicial.
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="border-b border-ledger-line hover:bg-ledger-hover">
                    <td className="px-3 py-2.5 text-left font-sans">
                      {new Date(r.createdAt).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-3 py-2.5 text-left font-sans">{r.filename}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.revendaCount}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{r.titleCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
