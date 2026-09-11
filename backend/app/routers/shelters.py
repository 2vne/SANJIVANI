from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from ..models.schemas import Shelter
from ..repository import repository
from ..services.coordination_agent import CoordinationAgent, emit_event

router = APIRouter(prefix="/shelters", tags=["Shelters"])

@router.get("", response_model=List[Shelter])
async def get_shelters():
    return await repository.get_shelters()

@router.get("/{shelter_id}")
async def get_shelter_by_id(shelter_id: str):
    shelter = await repository.get_shelter_by_id(shelter_id)
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")
    return shelter

@router.patch("/{shelter_id}")
async def update_shelter(shelter_id: str, payload: Dict[str, Any] = Body(...)):
    shelter = await repository.get_shelter_by_id(shelter_id)
    if not shelter:
        raise HTTPException(status_code=404, detail="Shelter not found")

    data = shelter.model_dump()
    data.update(payload)
    occupied = int(data.get("occupied", 0))
    capacity = int(data.get("capacity", 0))

    if occupied >= capacity:
        data["status"] = "FULL"
    elif data.get("status") == "FULL" and occupied < capacity:
        data["status"] = "OPEN"

    data["availableBeds"] = max(0, capacity - occupied)

    updated_shelter = Shelter(**data)
    await repository.save_shelter(updated_shelter)

    await emit_event("shelter.updated", updated_shelter.model_dump())
    await CoordinationAgent.log_audit(
        "SHELTER_UPDATED",
        f"Shelter {updated_shelter.name} updated: Occupancy {updated_shelter.occupied}/{updated_shelter.capacity}"
    )

    return updated_shelter
