

# 1. Project Overview

Project name:
MetroWay AI

Tagline:
"Don't just know your platform. Know your way."

Purpose:
MetroWay AI is an indoor wayfinding assistant for Hyderabad Metro passengers. It helps users who are already inside a metro station find their way to a platform, exit gate, facility, lift, escalator, stairs, or other destination inside the station.

The application is NOT primarily another metro route planner.

Its primary problem is:

"I am already inside the station. I know where I want to go, but I don't know how to physically reach it."

The application should eventually support:

* Manual station selection
* Optional current-location detection
* Station directory
* Hyderabad Metro network map
* Indoor station maps
* Step-by-step indoor navigation
* Platform navigation
* Exit/gate navigation
* Facility navigation
* Accessibility-aware routing
* QR-based positioning
* AI-assisted "I'm Lost"
* Camera/image recognition
* OCR
* Voice guidance
* Multilingual support
* Saved destinations
* Future expansion to all Hyderabad Metro stations

# 2. Problem Statement

Explain the passenger problem clearly:

* Users may enter a station but not know the correct direction.
* Users may know their platform number but not know how to reach it.
* Users may not know which exit gate is best for their destination.
* Large/interchange stations can create confusion.
* Asking other passengers for directions is unreliable.
* Existing metro apps mainly focus on journey planning, ticketing, fares, station information and related services.
* MetroWay AI focuses specifically on indoor wayfinding.

Do NOT claim that no existing indoor navigation solution exists.

Explain that the product opportunity is to provide a Hyderabad-focused indoor wayfinding experience.

# 3. Target Users

Include:

* Daily metro passengers
* First-time passengers
* Tourists
* Senior citizens
* Users with accessibility requirements
* Passengers unfamiliar with large interchange stations
* Users who are confused after entering a station

# 4. Core User Journey

Document this flow:

Home
→ Select station or use optional location
→ Select current location
→ Select destination
→ Calculate indoor route
→ Display map
→ Display step-by-step instructions
→ Optional voice guidance
→ Reach destination

Also document:

I'm Lost
→ User provides photo / scans QR / manually selects location
→ System determines probable location
→ User confirms if necessary
→ Navigation engine calculates verified route
→ Navigation begins

# 5. Complete Feature List

Organize features into:

## Dashboard

* Search
* Where do you want to go?
* Find Station
* Start Navigation
* Find Exit
* Recent searches
* Saved places
* Nearby station
* Metro map
* Notifications/settings

## Station Directory

* Station search
* Line
* Station details
* Platforms
* Gates
* Facilities
* Accessibility information

## Metro Network Map

* Hyderabad Metro stations
* Lines
* Interchange stations
* Station selection
* Station details

## Indoor Navigation

* Station levels
* Entrances
* Ticket counters
* Security
* Concourse
* Platforms
* Gates
* Lifts
* Escalators
* Stairs
* Facilities
* Step-by-step routes

## Navigation

* Current location
* Destination
* Distance
* Estimated time
* Turn-by-turn instructions
* Previous/next instruction
* Route visualization
* Voice guidance

## Location

* Optional GPS
* Manual station selection
* QR location markers
* Future indoor positioning technologies

## AI "I'm Lost"

* Camera/photo input
* Vision
* OCR
* Sign recognition
* Landmark recognition
* Location confidence
* Manual confirmation
* AI conversational assistance

## Accessibility

* Wheelchair-friendly route
* Avoid stairs
* Prefer lifts
* Prefer ramps
* Senior-friendly routing
* Future accessibility preferences

## Languages

Plan for:

* English
* Telugu
* Hindi

# 6. System Architecture

Include a complete Mermaid architecture diagram covering:

Passenger
→ React Frontend
→ FastAPI Backend
→ Services
→ Navigation Engine
→ AI Layer
→ PostgreSQL
→ External services

The architecture must clearly separate:

* Frontend
* Backend
* AI
* Navigation
* Location
* Database
* External services

Use this principle:

AI assists with understanding, vision, OCR and conversational assistance.

The deterministic navigation engine is responsible for generating physical routes.

