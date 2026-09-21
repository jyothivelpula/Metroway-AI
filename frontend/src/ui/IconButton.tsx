import type { ButtonHTMLAttributes, ReactNode } from "react";

export function IconButton({
  children,
  label,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
}) {
  return (
    <button type="button" aria-label={label} className={`mw-icon-btn ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
