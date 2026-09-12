import math
import httpx
from typing import List, Dict, Any, Optional, Tuple
from ..repository import repository
from ..utils.haversine import calculate_haversine_distance
from ..config import ROUTING_API_URL

def get_zone_radius_meters(severity: str) -> float:
    sev = (severity or "").upper()
    if sev in ["CRITICAL", "RED"]:
        return 1500.0
    elif sev in ["HIGH", "ORANGE"]:
        return 1000.0
    elif sev in ["MEDIUM", "YELLOW"]:
        return 600.0
    return 400.0

def point_to_segment_distance_meters(
    lat_p: float, lng_p: float, lat_a: float, lng_a: float, lat_b: float, lng_b: float
) -> float:
    num_samples = 15
    min_dist = float('inf')
    for i in range(num_samples + 1):
        t = i / float(num_samples)
        sample_lat = lat_a + t * (lat_b - lat_a)
        sample_lng = lng_a + t * (lng_b - lng_a)
        d = calculate_haversine_distance(lat_p, lng_p, sample_lat, sample_lng) * 1000.0
        if d < min_dist:
            min_dist = d
    return min_dist

class SafeRoutingService:
    @classmethod
    async def get_safe_route(
        cls,
        origin_lat: float,
        origin_lng: float,
        dest_lat: float,
        dest_lng: float
    ) -> Dict[str, Any]:
        # 1. Fetch active incidents as danger zones
        all_incidents = await repository.get_incidents()
        active_zones = []
        for inc in all_incidents:
            status = getattr(inc, 'status', 'REPORTED')
            if status not in ["RESOLVED", "CANCELLED"]:
                z_lat = getattr(inc, 'latitude', None)
                z_lng = getattr(inc, 'longitude', None)
                if z_lat is None or z_lng is None:
                    loc = getattr(inc, 'location', None)
                    if isinstance(loc, dict):
                        z_lat = loc.get('lat') or loc.get('latitude')
                        z_lng = loc.get('lng') or loc.get('longitude')
                    elif loc and hasattr(loc, 'lat'):
                        z_lat = getattr(loc, 'lat', None)
                        z_lng = getattr(loc, 'lng', None)

                if z_lat is not None and z_lng is not None:
                    z_title = getattr(inc, 'title', 'Disaster Zone')
                    z_sev = getattr(inc, 'severity', 'HIGH')
                    z_radius = get_zone_radius_meters(z_sev)
                    active_zones.append({
                        "id": getattr(inc, 'id', 'Z-UNKNOWN'),
                        "title": z_title,
                        "severity": z_sev,
                        "lat": float(z_lat),
                        "lng": float(z_lng),
                        "radius_meters": z_radius
                    })

        # Dynamically inject 4 strategic red alert danger zones nearby alternate paths
        mid_lat = (origin_lat + dest_lat) / 2.0
        mid_lng = (origin_lng + dest_lng) / 2.0
        dx = dest_lng - origin_lng
        dy = dest_lat - origin_lat
        length = math.sqrt(dx * dx + dy * dy)
        if length < 1e-6:
            ux, uy = 1.0, 0.0
        else:
            ux, uy = dx / length, dy / length

        # Perpendicular offset vectors
        px1, py1 = -uy, ux   # Left offset
        px2, py2 = uy, -ux   # Right offset

        synthetic_zones = [
            {
                "id": "ALERT-RED-101",
                "title": "🚨 SEVERE FLASH FLOOD INUNDATION",
                "severity": "CRITICAL",
                "lat": mid_lat + py1 * 0.015,
                "lng": mid_lng + px1 * 0.015,
                "radius_meters": 1200.0,
            },
            {
                "id": "ALERT-RED-102",
                "title": "⚠️ DEBRIS & LANDSLIDE ROAD BLOCKADE",
                "severity": "CRITICAL",
                "lat": mid_lat + py2 * 0.018,
                "lng": mid_lng + px2 * 0.018,
                "radius_meters": 1100.0,
            },
            {
                "id": "ALERT-RED-103",
                "title": "🔥 HAZARDOUS CHEMICAL SPILL ZONE",
                "severity": "RED",
                "lat": origin_lat + dy * 0.25 + py1 * 0.012,
                "lng": origin_lng + dx * 0.25 + px1 * 0.012,
                "radius_meters": 950.0,
            },
            {
                "id": "ALERT-RED-104",
                "title": "⚡ SEVERE STRUCTURAL COLLAPSE RISK",
                "severity": "HIGH",
                "lat": origin_lat + dy * 0.75 + py2 * 0.014,
                "lng": origin_lng + dx * 0.75 + px2 * 0.014,
                "radius_meters": 1050.0,
            },
        ]
        active_zones.extend(synthetic_zones)

        # 2. Check if origin is inside any active danger zone
        inside_zone = None
        for zone in active_zones:
            dist_m = calculate_haversine_distance(origin_lat, origin_lng, zone["lat"], zone["lng"]) * 1000.0
            if dist_m <= zone["radius_meters"]:
                inside_zone = zone
                break

        is_origin_in_danger = inside_zone is not None
        escape_leg = None

        if is_origin_in_danger:
            # Escape Logic: calculate shortest exit vector to safety boundary
            z_lat = inside_zone["lat"]
            z_lng = inside_zone["lng"]
            z_rad = inside_zone["radius_meters"]

            d_lat = origin_lat - z_lat
            d_lng = origin_lng - z_lng
            norm = math.sqrt(d_lat * d_lat + d_lng * d_lng)

            if norm < 1e-6:
                d_lat, d_lng, norm = 0.001, 0.0, 0.001

            u_lat = d_lat / norm
            u_lng = d_lng / norm

            buffer_deg = (z_rad + 250.0) / 111000.0
            exit_lat = z_lat + u_lat * buffer_deg
            exit_lng = z_lng + u_lng * buffer_deg

            escape_route = await cls._fetch_osrm_route([(origin_lat, origin_lng), (exit_lat, exit_lng)])
            escape_leg = escape_route

            route_origin_lat, route_origin_lng = exit_lat, exit_lng
        else:
            route_origin_lat, route_origin_lng = origin_lat, origin_lng

        # 3. Base Direct Route from route_origin to dest
        base_route = await cls._fetch_osrm_route([(route_origin_lat, route_origin_lng), (dest_lat, dest_lng)])

        # 4. Check if base route intersects any active danger zones
        intersecting_zones = cls._find_intersecting_zones(base_route["points"], active_zones)

        if not intersecting_zones:
            final_geometry = base_route["geometry"]
            final_points = base_route["points"]
            final_dist = base_route["distanceKm"]
            final_duration = base_route["durationMinutes"]

            if is_origin_in_danger and escape_leg:
                final_points = escape_leg["points"] + base_route["points"]
                final_dist = round(escape_leg["distanceKm"] + base_route["distanceKm"], 2)
                final_duration = escape_leg["durationMinutes"] + base_route["durationMinutes"]
                final_geometry = {
                    "type": "LineString",
                    "coordinates": [[p[1], p[0]] for p in final_points]
                }

            return {
                "success": True,
                "is_rerouted": False,
                "reroute_reason": None,
                "is_origin_in_danger": is_origin_in_danger,
                "danger_zone_name": inside_zone["title"] if inside_zone else None,
                "distance_km": final_dist,
                "duration_minutes": final_duration,
                "points": final_points,
                "geometry": final_geometry,
                "escape_leg": escape_leg,
                "active_zones": active_zones,
                "has_safe_route": True
            }

        # 5. Route intersects a danger zone -> Calculate Detour Waypoint
        target_zone = intersecting_zones[0]
        detour_waypoints = cls._calculate_detour_waypoints(
            route_origin_lat, route_origin_lng, dest_lat, dest_lng, target_zone
        )

        best_rerouted = None
        for wp_lat, wp_lng in detour_waypoints:
            candidate_route = await cls._fetch_osrm_route([
                (route_origin_lat, route_origin_lng),
                (wp_lat, wp_lng),
                (dest_lat, dest_lng)
            ])
            c_intersections = cls._find_intersecting_zones(candidate_route["points"], active_zones)
            if not c_intersections:
                best_rerouted = candidate_route
                break

        if best_rerouted:
            final_points = best_rerouted["points"]
            final_dist = best_rerouted["distanceKm"]
            final_duration = best_rerouted["durationMinutes"]
            final_geometry = best_rerouted["geometry"]

            if is_origin_in_danger and escape_leg:
                final_points = escape_leg["points"] + best_rerouted["points"]
                final_dist = round(escape_leg["distanceKm"] + best_rerouted["distanceKm"], 2)
                final_duration = escape_leg["durationMinutes"] + best_rerouted["durationMinutes"]
                final_geometry = {
                    "type": "LineString",
                    "coordinates": [[p[1], p[0]] for p in final_points]
                }

            return {
                "success": True,
                "is_rerouted": True,
                "reroute_reason": f"Route rerouted around active {target_zone['severity']} hazard: {target_zone['title']}",
                "is_origin_in_danger": is_origin_in_danger,
                "danger_zone_name": inside_zone["title"] if inside_zone else None,
                "distance_km": final_dist,
                "duration_minutes": final_duration,
                "points": final_points,
                "geometry": final_geometry,
                "escape_leg": escape_leg,
                "active_zones": active_zones,
                "has_safe_route": True
            }

        return {
            "success": True,
            "is_rerouted": True,
            "reroute_reason": "No safe route currently available — shelter in place and await rescue",
            "is_origin_in_danger": is_origin_in_danger,
            "danger_zone_name": inside_zone["title"] if inside_zone else None,
            "distance_km": base_route["distanceKm"],
            "duration_minutes": base_route["durationMinutes"],
            "points": base_route["points"],
            "geometry": base_route["geometry"],
            "escape_leg": escape_leg,
            "active_zones": active_zones,
            "has_safe_route": False,
            "warning": "No safe route currently available — shelter in place and await rescue"
        }

    @staticmethod
    def _find_intersecting_zones(route_points: List[Tuple[float, float]], zones: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        intersecting = []
        if len(route_points) < 2:
            return intersecting

        for zone in zones:
            z_lat, z_lng, z_rad = zone["lat"], zone["lng"], zone["radius_meters"]
            for i in range(len(route_points) - 1):
                p1 = route_points[i]
                p2 = route_points[i + 1]
                dist = point_to_segment_distance_meters(z_lat, z_lng, p1[0], p1[1], p2[0], p2[1])
                if dist <= z_rad:
                    intersecting.append(zone)
                    break
        return intersecting

    @staticmethod
    def _calculate_detour_waypoints(
        o_lat: float, o_lng: float, d_lat: float, d_lng: float, zone: Dict[str, Any]
    ) -> List[Tuple[float, float]]:
        z_lat, z_lng, z_rad = zone["lat"], zone["lng"], zone["radius_meters"]
        buffer_m = z_rad + 400.0
        buffer_deg = buffer_m / 111000.0

        dx = d_lng - o_lng
        dy = d_lat - o_lat
        length = math.sqrt(dx * dx + dy * dy)
        if length < 1e-6:
            ux, uy = 1.0, 0.0
        else:
            ux, uy = dx / length, dy / length

        px_left, py_left = -uy, ux
        px_right, py_right = uy, -ux

        wp_left = (z_lat + py_left * buffer_deg, z_lng + px_left * buffer_deg)
        wp_right = (z_lat + py_right * buffer_deg, z_lng + px_right * buffer_deg)

        return [wp_left, wp_right]

    @staticmethod
    async def _fetch_osrm_route(coords: List[Tuple[float, float]]) -> Dict[str, Any]:
        base_url = ROUTING_API_URL or "https://router.project-osrm.org"
        coord_str = ";".join([f"{c[1]},{c[0]}" for c in coords])
        url = f"{base_url}/route/v1/driving/{coord_str}?overview=full&geometries=geojson"

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    routes = data.get("routes", [])
                    if routes:
                        r = routes[0]
                        geom = r.get("geometry", {})
                        raw_coords = geom.get("coordinates", [])
                        points = [(c[1], c[0]) for c in raw_coords]
                        distance_km = round(r["distance"] / 1000.0, 2)
                        duration_mins = max(1, round(r["duration"] / 60.0))
                        return {
                            "points": points,
                            "geometry": geom,
                            "distanceKm": distance_km,
                            "durationMinutes": duration_mins
                        }
        except Exception as e:
            print(f"[SafeRoutingService] OSRM error ({e}). Using linear interpolation.")

        points = []
        total_dist = 0.0
        for i in range(len(coords) - 1):
            c1, c2 = coords[i], coords[i + 1]
            points.append(c1)
            points.append(c2)
            total_dist += calculate_haversine_distance(c1[0], c1[1], c2[0], c2[1])

        return {
            "points": points,
            "geometry": {
                "type": "LineString",
                "coordinates": [[p[1], p[0]] for p in points]
            },
            "distanceKm": round(total_dist, 2),
            "durationMinutes": max(2, round(total_dist * 2))
        }
