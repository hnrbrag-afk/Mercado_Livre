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

function Card({
  label,
  value,
  note,
  names,
  tone,
}: {
  label: string;
  value?: string | number;
  note?: string;
  names?: string[];
  tone?: "danger" | "sage" | "";
}) {
  return (
    <article className="report-card">
      <div className="report-card-label">{label}</div>
      {names ? (
        <div className="report-card-names">{names.join(", ")}</div>
      ) : (
        <>
          <div className={`report-card-value${tone ? ` is-${tone}` : ""}`}>{value}</div>
          {note ? <div className="report-card-note">{note}</div> : null}
        </>
      )}
    </article>
  );
}

export function ReportDocument({
  titles,
  fileMeta,
  className,
  ariaHidden,
}: {
  titles: CrTitle[];
  fileMeta: string;
  className?: string;
  ariaHidden?: boolean;
}) {
  const revendas = [...new Set(titles.map((r) => r.revenda))].sort();
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

  const ranking = revendas
    .map((rv) => ({
      revenda: rv,
      total: titles.filter((r) => r.revenda === rv && isPendente(r)).reduce((s, r) => s + pendingValue(r), 0),
    }))
    .sort((a, b) => b.total - a.total);
  const rankMax = Math.max(...ranking.map((a) => a.total), 1);

  const alerts: { level: "high" | "mid"; text: string }[] = [];
  titles.forEach((r) => {
    const dias = diasAtraso(r);
    if (isVencido(r) && dias >= 30) {
      alerts.push({
        level: "high",
        text: `${r.cliente} (${r.revenda}) — vencido há ${dias}d, ${fmtBRL(pendingValue(r))}.`,
      });
    } else if (isVencido(r)) {
      alerts.push({
        level: "mid",
        text: `${r.cliente} (${r.revenda}) — vencido há ${dias}d.`,
      });
    }
    if (isVendaCancelada(r) && isPendente(r)) {
      alerts.push({
        level: "high",
        text: `${r.cliente} (${r.revenda}) — venda cancelada com ${fmtBRL(pendingValue(r))} pendente.`,
      });
    }
  });

  const groups: Record<string, { count: number; total: number }> = {};
  titles.forEach((r) => {
    const st = statusOf(r);
    groups[st] = groups[st] || { count: 0, total: 0 };
    groups[st].count += 1;
    groups[st].total += pendingValue(r) || r.valor;
  });

  const totalValor = titles.reduce((s, r) => s + r.valor, 0);
  const totalLiquido = titles.reduce((s, r) => s + r.valorLiquido, 0);
  const totalTarifas = titles.reduce((s, r) => s + r.tarifaVenda + r.tarifaEnvio, 0);
  const canceladas = titles.filter(isVendaCancelada);
  const totalCancelado = canceladas.reduce((s, r) => s + valorCancelado(r), 0);
  const consolidado = sumBy(titles);
  const pct = (v: number) => (consolidado.valor > 0 ? `${((v / consolidado.valor) * 100).toFixed(1)}% do bruto` : "");
  const emitted = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`report-doc ${className ?? ""}`.trim()} aria-hidden={ariaHidden}>
      <header className="report-head">
        <div className="report-meta">
          <div>{emitted}</div>
          <div>{fileMeta}</div>
        </div>
      </header>

      <section className="report-kpis">
        <Card label="Revendas" names={revendas} />
        <Card label="Títulos a Receber" value={pendentes.length} note={`de ${titles.length} títulos`} />
        <Card label="Valor a Receber" value={fmtBRL(totalPendente)} note={`${pendentes.length} em aberto`} tone="danger" />
        <Card
          label="Vendas canceladas"
          value={canceladas.length}
          note={fmtBRL(totalCancelado)}
          tone="danger"
        />
      </section>
      <section className="report-kpis report-kpis-5">
        <Card label="Vencidos" value={vencidos.length} note={fmtBRL(totalVencido)} tone="danger" />
        <Card
          label="Maior atraso"
          value={`${maiorAtraso} dias`}
          note={vencidos.length ? "entre os vencidos" : "nenhum vencido"}
        />
        <Card label="Tarifa média" value={`${tarifaMedia.toFixed(1)}%`} note="sobre o valor bruto" />
        <Card
          label="Maior pendência"
          value={maiorCliente ? fmtBRL(pendingValue(maiorCliente)) : "—"}
          note={maiorCliente ? maiorCliente.cliente : ""}
        />
        <Card label="Na base" value={titles.length} note={`${titles.length - pendentes.length} recebidos`} />
      </section>

      <div className="report-grid">
        <article className="report-block">
          <div className="report-card-label">Ranking de pendências</div>
          <ul className="report-rank">
            {ranking.map((a, i) => (
              <li key={a.revenda}>
                <span className="report-rank-i">{i + 1}</span>
                <span className="report-rank-name">{a.revenda}</span>
                <span className="report-bar">
                  <span style={{ width: `${((a.total / rankMax) * 100).toFixed(0)}%` }} />
                </span>
                <span className="report-rank-val">{fmtBRL(a.total)}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="report-block">
          <div className="report-card-label">Alertas</div>
          {alerts.length ? (
            <ul className="report-alerts">
              {alerts.slice(0, 6).map((a, i) => (
                <li key={i} className={a.level === "high" ? "is-high" : "is-mid"}>
                  {a.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="report-empty">Nenhuma inconsistência identificada.</p>
          )}
        </article>

        <article className="report-block">
          <div className="report-card-label">Por situação</div>
          <ul className="report-rows">
            {(["vencido", "pendente", "pago"] as const)
              .filter((k) => groups[k])
              .map((k) => (
                <li key={k}>
                  <span>
                    {k === "vencido" ? "Vencido" : k === "pendente" ? "Pendente" : "Recebido"} ({groups[k].count})
                  </span>
                  <strong>{fmtBRL(groups[k].total)}</strong>
                </li>
              ))}
          </ul>
        </article>

        <article className="report-block">
          <div className="report-card-label">Resumo geral</div>
          <ul className="report-rows">
            <li>
              <span>Valor bruto</span>
              <strong>{fmtBRL(totalValor)}</strong>
            </li>
            <li>
              <span>Valor líquido</span>
              <strong className="is-sage">{fmtBRL(totalLiquido)}</strong>
            </li>
            <li>
              <span>Tarifas</span>
              <strong className="is-danger">{fmtBRL(totalTarifas)}</strong>
            </li>
            <li>
              <span>Vendas canceladas</span>
              <strong className="is-danger">
                {canceladas.length} · {fmtBRL(totalCancelado)}
              </strong>
            </li>
          </ul>
        </article>
      </div>

      <section className="report-revendas">
        {revendas.map((rv) => {
          const rows = titles.filter((r) => r.revenda === rv);
          const t = sumBy(rows);
          return (
            <article key={rv} className="report-block">
              <div className="report-revenda-name">
                {rv}
                <span>{rows.length} títulos</span>
              </div>
              <ul className="report-rows tight">
                <li>
                  <span>Bruto</span>
                  <strong>{fmtBRL(t.valor)}</strong>
                </li>
                <li>
                  <span>Tarifa venda</span>
                  <strong className="is-danger">{fmtBRL(t.tarifaVenda)}</strong>
                </li>
                <li>
                  <span>Tarifa envio</span>
                  <strong className="is-danger">{fmtBRL(t.tarifaEnvio)}</strong>
                </li>
                <li>
                  <span>Despesas</span>
                  <strong className="is-danger">{fmtBRL(t.despesaTotal)}</strong>
                </li>
                <li>
                  <span>Frete comprador</span>
                  <strong>{fmtBRL(t.freteComprador)}</strong>
                </li>
                <li>
                  <span>Descontos</span>
                  <strong>{fmtBRL(t.descontosBonus)}</strong>
                </li>
                <li>
                  <span>Líquido</span>
                  <strong className="is-sage">{fmtBRL(t.valorLiquido)}</strong>
                </li>
              </ul>
            </article>
          );
        })}
      </section>

      <section className="report-kpis report-kpis-6">
        <Card label="Tarifa venda" value={fmtBRL(consolidado.tarifaVenda)} note={pct(consolidado.tarifaVenda)} tone="danger" />
        <Card label="Tarifa envio" value={fmtBRL(consolidado.tarifaEnvio)} note={pct(consolidado.tarifaEnvio)} tone="danger" />
        <Card label="Despesas" value={fmtBRL(consolidado.despesaTotal)} note={pct(consolidado.despesaTotal)} tone="danger" />
        <Card label="Frete comprador" value={fmtBRL(consolidado.freteComprador)} note={pct(consolidado.freteComprador)} />
        <Card label="Descontos e bônus" value={fmtBRL(consolidado.descontosBonus)} note={pct(consolidado.descontosBonus)} />
        <Card label="Valor líquido" value={fmtBRL(consolidado.valorLiquido)} note={pct(consolidado.valorLiquido)} tone="sage" />
      </section>
    </div>
  );
}
