import { cn } from "@/lib/utils";
import type { CrStatus } from "@/lib/crs";

const styles: Record<CrStatus, string> = {
  pendente: "bg-gold/15 text-gold-soft",
  vencido: "bg-danger/15 text-danger",
  pago: "bg-sage/15 text-sage",
};

export function StatusBadge({
  status,
  extra,
}: {
  status: CrStatus;
  extra?: string;
}) {
  const label =
    status === "vencido"
      ? extra
        ? `vencido (${extra})`
        : "vencido"
      : status === "pendente"
        ? "pendente"
        : "recebido";
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
        styles[status],
      )}
    >
      {label}
    </span>
  );
}
