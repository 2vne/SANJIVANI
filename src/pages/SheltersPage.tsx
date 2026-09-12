import React, { useEffect, useState, useMemo } from 'react';
import { useShelters } from '../hooks/useShelters';
import { apiService } from '../services/apiService';
import { calculateHaversineDistance } from '../utils/aiRecommendationEngine';
import { Shelter, EmergencyPlace } from '../types';
import { Home, Plus, Minus, Phone, ShieldCheck, Droplets, Utensils, HeartPulse, MapPin, Loader2, Radio, UserCheck } from 'lucide-react';

export const SheltersPage: React.FC = () => {
  const {
    shelters,
    updateOccupancy,
    commandCenterLocation,
    commandCenterRadiusKm,
    setCommandCenterRadiusKm,
  } = useShelters();

  const [livePlaces, setLivePlaces] = useState<EmergencyPlace[]>([]);
  const [isFetchingLive, setIsFetchingLive] = useState(false);

  // Dynamic Occupancy state dictionary: { [shelterId]: currentOccupancyCount }
  const [occupancyMap, setOccupancyMap] = useState<Record<string, number>>({});

  // Fetch live OpenStreetMap emergency places around Command Centre location
  useEffect(() => {
    let isMounted = true;
    const fetchLiveShelters = async () => {
      if (!commandCenterLocation?.lat || !commandCenterLocation?.lng) return;
      setIsFetchingLive(true);

      const radiusMeters = commandCenterRadiusKm * 1000;
      const res = await apiService.fetchNearbyEmergencyPlaces(
        commandCenterLocation.lat,
        commandCenterLocation.lng,
        radiusMeters
      );

      if (isMounted) {
        setIsFetchingLive(false);
        if (res.success && Array.isArray(res.places)) {
          setLivePlaces(res.places);
        }
      }
    };

    fetchLiveShelters();
    return () => {
      isMounted = false;
    };
  }, [commandCenterLocation, commandCenterRadiusKm]);

  // Deterministic seed helper for live OSM shelters (prevents random re-render jumps)
  const getDeterministicBaseOccupancy = (id: string, cap: number) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = (hash << 5) - hash + id.charCodeAt(i);
      hash |= 0;
    }
    const positiveHash = Math.abs(hash);
    return (positiveHash % Math.floor(cap * 0.5)) + 15;
  };

  // Convert live OpenStreetMap emergency places into Shelter format
  const convertedLiveShelters: Shelter[] = useMemo(() => {
    return livePlaces.map((p, idx) => {
      const shelterId = p.id || `LIVE-OSM-${idx + 101}`;
      const capacity = 250;
      const baseOcc = getDeterministicBaseOccupancy(shelterId, capacity);

      return {
        id: shelterId,
        name: p.name || `${p.type.replace('_', ' ').toUpperCase()} SAFE HAVEN`,
        location: {
          lat: p.latitude,
          lng: p.longitude,
          address: p.address || 'Real-World Emergency Safe Haven Sector',
          zone: 'Live Safe Sector',
        },
        capacity: capacity,
        currentOccupancy: baseOcc,
        status: 'OPEN',
        contactPhone: p.phone || '108',
        medicalStaffCount: p.type === 'hospital' ? 12 : 4,
        supplies: {
          waterDays: 5,
          foodDays: 4,
          medicalKits: 50,
        },
      };
    });
  }, [livePlaces]);

  // Combine system shelters + live OpenStreetMap shelters
  const allSheltersCombined = useMemo(() => {
    const map: Record<string, Shelter> = {};
    shelters.forEach((s) => {
      map[s.id] = s;
    });
    convertedLiveShelters.forEach((s) => {
      if (!map[s.id]) {
        map[s.id] = s;
      }
    });
    return Object.values(map);
  }, [shelters, convertedLiveShelters]);

  // Filter shelters strictly inside the selected X-km circle relative to Command Centre Location
  const sheltersInCircle = useMemo(() => {
    if (!commandCenterLocation?.lat || !commandCenterLocation?.lng) return [];

    const centerLat = commandCenterLocation.lat;
    const centerLng = commandCenterLocation.lng;

    return allSheltersCombined
      .map((shelter) => {
        const dist = calculateHaversineDistance(
          shelter.location.lat,
          shelter.location.lng,
          centerLat,
          centerLng
        );
        return { shelter, dist };
      })
      .filter(({ dist }) => dist <= commandCenterRadiusKm)
      .sort((a, b) => a.dist - b.dist);
  }, [allSheltersCombined, commandCenterLocation, commandCenterRadiusKm]);

  // Handler for Admit Evacuees (+ / -) button clicks
  const handleAdmitEvacuees = (shelter: Shelter, delta: number) => {
    const currentVal = occupancyMap[shelter.id] ?? shelter.currentOccupancy ?? 0;
    const newVal = Math.max(0, Math.min(shelter.capacity, currentVal + delta));

    // Update local state map immediately for responsive UI feedback
    setOccupancyMap((prev) => ({
      ...prev,
      [shelter.id]: newVal,
    }));

    // If it's a registered system shelter, sync via useShelters & REST API updateShelter
    if (!shelter.id.startsWith('LIVE-')) {
      updateOccupancy(shelter.id, delta);
    }
  };

  const getOccupancySeverityTheme = (pct: number) => {
    if (pct >= 90) {
      return {
        cardBorder: 'border-red-200 hover:border-red-400 bg-gradient-to-b from-red-50/30 to-white',
        textClass: 'text-red-600',
        barGradient: 'bg-gradient-to-r from-orange-500 to-red-600',
        badgeBg: 'bg-red-100 text-red-700 border-red-300',
      };
    }
    if (pct >= 70) {
      return {
        cardBorder: 'border-amber-200 hover:border-amber-400 bg-gradient-to-b from-amber-50/30 to-white',
        textClass: 'text-amber-600',
        barGradient: 'bg-gradient-to-r from-yellow-400 to-amber-500',
        badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    }
    return {
      cardBorder: 'border-emerald-200 hover:border-emerald-400 bg-gradient-to-b from-emerald-50/30 to-white',
      textClass: 'text-emerald-600',
      barGradient: 'bg-gradient-to-r from-emerald-400 to-green-500',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    };
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-blue-100 text-blue-600 border-2 border-blue-200 shadow-sm">
            <Home className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-display font-black text-slate-900 flex items-center gap-2 tracking-wide">
              LIVE SAFE SHELTER NETWORK & OCCUPANCY
            </h1>
            <p className="text-xs font-sans font-semibold text-slate-500 mt-0.5">
              Evacuee admission capacity, food/water reserves, and live safe havens inside active map circle.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-display font-extrabold text-slate-700 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-full shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{sheltersInCircle.length} SHELTERS IN {commandCenterRadiusKm}KM CIRCLE</span>
          </div>
        </div>
      </div>

      {/* Dynamic Command Centre Map Circle & Radius Filter Banner */}
      <div className="p-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl border-2 border-blue-800 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-800/70 pb-2.5">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400 animate-bounce" />
            <span className="font-display font-extrabold text-xs tracking-wide text-blue-100">
              COMMAND CENTRE MAP CENTER:
            </span>
            <span className="font-mono text-xs font-black text-amber-300 bg-blue-950/80 px-2.5 py-0.5 rounded-lg border border-blue-700">
              {commandCenterLocation.label} ({commandCenterLocation.lat.toFixed(4)}, {commandCenterLocation.lng.toFixed(4)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-display font-bold text-blue-200">
              RADIUS CIRCLE (X km):
            </span>
            <select
              value={commandCenterRadiusKm}
              onChange={(e) => setCommandCenterRadiusKm(parseFloat(e.target.value))}
              className="bg-blue-950 text-yellow-300 border-2 border-amber-400/80 text-xs font-display font-black rounded-xl px-3 py-1 outline-none cursor-pointer shadow-sm hover:border-amber-300"
            >
              <option value={1}>1 km Circle</option>
              <option value={2}>2 km Circle</option>
              <option value={3}>3 km Circle</option>
              <option value={5}>5 km Circle (Default)</option>
              <option value={10}>10 km Circle</option>
              <option value={15}>15 km Circle</option>
            </select>
            {isFetchingLive && <Loader2 className="w-4 h-4 animate-spin text-amber-400" />}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-[11px] font-sans text-blue-200/90 gap-2">
          <span>
            Displaying all <strong className="text-white">{sheltersInCircle.length} live safe havens</strong> located strictly within the <strong className="text-amber-300 font-extrabold">{commandCenterRadiusKm} km circle radius</strong>.
          </span>
          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            LIVE OVERPASS TELEMETRY ACTIVE
          </span>
        </div>
      </div>

      {/* 2-Column Shelters Grid */}
      {sheltersInCircle.length === 0 ? (
        <div className="p-8 text-center bg-white border-2 border-dashed border-slate-300 rounded-2xl space-y-2">
          <Home className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-display font-black text-slate-800">No Shelters inside {commandCenterRadiusKm} km Circle</h3>
          <p className="text-xs text-slate-500">Try expanding the search radius circle to 5 km or 10 km above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {sheltersInCircle.map(({ shelter, dist }) => {
            // Retrieve current occupancy from occupancyMap override or shelter state
            const currentOcc = occupancyMap[shelter.id] ?? shelter.currentOccupancy ?? 0;
            const occupancyPct = Math.min(100, Math.round((currentOcc / shelter.capacity) * 100));
            const theme = getOccupancySeverityTheme(occupancyPct);
            const isOsmLive = shelter.id.startsWith('OSM-') || shelter.id.startsWith('LIVE-');

            return (
              <div
                key={shelter.id}
                className={`p-5 border-2 rounded-2xl space-y-4 shadow-sm hover:shadow-md hover:scale-[1.005] transition-all flex flex-col justify-between ${theme.cardBorder}`}
              >
                <div className="space-y-3">
                  {/* ID & Safe Zone Badges + Severity-colored Percentage */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-[11px] font-display font-black bg-blue-100 text-blue-800 border-2 border-blue-300 shadow-xs">
                        {shelter.id}
                      </span>
                      <span className="px-3 py-1 rounded-full text-[11px] font-display font-black bg-emerald-100 text-emerald-800 border-2 border-emerald-300 shadow-xs flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {isOsmLive ? 'Live OSM Haven' : shelter.location?.zone || 'Safe Zone'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className={`text-2xl font-display font-black ${theme.textClass}`}>
                        {occupancyPct}%
                      </span>
                      <div className="text-[10px] font-display font-extrabold text-slate-400 uppercase tracking-wider">
                        Occupancy
                      </div>
                    </div>
                  </div>

                  {/* Distance from Command Center Circle Pin */}
                  <div className="text-[11px] font-display font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl flex items-center justify-between">
                    <span>Distance from Circle Center:</span>
                    <span className="font-extrabold text-blue-900 font-mono">{dist.toFixed(2)} km</span>
                  </div>

                  {/* Shelter Title & Address */}
                  <div>
                    <h3 className="text-base md:text-lg font-display font-black text-slate-900 leading-snug">
                      {shelter.name}
                    </h3>
                    <p className="text-xs font-sans font-medium text-slate-500 mt-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      <span>{shelter.location?.address || 'Shelter Facility'}</span>
                    </p>
                  </div>

                  {/* Occupancy HP Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-display font-bold text-slate-600">
                      <span className="uppercase tracking-wider text-[11px]">Occupancy Counter:</span>
                      <span className="text-slate-800 font-mono font-black">
                        {currentOcc} / {shelter.capacity} evacuees
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 p-0.5 border border-slate-300 shadow-inner">
                      <div
                        className={`h-full rounded-full transition-all duration-300 shadow-sm ${theme.barGradient}`}
                        style={{ width: `${Math.min(100, Math.max(4, occupancyPct))}%` }}
                      />
                    </div>
                  </div>

                  {/* Stat Chips (3 Tiles: Water, Food, Med Kits) */}
                  <div className="grid grid-cols-3 gap-2.5 pt-1">
                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center shadow-xs">
                      <div className="text-slate-400 text-[10px] font-display font-extrabold uppercase tracking-wider flex items-center justify-center gap-1">
                        <Droplets className="w-3 h-3 text-blue-500" />
                        <span>WATER</span>
                      </div>
                      <div className="font-display font-black text-blue-700 text-sm mt-1">
                        {shelter.supplies?.waterDays ?? 5} Days
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center shadow-xs">
                      <div className="text-slate-400 text-[10px] font-display font-extrabold uppercase tracking-wider flex items-center justify-center gap-1">
                        <Utensils className="w-3 h-3 text-emerald-600" />
                        <span>FOOD</span>
                      </div>
                      <div className="font-display font-black text-emerald-700 text-sm mt-1">
                        {shelter.supplies?.foodDays ?? 4} Days
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center shadow-xs">
                      <div className="text-slate-400 text-[10px] font-display font-extrabold uppercase tracking-wider flex items-center justify-center gap-1">
                        <HeartPulse className="w-3 h-3 text-amber-500" />
                        <span>MED KITS</span>
                      </div>
                      <div className="font-display font-black text-amber-700 text-sm mt-1">
                        {shelter.supplies?.medicalKits ?? 50} Kits
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Number & Working Admit Evacuees (+ / -) Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t-2 border-slate-100">
                  <a
                    href={`tel:${shelter.contactPhone || '108'}`}
                    className="text-xs font-display font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 text-blue-600 fill-blue-100" />
                    <span>{shelter.contactPhone || '108'}</span>
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAdmitEvacuees(shelter, -10)}
                      title="Discharge 10 Evacuees"
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-display font-black border-2 border-slate-300 shadow-xs flex items-center gap-1 text-xs active:scale-95 transition-all"
                    >
                      <Minus className="w-3.5 h-3.5 text-slate-600" />
                      <span>10</span>
                    </button>

                    <button
                      onClick={() => handleAdmitEvacuees(shelter, -1)}
                      title="Discharge 1 Evacuee"
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 flex items-center justify-center active:scale-95 transition-all text-xs"
                    >
                      -1
                    </button>

                    <div className="flex items-center gap-1 px-1">
                      <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-[11px] font-display font-black text-slate-800 uppercase tracking-wider">
                        Admit Evacuees
                      </span>
                    </div>

                    <button
                      onClick={() => handleAdmitEvacuees(shelter, 1)}
                      title="Admit 1 Evacuee"
                      className="w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-300 flex items-center justify-center active:scale-95 transition-all text-xs"
                    >
                      +1
                    </button>

                    <button
                      onClick={() => handleAdmitEvacuees(shelter, 10)}
                      title="Admit 10 Evacuees"
                      className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-display font-black border-2 border-blue-700 shadow-sm flex items-center gap-1 text-xs active:scale-95 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                      <span>10</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
