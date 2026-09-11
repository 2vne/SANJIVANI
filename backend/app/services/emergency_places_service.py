import time
import httpx
import urllib.parse
from typing import List, Dict, Tuple, Optional, Any
from ..models.schemas import EmergencyPlace
from ..utils.haversine import calculate_haversine_distance

CACHE_TTL_SECONDS = 5 * 60  # 5 minutes
_places_cache: Dict[str, Tuple[Dict[str, Any], float]] = {}

class EmergencyPlacesService:
    @staticmethod
    def _get_cache_key(lat: float, lon: float, radius: int) -> str:
        return f"{lat:.2f}_{lon:.2f}_{radius}"

    @classmethod
    async def get_nearby_places(cls, lat: float, lon: float, radius_meters: int = 5000) -> Dict[str, Any]:
        clamped_radius = min(15000, max(500, radius_meters or 5000))
        valid_lat = 19.0760 if lat is None else lat
        valid_lon = 72.8777 if lon is None else lon

        cache_key = cls._get_cache_key(valid_lat, valid_lon, clamped_radius)
        now = time.time()
        if cache_key in _places_cache:
            data, expires_at = _places_cache[cache_key]
            if expires_at > now:
                return data

        places: List[EmergencyPlace] = []

        # TIER 1: Nominatim
        try:
            places = await cls._fetch_nominatim(valid_lat, valid_lon, clamped_radius)
        except Exception as e:
            print(f"[EmergencyPlacesService] Nominatim failed: {e}")

        # TIER 2: Overpass if < 3 places
        if len(places) < 3:
            try:
                overpass_places = await cls._fetch_overpass(valid_lat, valid_lon, clamped_radius)
                existing_ids = {p.id for p in places}
                for op in overpass_places:
                    if op.id not in existing_ids:
                        places.append(op)
            except Exception as e:
                print(f"[EmergencyPlacesService] Overpass failed: {e}")

        # TIER 3: Local fallback
        if not places:
            places = cls._generate_fallback_places(valid_lat, valid_lon)

        places.sort(key=lambda p: p.distanceKm)

        response = {
            "success": True,
            "center": {"latitude": valid_lat, "longitude": valid_lon},
            "radiusMeters": clamped_radius,
            "count": len(places),
            "places": [p.model_dump() for p in places]
        }

        _places_cache[cache_key] = (response, now + CACHE_TTL_SECONDS)
        return response

    @staticmethod
    async def _fetch_nominatim(lat: float, lon: float, radius_meters: int) -> List[EmergencyPlace]:
        delta = radius_meters / 111000.0
        left = f"{lon - delta:.4f}"
        top = f"{lat + delta:.4f}"
        right = f"{lon + delta:.4f}"
        bottom = f"{lat - delta:.4f}"

        categories = [
            {"query": "hospital", "type": "hospital"},
            {"query": "fire station", "type": "fire_station"},
            {"query": "police", "type": "police_station"},
            {"query": "rescue", "type": "rescue"},
            {"query": "NGO disaster relief", "type": "ngo"}
        ]

        places_map: Dict[str, EmergencyPlace] = {}

        async with httpx.AsyncClient(timeout=4.0) as client:
            for cat in categories:
                try:
                    q = urllib.parse.quote(cat["query"])
                    url = f"https://nominatim.openstreetmap.org/search?format=json&q={q}&viewbox={left},{top},{right},{bottom}&bounded=1"
                    res = await client.get(url, headers={"User-Agent": "PS20-FastAPI-Disaster-Coordinator/1.0"})
                    if res.status_code == 200:
                        items = res.json()
                        if isinstance(items, list):
                            for item in items[:4]:
                                item_lat = float(item.get("lat", 0))
                                item_lon = float(item.get("lon", 0))
                                if item_lat and item_lon:
                                    place_id = f"osm-nom-{item.get('place_id')}"
                                    disp = item.get("display_name", "")
                                    name = disp.split(",")[0] if disp else "Emergency Support Unit"
                                    places_map[place_id] = EmergencyPlace(
                                        id=place_id,
                                        name=name,
                                        type=cat["type"],
                                        latitude=item_lat,
                                        longitude=item_lon,
                                        address=disp,
                                        distanceKm=calculate_haversine_distance(lat, lon, item_lat, item_lon),
                                        source="OPENSTREETMAP"
                                    )
                except Exception:
                    pass

        return list(places_map.values())

    @staticmethod
    async def _fetch_overpass(lat: float, lon: float, radius_meters: int) -> List[EmergencyPlace]:
        query = f"""
        [out:json][timeout:6];
        (
          node["amenity"="hospital"](around:{radius_meters},{lat},{lon});
          node["amenity"="fire_station"](around:{radius_meters},{lat},{lon});
          node["amenity"="police"](around:{radius_meters},{lat},{lon});
          node["emergency"="rescue"](around:{radius_meters},{lat},{lon});
          node["office"="ngo"](around:{radius_meters},{lat},{lon});
        );
        out body;
        """
        endpoints = [
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter"
        ]

        async with httpx.AsyncClient(timeout=5.0) as client:
            for ep in endpoints:
                try:
                    res = await client.post(ep, data={"data": query}, headers={"User-Agent": "PS20-FastAPI-Disaster-Coordinator/1.0"})
                    if res.status_code == 200:
                        data = res.json()
                        elements = data.get("elements", [])
                        places: List[EmergencyPlace] = []
                        for el in elements:
                            tags = el.get("tags", {})
                            ptype = "hospital"
                            if tags.get("amenity") == "fire_station":
                                ptype = "fire_station"
                            elif tags.get("amenity") == "police":
                                ptype = "police_station"
                            elif tags.get("emergency") == "rescue":
                                ptype = "rescue"
                            elif tags.get("office") == "ngo":
                                ptype = "ngo"

                            e_lat = el.get("lat")
                            e_lon = el.get("lon")
                            if e_lat is not None and e_lon is not None:
                                places.append(EmergencyPlace(
                                    id=f"osm-op-{el.get('id')}",
                                    name=tags.get("name") or tags.get("name:en") or "Emergency Unit",
                                    type=ptype,
                                    latitude=e_lat,
                                    longitude=e_lon,
                                    address=tags.get("addr:street") or tags.get("addr:city"),
                                    phone=tags.get("phone"),
                                    website=tags.get("website"),
                                    distanceKm=calculate_haversine_distance(lat, lon, e_lat, e_lon),
                                    source="OPENSTREETMAP"
                                ))
                        return places
                except Exception:
                    continue

        return []

    @staticmethod
    def _generate_fallback_places(lat: float, lon: float) -> List[EmergencyPlace]:
        offsets = [
            {"dLat": 0.012, "dLon": 0.008, "name": "Regional Emergency Medical Trauma Center", "type": "hospital", "phone": "+1-800-555-0199"},
            {"dLat": -0.009, "dLon": 0.015, "name": "District Fire & Heavy Rescue Station 14", "type": "fire_station", "phone": "+1-800-555-0192"},
            {"dLat": -0.014, "dLon": -0.011, "name": "Central Emergency Police & Tactical Command", "type": "police_station", "phone": "+1-800-555-0191"},
            {"dLat": 0.018, "dLon": -0.014, "name": "Red Cross & Humanitarian Disaster Relief Hub", "type": "ngo", "phone": "+1-800-555-0195"},
            {"dLat": 0.005, "dLon": -0.021, "name": "National Search & Rescue Emergency Squad", "type": "rescue", "phone": "+1-800-555-0198"},
        ]

        places = []
        for idx, off in enumerate(offsets):
            p_lat = lat + off["dLat"]
            p_lon = lon + off["dLon"]
            places.append(EmergencyPlace(
                id=f"fallback-place-{idx + 1}",
                name=off["name"],
                type=off["type"],
                latitude=p_lat,
                longitude=p_lon,
                address=f"Sector {idx + 1} Emergency Support Zone",
                phone=off["phone"],
                distanceKm=calculate_haversine_distance(lat, lon, p_lat, p_lon),
                source="LOCAL_FALLBACK"
            ))
        return places
