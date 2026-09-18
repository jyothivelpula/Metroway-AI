import type { NetworkPayload, StationNeighborhood } from "../types";

const API_BASE = "/api";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getNetwork() {
  return getJson<NetworkPayload>("/network");
}

export function getStationConnections(id: string) {
  return getJson<StationNeighborhood>(`/stations/${encodeURIComponent(id)}/connections`);
}
