import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useDisasterContext } from '../context/DisasterContext';
import { EmergencyPlace } from '../types';
import { StatCard } from '../components/common/StatCard';
import { SituationMap } from '../components/map/SituationMap';
import { IncidentFeed } from '../components/dashboard/IncidentFeed';
import { ResourceSummary } from '../components/dashboard/ResourceSummary';
import { ShelterOverview } from '../components/dashboard/ShelterOverview';
import { PipelineBar, PIPELINE_STEPS } from '../components/dashboard/PipelineBar';
import { calculateHaversineDistance } from '../utils/aiRecommendationEngine';

import {
  AlertTriangle,
  Users,
  Truck,
  Home,
  RefreshCcw,
  Loader2,
  Sparkles,
} from 'lucide-react';

/** Hook that flashes a boolean for 600ms whenever `value` changes */
function useFlash(value: unknown): boolean {
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(value);
  useEffect(() => {
    if (prevRef.current !== value) {
      prevRef.current = value;
      setFlashing(true);
      const t = setTimeout(() => setFlashing(false), 600);
      return () => clearTimeout(t);
    }
  }, [value]);
  return flashing;
}

export const DashboardPage: React.FC = () => {
  const {
    incidents,
    resources,
    shelters,
    updateIncidentStatus,
    dispatchResource,
    getNearbyEmergencyPlaces,
    resetState,
  } = useDisasterContext();

  const [selectedIncidentId, setSelectedIncidentId] = useState<string | undefined>();
  const [targetResourceId, setTargetResourceId] = useState<string | undefined>();
  const [targetPlace, setTargetPlace] = useState<EmergencyPlace | undefined>();
  const [nearbyPlaces, setNearbyPlaces] = useState<EmergencyPlace[]>([]);
  const [radiusMeters, setRadiusMeters] = useState<number>(5000);

  const radiusKm = radiusMeters / 1000;

  const activeIncident = useMemo(
    () => incidents.find((i) => i.id === selectedIncidentId) || incidents[0],
    [incidents, selectedIncidentId]
  );

  const activeLat = activeIncident?.location?.lat;
  const activeLng = activeIncident?.location?.lng;

  useEffect(() => {
    setNearbyPlaces([]);
  }, [selectedIncidentId]);

  useEffect(() => {
    if (activeLat && activeLng) {
      getNearbyEmergencyPlaces(activeLat, activeLng, radiusMeters).then((res) => {
        if (res.success && Array.isArray(res.places)) {
          setNearbyPlaces((prev) => {
            const nextMap: Record<string, EmergencyPlace> = {};
            prev.forEach((p) => {
              if (p?.id) nextMap[p.id] = p;
            });
            res.places.forEach((p) => {
              if (p?.id) nextMap[p.id] = p;
            });
            return Object.values(nextMap);
          });
        }
      });
    }
  }, [selectedIncidentId, radiusMeters, activeLat, activeLng, getNearbyEmergencyPlaces]);

  // Filter mobile units strictly inside selected incident's radius
  const inRadiusUnits = useMemo(() => {
    if (!activeIncident?.location?.lat) return resources;
    const incLat = activeIncident.location.lat;
    const incLng = activeIncident.location.lng;
    return resources.filter((r) => {
      const resLat = r.currentLocation?.lat ?? 0;
      const resLng = r.currentLocation?.lng ?? 0;
      return calculateHaversineDistance(resLat, resLng, incLat, incLng) <= radiusKm;
    });
  }, [resources, activeIncident, radiusKm]);

  const activeInRadiusCount = useMemo(
    () => inRadiusUnits.filter((r) => r.status === 'ON_SITE' || r.status === 'EN_ROUTE').length,
    [inRadiusUnits]
  );

  const availableInRadiusCount = useMemo(
    () => inRadiusUnits.filter((r) => r.status === 'AVAILABLE').length,
    [inRadiusUnits]
  );

  const totalGlobalActiveCount = useMemo(
    () => resources.filter((r) => r.status === 'ON_SITE' || r.status === 'EN_ROUTE').length,
    [resources]
  );

  // ── Derived live metrics (auto-reactive to any context state change) ─────────
  const criticalCount = useMemo(
    () => incidents.filter((i) => i.severity === 'CRITICAL').length,
    [incidents]
  );

  const strandedTotal = useMemo(
    () => incidents.reduce((acc, i) => acc + (i.strandedCount ?? 0), 0),
    [incidents]
  );

  const totalShelterCapacity = useMemo(
    () => shelters.reduce((acc, s) => acc + s.capacity, 0),
    [shelters]
  );

  const totalShelterOccupancy = useMemo(
    () => shelters.reduce((acc, s) => acc + s.currentOccupancy, 0),
    [shelters]
  );

  const shelterPct = useMemo(
    () => Math.round((totalShelterOccupancy / (totalShelterCapacity || 1)) * 100),
    [totalShelterOccupancy, totalShelterCapacity]
  );

  const awaitingDispatch = useMemo(
    () => incidents.filter((i) => i.status === 'REPORTED').length,
    [incidents]
  );

  const injuredTotal = useMemo(
    () => incidents.reduce((acc, i) => acc + (i.injuredCount || 0), 0),
    [incidents]
  );

  // Flash effects — fire when each derived value changes
  const criticalFlash = useFlash(criticalCount);
  const strandedFlash = useFlash(strandedTotal);
  const deployedFlash = useFlash(activeInRadiusCount);
  const shelterFlash = useFlash(shelterPct);
  const [isResetting, setIsResetting] = useState(false);
  const [pipelineStepIndex, setPipelineStepIndex] = useState<number | null>(null);

  const handleResetData = async () => {
    if (isResetting) return;
    setIsResetting(true);
    setPipelineStepIndex(0);

    let currentStep = 0;
    const interval = setInterval(() => {
      currentStep += 1;
      if (currentStep < PIPELINE_STEPS.length) {
        setPipelineStepIndex(currentStep);
      } else {
        clearInterval(interval);
      }
    }, 350);

    try {
      await resetState();
    } catch (err) {
      console.error('Reset mock state error:', err);
    } finally {
      const totalAnimationDuration = PIPELINE_STEPS.length * 350 + 600;
      setTimeout(() => {
        clearInterval(interval);
        setIsResetting(false);
        setPipelineStepIndex(null);
      }, totalAnimationDuration);
    }
  };

  return (
    <div className="flex-1 p-3 md:p-5 space-y-4 max-w-[1800px] mx-auto w-full">
      {/* Live Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className={`transition-all duration-300 ${criticalFlash ? 'ring-4 ring-red-400 rounded-2xl scale-[1.02]' : ''}`}>
          <StatCard
            title="Critical Emergencies"
            value={criticalCount}
            subtitle="Fire-Tier Life Threat Priority"
            icon={AlertTriangle}
            accentColor="red"
            trend={{ value: `${awaitingDispatch} Awaiting Dispatch`, isPositive: false }}
          />
        </div>

        <div className={`transition-all duration-300 ${strandedFlash ? 'ring-4 ring-amber-400 rounded-2xl scale-[1.02]' : ''}`}>
          <StatCard
            title="Stranded Citizens"
            value={strandedTotal}
            subtitle="Rescue / Evacuation Targets"
            icon={Users}
            accentColor="orange"
            trend={{ value: `${injuredTotal} Injured Total`, isPositive: false }}
          />
        </div>

        <div className={`transition-all duration-300 ${deployedFlash ? 'ring-4 ring-blue-400 rounded-2xl scale-[1.02]' : ''}`}>
          <StatCard
            title="Deployed Units (In-Radius)"
            value={`${activeInRadiusCount}/${inRadiusUnits.length}`}
            subtitle={`Within ${radiusKm}km of ${activeIncident?.title ? activeIncident.title.slice(0, 18) + '...' : 'Target'}`}
            icon={Truck}
            accentColor="cyan"
            trend={{
              value: `${availableInRadiusCount} Ready in Radius | ${totalGlobalActiveCount} Global`,
              isPositive: availableInRadiusCount > 0,
            }}
          />
        </div>

        <div className={`transition-all duration-300 ${shelterFlash ? 'ring-4 ring-emerald-400 rounded-2xl scale-[1.02]' : ''}`}>
          <StatCard
            title="Shelter Capacity"
            value={`${shelterPct}%`}
            subtitle={`${totalShelterOccupancy} / ${totalShelterCapacity} Occupied`}
            icon={Home}
            accentColor="emerald"
            trend={{ value: `${shelters.filter((s) => s.status !== 'CLOSED').length} Safe Sanctuaries`, isPositive: true }}
          />
        </div>
      </div>

      {/* Main EOC Command Center Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[760px]">
        {/* Left: Live Incident Stream */}
        <div className="lg:col-span-4 h-full overflow-hidden">
          <IncidentFeed
            incidents={incidents}
            resources={resources}
            nearbyPlaces={nearbyPlaces}
            radiusMeters={radiusMeters}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => {
              setSelectedIncidentId(id);
              setTargetResourceId(undefined);
              setTargetPlace(undefined);
            }}
            onSelectResourceForRoute={(incId, resId) => {
              setSelectedIncidentId(incId);
              setTargetResourceId(resId);
              setTargetPlace(undefined);
            }}
            onSelectPlaceForRoute={(incId, place) => {
              setSelectedIncidentId(incId);
              setTargetPlace(place);
              setTargetResourceId(`FACILITY:${place.id}`);
            }}
            onUpdateStatus={updateIncidentStatus}
            onDispatchResource={dispatchResource}
          />
        </div>

        {/* Center: Live Situation Map */}
        <div className="lg:col-span-5 h-full flex flex-col gap-2.5">
          {/* Top Map HUD Status Bar or Pipeline Bar */}
          {pipelineStepIndex !== null ? (
            <PipelineBar currentStepIndex={pipelineStepIndex} />
          ) : (
            <div className="flex items-center justify-between bg-white border-2 border-slate-200 p-3 rounded-2xl shadow-sm text-xs font-display">
              <div className="flex items-center gap-2.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                <span className="font-extrabold text-slate-800 tracking-wide flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#FFCB05] fill-[#FFCB05]" />
                  LIVE RADAR & TACTICAL SATELLITE HUD
                </span>
              </div>
              <button
                onClick={handleResetData}
                disabled={isResetting}
                className="px-3 py-1.5 bg-[#FFCB05] hover:bg-[#FFE066] text-slate-900 font-extrabold border-2 border-[#E5A700] rounded-xl text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-60"
              >
                {isResetting ? (
                  <Loader2 className="w-3.5 h-3.5 text-slate-900 animate-spin" />
                ) : (
                  <RefreshCcw className="w-3.5 h-3.5" />
                )}
                <span>{isResetting ? 'GENERATING STATE...' : 'RESET MOCK STATE'}</span>
              </button>
            </div>
          )}

          <div className="flex-1 min-h-0 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm bg-white p-1">
            <SituationMap
              incidents={incidents}
              shelters={shelters}
              resources={resources}
              selectedIncidentId={selectedIncidentId}
              targetResourceId={targetResourceId}
              targetPlace={targetPlace}
              radiusMeters={radiusMeters}
              onRadiusChange={setRadiusMeters}
              onSelectIncident={(id) => {
                setSelectedIncidentId(id);
                setTargetResourceId(undefined);
                setTargetPlace(undefined);
              }}
              onUpdateIncidentStatus={updateIncidentStatus}
              height="100%"
            />
          </div>
        </div>

        {/* Right: Resources & Shelters */}
        <div className="lg:col-span-3 h-full flex flex-col gap-3 overflow-hidden">
          <div className="flex-1 min-h-0">
            <ResourceSummary
              resources={resources}
              selectedIncident={activeIncident}
              radiusMeters={radiusMeters}
            />
          </div>
          <div className="flex-1 min-h-0">
            <ShelterOverview
              shelters={shelters}
              selectedIncident={activeIncident}
              radiusMeters={radiusMeters}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
