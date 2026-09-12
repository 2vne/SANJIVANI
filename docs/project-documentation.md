# SANJIVANI System Documentation
**Team ID:** KH015  
**Team Name:** CHAR COAL  
**Project Name:** SANJIVANI - Agentic Disaster Relief & Emergency Resource Coordinator  

---

## 📌 Executive Summary

**SANJIVANI** is an enterprise-grade disaster management and emergency resource coordinator app designed for real-time situational awareness, emergency routing, shelter management, and field resource dispatching.

---

## 🏗️ System Architecture & Workflow

```
[ Citizen / Commander Web UI (React + Leaflet) ]
                       │
       HTTP REST / Socket.IO Telemetry
                       │
                       ▼
[ SANJIVANI FastAPI Backend (Python) ] ◄──► [ OSRM Safe Route Engine ]
                       │                         │
                       ├─────────────────────────┼──► [ OSM Overpass API (Live Shelters) ]
                       │                         │
                       ▼                         ▼
            [ Supabase / SQLite ]      [ Nominatim Geocoding API ]
```

---

## ⚡ Core Modules & Features

### 1. Command Centre (`/`)
- Real-time Leaflet map displaying active incidents, field reporter pins, emergency resources, and shelter spots.
- Dynamic $X$-km operational radius slider ($1\text{ km}$ to $50\text{ km}$) synced across all system views.
- Active HUD telemetry radar tracking real-time status.

### 2. Emergency Incidents (`/incidents`)
- Real-time incident tracking with severity levels (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
- SOS emergency alert flags and field reporter submissions.

### 3. Resource Fleet Logistics (`/resources`)
- Real-time fleet management for Fire Trucks, Ambulances, NDRF Boats, Food Trucks, and Rescue Helicopters.
- Dynamic **DISPATCH** and **SET AVAILABLE** actions linked to active incident IDs.

### 4. Live Shelter Network (`/shelters`)
- Dynamic OpenStreetMap Overpass safe haven extraction within the configured Command Centre location & radius.
- Real-time evacuee admission controls (`-10`, `-1`, `+1`, `+10`) with persistent backend state synchronization.

### 5. Safe Route Navigation Engine (`/safe-route`)
- **Google Maps Style Search**: Live address and landmark auto-complete via geocoding API.
- **Hazard Avoidance**: OSRM-powered route calculation avoiding active disaster zones.
- **Red Alert Visualization**: Translucent red hazard circles highlighting bypassed danger sectors.

### 6. Analytics (`/analytics`)
- Visual charts and analytics for incident trends, resource utilization, and shelter capacities.

---

## 🛠️ API Reference Summary

| Endpoint | Method | Parameters / Body | Description |
| :--- | :--- | :--- | :--- |
| `/api/incidents` | `GET / POST` | Incident payload | Fetch active incidents or report new emergency |
| `/api/resources` | `GET` | — | Get real-time status of resource fleet |
| `/api/resources/{id}/dispatch` | `POST` | `{ "incidentId": "INC-..." }` | Dispatch resource to specific incident |
| `/api/shelters` | `GET` | — | List all system & live OSM shelters |
| `/api/shelters/{id}/occupancy` | `PATCH` | `{ "currentOccupancy": 150 }` | Update shelter evacuee occupancy count |
| `/api/safe-route` | `GET` | `origin=lat,lng&destination=lat,lng` | Calculate hazard-avoidance safe route |
| `/api/safe-route/geocode` | `GET` | `q=LocationName` | Geocode address or landmark name to coordinates |
