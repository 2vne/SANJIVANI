import random
from fastapi import APIRouter, Query, HTTPException
from datetime import datetime, timezone
from ..services.weather_service import WeatherService
from ..models.schemas import WeatherData, Alert
from ..repository import repository
from ..services.coordination_agent import CoordinationAgent, emit_event

router = APIRouter(prefix="/weather", tags=["Weather"])

@router.get("", response_model=WeatherData)
async def get_weather(lat: float = Query(...), lon: float = Query(...)):
    result = await WeatherService.get_weather(lat, lon)

    if result.riskLevel in ["HIGH", "CRITICAL"]:
        alert_title = f"WEATHER RISK {result.riskLevel}: {result.condition}"
        existing_alerts = await repository.get_alerts()
        duplicate_alert = next(
            (a for a in existing_alerts if a.title == alert_title or (result.condition in a.title and a.status == "ACTIVE")),
            None
        )

        if not duplicate_alert:
            new_alert = Alert(
                id=f"ALT-{random.randint(100, 999)}",
                severity="CRITICAL" if result.riskLevel == "CRITICAL" else "HIGH",
                title=alert_title,
                message=f"Open-Meteo Weather Intelligence detected severe conditions ({result.precipitation}mm/h rain, {result.windSpeed}km/h wind). ETA multiplier: {result.etaMultiplier}x.",
                status="ACTIVE",
                createdAt=datetime.now(timezone.utc).isoformat()
            )
            await repository.save_alert(new_alert)

            await CoordinationAgent.log_audit(
                "WEATHER_ALERT_TRIGGERED",
                f"Weather Intelligence -> {result.condition} detected -> ETA multiplier {result.etaMultiplier}x",
                actor="Weather Intelligence Engine"
            )

            await emit_event("weather.alert", {"weather": result.model_dump(), "alert": new_alert.model_dump()})
            await emit_event("alert.created", new_alert.model_dump())

    return result
