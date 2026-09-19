from datetime import date, datetime, timezone
from uuid import uuid4

from sqlalchemy import Boolean, CheckConstraint, Date, DateTime, Float, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid4())


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    source_name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False)
    source_type: Mapped[str] = mapped_column(String(80), nullable=False)
    url: Mapped[str | None] = mapped_column(String(500))
    information_collected: Mapped[str | None] = mapped_column(Text)
    date_accessed: Mapped[date | None] = mapped_column(Date)
    reliability: Mapped[str | None] = mapped_column(String(80))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class Line(Base):
    __tablename__ = "lines"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    line_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    line_name: Mapped[str] = mapped_column(String(80), nullable=False)
    display_name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="OPERATIONAL")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station_links: Mapped[list["StationLine"]] = relationship(back_populates="line")
    connections: Mapped[list["StationConnection"]] = relationship(back_populates="line")


class Station(Base):
    __tablename__ = "stations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    station_name: Mapped[str] = mapped_column(String(120), nullable=False)
    telugu_name: Mapped[str | None] = mapped_column(String(120))
    alternate_name: Mapped[str | None] = mapped_column(String(120))
    station_status: Mapped[str] = mapped_column(String(40), default="OPERATIONAL")
    opening_date: Mapped[date | None] = mapped_column(Date)
    address: Mapped[str | None] = mapped_column(String(300))
    city: Mapped[str] = mapped_column(String(80), default="Hyderabad")
    state: Mapped[str] = mapped_column(String(80), default="Telangana")
    pincode: Mapped[str | None] = mapped_column(String(12))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    coordinate_source: Mapped[str | None] = mapped_column(String(80))
    address_source: Mapped[str | None] = mapped_column(String(80))
    verification_status: Mapped[str] = mapped_column(String(40), default="DEMO")
    last_verified_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    line_links: Mapped[list["StationLine"]] = relationship(back_populates="station")
    platforms: Mapped[list["Platform"]] = relationship(back_populates="station")
    levels: Mapped[list["StationLevel"]] = relationship(back_populates="station")
    gates: Mapped[list["Gate"]] = relationship(back_populates="station")
    facilities: Mapped[list["Facility"]] = relationship(back_populates="station")
    accessibility: Mapped[list["Accessibility"]] = relationship(back_populates="station")
    bus_connections: Mapped[list["StationBusConnection"]] = relationship(back_populates="station")
    nearby_destinations: Mapped[list["NearbyDestination"]] = relationship(back_populates="station")
    indoor_components: Mapped[list["IndoorComponent"]] = relationship(back_populates="station")
    indoor_nodes: Mapped[list["IndoorNode"]] = relationship(back_populates="station")
    indoor_edges: Mapped[list["IndoorEdge"]] = relationship(back_populates="station")
    map_metadata: Mapped[list["MapMetadata"]] = relationship(back_populates="station")
    position_markers: Mapped[list["PositionMarker"]] = relationship(back_populates="station")
    outgoing_connections: Mapped[list["StationConnection"]] = relationship(
        back_populates="from_station",
        foreign_keys="StationConnection.from_station_id",
    )
    incoming_connections: Mapped[list["StationConnection"]] = relationship(
        back_populates="to_station",
        foreign_keys="StationConnection.to_station_id",
    )


