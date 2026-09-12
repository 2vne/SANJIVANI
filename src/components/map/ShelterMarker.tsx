import React from 'react';
import { Shelter } from '../../types';

interface ShelterMarkerProps {
  shelter: Shelter;
  onClick?: () => void;
}

export const ShelterMarker: React.FC<ShelterMarkerProps> = ({ shelter, onClick }) => {
  const occupancyPct = Math.round((shelter.currentOccupancy / shelter.capacity) * 100);

  return (
    <div
      onClick={onClick}
      className="p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-emerald-500 cursor-pointer transition-all shadow-sm"
    >
      <div className="flex items-center justify-between mb-1">
        <span className="px-1.5 py-0.5 rounded text-[10px] font-display font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
          SHELTER
        </span>
        <span className="font-mono text-[10px] text-slate-400 font-bold">{shelter.id}</span>
      </div>
      <h5 className="font-display font-bold text-xs text-slate-900">{shelter.name}</h5>
      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 border border-slate-200 overflow-hidden">
        <div
          className={`h-1.5 rounded-full ${occupancyPct > 90 ? 'bg-red-500' : occupancyPct > 75 ? 'bg-amber-500' : 'bg-emerald-500'}`}
          style={{ width: `${occupancyPct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1">
        <span>Capacity: {shelter.currentOccupancy}/{shelter.capacity}</span>
        <span className="font-bold text-slate-800">{occupancyPct}%</span>
      </div>
    </div>
  );
};
