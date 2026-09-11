import React, { useMemo } from 'react';
import { ResourceUnit, Incident } from '../../types';
import { RESOURCE_CATEGORY_LABELS } from '../../utils/constants';
import { calculateHaversineDistance } from '../../utils/aiRecommendationEngine';
import { Truck, BatteryCharging, MapPin, Radio } from 'lucide-react';

interface ResourceSummaryProps {
  resources: ResourceUnit[];
  selectedIncident?: Incident;
  radiusMeters?: number;
  onUpdateStatus?: (id: string, status: ResourceUnit['status']) => void;
}

export const ResourceSummary: React.FC<ResourceSummaryProps> = ({
  resources,
  selectedIncident,
  radiusMeters = 5000,
}) => {
  const radiusKm = radiusMeters / 1000;

  // Filter resources strictly located within incident radius
  const filteredResources = useMemo(() => {
    if (!selectedIncident?.location?.lat) return resources.map((r) => ({ resource: r, distanceKm: 0 }));
    const incLat = selectedIncident.location.lat;
    const incLng = selectedIncident.location.lng;

    return resources
      .map((r) => {
        const resLat = r.currentLocation?.lat ?? 0;
        const resLng = r.currentLocation?.lng ?? 0;
        const distanceKm = calculateHaversineDistance(resLat, resLng, incLat, incLng);
        return { resource: r, distanceKm };
      })
      .filter((item) => item.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [resources, selectedIncident, radiusKm]);

  const activeUnits = filteredResources.filter(
    (item) => item.resource.status === 'ON_SITE' || item.resource.status === 'EN_ROUTE'
  ).length;

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl p-3.5 flex flex-col h-full shadow-sm">
      <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2.5 mb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-emerald-100 text-emerald-600 border border-emerald-200">
            <Truck className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <h3 className="font-display text-xs font-extrabold text-slate-800 uppercase tracking-wide">
              Unit Readiness ({activeUnits}/{filteredResources.length})
            </h3>
            <span className="text-[10px] font-sans font-semibold text-slate-500">
              Active in scan zone
            </span>
          </div>
        </div>
        <span className="text-[10px] font-display font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Radio className="w-3 h-3 animate-pulse text-blue-600" />
          {radiusKm} KM
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1 flex-1">
        {filteredResources.length === 0 && (
          <div className="flex flex-col items-center justify-center h-28 text-slate-400 font-sans text-xs text-center p-2">
            <p className="font-medium">No mobile units deployed inside {radiusKm}km radius</p>
          </div>
        )}
        {filteredResources.map(({ resource: res, distanceKm }) => (
          <div
            key={res.id}
            className="p-2.5 bg-slate-50/70 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between text-xs hover:bg-white transition-all shadow-xs"
          >
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display font-extrabold text-slate-900">{res.callsign}</span>
                <span className="text-[10px] font-sans font-bold text-slate-500 bg-slate-200/80 px-1.5 py-0.2 rounded">
                  {RESOURCE_CATEGORY_LABELS[res.category] || res.category}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                <span className="truncate max-w-[130px]">{res.currentLocation?.address || 'Base Station'}</span>
                {distanceKm > 0 && (
                  <span className="text-blue-600 font-bold flex items-center gap-0.5">
                    <MapPin className="w-3 h-3" />
                    {distanceKm} km
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-display font-black border ${
                  res.status === 'AVAILABLE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                    : res.status === 'EN_ROUTE'
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-amber-50 text-amber-700 border-amber-300'
                }`}
              >
                {res.status}
              </span>
              <div className="flex items-center justify-end gap-1 text-[10px] font-display font-bold text-slate-500 mt-1">
                <BatteryCharging className="w-3 h-3 text-emerald-600" />
                <span>{res.fuelOrSupplyPct}% PWR</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