class StationLine(Base):
    __tablename__ = "station_lines"
    __table_args__ = (
        UniqueConstraint("station_id", "line_id", name="uq_station_line"),
        Index("ix_station_lines_line_sequence", "line_id", "sequence_number"),
        Index("ix_station_lines_station", "station_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    line_id: Mapped[str] = mapped_column(ForeignKey("lines.id"), nullable=False)
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    is_interchange: Mapped[bool] = mapped_column(Boolean, default=False)
    is_terminal: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="line_links")
    line: Mapped[Line] = relationship(back_populates="station_links")


class StationConnection(Base):
    __tablename__ = "station_connections"
    __table_args__ = (
        UniqueConstraint("from_station_id", "to_station_id", "line_id", name="uq_station_connection"),
        CheckConstraint("from_station_id != to_station_id", name="ck_station_connection_not_self"),
        Index("ix_station_connections_from", "from_station_id"),
        Index("ix_station_connections_to", "to_station_id"),
        Index("ix_station_connections_line", "line_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    from_station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    to_station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    line_id: Mapped[str] = mapped_column(ForeignKey("lines.id"), nullable=False)
    sequence_from: Mapped[int] = mapped_column(Integer, nullable=False)
    sequence_to: Mapped[int] = mapped_column(Integer, nullable=False)
    sequence_order: Mapped[int | None] = mapped_column(Integer)
    connection_type: Mapped[str] = mapped_column(String(40), default="NEXT_STATION")
    distance: Mapped[float | None] = mapped_column(Float)
    distance_unit: Mapped[str | None] = mapped_column(String(20))
    estimated_travel_time: Mapped[int | None] = mapped_column(Integer)
    direction: Mapped[str | None] = mapped_column(String(120))
    is_bidirectional: Mapped[bool] = mapped_column(Boolean, default=True)
    is_interchange: Mapped[bool] = mapped_column(Boolean, default=False)
    is_terminal: Mapped[bool] = mapped_column(Boolean, default=False)
    data_status: Mapped[str] = mapped_column(String(40), default="DEVELOPMENT")
    verification_status: Mapped[str] = mapped_column(String(40), default="DEVELOPMENT")
    last_verified_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    from_station: Mapped[Station] = relationship(
        back_populates="outgoing_connections",
        foreign_keys=[from_station_id],
    )
    to_station: Mapped[Station] = relationship(
        back_populates="incoming_connections",
        foreign_keys=[to_station_id],
    )
    line: Mapped[Line] = relationship(back_populates="connections")


class StationLevel(Base):
    __tablename__ = "station_levels"
    __table_args__ = (UniqueConstraint("station_id", "level_code", name="uq_station_level"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    level_code: Mapped[str] = mapped_column(String(40), nullable=False)
    level_name: Mapped[str] = mapped_column(String(80), nullable=False)
    level_order: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    verification_status: Mapped[str] = mapped_column(String(40), default="DEMO")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="levels")


class Platform(Base):
    __tablename__ = "platforms"
    __table_args__ = (UniqueConstraint("station_id", "platform_number", "line_id", name="uq_platform"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    platform_number: Mapped[str] = mapped_column(String(20), nullable=False)
    line_id: Mapped[str] = mapped_column(ForeignKey("lines.id"), nullable=False)
    direction: Mapped[str | None] = mapped_column(String(120))
    destination: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    platform_source: Mapped[str | None] = mapped_column(String(80))
    verification_status: Mapped[str] = mapped_column(String(40), default="DEMO")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="platforms")
    line: Mapped[Line] = relationship()


class Gate(Base):
    __tablename__ = "gates"
    __table_args__ = (UniqueConstraint("station_id", "gate_code", name="uq_gate"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    level_id: Mapped[str | None] = mapped_column(ForeignKey("station_levels.id"))
    gate_code: Mapped[str] = mapped_column(String(40), nullable=False)
    gate_number: Mapped[str | None] = mapped_column(String(20))
    gate_name: Mapped[str | None] = mapped_column(String(120))
    entry_exit: Mapped[str | None] = mapped_column(String(40))
    direction: Mapped[str | None] = mapped_column(String(120))
    nearby_road: Mapped[str | None] = mapped_column(String(200))
    nearby_destination: Mapped[str | None] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"))
    verification_status: Mapped[str] = mapped_column(String(40), default="DEMO")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="gates")


class Facility(Base):
    __tablename__ = "facilities"
    __table_args__ = (
        UniqueConstraint("station_id", "facility_type", "facility_name", name="uq_facility"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    level_id: Mapped[str | None] = mapped_column(ForeignKey("station_levels.id"))
    facility_type: Mapped[str] = mapped_column(String(40), nullable=False)
    facility_name: Mapped[str] = mapped_column(String(120), nullable=False)
    quantity: Mapped[int | None] = mapped_column(Integer)
    location_description: Mapped[str | None] = mapped_column(Text)
    arm: Mapped[str | None] = mapped_column(String(40))
    paid_area: Mapped[bool | None] = mapped_column(Boolean)
    availability: Mapped[str | None] = mapped_column(String(40))
    description: Mapped[str | None] = mapped_column(Text)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"))
    verification_status: Mapped[str] = mapped_column(String(40), default="DEMO")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="facilities")


class Accessibility(Base):
    __tablename__ = "accessibility"
    __table_args__ = (UniqueConstraint("station_id", name="uq_accessibility_station"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    wheelchair_access: Mapped[bool | None] = mapped_column(Boolean)
    accessible_entrance: Mapped[bool | None] = mapped_column(Boolean)
    accessible_gate: Mapped[bool | None] = mapped_column(Boolean)
    accessible_lift: Mapped[bool | None] = mapped_column(Boolean)
    accessible_escalator: Mapped[bool | None] = mapped_column(Boolean)
    accessible_afc_gate: Mapped[bool | None] = mapped_column(Boolean)
    tactile_flooring: Mapped[bool | None] = mapped_column(Boolean)
    audio_announcements: Mapped[bool | None] = mapped_column(Boolean)
    accessible_washroom: Mapped[bool | None] = mapped_column(Boolean)
    wheelchair_support: Mapped[bool | None] = mapped_column(Boolean)
    accessible_route: Mapped[bool | None] = mapped_column(Boolean)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"))
    verification_status: Mapped[str] = mapped_column(String(40), default="DEMO")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="accessibility")


class StationBusConnection(Base):
    __tablename__ = "station_bus_connections"
    __table_args__ = (
        UniqueConstraint("station_id", "bus_stop_name", name="uq_bus_stop"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    bus_stop_name: Mapped[str] = mapped_column(String(200), nullable=False)
    bus_route: Mapped[str | None] = mapped_column(String(80))
    location_arm: Mapped[str | None] = mapped_column(String(40))
    direction: Mapped[str | None] = mapped_column(String(120))
    walking_distance: Mapped[str | None] = mapped_column(String(80))
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"))
    verification_status: Mapped[str] = mapped_column(String(40), default="DEMO")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="bus_connections")


class NearbyDestination(Base):
    __tablename__ = "nearby_destinations"
    __table_args__ = (
        UniqueConstraint("station_id", "destination_name", name="uq_nearby_destination"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    destination_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str | None] = mapped_column(String(80))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    distance: Mapped[str | None] = mapped_column(String(80))
    direction: Mapped[str | None] = mapped_column(String(80))
    nearest_gate: Mapped[str | None] = mapped_column(String(40))
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"))
    verification_status: Mapped[str] = mapped_column(String(40), default="DEMO")
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="nearby_destinations")


class IndoorComponent(Base):
    __tablename__ = "indoor_components"
    __table_args__ = (UniqueConstraint("station_id", "node_id", name="uq_indoor_node"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    level_id: Mapped[str | None] = mapped_column(ForeignKey("station_levels.id"))
    node_id: Mapped[str] = mapped_column(String(80), nullable=False)
    node_type: Mapped[str] = mapped_column(String(40), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    arm: Mapped[str | None] = mapped_column(String(40))
    description: Mapped[str | None] = mapped_column(Text)
    accessible: Mapped[bool | None] = mapped_column(Boolean)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    x: Mapped[float | None] = mapped_column(Float)
    y: Mapped[float | None] = mapped_column(Float)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"))
    verification_status: Mapped[str] = mapped_column(String(40), default="DEMO")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="indoor_components")


class IndoorNode(Base):
    __tablename__ = "indoor_nodes"
    __table_args__ = (
        UniqueConstraint("station_id", "node_code", name="uq_indoor_nodes_station_code"),
        Index("ix_indoor_nodes_station", "station_id"),
        Index("ix_indoor_nodes_level", "level_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    level_id: Mapped[str] = mapped_column(ForeignKey("station_levels.id"), nullable=False)
    node_code: Mapped[str] = mapped_column(String(80), nullable=False)
    node_type: Mapped[str] = mapped_column(String(40), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    x: Mapped[float | None] = mapped_column(Float)
    y: Mapped[float | None] = mapped_column(Float)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    accessible: Mapped[bool] = mapped_column(Boolean, default=False)
    data_status: Mapped[str] = mapped_column(String(40), default="DEVELOPMENT")
    verification_status: Mapped[str] = mapped_column(String(40), default="DEVELOPMENT")
    last_verified_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="indoor_nodes")
    level: Mapped[StationLevel] = relationship()
    outgoing_edges: Mapped[list["IndoorEdge"]] = relationship(
        back_populates="from_node",
        foreign_keys="IndoorEdge.from_node_id",
    )
    incoming_edges: Mapped[list["IndoorEdge"]] = relationship(
        back_populates="to_node",
        foreign_keys="IndoorEdge.to_node_id",
    )


class IndoorEdge(Base):
    __tablename__ = "indoor_edges"
    __table_args__ = (
        UniqueConstraint(
            "station_id",
            "from_node_id",
            "to_node_id",
            "connection_type",
            name="uq_indoor_edge",
        ),
        CheckConstraint("from_node_id != to_node_id", name="ck_indoor_edge_not_self"),
        Index("ix_indoor_edges_station", "station_id"),
        Index("ix_indoor_edges_from", "from_node_id"),
        Index("ix_indoor_edges_to", "to_node_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    from_node_id: Mapped[str] = mapped_column(ForeignKey("indoor_nodes.id"), nullable=False)
    to_node_id: Mapped[str] = mapped_column(ForeignKey("indoor_nodes.id"), nullable=False)
    connection_type: Mapped[str] = mapped_column(String(40), nullable=False)
    distance_m: Mapped[float | None] = mapped_column(Float)
    estimated_time_sec: Mapped[int | None] = mapped_column(Integer)
    accessible: Mapped[bool] = mapped_column(Boolean, default=False)
    bidirectional: Mapped[bool] = mapped_column(Boolean, default=True)
    data_status: Mapped[str] = mapped_column(String(40), default="DEVELOPMENT")
    verification_status: Mapped[str] = mapped_column(String(40), default="DEVELOPMENT")
    last_verified_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="indoor_edges")
    from_node: Mapped[IndoorNode] = relationship(back_populates="outgoing_edges", foreign_keys=[from_node_id])
    to_node: Mapped[IndoorNode] = relationship(back_populates="incoming_edges", foreign_keys=[to_node_id])


class MapMetadata(Base):
    __tablename__ = "map_metadata"
    __table_args__ = (
        UniqueConstraint("station_id", "level_id", "map_type", name="uq_map_metadata_level"),
        Index("ix_map_metadata_station", "station_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    level_id: Mapped[str] = mapped_column(ForeignKey("station_levels.id"), nullable=False)
    map_type: Mapped[str] = mapped_column(String(40), default="SCHEMATIC")
    map_width: Mapped[float] = mapped_column(Float, default=100)
    map_height: Mapped[float] = mapped_column(Float, default=100)
    coordinate_system: Mapped[str] = mapped_column(String(40), default="NORMALIZED_0_100")
    map_version: Mapped[str] = mapped_column(String(40), default="1")
    data_status: Mapped[str] = mapped_column(String(40), default="DEVELOPMENT")
    verification_status: Mapped[str] = mapped_column(String(40), default="DEVELOPMENT")
    last_verified_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="map_metadata")
    level: Mapped[StationLevel] = relationship()


class PositionMarker(Base):
    __tablename__ = "position_markers"
    __table_args__ = (
        UniqueConstraint("marker_code", name="uq_position_marker_code"),
        UniqueConstraint("station_id", "node_id", "marker_type", name="uq_position_marker_node_type"),
        Index("ix_position_markers_station", "station_id"),
        Index("ix_position_markers_node", "node_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    station_id: Mapped[str] = mapped_column(ForeignKey("stations.id"), nullable=False)
    level_id: Mapped[str] = mapped_column(ForeignKey("station_levels.id"), nullable=False)
    node_id: Mapped[str] = mapped_column(ForeignKey("indoor_nodes.id"), nullable=False)
    marker_type: Mapped[str] = mapped_column(String(40), nullable=False, default="QR")
    marker_code: Mapped[str] = mapped_column(String(80), nullable=False)
    label: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(40), default="ACTIVE")
    data_status: Mapped[str] = mapped_column(String(40), default="DEVELOPMENT")
    verification_status: Mapped[str] = mapped_column(String(40), default="DEVELOPMENT")
    last_verified_date: Mapped[date | None] = mapped_column(Date)
    notes: Mapped[str | None] = mapped_column(Text)
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    station: Mapped[Station] = relationship(back_populates="position_markers")
    level: Mapped[StationLevel] = relationship()
    node: Mapped[IndoorNode] = relationship()


class Verification(Base):
    __tablename__ = "verification"
    __table_args__ = (
        UniqueConstraint("entity_type", "entity_id", name="uq_verification_entity"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    entity_type: Mapped[str] = mapped_column(String(40), nullable=False)
    entity_id: Mapped[str] = mapped_column(String(36), nullable=False)
    verification_status: Mapped[str] = mapped_column(String(40), default="DEMO")
    source_id: Mapped[str | None] = mapped_column(ForeignKey("sources.id"))
    verified_date: Mapped[date | None] = mapped_column(Date)
    confidence: Mapped[str | None] = mapped_column(String(40))
    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
