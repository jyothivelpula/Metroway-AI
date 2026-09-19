import type { PositionMarker, PositionResolve } from "../positioning/types";

const API_BASE = "/api";

export async function getPositionMarkers(stationId: string) {
  const response = await fetch(`${API_BASE}/stations/${encodeURIComponent(stationId)}/position-markers`);
  if (!response.ok) throw new Error("Could not load position markers.");
  const data = (await response.json()) as { markers: PositionMarker[] };
  return data.markers;
}

export async function resolvePosition(body: { markerCode?: string; payload?: Record<string, unknown> }) {
  const response = await fetch(`${API_BASE}/position/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markerCode: body.markerCode, payload: body.payload }),
  });
  const data = (await response.json()) as PositionResolve;
  if (!response.ok) {
    return { valid: false, reason: "POSITION_MARKER_NOT_FOUND", source: "QR_POSITION" } as PositionResolve;
  }
  return data;
}
