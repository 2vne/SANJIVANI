import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';

const MapController: React.FC<{ centerLat?: number; centerLng?: number }> = ({ centerLat, centerLng }) => {
  const map = useMap();
  useEffect(() => {
    if (centerLat && centerLng) {
      map.flyTo([centerLat, centerLng], 14, { duration: 0.8 });
    }
  }, [centerLat, centerLng, map]);
  return null;
};
import { Incident, Shelter, ResourceUnit, EmergencyPlace, EmergencyPlaceType } from '../../types';
import { MAP_DEFAULT_CENTER } from '../../utils/constants';
import { apiService } from '../../services/apiService';
import { SeverityBadge } from '../common/SeverityBadge';
import {
  AlertTriangle,
  Users,
  Home,
  Truck,
  Navigation,
  Phone,
  Activity,
  AlertCircle,
  Loader2,
  MapPin,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import {
  getRankedResourceRecommendations,
  getFacilityFallbackForIncident,
  calculateHaversineDistance,
} from '../../utils/aiRecommendationEngine';
import { useDisasterContext } from '../../context/DisasterContext';

interface SituationMapProps {
  incidents?: Incident[];
  shelters?: Shelter[];
  resources?: ResourceUnit[];
  selectedIncidentId?: string;
  targetResourceId?: string;
  targetPlace?: EmergencyPlace;
  radiusMeters?: number;
  onRadiusChange?: (radiusMeters: number) => void;
  onSelectIncident?: (id: string) => void;
  onUpdateIncidentStatus?: (id: string, status: any) => void;
  height?: string;
}

// Custom Leaflet DivIcon Generators for Dynamic Colored Markers
const createIncidentIcon = (severity: string, strandedCount: number, isSelected: boolean) => {
  const colorBg =
    severity === 'CRITICAL'
      ? 'bg-red-600 border-red-400 ring-red-500/50'
      : severity === 'HIGH'
        ? 'bg-orange-600 border-orange-400 ring-orange-500/50'
        : severity === 'MEDIUM'
          ? 'bg-amber-500 border-amber-300 ring-amber-500/50 text-slate-950'
          : 'bg-blue-600 border-blue-400 ring-blue-500/50';

  const pulseAnimation = severity === 'CRITICAL' ? '<span class="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping"></span>' : '';
  const selectedBorder = isSelected ? 'ring-4 ring-cyan-400 scale-110 shadow-lg shadow-cyan-500/60 z-50' : '';

  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="relative flex items-center justify-center p-2 rounded-full border-2 shadow-xl transition-all ${colorBg} ${selectedBorder}">
        ${pulseAnimation}
        <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
        </svg>
        ${strandedCount > 0
        ? `<span class="absolute -bottom-2 bg-slate-950 text-amber-400 font-mono text-[9px] font-extrabold px-1.5 py-0.5 rounded-full border border-amber-500/80 shadow-md whitespace-nowrap">👥 ${strandedCount}</span>`
        : ''
      }
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
};

const createShelterIcon = (occupied: number, capacity: number) => {
  const cap = capacity || 100;
  const pct = Math.min(100, Math.round((occupied / cap) * 100));
  const isFull = pct >= 95;

  const badgeColor = isFull
    ? 'bg-red-600 border-red-400 text-white'
    : pct > 75
      ? 'bg-amber-500 border-amber-300 text-slate-950'
      : 'bg-emerald-600 border-emerald-400 text-white';

  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="relative flex items-center gap-1.5 px-2 py-1 rounded-lg border-2 shadow-lg font-mono text-[10px] font-bold ${badgeColor}">
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
        <span>${pct}% FULL</span>
      </div>
    `,
    iconSize: [70, 26],
    iconAnchor: [35, 13],
  });
};

const createResourceIcon = (status: string, callsign: string) => {
  const statusColor =
    status === 'EN_ROUTE'
      ? 'bg-cyan-600 border-cyan-300 text-white ring-2 ring-cyan-500/50 animate-pulse'
      : status === 'ON_SITE'
        ? 'bg-emerald-600 border-emerald-300 text-white'
        : 'bg-blue-600 border-blue-300 text-white';

  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="relative flex items-center gap-1.5 px-2 py-1 rounded-md border-2 shadow-lg font-mono text-[10px] font-bold ${statusColor}">
        <svg class="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
        </svg>
        <span class="truncate max-w-[70px]">${callsign}</span>
      </div>
    `,
    iconSize: [85, 26],
    iconAnchor: [42, 13],
  });
};

