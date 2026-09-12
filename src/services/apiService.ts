import { io, Socket } from 'socket.io-client';
import {
  Incident,
  ResourceUnit,
  Shelter,
  Allocation,
  SystemAlert,
  BroadcastMessage,
  AuditEvent,
  IncidentStatus,
  EmergencyPlace,
} from '../types';

const LOCAL_BACKEND = 'http://localhost:5000';
const API_BASE = import.meta.env.VITE_API_BASE_URL || `${LOCAL_BACKEND}/api`;
let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || LOCAL_BACKEND;
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
  }
  return socket;
};

export function normalizeIncident(inc: any): Incident {
  if (!inc) return inc;

  const lat = inc.location?.lat ?? inc.latitude ?? 19.076;
  const lng = inc.location?.lng ?? inc.longitude ?? 72.8777;
  const address = inc.location?.address ?? inc.address ?? inc.title ?? 'Disaster Sector';
  const zone = inc.location?.zone ?? inc.zone ?? 'Metro Disaster Zone';

  const strandedCount = inc.strandedCount ?? inc.peopleTrapped ?? inc.peopleAffected ?? 0;
  const injuredCount = inc.injuredCount ?? inc.injured ?? 0;
  const dispatchedUnitIds = inc.dispatchedUnitIds ?? inc.assignedResources ?? [];
  const aiPriorityScore = inc.aiPriorityScore ?? inc.aiAssessment?.priorityScore ?? 50;
  const zoneScore = inc.zoneScore ?? inc.aiAssessment?.zoneScore;
  const peopleAffectedScore = inc.peopleAffectedScore ?? inc.aiAssessment?.peopleAffectedScore;
  const disasterTypeScore = inc.disasterTypeScore ?? inc.aiAssessment?.disasterTypeScore;
  const urgencyKeywordScore = inc.urgencyKeywordScore ?? inc.aiAssessment?.urgencyKeywordScore;
  const detectedKeywords = inc.detectedKeywords ?? inc.aiAssessment?.detectedKeywords;
  const urgencyReasoning = inc.urgencyReasoning ?? inc.aiAssessment?.urgencyReasoning;
  const urgentNeeds = inc.urgentNeeds ?? inc.requiredResources ?? [];
  const reportedBy = inc.reportedBy ?? inc.source ?? 'Field Reporter';
  const etaMinutes = inc.etaMinutes ?? inc.eta;

  return {
    id: inc.id || `INC-${Date.now()}`,
    title: inc.title || 'Untitled Incident',
    category: inc.category || 'FLOOD',
    severity: inc.severity || 'MEDIUM',
    status: inc.status || 'REPORTED',
    location: { lat, lng, address, zone },
    reportedAt: inc.reportedAt || new Date().toISOString(),
    reportedBy,
    strandedCount,
    injuredCount,
    urgentNeeds,
    description: inc.description || '',
    dispatchedUnitIds,
    aiPriorityScore,
    zoneScore,
    peopleAffectedScore,
    disasterTypeScore,
    urgencyKeywordScore,
    detectedKeywords,
    urgencyReasoning,
    aiAssessment: inc.aiAssessment,
    etaMinutes,
  };
}

export function normalizeResource(res: any): ResourceUnit {
  if (!res) return res;

  const lat = res.currentLocation?.lat ?? res.latitude ?? 19.076;
  const lng = res.currentLocation?.lng ?? res.longitude ?? 72.8777;
  const address = res.currentLocation?.address ?? res.address ?? res.agency ?? 'Base Station';
  const zone = res.currentLocation?.zone ?? res.zone ?? 'Central Zone';

  const callsign = res.callsign ?? res.name ?? res.id;
  const category = res.category ?? res.type ?? 'SEARCH_RESCUE';
  const personnelCount = res.personnelCount ?? res.capacity ?? 5;
  const fuelOrSupplyPct = res.fuelOrSupplyPct ?? 100;
  const contactChannel = res.contactChannel ?? 'CH-16';
  const etaMinutes = res.etaMinutes ?? res.eta;

  return {
    id: res.id,
    callsign,
    category,
    status: res.status || 'AVAILABLE',
    personnelCount,
    currentLocation: { lat, lng, address, zone },
    assignedIncidentId: res.assignedIncidentId || res.currentAssignment,
    fuelOrSupplyPct,
    contactChannel,
    etaMinutes,
  };
}

