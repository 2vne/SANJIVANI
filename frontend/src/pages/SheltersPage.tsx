import React from 'react';
import { useShelters } from '../hooks/useShelters';
import { Home, Plus, Minus, Phone, ShieldCheck, Droplets, Utensils, HeartPulse } from 'lucide-react';

export const SheltersPage: React.FC = () => {
  const { shelters, updateOccupancy } = useShelters();

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
              SAFE SHELTER NETWORK & OCCUPANCY MONITOR
            </h1>
            <p className="text-xs font-sans font-semibold text-slate-500 mt-0.5">
              Capacity planning, food/water stockpile reserves, and evacuation receiving stats.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-display font-extrabold text-slate-700 bg-slate-100 border border-slate-300 px-3 py-1.5 rounded-full shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{shelters.length} SAFE HAVENS</span>
          </div>
        </div>
      </div>

      {/* 2-Column Shelters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {shelters.map((shelter) => {
          const occupancyPct = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);
          const theme = getOccupancySeverityTheme(occupancyPct);

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
                      {shelter.location?.zone || 'Safe Zone'}
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

                {/* Shelter Title & Address */}
                <div>
                  <h3 className="text-base md:text-lg font-display font-black text-slate-900 leading-snug">
                    {shelter.name}
                  </h3>
                  <p className="text-xs font-sans font-medium text-slate-500 mt-1">
                    {shelter.location?.address || 'Shelter Facility'}
                  </p>
                </div>

                {/* Occupancy HP Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-display font-bold text-slate-600">
                    <span className="uppercase tracking-wider text-[11px]">Occupancy Counter:</span>
                    <span className="text-slate-800">
                      {shelter.currentOccupancy} / {shelter.capacity} evacuees
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 p-0.5 border border-slate-300 shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-500 shadow-sm ${theme.barGradient}`}
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
                      {shelter.supplies.waterDays} Days
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center shadow-xs">
                    <div className="text-slate-400 text-[10px] font-display font-extrabold uppercase tracking-wider flex items-center justify-center gap-1">
                      <Utensils className="w-3 h-3 text-emerald-600" />
                      <span>FOOD</span>
                    </div>
                    <div className="font-display font-black text-emerald-700 text-sm mt-1">
                      {shelter.supplies.foodDays} Days
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-center shadow-xs">
                    <div className="text-slate-400 text-[10px] font-display font-extrabold uppercase tracking-wider flex items-center justify-center gap-1">
                      <HeartPulse className="w-3 h-3 text-amber-500" />
                      <span>MED KITS</span>
                    </div>
                    <div className="font-display font-black text-amber-700 text-sm mt-1">
                      {shelter.supplies.medicalKits} Kits
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Number & Admit Evacuees Controls */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t-2 border-slate-100">
                <span className="text-xs font-display font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-xs">
                  <Phone className="w-3.5 h-3.5 text-blue-600 fill-blue-100" />
                  <span>{shelter.contactPhone}</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateOccupancy(shelter.id, -10)}
                    aria-label="Decrease evacuees"
                    className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-700 font-black border-2 border-slate-300 shadow-xs flex items-center justify-center active:scale-95 transition-all"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-xs px-1 font-display font-black text-slate-800 uppercase tracking-wider">
                    Admit Evacuees
                  </span>
                  <button
                    onClick={() => updateOccupancy(shelter.id, 10)}
                    aria-label="Increase evacuees"
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black border-2 border-blue-700 shadow-sm flex items-center justify-center active:scale-95 transition-all"
                  >
                    <Plus className="w-4 h-4" />
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
