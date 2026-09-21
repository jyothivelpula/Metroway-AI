import type { ReactNode } from "react";

type Tone = "info" | "warning" | "danger";

const TONE: Record<Tone, string> = {
  info: "border-line bg-metro-light text-ink",
  warning: "border-line bg-surface-2 text-ink",
  danger: "border-lost/30 bg-lost/10 text-ink",
};

export function Banner({
  children,
  title,
  tone = "info",
}: {
  children: ReactNode;
  title?: string;
  tone?: Tone;
}) {
  return (
    <div className={`rounded-[1.25rem] border px-4 py-3 ${TONE[tone]}`} role="status">
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={`text-sm leading-relaxed ${title ? "mt-1" : ""}`.trim()}>{children}</div>
    </div>
  );
}
