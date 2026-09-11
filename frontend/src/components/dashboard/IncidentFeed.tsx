import React, { useState, useMemo } from 'react';
import { Incident, ResourceUnit, EmergencyPlace } from '../../types';
import { SeverityBadge } from '../common/SeverityBadge';
import { formatTimeAgo } from '../../utils/formatters';
import {
  getRankedResourceRecommendations,
  getFacilityFallbackForIncident,
  ResourceRecommendation,
  FacilityRecommendation,
} from '../../utils/aiRecommendationEngine';
import {
  AlertTriangle,
  MapPin,
  Users,
  ChevronRight,
  TrendingUp,
  Zap,
  Bot,
  Sparkles,
  ShieldAlert,
  Building2,
  Radio,
} from 'lucide-react';

interface IncidentFeedProps {
  incidents: Incident[];
  resources?: ResourceUnit[];
  nearbyPlaces?: EmergencyPlace[];
  radiusMeters?: number;
  selectedIncidentId?: string;
  onSelectIncident?: (id: string) => void;
  onSelectResourceForRoute?: (incidentId: string, resourceId: string) => void;
  onSelectPlaceForRoute?: (incidentId: string, place: EmergencyPlace) => void;
  onUpdateStatus?: (id: string, status: Incident['status']) => void;
  onDispatchResource?: (incidentId: string, resourceId: string, etaMinutes?: number) => void;
}

