from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(tags=["Health"])

@router.get("/health")
async def get_health():
    return {
        "status": "UP",
        "service": "PS20 FastAPI Agentic Disaster Relief Coordinator API",
        "database": "In-Memory Repository Fallback",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
