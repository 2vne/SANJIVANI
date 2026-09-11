import time
import httpx
from typing import Dict, Tuple, Optional, Any
from ..models.schemas import RouteEstimate
from ..utils.haversine import calculate_haversine_distance
from ..config import ROUTING_API_URL
from .tomtom_routing_service import get_tomtom_route

CACHE_TTL_SECONDS = 15 * 60  # 15 minutes
_route_cache: Dict[str, Tuple[RouteEstimate, float]] = {}

class RoutingService:
    @staticmethod
    def _get_cache_key(lat1: float, lon1: float, lat2: float, lon2: float) -> str:
        return f"{lat1:.4f},{lon1:.4f}->{lat2:.4f},{lon2:.4f}"

    @classmethod
    async def get_route_estimate(
        cls,
        origin_lat: float,
        origin_lon: float,
        destination_lat: float,
        destination_lon: float
    ) -> RouteEstimate:
        if (
            abs(origin_lat) > 90
            or abs(destination_lat) > 90
            or abs(origin_lon) > 180
            or abs(destination_lon) > 180
        ):
            return cls._get_fallback_route(origin_lat, origin_lon, destination_lat, destination_lon)

        cache_key = cls._get_cache_key(origin_lat, origin_lon, destination_lat, destination_lon)
        now = time.time()
        if cache_key in _route_cache:
            data, expires_at = _route_cache[cache_key]
            if expires_at > now:
                return data

        # Tier 1: TomTom Traffic
        try:
            tomtom_res = await get_tomtom_route(origin_lat, origin_lon, destination_lat, destination_lon)
            if tomtom_res:
                result = RouteEstimate(
                    distanceKm=tomtom_res["distanceKm"],
                    durationMinutes=tomtom_res["durationMinutes"],
                    trafficDelayMinutes=tomtom_res.get("trafficDelayMinutes", 0),
                    source="TOMTOM_TRAFFIC",
                    geometry=tomtom_res.get("geometry")
                )
                _route_cache[cache_key] = (result, now + CACHE_TTL_SECONDS)
                return result
        except Exception as e:
            print(f"[RoutingService] TomTom error ({e}). Falling back to OSRM.")

        # Tier 2: OSRM
        base_url = ROUTING_API_URL or "https://router.project-osrm.org"
        url = f"{base_url}/route/v1/driving/{origin_lon},{origin_lat};{destination_lon},{destination_lat}?overview=full&geometries=geojson"

        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    routes = data.get("routes", [])
                    if routes:
                        r = routes[0]
                        distance_km = round(r["distance"] / 1000.0, 1)
                        duration_mins = max(2, round(r["duration"] / 60.0))
                        result = RouteEstimate(
                            distanceKm=distance_km,
                            durationMinutes=duration_mins,
                            geometry=r.get("geometry"),
                            source="OSRM"
                        )
                        _route_cache[cache_key] = (result, now + CACHE_TTL_SECONDS)
                        return result
        except Exception as e:
            print(f"[RoutingService] OSRM query error ({e}). Using Haversine fallback.")

        # Tier 3: Haversine fallback
        return cls._get_fallback_route(origin_lat, origin_lon, destination_lat, destination_lon)

    @staticmethod
    def _get_fallback_route(
        origin_lat: float,
        origin_lon: float,
        destination_lat: float,
        destination_lon: float
    ) -> RouteEstimate:
        distance_km = calculate_haversine_distance(origin_lat, origin_lon, destination_lat, destination_lon)
        duration_minutes = max(3, round(distance_km * 1.5 + 4))
        return RouteEstimate(
            distanceKm=distance_km,
            durationMinutes=duration_minutes,
            source="FALLBACK",
            geometry={
                "type": "LineString",
                "coordinates": [
                    [origin_lon, origin_lat],
                    [destination_lon, destination_lat]
                ]
            }
        )
