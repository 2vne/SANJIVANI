from fastapi import APIRouter, Query, HTTPException
from ..services.routing_service import RoutingService
from ..models.schemas import RouteEstimate

router = APIRouter(prefix="/routes", tags=["Routes"])

@router.get("/estimate", response_model=RouteEstimate)
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
