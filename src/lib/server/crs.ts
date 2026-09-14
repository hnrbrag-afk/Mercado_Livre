import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import type { CrTitle, CrTitleInput, ImportRecord } from "@/lib/crs";
import { SAMPLE_TITLES } from "@/lib/sample-data";

type TitleRow = {
  id: number;
  revenda: string;
  cliente: string;
  cod_cliente: string;
  titulo: string;
  situacao: string;
  valor: number;
  saldo: number;
  emissao: string;
  vencimento: string;
  pagamento: string;
  tarifa_venda: number;
  tarifa_envio: number;
  despesa_total: number;
  frete_comprador: number;
  descontos_bonus: number;
  valor_liquido: number;
  venda_cancelada: string;
  solucao: string;
};

type ImportRow = {
  id: number;
  filename: string;
  revenda_count: number;
  title_count: number;
  created_at: string | Date;
};

const PUBLIC_WORKSPACE_ID = "public-workspace";

function n(v: unknown): number {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function mapTitle(row: TitleRow): CrTitle {
  return {
    id: n(row.id),
    revenda: row.revenda,
    cliente: row.cliente,
    codCliente: row.cod_cliente ?? "",
    titulo: row.titulo ?? "",
    situacao: row.situacao ?? "",
    valor: n(row.valor),
    saldo: n(row.saldo),
    emissao: row.emissao ?? "",
    vencimento: row.vencimento ?? "",
    pagamento: row.pagamento ?? "",
    tarifaVenda: n(row.tarifa_venda),
    tarifaEnvio: n(row.tarifa_envio),
    despesaTotal: n(row.despesa_total),
    freteComprador: n(row.frete_comprador),
    descontosBonus: n(row.descontos_bonus),
    valorLiquido: n(row.valor_liquido),
    vendaCancelada: row.venda_cancelada ?? "",
    solucao: row.solucao ?? "",
  };
}

async function insertTitle(
  sql: Awaited<ReturnType<typeof getSql>>,
  userId: string,
  t: CrTitleInput,
) {
  await sql`
    insert into titles (
      user_id, revenda, cliente, cod_cliente, titulo, situacao,
      valor, saldo, emissao, vencimento, pagamento,
      tarifa_venda, tarifa_envio, despesa_total, frete_comprador,
      descontos_bonus, valor_liquido, venda_cancelada, solucao
    ) values (
      ${userId}, ${t.revenda}, ${t.cliente}, ${t.codCliente}, ${t.titulo}, ${t.situacao},
      ${t.valor}, ${t.saldo}, ${t.emissao}, ${t.vencimento}, ${t.pagamento},
      ${t.tarifaVenda}, ${t.tarifaEnvio}, ${t.despesaTotal}, ${t.freteComprador},
      ${t.descontosBonus}, ${t.valorLiquido}, ${t.vendaCancelada}, ${t.solucao}
    )
  `;
}

export const listTitles = createServerFn({ method: "GET" })
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql<TitleRow>`
      select id, revenda, cliente, cod_cliente, titulo, situacao,
             valor, saldo, emissao, vencimento, pagamento,
             tarifa_venda, tarifa_envio, despesa_total, frete_comprador,
             descontos_bonus, valor_liquido, venda_cancelada, solucao
      from titles
      where user_id = ${PUBLIC_WORKSPACE_ID}
      order by id
    `;
    if (rows.length > 0) return rows.map(mapTitle);

    const claimed = await sql<{ user_id: string }>`
      insert into user_state (user_id, seeded)
      values (${PUBLIC_WORKSPACE_ID}, true)
      on conflict (user_id) do nothing
      returning user_id
    `;
    if (claimed.length === 0) {
      const again = await sql<TitleRow>`
        select id, revenda, cliente, cod_cliente, titulo, situacao,
               valor, saldo, emissao, vencimento, pagamento,
               tarifa_venda, tarifa_envio, despesa_total, frete_comprador,
               descontos_bonus, valor_liquido, venda_cancelada, solucao
        from titles
        where user_id = ${PUBLIC_WORKSPACE_ID}
        order by id
      `;
      return again.map(mapTitle);
    }

    const imports = await sql<{ c: number }>`
      select count(*)::int as c from imports where user_id = ${PUBLIC_WORKSPACE_ID}
    `;
    if ((imports[0]?.c ?? 0) > 0) return [];

    for (const t of SAMPLE_TITLES) {
      await insertTitle(sql, PUBLIC_WORKSPACE_ID, t);
    }
    const seeded = await sql<TitleRow>`
      select id, revenda, cliente, cod_cliente, titulo, situacao,
             valor, saldo, emissao, vencimento, pagamento,
             tarifa_venda, tarifa_envio, despesa_total, frete_comprador,
             descontos_bonus, valor_liquido, venda_cancelada, solucao
      from titles
      where user_id = ${PUBLIC_WORKSPACE_ID}
      order by id
    `;
    return seeded.map(mapTitle);
  });

