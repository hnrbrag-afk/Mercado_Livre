import { createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Ban,
  Clock,
  FileText,
  LayoutDashboard,
  Menu,
  Store,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AccountChip } from "@/components/account-chip";
import { ChatAssistant } from "@/components/chat-assistant";
import {
  CanceladasPanel,
  DemonstrativoTable,
  InsightsRow,
  KpiRow,
  TotaisConsolidados,
  TotaisPorRevenda,
} from "@/components/dashboard-panels";
import { ReportDocument } from "@/components/report-document";
import { HistoricoTable, TitlesTable } from "@/components/titles-table";
import { Button } from "@/components/ui/button";
import { listImports, listTitles, replaceTitles } from "@/lib/server/crs";
import type { CrTitle } from "@/lib/crs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: Home,
});

type View = "dashboard" | "revendas" | "vencidos" | "canceladas" | "historico";

function Home() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 8_000, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <Gate />
    </QueryClientProvider>
  );
}

const NAV: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "revendas", label: "Revendas", icon: Store },
  { id: "vencidos", label: "Vencidos", icon: Clock },
  { id: "canceladas", label: "Canceladas", icon: Ban },
  { id: "historico", label: "Histórico", icon: Archive },
];

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink text-cream">
      <div className="text-center">
        <div className="font-display text-2xl font-semibold">
          Mercado <span className="italic text-gold">Livre</span>
        </div>
        <p className="mt-2 text-sm text-muted">Carregando o painel…</p>
      </div>
    </div>
  );
}

function Gate() {
  return <AppShell />;
}

