from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field

class AIAssessment(BaseModel):
    priorityScore: int
    zoneScore: Optional[float] = None
    peopleAffectedScore: Optional[float] = None
    disasterTypeScore: Optional[float] = None
    urgencyKeywordScore: Optional[float] = None
    detectedKeywords: Optional[List[str]] = Field(default_factory=list)
    recommendedResourceTypes: List[str] = Field(default_factory=list)
    urgencyReasoning: str = ""
    assessedAt: str = ""
    agentModel: Optional[str] = None

class Incident(BaseModel):
    id: str
    title: str
    description: str = ""
    category: str = "FLOOD"
    severity: Literal['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] = 'HIGH'
    status: Literal['REPORTED', 'DISPATCHED', 'ON_SITE', 'RESOLVED', 'CANCELLED'] = 'REPORTED'
    latitude: float
    longitude: float
    reportedAt: str
    peopleAffected: int = 1
    peopleTrapped: int = 0
    injured: int = 0
    requiredResources: List[str] = Field(default_factory=list)
    assignedResources: List[str] = Field(default_factory=list)
    source: str = "Citizen Reporter Portal"
    photoUrl: Optional[str] = None
    aiAssessment: Optional[AIAssessment] = None
    eta: Optional[int] = 15

class Resource(BaseModel):
    id: str
    name: str
    type: Literal['MEDICAL_UNIT', 'SEARCH_RESCUE', 'SUPPLY_CONVOY', 'HEAVY_EQUIPMENT', 'WATER_VESSEL', 'HELICOPTER']
    agency: str
    latitude: float
    longitude: float
    status: Literal['AVAILABLE', 'EN_ROUTE', 'ON_SITE', 'MAINTENANCE'] = 'AVAILABLE'
    capacity: int = 5
    currentAssignment: Optional[str] = None
    assignedIncidentId: Optional[str] = None
    destination: Optional[str] = None
    eta: Optional[int] = None
    fuelOrSupplyPct: Optional[int] = 100
    contactChannel: Optional[str] = "CH-16"

class Shelter(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    capacity: int
    occupied: int
    availableBeds: int
    foodSupply: float = 7.0  # in days
    waterSupply: float = 7.0  # in days
    medicalStaff: int = 2
    status: Literal['OPEN', 'FULL', 'CLOSED'] = 'OPEN'
    address: Optional[str] = None
    contactPhone: Optional[str] = None

class Allocation(BaseModel):
    id: str
    resourceId: str
    incidentId: str
    needType: str
    priorityScore: int
    distance: float
    eta: int
    status: Literal['ACTIVE', 'REALLOCATED', 'COMPLETED', 'CANCELLED'] = 'ACTIVE'
    reason: str
    allocatedAt: str

class AuditEvent(BaseModel):
    id: str
    timestamp: str
    actor: str = "EOC Coordination Engine"
    action: str
    incidentId: Optional[str] = None
    resourceId: Optional[str] = None
    description: str

class Alert(BaseModel):
    id: str
    severity: Literal['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] = 'HIGH'
    title: str
    message: str
    incidentId: Optional[str] = None
    status: Literal['ACTIVE', 'RESOLVED'] = 'ACTIVE'
    createdAt: str

class Broadcast(BaseModel):
    id: str
    timestamp: str
    priority: Literal['EMERGENCY', 'ADVISORY', 'UPDATE'] = 'EMERGENCY'
    title: str
    message: str
    targetArea: str = "ALL SECTORS"
    issuedBy: str = "Command Officer"

class RouteEstimate(BaseModel):
    distanceKm: float
    durationMinutes: int
    trafficDelayMinutes: Optional[int] = 0
    geometry: Optional[Dict[str, Any]] = None
    source: Literal['TOMTOM_TRAFFIC', 'OSRM', 'FALLBACK']

class WeatherData(BaseModel):
    temperature: float
    precipitation: float
    windSpeed: float
    weatherCode: int
    condition: str
    riskLevel: Literal['NORMAL', 'MODERATE', 'HIGH', 'CRITICAL']
    etaMultiplier: float
    timestamp: str
    source: Literal['OPEN_METEO', 'FALLBACK']

class EmergencyPlace(BaseModel):
    id: str
    name: str
    type: Literal['hospital', 'fire_station', 'police_station', 'ngo', 'rescue']
    latitude: float
    longitude: float
    address: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    distanceKm: float
    source: Literal['OPENSTREETMAP', 'LOCAL_FALLBACK']
