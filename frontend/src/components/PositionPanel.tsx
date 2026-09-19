import { useState } from "react";
import type { IndoorMapNode } from "../types";
import type { NavigationMode } from "../types";
import type { NormalizedPosition } from "../positioning/types";

function sourceLabel(position: NormalizedPosition | null) {
  const source = position?.source ?? null;
  if (source === "QR_POSITION") return "QR";
  if (source === "GPS_POSITION") return "GPS";
  if (source === "MANUAL_POSITION") return "Manual";
  if (source === "SIMULATION_POSITION") return "Live";
  return "Not available";
}

export function PositionPanel({
  position,
  nodes,
  currentName,
  error,
  autoMove,
  canMoveNext,
  canMovePrev,
  arrived,
  onScan,
  onManual,
  onMoveNext,
  onMovePrev,
  onToggleAuto,
}: {
  mode?: NavigationMode;
  position: NormalizedPosition | null;
  live?: boolean;
  nodes: IndoorMapNode[];
  currentName: string;
  error: string;
  autoMove: boolean;
  canMoveNext: boolean;
  canMovePrev: boolean;
  arrived: boolean;
  onModeChange?: (mode: NavigationMode) => void;
  onScan: () => void;
  onManual: (nodeId: string) => void;
  onStartGps?: () => void;
  onMoveNext: () => void;
  onMovePrev: () => void;
  onToggleAuto: () => void;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <section className="rounded-3xl border border-line bg-card p-4 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-widest text-muted">Live position</p>
      <p className="mt-2 text-sm text-muted">You&apos;re here</p>
      <p className="text-xl font-semibold">{currentName || "Start of route"}</p>
      <p className="mt-1 text-sm text-muted">Position source: {sourceLabel(position)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onScan} className="min-h-11 flex-1 rounded-full bg-metro px-4 py-2 text-sm font-semibold text-white">
          Scan QR
        </button>
        <button type="button" onClick={() => setPicking((value) => !value)} className="min-h-11 flex-1 rounded-full bg-paper px-4 py-2 text-sm font-semibold">
          Change position
        </button>
      </div>
      {error ? <p className="mt-2 text-sm text-muted">{error}</p> : null}
      {picking ? (
        <label className="mt-3 block">
          <span className="text-sm font-semibold">Choose an indoor location</span>
          <select
            value={position?.nodeId ?? ""}
            onChange={(event) => {
              if (event.target.value) onManual(event.target.value);
            }}
            className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3"
          >
            <option value="">Select current location</option>
            {nodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {!arrived ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onMovePrev}
            disabled={!canMovePrev}
            className="min-h-11 flex-1 rounded-full bg-paper px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={onMoveNext}
            disabled={!canMoveNext}
            className="min-h-11 flex-1 rounded-full bg-paper px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            Move to next
          </button>
        </div>
      ) : null}
      {!arrived ? (
        <button
          type="button"
          onClick={onToggleAuto}
          className={`mt-2 w-full min-h-11 rounded-full px-4 py-2 text-sm font-semibold ${
            autoMove ? "bg-metro text-white" : "bg-paper"
          }`}
        >
          {autoMove ? "Stop auto navigate" : "Auto navigate"}
        </button>
      ) : null}
    </section>
  );
}
