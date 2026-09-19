export type MetroWayQrPayload = {
  type: string;
  version: number;
  stationId?: string;
  levelId?: string;
  nodeId?: string;
  markerId?: string;
};

export function parsePositionQr(text: string): { payload: MetroWayQrPayload } | { error: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: "Invalid position marker." };
  }
  if (!parsed || typeof parsed !== "object") return { error: "Invalid position marker." };
  const data = parsed as Record<string, unknown>;
  if (data.type !== "METROWAY_POSITION") return { error: "Invalid position marker." };
  const version = Number(data.version);
  if (version !== 1) return { error: "Invalid position marker." };
  const markerId = String(data.markerId ?? data.marker_id ?? "").trim();
  const stationId = String(data.stationId ?? data.station_id ?? "").trim();
  const levelId = String(data.levelId ?? data.level_id ?? "").trim();
  const nodeId = String(data.nodeId ?? data.node_id ?? "").trim();
  if (!markerId || !stationId || !levelId || !nodeId) return { error: "Invalid position marker." };
  return {
    payload: {
      type: "METROWAY_POSITION",
      version: 1,
      stationId,
      levelId,
      nodeId,
      markerId,
    },
  };
}
