import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger";

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: Variant;
}) {
  const styles: Record<Variant, string> = {
    primary: "mw-btn-primary",
    secondary: "mw-btn-secondary",
    danger: "mw-btn-danger",
  };
  return (
    <button type="button" className={`${styles[variant]} ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
