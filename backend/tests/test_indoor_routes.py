from app.pathfinding import GraphEdge, GraphNode, IndoorGraph, astar, turn_label


def _node(**kwargs):
    defaults = dict(
        station_id="s1",
        level_id="l1",
        level_code="STREET",
        level_name="Street",
        level_order=1,
        node_code="N",
        node_type="WAYPOINT",
        name="Node",
        x=0.0,
        y=0.0,
        accessible=True,
        data_status="DEVELOPMENT",
    )
    defaults.update(kwargs)
    return GraphNode(id=defaults.pop("id"), **defaults)


def _edge(fid, tid, connection="WALK", accessible=True, bidirectional=True, **kwargs):
    return GraphEdge(
        id=f"{fid}-{tid}",
        from_node_id=fid,
        to_node_id=tid,
        connection_type=connection,
        distance_m=kwargs.get("distance_m"),
        estimated_time_sec=kwargs.get("estimated_time_sec"),
        accessible=accessible,
        bidirectional=bidirectional,
        data_status="DEVELOPMENT",
    )


def test_astar_simple_and_multi_node():
    graph = IndoorGraph()
    graph.add_node(_node(id="a", x=0, y=0, name="A"))
    graph.add_node(_node(id="b", x=10, y=0, name="B"))
    graph.add_node(_node(id="c", x=20, y=0, name="C"))
    graph.add_edge(_edge("a", "b", estimated_time_sec=5))
    graph.add_edge(_edge("b", "c", estimated_time_sec=7))
    path = astar(graph, "a", "c")
    assert [item[0] for item in path] == ["a", "b", "c"]
    assert path[1][1].estimated_time_sec == 5
    assert path[2][1].estimated_time_sec == 7


def test_astar_no_path():
    graph = IndoorGraph()
    graph.add_node(_node(id="a"))
    graph.add_node(_node(id="b"))
    assert astar(graph, "a", "b") == []


def test_accessible_excludes_inaccessible_edge():
    graph = IndoorGraph()
    graph.add_node(_node(id="a", accessible=True))
    graph.add_node(_node(id="b", accessible=True))
    graph.add_edge(_edge("a", "b", accessible=False))
    assert astar(graph, "a", "b", accessible_only=True) == []
    assert [item[0] for item in astar(graph, "a", "b")] == ["a", "b"]


def test_turn_label_left_right():
    a = _node(id="a", x=0, y=0)
    b = _node(id="b", x=10, y=0)
    left = _node(id="c", x=10, y=-10)
    right = _node(id="d", x=10, y=10)
    assert turn_label(a, b, left) == "LEFT"
    assert turn_label(a, b, right) == "RIGHT"


def test_indoor_routes_gate_to_platforms(client):
    station = client.get("/api/stations/ameerpet").json()
    for dest, expected in (("PL-1", "Platform 1"), ("PL-2", "Platform 2"), ("CC-HALL", "Concourse")):
        response = client.post(
            "/api/routes/indoor",
            json={
                "station_id": station["id"],
                "start_node_id": "ST-GATE",
                "destination_node_id": dest,
            },
        )
        assert response.status_code == 200, dest
        body = response.json()
        assert body["route_found"] is True
        assert body["start"]["name"] == "Gate 1"
        assert body["destination"]["name"] == expected
        assert body["nodes"][0]["node_code"] == "ST-GATE"
        assert body["nodes"][-1]["node_code"] == dest
        assert len(body["nodes"]) > 2
        assert len(body["edges"]) == len(body["nodes"]) - 1
        assert body["steps"][0]["action"] == "START"
        assert body["steps"][-1]["action"] == "ARRIVE"
        assert body["total_distance_m"] is None
        assert body["estimated_time_sec"] is None


def test_platform_three_does_not_exist(client):
    station = client.get("/api/stations/ameerpet").json()
    response = client.post(
        "/api/routes/indoor",
        json={"station_id": station["id"], "start_node_id": "CC-HALL", "destination_node_id": "PL-3"},
    )
    assert response.status_code == 404
    assert response.json()["detail"]["reason"] == "DESTINATION_NODE_NOT_FOUND"