function AppShell() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("dashboard");
  const [chatOpen, setChatOpen] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [importModal, setImportModal] = useState<{ title: string; body: string; extra?: string } | null>(
    null,
  );
  const [reportOpen, setReportOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const titlesQuery = useQuery({ queryKey: ["titles"], queryFn: () => listTitles() });
  const importsQuery = useQuery({ queryKey: ["imports"], queryFn: () => listImports() });
  const titles = titlesQuery.data ?? [];
  const imports = importsQuery.data ?? [];

  const replaceMut = useMutation({
    mutationFn: (payload: { filename: string; titles: Omit<CrTitle, "id">[] }) =>
      replaceTitles({ data: payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["titles"] });
      await queryClient.invalidateQueries({ queryKey: ["imports"] });
    },
  });

  const lastImport = imports[0];
  const fileMeta = lastImport
    ? `${lastImport.filename} — ${lastImport.titleCount} títulos · ${lastImport.revendaCount} revendas`
    : "Dados de exemplo · todas as revendas — Mercado Pago";

  async function onUpload(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const { parseWorkbook, REQUIRED_COLS } = await import("@/lib/excel");
      const { titles: parsed, unmatchedSheets } = parseWorkbook(buf);
      if (parsed.length === 0) {
        setImportModal({
          title: "Não consegui reconhecer os títulos nesta planilha",
          body: `Nenhuma aba do arquivo “${file.name}” tinha as colunas mínimas esperadas (Nome/Cliente, Valor, Vencimento). Os dados atuais foram mantidos.`,
          extra: unmatchedSheets.length
            ? `Abas verificadas sem sucesso: ${unmatchedSheets.join(", ")}.\n\nColunas mínimas: ${REQUIRED_COLS.join(" · ")}`
            : `Colunas mínimas: ${REQUIRED_COLS.join(" · ")}`,
        });
        return;
      }
      await replaceMut.mutateAsync({ filename: file.name, titles: parsed });
      setImportModal({
        title: "Planilha importada",
        body: `“${file.name}”: ${parsed.length} títulos em ${new Set(parsed.map((t) => t.revenda)).size} revendas. Dashboard e tabela atualizados.`,
        extra: unmatchedSheets.length
          ? `As abas ${unmatchedSheets.join(", ")} não foram reconhecidas e ficaram de fora.`
          : undefined,
      });
    } catch (err) {
      setImportModal({
        title: "Erro ao ler o arquivo",
        body: err instanceof Error ? err.message : "Falha desconhecida ao importar.",
      });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function askAbout(r: CrTitle) {
    setSeed(
      `Me fale sobre o título ${r.titulo} de ${r.cliente} (${r.revenda}): situação, atraso, valor e se há alguma inconsistência.`,
    );
    setChatOpen(true);
  }

  return (
    <>
    <div className="screen-only flex min-h-dvh bg-ink text-cream">
      <aside className="no-print hidden w-56 shrink-0 flex-col gap-9 border-r border-line bg-ink-2 px-4 py-7 lg:flex">
        <div className="px-2 font-display text-[22px] font-semibold">
          Mercado <span className="italic text-gold">Livre</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={cn(
                  "flex h-11 items-center gap-2.5 rounded-md px-3 text-sm",
                  active
                    ? "border-l-2 border-gold bg-panel-2 pl-2.5 text-cream"
                    : "text-muted hover:bg-panel hover:text-cream",
                )}
              >
                <Icon className="size-4" strokeWidth={1.75} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-line pt-3.5 text-xs leading-relaxed text-muted">
          Importe a planilha de CRs do Mercado Pago (.xls/.xlsx, uma aba por revenda) para substituir os dados de exemplo.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print flex flex-wrap items-center gap-3 border-b border-line px-5 py-3 lg:px-10 lg:py-4">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-md border border-line bg-panel lg:hidden"
            onClick={() => setMobileNav(true)}
            aria-label="Abrir menu"
          >
            <Menu className="size-5" />
          </button>
          <AccountChip className="ml-auto lg:order-last lg:ml-0 lg:border-l lg:border-line lg:pl-4" />
          <div className="flex flex-wrap items-center gap-2 max-lg:w-full lg:ml-auto">
            <Button size="sm" onClick={() => fileRef.current?.click()} disabled={replaceMut.isPending}>
              <Upload className="size-3.5" />
              {replaceMut.isPending ? "Importando…" : "Importar planilha"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onUpload(f);
              }}
            />
            <Button size="sm" onClick={() => setReportOpen(true)}>
              <FileText className="size-3.5" />
              Emitir relatório
            </Button>
            <Button variant="gold" size="sm" onClick={() => setChatOpen(true)}>
              Perguntar à IA
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 pb-24 lg:px-10 lg:pb-14">
          {titlesQuery.isPending ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-lg bg-panel" />
              ))}
            </div>
          ) : titlesQuery.isError ? (
            <p className="text-sm text-danger">
              Não foi possível carregar os títulos.
              {titlesQuery.error instanceof Error ? ` ${titlesQuery.error.message}` : ""}
            </p>
          ) : (
            <>
              {view === "dashboard" ? (
                <>
                  <KpiRow titles={titles} />
                  <InsightsRow titles={titles} />
                  <TotaisPorRevenda titles={titles} />
                  <TotaisConsolidados titles={titles} />
                  <DemonstrativoTable titles={titles} />
                  <TitlesTable titles={titles} onAsk={askAbout} />
                </>
              ) : null}
              {view === "revendas" ? (
                <>
                  <TotaisPorRevenda titles={titles} />
                  <DemonstrativoTable titles={titles} />
                  <TitlesTable titles={titles} onAsk={askAbout} />
                </>
              ) : null}
              {view === "vencidos" ? (
                <TitlesTable titles={titles} forceStatus="vencido" onAsk={askAbout} />
              ) : null}
              {view === "canceladas" ? <CanceladasPanel titles={titles} onAsk={askAbout} /> : null}
              {view === "historico" ? <HistoricoTable records={imports} /> : null}
            </>
          )}
        </div>
      </div>

      <nav className="no-print fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-ink-2 lg:hidden">
        {NAV.map((item) => {
          const Icon = item.icon;
          const active = view === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setView(item.id)}
              className={cn(
                "flex h-14 flex-col items-center justify-center gap-0.5 text-[11px]",
                active ? "text-gold" : "text-muted",
              )}
            >
              <Icon className="size-4" strokeWidth={1.75} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {mobileNav ? (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink/50"
            aria-label="Fechar menu"
            onClick={() => setMobileNav(false)}
          />
          <aside className="relative flex h-full w-64 flex-col gap-8 border-r border-line bg-ink-2 px-4 py-7">
            <div className="flex items-center justify-between px-2">
              <div className="font-display text-xl font-semibold">
                Mercado <span className="italic text-gold">Livre</span>
              </div>
              <button
                type="button"
                className="grid size-11 place-items-center text-muted"
                onClick={() => setMobileNav(false)}
              >
                <X className="size-5" />
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <ChatAssistant
        open={chatOpen}
        onOpenChange={setChatOpen}
        seed={seed}
        onSeedConsumed={() => setSeed(null)}
      />

      {importModal ? (
        <Modal onClose={() => setImportModal(null)} title={importModal.title}>
          <p className="mb-2.5 text-[13px] leading-relaxed text-cream">{importModal.body}</p>
          {importModal.extra ? (
            <p className="rounded-md border border-line bg-panel px-3 py-2.5 font-mono text-[11.5px] leading-relaxed break-words text-muted">
              {importModal.extra}
            </p>
          ) : null}
        </Modal>
      ) : null}

      {reportOpen ? (
        <div className="no-print fixed inset-0 z-[120] flex flex-col bg-ink">
          <div className="flex flex-wrap items-center justify-end gap-3 border-b border-line px-5 py-4 lg:px-8">
            <div className="flex gap-2">
              <Button size="sm" onClick={() => setReportOpen(false)}>
                Fechar
              </Button>
              <Button
                variant="gold"
                size="sm"
                onClick={() => {
                  window.print();
                }}
              >
                Imprimir
              </Button>
            </div>
          </div>
          <div className="report-preview mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto px-5 py-5 lg:px-8">
            <ReportDocument titles={titles} fileMeta={fileMeta} />
          </div>
        </div>
      ) : null}
    </div>
    <div className="print-only">
      <ReportDocument titles={titles} fileMeta={fileMeta} ariaHidden />
    </div>
    </>
  );
}

function Modal({
  title,
  children,
  onClose,
  hideDefaultAction,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  hideDefaultAction?: boolean;
}) {
  return (
    <div className="no-print fixed inset-0 z-[120] flex items-center justify-center bg-ink/50 p-4">
      <button type="button" className="absolute inset-0" aria-label="Fechar" onClick={onClose} />
      <div className="relative max-h-[80vh] w-full max-w-[520px] overflow-y-auto rounded-lg border border-line bg-ink-2 p-6">
        <h3 className="mb-2.5 font-display text-lg font-medium text-cream">{title}</h3>
        {children}
        {hideDefaultAction ? null : (
          <div className="mt-4 flex justify-end">
            <Button size="sm" variant="gold" onClick={onClose}>
              Entendi
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
