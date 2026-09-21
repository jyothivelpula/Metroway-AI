import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mw-card px-5 py-8 text-center">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {children ? <p className="mt-2 text-sm text-muted">{children}</p> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="mw-card px-5 py-8 text-center" role="status">
      <p className="text-sm font-semibold text-metro">{label}</p>
    </div>
  );
}

export function ErrorState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mw-card px-5 py-6" role="alert">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {children ? <p className="mt-2 text-sm text-muted">{children}</p> : null}
    </div>
  );
}