AI must NOT hallucinate or invent physical station routes.

# 7. Frontend Architecture

Technology:

* React
* Vite
* TypeScript
* Tailwind CSS
* React Router

Explain the planned frontend pages/components.

Suggested pages:

* Home
* Stations
* Station Details
* Metro Map
* Current Location
* Destination
* Indoor Map
* Navigation
* I'm Lost
* Settings

# 8. Backend Architecture

Technology:

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* PostgreSQL

Planned backend modules:

* authentication if required
* station service
* map service
* navigation service
* location service
* AI service
* user service
* facility service
* QR/location-marker service

# 9. Navigation Architecture

Explain indoor navigation as a graph.

Nodes represent:

* entrance
* ticket area
* security
* concourse
* lift
* escalator
* stairs
* platform
* gate
* facility

Edges represent walkable connections.

Routing algorithms:

* Dijkstra initially
* A* later if required

Explain that routes must be generated from verified station data.

Include a Mermaid graph example.

# 10. Database Architecture

Use PostgreSQL.

Planned entities:

* Station
* Line
* Level
* NavigationNode
* NavigationEdge
* Platform
* Gate
* Facility
* LocationMarker
* User
* SavedPlace
* NavigationSession

Create a Mermaid ER diagram.

Include fields such as:
Station:

* id
* name
* code
* latitude
* longitude
* status

Level:

* id
* station_id
* name
* floor_number

NavigationNode:

* id
* level_id
* name
* type
* x
* y

NavigationEdge:

* id
* from_node_id
* to_node_id
* distance
* estimated_time
* path_type
* accessible

# 11. API Architecture

Document planned REST APIs.

Examples:

GET /api/health

GET /api/stations

GET /api/stations/{id}

GET /api/stations/{id}/levels

GET /api/stations/{id}/facilities

GET /api/stations/{id}/gates

GET /api/stations/{id}/platforms

POST /api/navigation/route

POST /api/location/resolve

POST /api/ai/lost

GET /api/metro/map

GET /api/location-markers/{code}

These are planned APIs. Do not implement them yet.

# 12. Location Architecture

Explain:

GPS:

* Useful mainly for identifying the nearby/outdoor station.
* Not reliable enough by itself for precise indoor positioning.

Manual selection:

* Always available fallback.

QR:

* Can identify a precise known navigation node.

Future:

* BLE beacons
* Wi-Fi positioning
* Sensor fusion
* Computer vision

Do not claim these are implemented.

# 13. AI Architecture

Explain the future AI components:

* Vision
* OCR
* Sign recognition
* Landmark recognition
* Conversational assistant
* "I'm Lost"

Example:

User takes a photo of a station sign
→ Vision/OCR identifies text
→ System maps recognized information to known station/node
→ User confirms
→ Navigation engine calculates route

The AI should produce structured information and confidence.

The navigation engine remains deterministic.

# 14. Technical Stack

Create a complete technology table.

Frontend:
React, Vite, TypeScript, Tailwind CSS

Backend:
Python, FastAPI, SQLAlchemy, Pydantic

Database:
PostgreSQL

Navigation:
Dijkstra, A*

Maps:
SVG/custom interactive maps initially

AI:
Vision-capable LLM/API

OCR:
Tesseract / ML Kit / suitable OCR service

Location:
Browser Geolocation

Indoor positioning:
QR initially, future BLE/Wi-Fi/sensor fusion

Testing:
Pytest
Vitest

Version control:
Git/GitHub

Deployment:
Frontend — Vercel or equivalent
Backend — Render/Railway/cloud
Database — managed PostgreSQL

# 15. Complete Folder Structure

Design a scalable folder structure for:

frontend/
backend/
docs/

Include planned directories for:

* components
* pages
* services
* hooks
* types
* layouts
* models
* schemas
* routers
* services
* navigation
* utils
* tests

Do not create unnecessary files yet. This README is documentation only.

# 16. Security and Privacy

Document:

* Environment variables
* API keys must never be committed
* .env must be gitignored
* Input validation
* API authentication where required
* Minimal user data collection
* Image privacy
* Secure file handling
* HTTPS in production

