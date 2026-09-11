import asyncio
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from .models.schemas import Incident, Resource, Shelter, Allocation, AuditEvent, Alert, Broadcast, AIAssessment
from .config import SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
from supabase import create_client, Client

class Repository:
    def __init__(self):
        self.lock = asyncio.Lock()
        self.incidents: List[Incident] = []
        self.resources: List[Resource] = []
        self.shelters: List[Shelter] = []
        self.allocations: List[Allocation] = []
        self.audit_events: List[AuditEvent] = []
        self.alerts: List[Alert] = []
        self.broadcasts: List[Broadcast] = []
        
        # Initialize Supabase if configured
        self.supabase: Optional[Client] = None
        key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY
        if SUPABASE_URL and key:
            try:
                clean_url = SUPABASE_URL.replace("/rest/v1/", "").replace("/rest/v1", "")
                self.supabase = create_client(clean_url, key)
            except Exception as e:
                print(f"[Repository] Supabase initialization warning: {e}")

        self._seed_data()

    def _seed_data(self):
        now = datetime.now(timezone.utc)
        
        # 1. Incidents
        self.incidents = [
            Incident(
                id="INC-2026-8801",
                title="Flash Flood & Trapped Residents in Residential Sector 4",
                description="Rapidly rising water levels (>1.8m) submerging ground level. 28 citizens stranded on building rooftops.",
                category="FLOOD",
                severity="CRITICAL",
                status="REPORTED",
                latitude=19.0820,
                longitude=72.8820,
                reportedAt=(now - timedelta(minutes=14)).isoformat(),
                peopleAffected=120,
                peopleTrapped=28,
                injured=4,
                requiredResources=["WATER_VESSEL", "MEDICAL_UNIT"],
                assignedResources=[],
                source="Field Officer D. Miller (Unit 404)",
                photoUrl="https://images.unsplash.com/photo-1547683905-f686c993aae5",
                aiAssessment=AIAssessment(
                    priorityScore=98,
                    zoneScore=98.0,
                    peopleAffectedScore=41.6,
                    disasterTypeScore=25.0,
                    urgencyKeywordScore=31.4,
                    detectedKeywords=["trapped", "submerged", "critical"],
                    recommendedResourceTypes=["WATER_VESSEL", "HELICOPTER", "MEDICAL_UNIT"],
                    urgencyReasoning="Rapid water level rise poses immediate threat to stranded rooftop victims.",
                    assessedAt=(now - timedelta(minutes=14)).isoformat(),
                    agentModel="Mathematical Zone Scoring Engine"
                ),
                eta=15
            ),
            Incident(
                id="INC-2026-8802",
                title="Major Hospital Emergency Generator Power Grid Failure",
                description="Main transformer exploded following storm surge. ICU life support running on backup battery reserve.",
                category="POWER_OUTAGE",
                severity="CRITICAL",
                status="DISPATCHED",
                latitude=19.0650,
                longitude=72.8680,
                reportedAt=(now - timedelta(minutes=32)).isoformat(),
                peopleAffected=450,
                peopleTrapped=0,
                injured=12,
                requiredResources=["SUPPLY_CONVOY", "MEDICAL_UNIT"],
                assignedResources=["RES-102", "RES-105"],
                source="Dr. Sarah Vance (Chief Medical Off.)",
                photoUrl="https://images.unsplash.com/photo-1516549655169-df83a0774514",
                aiAssessment=AIAssessment(
                    priorityScore=96,
                    zoneScore=96.0,
                    peopleAffectedScore=53.1,
                    disasterTypeScore=20.0,
                    urgencyKeywordScore=22.9,
                    detectedKeywords=["icu", "explosion", "urgent"],
                    recommendedResourceTypes=["SUPPLY_CONVOY", "MEDICAL_UNIT"],
                    urgencyReasoning="Power failure jeopardizes ICU patient life support within 25 minutes.",
                    assessedAt=(now - timedelta(minutes=32)).isoformat(),
                    agentModel="Mathematical Zone Scoring Engine"
                ),
                eta=10
            ),
            Incident(
                id="INC-2026-8803",
                title="Landslide Debris Blocking Highway 12 Emergency Corridor",
                description="Approx 150 tons of mud and boulder debris blocking both lanes of primary supply route.",
                category="LANDSLIDE",
                severity="HIGH",
                status="ON_SITE",
                latitude=19.1100,
                longitude=72.9100,
                reportedAt=(now - timedelta(minutes=55)).isoformat(),
                peopleAffected=200,
                peopleTrapped=6,
                injured=1,
                requiredResources=["HEAVY_EQUIPMENT"],
                assignedResources=["RES-104"],
                source="Highway Patrol Bravo",
                aiAssessment=AIAssessment(
                    priorityScore=84,
                    zoneScore=84.0,
                    peopleAffectedScore=46.0,
                    disasterTypeScore=20.0,
                    urgencyKeywordScore=18.0,
                    detectedKeywords=["landslide", "blocked", "trapped"],
                    recommendedResourceTypes=["HEAVY_EQUIPMENT"],
                    urgencyReasoning="Primary logistics corridor obstructed. Medevac transport rerouted.",
                    assessedAt=(now - timedelta(minutes=55)).isoformat(),
                    agentModel="Mathematical Zone Scoring Engine"
                ),
                eta=0
            ),
            Incident(
                id="INC-2026-8804",
                title="Commercial Chemical Warehouse Structural Rupture",
                description="Structural column failure caused collapse onto ammonia pressure tank.",
                category="HAZMAT",
                severity="HIGH",
                status="REPORTED",
                latitude=19.0420,
                longitude=72.8450,
                reportedAt=(now - timedelta(minutes=78)).isoformat(),
                peopleAffected=80,
                peopleTrapped=4,
                injured=2,
                requiredResources=["SEARCH_RESCUE"],
                assignedResources=[],
                source="Harbor Security Dispatch",
                aiAssessment=AIAssessment(
                    priorityScore=88,
                    zoneScore=88.0,
                    peopleAffectedScore=38.1,
                    disasterTypeScore=30.0,
                    urgencyKeywordScore=19.9,
                    detectedKeywords=["toxic", "collapse", "leak"],
                    recommendedResourceTypes=["SEARCH_RESCUE", "MEDICAL_UNIT"],
                    urgencyReasoning="Toxic plume moving towards residential sector.",
                    assessedAt=(now - timedelta(minutes=78)).isoformat(),
                    agentModel="Mathematical Zone Scoring Engine"
                ),
                eta=20
            ),
            Incident(
                id="INC-2026-8805",
                title="Bridge Approach Washout & Stranded Transit Bus",
                description="North approach road collapsed into river. City bus trapped on intact span section.",
                category="STRUCTURAL_COLLAPSE",
                severity="MEDIUM",
                status="DISPATCHED",
                latitude=19.0980,
                longitude=72.8520,
                reportedAt=(now - timedelta(minutes=110)).isoformat(),
                peopleAffected=15,
                peopleTrapped=15,
                injured=0,
                requiredResources=["SEARCH_RESCUE"],
                assignedResources=["RES-101"],
                source="Citizen Reporter ID #9041",
                aiAssessment=AIAssessment(
                    priorityScore=72,
                    zoneScore=72.0,
                    peopleAffectedScore=23.5,
                    disasterTypeScore=30.0,
                    urgencyKeywordScore=18.5,
                    detectedKeywords=["collapse", "trapped"],
                    recommendedResourceTypes=["SEARCH_RESCUE"],
                    urgencyReasoning="Passengers trapped on isolated span; bridge structure stable for now.",
                    assessedAt=(now - timedelta(minutes=110)).isoformat(),
                    agentModel="Mathematical Zone Scoring Engine"
                ),
                eta=12
            )
        ]

        # 2. Resources
        self.resources = [
            Resource(
                id="RES-101",
                name="Rapid Search & Water Rescue Boat Alpha",
                type="WATER_VESSEL",
                agency="Coast Guard Squad 7",
                latitude=19.0880,
                longitude=72.8700,
                status="EN_ROUTE",
                capacity=12,
                currentAssignment="INC-2026-8805",
                assignedIncidentId="INC-2026-8805",
                destination="Bridge Approach Washout & Stranded Transit Bus",
                eta=12,
                fuelOrSupplyPct=85,
                contactChannel="CH-12"
            ),
            Resource(
                id="RES-102",
                name="Mobile Intensive Trauma Critical Care Unit 3",
                type="MEDICAL_UNIT",
                agency="Metropolitan Red Cross EMS",
                latitude=19.0600,
                longitude=72.8750,
                status="EN_ROUTE",
                capacity=6,
                currentAssignment="INC-2026-8802",
                assignedIncidentId="INC-2026-8802",
                destination="Major Hospital Emergency Generator Power Grid Failure",
                eta=8,
                fuelOrSupplyPct=92,
                contactChannel="EMS-MED1"
            ),
            Resource(
                id="RES-103",
                name="Heavy Urban Search & K9 Rescue Squad 9",
                type="SEARCH_RESCUE",
                agency="National Disaster Response Force (NDRF)",
                latitude=19.0750,
                longitude=72.8850,
                status="AVAILABLE",
                capacity=18,
                fuelOrSupplyPct=100,
                contactChannel="TAC-RESCUE"
            ),
            Resource(
                id="RES-104",
                name="Excavator & Earthmover Debris Clearance Unit",
                type="HEAVY_EQUIPMENT",
                agency="Municipal Infrastructure Dept",
                latitude=19.1120,
                longitude=72.9080,
                status="ON_SITE",
                capacity=4,
                currentAssignment="INC-2026-8803",
                assignedIncidentId="INC-2026-8803",
                destination="Landslide Debris Blocking Highway 12 Emergency Corridor",
                eta=0,
                fuelOrSupplyPct=68,
                contactChannel="HWY-CLEAR"
            ),
            Resource(
                id="RES-105",
                name="Emergency High-Output Generator Convoy Beta",
                type="SUPPLY_CONVOY",
                agency="State Power Distribution & Logistics",
                latitude=19.0550,
                longitude=72.8600,
                status="EN_ROUTE",
                capacity=8,
                currentAssignment="INC-2026-8802",
                assignedIncidentId="INC-2026-8802",
                destination="Major Hospital Emergency Generator Power Grid Failure",
                eta=10,
                fuelOrSupplyPct=95,
                contactChannel="PWR-LOG"
            ),
            Resource(
                id="RES-106",
                name="Tactical Airlift Helicopter Rescue 2",
                type="HELICOPTER",
                agency="State Aviation Police Wing",
                latitude=19.0900,
                longitude=72.8620,
                status="AVAILABLE",
                capacity=10,
                fuelOrSupplyPct=78,
                contactChannel="AIR-OPS"
            )
        ]

        # 3. Shelters
        self.shelters = [
            Shelter(
                id="SHL-201",
                name="Central Indoor Sports Arena Evacuation Center",
                latitude=19.0720,
                longitude=72.8790,
                capacity=600,
                occupied=410,
                availableBeds=190,
                foodSupply=5.5,
                waterSupply=6.0,
                medicalStaff=8,
                status="OPEN",
                address="Sector 3 Central Sports Complex, Metro Hub",
                contactPhone="+1-800-555-0141"
            ),
            Shelter(
                id="SHL-202",
                name="St. Jude Memorial Hall Disaster Sanctuary",
                latitude=19.0610,
                longitude=72.8550,
                capacity=250,
                occupied=245,
                availableBeds=5,
                foodSupply=3.0,
                waterSupply=3.5,
                medicalStaff=3,
                status="OPEN",
                address="44 Cathedral Ave, West District",
                contactPhone="+1-800-555-0142"
            ),
            Shelter(
                id="SHL-203",
                name="North District Community High School Shelter",
                latitude=19.1020,
                longitude=72.8950,
                capacity=400,
                occupied=180,
                availableBeds=220,
                foodSupply=8.0,
                waterSupply=8.0,
                medicalStaff=5,
                status="OPEN",
                address="102 North Boulevard, Sector 8",
                contactPhone="+1-800-555-0143"
            )
        ]

        # 4. Allocations
        self.allocations = [
            Allocation(
                id="ALC-301",
                incidentId="INC-2026-8802",
                resourceId="RES-102",
                needType="MEDICAL_UNIT",
                priorityScore=96,
                distance=1.8,
                eta=8,
                status="ACTIVE",
                reason="Direct medical capability match for hospital ICU triage support.",
                allocatedAt=(now - timedelta(minutes=28)).isoformat()
            ),
            Allocation(
                id="ALC-302",
                incidentId="INC-2026-8802",
                resourceId="RES-105",
                needType="SUPPLY_CONVOY",
                priorityScore=96,
                distance=2.2,
                eta=10,
                status="ACTIVE",
                reason="Dispatched heavy emergency generators to restore critical life-support power.",
                allocatedAt=(now - timedelta(minutes=26)).isoformat()
            ),
            Allocation(
                id="ALC-303",
                incidentId="INC-2026-8803",
                resourceId="RES-104",
                needType="HEAVY_EQUIPMENT",
                priorityScore=84,
                distance=0.4,
                eta=0,
                status="ACTIVE",
                reason="Immediate obstacle clearance unit on-site clearing landslide roadblock.",
                allocatedAt=(now - timedelta(minutes=50)).isoformat()
            ),
            Allocation(
                id="ALC-304",
                incidentId="INC-2026-8805",
                resourceId="RES-101",
                needType="SEARCH_RESCUE",
                priorityScore=72,
                distance=3.1,
                eta=12,
                status="ACTIVE",
                reason="Rescue vessel deployed for passenger extraction from stranded transit span.",
                allocatedAt=(now - timedelta(minutes=100)).isoformat()
            )
        ]

        # 5. Audit Events
        self.audit_events = [
            AuditEvent(
                id="AUD-501",
                timestamp=(now - timedelta(minutes=110)).isoformat(),
                actor="Citizen Reporter ID #9041",
                action="INCIDENT_CREATED",
                incidentId="INC-2026-8805",
                description="Bridge washout reported on North Approach road."
            ),
            AuditEvent(
                id="AUD-502",
                timestamp=(now - timedelta(minutes=100)).isoformat(),
                actor="EOC Coordination Engine",
                action="RESOURCE_DISPATCHED",
                incidentId="INC-2026-8805",
                resourceId="RES-101",
                description="Unit Rapid Search & Water Rescue Boat Alpha dispatched to incident INC-2026-8805 (ETA: 12m)"
            ),
            AuditEvent(
                id="AUD-503",
                timestamp=(now - timedelta(minutes=55)).isoformat(),
                actor="Highway Patrol Bravo",
                action="INCIDENT_CREATED",
                incidentId="INC-2026-8803",
                description="Massive landslide debris blocking Highway 12 corridor reported."
            ),
            AuditEvent(
                id="AUD-504",
                timestamp=(now - timedelta(minutes=32)).isoformat(),
                actor="Dr. Sarah Vance",
                action="INCIDENT_CREATED",
                incidentId="INC-2026-8802",
                description="Hospital main generator power grid failure reported."
            ),
            AuditEvent(
                id="AUD-505",
                timestamp=(now - timedelta(minutes=28)).isoformat(),
                actor="EOC Coordination Engine",
                action="RESOURCE_DISPATCHED",
                incidentId="INC-2026-8802",
                resourceId="RES-102",
                description="Unit Mobile Intensive Trauma Critical Care Unit 3 dispatched to incident INC-2026-8802 (ETA: 8m)"
            )
        ]

        # 6. Alerts
        self.alerts = [
            Alert(
                id="ALT-101",
                severity="CRITICAL",
                title="ICU LIFE SUPPORT POWER COMPROMISED",
                message="Hospital ICU backup batteries have under 25 minutes of reserve power remaining.",
                incidentId="INC-2026-8802",
                status="ACTIVE",
                createdAt=(now - timedelta(minutes=30)).isoformat()
            ),
            Alert(
                id="ALT-102",
                severity="HIGH",
                title="HIGHWAY 12 TRANSIT BLOCKED",
                message="All northbound medical & evacuation convoys rerouted via Bypass 4.",
                incidentId="INC-2026-8803",
                status="ACTIVE",
                createdAt=(now - timedelta(minutes=52)).isoformat()
            )
        ]

        # 7. Broadcasts
        self.broadcasts = [
            Broadcast(
                id="BRD-101",
                timestamp=(now - timedelta(minutes=45)).isoformat(),
                priority="EMERGENCY",
                title="FLASH FLOOD WARNING - SECTOR 4",
                message="Immediate vertical evacuation ordered for ground-floor residents near river basin.",
                targetArea="SECTOR 4 & DOWNTOWN RIVERFRONT",
                issuedBy="EOC Incident Commander"
            ),
            Broadcast(
                id="BRD-102",
                timestamp=(now - timedelta(minutes=15)).isoformat(),
                priority="ADVISORY",
                title="CENTRAL SHELTER BED AVAILABILITY",
                message="Central Sports Arena shelter currently has 190 beds and hot meal service available.",
                targetArea="ALL METRO SECTORS",
                issuedBy="Public Relief Coordination Desk"
            )
        ]

    # --- Async Repository Access Methods ---
    async def get_incidents(self) -> List[Incident]:
        async with self.lock:
            return list(self.incidents)

    async def get_incident_by_id(self, incident_id: str) -> Optional[Incident]:
        async with self.lock:
            for inc in self.incidents:
                if inc.id == incident_id:
                    return inc
            return None

    async def save_incident(self, incident: Incident) -> Incident:
        async with self.lock:
            for idx, inc in enumerate(self.incidents):
                if inc.id == incident.id:
                    self.incidents[idx] = incident
                    return incident
            self.incidents.insert(0, incident)
            return incident

    async def set_incidents(self, incidents: List[Incident]):
        async with self.lock:
            self.incidents = list(incidents)

    async def get_resources(self) -> List[Resource]:
        async with self.lock:
            return list(self.resources)

    async def get_resource_by_id(self, resource_id: str) -> Optional[Resource]:
        async with self.lock:
            for r in self.resources:
                if r.id == resource_id:
                    return r
            return None

    async def save_resource(self, resource: Resource) -> Resource:
        async with self.lock:
            for idx, r in enumerate(self.resources):
                if r.id == resource.id:
                    self.resources[idx] = resource
                    return resource
            self.resources.append(resource)
            return resource

    async def get_shelters(self) -> List[Shelter]:
        async with self.lock:
            return list(self.shelters)

    async def get_shelter_by_id(self, shelter_id: str) -> Optional[Shelter]:
        async with self.lock:
            for s in self.shelters:
                if s.id == shelter_id:
                    return s
            return None

    async def save_shelter(self, shelter: Shelter) -> Shelter:
        async with self.lock:
            for idx, s in enumerate(self.shelters):
                if s.id == shelter.id:
                    self.shelters[idx] = shelter
                    return shelter
            self.shelters.append(shelter)
            return shelter

    async def get_allocations(self) -> List[Allocation]:
        async with self.lock:
            return list(self.allocations)

    async def save_allocation(self, allocation: Allocation) -> Allocation:
        async with self.lock:
            for idx, a in enumerate(self.allocations):
                if a.id == allocation.id:
                    self.allocations[idx] = allocation
                    return allocation
            self.allocations.insert(0, allocation)
            return allocation

    async def get_audit_events(self) -> List[AuditEvent]:
        async with self.lock:
            return list(self.audit_events)

    async def save_audit_event(self, audit: AuditEvent) -> AuditEvent:
        async with self.lock:
            self.audit_events.insert(0, audit)
            return audit

    async def get_alerts(self) -> List[Alert]:
        async with self.lock:
            return list(self.alerts)

    async def get_alert_by_id(self, alert_id: str) -> Optional[Alert]:
        async with self.lock:
            for a in self.alerts:
                if a.id == alert_id:
                    return a
            return None

    async def save_alert(self, alert: Alert) -> Alert:
        async with self.lock:
            for idx, a in enumerate(self.alerts):
                if a.id == alert.id:
                    self.alerts[idx] = alert
                    return alert
            self.alerts.insert(0, alert)
            return alert

    async def get_broadcasts(self) -> List[Broadcast]:
        async with self.lock:
            return list(self.broadcasts)

    async def save_broadcast(self, broadcast: Broadcast) -> Broadcast:
        async with self.lock:
            self.broadcasts.insert(0, broadcast)
            return broadcast

repository = Repository()
