# Phase 8 — AI “I’m Lost” assistance

## 1. Objective

Help a passenger who is already inside a Hyderabad Metro station identify a **verified** indoor location from a sign photo or a short description, then continue in the existing Phase 7 position flow and Phase 5 indoor route engine.

AI may interpret language and OCR. It does **not** invent gates, distances, coordinates, or routes.

## 2. Existing architecture (reused)

- React + Vite frontend (`/im-lost`, `/navigation`, `/location`)
- FastAPI `/api` routers
- SQLAlchemy station + indoor graph
- Phase 5 A* (`POST /api/routes/indoor`)
- Phase 7 `PositionManager`, QR resolve, `savePendingPosition`
- Design tokens in `frontend/src/index.css`

No second graph, GPS indoor snap, or duplicate navigator.

There is no `station_signs` or `navigation_instructions` table. Matching uses stations, platforms, gates, facilities, levels, indoor nodes, and nearby destination **names** already in the database.

## 3. User flow

I’m Lost → Scan a station sign **or** Choose my location **or** Tell us what you see  
→ OCR / description extract  
→ verified match + confidence  
→ Continue navigation  
→ `savePendingPosition` (`VISION_POSITION`)  
→ `/navigation` origin + You marker + existing turn-by-turn

QR scan remains available as the Phase 7 precise option.

## 4. OCR architecture

`app/im_lost_ocr.py`

- JPEG / PNG / WebP, max 5 MB, magic-byte check  
- Images processed in memory and discarded  
- OpenAI vision if `OPENAI_API_KEY` is set  
- Else Tesseract if installed  
- Else a clear “couldn’t read the sign” result  

Returns `{ raw_text, confidence, detected_terms, engine, error }`.

## 5. AI architecture

`app/im_lost_interpret.py` extracts types such as `PLATFORM`, `EXIT`, `LIFT`.  
Optional OpenAI JSON extract for “tell us what you see”.  
`app/im_lost_assist.py` only restates **verified** match text.

## 6. Database matching

`app/im_lost_match.py` scores existing `IndoorNode` rows.

Statuses: `MATCH_FOUND`, `PARTIAL_MATCH`, `LOW_CONFIDENCE`, `NO_MATCH`, `NEEDS_MANUAL_LOCATION`.  
Confidence: `HIGH`, `MEDIUM`, `LOW`, `UNKNOWN`.

Unknown platforms (e.g. Platform 3 when only Platform 1/2 exist) are **not** created.

## 7. APIs added

| Method | Path |
| --- | --- |
| POST | `/api/im-lost/ocr` |
| POST | `/api/im-lost/analyze` |
| POST | `/api/im-lost/describe` |
| POST | `/api/im-lost/match` |
| POST | `/api/im-lost/assist` |
| GET | `/api/im-lost/station-context/{station_id}` |

No new tables. No image storage.

## 8. Phase 7 integration

Continue navigation writes session pending position. `/navigation` sets origin from that node and applies `pending.source` through `PositionManager`. One You marker. Off-route and arrival stay Phase 5–7.

## 9. Security / privacy

API keys stay in backend `.env`. Photos are not persisted. CORS unchanged.

## 10. Error handling

Camera denied → upload. Invalid image → 400. Unreadable OCR → try again / describe / manual. Multiple matches → pick a verified option.

## 11. Tests

`backend/tests/test_im_lost.py` covers station sign, platform sign, unreadable image, unknown text, destination-sign clarification, description, continue payload, invalid file, station context, no invented Platform 3.

## 12. Limitations

Without OpenAI or Tesseract, photos cannot be read; describe / QR / manual still work. Indoor graphs are schematic for most stations. GPS is not used as an indoor node.

## 13. Future

Field-verified `station_signs`, on-device OCR, Telugu/Hindi sign text, tighter destination-sign → line direction using verified connections only.
