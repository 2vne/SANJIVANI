import React, { useMemo } from 'react';
import { Shelter, Incident } from '../../types';
import { calculateHaversineDistance } from '../../utils/aiRecommendationEngine';
import { Home, MapPin, Radio, Droplets, UserCheck } from 'lucide-react';

interface ShelterOverviewProps {
  shelters: Shelter[];
  selectedIncident?: Incident;
  radiusMeters?: number;
  onSelectShelter?: (id: string) => void;
}

export const ShelterOverview: React.FC<ShelterOverviewProps> = ({
  shelters,
  selectedIncident,
  radiusMeters = 5000,
}) => {
  const radiusKm = radiusMeters / 1000;

  const filteredShelters = useMemo(() => {
    if (!selectedIncident?.location?.lat || !selectedIncident?.location?.lng) {
      return shelters.map((s) => ({ shelter: s, distanceKm: 0 }));
    }
    const incLat = selectedIncident.location.lat;
    const incLng = selectedIncident.location.lng;

    return shelters
      .map((s) => {
        const sLat = s.location?.lat ?? 0;
        const sLng = s.location?.lng ?? 0;
        const distanceKm = calculateHaversineDistance(sLat, sLng, incLat, incLng);
        return { shelter: s, distanceKm };
      })
      .filter((item) => item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [shelters, selectedIncident, radiusKm]);

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-3.5 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-blue-100 text-blue-600 border border-blue-200">
            <Home className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-display text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              Safe Sanctuaries ({filteredShelters.length}/{shelters.length})
            </h3>
            <span className="text-[10px] font-sans font-semibold text-slate-500">
              Shelter & Supply HP
            </span>
          </div>
        </div>
        <span className="text-[10px] font-display font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Radio className="w-3 h-3 animate-pulse text-blue-600" />
          {radiusKm} KM
        </span>
      </div>

      <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
        {filteredShelters.length === 0 && (
          <div className="flex flex-col items-center justify-center h-28 text-slate-400 font-sans text-xs text-center p-2">
            <p className="font-medium">No safe shelters located inside {radiusKm}km radius</p>
          </div>
        )}
        {filteredShelters.map(({ shelter: s, distanceKm }) => {
          const pct = Math.round((s.currentOccupancy / s.capacity) * 100);
          return (
            <div key={s.id} className="p-2.5 bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-xl hover:bg-white transition-all shadow-xs">
              <div className="flex items-center justify-between text-xs font-display font-extrabold text-slate-900">
                <div className="flex items-center gap-1.5">
                  <span>{s.name}</span>
                  {distanceKm > 0 && (
                    <span className="text-[10px] font-display text-blue-600 font-bold flex items-center gap-0.5 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded-full">
                      <MapPin className="w-2.5 h-2.5" />
                      {distanceKm}km
                    </span>
                  )}
                </div>
                <span className="font-mono text-xs font-bold text-slate-700">{s.currentOccupancy}/{s.capacity}</span>
              </div>

              {/* Pokémon HP Bar Style Capacity Progress */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[10px] font-display font-bold text-slate-500 mb-1">
                  <span>OCCUPANCY HP</span>
                  <span className={pct > 90 ? 'text-red-600' : pct > 75 ? 'text-amber-600' : 'text-emerald-600'}>
                    {pct}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 p-0.5 border border-slate-300 shadow-inner">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      pct > 90
                        ? 'bg-gradient-to-r from-orange-500 to-red-600 shadow-sm'
                        : pct > 75
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-sm'
                        : 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-sm'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-sans font-semibold text-slate-500 mt-2 pt-1 border-t border-slate-200/60">
                <span className="flex items-center gap-1 text-cyan-700">
                  <Droplets className="w-3 h-3 text-blue-500" />
                  Water: {s.supplies?.waterDays ?? 3}d reserve
                </span>
                <span className="flex items-center gap-1 text-emerald-700">
                  <UserCheck className="w-3 h-3 text-emerald-600" />
                  Med Staff: {s.medicalStaffCount ?? 2}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
