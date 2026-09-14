import { useState, useSyncExternalStore } from "react";
import { signOut, authEnabled } from "@/lib/auth/client";
import { hasGateSessionMarker } from "@/lib/auth/gate-session-marker";
import { useCurrentUser, useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";

const subscribeToNothing = () => () => {};
const noGateOnServer = () => false;

export function AccountChip({ className }: { className?: string }) {
  const { isPending } = useCurrentUserState();
  const user = useCurrentUser();
  const [signingOut, setSigningOut] = useState(false);
  const gateSession = useSyncExternalStore(
    subscribeToNothing,
    hasGateSessionMarker,
    noGateOnServer,
  );

  if (isPending) {
    return <div className={cn("h-8 w-36 animate-pulse rounded-md bg-panel", className)} />;
  }
  if (!user) return null;

  const label = user.displayName ?? user.primaryEmail ?? "Conta";

  return (
    <div className={cn("flex items-center gap-3 text-xs text-cream", className)}>
      <span className="flex min-w-0 items-center gap-2">
        {user.profileImageUrl ? (
          <img
            src={user.profileImageUrl}
            alt=""
            className="size-7 shrink-0 rounded-full object-cover outline outline-1 -outline-offset-1 outline-cream/10"
          />
        ) : (
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-panel-2 text-[11px] font-medium">
            {label.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="max-w-[140px] truncate sm:max-w-[180px]">{label}</span>
      </span>
      {authEnabled && !gateSession ? (
        <button
          type="button"
          disabled={signingOut}
          className="shrink-0 text-[11px] text-muted underline-offset-2 hover:text-cream hover:underline disabled:opacity-60"
          onClick={() => {
            setSigningOut(true);
            void signOut().catch(() => setSigningOut(false));
          }}
        >
          {signingOut ? "Saindo…" : "Sair"}
        </button>
      ) : null}
    </div>
  );
}
