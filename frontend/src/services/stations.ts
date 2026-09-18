import type {
  AccessibilityRecord,
  BusConnectionRecord,
  FacilityRecord,
  GateRecord,
  IndoorComponentRecord,
  LevelRecord,
  NearbyDestinationRecord,
  PlatformRecord,
  StationDetail,
  StationSummary,
  VerificationRecord,
} from "../types";

const API_BASE = "/api";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function getLines() {
  return getJson<{ line_code: string; display_name: string }[]>("/lines");
}

export function getStations(params?: { q?: string; line?: string }) {
  const search = new URLSearchParams();
  if (params?.q) search.set("q", params.q);
  if (params?.line && params.line !== "All") search.set("line", params.line);
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return getJson<StationSummary[]>(`/stations${suffix}`);
}

export function searchStations(q: string) {
  return getJson<StationSummary[]>(`/stations/search?q=${encodeURIComponent(q)}`);
}

export function getStation(id: string) {
  return getJson<StationDetail>(`/stations/${encodeURIComponent(id)}`);
}

export function getPlatforms(id: string) {
  return getJson<PlatformRecord[]>(`/stations/${encodeURIComponent(id)}/platforms`);
}

export function getGates(id: string) {
  return getJson<GateRecord[]>(`/stations/${encodeURIComponent(id)}/gates`);
}

export function getLevels(id: string) {
  return getJson<LevelRecord[]>(`/stations/${encodeURIComponent(id)}/levels`);
}

export function getFacilities(id: string) {
  return getJson<FacilityRecord[]>(`/stations/${encodeURIComponent(id)}/facilities`);
}

export function getAccessibility(id: string) {
  return getJson<AccessibilityRecord[]>(`/stations/${encodeURIComponent(id)}/accessibility`);
}

export function getBusConnections(id: string) {
  return getJson<BusConnectionRecord[]>(`/stations/${encodeURIComponent(id)}/bus-connections`);
}

export function getNearbyDestinations(id: string) {
  return getJson<NearbyDestinationRecord[]>(`/stations/${encodeURIComponent(id)}/nearby-destinations`);
}

export function getIndoorComponents(id: string) {
  return getJson<IndoorComponentRecord[]>(`/stations/${encodeURIComponent(id)}/indoor-components`);
}

export function getVerification(id: string) {
  return getJson<VerificationRecord | null>(`/stations/${encodeURIComponent(id)}/verification`);
}

export function stationKey(station: StationSummary) {
  return station.alternate_name || station.station_code;
}

export function matchesStationKey(station: StationSummary, key: string) {
  return (
    station.id === key ||
    station.station_code === key ||
    station.alternate_name === key ||
    station.station_code.toLowerCase() === key.toLowerCase()
  );
}
