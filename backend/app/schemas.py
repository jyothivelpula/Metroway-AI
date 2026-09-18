from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class LineOut(ORMModel):
    id: str
    line_code: str
    line_name: str
    display_name: str
    description: str | None
    status: str


class StationLineOut(ORMModel):
    line_id: str
    line_code: str
    line_name: str
    display_name: str
    sequence_number: int
    is_interchange: bool
    is_terminal: bool


class StationSummaryOut(ORMModel):
    id: str
    station_code: str
    station_name: str
    telugu_name: str | None
    alternate_name: str | None
    station_status: str
    city: str
    state: str
    verification_status: str
    is_interchange: bool
    is_terminal: bool
    lines: list[str]


class StationDetailOut(StationSummaryOut):
    opening_date: date | None
    address: str | None
    pincode: str | None
    latitude: float | None
    longitude: float | None
    coordinate_source: str | None
    address_source: str | None
    last_verified_date: date | None
    line_links: list[StationLineOut]


class PlatformOut(ORMModel):
    id: str
    platform_number: str
    line_id: str
    direction: str | None
    destination: str | None
    description: str | None
    platform_source: str | None
    verification_status: str


class LevelOut(ORMModel):
    id: str
    level_code: str
    level_name: str
    level_order: int
    description: str | None
    verification_status: str


class GateOut(ORMModel):
    id: str
    level_id: str | None
    gate_code: str
    gate_number: str | None
    gate_name: str | None
    entry_exit: str | None
    direction: str | None
    nearby_road: str | None
    nearby_destination: str | None
    description: str | None
    verification_status: str


class FacilityOut(ORMModel):
    id: str
    level_id: str | None
    facility_type: str
    facility_name: str
    quantity: int | None
    location_description: str | None
    arm: str | None
    paid_area: bool | None
    availability: str | None
    description: str | None
    verification_status: str


class AccessibilityOut(ORMModel):
    id: str
    wheelchair_access: bool | None
    accessible_entrance: bool | None
    accessible_gate: bool | None
    accessible_lift: bool | None
    accessible_escalator: bool | None
    accessible_afc_gate: bool | None
    tactile_flooring: bool | None
    audio_announcements: bool | None
    accessible_washroom: bool | None
    wheelchair_support: bool | None
    accessible_route: bool | None
    verification_status: str
    notes: str | None


class BusConnectionOut(ORMModel):
    id: str
    bus_stop_name: str
    bus_route: str | None
    location_arm: str | None
    direction: str | None
    walking_distance: str | None
    verification_status: str
    notes: str | None


class NearbyDestinationOut(ORMModel):
    id: str
    destination_name: str
    category: str | None
    latitude: float | None
    longitude: float | None
    distance: str | None
    direction: str | None
    nearest_gate: str | None
    verification_status: str
    notes: str | None


class IndoorComponentOut(ORMModel):
    id: str
    level_id: str | None
    node_id: str
    node_type: str
    name: str
    arm: str | None
    description: str | None
    accessible: bool | None
    latitude: float | None
    longitude: float | None
    x: float | None
    y: float | None
    verification_status: str


class VerificationOut(ORMModel):
    id: str
    entity_type: str
    entity_id: str
    verification_status: str
    source_id: str | None
    verified_date: date | None
    confidence: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class NetworkStationOut(ORMModel):
    id: str
    station_code: str
    name: str
    sequence: int
    is_interchange: bool
    is_terminal: bool
    verification_status: str
    alternate_name: str | None = None


class NetworkConnectionOut(ORMModel):
    from_station_id: str
    from_station_name: str
    to_station_id: str
    to_station_name: str
    sequence_from: int
    sequence_to: int
    connection_type: str
    direction: str | None
    is_interchange: bool
    is_terminal: bool
    verification_status: str


class NetworkLineOut(ORMModel):
    id: str
    code: str
    name: str
    display_name: str
    origin_station: str | None
    terminal_station: str | None
    verification_status: str
    stations: list[NetworkStationOut]
    connections: list[NetworkConnectionOut]


