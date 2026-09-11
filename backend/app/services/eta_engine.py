from typing import Dict, Any, Optional
from ..repository import repository
from ..models.schemas import Alert
from .routing_service import RoutingService
from .weather_service import WeatherService

class ETAEngine:
    @classmethod
    async def calculate_eta(
        cls,
        res_lat: float,
        res_lng: float,
        inc_lat: float,
        inc_lng: float,
        delay_factor: float = 1.0
    ) -> Dict[str, Any]:
        route_estimate = await RoutingService.get_route_estimate(res_lat, res_lng, inc_lat, inc_lng)
        weather_data = await WeatherService.get_weather(inc_lat, inc_lng)

        weather_multiplier = weather_data.etaMultiplier or 1.0
        base_minutes = route_estimate.durationMinutes

        duration_minutes = max(2, round(base_minutes * weather_multiplier * delay_factor))

        return {
            "durationMinutes": duration_minutes,
            "distanceKm": route_estimate.distanceKm,
            "weatherData": weather_data,
            "routeEstimate": route_estimate,
        }

    @classmethod
    async def simulate_route_condition(
        cls,
        resource_id: str,
        forced_delay: bool = True
    ) -> Optional[Dict[str, Any]]:
        from .coordination_agent import CoordinationAgent, emit_event
        from .allocation_agent import AllocationAgent

        resource = await repository.get_resource_by_id(resource_id)
        if not resource:
            return None

        incident_id = resource.assignedIncidentId or resource.currentAssignment
        if not incident_id:
            return None

        incident = await repository.get_incident_by_id(incident_id)
        if not incident:
            return None

        old_eta = resource.eta or 10
        delay_multiplier = 2.8 if forced_delay else 1.0

        eta_calculation = await cls.calculate_eta(
            resource.latitude,
            resource.longitude,
            incident.latitude,
            incident.longitude,
            delay_multiplier
        )

        new_eta = eta_calculation["durationMinutes"]
        resource.eta = new_eta
        incident.eta = new_eta

        await repository.save_resource(resource)
        await repository.save_incident(incident)

        # Update active allocations
        all_allocations = await repository.get_allocations()
        for a in all_allocations:
            if a.resourceId == resource_id and a.incidentId == incident.id and a.status == "ACTIVE":
                a.eta = new_eta
                await repository.save_allocation(a)

        reason = f"Transit blockage / Roadbreak detected on route to {incident.title}. ETA expanded from {old_eta}m to {new_eta}m (Weather: {eta_calculation['weatherData'].condition})."

        import random
        from datetime import datetime, timezone
        alert = Alert(
            id=f"ALT-{random.randint(100, 999)}",
            severity="CRITICAL",
            title=f"TRANSIT DELAY: {resource.name}",
            message=reason,
            incidentId=incident.id,
            status="ACTIVE",
            createdAt=datetime.now(timezone.utc).isoformat()
        )
        await repository.save_alert(alert)

        await CoordinationAgent.log_audit(
            "ETA_DELAY_DETECTED",
            reason,
            incident.id,
            resource_id
        )

        recommended_alternative = await AllocationAgent.recommend_allocation(incident)

        await emit_event("resource.eta.updated", {
            "resourceId": resource_id,
            "oldEta": old_eta,
            "newEta": new_eta,
            "incidentId": incident.id
        })
        await emit_event("alert.created", alert.model_dump())
        await emit_event("incident.updated", incident.model_dump())

        if recommended_alternative:
            await emit_event("allocation.recommended", {
                "incidentId": incident.id,
                "recommendation": recommended_alternative,
                "reason": "Original unit delayed; recommended faster replacement"
            })

        return {
            "resourceId": resource_id,
            "oldEta": old_eta,
            "newEta": new_eta,
            "delayDetected": True,
            "reason": reason,
            "recommendedAlternative": recommended_alternative,
            "alert": alert.model_dump()
        }
