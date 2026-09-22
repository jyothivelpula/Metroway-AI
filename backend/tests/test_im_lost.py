from app.im_lost_interpret import interpret_sign_text


def test_clear_station_sign(client):
    body = client.post("/api/im-lost/match", json={"text": "Ameerpet"}).json()
    assert body["station"]["station_name"] == "Ameerpet"
    assert body["status"] in {"MATCH_FOUND", "PARTIAL_MATCH"}
    assert "DEVELOPMENT" not in (body.get("explanation") or "")


def test_platform_sign(client):
    body = client.post("/api/im-lost/match", json={"text": "Platform 2 — Raidurg"}).json()
    assert body["status"] == "MATCH_FOUND"
    assert body["confidence"] in {"HIGH", "MEDIUM"}
    assert body["node"]["name"] == "Platform 2"
    assert body["can_continue"] is True
    assert body["station"]["station_name"] == "Ameerpet"


def test_low_quality_ocr_image(client):
    png = bytes.fromhex(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
        "0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
    )
    response = client.post("/api/im-lost/analyze", files={"file": ("sign.png", png, "image/png")})
    assert response.status_code == 200
    body = response.json()
    assert body["can_continue"] is False
    assert body["confidence"] in {"LOW", "UNKNOWN"}


def test_unknown_text(client):
    body = client.post("/api/im-lost/match", json={"text": "purple spaceship hangar"}).json()
    assert body["status"] == "NO_MATCH"
    assert body["can_continue"] is False


def test_multiple_station_possibilities(client):
    body = client.post("/api/im-lost/describe", json={"message": "I see signs for Raidurg."}).json()
    assert body["status"] == "NEEDS_MANUAL_LOCATION"
    assert body["node"] is None


def test_manual_description_observations(client):
    parsed = interpret_sign_text("I see a lift and Platform 2.", ["Ameerpet", "Miyapur"])
    assert parsed["platform_hint"] == "P02"
    assert parsed["type"] == "PLATFORM"
    body = client.post("/api/im-lost/describe", json={"message": "I see a lift and Platform 2."}).json()
    assert body["node"]["name"] == "Platform 2"
    assert body["can_continue"] is True


def test_match_sets_phase7_node(client):
    body = client.post("/api/im-lost/match", json={"text": "Ameerpet Platform 2"}).json()
    assert body["node_id"]
    assert body["next_action"]["type"] == "CONTINUE_NAVIGATION"


def test_invalid_image(client):
    response = client.post("/api/im-lost/ocr", files={"file": ("a.txt", b"hello", "text/plain")})
    assert response.status_code == 400


def test_station_context(client):
    response = client.get("/api/im-lost/station-context/ameerpet")
    assert response.status_code == 200
    assert response.json()["station"]["station_name"] == "Ameerpet"
    assert response.json()["nodes"]


def test_does_not_invent_platform_three(client):
    body = client.post("/api/im-lost/match", json={"text": "Platform 3 — Raidurg at Ameerpet"}).json()
    if body.get("node"):
        assert body["node"]["name"] != "Platform 3"
    else:
        assert body["status"] in {"PARTIAL_MATCH", "LOW_CONFIDENCE", "NO_MATCH", "NEEDS_MANUAL_LOCATION"}
