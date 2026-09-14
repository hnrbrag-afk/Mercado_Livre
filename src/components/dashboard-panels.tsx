import {
  type CrTitle,
  diasAtraso,
  fmtBRL,
  isPendente,
  isVendaCancelada,
  isVencido,
  pendingValue,
  statusOf,
  valorCancelado,
} from "@/lib/crs";
import { TitlesTable } from "@/components/titles-table";

function Kpi({
  label,
  value,
  delta,
  names,
  tone,
}: {
  label: string;
  value?: string | number;
  delta?: string;
  names?: string[];
  tone?: "up" | "down" | "";
}) {
  return (
    <div className="dashboard-kpi group relative overflow-hidden rounded-xl border border-line bg-panel px-5 py-4 shadow-[var(--shadow-panel)] transition duration-200 hover:-translate-y-0.5 hover:border-gold-soft/70">
      <div className="dashboard-kpi-glow" aria-hidden="true" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</div>
        <span className={`dashboard-kpi-dot ${tone === "up" ? "bg-danger" : tone === "down" ? "bg-sage" : "bg-gold"}`} />
      </div>
      {names ? (
        <div className="relative text-[13px] leading-relaxed text-cream">
          {names.join(", ")}
        </div>
      ) : (
        <>
          <div className="relative font-mono text-[24px] font-semibold tabular-nums tracking-tight text-cream">{value}</div>
          {delta ? (
            <div
              className={`mt-1.5 font-mono text-xs tabular-nums ${
                tone === "up" ? "text-danger" : tone === "down" ? "text-sage" : "text-muted"
              }`}
            >
              {delta}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

export function KpiRow({ titles }: { titles: CrTitle[] }) {
  const revendas = [...new Set(titles.map((r) => r.revenda))];
  const pendentes = titles.filter(isPendente);
  const vencidos = titles.filter((r) => isVencido(r));
  const totalPendente = pendentes.reduce((s, r) => s + pendingValue(r), 0);
  const totalVencido = vencidos.reduce((s, r) => s + pendingValue(r), 0);
  const maiorAtraso = vencidos.reduce((m, r) => Math.max(m, diasAtraso(r)), 0);
  const tarifas = titles.filter((r) => r.valor > 0).map((r) => (r.tarifaVenda / r.valor) * 100);
  const tarifaMedia = tarifas.length ? tarifas.reduce((a, b) => a + b, 0) / tarifas.length : 0;
  const maiorCliente = pendentes.reduce<CrTitle | null>(
    (m, r) => (pendingValue(r) > pendingValue(m ?? ({ saldo: 0, valor: 0 } as CrTitle)) ? r : m),
    null,
  );
  const canceladas = titles.filter(isVendaCancelada);
  const totalCancelado = canceladas.reduce((s, r) => s + valorCancelado(r), 0);

  const kpis = [
    {
      label: "Revendas",
      names: [...revendas].sort(),
    },
    { label: "Títulos a Receber", value: pendentes.length, delta: `de ${titles.length} títulos` },
    {
      label: "Valor a Receber",
      value: fmtBRL(totalPendente),
      delta: `${pendentes.length} títulos em aberto`,
      tone: "up" as const,
    },
    {
      label: "Vendas canceladas",
      value: canceladas.length,
      delta: fmtBRL(totalCancelado),
      tone: "up" as const,
    },
    {
      label: "Títulos vencidos",
      value: vencidos.length,
      delta: fmtBRL(totalVencido) + " em atraso",
      tone: "up" as const,
    },
    {
      label: "Maior atraso",
      value: maiorAtraso + " dias",
      delta: vencidos.length ? "entre os títulos vencidos" : "nenhum título vencido",
    },
    {
      label: "Tarifa média Mercado Pago",
      value: tarifaMedia.toFixed(1) + "%",
      delta: "sobre o valor bruto das vendas",
    },
    {
      label: "Cliente com maior pendência",
      value: maiorCliente ? fmtBRL(pendingValue(maiorCliente)) : "—",
      delta: maiorCliente ? `${maiorCliente.cliente} · ${maiorCliente.revenda}` : "",
    },
    {
      label: "Total de títulos na base",
      value: titles.length,
      delta: `${titles.length - pendentes.length} já recebidos`,
    },
  ];

  const destaque = kpis.slice(0, 4);
  const faixa = kpis.slice(4);

  return (
    <div className="mb-5 space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {destaque.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {faixa.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>
    </div>
  );
}

export function InsightsRow({ titles }: { titles: CrTitle[] }) {
  const revendas = [...new Set(titles.map((r) => r.revenda))];
  const ranking = revendas
    .map((rv) => ({
      revenda: rv,
      total: titles.filter((r) => r.revenda === rv && isPendente(r)).reduce((s, r) => s + pendingValue(r), 0),
    }))
    .sort((a, b) => b.total - a.total);
  const max = Math.max(...ranking.map((a) => a.total), 1);

  const alerts: { level: "high" | "mid"; text: string }[] = [];
  titles.forEach((r) => {
    const dias = diasAtraso(r);
    if (isVencido(r) && dias >= 30) {
      alerts.push({
        level: "high",
        text: `${r.cliente} (${r.revenda}) — título ${r.titulo}: vencido há ${dias} dias, ${fmtBRL(pendingValue(r))} em aberto.`,
      });
    } else if (isVencido(r)) {
      alerts.push({
        level: "mid",
        text: `${r.cliente} (${r.revenda}) — título ${r.titulo}: vencido há ${dias} dias.`,
      });
    }
    if (isVendaCancelada(r) && isPendente(r)) {
      alerts.push({
        level: "high",
        text: `${r.cliente} (${r.revenda}) — título ${r.titulo}: venda marcada como cancelada, mas ainda consta ${fmtBRL(pendingValue(r))} pendente. Confirmar se o CR foi ajustado.`,
      });
    }
  });
  const seen = new Set<string>();
  titles.forEach((r) => {
    const key = r.revenda + "|" + r.titulo;
    if (seen.has(key) && r.titulo) {
      alerts.push({
        level: "high",
        text: `Título duplicado: ${r.titulo} aparece mais de uma vez em ${r.revenda}.`,
      });
    }
    seen.add(key);
  });

  const groups: Record<string, { count: number; total: number }> = {};
  titles.forEach((r) => {
    const st = statusOf(r);
    groups[st] = groups[st] || { count: 0, total: 0 };
    groups[st].count += 1;
    groups[st].total += pendingValue(r) || r.valor;
  });
  const labelMap = {
    pendente: "Pendente (não vencido)",
    vencido: "Vencido",
    pago: "Recebido",
  } as const;

  const totalValor = titles.reduce((s, r) => s + r.valor, 0);
  const totalLiquido = titles.reduce((s, r) => s + r.valorLiquido, 0);
  const totalTarifas = titles.reduce((s, r) => s + r.tarifaVenda + r.tarifaEnvio, 0);
  const canceladas = titles.filter(isVendaCancelada);
  const totalCancelado = canceladas.reduce((s, r) => s + valorCancelado(r), 0);

  return (
    <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
      <section className="dashboard-panel rounded-xl border border-line bg-panel px-5 py-5 lg:col-span-7">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-medium text-cream">Ranking — revenda com mais pendências</h2>
          <span className="rounded-full border border-line bg-panel-2 px-2 py-1 text-[10px] uppercase tracking-wider text-muted">Valor pendente</span>
        </header>
        <div className="space-y-3">
          {ranking.map((a, i) => (
            <div key={a.revenda} className="flex items-center gap-2.5 text-[12.5px]">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-panel-2 font-mono text-[10px] text-muted">{String(i + 1).padStart(2, "0")}</span>
              <span className="w-[150px] shrink-0 truncate text-cream" title={a.revenda}>
                {a.revenda}
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-panel-2">
                <span
                  className="block h-full rounded-full bg-gradient-to-r from-gold-soft to-gold transition-all"
                  style={{ width: `${((a.total / max) * 100).toFixed(0)}%` }}
                />
              </span>
              <span className="w-[84px] shrink-0 text-right font-mono text-xs tabular-nums text-muted">
                {fmtBRL(a.total)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-panel rounded-xl border border-line bg-panel px-5 py-5 lg:col-span-5">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-medium text-cream">Alertas e inconsistências</h2>
          <span className="rounded-full border border-danger/30 bg-danger/10 px-2 py-1 text-[10px] uppercase tracking-wider text-danger">
            {alerts.length ? `${alerts.length} identificados` : "nenhum encontrado"}
          </span>
        </header>
        {alerts.length ? (
          alerts.slice(0, 12).map((a, i) => (
            <div key={i} className="flex gap-2.5 border-b border-line py-2.5 text-[12.5px] leading-relaxed last:border-0">
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${a.level === "high" ? "bg-danger" : "bg-gold"}`}
              />
              <span>
                <b className="font-semibold text-cream">{a.text.split(" — ")[0]}</b>
                {a.text.includes(" — ") ? ` — ${a.text.split(" — ").slice(1).join(" — ")}` : ""}
              </span>
            </div>
          ))
        ) : (
          <p className="text-[12.5px] text-muted">Nenhuma inconsistência identificada nos dados atuais.</p>
        )}
      </section>

      <section className="dashboard-panel rounded-xl border border-line bg-panel px-5 py-5 lg:col-span-5">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-medium text-cream">Por situação</h2>
          <span className="text-xs text-muted">Quantidade e valor</span>
        </header>
        {(["vencido", "pendente", "pago"] as const)
          .filter((k) => groups[k])
          .map((k) => (
            <div key={k} className="flex items-center justify-between border-b border-line py-2.5 text-[13px] last:border-0">
              <span className="text-cream">
                {labelMap[k]} ({groups[k].count})
              </span>
              <span className="font-mono text-[12.5px] tabular-nums text-gold">{fmtBRL(groups[k].total)}</span>
            </div>
          ))}
      </section>

      <section className="dashboard-panel rounded-xl border border-line bg-panel px-5 py-5 lg:col-span-7">
        <header className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-[19px] font-medium text-cream">Resumo geral</h2>
          <span className="text-xs text-muted">Todos os títulos</span>
        </header>
        {[
          { label: "Valor bruto total das vendas", value: fmtBRL(totalValor), tone: "text-muted" },
          { label: "Valor líquido total (após despesas)", value: fmtBRL(totalLiquido), tone: "text-sage" },
          { label: "Total pago em tarifas (venda + envio)", value: fmtBRL(totalTarifas), tone: "text-danger" },
          { label: "Vendas canceladas", value: `${canceladas.length} · ${fmtBRL(totalCancelado)}`, tone: "text-danger" },
        ].map((s) => (
          <div key={s.label} className="flex items-center justify-between border-b border-line py-2.5 text-[13px] last:border-0">
            <span>{s.label}</span>
            <span className={`font-mono text-sm font-semibold tabular-nums ${s.tone}`}>{s.value}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function sumBy(rows: CrTitle[]) {
  return {
    valor: rows.reduce((s, r) => s + r.valor, 0),
    tarifaVenda: rows.reduce((s, r) => s + r.tarifaVenda, 0),
    tarifaEnvio: rows.reduce((s, r) => s + r.tarifaEnvio, 0),
    despesaTotal: rows.reduce((s, r) => s + r.despesaTotal, 0),
    freteComprador: rows.reduce((s, r) => s + r.freteComprador, 0),
    descontosBonus: rows.reduce((s, r) => s + r.descontosBonus, 0),
    valorLiquido: rows.reduce((s, r) => s + r.valorLiquido, 0),
  };
}

export function TotaisPorRevenda({ titles }: { titles: CrTitle[] }) {
  const revendas = [...new Set(titles.map((r) => r.revenda))].sort();
  return (
    <div className="mb-8">
      <header className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-display text-[19px] font-medium text-cream">Totais por revenda</h2>
        <span className="text-xs text-muted">Tarifas, despesas e valor líquido de cada revenda</span>
      </header>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {revendas.map((rv) => {
          const rows = titles.filter((r) => r.revenda === rv);
          const t = sumBy(rows);
          return (
            <section key={rv} className="rounded-lg border border-line bg-panel px-5 py-5">
              <header className="mb-2 flex items-baseline justify-between">
                <h3 className="font-display text-base font-medium text-cream">{rv}</h3>
                <span className="text-xs text-muted">{rows.length} títulos</span>
              </header>
              {[
                ["Valor Bruto", t.valor, "text-muted"],
                ["Tarifa Venda", t.tarifaVenda, "text-danger"],
                ["Tarifa Envio", t.tarifaEnvio, "text-danger"],
                ["Total Despesas", t.despesaTotal, "text-danger"],
                ["Frete pago Comprador", t.freteComprador, "text-muted"],
                ["Descontos e Bônus", t.descontosBonus, "text-muted"],
                ["Valor Líquido", t.valorLiquido, "text-sage"],
              ].map(([label, val, tone]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between border-b border-line py-2.5 text-[13px] last:border-0"
                >
                  <span>{label}</span>
                  <span className={`font-mono text-sm font-semibold tabular-nums ${tone}`}>
                    {fmtBRL(Number(val))}
                  </span>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

export function TotaisConsolidados({ titles }: { titles: CrTitle[] }) {
  const t = sumBy(titles);
  const pct = (v: number) => (t.valor > 0 ? ((v / t.valor) * 100).toFixed(1) + "% do valor bruto" : "");
  const cards = [
    { label: "Tarifa Venda 12 a 17%", value: fmtBRL(t.tarifaVenda), delta: pct(t.tarifaVenda), tone: "up" as const },
    { label: "Tarifa Envio", value: fmtBRL(t.tarifaEnvio), delta: pct(t.tarifaEnvio), tone: "up" as const },
    { label: "Total Despesas", value: fmtBRL(t.despesaTotal), delta: pct(t.despesaTotal), tone: "up" as const },
    { label: "Frete pago Comprador", value: fmtBRL(t.freteComprador), delta: pct(t.freteComprador) },
    { label: "Descontos e Bônus", value: fmtBRL(t.descontosBonus), delta: pct(t.descontosBonus) },
    { label: "Valor Líquido", value: fmtBRL(t.valorLiquido), delta: pct(t.valorLiquido), tone: "down" as const },
  ];
  return (
    <div className="mb-8">
      <header className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-display text-[19px] font-medium text-cream">Totais consolidados — todas as revendas</h2>
        <span className="text-xs text-muted">Soma de todas as revendas juntas</span>
      </header>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>
    </div>
  );
}

export function DemonstrativoTable({ titles }: { titles: CrTitle[] }) {
  const revendas = [...new Set(titles.map((r) => r.revenda))].sort();
  const linhas = revendas.map((rv) => ({ revenda: rv, ...sumBy(titles.filter((r) => r.revenda === rv)) }));
  const total = sumBy(titles);
  const calc = total.valor - total.tarifaVenda - total.tarifaEnvio - total.freteComprador - total.descontosBonus;
  const diff = Math.abs(calc - total.valorLiquido);

  return (
    <div className="mb-8">
      <header className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[19px] font-medium text-cream">Comparativo em tabela</h2>
        <span className={`text-xs ${diff > 1 ? "text-danger" : "text-muted"}`}>
          {diff > 1
            ? `Atenção: Valor bruto − despesas informadas (${fmtBRL(calc)}) difere do Valor Líquido somado (${fmtBRL(total.valorLiquido)}) em ${fmtBRL(diff)}.`
            : "Valor bruto menos despesas confere com o Valor Líquido somado na planilha."}
        </span>
      </header>
      <div className="overflow-hidden rounded-lg bg-ledger">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse font-mono text-xs text-ledger-ink">
            <thead>
              <tr className="bg-ledger-head">
                {["Revenda", "Valor Bruto", "Tarifa Venda", "Tarifa Envio", "Total Despesas", "Frete Comprador", "Descontos e Bônus", "Valor Líquido"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`whitespace-nowrap px-3 py-2.5 font-semibold ${i === 0 ? "text-left font-sans" : "text-right"}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.revenda} className="hover:bg-ledger-hover">
                  <td className="px-3 py-2.5 text-left font-sans">{l.revenda}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(l.valor)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(l.tarifaVenda)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(l.tarifaEnvio)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(l.despesaTotal)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(l.freteComprador)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(l.descontosBonus)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(l.valorLiquido)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gold-soft font-semibold">
                <td className="px-3 py-2.5 text-left font-sans">TOTAL CONSOLIDADO</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(total.valor)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(total.tarifaVenda)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(total.tarifaEnvio)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(total.despesaTotal)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(total.freteComprador)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(total.descontosBonus)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtBRL(total.valorLiquido)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function CanceladasPanel({
  titles,
  onAsk,
}: {
  titles: CrTitle[];
  onAsk: (title: CrTitle) => void;
}) {
  const rows = titles.filter(isVendaCancelada);
  const total = rows.reduce((s, r) => s + valorCancelado(r), 0);
  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Vendas canceladas"
          value={rows.length}
          delta="linhas preenchidas na coluna Venda Cancelada"
        />
        <Kpi
          label="Valor cancelado"
          value={fmtBRL(total)}
          delta="soma da coluna Venda Cancelada"
          tone="up"
        />
      </div>
      <TitlesTable
        titles={rows}
        heading="Vendas canceladas"
        emptyLabel="Nenhuma venda cancelada na planilha."
        showCancelado
        onAsk={onAsk}
      />
    </>
  );
}