def test_route_errors_and_accessible(client):
    station = client.get("/api/stations/ameerpet").json()
    missing_start = client.post(
        "/api/routes/indoor",
        json={"station_id": station["id"], "start_node_id": "NOPE", "destination_node_id": "PL-1"},
    )
    assert missing_start.status_code == 404
    assert missing_start.json()["detail"]["reason"] == "START_NODE_NOT_FOUND"

    missing_dest = client.post(
        "/api/routes/indoor",
        json={"station_id": station["id"], "start_node_id": "ST-GATE", "destination_node_id": "NOPE"},
    )
    assert missing_dest.status_code == 404

    other = next(item for item in client.get("/api/stations").json() if item["station_code"] != "AMP")
    cross = client.post(
        "/api/routes/indoor",
        json={"station_id": station["id"], "start_node_id": "ST-GATE", "destination_node_id": other["id"]},
    )
    assert cross.status_code == 404

    unknown_station = client.post(
        "/api/routes/indoor",
        json={"station_id": "not-a-station", "start_node_id": "ST-GATE", "destination_node_id": "PL-1"},
    )
    assert unknown_station.status_code == 404
    assert unknown_station.json()["detail"]["reason"] == "INVALID_STATION"

    accessible = client.post(
        "/api/routes/indoor",
        json={
            "station_id": station["id"],
            "start_node_id": "ST-ENT",
            "destination_node_id": "PL-1",
            "accessible_only": True,
        },
    )
    assert accessible.status_code == 200
    body = accessible.json()
    assert body["route_found"] is True
    assert all(edge["accessible"] is True for edge in body["edges"])
    assert "LIFT" in {edge["connection_type"] for edge in body["edges"]}
    assert "STAIRS" not in {edge["connection_type"] for edge in body["edges"]}

    blocked = client.post(
        "/api/routes/indoor",
        json={
            "station_id": station["id"],
            "start_node_id": "ST-GATE",
            "destination_node_id": "PL-1",
            "accessible_only": True,
        },
    )
    assert blocked.status_code == 200
    assert blocked.json()["route_found"] is False
    assert blocked.json()["reason"] == "ACCESSIBLE_ROUTE_NOT_AVAILABLE"


def test_level_transitions_and_connection_types(client):
    station = client.get("/api/stations/ameerpet").json()
    body = client.post(
        "/api/routes/indoor",
        json={"station_id": station["id"], "start_node_id": "ST-ENT", "destination_node_id": "PL-1"},
    ).json()
    actions = {step["action"] for step in body["steps"]}
    types = {edge["connection_type"] for edge in body["edges"]}
    levels = [node["level"] for node in body["nodes"]]
    assert "STREET" in levels and "CONCOURSE" in levels and "PLATFORM" in levels
    assert types & {"STAIRS", "ESCALATOR", "LIFT", "WALK"}
    assert actions & {"TAKE_STAIRS", "TAKE_ESCALATOR", "TAKE_LIFT"}
    assert body["steps"][0]["text"].startswith("Start at")


def test_route_regression_phase2_3_4(client):
    assert client.get("/api/lines").status_code == 200
    assert client.get("/api/stations").status_code == 200
    assert client.get("/api/stations/ameerpet").status_code == 200
    assert client.get("/api/stations/ameerpet/platforms").status_code == 200
    assert client.get("/api/stations/ameerpet/gates").status_code == 200
    assert client.get("/api/stations/ameerpet/facilities").status_code == 200
    assert client.get("/api/stations/ameerpet/accessibility").status_code == 200
    assert client.get("/api/stations/ameerpet/nearby-destinations").status_code == 200
    assert client.get("/api/network").status_code == 200
    assert client.get("/api/network/lines/red").status_code == 200
    assert client.get("/api/stations/ameerpet/connections").status_code == 200
    assert client.get("/api/network/interchanges").status_code == 200
    assert client.get("/api/network/terminals").status_code == 200
    indoor = client.get("/api/stations/ameerpet/indoor-map")
    assert indoor.status_code == 200
    assert client.get("/api/stations/ameerpet/indoor-map/STREET").status_code == 200
    assert client.get("/api/stations/ameerpet/indoor-nodes").status_code == 200
    assert client.get("/api/stations/ameerpet/indoor-edges").status_code == 200
    assert client.get("/api/stations/ameerpet/map-metadata").status_code == 200
    from sqlalchemy import func, select
    from app.database import SessionLocal
    from app.models import IndoorEdge, IndoorNode, Station
    from app.seed import seed_demo_data

    db = SessionLocal()
    try:
        stations = db.scalar(select(func.count()).select_from(Station))
        nodes = db.scalar(select(func.count()).select_from(IndoorNode))
        edges = db.scalar(select(func.count()).select_from(IndoorEdge))
        seed_demo_data(db)
        assert db.scalar(select(func.count()).select_from(Station)) == stations == 20
        assert db.scalar(select(func.count()).select_from(IndoorNode)) == nodes
        assert db.scalar(select(func.count()).select_from(IndoorEdge)) == edges
    finally:
        db.close()


