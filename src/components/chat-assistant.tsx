import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { askAssistant } from "@/lib/server/crs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "ai"; text: string; loading?: boolean };

function AiText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        const bold = part.match(/^\*\*(.+)\*\*$/);
        if (bold) return <strong key={i}>{bold[1]}</strong>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

const SUGGESTIONS = [
  "Qual revenda tem mais valor pendente?",
  "Quais títulos estão vencidos há mais tempo?",
  "Há inconsistências nos dados?",
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function ChatAssistant({
  open,
  onOpenChange,
  seed,
  onSeedConsumed,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  seed: string | null;
  onSeedConsumed: () => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "ai",
      text: "Olá. Posso responder sobre os CRs pendentes de recebimento — por revenda, por cliente, atrasos, valores líquidos. Eu só respondo com base nos dados reais carregados.",
    },
  ]);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [messages, open]);

  useEffect(() => {
    if (open && seed) {
      setInput(seed);
      onSeedConsumed();
    }
  }, [open, seed, onSeedConsumed]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q) return;
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", text: q },
      { role: "ai", text: "Consultando os dados…", loading: true },
    ]);
    try {
      const res = await askAssistant({ data: { question: q, today: todayIso() } });
      const reply = res.ok ? res.text : res.error;
      setMessages((m) => {
        const next = m.slice();
        const last = next[next.length - 1];
        if (last?.loading) next[next.length - 1] = { role: "ai", text: reply };
        else next.push({ role: "ai", text: reply });
        return next;
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao consultar a IA.";
      setMessages((m) => {
        const next = m.slice();
        const last = next[next.length - 1];
        if (last?.loading) next[next.length - 1] = { role: "ai", text: msg };
        else next.push({ role: "ai", text: msg });
        return next;
      });
    }
  }

  return (
    <>
      {open ? null : (
      <button
        type="button"
        title="Perguntar à IA"
        onClick={() => onOpenChange(true)}
        className="no-print fixed right-6 z-50 grid size-14 place-items-center rounded-full bg-gold text-ink shadow-[var(--shadow-gold)] max-lg:bottom-20 lg:bottom-7"
      >
        <MessageSquare className="size-5" strokeWidth={2} />
      </button>
      )}

      {open ? (
        <button
          type="button"
          aria-label="Fechar assistente"
          className="no-print fixed inset-0 z-50 bg-ink/40"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <aside
        className={cn(
          "no-print fixed top-0 right-0 z-[60] flex h-dvh w-full max-w-[400px] flex-col border-l border-line bg-ink-2 transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!open}
      >
        <div className="flex items-baseline justify-between border-b border-line px-5 py-5">
          <h3 className="font-display text-lg font-medium text-cream">Assistente de dados</h3>
          <button
            type="button"
            className="grid size-11 place-items-center text-muted hover:text-cream"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
          >
            <X className="size-5" />
          </button>
        </div>
        <div ref={bodyRef} className="flex flex-1 flex-col gap-3.5 overflow-y-auto px-5 py-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[92%] whitespace-pre-wrap text-[13.5px] leading-relaxed",
                m.role === "user"
                  ? "self-end rounded-[10px_10px_2px_10px] bg-panel-2 px-3.5 py-2.5 text-cream"
                  : "self-start rounded-[10px_10px_10px_2px] border border-line bg-panel px-3.5 py-2.5 text-cream",
                m.loading && "italic text-muted",
              )}
            >
              {m.role === "ai" ? <AiText text={m.text} /> : m.text}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5 px-5 pb-3">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void send(s)}
              className="rounded-full border border-line bg-panel px-2.5 py-1.5 text-[11.5px] text-muted hover:border-gold-soft hover:text-cream"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2 border-t border-line p-4">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte sobre os CRs…"
            className="h-11"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button variant="gold" size="icon" onClick={() => void send()} aria-label="Enviar">
            <Send className="size-4" />
          </Button>
        </div>
      </aside>
    </>
  );
}