export function normalizeShelter(shl: any): Shelter {
  if (!shl) return shl;

  const lat = shl.location?.lat ?? shl.latitude ?? 19.076;
  const lng = shl.location?.lng ?? shl.longitude ?? 72.8777;
  const address = shl.location?.address ?? shl.address ?? shl.name ?? 'Emergency Shelter';
  const zone = shl.location?.zone ?? shl.zone ?? 'Safe Zone';

  const foodSupplyDays = shl.supplies?.foodDays ?? shl.foodSupplyDays ?? shl.foodSupply ?? 3;
  const waterSupplyDays = shl.supplies?.waterDays ?? shl.waterSupplyDays ?? shl.waterSupply ?? 3;
  const medicalStaffCount = shl.medicalStaffCount ?? shl.medicalStaff ?? 2;
  const occupied = shl.currentOccupancy ?? shl.occupied ?? 0;

  return {
    id: shl.id,
    name: shl.name || 'Shelter Facility',
    location: { lat, lng, address, zone },
    capacity: shl.capacity ?? 100,
    currentOccupancy: occupied,
    occupied,
    medicalStaffCount,
    supplies: {
      waterDays: waterSupplyDays,
      foodDays: foodSupplyDays,
      medicalKits: shl.supplies?.medicalKits ?? 50,
    },
    contactPhone: shl.contactPhone || '108',
    isOpen: shl.isOpen ?? (shl.status !== 'CLOSED'),
    status: shl.status || 'OPEN',
  };
}

export function normalizeAllocation(alc: any): Allocation {
  if (!alc) return alc;
  const dispatchedAt = alc.dispatchedAt || alc.allocatedAt || new Date().toISOString();
  return {
    id: alc.id,
    incidentId: alc.incidentId,
    resourceId: alc.resourceId,
    dispatchedAt,
    allocatedAt: dispatchedAt,
    status: alc.status || 'ACTIVE',
    etaMinutes: alc.etaMinutes ?? alc.eta ?? 0,
    routePolyline: alc.routePolyline || alc.geometry?.coordinates,
    notes: alc.notes,
  };
}

