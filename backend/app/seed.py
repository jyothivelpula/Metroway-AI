from datetime import date

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import (
    Accessibility,
    Facility,
    Gate,
    IndoorComponent,
    Line,
    NearbyDestination,
    Platform,
    Source,
    Station,
    StationBusConnection,
    StationLevel,
    StationLine,
    Verification,
)
from app.seed_network import seed_development_network
from app.seed_indoor import seed_development_indoor_maps

# Public corridor names/order from HMRL network references. Indoor fields are DEMO only.
# https://hmrl.co.in/
HMRL_URL = "https://hmrl.co.in/"

STATION_SLUGS = {
    "ameerpet": "AMP",
    "miyapur": "MYP",
    "kukatpally": "KKP",
    "kphb": "KHB",
    "kphb-colony": "KHB",
    "punjagutta": "PJG",
    "nagole": "NGL",
    "uppal": "UPL",
    "madhapur": "MDP",
    "raidurg": "RDG",
    "parade": "PDG",
    "jbs": "PDG",
    "jbs-parade-ground": "PDG",
    "mgbs": "MGB",
    "secunderabad-east": "SCE",
    "secunderabad-west": "SCW",
    "gandhi-hospital": "GNH",
    "rtc-x-roads": "RTC",
    "chikkadpally": "CKD",
    "hitec": "HIT",
    "lb-nagar": "LBN",
    "begumpet": "BGM",
    "jntu": "JNT",
}

LINES = [
    {
        "line_code": "RED",
        "line_name": "Red Line",
        "display_name": "Red",
        "description": "Corridor I — Miyapur to LB Nagar (public network label).",
    },
    {
        "line_code": "BLUE",
        "line_name": "Blue Line",
        "display_name": "Blue",
        "description": "Corridor III — Nagole to Raidurg (public network label).",
    },
    {
        "line_code": "GREEN",
        "line_name": "Green Line",
        "display_name": "Green",
        "description": "Corridor II — JBS Parade Ground to M.G. Bus Station (operational public network label).",
    },
]

