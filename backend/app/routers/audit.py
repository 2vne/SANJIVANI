from fastapi import APIRouter
from typing import List
from ..models.schemas import AuditEvent
from ..repository import repository

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("", response_model=List[AuditEvent])
async def get_audit():
    return await repository.get_audit_events()
