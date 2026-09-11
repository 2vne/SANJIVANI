import httpx
from typing import Optional, Dict, Any, List
from ..config import ROUTING_TOMTOM_API

async def get_tomtom_route(
    origin_lat: float,
    origin_lon: float,
    destination_lat: float,
    destination_lon: float
) -> Optional[Dict[str, Any]]:
    api_key = ROUTING_TOMTOM_API
    if not api_key or "your_tomtom" in api_key or api_key == "tomroutingtom":
        return None

    locations = f"{origin_lat},{origin_lon}:{destination_lat},{destination_lon}"
    url = f"https://api.tomtom.com/routing/1/calculateRoute/{locations}/json?traffic=true&routeType=fastest&travelMode=car&key={api_key}"

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get(url)
            if res.status_code != 200:
                return None
            data = res.json()
            routes = data.get("routes", [])
            if not routes or "summary" not in routes[0]:
                return None

            summary = routes[0]["summary"]
            distance_km = round(summary.get("lengthInMeters", 0) / 1000.0, 1)
            duration_minutes = max(1, (summary.get("travelTimeInSeconds", 60) + 59) // 60)
            traffic_delay_minutes = max(0, (summary.get("trafficDelayInSeconds", 0) + 59) // 60)

            legs = routes[0].get("legs", [])
            points = legs[0].get("points", []) if legs else []
            coordinates = [[p["longitude"], p["latitude"]] for p in points]

            return {
                "distanceKm": distance_km,
                "durationMinutes": duration_minutes,
                "trafficDelayMinutes": traffic_delay_minutes,
                "source": "TOMTOM_TRAFFIC",
                "geometry": {"type": "LineString", "coordinates": coordinates} if coordinates else None
            }
    except Exception as e:
        print(f"[TomTomRoutingService] TomTom query failed ({e}). Falling back.")
        return None
