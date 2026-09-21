import type { ReactNode } from "react";

export function Pill({
  children,
  active = false,
  className = "",
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <span className={`mw-pill ${active ? "mw-pill-active" : ""} ${className}`.trim()}>{children}</span>
  );
}
