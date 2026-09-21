import type { MetroLine } from "../types";

const COLORS: Record<string, string> = {
  Red: "bg-red-line",
  Blue: "bg-blue-line",
  Green: "bg-green-line",
};

export function LineBadge({ line }: { line: MetroLine | string }) {
  return (
    <span className="mw-pill">
      <span className={`h-2 w-2 rounded-full ${COLORS[line] ?? "bg-metro"}`} aria-hidden="true" />
      {line}
    </span>
  );
}
