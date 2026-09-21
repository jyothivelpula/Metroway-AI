export function NavStep({
  current,
  total,
  title,
  detail,
  remaining,
}: {
  current: number;
  total: number;
  title: string;
  detail?: string;
  remaining?: string;
}) {
  return (
    <div className="mw-card p-5">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted">
        Step {current} of {total}
      </p>
      <h2 className="mt-3 font-display text-3xl leading-tight text-ink">{title}</h2>
      {detail ? <p className="mt-2 text-base text-ink">{detail}</p> : null}
      {remaining ? <p className="mt-3 font-display text-2xl text-metro-deep">{remaining}</p> : null}
    </div>
  );
}
