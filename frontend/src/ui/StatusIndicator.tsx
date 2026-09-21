type Tone = "live" | "ready" | "warn" | "idle";

const TONE: Record<Tone, string> = {
  live: "bg-[#0077c8]",
  ready: "bg-metro",
  warn: "bg-lost",
  idle: "bg-muted",
};

export function StatusIndicator({
  label,
  tone = "idle",
}: {
  label: string;
  tone?: Tone;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-ink">
      <span className={`h-2.5 w-2.5 rounded-full ${TONE[tone]}`} aria-hidden="true" />
      {label}
    </span>
  );
}
