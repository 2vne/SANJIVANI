from fastapi import APIRouter, Query, HTTPException
from typing import Optional
from ..services.routing_service import RoutingService
from ..services.safe_routing_service import SafeRoutingService
from ..models.schemas import RouteEstimate

router = APIRouter(tags=["Routes"])

@router.get("/routes/estimate", response_model=RouteEstimate)
async def get_route_estimate(
    originLat: float = Query(...),
    originLon: float = Query(...),
    destinationLat: float = Query(...),
    destinationLon: float = Query(...)
):
    try:
        return await RoutingService.get_route_estimate(
            originLat, originLon, destinationLat, destinationLon
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/safe-route")
@router.get("/routes/safe-route")
async def get_safe_route(
    origin: Optional[str] = Query(None, description="Format: lat,lng"),
    destination: Optional[str] = Query(None, description="Format: lat,lng"),
    origin_lat: Optional[float] = Query(None),
    origin_lng: Optional[float] = Query(None),
    dest_lat: Optional[float] = Query(None),
    dest_lng: Optional[float] = Query(None),
):
    try:
        o_lat, o_lng = origin_lat, origin_lng
        d_lat, d_lng = dest_lat, dest_lng

        if origin and "," in origin:
            parts = origin.split(",")
            o_lat, o_lng = float(parts[0].strip()), float(parts[1].strip())
        if destination and "," in destination:
            parts = destination.split(",")
            d_lat, d_lng = float(parts[0].strip()), float(parts[1].strip())

        if o_lat is None or o_lng is None or d_lat is None or d_lng is None:
            raise HTTPException(
                status_code=400,
                detail="Must provide origin (lat,lng or origin_lat & origin_lng) and destination (lat,lng or dest_lat & dest_lng)"
            )

        result = await SafeRoutingService.get_safe_route(o_lat, o_lng, d_lat, d_lng)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/safe-route/geocode")
@router.get("/geocode")
async def geocode_address(q: str = Query(..., description="Location name or address")):
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"format": "json", "q": q, "limit": 6},
                headers={"User-Agent": "SANJIVANI-Disaster-Relief/1.0"}
            )
            if resp.status_code == 200:
                data = resp.json()
                results = []
                for item in data:
                    results.append({
                        "label": item.get("display_name", "").split(",")[0],
                        "address": item.get("display_name", ""),
                        "lat": float(item.get("lat")),
                        "lng": float(item.get("lon"))
                    })
                return {"success": True, "results": results}
    except Exception as e:
        print("Backend geocode exception:", e)
    return {"success": False, "results": [], "error": "Geocoding service unavailable"}