const createEmergencyPlaceIcon = (type: EmergencyPlaceType) => {
  let badgeColor = '';
  let emoji = '';

  switch (type) {
    case 'hospital':
      badgeColor = 'bg-rose-950 border-rose-500 text-rose-300 shadow-rose-900/50';
      emoji = '🏥';
      break;
    case 'fire_station':
      badgeColor = 'bg-orange-950 border-orange-500 text-orange-300 shadow-orange-900/50';
      emoji = '🚒';
      break;
    case 'police_station':
      badgeColor = 'bg-blue-950 border-blue-500 text-blue-300 shadow-blue-900/50';
      emoji = '👮';
      break;
    case 'ngo':
      badgeColor = 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-emerald-900/50';
      emoji = '🟢';
      break;
    case 'rescue':
      badgeColor = 'bg-amber-950 border-amber-500 text-amber-300 shadow-amber-900/50';
      emoji = '🛟';
      break;
  }

  return L.divIcon({
    className: 'custom-map-icon',
    html: `
      <div class="relative flex items-center justify-center p-1.5 rounded-full border-2 shadow-lg font-sans text-xs ${badgeColor}">
        <span>${emoji}</span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

export const SituationMap: React.FC<SituationMapProps> = ({
  incidents = [],
  shelters = [],
  resources = [],
  selectedIncidentId,
  targetResourceId,
  targetPlace,
  radiusMeters: radiusMetersProp,
  onRadiusChange,
  onSelectIncident,
  onUpdateIncidentStatus,
  height = '100%',
}) => {
  const [activeRoutePositions, setActiveRoutePositions] = useState<[number, number][]>([]);
  const [activeRouteDetails, setActiveRouteDetails] = useState<{
    resource: ResourceUnit;
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);
  const [activeFacilityDetails, setActiveFacilityDetails] = useState<{
    place: EmergencyPlace;
    distanceKm: number;
    durationMinutes: number;
  } | null>(null);

  const [showIncidents, setShowIncidents] = useState(true);
  const [showShelters, setShowShelters] = useState(true);
  const [showResources, setShowResources] = useState(true);
  const [isHudMinimized, setIsHudMinimized] = useState(false);

  // Real-world Emergency Places (OSM Overpass) State
  const [nearbyPlaces, setNearbyPlaces] = useState<EmergencyPlace[]>([]);
  const [isFetchingNearby, setIsFetchingNearby] = useState(false);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [localRadiusMeters, setLocalRadiusMeters] = useState<number>(5000);

  // Selected incident object
  const selectedIncident = incidents.find((i) => i.id === selectedIncidentId) || incidents[0];

  const radiusMeters = radiusMetersProp ?? localRadiusMeters;
  const { setCommandCenterLocation, setCommandCenterRadiusKm } = useDisasterContext();

  // Sync search radius to global DisasterContext
  useEffect(() => {
    setCommandCenterRadiusKm(radiusMeters / 1000);
  }, [radiusMeters, setCommandCenterRadiusKm]);

  // Sync center location to global DisasterContext
  useEffect(() => {
    if (selectedIncident?.location?.lat && selectedIncident?.location?.lng) {
      setCommandCenterLocation({
        lat: selectedIncident.location.lat,
        lng: selectedIncident.location.lng,
        label: selectedIncident.title || 'Selected Command Centre Incident',
      });
    } else {
      setCommandCenterLocation({
        lat: MAP_DEFAULT_CENTER.lat,
        lng: MAP_DEFAULT_CENTER.lng,
        label: 'Command Centre HQ (Mumbai / Pune Sector)',
      });
    }
  }, [selectedIncident, setCommandCenterLocation]);

  const handleRadiusChange = (newVal: number) => {
    setLocalRadiusMeters(newVal);
    onRadiusChange?.(newVal);
  };

  // Emergency Place Category Toggles
  const [showHospitals, setShowHospitals] = useState(true);
  const [showFireStations, setShowFireStations] = useState(true);
  const [showPolice, setShowPolice] = useState(true);
  const [showNgos, setShowNgos] = useState(true);
  const [showRescue, setShowRescue] = useState(true);

  // ETA Estimates cache map: { [poiId]: { distanceKm, durationMinutes, trafficDelayMinutes, source, loading } }
  const [etaEstimates, setEtaEstimates] = useState<
    Record<
      string,
      { distanceKm: number; durationMinutes: number; trafficDelayMinutes?: number; source?: string; loading?: boolean }
    >
  >({});


  // Filter mobile unit markers strictly inside the selected incident's radius
  const filteredResourcesInRadius = useMemo(() => {
    if (!selectedIncident?.location?.lat || !selectedIncident?.location?.lng) return resources;
    const incLat = selectedIncident.location.lat;
    const incLng = selectedIncident.location.lng;
    const radiusKm = radiusMeters / 1000;

    return resources.filter((res) => {
      if (!res?.currentLocation?.lat || !res?.currentLocation?.lng) return false;
      const dist = calculateHaversineDistance(
        res.currentLocation.lat,
        res.currentLocation.lng,
        incLat,
        incLng
      );
      return dist <= radiusKm;
    });
  }, [resources, selectedIncident, radiusMeters]);

  // Filter shelters strictly inside the selected incident's radius
  const filteredSheltersInRadius = useMemo(() => {
    if (!selectedIncident?.location?.lat || !selectedIncident?.location?.lng) return shelters;
    const incLat = selectedIncident.location.lat;
    const incLng = selectedIncident.location.lng;
    const radiusKm = radiusMeters / 1000;

    return shelters.filter((s) => {
      if (!s?.location?.lat || !s?.location?.lng) return false;
      const dist = calculateHaversineDistance(s.location.lat, s.location.lng, incLat, incLng);
      return dist <= radiusKm;
    });
  }, [shelters, selectedIncident, radiusMeters]);

  // Dynamic telemetry aggregates inside radius
  const totalStranded = useMemo(
    () => incidents.reduce((sum, inc) => sum + (inc.strandedCount || 0), 0),
    [incidents]
  );

  const totalCriticalIncidents = useMemo(
    () => incidents.filter((i) => i.severity === 'CRITICAL').length,
    [incidents]
  );

  const activeInRadiusResourcesCount = useMemo(
    () => filteredResourcesInRadius.filter((r) => r.status === 'EN_ROUTE' || r.status === 'ON_SITE').length,
    [filteredResourcesInRadius]
  );

  // Fetch real-time road route for selected incident (strict radius scan & facility fallback)
  useEffect(() => {
    let isMounted = true;
    const fetchRouteForActiveIncident = async () => {
      if (!selectedIncident || !selectedIncident.location?.lat) {
        if (isMounted) {
          setActiveRoutePositions([]);
          setActiveRouteDetails(null);
          setActiveFacilityDetails(null);
        }
        return;
      }

      const incLat = selectedIncident.location.lat;
      const incLng = selectedIncident.location.lng;

      // Check if target is explicitly an emergency place POI or FACILITY selection
      let selectedFacility: EmergencyPlace | undefined = targetPlace;

      if (!selectedFacility && targetResourceId && targetResourceId.startsWith('FACILITY:')) {
        const facId = targetResourceId.replace('FACILITY:', '');
        selectedFacility = nearbyPlaces.find((p) => p.id === facId);
      }

      // Check mobile resources strictly within radius
      const { inRadiusRecommendations, allRecommendations, hasUnitsInRadius } =
        getRankedResourceRecommendations(selectedIncident, resources, radiusMeters);

      // If no units in radius and no facility explicitly passed, calculate facility fallback
      if (!selectedFacility && !hasUnitsInRadius && !targetResourceId) {
        const fallback = getFacilityFallbackForIncident(selectedIncident, nearbyPlaces, radiusMeters);
        if (fallback) {
          selectedFacility = fallback.place;
        }
      }

      // ── ROUTING PATH 1: Emergency Facility Support POI Fallback ──
      if (selectedFacility) {
        const facLat = selectedFacility.latitude;
        const facLng = selectedFacility.longitude;

        const estimate = await apiService.fetchRouteEstimate(facLat, facLng, incLat, incLng);
        if (!isMounted) return;

        if (estimate && estimate.geometry && estimate.geometry.coordinates) {
          const latLngs: [number, number][] = estimate.geometry.coordinates.map(
            ([lon, lat]: [number, number]) => [lat, lon]
          );
          setActiveRoutePositions(latLngs);
          setActiveFacilityDetails({
            place: selectedFacility,
            distanceKm: estimate.distanceKm,
            durationMinutes: estimate.durationMinutes,
          });
          setActiveRouteDetails(null);
        } else {
          setActiveRoutePositions([
            [facLat, facLng],
            [incLat, incLng],
          ]);
          setActiveFacilityDetails({
            place: selectedFacility,
            distanceKm: selectedFacility.distanceKm || 2.0,
            durationMinutes: Math.round((selectedFacility.distanceKm || 2.0) * 1.8 + 2),
          });
          setActiveRouteDetails(null);
        }
        return;
      }

      // ── ROUTING PATH 2: Mobile Resource Unit (Strictly In-Radius Only) ──
      const targetId =
        targetResourceId ||
        selectedIncident.dispatchedUnitIds?.[0] ||
        (hasUnitsInRadius ? inRadiusRecommendations[0]?.resource.id : undefined);

      const targetResource = targetId
        ? resources.find((r) => r.id === targetId || r.callsign === targetId) || inRadiusRecommendations[0]?.resource
        : undefined;

      if (!targetResource || !targetResource.currentLocation?.lat) {
        if (isMounted) {
          setActiveRoutePositions([]);
          setActiveRouteDetails(null);
          setActiveFacilityDetails(null);
        }
        return;
      }

      const resLat = targetResource.currentLocation.lat;
      const resLng = targetResource.currentLocation.lng;

      const estimate = await apiService.fetchRouteEstimate(resLat, resLng, incLat, incLng);
      if (!isMounted) return;

      if (estimate && estimate.geometry && estimate.geometry.coordinates) {
        const latLngs: [number, number][] = estimate.geometry.coordinates.map(
          ([lon, lat]: [number, number]) => [lat, lon]
        );
        setActiveRoutePositions(latLngs);
        setActiveRouteDetails({
          resource: targetResource,
          distanceKm: estimate.distanceKm,
          durationMinutes: estimate.durationMinutes,
        });
        setActiveFacilityDetails(null);
      } else {
        const recMatch = inRadiusRecommendations.find((r) => r.resource.id === targetResource.id);
        const distKm = recMatch?.distanceKm || 2.5;
        const eta = recMatch?.etaMinutes || 8;
        setActiveRoutePositions([
          [resLat, resLng],
          [incLat, incLng],
        ]);
        setActiveRouteDetails({
          resource: targetResource,
          distanceKm: distKm,
          durationMinutes: eta,
        });
        setActiveFacilityDetails(null);
      }
    };

    fetchRouteForActiveIncident();
    return () => {
      isMounted = false;
    };
  }, [selectedIncidentId, selectedIncident, targetResourceId, targetPlace, resources, nearbyPlaces, radiusMeters]);

  // Reset nearby places cache when selected incident changes
  useEffect(() => {
    setNearbyPlaces([]);
  }, [selectedIncidentId]);

  // Fetch real-world nearby POIs from Overpass backend service when selected incident or search radius changes
  useEffect(() => {
    let isMounted = true;
    const fetchNearbyPOI = async () => {
      if (!selectedIncident || !selectedIncident.location?.lat || !selectedIncident.location?.lng) {
        if (isMounted) setNearbyPlaces([]);
        return;
      }

      setIsFetchingNearby(true);
      setNearbyError(null);

      const lat = selectedIncident.location.lat;
      const lng = selectedIncident.location.lng;

      const res = await apiService.fetchNearbyEmergencyPlaces(lat, lng, radiusMeters);

      if (isMounted) {
        setIsFetchingNearby(false);
        if (res.success && Array.isArray(res.places)) {
          setNearbyPlaces((prev) => {
            const nextMap: Record<string, EmergencyPlace> = {};
            // Accumulate and preserve existing places from smaller radiuses
            prev.forEach((p) => {
              if (p?.id) nextMap[p.id] = p;
            });
            res.places.forEach((p) => {
              if (p?.id) nextMap[p.id] = p;
            });
            return Object.values(nextMap);
          });
        } else if (res.error) {
          setNearbyError(res.error);
        }
      }
    };

    fetchNearbyPOI();

    return () => {
      isMounted = false;
    };
  }, [selectedIncidentId, selectedIncident, radiusMeters]);

  // Filter POIs strictly by selected radius limit from selected incident, category toggles,
  // and deduplicate against deployed units (if an emergency facility overlaps with a DEPLOYED unit, show ONLY the unit marker)
  const filteredNearbyPlaces = useMemo(() => {
    if (!selectedIncident?.location?.lat || !selectedIncident?.location?.lng) return [];
    const incLat = selectedIncident.location.lat;
    const incLng = selectedIncident.location.lng;
    const radiusKm = radiusMeters / 1000;

    return nearbyPlaces.filter((p) => {
      const dist = calculateHaversineDistance(p.latitude, p.longitude, incLat, incLng);
      // Hide facilities outside the selected search radius relative to the selected incident
      if (dist > radiusKm) return false;

      // Hide facilities by category toggle
      if (p.type === 'hospital' && !showHospitals) return false;
      if (p.type === 'fire_station' && !showFireStations) return false;
      if (p.type === 'police_station' && !showPolice) return false;
      if (p.type === 'ngo' && !showNgos) return false;
      if (p.type === 'rescue' && !showRescue) return false;

      // Deduplication Rule: Only hide the facility marker if a unit has been actively DEPLOYED (EN_ROUTE / ON_SITE) at this location.
      // Otherwise, show all nearby real-world emergency support places!
      const isOverlappingWithDeployedUnit = filteredResourcesInRadius.some((res) => {
        const isDeployed = res.status === 'EN_ROUTE' || res.status === 'ON_SITE' || !!res.assignedIncidentId;
        if (!isDeployed) return false;
        if (!res?.currentLocation?.lat || !res?.currentLocation?.lng) return false;
        const distToRes = calculateHaversineDistance(
          p.latitude,
          p.longitude,
          res.currentLocation.lat,
          res.currentLocation.lng
        );
        return distToRes < 0.08;
      });

      if (isOverlappingWithDeployedUnit) return false;

      return true;
    });
  }, [
    nearbyPlaces,
    radiusMeters,
    selectedIncident,
    showHospitals,
    showFireStations,
    showPolice,
    showNgos,
    showRescue,
    filteredResourcesInRadius,
  ]);

  // Calculate Road ETA to external POI
  const handleCalculateETA = async (place: EmergencyPlace) => {
    if (!selectedIncident?.location?.lat || !selectedIncident?.location?.lng) return;

    setEtaEstimates((prev) => ({
      ...prev,
      [place.id]: { distanceKm: place.distanceKm, durationMinutes: 0, loading: true },
    }));

    const originLat = selectedIncident.location.lat;
    const originLon = selectedIncident.location.lng;
    const destLat = place.latitude;
    const destLon = place.longitude;

    const estimate = await apiService.fetchRouteEstimate(originLat, originLon, destLat, destLon);

    if (estimate) {
      setEtaEstimates((prev) => ({
        ...prev,
        [place.id]: {
          distanceKm: estimate.distanceKm,
          durationMinutes: estimate.durationMinutes,
          trafficDelayMinutes: estimate.trafficDelayMinutes,
          source: estimate.source,
          loading: false,
        },
      }));
    } else {
      setEtaEstimates((prev) => ({
        ...prev,
        [place.id]: {
          distanceKm: place.distanceKm,
          durationMinutes: Math.round(place.distanceKm * 2 + 3),
          source: 'FALLBACK',
          loading: false,
        },
      }));
    }
  };

  return (
    <div className="w-full relative border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm" style={{ height }}>

      {/* Dynamic Pokémon Map HUD Overlay */}
      {isHudMinimized ? (
        <button
          onClick={() => setIsHudMinimized(false)}
          className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-md border-2 border-slate-200 rounded-full px-3.5 py-2 shadow-xl font-display font-extrabold text-xs text-slate-900 flex items-center gap-2 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 cursor-pointer"
          title="Expand Telemetry Radar HUD"
        >
          <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>TELEMETRY RADAR</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <Maximize2 className="w-3.5 h-3.5 text-slate-500 ml-1" />
        </button>
      ) : (
        <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-md border-2 border-slate-200 rounded-2xl p-3 shadow-xl font-sans text-xs text-slate-800 space-y-2.5 max-w-[290px]">
          <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2">
            <span className="font-display font-extrabold text-slate-900 flex items-center gap-1.5 text-xs">
              <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
              TELEMETRY RADAR
            </span>
            <button
              onClick={() => setIsHudMinimized(true)}
              className="p-1 px-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all flex items-center gap-1 text-[10px] font-display font-bold cursor-pointer border border-slate-200 shadow-xs"
              title="Minimize Telemetry Radar HUD"
            >
              <Minimize2 className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-[10px]">Minimize</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 bg-red-50 border-2 border-red-200 rounded-xl">
              <div className="text-red-700 font-display font-extrabold">CRITICAL</div>
              <div className="text-base font-display font-black text-red-600">{totalCriticalIncidents}</div>
            </div>
            <div className="p-2 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <div className="text-amber-800 font-display font-extrabold">STRANDED</div>
              <div className="text-base font-display font-black text-amber-600">{totalStranded}</div>
            </div>
            <div className="p-2 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div className="text-blue-700 font-display font-extrabold">DEPLOYED ({radiusMeters / 1000}km)</div>
              <div className="text-base font-display font-black text-blue-600">
                {activeInRadiusResourcesCount}/{filteredResourcesInRadius.length}
              </div>
            </div>
            <div className="p-2 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
              <div className="text-emerald-700 font-display font-extrabold">SHELTERS ({radiusMeters / 1000}km)</div>
              <div className="text-base font-display font-black text-emerald-600">{filteredSheltersInRadius.length}</div>
            </div>
          </div>

          {/* Dynamic Layer Visibility Toggles */}
          <div className="pt-2 border-t-2 border-slate-100 flex items-center justify-between text-[10px] font-display font-bold">
            <button
              onClick={() => setShowIncidents(!showIncidents)}
              className={`px-2 py-1 rounded-full border-2 transition-all flex items-center gap-1 shadow-xs ${showIncidents
                ? 'bg-red-500 text-white border-red-600 shadow-sm'
                : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Incidents
            </button>
            <button
              onClick={() => setShowShelters(!showShelters)}
              className={`px-2 py-1 rounded-full border-2 transition-all flex items-center gap-1 shadow-xs ${showShelters
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
            >
              <Home className="w-3 h-3" />
              Shelters
            </button>
            <button
              onClick={() => setShowResources(!showResources)}
              className={`px-2 py-1 rounded-full border-2 transition-all flex items-center gap-1 shadow-xs ${showResources
                ? 'bg-blue-500 text-white border-blue-600 shadow-sm'
                : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
            >
              <Truck className="w-3 h-3" />
              Units
            </button>
          </div>

          {/* Real-World Emergency Support POIs Header & Radius Controls */}
          <div className="pt-2 border-t-2 border-slate-100 space-y-2">
            <div className="flex items-center justify-between font-display">
              <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                <span>SUPPORT HUBS (OSM)</span>
                {isFetchingNearby && <Loader2 className="w-3 h-3 animate-spin text-blue-600" />}
              </span>
              <select
                value={radiusMeters}
                onChange={(e) => handleRadiusChange(parseInt(e.target.value))}
                className="bg-white text-blue-700 border-2 border-blue-200 text-xs font-display font-bold rounded-lg px-2 py-0.5 outline-none cursor-pointer shadow-xs"
              >
                <option value={1000}>1 km</option>
                <option value={2000}>2 km</option>
                <option value={3000}>3 km</option>
                <option value={5000}>5 km (Default)</option>
                <option value={10000}>10 km</option>
                <option value={15000}>15 km</option>
              </select>
            </div>

            {nearbyError && (
              <div className="text-[10px] text-amber-800 bg-amber-50 border-2 border-amber-200 p-1.5 rounded-xl flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                <span>{nearbyError}</span>
              </div>
            )}

            {/* Category Filter Checkboxes */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-display font-bold">
              <button
                onClick={() => setShowHospitals(!showHospitals)}
                className={`p-1.5 rounded-xl border-2 text-left flex items-center gap-1.5 transition-all shadow-xs ${showHospitals ? 'bg-rose-50 text-rose-800 border-rose-300' : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
              >
                <span>🏥</span>
                <span>Hospitals</span>
              </button>

              <button
                onClick={() => setShowFireStations(!showFireStations)}
                className={`p-1.5 rounded-xl border-2 text-left flex items-center gap-1.5 transition-all shadow-xs ${showFireStations ? 'bg-orange-50 text-orange-800 border-orange-300' : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
              >
                <span>🚒</span>
                <span>Fire</span>
              </button>

              <button
                onClick={() => setShowPolice(!showPolice)}
                className={`p-1.5 rounded-xl border-2 text-left flex items-center gap-1.5 transition-all shadow-xs ${showPolice ? 'bg-blue-50 text-blue-800 border-blue-300' : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
              >
                <span>👮</span>
                <span>Police</span>
              </button>

              <button
                onClick={() => setShowNgos(!showNgos)}
                className={`p-1.5 rounded-xl border-2 text-left flex items-center gap-1.5 transition-all shadow-xs ${showNgos ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
              >
                <span>🟢</span>
                <span>NGOs</span>
              </button>

              <button
                onClick={() => setShowRescue(!showRescue)}
                className={`col-span-2 p-1.5 rounded-xl border-2 text-left flex items-center gap-1.5 transition-all shadow-xs ${showRescue ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
              >
                <span>🛟</span>
                <span>Rescue Squads</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Route Trajectory HUD Banner */}
      {activeFacilityDetails && selectedIncident ? (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border-2 border-amber-400 rounded-2xl p-3 shadow-xl font-sans text-xs text-slate-800 max-w-[460px] transition-all">
          <div className="flex items-center justify-between text-xs font-display font-extrabold text-amber-800 border-b-2 border-amber-100 pb-1.5 mb-2">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-amber-600 animate-pulse" />
              FACILITY ROUTE (RADIUS FALLBACK)
            </span>
            <span className="text-[10px] text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-display">
              STRICT SCAN
            </span>
          </div>
          <div className="text-xs font-sans font-semibold text-slate-800 truncate">
            Facility: <span className="text-amber-800 font-extrabold">{activeFacilityDetails.place.name}</span> ({activeFacilityDetails.place.type})
            <span className="text-slate-400"> ➔ Target: </span>
            <span className="text-blue-700 font-extrabold">{selectedIncident.title}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] font-display font-bold text-slate-600">
            <span>Distance: <strong className="text-slate-900">{activeFacilityDetails.distanceKm} km</strong></span>
            <span>Est. Response Time: <strong className="text-amber-700 font-black">{activeFacilityDetails.durationMinutes} mins</strong></span>
          </div>
        </div>
      ) : activeRouteDetails && selectedIncident ? (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md border-2 border-blue-400 rounded-2xl p-3 shadow-xl font-sans text-xs text-slate-800 max-w-[440px] transition-all">
          <div className="flex items-center justify-between text-xs font-display font-extrabold text-blue-700 border-b-2 border-blue-100 pb-1.5 mb-2">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-blue-600 animate-pulse" />
              SHORTEST DISPATCH ROUTE TRAJECTORY
            </span>
            <span className="text-[10px] text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-display font-bold">
              TRAFFIC ROUTE
            </span>
          </div>
          <div className="text-xs font-sans font-semibold text-slate-800 truncate">
            Unit: <span className="text-blue-700 font-extrabold">{activeRouteDetails.resource.callsign}</span> ({activeRouteDetails.resource.category})
            <span className="text-slate-400"> ➔ Target: </span>
            <span className="text-amber-800 font-extrabold">{selectedIncident.title}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] font-display font-bold text-slate-600">
            <span>Road Distance: <strong className="text-slate-900">{activeRouteDetails.distanceKm} km</strong></span>
            <span>Travel ETA: <strong className="text-blue-700 font-black">{activeRouteDetails.durationMinutes} mins</strong></span>
          </div>
        </div>
      ) : null}

      <MapContainer
        center={[MAP_DEFAULT_CENTER.lat, MAP_DEFAULT_CENTER.lng]}
        zoom={MAP_DEFAULT_CENTER.zoom}
        className="w-full h-full tactical-dark-tiles"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={import.meta.env.VITE_MAP_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png"}
        />

        {/* Re-center Map and render visual radius circle around selected incident */}
        {selectedIncident?.location?.lat && selectedIncident?.location?.lng && (
          <>
            <MapController
              centerLat={selectedIncident.location.lat}
              centerLng={selectedIncident.location.lng}
            />
            <Circle
              center={[selectedIncident.location.lat, selectedIncident.location.lng]}
              radius={radiusMeters}
              pathOptions={{
                color: '#EF4444',
                fillColor: '#F87171',
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '6, 6',
              }}
            />
          </>
        )}

        {/* Active Dispatch Route Polyline */}
        {activeRoutePositions.length > 1 && (
          <Polyline
            positions={activeRoutePositions}
            pathOptions={{
              color: '#2563EB',
              weight: 5,
              dashArray: '8, 8',
              opacity: 0.9,
            }}
          />
        )}

        {/* Dynamic Incident Markers */}
        {showIncidents &&
          incidents
            .filter((inc) => inc?.location?.lat && inc?.location?.lng && inc.status !== 'RESOLVED' && inc.status !== 'CANCELLED')
            .map((inc) => {
              const isSelected = inc.id === selectedIncidentId;
              const stranded = inc.strandedCount ?? 0;
              const injured = inc.injuredCount ?? 0;

              const affectedCount = Math.max(1, stranded + injured);
              const logComponent = inc.peopleAffectedScore ?? (Math.round(Math.log10(affectedCount) * 20 * 10) / 10);
              const calculatedZoneScore = inc.zoneScore ?? inc.aiPriorityScore ?? 50;

              return (
                <Marker
                  key={inc.id}
                  position={[inc.location.lat, inc.location.lng]}
                  icon={createIncidentIcon(inc.severity, stranded, isSelected)}
                  eventHandlers={{
                    click: () => onSelectIncident?.(inc.id),
                  }}
                >
                  <Popup>
                    <div className="p-3.5 font-sans text-xs bg-white text-slate-900 rounded-xl space-y-2.5 min-w-[260px]">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <SeverityBadge severity={inc.severity} size="sm" />
                        <span className="font-mono text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">{inc.id}</span>
                      </div>

                      <h4 className="font-display font-extrabold text-sm text-slate-900 leading-tight">{inc.title}</h4>
                      <p className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span>{inc.location.address}</span>
                      </p>

                      <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[10px]">
                        <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60">
                          <Users className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Stranded: <strong className="text-slate-900">{stranded}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-red-700 bg-red-50/80 p-1.5 rounded-lg border border-red-200/60">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                          <span>Injured: <strong className="text-slate-900">{injured}</strong></span>
                        </div>
                      </div>

                      {/* Mathematical Priority & Severity Zone Score breakdown */}
                      <div className="p-2.5 bg-gradient-to-br from-slate-50 to-blue-50/50 rounded-xl border border-blue-200/80 font-mono text-[10px] space-y-1.5">
                        <div className="text-blue-900 font-display font-extrabold flex items-center justify-between border-b border-blue-100 pb-1">
                          <span className="text-[10px] tracking-wider uppercase">ZONE SCORE FORMULA</span>
                          <span className="text-xs font-black text-blue-700 px-2 py-0.5 rounded-md bg-blue-100 border border-blue-300">{calculatedZoneScore}</span>
                        </div>
                        <div className="text-[10px] text-slate-600 space-y-1 pt-0.5">
                          <div className="flex justify-between">
                            <span className="text-slate-500">log10({affectedCount}) × w_A(20):</span>
                            <span className="text-blue-700 font-extrabold">+{logComponent}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Disaster Type ({inc.category}):</span>
                            <span className="text-amber-700 font-extrabold">+{inc.disasterTypeScore ?? 25}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Urgency Keyword Score:</span>
                            <span className="text-red-700 font-extrabold">+{inc.urgencyKeywordScore ?? 0}</span>
                          </div>
                        </div>
                        {inc.urgencyReasoning && (
                          <p className="text-[9.5px] text-slate-500 italic pt-1 border-t border-blue-100 leading-tight">
                            {inc.urgencyReasoning}
                          </p>
                        )}
                      </div>

                      {inc.urgentNeeds?.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {inc.urgentNeeds.map((need) => (
                            <span
                              key={need}
                              className="px-2 py-0.5 rounded-md text-[9.5px] font-mono bg-red-50 text-red-700 border border-red-200 font-bold uppercase"
                            >
                              {need.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500 font-bold">
                          Status: <strong className="text-slate-800">{inc.status}</strong>
                        </span>
                        {inc.status !== 'RESOLVED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateIncidentStatus?.(
                                inc.id,
                                inc.status === 'REPORTED'
                                  ? 'DISPATCHED'
                                  : inc.status === 'DISPATCHED'
                                    ? 'ON_SITE'
                                    : 'RESOLVED'
                              );
                            }}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-display font-extrabold bg-blue-600 text-white border border-blue-700 hover:bg-blue-700 shadow-xs transition-all active:scale-95"
                          >
                            {inc.status === 'REPORTED'
                              ? 'DISPATCH'
                              : inc.status === 'DISPATCHED'
                                ? 'MARK ON-SITE'
                                : 'RESOLVE'}
                          </button>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

        {/* Dynamic Safe Shelter Markers (5km Radius Spots around Selected Incident) */}
        {(showShelters || !!selectedIncidentId) &&
          filteredSheltersInRadius.map((s) => {
            const occ = s.occupied ?? s.currentOccupancy ?? 0;
            const cap = s.capacity || 100;
            const pct = Math.min(100, Math.round((occ / cap) * 100));
            const distFromIncident = selectedIncident?.location?.lat
              ? calculateHaversineDistance(s.location.lat, s.location.lng, selectedIncident.location.lat, selectedIncident.location.lng)
              : null;

            return (
              <Marker
                key={s.id}
                position={[s.location.lat, s.location.lng]}
                icon={createShelterIcon(occ, cap)}
              >
                <Popup>
                  <div className="p-3.5 font-sans text-xs bg-white text-slate-900 rounded-xl space-y-2.5 min-w-[240px]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-display font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 uppercase flex items-center gap-1">
                        <Home className="w-3 h-3 text-emerald-600" />
                        5km Safe Haven Spot
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{s.id}</span>
                    </div>

                    <h4 className="font-display font-extrabold text-sm text-slate-900 mt-1">{s.name}</h4>
                    <p className="text-slate-500 text-[11px] font-medium">{s.location.address}</p>

                    {distFromIncident !== null && (
                      <div className="text-[11px] font-display font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg flex items-center justify-between">
                        <span>Distance to Incident:</span>
                        <span className="font-extrabold text-blue-800">{distFromIncident.toFixed(2)} km</span>
                      </div>
                    )}

                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-500 font-medium">Occupancy</span>
                        <span className="text-slate-900 font-bold">{occ} / {cap} ({pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 75 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 text-[10px] font-mono text-slate-600">
                      <div>Water: <strong className="text-slate-900">{s.supplies?.waterDays ?? (s as any).waterSupplyDays ?? 3}d</strong></div>
                      <div>Food: <strong className="text-slate-900">{s.supplies?.foodDays ?? (s as any).foodSupplyDays ?? 3}d</strong></div>
                      <div>Medics: <strong className="text-slate-900">{s.medicalStaffCount ?? 2} staff</strong></div>
                      <div>Status: <strong className="text-emerald-700 font-bold">{s.status || 'OPEN'}</strong></div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-end">
                      <a
                        href={`tel:${s.contactPhone || '108'}`}
                        className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-[10px] font-display font-bold transition-all"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>Contact Facility</span>
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Dynamic Resource Unit Markers (Strictly In-Radius Mobile & Deployed Units Only) */}
        {showResources &&
          filteredResourcesInRadius
            .filter((res) => !res.id.startsWith('RES-OSM-') || res.status !== 'AVAILABLE')
            .map((res) => (
              <Marker
                key={res.id}
                position={[res.currentLocation.lat, res.currentLocation.lng]}
                icon={createResourceIcon(res.status, res.callsign || res.id)}
              >
                <Popup>
                  <div className="p-3.5 font-sans text-xs bg-white text-slate-900 rounded-xl space-y-2.5 min-w-[220px]">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-display font-extrabold bg-blue-100 text-blue-800 border border-blue-300 uppercase">
                        {res.category?.replace('_', ' ') || 'RESOURCE UNIT'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-400 font-bold">{res.id}</span>
                    </div>

                    <h4 className="font-display font-extrabold text-sm text-slate-900">{res.callsign || res.id}</h4>
                    <p className="text-slate-500 text-[11px] font-medium">{res.currentLocation.address}</p>

                    <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-600">
                      <div>Status: <strong className="text-blue-700 font-bold">{res.status}</strong></div>
                      <div>Crew: <strong className="text-slate-900">{res.personnelCount ?? 5} staff</strong></div>
                      <div>Fuel: <strong className="text-emerald-700 font-bold">{res.fuelOrSupplyPct ?? 100}%</strong></div>
                      <div>Channel: <strong className="text-amber-700 font-bold">{res.contactChannel || 'CH-16'}</strong></div>
                    </div>

                    {res.assignedIncidentId && (
                      <div className="text-[10px] font-mono text-blue-800 bg-blue-50 border border-blue-200 p-1.5 rounded-lg">
                        Assigned to: <strong className="text-blue-900">{res.assignedIncidentId}</strong>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

        {/* Real-world Nearby Emergency Support Places (OpenStreetMap Overpass POIs) */}
        {filteredNearbyPlaces.map((place) => {
          const etaInfo = etaEstimates[place.id];

          return (
            <Marker
              key={place.id}
              position={[place.latitude, place.longitude]}
              icon={createEmergencyPlaceIcon(place.type)}
            >
              <Popup>
                <div className="p-3.5 font-sans text-xs bg-white text-slate-900 rounded-xl space-y-2.5 min-w-[250px]">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-display font-extrabold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                      {place.type.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-[9.5px] text-blue-600 font-extrabold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">SUPPORT HUB</span>
                  </div>

                  <h4 className="font-display font-extrabold text-sm text-slate-900">{place.name}</h4>

                  {place.address && <p className="text-slate-500 text-[11px] font-medium">{place.address}</p>}

                  <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 font-mono text-[10px] text-slate-600">
                    <div>Distance: <strong className="text-blue-700 font-bold">{place.distanceKm} km</strong></div>
                    <div>Source: <strong className="text-slate-800">OpenStreetMap</strong></div>
                    {place.phone && <div className="col-span-2 truncate">Phone: <strong className="text-slate-900">{place.phone}</strong></div>}
                    {place.website && (
                      <div className="col-span-2 truncate">
                        Web: <a href={place.website} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">{place.website}</a>
                      </div>
                    )}
                  </div>

                  {/* ETA Routing Output */}
                  {etaInfo && !etaInfo.loading && (
                    <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl font-mono text-[10px] space-y-0.5">
                      <div className="text-blue-900 font-display font-extrabold flex items-center justify-between">
                        <span>ROAD ROUTE ESTIMATE</span>
                        <span className="text-[9px] text-blue-600">[{etaInfo.source}]</span>
                      </div>
                      <div className="text-slate-700">Distance: <strong className="text-slate-900">{etaInfo.distanceKm} km</strong></div>
                      <div className="text-emerald-700 font-bold">ETA: <strong className="text-emerald-800">{etaInfo.durationMinutes} min</strong></div>
                      {etaInfo.trafficDelayMinutes !== undefined && etaInfo.trafficDelayMinutes > 0 && (
                        <div className="text-amber-700 font-bold">Traffic Delay: <strong>+{etaInfo.trafficDelayMinutes} min</strong></div>
                      )}
                    </div>
                  )}

                  {/* Calculate ETA Button */}
                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleCalculateETA(place)}
                      disabled={etaInfo?.loading}
                      className="w-full py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 border border-blue-700 text-white text-[10px] font-display font-black rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 shadow-xs"
                    >
                      <Navigation className={`w-3.5 h-3.5 ${etaInfo?.loading ? 'animate-spin' : ''}`} />
                      <span>{etaInfo?.loading ? 'CALCULATING ETA...' : 'CALCULATE ROAD ETA'}</span>
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
