import type { PositionSource } from "./types";

const KEY = "metroway.pendingPosition";

export type PendingPosition = {
  stationId: string | null;
  stationCode: string | null;
  nodeId: string;
  nodeName: string;
  levelId: string | null;
  levelCode: string | null;
  source: PositionSource;
  markerId: string | null;
};

export function savePendingPosition(value: PendingPosition) {
  sessionStorage.setItem(KEY, JSON.stringify(value));
}

export function takePendingPosition(): PendingPosition | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as PendingPosition;
  } catch {
    return null;
  }
}