# sequence_number is public line order from published route maps, not indoor layout.
STATIONS = [
    {
        "station_code": "MYP",
        "station_name": "Miyapur",
        "alternate_name": "miyapur",
        "lines": [{"code": "RED", "sequence": 1, "interchange": False, "terminal": True}],
    },
    {
        "station_code": "JNT",
        "station_name": "JNTU College",
        "alternate_name": "jntu",
        "lines": [{"code": "RED", "sequence": 2, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "KHB",
        "station_name": "KPHB Colony",
        "alternate_name": "kphb-colony",
        "lines": [{"code": "RED", "sequence": 3, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "KKP",
        "station_name": "Kukatpally",
        "alternate_name": "kukatpally",
        "lines": [{"code": "RED", "sequence": 4, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "AMP",
        "station_name": "Ameerpet",
        "alternate_name": "ameerpet",
        "lines": [
            {"code": "RED", "sequence": 11, "interchange": True, "terminal": False},
            {"code": "BLUE", "sequence": 14, "interchange": True, "terminal": False},
        ],
    },
    {
        "station_code": "PJG",
        "station_name": "Punjagutta",
        "alternate_name": "punjagutta",
        "lines": [{"code": "RED", "sequence": 12, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "MGB",
        "station_name": "M.G. Bus Station",
        "alternate_name": "mgbs",
        "lines": [
            {"code": "RED", "sequence": 20, "interchange": True, "terminal": False},
            {"code": "GREEN", "sequence": 10, "interchange": True, "terminal": True},
        ],
    },
    {
        "station_code": "LBN",
        "station_name": "LB Nagar",
        "alternate_name": "lb-nagar",
        "lines": [{"code": "RED", "sequence": 27, "interchange": False, "terminal": True}],
    },
    {
        "station_code": "NGL",
        "station_name": "Nagole",
        "alternate_name": "nagole",
        "lines": [{"code": "BLUE", "sequence": 1, "interchange": False, "terminal": True}],
    },
    {
        "station_code": "UPL",
        "station_name": "Uppal",
        "alternate_name": "uppal",
        "lines": [{"code": "BLUE", "sequence": 2, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "SCE",
        "station_name": "Secunderabad East",
        "alternate_name": "secunderabad-east",
        "lines": [{"code": "BLUE", "sequence": 8, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "PDG",
        "station_name": "Parade Ground",
        "alternate_name": "parade",
        "lines": [
            {"code": "BLUE", "sequence": 9, "interchange": True, "terminal": False},
            {"code": "GREEN", "sequence": 1, "interchange": True, "terminal": True},
        ],
    },
    {
        "station_code": "SCW",
        "station_name": "Secunderabad West",
        "alternate_name": "secunderabad-west",
        "lines": [{"code": "GREEN", "sequence": 2, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "GNH",
        "station_name": "Gandhi Hospital",
        "alternate_name": "gandhi-hospital",
        "lines": [{"code": "GREEN", "sequence": 3, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "RTC",
        "station_name": "RTC X Roads",
        "alternate_name": "rtc-x-roads",
        "lines": [{"code": "GREEN", "sequence": 5, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "CKD",
        "station_name": "Chikkadpally",
        "alternate_name": "chikkadpally",
        "lines": [{"code": "GREEN", "sequence": 6, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "BGM",
        "station_name": "Begumpet",
        "alternate_name": "begumpet",
        "lines": [{"code": "BLUE", "sequence": 13, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "MDP",
        "station_name": "Madhapur",
        "alternate_name": "madhapur",
        "lines": [{"code": "BLUE", "sequence": 20, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "HIT",
        "station_name": "HITEC City",
        "alternate_name": "hitec",
        "lines": [{"code": "BLUE", "sequence": 22, "interchange": False, "terminal": False}],
    },
    {
        "station_code": "RDG",
        "station_name": "Raidurg",
        "alternate_name": "raidurg",
        "lines": [{"code": "BLUE", "sequence": 23, "interchange": False, "terminal": True}],
    },
]


def _one(db: Session, model, **filters):
    return db.scalar(select(model).filter_by(**filters))


def _upsert(db: Session, model, unique: dict, values: dict):
    row = _one(db, model, **unique)
    if row is None:
        row = model(**unique, **values)
        db.add(row)
        db.flush()
        return row
    for key, value in values.items():
        setattr(row, key, value)
    db.flush()
    return row


def _verify(db: Session, source_id: str, entity_type: str, entity_id: str, notes: str):
    _upsert(
        db,
        Verification,
        {"entity_type": entity_type, "entity_id": entity_id},
        {
            "verification_status": "DEMO",
            "source_id": source_id,
            "verified_date": None,
            "confidence": "low",
            "notes": notes,
        },
    )


def seed_demo_data(db: Session) -> None:
    hmrl = _upsert(
        db,
        Source,
        {"source_name": "HMRL – Hyderabad Metro Rail Limited"},
        {
            "source_type": "OFFICIAL_WEBSITE",
            "url": HMRL_URL,
            "information_collected": "Operator identity, network context, public communications.",
            "date_accessed": date(2026, 9, 17),
            "reliability": "official",
            "notes": "Used as the official operator reference. Indoor layouts were not taken from this site.",
        },
    )
    route_map = _upsert(
        db,
        Source,
        {"source_name": "Hyderabad Metro Route Map"},
        {
            "source_type": "ROUTE_MAP",
            "url": None,
            "information_collected": "Line colours, public station names, corridor terminals, interchange relationships.",
            "date_accessed": date(2026, 9, 17),
            "reliability": "secondary",
            "notes": "Referenced as HMRRouteMap_new(1).pdf. File was not present in the repo; public corridor labels were used for DEMO seed only.",
        },
    )
    demo_source = _upsert(
        db,
        Source,
        {"source_name": "DEMO DATA"},
        {
            "source_type": "DEMO_SEED",
            "url": None,
            "information_collected": "Placeholder platforms, gates, facilities, indoor nodes, bus and nearby records.",
            "date_accessed": date(2026, 9, 17),
            "reliability": "unverified",
            "notes": "Must be replaced with field-verified or authorized station data before production navigation.",
        },
    )
    db.flush()

    lines = {}
    for item in LINES:
        row = _upsert(
            db,
            Line,
            {"line_code": item["line_code"]},
            {
                "line_name": item["line_name"],
                "display_name": item["display_name"],
                "description": item["description"],
                "status": "OPERATIONAL",
            },
        )
        lines[item["line_code"]] = row
        _verify(db, hmrl.id, "line", row.id, "Public corridor label. DEMO until HMRL-authorized dataset is loaded.")

    for item in STATIONS:
        station = _upsert(
            db,
            Station,
            {"station_code": item["station_code"]},
            {
                "station_name": item["station_name"],
                "telugu_name": None,
                "alternate_name": item["alternate_name"],
                "station_status": "OPERATIONAL",
                "opening_date": None,
                "address": None,
                "city": "Hyderabad",
                "state": "Telangana",
                "pincode": None,
                "latitude": None,
                "longitude": None,
                "coordinate_source": "NOT_AVAILABLE",
                "address_source": "DEMO",
                "verification_status": "DEMO",
                "last_verified_date": None,
            },
        )
        _verify(
            db,
            route_map.id,
            "station",
            station.id,
            "Public station name and line membership only. No verified floor plan, gates, or coordinates.",
        )

        street = _upsert(
            db,
            StationLevel,
            {"station_id": station.id, "level_code": "STREET"},
            {
                "level_name": "Street",
                "level_order": 1,
                "description": None,
                "verification_status": "DEMO",
            },
        )
        concourse = _upsert(
            db,
            StationLevel,
            {"station_id": station.id, "level_code": "CONCOURSE"},
            {
                "level_name": "Concourse",
                "level_order": 2,
                "description": None,
                "verification_status": "DEMO",
            },
        )
        platform_level = _upsert(
            db,
            StationLevel,
            {"station_id": station.id, "level_code": "PLATFORM"},
            {
                "level_name": "Platform",
                "level_order": 3,
                "description": None,
                "verification_status": "DEMO",
            },
        )

        for link in item["lines"]:
            line = lines[link["code"]]
            _upsert(
                db,
                StationLine,
                {"station_id": station.id, "line_id": line.id},
                {
                    "sequence_number": link["sequence"],
                    "is_interchange": link["interchange"],
                    "is_terminal": link["terminal"],
                },
            )
            _upsert(
                db,
                Platform,
                {"station_id": station.id, "platform_number": "Platform 1", "line_id": line.id},
                {
                    "direction": None,
                    "destination": None,
                    "description": None,
                    "platform_source": "DEMO_SEED",
                    "verification_status": "DEMO",
                },
            )

        _upsert(
            db,
            Gate,
            {"station_id": station.id, "gate_code": "EXIT"},
            {
                "level_id": street.id,
                "gate_number": None,
                "gate_name": "Exit",
                "entry_exit": "BOTH",
                "direction": None,
                "nearby_road": None,
                "nearby_destination": None,
                "description": None,
                "source_id": demo_source.id,
                "verification_status": "DEMO",
            },
        )

        facilities = [
            ("TICKETING", "Ticket counter", concourse.id, True),
            ("SECURITY", "Security", concourse.id, True),
            ("LIFT", "Lift", concourse.id, True),
            ("WASHROOM", "Washroom", concourse.id, False),
            ("HELP_POINT", "Help point", concourse.id, False),
        ]
        for ftype, fname, level_id, paid in facilities:
            _upsert(
                db,
                Facility,
                {"station_id": station.id, "facility_type": ftype, "facility_name": fname},
                {
                    "level_id": level_id,
                    "quantity": None,
                    "location_description": None,
                    "arm": None,
                    "paid_area": paid,
                    "availability": "UNKNOWN",
                    "description": "Placeholder facility. Quantity and placement are not verified.",
                    "source_id": demo_source.id,
                    "verification_status": "DEMO",
                },
            )

        _upsert(
            db,
            Accessibility,
            {"station_id": station.id},
            {
                "wheelchair_access": None,
                "accessible_entrance": None,
                "accessible_gate": None,
                "accessible_lift": None,
                "accessible_escalator": None,
                "accessible_afc_gate": None,
                "tactile_flooring": None,
                "audio_announcements": None,
                "accessible_washroom": None,
                "wheelchair_support": None,
                "accessible_route": None,
                "source_id": demo_source.id,
                "verification_status": "DEMO",
                "notes": "Per-station accessibility values are stored as unverified until field-checked.",
            },
        )

        _upsert(
            db,
            StationBusConnection,
            {"station_id": station.id, "bus_stop_name": "Bus connection"},
            {
                "bus_route": None,
                "location_arm": None,
                "direction": None,
                "walking_distance": None,
                "source_id": demo_source.id,
                "verification_status": "DEMO",
                "notes": "No real bus route numbers are stored. Replace after authorized multimodal data is collected.",
            },
        )

        _upsert(
            db,
            NearbyDestination,
            {"station_id": station.id, "destination_name": "Nearby area"},
            {
                "category": "OTHER",
                "latitude": None,
                "longitude": None,
                "distance": None,
                "direction": None,
                "nearest_gate": None,
                "source_id": demo_source.id,
                "verification_status": "DEMO",
                "notes": "Placeholder only. Not a real POI for this station.",
            },
        )

        nodes = [
            ("N-ENTRANCE", "ENTRANCE", "Entrance", street.id),
            ("N-TICKET", "TICKET_COUNTER", "Ticket counter", concourse.id),
            ("N-SECURITY", "SECURITY", "Security", concourse.id),
            ("N-CONCOURSE", "CONCOURSE", "Concourse", concourse.id),
            ("N-PLATFORM", "PLATFORM", "Platform", platform_level.id),
            ("N-GATE", "GATE", "Exit", street.id),
        ]
        for node_id, node_type, name, level_id in nodes:
            _upsert(
                db,
                IndoorComponent,
                {"station_id": station.id, "node_id": node_id},
                {
                    "level_id": level_id,
                    "node_type": node_type,
                    "name": name,
                    "arm": None,
                    "description": None,
                    "accessible": None,
                    "latitude": None,
                    "longitude": None,
                    "x": None,
                    "y": None,
                    "source_id": demo_source.id,
                    "verification_status": "DEMO",
                },
            )

    seed_development_network(db, lines, demo_source.id)
    seed_development_indoor_maps(db, demo_source.id)
    _remove_legacy_demo_labels(db)
    db.commit()


def _remove_legacy_demo_labels(db: Session) -> None:
    db.execute(delete(Platform).where(Platform.platform_number.like("DEMO-%")))
    db.execute(delete(Gate).where(Gate.gate_code.like("DEMO-%")))
    db.execute(delete(Facility).where(Facility.facility_name.like("Demo %")))
    db.execute(delete(StationBusConnection).where(StationBusConnection.bus_stop_name.like("Demo %")))
    db.execute(delete(NearbyDestination).where(NearbyDestination.destination_name.like("Demo %")))
    db.flush()

