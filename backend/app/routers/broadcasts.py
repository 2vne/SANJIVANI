import random
from datetime import datetime, timezone
from fastapi import APIRouter, Body
from typing import List, Dict, Any
from ..models.schemas import Broadcast
from ..repository import repository
from ..services.coordination_agent import CoordinationAgent, emit_event

router = APIRouter(prefix="/broadcasts", tags=["Broadcasts"])

@router.get("", response_model=List[Broadcast])
async def get_broadcasts():
    return await repository.get_broadcasts()

@router.post("", status_code=201)
async def create_broadcast(payload: Dict[str, Any] = Body(...)):
    broadcast = Broadcast(
        id=f"BRD-{random.randint(100, 999)}",
        timestamp=datetime.now(timezone.utc).isoformat(),
        priority=payload.get("priority", "EMERGENCY"),
        title=payload.get("title", "Emergency Notification"),
        message=payload.get("message", ""),
        targetArea=payload.get("targetArea", "ALL SECTORS"),
        issuedBy=payload.get("issuedBy", "Command Officer")
    )

    await repository.save_broadcast(broadcast)
    await emit_event("broadcast.created", broadcast.model_dump())
    await CoordinationAgent.log_audit(
        "BROADCAST_SENT",
        f"Broadcast transmitted: {broadcast.title}"
    )

    return broadcast
