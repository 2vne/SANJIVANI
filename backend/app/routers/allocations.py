from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from ..models.schemas import Allocation
from ..repository import repository
from ..services.coordination_agent import CoordinationAgent

router = APIRouter(prefix="/allocations", tags=["Allocations"])

@router.get("", response_model=List[Allocation])
async def get_allocations():
    return await repository.get_allocations()

@router.post("", status_code=201)
async def create_allocation(payload: Dict[str, Any] = Body(...)):
    incident_id = payload.get("incidentId")
    resource_id = payload.get("resourceId")
    need_type = payload.get("needType")
    notes = payload.get("notes")

    if not incident_id or not resource_id:
        raise HTTPException(status_code=400, detail="incidentId and resourceId are required")

    result = await CoordinationAgent.dispatch_resource(incident_id, resource_id, need_type, notes)
    if not result:
        raise HTTPException(status_code=404, detail="Failed to create allocation")

    return result["allocation"]

@router.post("/{allocation_id}/reallocate")
async def reallocate_resource(allocation_id: str, payload: Dict[str, Any] = Body(...)):
    old_resource_id = payload.get("oldResourceId")
    new_resource_id = payload.get("newResourceId")
    incident_id = payload.get("incidentId")

    if not old_resource_id or not new_resource_id or not incident_id:
        raise HTTPException(status_code=400, detail="oldResourceId, newResourceId, and incidentId are required")

    result = await CoordinationAgent.reallocate_resource(old_resource_id, new_resource_id, incident_id)
    if not result:
        raise HTTPException(status_code=400, detail="Failed to reallocate resource")

    return result
