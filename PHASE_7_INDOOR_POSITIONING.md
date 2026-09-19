# Phase 7 — Indoor positioning and live navigation

## 1. Objective

Add user positioning to the existing Phase 6 turn-by-turn screen. Manual Next/Back remain. Live mode updates the current indoor node from QR (primary), GPS (approximate only), or a selected indoor node (fallback).

## 2. Position providers

`PositionManager` normalizes:

- `QR_POSITION` — precise indoor node after backend validation
- `GPS_POSITION` — latitude, longitude, accuracy; **never snapped to a gate/platform/node**
- `MANUAL_POSITION` — selected indoor node
- Reserved: `BLE_POSITION`, `UWB_POSITION` (not implemented)

## 3. QR positioning

QR payload:

```json
{
  "type": "METROWAY_POSITION",
  "version": 1,
  "stationId": "ameerpet",
  "levelId": "STREET",
  "nodeId": "ST-ENT",
  "markerId": "MW-AMP-ST-ENT"
}
```

The camera does not trust this payload. `POST /api/position/resolve` looks up `markerId` in `position_markers` and checks station, level, node, and active status.

## 4. GPS positioning

`navigator.geolocation.watchPosition`. Denied, timeout, and unsupported states show a message and leave QR/manual available. Accuracy may be shown. Indoor nodes are not inferred from GPS.

## 5. Manual positioning

“Select current location” lists indoor nodes for the selected station. This is the development/testing path. The UI does not call it fake GPS.

## 6–7. Data model

Table `position_markers`: station, level, node, `marker_type` (QR), `marker_code`, `label`, `status`, internal `data_status`. Development rows are allowed; **DEVELOPMENT is not shown** in the navigation UI.

## 8–9. Resolution and matching

- `GET /api/stations/{id}/position-markers`
- `GET /api/position-markers/{markerCode}`
- `POST /api/position/resolve`
- `POST /api/routes/indoor` (unchanged)

`matchPositionToRoute`: `ON_ROUTE` / `NEAR_ROUTE` / `OFF_ROUTE` / `DESTINATION`.

Live mode maps a route node to a step index and advances automatically. The same QR scanned twice only refreshes the timestamp.

## 10–12. Off-route and reroute

Off-route shows a confirmation: Recalculate route. That calls Phase 5 from the current node to the existing destination. No AI “I’m Lost”.

## 13. Map

The YOU marker uses `currentUserNodeId` coordinates from `indoor_nodes`. No station-specific coordinates.

## 14. Permissions

Camera denied: “Camera access is required…” plus Try again and manual select. Desktop without camera: scan on a phone or choose a location.

## 15. Security

Arbitrary QR text is rejected. Payload station/node must match the database marker.

## 16. Development data

One QR marker per indoor node: `MW-{station_code}-{node_code}`. Replace later with `data_status = VERIFIED` without changing the API.

## 17. Testing

API: resolve valid/invalid/mismatch; markers for Ameerpet, Begumpet, Kukatpally, HITEC City, Miyapur; Phase 5 route still works.

## 18. Limitations

- Physical QR stickers are not installed; scan JSON payloads or use Select current location
- GPS is not indoor-precise
- BLE/UWB not implemented
- No continuous tracking without a new scan, GPS fix, or manual select

## 19. Future BLE/UWB

Add providers that emit the same `NormalizedPosition`. Do not change Phase 5/6 contracts.

## 20. Phase 8

Expose `currentUserNodeId`, `currentLevel`, `destinationNodeId`, route, `offRoute`, last position, `positionSource`. Do not generate an AI explanation here.