def test_begumpet_entrance_to_concourse_and_ticket(client):
    station = client.get("/api/stations/begumpet").json()
    first = client.post(
        "/api/routes/indoor",
        json={"station_id": station["id"], "start_node_id": "ST-ENT", "destination_node_id": "CC-HALL"},
    )
    assert first.status_code == 200
    body = first.json()
    assert body["route_found"] is True
    assert body["start"]["name"] == "Entrance"
    assert body["destination"]["name"] == "Concourse"
    names = [item["name"] for item in body["nodes"]]
    assert names[0] == "Entrance"
    assert "Waypoint" in names
    assert names[-1] == "Concourse"
    assert len(body["edges"]) == len(body["nodes"]) - 1

    second = client.post(
        "/api/routes/indoor",
        json={"station_id": "begumpet", "start_node_id": "ST-ENT", "destination_node_id": "CC-TICKET"},
    )
    assert second.status_code == 200
    other = second.json()
    assert other["route_found"] is True
    assert other["destination"]["name"] == "Ticket counter"
    assert [item["node_id"] for item in body["nodes"]] != [item["node_id"] for item in other["nodes"]]


def test_steps_have_indexes_and_no_invented_distance(client):
    from app.pathfinding import check_user_on_route

    body = client.post(
        "/api/routes/indoor",
        json={"station_id": "begumpet", "start_node_id": "ST-ENT", "destination_node_id": "CC-HALL"},
    ).json()
    steps = body["steps"]
    assert steps[0]["step_index"] == 1
    assert steps[0]["instruction_type"] == "START"
    assert steps[-1]["instruction_type"] == "ARRIVE"
    for step in steps:
        assert " m" not in (step["instruction_text"] or "") or step["distance_m"] is not None
        assert step["distance_m"] is None
    ids = [item["node_id"] for item in body["nodes"]]
    assert check_user_on_route(ids, ids[0]) == "ON_ROUTE"
    assert check_user_on_route(ids, "missing") == "OFF_ROUTE"


def test_turn_by_turn_stations(client):
    cases = (
        ("begumpet", "ST-ENT", "CC-HALL"),
        ("ameerpet", "ST-ENT", "PL-1"),
        ("hitec", "ST-ENT", "CC-HALL"),
        ("miyapur", "ST-ENT", "CC-HALL"),
        ("kukatpally", "ST-ENT", "CC-TICKET"),
    )
    for station_key, start, dest in cases:
        response = client.post(
            "/api/routes/indoor",
            json={"station_id": station_key, "start_node_id": start, "destination_node_id": dest},
        )
        assert response.status_code == 200, station_key
        body = response.json()
        assert body["route_found"] is True, station_key
        assert body["steps"][0]["action"] == "START"
        assert body["steps"][-1]["action"] == "ARRIVE"
        assert len(body["steps"]) >= 3
        for step in body["steps"]:
            assert step.get("voice_instruction")
            assert " m" not in (step["instruction_text"] or "") or step["distance_m"] is not None
        if station_key == "ameerpet":
            levels = {node["level"] for node in body["nodes"]}
            assert {"STREET", "CONCOURSE", "PLATFORM"} <= levels


def test_voice_instruction_uses_meters_only_with_distance():
    from app.pathfinding import GraphEdge, GraphNode, instruction_for_edge, voice_instruction_from

    origin = GraphNode(
        id="a",
        station_id="s",
        level_id="l",
        level_code="STREET",
        level_name="Street",
        level_order=1,
        node_code="A",
        node_type="ENTRANCE",
        name="Entrance",
        x=0,
        y=0,
        accessible=True,
        data_status="DEVELOPMENT",
    )
    dest = GraphNode(
        id="b",
        station_id="s",
        level_id="l",
        level_code="STREET",
        level_name="Street",
        level_order=1,
        node_code="B",
        node_type="WAYPOINT",
        name="Waypoint",
        x=10,
        y=0,
        accessible=True,
        data_status="DEVELOPMENT",
    )
    with_distance = GraphEdge(
        id="e",
        from_node_id="a",
        to_node_id="b",
        connection_type="WALK",
        distance_m=5,
        estimated_time_sec=None,
        accessible=True,
        bidirectional=True,
        data_status="DEVELOPMENT",
    )
    without = GraphEdge(
        id="e2",
        from_node_id="a",
        to_node_id="b",
        connection_type="WALK",
        distance_m=None,
        estimated_time_sec=None,
        accessible=True,
        bidirectional=True,
        data_status="DEVELOPMENT",
    )
    measured = instruction_for_edge(origin, dest, with_distance, None)
    assert measured["distance_m"] == 5
    assert "5 m" in measured["instruction_text"]
    assert "5 meters" in measured["voice_instruction"]
    missing = instruction_for_edge(origin, dest, without, None)
    assert missing["distance_m"] is None
    assert " m" not in missing["instruction_text"]
    assert voice_instruction_from("Walk straight for 5 m.") == "Walk straight for 5 meters."
