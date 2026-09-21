import type { ReactNode } from "react";

export function PageHeading({
  children,
  kicker,
  description,
}: {
  children: ReactNode;
  kicker?: string;
  description?: ReactNode;
}) {
  return (
    <header className="max-w-2xl">
      {kicker ? (
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-metro">{kicker}</p>
      ) : null}
      <h1 className={`font-display text-4xl leading-tight text-ink ${kicker ? "mt-2" : ""}`.trim()}>{children}</h1>
      {description ? <div className="mt-3 text-base leading-relaxed text-muted">{description}</div> : null}
    </header>
  );
}
