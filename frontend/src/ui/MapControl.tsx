import type { ButtonHTMLAttributes, ReactNode } from "react";

export function MapControlStack({ children }: { children: ReactNode }) {
  return <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col gap-2">{children}</div>;
}

export function MapControl({
  children,
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className={`pointer-events-auto grid h-11 w-11 place-items-center rounded-xl border border-line bg-card shadow-card ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
