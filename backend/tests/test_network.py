from sqlalchemy import func, select

from app.database import SessionLocal
from app.models import Station, StationConnection
from app.seed import seed_demo_data


def test_network_line_sequence_from_api(client):
    for line_id in ("red", "RED", "Red"):
        red = client.get(f"/api/network/lines/{line_id}")
        assert red.status_code == 200, line_id
        names = [item["name"] for item in red.json()["stations"]]
        assert names == [
            "Miyapur",
            "JNTU College",
            "KPHB Colony",
            "Kukatpally",
            "Ameerpet",
            "M.G. Bus Station",
            "LB Nagar",
        ]
        assert [item["sequence"] for item in red.json()["stations"]] == [1, 2, 3, 4, 5, 6, 7]
        assert red.json()["origin_station"] == "Miyapur"
        assert red.json()["terminal_station"] == "LB Nagar"


def test_blue_and_green_lines(client):
    blue = client.get("/api/network/lines/blue").json()["stations"]
    assert [item["name"] for item in blue] == [
        "Nagole",
        "Uppal",
        "Parade Ground",
        "Ameerpet",
        "Madhapur",
        "HITEC City",
        "Raidurg",
    ]
    green = client.get("/api/network/lines/green").json()["stations"]
    assert [item["name"] for item in green][0] == "Parade Ground"
    assert [item["name"] for item in green][-1] == "M.G. Bus Station"


def test_ameerpet_neighbors_are_bidirectional_development_hops(client):
    payload = client.get("/api/stations/ameerpet/connections").json()
    assert payload["station"] == "Ameerpet"
    lines = {item["line"]: item for item in payload["connections"]}
    assert "Red Line" in lines
    assert "Blue Line" in lines
    assert lines["Red Line"]["previous_station"]["name"] == "Kukatpally"
    assert lines["Red Line"]["next_station"]["name"] == "M.G. Bus Station"
    assert lines["Blue Line"]["previous_station"]["name"] == "Parade Ground"
    assert lines["Blue Line"]["next_station"]["name"] == "Madhapur"


def test_interchanges_and_terminals(client):
    payload = client.get("/api/network/interchanges").json()
    ameerpet = next(item for item in payload["interchanges"] if item["station_code"] == "AMP")
    assert set(ameerpet["lines"]) == {"Red Line", "Blue Line"}
    mgbs = next(item for item in payload["interchanges"] if item["station_code"] == "MGB")
    assert set(mgbs["lines"]) == {"Green Line", "Red Line"}

    terminals = {item["line"]: item for item in client.get("/api/network/terminals").json()}
    assert terminals["Red Line"]["origin"] == "Miyapur"
    assert terminals["Red Line"]["terminal"] == "LB Nagar"
    assert terminals["Blue Line"]["origin"] == "Nagole"
    assert terminals["Blue Line"]["terminal"] == "Raidurg"
    assert terminals["Green Line"]["origin"] == "Parade Ground"
    assert terminals["Green Line"]["terminal"] == "M.G. Bus Station"


def test_network_payload_and_not_found(client):
    network = client.get("/api/network")
    assert network.status_code == 200
    red = next(item for item in network.json()["lines"] if item["code"] == "RED")
    assert red["connections"][0]["from_station_name"] == "Miyapur"
    assert red["connections"][0]["to_station_name"] == "JNTU College"
    assert "Demo" not in red["stations"][0]["name"]
    assert client.get("/api/network/lines/yellow").status_code == 404
    assert client.get("/api/stations/not-a-station/connections").status_code == 404


def test_connection_seed_is_idempotent(client):
    db = SessionLocal()
    try:
        before = db.scalar(select(func.count()).select_from(StationConnection))
        seed_demo_data(db)
        after = db.scalar(select(func.count()).select_from(StationConnection))
        assert before == after
        assert db.scalar(select(func.count()).select_from(Station)) == 20
    finally:
        db.close()