export const IncidentFeed: React.FC<IncidentFeedProps> = ({
  incidents,
  resources = [],
  nearbyPlaces = [],
  radiusMeters = 5000,
  selectedIncidentId,
  onSelectIncident,
  onSelectResourceForRoute,
  onSelectPlaceForRoute,
  onUpdateStatus,
  onDispatchResource,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  // Tracks custom dropdown selections per incident: { [incidentId]: selectionId }
  const [customSelectedTargets, setCustomSelectedTargets] = useState<Record<string, string>>({});

  const radiusKm = radiusMeters / 1000;

  // Filter then sort by zone score descending
  const sortedIncidents = useMemo(() => {
    const filtered = incidents.filter((inc) => {
      if (filter === 'CRITICAL') return inc.severity === 'CRITICAL';
      if (filter === 'HIGH') return inc.severity === 'HIGH' || inc.severity === 'CRITICAL';
      return true;
    });
    return [...filtered].sort((a, b) => {
      const scoreA = a.zoneScore ?? a.aiPriorityScore ?? 0;
      const scoreB = b.zoneScore ?? b.aiPriorityScore ?? 0;
      return scoreB - scoreA;
    });
  }, [incidents, filter]);

  const getRankStyle = (rank: number) => {
    if (rank === 0) return { badge: 'bg-red-500 text-white border-red-600 shadow-sm', bar: '#EF4444' };
    if (rank === 1) return { badge: 'bg-amber-500 text-white border-amber-600 shadow-sm', bar: '#F59E0B' };
    if (rank === 2) return { badge: 'bg-emerald-500 text-white border-emerald-600 shadow-sm', bar: '#10B981' };
    return { badge: 'bg-slate-200 text-slate-700 border-slate-300', bar: '#94A3B8' };
  };

  const handleTargetSelect = (
    incidentId: string,
    selectionVal: string,
    facilityFallback?: FacilityRecommendation | null
  ) => {
    setCustomSelectedTargets((prev) => ({ ...prev, [incidentId]: selectionVal }));

    if (selectionVal.startsWith('FACILITY:') && facilityFallback) {
      onSelectPlaceForRoute?.(incidentId, facilityFallback.place);
    } else {
      onSelectResourceForRoute?.(incidentId, selectionVal);
    }
  };

  const handleDispatch = (
    e: React.MouseEvent,
    inc: Incident,
    activeResourceId?: string,
    isFacilityActive?: boolean
  ) => {
    e.stopPropagation();

    if (inc.status === 'REPORTED') {
      if (activeResourceId && !isFacilityActive && onDispatchResource) {
        const chosenRes = resources.find((r) => r.id === activeResourceId);
        const eta = chosenRes?.etaMinutes || 12;
        onDispatchResource(inc.id, activeResourceId, eta);
      } else {
        onUpdateStatus?.(inc.id, 'DISPATCHED');
      }
    } else if (inc.status === 'DISPATCHED') {
      onUpdateStatus?.(inc.id, 'ON_SITE');
    } else if (inc.status === 'ON_SITE') {
      onUpdateStatus?.(inc.id, 'RESOLVED');
    }
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl flex flex-col h-full overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-3.5 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-red-100 text-red-600 border border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div>
            <h3 className="font-display text-sm font-extrabold text-slate-800 uppercase tracking-wide">
              Incident Stream
            </h3>
            <span className="text-[10px] font-sans font-semibold text-slate-500">
              {sortedIncidents.length} active emergency targets
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-display font-bold text-blue-700 border-2 border-blue-200 rounded-full px-2.5 py-0.5 bg-blue-50">
            <Radio className="w-3 h-3 text-blue-600 animate-pulse" />
            {radiusKm}km SCAN
          </div>
          <div className="flex gap-1 p-1 bg-slate-200/80 rounded-full">
            {(['ALL', 'CRITICAL', 'HIGH'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2.5 py-0.5 rounded-full font-display font-bold text-[10px] transition-all ${
                  filter === f
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incident Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {sortedIncidents.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400 font-sans text-xs text-center gap-2">
            <ShieldAlert className="w-10 h-10 text-slate-300" />
            <p className="font-bold">No active incidents in target sector</p>
          </div>
        )}
        {sortedIncidents.map((inc, index) => {
          const zoneScore = inc.zoneScore ?? inc.aiPriorityScore ?? 0;
          const { badge: rankBadge, bar: rankBar } = getRankStyle(index);
          const isTopRisk = index === 0;
          const isSelected = selectedIncidentId === inc.id;

          // Rank mobile resources within strictly defined incident radius
          const {
            inRadiusRecommendations,
            outOfRadiusRecommendations,
            allRecommendations,
            hasUnitsInRadius,
          } = getRankedResourceRecommendations(inc, resources, radiusMeters);

          // If no mobile units inside radius, find nearest Emergency Facility POI
          const facilityFallback = !hasUnitsInRadius
            ? getFacilityFallbackForIncident(inc, nearbyPlaces, radiusMeters)
            : null;

          // Default selection value
          const defaultVal = hasUnitsInRadius
            ? inRadiusRecommendations[0]?.resource.id
            : facilityFallback
            ? `FACILITY:${facilityFallback.place.id}`
            : '';

          const activeVal = customSelectedTargets[inc.id] || defaultVal;
          const isFacilityActive = activeVal.startsWith('FACILITY:');

          const activeResRec = !isFacilityActive
            ? inRadiusRecommendations.find((r) => r.resource.id === activeVal) || inRadiusRecommendations[0]
            : null;

          return (
            <div
              key={inc.id}
              onClick={() => {
                onSelectIncident?.(inc.id);
                if (isFacilityActive && facilityFallback) {
                  onSelectPlaceForRoute?.(inc.id, facilityFallback.place);
                } else if (activeResRec) {
                  onSelectResourceForRoute?.(inc.id, activeResRec.resource.id);
                }
              }}
              className={`group p-3.5 bg-slate-50/60 border-2 rounded-2xl transition-all cursor-pointer relative shadow-sm hover:shadow-md hover:bg-white ${
                isSelected
                  ? 'border-blue-500 ring-4 ring-blue-100 bg-white shadow-md'
                  : isTopRisk
                  ? 'border-red-300 bg-red-50/30'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Left rank indicator */}
              <div
                className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full"
                style={{ background: rankBar }}
              />

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-display font-black border ${rankBadge}`}>
                    {index + 1}
                  </span>
                  <SeverityBadge severity={inc.severity} size="sm" />
                  <span className="font-mono text-[10px] text-slate-400 font-semibold">{inc.id}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* Zone Score HP / Power Pill */}
                  <span
                    className={`px-2 py-0.5 rounded-full border text-[10px] font-display font-black shadow-sm ${
                      zoneScore >= 60
                        ? 'bg-red-50 text-red-700 border-red-300'
                        : zoneScore >= 45
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : 'bg-blue-50 text-blue-700 border-blue-300'
                    }`}
                    title="zone_score = log10(people)×20 + disaster_type + urgency_keywords"
                  >
                    ⚡ {zoneScore}
                  </span>
                  <span className="text-[10px] font-sans font-medium text-slate-400">
                    {formatTimeAgo(inc.reportedAt)}
                  </span>
                </div>
              </div>

              <h4 className="font-display font-extrabold text-sm text-slate-900 group-hover:text-blue-600 transition-colors leading-tight">
                {inc.title}
              </h4>

              <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1 text-slate-600 font-medium truncate max-w-[170px]">
                  <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{inc.location?.address || 'Disaster Sector'}</span>
                </span>
                <span className="flex items-center gap-1 text-amber-700 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  <Users className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                  <span>Stranded: {inc.strandedCount ?? 0}</span>
                </span>
              </div>

              {/* Strict Radius Scanner & Dropdown Target Selector */}
              {inc.status === 'REPORTED' && (
                <div
                  className="mt-3 pt-2.5 border-t border-slate-200 space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between text-[11px] font-display font-bold">
                    <span className="text-blue-600 flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-blue-600" />
                      AUTO-TARGET SCANNER ({radiusKm}km):
                    </span>
                    {hasUnitsInRadius ? (
                      <span className="text-emerald-700 text-[10px] font-bold bg-emerald-50 border border-emerald-300 px-2 py-0.5 rounded-full">
                        ✓ {inRadiusRecommendations.length} UNITS READY
                      </span>
                    ) : (
                      <span className="text-amber-800 text-[10px] font-bold bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-full">
                        ⚠️ FACILITY FALLBACK
                      </span>
                    )}
                  </div>

                  {/* Dropdown Target Selector */}
                  <select
                    value={activeVal}
                    onChange={(e) => handleTargetSelect(inc.id, e.target.value, facilityFallback)}
                    className="w-full bg-white border-2 border-slate-300 hover:border-blue-500 text-xs font-sans font-semibold text-slate-800 rounded-xl p-2 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer shadow-sm transition-all"
                  >
                    {!hasUnitsInRadius && !facilityFallback && (
                      <option value="" disabled className="text-red-500 font-bold">
                        ⚠️ No units or facilities inside {radiusKm}km radius
                      </option>
                    )}

                    {/* Facility Fallback Option */}
                    {facilityFallback && (
                      <option value={`FACILITY:${facilityFallback.place.id}`} className="text-amber-800 font-bold">
                        🚨 FACILITY: {facilityFallback.place.name} ({facilityFallback.place.type}) • {facilityFallback.distanceKm}km (~{facilityFallback.etaMinutes}m ETA)
                      </option>
                    )}

                    {/* Units Inside Radius */}
                    {inRadiusRecommendations.length > 0 && (
                      <optgroup label={`--- Mobile Units Inside ${radiusKm}km Radius ---`}>
                        {inRadiusRecommendations.map((rec, idx) => (
                          <option key={rec.resource.id} value={rec.resource.id} className="text-emerald-800 font-medium">
                            {idx === 0 ? '⭐ Recommended: ' : 'Unit: '}
                            {rec.resource.callsign} ({rec.resource.category}) • {rec.distanceKm}km (~{rec.etaMinutes}m ETA)
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>

                  {/* AI Rationale / Radius Fallback Status Banner */}
                  {isFacilityActive && facilityFallback ? (
                    <div className="text-xs font-sans text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-2 flex items-start gap-1.5 leading-relaxed font-medium">
                      <Building2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span>{facilityFallback.aiReason}</span>
                    </div>
                  ) : activeResRec ? (
                    <div className="text-xs font-sans text-blue-900 bg-blue-50 border border-blue-200 rounded-xl p-2 flex items-start gap-1.5 leading-relaxed font-medium">
                      <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <span>{activeResRec.aiReason}</span>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Quick Action Bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
                <span className={`text-[10px] font-display font-extrabold px-2.5 py-1 rounded-full border-2 ${
                  inc.status === 'REPORTED'
                    ? 'text-amber-700 border-amber-300 bg-amber-50'
                    : inc.status === 'DISPATCHED'
                    ? 'text-blue-700 border-blue-300 bg-blue-50'
                    : inc.status === 'ON_SITE'
                    ? 'text-emerald-700 border-emerald-300 bg-emerald-50'
                    : 'text-slate-600 border-slate-300 bg-slate-100'
                }`}>
                  {inc.status}
                </span>

                <div className="flex items-center gap-1.5">
                  {inc.status !== 'RESOLVED' && inc.status !== 'CANCELLED' && (
                    <button
                      onClick={(e) => handleDispatch(e, inc, activeResRec?.resource.id, isFacilityActive)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-display font-extrabold border-2 transition-all flex items-center gap-1 shadow-sm active:scale-95 ${
                        inc.status === 'REPORTED'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-700 hover:from-blue-500 hover:to-indigo-500 shadow-blue-200'
                          : inc.status === 'DISPATCHED'
                          ? 'bg-amber-500 text-white border-amber-600 hover:bg-amber-400'
                          : 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-400'
                      }`}
                    >
                      {inc.status === 'REPORTED' && <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />}
                      {inc.status === 'REPORTED'
                        ? isFacilityActive && facilityFallback
                          ? `ROUTE ${facilityFallback.place.type.toUpperCase()}`
                          : activeResRec
                          ? `DISPATCH ${activeResRec.resource.callsign.split(' ')[0]}`
                          : 'DISPATCH UNIT'
                        : inc.status === 'DISPATCHED'
                        ? 'MARK ON-SITE'
                        : 'RESOLVE'}
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
