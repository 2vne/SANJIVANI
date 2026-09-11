from fastapi import APIRouter, Query, HTTPException, Body
from typing import List, Optional, Dict, Any
from ..models.schemas import Incident
from ..repository import repository
from ..services.coordination_agent import CoordinationAgent, emit_event
from ..services.allocation_agent import AllocationAgent

router = APIRouter(prefix="/incidents", tags=["Incidents"])

@router.get("", response_model=List[Incident])
async def get_incidents(includeResolved: Optional[bool] = Query(False)):
    incidents = await repository.get_incidents()
    if includeResolved:
        return incidents
    return [i for i in incidents if i.status not in ["RESOLVED", "CANCELLED"]]

@router.get("/{incident_id}")
async def get_incident_by_id(incident_id: str):
    incident = await repository.get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident

@router.get("/{incident_id}/recommend")
async def get_recommendation_for_incident(incident_id: str):
    incident = await repository.get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    recommendation = await AllocationAgent.recommend_allocation(incident)
    return {"success": True, "recommendation": recommendation}

@router.post("", status_code=201)
async def create_incident(payload: Dict[str, Any] = Body(...)):
    result = await CoordinationAgent.handle_new_incident(payload)
    return result["incident"]

@router.post("/reset-mock")
async def reset_mock_state():
    return await CoordinationAgent.reset_mock_state()

@router.patch("/{incident_id}")
async def update_incident(incident_id: str, updates: Dict[str, Any] = Body(...)):
    incident = await repository.get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    data = incident.model_dump()
    data.update(updates)
    updated_incident = Incident(**data)
    await repository.save_incident(updated_incident)

    await emit_event("incident.updated", updated_incident.model_dump())
    await CoordinationAgent.log_audit(
        "INCIDENT_UPDATED",
        f"Updated details for incident {updated_incident.id}",
        incident_id=updated_incident.id
    )

    return updated_incident

@router.patch("/{incident_id}/status")
async def update_incident_status(incident_id: str, payload: Dict[str, Any] = Body(...)):
    incident = await repository.get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")

    status = payload.get("status")
    if not status:
        raise HTTPException(status_code=400, detail="Status is required")

    incident.status = status
    await repository.save_incident(incident)

    # If resolved, automatically free up assigned resource units
    if status == "RESOLVED":
        resources = await repository.get_resources()
        for r in resources:
            if r.assignedIncidentId == incident_id or r.currentAssignment == incident_id:
                r.status = "AVAILABLE"
                r.assignedIncidentId = None
                r.currentAssignment = None
                r.destination = None
                await repository.save_resource(r)
                await emit_event("resource.updated", r.model_dump())

    await emit_event("incident.updated", incident.model_dump())
    if status == "RESOLVED":
        await emit_event("incident.resolved", {"incidentId": incident.id, "incident": incident.model_dump()})

    await CoordinationAgent.log_audit(
        "INCIDENT_STATUS_CHANGED",
        f"Incident {incident.id} status updated to {status}{' (Removed from active tactical queue & resources released)' if status == 'RESOLVED' else ''}",
        incident_id=incident.id
    )

    return incident
