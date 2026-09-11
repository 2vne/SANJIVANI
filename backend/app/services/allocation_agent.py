import random
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI
from ..models.schemas import Incident, Resource, Allocation
from ..repository import repository
from .needs_assessment_agent import NeedsAssessmentAgent
from .eta_engine import ETAEngine
from ..config import OPENAI_API_KEY

_openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY and "your_openai" not in OPENAI_API_KEY else None

class AllocationAgent:
    @classmethod
    async def recommend_allocation(
        cls,
        incident: Incident,
        preferred_resource_type: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        all_resources = await repository.get_resources()
        available_resources = [r for r in all_resources if r.status == "AVAILABLE"]

        if not available_resources:
            return None

        assessment = NeedsAssessmentAgent.assess_incident(incident.model_dump())

        candidates = []
        for res in available_resources:
            eta_result = await ETAEngine.calculate_eta(
                res.latitude,
                res.longitude,
                incident.latitude,
                incident.longitude
            )
            distance = eta_result["distanceKm"]
            eta = eta_result["durationMinutes"]

            match_score = 100.0 - (distance * 2.5) - (eta * 1.5)
            is_type_match = (
                res.type == preferred_resource_type
                if preferred_resource_type
                else res.type in assessment.recommendedResourceTypes
            )
            if is_type_match:
                match_score += 45.0

            candidates.append({
                "resource": res,
                "distance": distance,
                "eta": eta,
                "priorityScore": assessment.priorityScore,
                "matchScore": match_score,
                "isTypeMatch": is_type_match,
                "route": eta_result["routeEstimate"],
                "weather": eta_result["weatherData"],
            })

        candidates.sort(key=lambda x: x["matchScore"], reverse=True)
        best = candidates[0] if candidates else None
        if not best:
            return None

        reason = f"Selected unit {best['resource'].name} ({best['resource'].agency}) - {'Direct capability match' if best['isTypeMatch'] else 'Secondary support unit'}, {best['distance']}km road distance, weather-adjusted ETA {best['eta']} mins ({best['weather'].condition})."

        if _openai_client:
            try:
                response = await _openai_client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": "You are the PS20 Resource Dispatch AI Agent. Provide a concise 1-2 sentence tactical dispatch justification for selecting this unit."
                        },
                        {
                            "role": "user",
                            "content": f"Incident: '{incident.title}' (Severity: {incident.severity}). Selected Unit: {best['resource'].name} ({best['resource'].type}, {best['resource'].agency}). Road Distance: {best['distance']}km, Weather-Adjusted ETA: {best['eta']} mins. Weather: {best['weather'].condition}."
                        }
                    ],
                    max_tokens=100,
                    temperature=0.3
                )
                ai_text = response.choices[0].message.content
                if ai_text:
                    reason = f"[OpenAI GPT-4o-mini Dispatch Agent] {ai_text.strip()}"
            except Exception as e:
                print(f"[AllocationAgent] OpenAI dispatch justification error: {e}")

        return {
            "resource": best["resource"].model_dump(),
            "distance": best["distance"],
            "eta": best["eta"],
            "priorityScore": best["priorityScore"],
            "reason": reason,
            "geometry": best["route"].geometry,
        }

    @classmethod
    async def create_allocation_record(
        cls,
        incident_id: str,
        resource_id: str,
        need_type: str,
        priority_score: int,
        distance: float,
        eta: int,
        reason: str
    ) -> Allocation:
        allocation = Allocation(
            id=f"ALC-{random.randint(300, 9999)}",
            incidentId=incident_id,
            resourceId=resource_id,
            needType=need_type,
            priorityScore=priority_score,
            distance=distance,
            eta=eta,
            status="ACTIVE",
            reason=reason,
            allocatedAt=datetime.now(timezone.utc).isoformat()
        )
        return await repository.save_allocation(allocation)
