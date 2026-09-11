import React from 'react';
import { useResources } from '../hooks/useResources';
import { RESOURCE_CATEGORY_LABELS } from '../utils/constants';
import { ResourceCategory } from '../types';
import { Truck, BatteryCharging, Radio, MapPin, Users, Zap, ShieldCheck } from 'lucide-react';

export const ResourcesPage: React.FC = () => {
  const { resources, updateResourceStatus } = useResources();

  const getCategoryTheme = (category: ResourceCategory) => {
    switch (category) {
      case 'SEARCH_RESCUE':
        return {
          cardBorder: 'border-red-200 hover:border-red-400 bg-gradient-to-b from-red-50/30 to-white',
          badge: 'bg-red-100 text-red-700 border-2 border-red-300',
        };
      case 'MEDICAL_UNIT':
        return {
          cardBorder: 'border-amber-200 hover:border-amber-400 bg-gradient-to-b from-amber-50/30 to-white',
          badge: 'bg-amber-100 text-amber-800 border-2 border-amber-300',
        };
      case 'SUPPLY_CONVOY':
      case 'HEAVY_EQUIPMENT':
        return {
          cardBorder: 'border-emerald-200 hover:border-emerald-400 bg-gradient-to-b from-emerald-50/30 to-white',
          badge: 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300',
        };
      case 'WATER_VESSEL':
      case 'HELICOPTER':
      default:
        return {
          cardBorder: 'border-blue-200 hover:border-blue-400 bg-gradient-to-b from-blue-50/30 to-white',
          badge: 'bg-blue-100 text-blue-800 border-2 border-blue-300',
        };
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-600 border-2 border-emerald-200 shadow-sm">
            <Truck className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-display font-black text-slate-900 flex items-center gap-2 tracking-wide">
              RESOURCE LOGISTICS & FLEET TELEMETRY
            </h1>
            <p className="text-xs font-sans font-semibold text-slate-500 mt-0.5">
              Unit deployment readiness, communication frequency channels, and equipment battery HP.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs font-display font-extrabold text-slate-700 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-full shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{resources.length} ACTIVE UNITS</span>
          </div>
        </div>
      </div>

      {/* Collectible Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {resources.map((unit) => {
          const theme = getCategoryTheme(unit.category);
          const fuel = unit.fuelOrSupplyPct ?? 100;

          return (
            <div
              key={unit.id}
              className={`p-5 border-2 rounded-2xl space-y-4 flex flex-col justify-between shadow-sm hover:shadow-md hover:scale-[1.01] transition-all ${theme.cardBorder}`}
            >
              <div>
                {/* Category Pill & Status Pill */}
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-3 py-1 rounded-full text-[11px] font-display font-black shadow-xs ${theme.badge}`}>
                    {RESOURCE_CATEGORY_LABELS[unit.category] || unit.category}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-display font-black border-2 shadow-xs ${
                      unit.status === 'AVAILABLE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : unit.status === 'EN_ROUTE'
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : unit.status === 'ON_SITE'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}
                  >
                    {unit.status}
                  </span>
                </div>

                {/* Title & Location */}
                <h3 className="text-base font-display font-black text-slate-900 mt-3 leading-snug">
                  {unit.callsign}
                </h3>
                <p className="text-xs text-slate-500 font-sans font-medium flex items-center gap-1.5 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>{unit.currentLocation?.address || 'Base Station Station 1'}</span>
                </p>

                {/* Info Chips (Crew Size & Radio Comms) */}
                <div className="mt-3.5 pt-3 border-t-2 border-slate-100 grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                    <span className="text-slate-400 text-[10px] font-display font-extrabold uppercase tracking-wider block">
                      CREW SIZE
                    </span>
                    <div className="font-display font-bold text-slate-800 text-xs mt-0.5 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      {unit.personnelCount} Personnel
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                    <span className="text-slate-400 text-[10px] font-display font-extrabold uppercase tracking-wider block">
                      RADIO COMMS
                    </span>
                    <div className="font-display font-bold text-blue-700 text-xs mt-0.5 flex items-center gap-1">
                      <Radio className="w-3.5 h-3.5 text-blue-600" />
                      {unit.contactChannel || 'CH-16'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Supply Reserve HP Bar & Action Buttons */}
              <div className="pt-3.5 border-t-2 border-slate-100 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-display font-bold">
                    <span className="text-slate-600 text-[11px] flex items-center gap-1">
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-600" />
                      SUPPLY & POWER HP
                    </span>
                    <span className={fuel > 70 ? 'text-emerald-700' : fuel > 40 ? 'text-amber-700' : 'text-red-700'}>
                      {fuel}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2.5 p-0.5 border border-slate-300 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        fuel > 70
                          ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-sm'
                          : fuel > 40
                          ? 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-sm'
                          : 'bg-gradient-to-r from-orange-500 to-red-600 shadow-sm'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, fuel))}%` }}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => updateResourceStatus(unit.id, 'AVAILABLE')}
                    className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-display font-black rounded-xl border-2 border-slate-300 shadow-xs active:scale-95 transition-all"
                  >
                    SET AVAILABLE
                  </button>
                  <button
                    onClick={() => updateResourceStatus(unit.id, 'EN_ROUTE')}
                    className="flex-1 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-display font-black rounded-xl border-2 border-blue-700 shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                    DISPATCH
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
