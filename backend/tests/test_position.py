from app.pathfinding import match_position_to_route


def test_position_markers_and_resolve(client):
    listed = client.get("/api/stations/ameerpet/position-markers")
    assert listed.status_code == 200
    body = listed.json()
    assert body["station"]["name"] == "Ameerpet"
    assert len(body["markers"]) > 0
    assert all("DEVELOPMENT" not in (item["label"] or "") for item in body["markers"])
    code = next(item["marker_code"] for item in body["markers"] if item["node"]["node_code"] == "ST-ENT")
    assert code.startswith("MW-")

    missing = client.post("/api/position/resolve", json={"markerCode": "NO-SUCH-MARKER"})
    assert missing.status_code == 200
    assert missing.json()["valid"] is False
    assert missing.json()["reason"] == "POSITION_MARKER_NOT_FOUND"

    ok = client.post("/api/position/resolve", json={"markerCode": code})
    assert ok.status_code == 200
    resolved = ok.json()
    assert resolved["valid"] is True
    assert resolved["source"] == "QR_POSITION"
    assert resolved["nodeName"] == "Entrance"
    assert resolved["latitude"] is None
    assert "DEVELOPMENT" not in str(resolved)

    payload = client.post(
        "/api/position/resolve",
        json={
            "payload": {
                "type": "METROWAY_POSITION",
                "version": 1,
                "stationId": "ameerpet",
                "levelId": "STREET",
                "nodeId": "ST-ENT",
                "markerId": code,
            }
        },
    )
    assert payload.status_code == 200
    assert payload.json()["valid"] is True
    assert payload.json()["nodeId"] == resolved["nodeId"]

    mismatch = client.post(
        "/api/position/resolve",
        json={
            "payload": {
                "type": "METROWAY_POSITION",
                "version": 1,
                "stationId": "begumpet",
                "levelId": "STREET",
                "nodeId": "ST-ENT",
                "markerId": code,
            }
        },
    )
    assert mismatch.json()["valid"] is False
    assert mismatch.json()["reason"] == "POSITION_MARKER_MISMATCH"

    bogus_type = client.post(
        "/api/position/resolve",
        json={"payload": {"type": "OTHER", "version": 1, "markerId": code}},
    )
    assert bogus_type.json()["valid"] is False

    detail = client.get(f"/api/position-markers/{code}")
    assert detail.status_code == 200
    assert detail.json()["marker_code"] == code


def test_position_markers_multi_station(client):
    for station_key in ("begumpet", "kukatpally", "hitec", "miyapur"):
        response = client.get(f"/api/stations/{station_key}/position-markers")
        assert response.status_code == 200, station_key
        markers = response.json()["markers"]
        assert markers
        code = next(item["marker_code"] for item in markers if item["node"]["node_code"] == "ST-ENT")
        resolved = client.post("/api/position/resolve", json={"marker_code": code}).json()
        assert resolved["valid"] is True, station_key
        assert resolved["nodeName"] == "Entrance"


def test_match_position_to_route_states():
    route = ["a", "b", "c"]
    assert match_position_to_route("b", route, destination_node_id="c") == "ON_ROUTE"
    assert match_position_to_route("c", route, destination_node_id="c") == "DESTINATION"
    assert match_position_to_route("z", route, destination_node_id="c") == "OFF_ROUTE"
    assert match_position_to_route("z", route, destination_node_id="c", neighbor_node_ids={"z"}) == "NEAR_ROUTE"
    assert match_position_to_route(None, route) == "UNKNOWN"


def test_phase5_route_still_works_with_positioning(client):
    body = client.post(
        "/api/routes/indoor",
        json={"station_id": "kukatpally", "start_node_id": "ST-ENT", "destination_node_id": "CC-TICKET"},
    ).json()
    assert body["route_found"] is True
    assert body["steps"][0]["action"] == "START"
    assert body["steps"][-1]["action"] == "ARRIVE"