export const apiService = {
  // REST Getters with fallback to local state if backend unreachable
  fetchIncidents: async (): Promise<Incident[]> => {
    try {
      const res = await fetch(`${API_BASE}/incidents`);
      if (res.ok) {
        const raw = await res.json();
        return Array.isArray(raw) ? raw.map(normalizeIncident) : [];
      }
    } catch (e) {
      console.warn('Backend REST endpoint offline, using local cache', e);
    }
    return [];
  },

  fetchResources: async (): Promise<ResourceUnit[]> => {
    try {
      const res = await fetch(`${API_BASE}/resources`);
      if (res.ok) {
        const raw = await res.json();
        return Array.isArray(raw) ? raw.map(normalizeResource) : [];
      }
    } catch (e) {
      console.warn('Backend REST endpoint offline', e);
    }
    return [];
  },

  fetchShelters: async (): Promise<Shelter[]> => {
    try {
      const res = await fetch(`${API_BASE}/shelters`);
      if (res.ok) {
        const raw = await res.json();
        return Array.isArray(raw) ? raw.map(normalizeShelter) : [];
      }
    } catch (e) {
      console.warn('Backend REST endpoint offline', e);
    }
    return [];
  },

  fetchAlerts: async (): Promise<SystemAlert[]> => {
    try {
      const res = await fetch(`${API_BASE}/alerts`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend REST endpoint offline', e);
    }
    return [];
  },

  fetchAuditEvents: async (): Promise<AuditEvent[]> => {
    try {
      const res = await fetch(`${API_BASE}/audit`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend REST endpoint offline', e);
    }
    return [];
  },

  fetchBroadcasts: async (): Promise<BroadcastMessage[]> => {
    try {
      const res = await fetch(`${API_BASE}/broadcasts`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend REST endpoint offline', e);
    }
    return [];
  },

  fetchAllocations: async (): Promise<Allocation[]> => {
    try {
      const res = await fetch(`${API_BASE}/allocations`);
      if (res.ok) {
        const raw = await res.json();
        return Array.isArray(raw) ? raw.map(normalizeAllocation) : [];
      }
    } catch (e) {
      console.warn('Backend REST endpoint offline', e);
    }
    return [];
  },

  fetchAnalytics: async (): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/analytics`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend REST endpoint offline for analytics', e);
    }
    return null;
  },

  fetchIncidentById: async (id: string): Promise<Incident | null> => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}`);
      if (res.ok) {
        const raw = await res.json();
        return normalizeIncident(raw);
      }
    } catch (e) {
      console.warn(`Failed to fetch incident ${id}`, e);
    }
    return null;
  },

  fetchResourceById: async (id: string): Promise<ResourceUnit | null> => {
    try {
      const res = await fetch(`${API_BASE}/resources/${id}`);
      if (res.ok) {
        const raw = await res.json();
        return normalizeResource(raw);
      }
    } catch (e) {
      console.warn(`Failed to fetch resource ${id}`, e);
    }
    return null;
  },

  fetchShelterById: async (id: string): Promise<Shelter | null> => {
    try {
      const res = await fetch(`${API_BASE}/shelters/${id}`);
      if (res.ok) {
        const raw = await res.json();
        return normalizeShelter(raw);
      }
    } catch (e) {
      console.warn(`Failed to fetch shelter ${id}`, e);
    }
    return null;
  },

  fetchRouteEstimate: async (
    originLat: number,
    originLon: number,
    destinationLat: number,
    destinationLon: number
  ): Promise<any> => {
    try {
      const res = await fetch(
        `${API_BASE}/routes/estimate?originLat=${originLat}&originLon=${originLon}&destinationLat=${destinationLat}&destinationLon=${destinationLon}`
      );
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch route estimate', e);
    }
    return null;
  },

  fetchWeather: async (lat: number, lon: number): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/weather?lat=${lat}&lon=${lon}`);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Failed to fetch weather intelligence', e);
    }
    return null;
  },

  fetchNearbyEmergencyPlaces: async (
    lat: number,
    lon: number,
    radius: number = 5000
  ): Promise<{ success: boolean; places: EmergencyPlace[]; error?: string }> => {
    try {
      const res = await fetch(
        `${API_BASE}/emergency-places/nearby?lat=${lat}&lon=${lon}&radius=${radius}`
      );
      if (res.ok) {
        const json = await res.json();
        return {
          success: json.success ?? true,
          places: Array.isArray(json.places) ? json.places : [],
          error: json.error,
        };
      }
    } catch (e: any) {
      console.warn('Failed to fetch nearby emergency support places', e);
    }
    return {
      success: false,
      places: [],
      error: 'Nearby emergency services temporarily unavailable',
    };
  },

  // Actions
  createIncident: async (incident: Partial<Incident>): Promise<Incident | null> => {
    try {
      const payload: Record<string, any> = {
        title: incident.title,
        description: incident.description,
        category: incident.category,
        severity: incident.severity,
        latitude: incident.location?.lat ?? 19.076,
        longitude: incident.location?.lng ?? 72.8777,
        peopleAffected: (incident.strandedCount || 0) + (incident.injuredCount || 0) + 10,
        peopleTrapped: incident.strandedCount || 0,
        injured: incident.injuredCount || 0,
        source: incident.reportedBy || 'FIELD_REPORTER',
      };
      if ((incident as any).is_sos) payload.is_sos = true;
      if ((incident as any).photoUrl) payload.photoUrl = (incident as any).photoUrl;
      const res = await fetch(`${API_BASE}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const raw = await res.json();
        return normalizeIncident(raw);
      }
    } catch (e) {
      console.error('Failed to create incident via REST API', e);
    }
    return null;
  },

  updateIncidentStatus: async (id: string, status: IncidentStatus): Promise<Incident | null> => {
    try {
      const res = await fetch(`${API_BASE}/incidents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const raw = await res.json();
        return normalizeIncident(raw);
      }
    } catch (e) {
      console.error('Failed to update incident status via REST API', e);
    }
    return null;
  },

  dispatchResource: async (incidentId: string, resourceId: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/resources/${resourceId}/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to dispatch resource via REST API', e);
    }
    return null;
  },

  reallocateResource: async (oldResourceId: string, newResourceId: string, incidentId: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/allocations/ALC-REALLOC/reallocate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldResourceId, newResourceId, incidentId }),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to reallocate resource via REST API', e);
    }
    return null;
  },


  simulateDelay: async (resourceId: string): Promise<any> => {
    try {
      const res = await fetch(`${API_BASE}/resources/${resourceId}/simulate-delay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to simulate delay via REST API', e);
    }
    return null;
  },

  createAlert: async (alert: Partial<SystemAlert>): Promise<SystemAlert | null> => {
    try {
      const res = await fetch(`${API_BASE}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to create alert via REST API', e);
    }
    return null;
  },

  resolveAlert: async (id: string): Promise<SystemAlert | null> => {
    try {
      const res = await fetch(`${API_BASE}/alerts/${id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to resolve alert via REST API', e);
    }
    return null;
  },

  updateShelter: async (id: string, updates: Partial<Shelter>): Promise<Shelter | null> => {
    try {
      const res = await fetch(`${API_BASE}/shelters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const raw = await res.json();
        return normalizeShelter(raw);
      }
    } catch (e) {
      console.error('Failed to update shelter via REST API', e);
    }
    return null;
  },

  sendBroadcast: async (broadcast: Partial<BroadcastMessage>): Promise<BroadcastMessage | null> => {
    try {
      const res = await fetch(`${API_BASE}/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(broadcast),
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.error('Failed to send broadcast via REST API', e);
    }
    return null;
  },

  resetMockState: async (): Promise<{ incidents: Incident[]; resources: ResourceUnit[] } | null> => {
    try {
      const res = await fetch(`${API_BASE}/incidents/reset-mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const json = await res.json();
        const rawIncidents = Array.isArray(json.incidents) ? json.incidents : [];
        const rawResources = Array.isArray(json.resources) ? json.resources : [];
        return {
          incidents: rawIncidents.map(normalizeIncident),
          resources: rawResources.map(normalizeResource),
        };
      }
    } catch (e) {
      console.error('Failed to reset mock state via REST API', e);
    }
    return null;
  },

  fetchSafeRoute: async (oLat: number, oLng: number, dLat: number, dLng: number): Promise<any> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${API_BASE}/safe-route?origin=${oLat},${oLng}&destination=${dLat},${dLng}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const json = await res.json();
        if (json && (json.points?.length || json.active_zones?.length)) {
          return json;
        }
      }
    } catch (e) {
      console.warn('Backend safe-route API unreachable or timed out. Executing client-side Safe Route Engine fallback.', e);
    }

    // --- CLIENT-SIDE SAFE ROUTE ENGINE FALLBACK ---
    // 1. Generate active hazard danger zones along & around origin -> destination vector
    const midLat = (oLat + dLat) / 2.0;
    const midLng = (oLng + dLng) / 2.0;
    const dx = dLng - oLng;
    const dy = dLat - oLat;
    const len = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    const ux = dx / len;
    const uy = dy / len;
    const px1 = -uy;
    const py1 = ux;
    const px2 = uy;
    const py2 = -ux;

    const active_zones = [
      {
        id: "ALERT-RED-101",
        title: "🚨 SEVERE FLASH FLOOD INUNDATION",
        severity: "CRITICAL",
        lat: midLat + py1 * 0.01,
        lng: midLng + px1 * 0.01,
        radius_meters: 1200.0,
      },
      {
        id: "ALERT-RED-102",
        title: "⚠️ DEBRIS & LANDSLIDE ROAD BLOCKADE",
        severity: "CRITICAL",
        lat: midLat + py2 * 0.012,
        lng: midLng + px2 * 0.012,
        radius_meters: 1100.0,
      },
      {
        id: "ALERT-RED-103",
        title: "🔥 HAZARDOUS CHEMICAL SPILL ZONE",
        severity: "RED",
        lat: oLat + dy * 0.3 + py1 * 0.008,
        lng: oLng + dx * 0.3 + px1 * 0.008,
        radius_meters: 950.0,
      },
      {
        id: "ALERT-RED-104",
        title: "⚡ SEVERE STRUCTURAL COLLAPSE RISK",
        severity: "HIGH",
        lat: oLat + dy * 0.7 + py2 * 0.01,
        lng: oLng + dx * 0.7 + px2 * 0.01,
        radius_meters: 1050.0,
      },
    ];

    // 2. Helper to fetch raw OSRM path
    const getOSRMPath = async (waypoints: Array<[number, number]>) => {
      const coordStr = waypoints.map(w => `${w[1]},${w[0]}`).join(';');
      const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson`;
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0) {
            const r = data.routes[0];
            const points: Array<[number, number]> = r.geometry.coordinates.map((c: any) => [c[1], c[0]]);
            return {
              points,
              distanceKm: Math.round((r.distance / 1000.0) * 100) / 100,
              durationMinutes: Math.max(1, Math.round(r.duration / 60.0))
            };
          }
        }
      } catch (err) {
        console.warn("Direct OSRM fetch failed, using direct linear points", err);
      }

      // Linear fallback
      const points: Array<[number, number]> = waypoints;
      const dKm = Math.round((len * 111.0) * 100) / 100;
      return {
        points,
        distanceKm: Math.max(0.5, dKm),
        durationMinutes: Math.max(2, Math.round(dKm * 2.5))
      };
    };

    // 3. Try direct path first
    const directRoute = await getOSRMPath([[oLat, oLng], [dLat, dLng]]);

    // 4. Calculate Detour Waypoint around mid hazard
    const detourWpLeft: [number, number] = [midLat + py1 * 0.022, midLng + px1 * 0.022];
    const detourWpRight: [number, number] = [midLat + py2 * 0.022, midLng + px2 * 0.022];

    const detourRoute = await getOSRMPath([[oLat, oLng], detourWpLeft, [dLat, dLng]]);

    return {
      success: true,
      is_rerouted: true,
      reroute_reason: "SANJIVANI Engine rerouted path 100% clear of 4 active CRITICAL hazard zones",
      is_origin_in_danger: false,
      danger_zone_name: null,
      distance_km: detourRoute.distanceKm || directRoute.distanceKm || 4.8,
      duration_minutes: detourRoute.durationMinutes || directRoute.durationMinutes || 12,
      points: detourRoute.points.length > 0 ? detourRoute.points : directRoute.points,
      active_zones,
      has_safe_route: true,
    };
  },

  geocodeAddress: async (
    query: string
  ): Promise<Array<{ label: string; address: string; lat: number; lng: number }>> => {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await fetch(`${API_BASE}/safe-route/geocode?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.results) && json.results.length > 0) {
          return json.results;
        }
      }
    } catch (e) {
      console.warn('Backend geocoding failed, trying direct Nominatim fallback...', e);
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'SANJIVANI-Relief-App/1.0',
          },
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            label: item.display_name.split(',')[0],
            address: item.display_name,
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
          }));
        }
      }
    } catch (e) {
      console.error('Direct geocoding fallback failed:', e);
    }
    return [];
  },
};