class NetworkLineDetailOut(NetworkLineOut):
    interchange_stations: list[NetworkStationOut]


class NetworkOut(ORMModel):
    verification_status: str
    lines: list[NetworkLineOut]


class NeighborRef(ORMModel):
    id: str
    station_code: str
    name: str


class StationLineNeighborhoodOut(ORMModel):
    line: str
    line_id: str
    previous_station: NeighborRef | None
    next_station: NeighborRef | None
    direction: str | None
    connection_type: str
    verification_status: str


class StationConnectionsOut(ORMModel):
    station: str
    station_id: str
    verification_status: str
    connections: list[StationLineNeighborhoodOut]


class InterchangeOut(ORMModel):
    station_id: str
    station_code: str
    station_name: str
    lines: list[str]
    verification_status: str
    alternate_name: str | None = None


class InterchangeListOut(ORMModel):
    interchanges: list[InterchangeOut]


class TerminalOut(ORMModel):
    line: str
    line_id: str
    origin: str | None
    terminal: str | None
    origin_station_id: str | None
    terminal_station_id: str | None
    verification_status: str


class IndoorMapStationOut(ORMModel):
    id: str
    name: str
    station_code: str


class IndoorMapLevelOut(ORMModel):
    id: str
    code: str
    name: str
    level_order: int


class IndoorNodeOut(ORMModel):
    id: str
    station_id: str
    level_id: str
    node_code: str
    node_type: str
    name: str
    description: str | None
    x: float | None
    y: float | None
    latitude: float | None
    longitude: float | None
    accessible: bool
    data_status: str


class IndoorEdgeOut(ORMModel):
    id: str
    station_id: str
    from_node_id: str
    to_node_id: str
    connection_type: str
    distance_m: float | None
    estimated_time_sec: int | None
    accessible: bool
    bidirectional: bool
    data_status: str


class MapMetadataOut(ORMModel):
    id: str
    station_id: str
    level_id: str
    map_type: str
    map_width: float
    map_height: float
    coordinate_system: str
    map_version: str
    data_status: str


class IndoorMapOut(ORMModel):
    station: IndoorMapStationOut
    levels: list[IndoorMapLevelOut]
    nodes: list[IndoorNodeOut]
    edges: list[IndoorEdgeOut]
    map_metadata: list[MapMetadataOut]


class IndoorRouteRequest(ORMModel):
    station_id: str
    start_node_id: str | None = None
    destination_node_id: str
    accessible_only: bool = False
    current_node_id: str | None = None


class IndoorRouteStationOut(ORMModel):
    id: str
    name: str


class IndoorRoutePointOut(ORMModel):
    node_id: str
    name: str


class IndoorRouteNodeOut(ORMModel):
    node_id: str
    name: str
    node_type: str
    level: str
    node_code: str
    x: float | None = None
    y: float | None = None


class IndoorRouteEdgeOut(ORMModel):
    edge_id: str
    from_node_id: str
    to_node_id: str
    connection_type: str
    distance_m: float | None
    estimated_time_sec: int | None
    accessible: bool | None


class IndoorRouteStepOut(ORMModel):
    step_index: int
    action: str
    instruction_type: str
    instruction_text: str
    text: str
    from_node_id: str | None
    to_node_id: str | None
    from_node: str | None = None
    to_node: str | None = None
    connection_type: str | None
    level: str | None
    distance_m: float | None = None
    estimated_time_sec: int | None = None
    landmark: str | None = None
    sign_text: str | None = None
    voice_instruction: str | None = None


class IndoorRouteOut(ORMModel):
    route_id: str | None
    station: IndoorRouteStationOut
    start: IndoorRoutePointOut
    destination: IndoorRoutePointOut
    route_found: bool
    reason: str | None = None
    total_distance_m: float | None
    estimated_time_sec: float | int | None
    nodes: list[IndoorRouteNodeOut]
    edges: list[IndoorRouteEdgeOut]
    steps: list[IndoorRouteStepOut]

