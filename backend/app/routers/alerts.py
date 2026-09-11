import random
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from ..models.schemas import Alert
from ..repository import repository
from ..services.coordination_agent import CoordinationAgent, emit_event

router = APIRouter(prefix="/alerts", tags=["Alerts"])

@router.get("", response_model=List[Alert])
async def get_alerts():
    return await repository.get_alerts()

@router.post("", status_code=201)
async def create_alert(payload: Dict[str, Any] = Body(...)):
    alert = Alert(
        id=f"ALT-{random.randint(100, 999)}",
        severity=payload.get("severity", "HIGH"),
        title=payload.get("title", "System Emergency Alert"),
        message=payload.get("message", "Distress condition reported"),
        incidentId=payload.get("incidentId"),
        status="ACTIVE",
        createdAt=datetime.now(timezone.utc).isoformat()
    )

    await repository.save_alert(alert)
    await emit_event("alert.created", alert.model_dump())
    await CoordinationAgent.log_audit(
        "ALERT_CREATED",
        f"Alert created: {alert.title}",
        incident_id=alert.incidentId
    )

    return alert

@router.patch("/{alert_id}/resolve")
async def resolve_alert(alert_id: str):
    alert = await repository.get_alert_by_id(alert_id)
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "RESOLVED"
    await repository.save_alert(alert)
    await emit_event("alert.updated", alert.model_dump())
    await CoordinationAgent.log_audit(
        "ALERT_RESOLVED",
        f"Alert {alert.id} resolved",
        incident_id=alert.incidentId
    )

    return alert
