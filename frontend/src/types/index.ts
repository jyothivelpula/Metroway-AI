export type MetroLine = "Red" | "Blue" | "Green";

export type StationSummary = {
  id: string;
  station_code: string;
  station_name: string;
  telugu_name: string | null;
  alternate_name: string | null;
  station_status: string;
  city: string;
  state: string;
  verification_status: string;
  is_interchange: boolean;
  is_terminal: boolean;
  lines: string[];
};

export type StationDetail = StationSummary & {
  opening_date: string | null;
  address: string | null;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  coordinate_source: string | null;
  address_source: string | null;
  last_verified_date: string | null;
};

export type PlatformRecord = {
  id: string;
  platform_number: string;
  direction: string | null;
  destination: string | null;
  description: string | null;
  verification_status: string;
};

export type GateRecord = {
  id: string;
  gate_code: string;
  gate_name: string | null;
  entry_exit: string | null;
  description: string | null;
  verification_status: string;
};

export type LevelRecord = {
  id: string;
  level_code: string;
  level_name: string;
  level_order: number;
  description: string | null;
  verification_status: string;
};

export type FacilityRecord = {
  id: string;
  facility_type: string;
  facility_name: string;
  description: string | null;
  verification_status: string;
};

export type AccessibilityRecord = {
  id: string;
  wheelchair_access: boolean | null;
  tactile_flooring: boolean | null;
  audio_announcements: boolean | null;
  verification_status: string;
  notes: string | null;
};

export type BusConnectionRecord = {
  id: string;
  bus_stop_name: string;
  bus_route: string | null;
  notes: string | null;
  verification_status: string;
};

export type NearbyDestinationRecord = {
  id: string;
  destination_name: string;
  category: string | null;
  notes: string | null;
  verification_status: string;
};

export type IndoorComponentRecord = {
  id: string;
  node_id: string;
  node_type: string;
  name: string;
  verification_status: string;
};

export type VerificationRecord = {
  id: string;
  entity_type: string;
  verification_status: string;
  notes: string | null;
};

export type NetworkStation = {
  id: string;
  station_code: string;
  name: string;
  sequence: number;
  is_interchange: boolean;
  is_terminal: boolean;
  verification_status: string;
  alternate_name: string | null;
};

export type NetworkLine = {
  id: string;
  code: string;
  name: string;
  display_name: string;
  origin_station: string | null;
  terminal_station: string | null;
  verification_status: string;
  stations: NetworkStation[];
};

export type NetworkPayload = {
  verification_status: string;
  lines: NetworkLine[];
};

export type StationNeighborhood = {
  station: string;
  station_id: string;
  verification_status: string;
  connections: {
    line: string;
    previous_station: { id: string; station_code: string; name: string } | null;
    next_station: { id: string; station_code: string; name: string } | null;
    direction: string | null;
    connection_type: string;
    verification_status: string;
  }[];
};

export type DemoPlace = {
  id: string;
  label: string;
  kind: "platform" | "gate" | "facility" | "entrance";
};

export type AppSettings = {
  language: "en" | "te" | "hi";
  largeText: boolean;
  highContrast: boolean;
  preferLifts: boolean;
  avoidStairs: boolean;
};

export type IndoorMapNode = {
  id: string;
  station_id: string;
  level_id: string;
  node_code: string;
  node_type: string;
  name: string;
  description: string | null;
  x: number | null;
  y: number | null;
  accessible: boolean;
};

export type IndoorMapEdge = {
  id: string;
  from_node_id: string;
  to_node_id: string;
  connection_type: string;
  accessible: boolean;
  bidirectional: boolean;
};

export type IndoorMapLevel = {
  id: string;
  code: string;
  name: string;
  level_order: number;
};

export type IndoorMapMeta = {
  id: string;
  level_id: string;
  map_type: string;
  map_width: number;
  map_height: number;
  coordinate_system: string;
  map_version: string;
};

export type IndoorMapPayload = {
  station: { id: string; name: string; station_code: string };
  levels: IndoorMapLevel[];
  nodes: IndoorMapNode[];
  edges: IndoorMapEdge[];
  map_metadata: IndoorMapMeta[];
};

export type IndoorRouteStep = {
  step_index: number;
  action: string;
  instruction_type: string;
  instruction_text: string;
  text: string;
  from_node_id: string | null;
  to_node_id: string | null;
  from_node: string | null;
  to_node: string | null;
  connection_type: string | null;
  level: string | null;
  distance_m: number | null;
  estimated_time_sec: number | null;
  landmark: string | null;
  sign_text: string | null;
  voice_instruction?: string | null;
  short_instruction?: string | null;
};

export type IndoorRoute = {
  route_id: string | null;
  station: { id: string; name: string };
  start: { node_id: string; name: string };
  destination: { node_id: string; name: string };
  route_found: boolean;
  reason: string | null;
  total_distance_m: number | null;
  estimated_time_sec: number | null;
  nodes: { node_id: string; name: string; node_type: string; level: string; node_code: string; x?: number | null; y?: number | null }[];
  edges: { edge_id: string; from_node_id: string; to_node_id: string; connection_type: string; distance_m?: number | null; estimated_time_sec?: number | null }[];
  steps: IndoorRouteStep[];
};

export type NavigationMode = "MANUAL_STEP" | "LIVE_POSITION";

export function asMetroLines(values: string[]): MetroLine[] {
  return values.filter((value): value is MetroLine => value === "Red" || value === "Blue" || value === "Green");
}