export const listImports = createServerFn({ method: "GET" })
  .handler(async () => {
    const sql = await getSql();
    const rows = await sql<ImportRow>`
      select id, filename, revenda_count, title_count, created_at
      from imports
      where user_id = ${PUBLIC_WORKSPACE_ID}
      order by id desc
      limit 50
    `;
    return rows.map(
      (r): ImportRecord => ({
        id: n(r.id),
        filename: r.filename,
        revendaCount: n(r.revenda_count),
        titleCount: n(r.title_count),
        createdAt:
          typeof r.created_at === "string"
            ? r.created_at
            : r.created_at instanceof Date
              ? r.created_at.toISOString()
              : String(r.created_at),
      }),
    );
  });

const titleInputSchema = z.object({
  revenda: z.string().min(1).max(200),
  cliente: z.string().min(1).max(300),
  codCliente: z.string().max(80).default(""),
  titulo: z.string().max(80).default(""),
  situacao: z.string().max(20).default(""),
  valor: z.number(),
  saldo: z.number(),
  emissao: z.string().max(32).default(""),
  vencimento: z.string().max(32).default(""),
  pagamento: z.string().max(32).default(""),
  tarifaVenda: z.number(),
  tarifaEnvio: z.number(),
  despesaTotal: z.number(),
  freteComprador: z.number(),
  descontosBonus: z.number(),
  valorLiquido: z.number(),
  vendaCancelada: z.string().max(80).default(""),
  solucao: z.string().max(2000).default(""),
});

const replaceSchema = z.object({
  filename: z.string().min(1).max(240),
  titles: z.array(titleInputSchema).min(1).max(8000),
});

export const replaceTitles = createServerFn({ method: "POST" })
  .validator((input: unknown) => replaceSchema.parse(input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from titles where user_id = ${PUBLIC_WORKSPACE_ID}`;
    for (const t of data.titles) {
      await insertTitle(sql, PUBLIC_WORKSPACE_ID, t);
    }
    const revendas = new Set(data.titles.map((t) => t.revenda)).size;
    await sql`
      insert into imports (user_id, filename, revenda_count, title_count)
      values (${PUBLIC_WORKSPACE_ID}, ${data.filename}, ${revendas}, ${data.titles.length})
    `;
    return { count: data.titles.length, revendas };
  });

const askSchema = z.object({
  question: z.string().trim().min(1).max(800),
  today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const askAssistant = createServerFn({ method: "POST" })
  .validator((input: unknown) => askSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "A IA não está disponível neste ambiente." };
    }

    const sql = await getSql();
    const rows = await sql<TitleRow>`
      select id, revenda, cliente, cod_cliente, titulo, situacao,
             valor, saldo, emissao, vencimento, pagamento,
             tarifa_venda, tarifa_envio, despesa_total, frete_comprador,
             descontos_bonus, valor_liquido, venda_cancelada, solucao
      from titles
      where user_id = ${PUBLIC_WORKSPACE_ID}
      order by id
      limit 400
    `;
    const titles = rows.map(mapTitle);

    const { dataAsCsv, startOfToday } = await import("@/lib/crs");
    const today = startOfToday(data.today);
    let csv = dataAsCsv(titles, today);
    if (csv.length > 24000) {
      csv = csv.slice(0, 24000) + "\n… (tabela truncada)";
    }

    const system = `Você é o assistente de dados do Mercado Livre, especializado em contas a receber (CRs) de vendas via Mercado Pago, para uma empresa com várias revendas.
Responda SOMENTE em português, de forma direta e objetiva. Baseie-se EXCLUSIVAMENTE na tabela abaixo (CSV, separador ';') — nunca invente clientes, revendas ou valores fora dela. "Status" já indica se o título está pendente, vencido ou recebido, e "DiasAtraso" já foi calculado a partir de hoje (${data.today}). Se a pergunta não puder ser respondida com esses dados, diga isso claramente.

TABELA:
${csv}`;

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        max_tokens: 700,
        messages: [
          { role: "system", content: system },
          { role: "user", content: data.question },
        ],
      }),
    });
    if (!res.ok) {
      return { ok: false as const, error: `Não consegui consultar a IA agora (${res.status}).` };
    }
    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) return { ok: false as const, error: "A IA não gerou uma resposta." };
    return { ok: true as const, text };
  });
