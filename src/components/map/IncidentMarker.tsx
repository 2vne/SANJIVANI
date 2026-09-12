import React from 'react';
import { Incident } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';

interface IncidentMarkerProps {
  incident: Incident;
  onClick?: () => void;
}

export const IncidentMarker: React.FC<IncidentMarkerProps> = ({ incident, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 cursor-pointer transition-all shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <SeverityBadge severity={incident.severity} size="sm" />
        <span className="font-mono text-[10px] text-slate-400 font-bold">{incident.id}</span>
      </div>
      <h5 className="font-display font-bold text-xs text-slate-900 line-clamp-1">{incident.title}</h5>
      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{incident.location?.address || 'Disaster Location'}</p>
    </div>
  );
};
