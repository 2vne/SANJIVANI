from fastapi import APIRouter, Query
from typing import Optional
from ..services.emergency_places_service import EmergencyPlacesService

router = APIRouter(prefix="/emergency-places", tags=["Emergency Places"])

@router.get("/nearby")
async def get_nearby_places(
    lat: Optional[float] = Query(None),
    latitude: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    radius: Optional[int] = Query(5000)
):
    final_lat = lat if lat is not None else latitude
    final_lon = lon if lon is not None else (lng if lng is not None else longitude)

    if final_lat is None or final_lon is None:
        return {"success": False, "error": "Valid lat and lon query parameters are required"}

    return await EmergencyPlacesService.get_nearby_places(final_lat, final_lon, radius or 5000)
