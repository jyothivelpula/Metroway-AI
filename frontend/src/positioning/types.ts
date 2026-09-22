export type PositionSource =
  | "QR_POSITION"
  | "GPS_POSITION"
  | "MANUAL_POSITION"
  | "SIMULATION_POSITION"
  | "VISION_POSITION"
  | "BLE_POSITION"
  | "UWB_POSITION";

export type PositionConfidence = "HIGH" | "MEDIUM" | "LOW";

export type RouteMatch = "ON_ROUTE" | "NEAR_ROUTE" | "OFF_ROUTE" | "DESTINATION" | "UNKNOWN";

export type NormalizedPosition = {
  source: PositionSource;
  stationId: string | null;
  levelId: string | null;
  levelCode: string | null;
  nodeId: string | null;
  nodeName: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: string;
  confidence: PositionConfidence;
  stale: boolean;
  markerId: string | null;
};

export type PositionResolve = {
  valid: boolean;
  reason: string | null;
  source: string;
  stationId: string | null;
  stationName: string | null;
  stationCode: string | null;
  levelId: string | null;
  levelCode: string | null;
  levelName: string | null;
  nodeId: string | null;
  nodeName: string | null;
  nodeCode: string | null;
  markerId: string | null;
  confidence: string | null;
};

export type PositionMarker = {
  id: string;
  marker_code: string;
  marker_type: string;
  label: string;
  status: string;
  node: { id: string; name: string; node_code: string; node_type: string } | null;
  level: { id: string; code: string; name: string } | null;
};
