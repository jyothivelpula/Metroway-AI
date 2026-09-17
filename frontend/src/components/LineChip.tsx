import type { MetroLine } from "../types";

const COLORS: Record<MetroLine, string> = {
  Red: "bg-red-line",
  Blue: "bg-blue-line",
  Green: "bg-green-line",
};

export function LineChip({ line }: { line: MetroLine }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-paper px-2 py-0.5 text-xs font-semibold text-ink">
      <span className={`h-2 w-2 rounded-full ${COLORS[line]}`} aria-hidden="true" />
      {line}
    </span>
  );
}
