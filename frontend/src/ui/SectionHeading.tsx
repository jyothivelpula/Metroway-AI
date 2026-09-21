import type { ReactNode } from "react";

export function SectionHeading({ children, description }: { children: ReactNode; description?: ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-ink">{children}</h2>
      {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
    </div>
  );
}
