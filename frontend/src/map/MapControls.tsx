import { LocateFixed, Minus, Plus, ScanLine } from "lucide-react";

export function MapControls({
  onZoomIn,
  onZoomOut,
  onLocate,
  onFit,
  locateLabel = "Locate me",
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onLocate?: () => void;
  onFit?: () => void;
  locateLabel?: string;
}) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col gap-2">
      <div className="pointer-events-auto flex flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
        <button type="button" aria-label="Zoom in" onClick={onZoomIn} className="grid h-11 w-11 place-items-center">
          <Plus className="h-5 w-5" aria-hidden="true" />
        </button>
        <button type="button" aria-label="Zoom out" onClick={onZoomOut} className="grid h-11 w-11 place-items-center border-t border-line">
          <Minus className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      {onLocate ? (
        <button
          type="button"
          aria-label={locateLabel}
          onClick={onLocate}
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-2xl border border-line bg-card shadow-sm"
        >
          <LocateFixed className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
      {onFit ? (
        <button
          type="button"
          aria-label="Fit route"
          onClick={onFit}
          className="pointer-events-auto grid h-11 w-11 place-items-center rounded-2xl border border-line bg-card shadow-sm"
        >
          <ScanLine className="h-5 w-5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
