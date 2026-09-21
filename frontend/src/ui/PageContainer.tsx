import type { ReactNode } from "react";

export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`space-y-5 ${className}`.trim()}>{children}</div>;
}
