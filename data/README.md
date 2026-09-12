# SANJIVANI Telemetry & Data Sources

This directory documents the data telemetry, OpenStreetMap Overpass live queries, emergency shelter feeds, and incident dataset schemas utilized by **SANJIVANI**.

---

## 🛰️ 1. Live Telemetry Data Sources

| Telemetry Source | Engine | Endpoint / Format | Update Interval | Description |
| :--- | :--- | :--- | :--- | :--- |
| **OpenStreetMap Safe Havens** | Overpass API | `https://overpass-api.de/api/interpreter` | Live / Radius Search | Dynamic geo-queries for community centers, schools, hospitals & emergency shelters |
| **OSRM Hazard Avoidance Routing** | OSRM Engine | `https://router.project-osrm.org/route/v1` | Real-time | Calculates driving paths with waypoints to bypass active disaster zones |
| **Nominatim Geocoding API** | OpenStreetMap | `https://nominatim.openstreetmap.org/search` | Instant Search | Resolves place names/landmarks into geographic coordinates `(lat, lng)` |
| **Emergency Incidents Feed** | REST API | `http://localhost:8000/api/incidents` | Real-time / Socket.IO | Reports active SOS alerts, flood risks, chemical spills, and trapped citizen counts |

---

## 📊 2. Shelter Telemetry Model

Shelters are retrieved dynamically via OSM Overpass within a user-controlled radius (e.g. $5\text{ km}$ to $20\text{ km}$):

```json
{
  "id": "osm-shelter-49201",
  "name": "Community Relief Center - Kothrud",
  "type": "Community Center",
  "capacity": 350,
  "currentOccupancy": 182,
  "status": "OPEN",
  "location": {
    "lat": 18.5074,
    "lng": 73.8077
  },
  "contactPhone": "+91-9823000000",
  "supplies": {
    "medicalKits": 45,
    "foodRations": 250,
    "waterLiters": 1200
  }
}
```

---

## 🚨 3. Danger Alert Hazard Zones Model

Active disaster zones inject hazard radiuses ($600\text{m}$ to $1500\text{m}$) into the OSRM Safe Routing Engine:

```json
{
  "id": "ALERT-RED-101",
  "title": "🚨 SEVERE FLASH FLOOD INUNDATION",
  "severity": "CRITICAL",
  "lat": 18.525,
  "lng": 73.86,
  "radius_meters": 1200.0
}
```
