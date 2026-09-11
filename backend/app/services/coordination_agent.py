import random
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
import socketio
from ..models.schemas import Incident, Resource, Allocation, AuditEvent, Alert, AIAssessment
from ..repository import repository
from ..utils.haversine import calculate_haversine_distance
from .needs_assessment_agent import NeedsAssessmentAgent
from .allocation_agent import AllocationAgent

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

async def emit_event(event_name: str, payload: Any):
    try:
        await sio.emit(event_name, payload)
    except Exception as e:
        print(f"[Socket.IO] Emit error for {event_name}: {e}")

class CoordinationAgent:
    @staticmethod
    async def log_audit(
        action: str,
        description: str,
        incident_id: Optional[str] = None,
        resource_id: Optional[str] = None,
        actor: str = "EOC Coordination Engine"
    ) -> AuditEvent:
        audit = AuditEvent(
            id=f"AUD-{random.randint(500, 9999)}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor=actor,
            action=action,
            incidentId=incident_id,
            resourceId=resource_id,
            description=description
        )
        await repository.save_audit_event(audit)
        await emit_event("audit.created", audit.model_dump())
        return audit

    @classmethod
    async def handle_new_incident(cls, incident_data: Dict[str, Any]) -> Dict[str, Any]:
        existing_incidents = await repository.get_incidents()
        active_incidents = [i for i in existing_incidents if i.status not in ["RESOLVED", "CANCELLED"]]

        new_lat = float(incident_data.get("latitude") or 19.0760)
        new_lon = float(incident_data.get("longitude") or 72.8777)
        new_category = incident_data.get("category") or "FLOOD"

        # -------------------------------------------------------------
        # DUPLICATE EFFORT DETECTOR LOGIC:
        # 0.5 km (500m) radius and matching category or title keyword
        # -------------------------------------------------------------
        duplicate_collision: Optional[Incident] = None
        for existing in active_incidents:
            dist_km = calculate_haversine_distance(existing.latitude, existing.longitude, new_lat, new_lon)
            same_category = existing.category == new_category
            title_kw = incident_data.get("title", "").split(" ")[0] if incident_data.get("title") else ""
            similar_title = len(title_kw) > 3 and title_kw.lower() in existing.title.lower()

            if dist_km <= 0.5 and (same_category or similar_title):
                duplicate_collision = existing
                break

        if duplicate_collision:
            # Merge duplicate report into existing active incident
            add_trapped = int(incident_data.get("peopleTrapped") or 0)
            add_injured = int(incident_data.get("injured") or 0)
            add_affected = int(incident_data.get("peopleAffected") or 1)

            duplicate_collision.peopleTrapped = (duplicate_collision.peopleTrapped or 0) + add_trapped
            duplicate_collision.injured = (duplicate_collision.injured or 0) + add_injured
            duplicate_collision.peopleAffected = max(
                duplicate_collision.peopleAffected or 1,
                (duplicate_collision.peopleAffected or 0) + add_affected
            )

            new_desc = incident_data.get("description")
            if new_desc and new_desc not in duplicate_collision.description:
                duplicate_collision.description += f" | [Duplicate Field Report]: {new_desc}"

            # Re-assess live AI triage with updated casualty metrics
            updated_assessment = await NeedsAssessmentAgent.assess_incident_async(duplicate_collision.model_dump())
            duplicate_collision.aiAssessment = updated_assessment
            combined_reqs = set(duplicate_collision.requiredResources or []) | set(updated_assessment.recommendedResourceTypes)
            duplicate_collision.requiredResources = list(combined_reqs)

            await repository.save_incident(duplicate_collision)

            await emit_event("incident.updated", duplicate_collision.model_dump())
            await emit_event("incident.duplicate_merged", {
                "existingIncidentId": duplicate_collision.id,
                "mergedReport": incident_data,
                "mergedIncident": duplicate_collision.model_dump(),
            })

            await cls.log_audit(
                "INCIDENT_MERGED_DUPLICATE",
                f"Duplicate report merged into existing incident {duplicate_collision.id} (500m collision radius). Trapped: {duplicate_collision.peopleTrapped}, Injured: {duplicate_collision.injured}.",
                incident_id=duplicate_collision.id,
                actor=incident_data.get("source") or "Citizen Reporter Portal"
            )

            return {
                "incident": duplicate_collision,
                "assessment": updated_assessment,
                "isDuplicateMerged": True,
                "mergedIntoIncidentId": duplicate_collision.id,
            }

        # New Incident Creation
        inc_id = incident_data.get("id") or f"INC-2026-{random.randint(1000, 9999)}"
        assessment = await NeedsAssessmentAgent.assess_incident_async(incident_data)

        incident = Incident(
            id=inc_id,
            title=incident_data.get("title") or "Emergency Incident Report",
            description=incident_data.get("description") or "Distress signal received from field.",
            category=incident_data.get("category") or "FLOOD",
            severity=incident_data.get("severity") or "HIGH",
            status="REPORTED",
            latitude=new_lat,
            longitude=new_lon,
            reportedAt=datetime.now(timezone.utc).isoformat(),
            peopleAffected=int(incident_data.get("peopleAffected") or 1),
            peopleTrapped=int(incident_data.get("peopleTrapped") or 0),
            injured=int(incident_data.get("injured") or 0),
            requiredResources=assessment.recommendedResourceTypes,
            assignedResources=[],
            source=incident_data.get("source") or "Citizen Reporter Portal",
            photoUrl=incident_data.get("photoUrl"),
            aiAssessment=assessment,
            eta=15
        )

        await repository.save_incident(incident)
        await emit_event("incident.created", incident.model_dump())
        await emit_event("incident.assessed", {
            "incidentId": incident.id,
            "assessment": assessment.model_dump()
        })

        await cls.log_audit(
            "INCIDENT_CREATED",
            f"New incident registered: {incident.title} ({incident.severity})",
            incident_id=incident.id,
            actor=incident.source
        )

        recommendation = await AllocationAgent.recommend_allocation(incident)
        if recommendation:
            await emit_event("allocation.recommended", {
                "incidentId": incident.id,
                "recommendation": recommendation,
            })

        return {
            "incident": incident,
            "assessment": assessment,
            "recommendation": recommendation
        }

    @classmethod
    async def dispatch_resource(
        cls,
        incident_id: str,
        resource_id: str,
        need_type: Optional[str] = None,
        notes: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        incident = await repository.get_incident_by_id(incident_id)
        resource = await repository.get_resource_by_id(resource_id)

        if not incident or not resource:
            return None

        rec = await AllocationAgent.recommend_allocation(incident, resource.type)
        distance = rec["distance"] if rec else 3.5
        eta = rec["eta"] if rec else 15
        priority_score = incident.aiAssessment.priorityScore if incident.aiAssessment else 80

        # Update Resource
        resource.status = "EN_ROUTE"
        resource.currentAssignment = incident_id
        resource.assignedIncidentId = incident_id
        resource.destination = incident.title
        resource.eta = eta
        await repository.save_resource(resource)

        # Update Incident
        if resource_id not in incident.assignedResources:
            incident.assignedResources.append(resource_id)
        incident.status = "DISPATCHED"
        incident.eta = eta
        await repository.save_incident(incident)

        # Create Allocation
        allocation = await AllocationAgent.create_allocation_record(
            incident_id,
            resource_id,
            need_type or resource.type,
            priority_score,
            distance,
            eta,
            notes or f"Dispatched by EOC Command to {incident.title}"
        )

        await emit_event("resource.dispatched", {
            "incidentId": incident_id,
            "resourceId": resource_id,
            "resource": resource.model_dump(),
            "incident": incident.model_dump()
        })
        await emit_event("allocation.created", allocation.model_dump())
        await emit_event("incident.updated", incident.model_dump())

        await cls.log_audit(
            "RESOURCE_DISPATCHED",
            f"Unit {resource.name} dispatched to incident {incident_id} (ETA: {eta}m)",
            incident_id=incident_id,
            resource_id=resource_id
        )

        return {"incident": incident, "resource": resource, "allocation": allocation}

    @classmethod
    async def reallocate_resource(
        cls,
        old_resource_id: str,
        new_resource_id: str,
        incident_id: str
    ) -> Optional[Dict[str, Any]]:
        incident = await repository.get_incident_by_id(incident_id)
        old_resource = await repository.get_resource_by_id(old_resource_id)
        new_resource = await repository.get_resource_by_id(new_resource_id)

        if not incident or not old_resource or not new_resource:
            return None

        # Release old resource
        old_resource.status = "AVAILABLE"
        old_resource.currentAssignment = None
        old_resource.assignedIncidentId = None
        old_resource.destination = None
        old_resource.eta = None
        await repository.save_resource(old_resource)

        # Assign new resource
        rec = await AllocationAgent.recommend_allocation(incident, new_resource.type)
        distance = rec["distance"] if rec else 4.0
        eta = rec["eta"] if rec else 15
        new_resource.status = "EN_ROUTE"
        new_resource.currentAssignment = incident_id
        new_resource.assignedIncidentId = incident_id
        new_resource.destination = incident.title
        new_resource.eta = eta
        await repository.save_resource(new_resource)

        # Update active allocations
        all_allocations = await repository.get_allocations()
        for a in all_allocations:
            if a.incidentId == incident_id and a.resourceId == old_resource_id and a.status == "ACTIVE":
                a.status = "REALLOCATED"
                await repository.save_allocation(a)

        # Create new allocation
        new_allocation = await AllocationAgent.create_allocation_record(
            incident_id,
            new_resource_id,
            new_resource.type,
            incident.aiAssessment.priorityScore if incident.aiAssessment else 80,
            distance,
            eta,
            f"Reallocated replacement unit for {old_resource.name}"
        )

        # Update Incident assigned list
        incident.assignedResources = [r for r in incident.assignedResources if r != old_resource_id]
        if new_resource_id not in incident.assignedResources:
            incident.assignedResources.append(new_resource_id)
        await repository.save_incident(incident)

        await emit_event("resource.reallocated", {
            "incidentId": incident_id,
            "oldResourceId": old_resource_id,
            "newResourceId": new_resource_id,
            "allocation": new_allocation.model_dump()
        })
        await emit_event("incident.updated", incident.model_dump())

        await cls.log_audit(
            "RESOURCE_REALLOCATED",
            f"Reallocated unit from {old_resource.name} to {new_resource.name} for incident {incident_id}",
            incident_id=incident_id,
            resource_id=new_resource_id
        )

        return {
            "incident": incident,
            "oldResource": old_resource,
            "newResource": new_resource,
            "allocation": new_allocation
        }

    @classmethod
    async def reset_mock_state(cls) -> Dict[str, Any]:
        sample_incidents = [
            {"title": "Severe Flash Flood & Trapped Residents", "category": "FLOOD", "description": "Rapid water level rise submerging ground levels in urban residential sector."},
            {"title": "Hospital Emergency Power Grid & Battery Failure", "category": "POWER_OUTAGE", "description": "Main transformer blackout endangering ICU and surgical trauma units."},
            {"title": "Hillside Landslide Blocking Primary Evacuation Route", "category": "LANDSLIDE", "description": "Heavy mud and boulder debris obstructing primary transit corridor."},
            {"title": "Chemical Storage Facility Toxic Vapor Rupture", "category": "HAZMAT", "description": "Storage tank valve rupture releasing airborne hazardous plume."},
            {"title": "Commercial Complex Structural Column Collapse", "category": "STRUCTURAL_COLLAPSE", "description": "Lower floor beam failure trapping maintenance personnel inside."},
            {"title": "Brush Wildfire Ignition Near Perimeter Suburb", "category": "WILDFIRE", "description": "High winds pushing perimeter fire towards residential structures."},
            {"title": "Substation Explosion & District Blackout", "category": "POWER_OUTAGE", "description": "Electrical explosion disrupting municipal water pumps and emergency shelters."},
            {"title": "Coastal Tidal Surge Inundating Bus & Transit Depot", "category": "FLOOD", "description": "High tide surge overflowing sea wall into central transit station."}
        ]

        severities = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
        base_lat = 19.0760
        base_lon = 72.8777

        count = 4 + random.randint(0, 2)
        shuffled = random.sample(sample_incidents, count)
        generated_incidents = []

        for i, sample in enumerate(shuffled):
            severity = "CRITICAL" if i == 0 else random.choice(severities)
            trapped = random.randint(6, 40)
            injured = random.randint(0, 12)
            lat_offset = (random.random() - 0.5) * 0.08
            lon_offset = (random.random() - 0.5) * 0.09

            inc_data = {
                "id": f"INC-2026-{random.randint(1000, 9999)}",
                "title": f"{sample['title']} - Sector {random.randint(1, 12)}",
                "description": sample["description"],
                "category": sample["category"],
                "severity": severity,
                "latitude": round(base_lat + lat_offset, 4),
                "longitude": round(base_lon + lon_offset, 4),
                "peopleAffected": trapped * 4 + random.randint(1, 100),
                "peopleTrapped": trapped,
                "injured": injured,
                "source": "Automated Mock Radar Simulator"
            }

            assessment = await NeedsAssessmentAgent.assess_incident_async(inc_data)

            incident = Incident(
                id=inc_data["id"],
                title=inc_data["title"],
                description=inc_data["description"],
                category=inc_data["category"],
                severity=inc_data["severity"],
                status="REPORTED",
                latitude=inc_data["latitude"],
                longitude=inc_data["longitude"],
                reportedAt=(datetime.now(timezone.utc) - timedelta(minutes=random.randint(5, 45))).isoformat(),
                peopleAffected=inc_data["peopleAffected"],
                peopleTrapped=inc_data["peopleTrapped"],
                injured=inc_data["injured"],
                requiredResources=assessment.recommendedResourceTypes,
                assignedResources=[],
                source=inc_data["source"],
                aiAssessment=assessment,
                eta=15
            )
            generated_incidents.append(incident)

        await repository.set_incidents(generated_incidents)

        resources = await repository.get_resources()
        for r in resources:
            r.status = "AVAILABLE"
            r.currentAssignment = None
            r.assignedIncidentId = None
            r.destination = None
            r.eta = None
            await repository.save_resource(r)

        await cls.log_audit(
            "MOCK_STATE_RESET",
            f"Wiped existing live incidents and randomly generated {len(generated_incidents)} new incidents in target sector."
        )

        await emit_event("incidents.reset", [i.model_dump() for i in generated_incidents])
        await emit_event("resources.updated", [r.model_dump() for r in resources])

        return {
            "incidents": [i.model_dump() for i in generated_incidents],
            "resources": [r.model_dump() for r in resources]
        }
