from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import IndoorEdge, IndoorNode, Station
from app.seed import seed_demo_data
from app.seed_indoor import NODES


def test_ameerpet_indoor_map(client):
    payload = client.get("/api/stations/ameerpet/indoor-map")
    assert payload.status_code == 200
    body = payload.json()
    assert body["station"]["name"] == "Ameerpet"
    assert "Demo" not in body["station"]["name"]
    codes = {item["code"] for item in body["levels"]}
    assert codes == {"STREET", "CONCOURSE", "PLATFORM"}
    assert len(body["nodes"]) == len(NODES)
    assert all(node["x"] is not None and node["y"] is not None for node in body["nodes"])
    assert len(body["edges"]) >= 1
    assert len(body["map_metadata"]) == 3
    assert all(not node["name"].lower().startswith("demo") for node in body["nodes"])


def test_indoor_map_by_level(client):
    street = client.get("/api/stations/ameerpet/indoor-map/STREET")
    assert street.status_code == 200
    assert {node["node_type"] for node in street.json()["nodes"]} >= {"ENTRANCE", "EXIT", "LIFT", "STAIRS"}
    assert all(node["node_code"].startswith("ST-") for node in street.json()["nodes"])

    concourse = client.get("/api/stations/AMP/indoor-map/CONCOURSE")
    assert concourse.status_code == 200
    types = {node["node_type"] for node in concourse.json()["nodes"]}
    assert {"AFC_GATE", "TICKET_COUNTER", "SECURITY", "INTERCHANGE"} <= types

    platform = client.get("/api/stations/ameerpet/indoor-map/PLATFORM")
    assert platform.status_code == 200
    assert any(node["name"] == "Platform 1" for node in platform.json()["nodes"])
    assert any(node["name"] == "Platform 2" for node in platform.json()["nodes"])


def test_indoor_lists_and_errors(client):
    assert client.get("/api/stations/ameerpet/indoor-nodes").status_code == 200
    assert client.get("/api/stations/ameerpet/indoor-edges").status_code == 200
    assert client.get("/api/stations/ameerpet/map-metadata").status_code == 200
    assert client.get("/api/stations/not-a-station/indoor-map").status_code == 404
    assert client.get("/api/stations/ameerpet/indoor-map/basement").status_code == 404


def test_phase2_and_phase3_still_work(client):
    assert client.get("/api/lines").status_code == 200
    assert client.get("/api/stations").status_code == 200
    assert client.get("/api/stations/ameerpet").status_code == 200
    assert client.get("/api/stations/ameerpet/platforms").status_code == 200
    assert client.get("/api/stations/ameerpet/gates").status_code == 200
    assert client.get("/api/stations/ameerpet/facilities").status_code == 200
    assert client.get("/api/stations/ameerpet/accessibility").status_code == 200
    assert client.get("/api/stations/ameerpet/nearby-destinations").status_code == 200
    assert client.get("/api/stations/ameerpet/indoor-components").status_code == 200
    assert client.get("/api/network").status_code == 200
    assert client.get("/api/network/lines/red").status_code == 200
    assert client.get("/api/network/interchanges").status_code == 200
    assert client.get("/api/network/terminals").status_code == 200
    assert client.get("/api/stations/ameerpet/connections").status_code == 200


def test_indoor_seed_is_idempotent(client):
    db = SessionLocal()
    try:
        stations_before = db.scalar(select(func.count()).select_from(Station))
        nodes_before = db.scalar(select(func.count()).select_from(IndoorNode))
        edges_before = db.scalar(select(func.count()).select_from(IndoorEdge))
        seed_demo_data(db)
        assert db.scalar(select(func.count()).select_from(Station)) == stations_before == 20
        amp = db.scalar(select(Station).where(Station.station_code == "AMP"))
        assert (
            db.scalar(select(func.count()).select_from(IndoorNode).where(IndoorNode.station_id == amp.id))
            == len(NODES)
        )
        assert db.scalar(select(func.count()).select_from(IndoorNode)) == nodes_before
        assert db.scalar(select(func.count()).select_from(IndoorEdge)) == edges_before
    finally:
        db.close()
