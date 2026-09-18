from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import Station
from app.seed import seed_demo_data


def test_health(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_lines_and_stations(client):
    lines = client.get("/api/lines")
    assert lines.status_code == 200
    codes = {item["line_code"] for item in lines.json()}
    assert codes == {"RED", "BLUE", "GREEN"}

    stations = client.get("/api/stations")
    assert stations.status_code == 200
    assert len(stations.json()) == 20
    ameerpet = next(item for item in stations.json() if item["station_code"] == "AMP")
    assert ameerpet["is_interchange"] is True
    assert set(ameerpet["lines"]) == {"Red", "Blue"}
    assert ameerpet["verification_status"] == "DEMO"


def test_search_and_line_filter(client):
    search = client.get("/api/stations/search", params={"q": "ameer"})
    assert search.status_code == 200
    assert search.json()[0]["station_code"] == "AMP"

    red = client.get("/api/stations", params={"line": "Red"})
    assert red.status_code == 200
    assert all("Red" in item["lines"] for item in red.json())


def test_station_nested_resources(client):
    detail = client.get("/api/stations/ameerpet")
    assert detail.status_code == 200
    station_id = detail.json()["id"]
    for path in (
        "platforms",
        "gates",
        "levels",
        "facilities",
        "accessibility",
        "bus-connections",
        "nearby-destinations",
        "indoor-components",
    ):
        response = client.get(f"/api/stations/{station_id}/{path}")
        assert response.status_code == 200, path
        assert len(response.json()) >= 1

    code_lookup = client.get("/api/stations/AMP")
    assert code_lookup.status_code == 200
    assert code_lookup.json()["station_name"] == "Ameerpet"


def test_user_facing_names_are_not_prefixed_with_demo(client):
    indoor = client.get("/api/stations/ameerpet/indoor-components").json()
    platforms = client.get("/api/stations/ameerpet/platforms").json()
    gates = client.get("/api/stations/ameerpet/gates").json()
    facilities = client.get("/api/stations/ameerpet/facilities").json()
    for item in indoor:
        assert not item["name"].lower().startswith("demo")
        assert "DEMO" not in item["name"]
    for item in platforms:
        assert not item["platform_number"].lower().startswith("demo")
        assert "DEMO" not in item["platform_number"]
    for item in gates:
        assert not (item["gate_name"] or "").lower().startswith("demo")
        assert "DEMO" not in (item["gate_code"] or "")
    for item in facilities:
        assert not item["facility_name"].lower().startswith("demo")


def test_seed_is_idempotent(client):
    db = SessionLocal()
    try:
        before = db.scalar(select(func.count()).select_from(Station))
        seed_demo_data(db)
        after = db.scalar(select(func.count()).select_from(Station))
        assert before == after == 20
    finally:
        db.close()