# 17. Data Accuracy Rules

This section is extremely important.

Never fabricate:

* real station floor plans
* gate locations
* platform locations
* walking paths
* distances
* accessibility routes

For development:

* Demo/sample station data may be used.
* Demo data must be clearly labeled.
* Real production navigation must use verified/authorized data.
* Station layouts should be validated before deployment.

# 18. POC Strategy

Start with one station.

The POC should prove:

* station data model
* indoor map representation
* navigation graph
* route calculation
* step-by-step navigation

Then progressively add:

* QR
* GPS
* AI
* voice
* accessibility
* more stations

# 19. Complete Phase Roadmap

Document exactly these phases:

Phase 1 — Dashboard & UI

Phase 2 — Metro Station Data & Station Directory

Phase 3 — Hyderabad Metro Network Map

Phase 4 — Indoor Station Maps

Phase 5 — Indoor Navigation Route Engine

Phase 6 — Navigation Experience

Phase 7 — Location & QR Positioning

Phase 8 — AI "I'm Lost"

Phase 9 — Voice, Accessibility & Multilingual Support

Phase 10 — Hyderabad-wide Scaling, Testing & Production

For every phase include:

* Objective
* Main features
* Technical work
* Expected output
* Dependencies
* Definition of done

# 20. Development Strategy

This project MUST be developed phase by phase.

Rules:

1. Never implement future phases prematurely.
2. Before starting a phase, inspect the existing code.
3. Do not break completed phases.
4. Reuse existing architecture.
5. Do not duplicate components/services.
6. Keep frontend and backend responsibilities separated.
7. Use typed API contracts.
8. Test each phase before moving to the next.
9. Do not hardcode production data unnecessarily.
10. Keep configuration in environment variables.
11. Do not fabricate real metro information.
12. Keep the application responsive/mobile-first.
13. Keep accessibility in mind from the beginning.
14. Do not use an LLM to calculate physical routes.
15. Future AI functionality must integrate through clean service abstractions.

# 21. Phase Dependency Diagram

Create a Mermaid diagram:

Phase 1
→ Phase 2
→ Phase 3
→ Phase 4
→ Phase 5
→ Phase 6
→ Phase 7
→ Phase 8
→ Phase 9
→ Phase 10

Show the major dependency relationships.

# 22. Testing Strategy

Explain:

* Unit testing
* API testing
* Navigation algorithm testing
* Frontend component testing
* Responsive testing
* Accessibility testing
* Route correctness testing
* AI confidence testing
* Integration testing
* End-to-end testing

# 23. Deployment Architecture

Create a Mermaid deployment diagram showing:

User
→ Frontend hosting
→ FastAPI backend
→ PostgreSQL

And external AI/location services where appropriate.

# 24. POC vs Production

Create a comparison table.

POC:

* One station
* Demo data
* Manual location
* Basic map
* Dijkstra
* Basic navigation

Production:

* Verified station data
* All stations
* Robust positioning
* QR/BLE/etc.
* AI vision
* Accessibility
* Voice
* Monitoring
* Security
* Scalability

# 25. Future Enhancements

Mention possible future features:

* AR navigation
* BLE
* advanced indoor positioning
* multilingual conversational navigation
* real-time station alerts
* crowd-aware routing
* emergency assistance
* accessible route optimization
* integration with metro services
* analytics dashboard
* admin station-map management

# 26. Success Criteria

Define measurable success criteria for the project.

Examples:

* User can select a station.
* User can select current location.
* User can select destination.
* System calculates a valid route.
* User receives understandable step-by-step instructions.
* User can find platform/gate/facility.
* Route does not depend on LLM hallucination.
* Application works responsively on mobile.
* Each completed phase passes its tests.

# 27. Current Development Status

Current Phase:
Phase 3 — Hyderabad Metro Network Map

Status:
Demo inter-station network graph and Metro Map API are connected to the existing map page. Indoor maps and route engines are not implemented.

Next Phase:
Phase 4 — Indoor Station Maps




