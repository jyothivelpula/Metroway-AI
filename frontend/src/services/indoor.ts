import type { IndoorMapPayload, IndoorRoute } from "../types";

const API_BASE = "/api";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getIndoorMap(stationId: string) {
  return getJson<IndoorMapPayload>(`/stations/${encodeURIComponent(stationId)}/indoor-map`);
}

export function getIndoorMapLevel(stationId: string, levelId: string) {
  return getJson<IndoorMapPayload>(
    `/stations/${encodeURIComponent(stationId)}/indoor-map/${encodeURIComponent(levelId)}`,
  );
}

export async function postIndoorRoute(body: {
  station_id: string;
  start_node_id: string;
  destination_node_id: string;
  accessible_only?: boolean;
}) {
  const response = await fetch(`${API_BASE}/routes/indoor`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as IndoorRoute | { detail?: { reason?: string; message?: string } };
  if (!response.ok) {
    const detail = "detail" in data ? data.detail : undefined;
    throw new Error(detail?.message || detail?.reason || `Request failed: ${response.status}`);
  }
  return data as IndoorRoute;
}
