import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/login")({ component: Login });

const GOOGLE = GROK_PROVIDERS.find((p) => p.idp === "google");

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.85-.07-1.66-.21-2.44H12v4.62h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.56-5.17 3.56-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.3A7.2 7.2 0 0 1 4.9 12c0-.8.14-1.57.37-2.3V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.14 15.23 0 12 0 7.31 0 3.23 2.69 1.27 6.61l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function Login() {
  const { user } = useCurrentUserState();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" />;

  async function onGoogle() {
    if (!GOOGLE) return;
    setError("");
    setBusy(true);
    try {
      await signIn(GOOGLE.providerId, { callbackURL: "/" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível entrar com o Google.");
      setBusy(false);
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center bg-ink px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,175,55,0.08),transparent_45%)]"
      />
      <div className="relative w-full max-w-[380px] rounded-lg border border-line bg-ink-2 p-8">
        <div className="font-display text-2xl font-semibold text-cream">
          Mercado <span className="italic text-gold">Livre</span>
        </div>
        <p className="mt-1.5 mb-8 text-[13px] text-muted">
          Gestão de CRs pendentes de recebimento — Mercado Pago.
        </p>

        {authEnabled && GOOGLE ? (
          <Button
            variant="gold"
            className="w-full"
            onClick={() => void onGoogle()}
            disabled={busy}
          >
            <GoogleMark />
            {busy ? "Abrindo o Google…" : "Entrar com Google"}
          </Button>
        ) : (
          <p className="text-sm text-muted">O acesso está desativado.</p>
        )}

        {error ? <p className="mt-4 text-[13px] text-danger">{error}</p> : null}

        <p className="mt-6 border-t border-line pt-3.5 text-[11.5px] leading-relaxed text-muted">
          O acesso é feito com a sua conta Google.
        </p>
      </div>
    </main>
  );
}
