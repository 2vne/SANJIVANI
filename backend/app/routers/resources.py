from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from ..models.schemas import Resource
from ..repository import repository
from ..services.coordination_agent import CoordinationAgent
from ..services.eta_engine import ETAEngine

router = APIRouter(prefix="/resources", tags=["Resources"])

@router.get("", response_model=List[Resource])
async def get_resources():
    return await repository.get_resources()

@router.get("/{resource_id}")
async def get_resource_by_id(resource_id: str):
    resource = await repository.get_resource_by_id(resource_id)
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    return resource

@router.post("/{resource_id}/dispatch")
async def dispatch_resource(resource_id: str, payload: Dict[str, Any] = Body(...)):
    incident_id = payload.get("incidentId")
    need_type = payload.get("needType")
    notes = payload.get("notes")

    if not incident_id:
        raise HTTPException(status_code=400, detail="incidentId is required")

    result = await CoordinationAgent.dispatch_resource(incident_id, resource_id, need_type, notes)
    if not result:
        raise HTTPException(status_code=404, detail="Incident or Resource not found")

    return result

@router.post("/{resource_id}/simulate-delay")
async def simulate_delay(resource_id: str):
    result = await ETAEngine.simulate_route_condition(resource_id, forced_delay=True)
    if not result:
        raise HTTPException(status_code=404, detail="Dispatched resource not found or not assigned")
    return result
