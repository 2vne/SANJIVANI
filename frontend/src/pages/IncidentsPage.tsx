import React, { useState } from 'react';
import { useIncidents } from '../hooks/useIncidents';
import { SeverityBadge } from '../components/common/SeverityBadge';
import { formatDateTime } from '../utils/formatters';
import { IncidentStatus, SeverityLevel } from '../types';
import { AlertTriangle, Filter, Search, MapPin, Users, CheckCircle, Truck, Zap } from 'lucide-react';

export const IncidentsPage: React.FC = () => {
  const { incidents, updateIncidentStatus } = useIncidents();
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSearch =
      inc.title.toLowerCase().includes(search.toLowerCase()) ||
      inc.id.toLowerCase().includes(search.toLowerCase()) ||
      (inc.location?.address || '').toLowerCase().includes(search.toLowerCase());
    const matchesSev = selectedSeverity === 'ALL' || inc.severity === selectedSeverity;
    return matchesSearch && matchesSev;
  });

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Header & Filter Controls Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-red-100 text-red-600 border-2 border-red-200 shadow-sm">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-xl font-display font-black text-slate-900 flex items-center gap-2 tracking-wide">
              INCIDENT TRIAGE & MANAGEMENT LOG
            </h1>
            <p className="text-xs font-sans font-semibold text-slate-500 mt-0.5">
              Real-time distress signals, casualty metrics, and tactical dispatch workflow.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter incidents or sectors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50 border-2 border-slate-200 hover:border-red-400 focus:border-red-500 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 font-sans font-medium outline-none shadow-xs transition-all w-48 sm:w-64"
            />
          </div>

          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-slate-50 border-2 border-slate-200 hover:border-red-400 focus:border-red-500 rounded-xl px-3 py-2 text-xs font-display font-bold text-slate-800 outline-none shadow-xs cursor-pointer transition-all"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">🔥 CRITICAL</option>
            <option value="HIGH">⚡ HIGH</option>
            <option value="MEDIUM">🌿 MEDIUM</option>
            <option value="LOW">💧 LOW</option>
          </select>
        </div>
      </div>

      {/* Incidents Table Card */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-sans text-xs">
            {/* Pokédex Theme Header Row */}
            <thead className="bg-[#DC0A2D] text-white font-display font-black uppercase text-[11px] tracking-wider border-b-2 border-[#89061C]">
              <tr>
                <th className="p-3.5 pl-4">ID / Severity</th>
                <th className="p-3.5">Incident Title</th>
                <th className="p-3.5">Location / Sector</th>
                <th className="p-3.5">Casualty Triage</th>
                <th className="p-3.5">Tactical Status</th>
                <th className="p-3.5">Reported Time</th>
                <th className="p-3.5 pr-4 text-right">Dispatch Action</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 text-slate-800">
              {filteredIncidents.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400 font-display font-bold text-sm">
                    No matching incidents found
                  </td>
                </tr>
              )}
              {filteredIncidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-red-50/30 transition-colors">
                  {/* ID / Severity */}
                  <td className="p-3.5 pl-4 space-y-1.5 align-top">
                    <span className="font-display font-black text-sm text-slate-900 block">{inc.id}</span>
                    <div>
                      <SeverityBadge severity={inc.severity} size="sm" />
                    </div>
                  </td>

                  {/* Incident Title & Description */}
                  <td className="p-3.5 max-w-sm align-top">
                    <div className="font-display font-extrabold text-slate-900 text-sm leading-snug">{inc.title}</div>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2 mt-1 leading-relaxed">{inc.description}</p>
                  </td>

                  {/* Location / Zone */}
                  <td className="p-3.5 align-top">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold">
                      <MapPin className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{inc.location?.address || 'Disaster Sector'}</span>
                    </div>
                    <div className="text-[11px] font-display font-semibold text-slate-500 mt-1 pl-5">
                      {inc.location?.zone || 'Metro Disaster Zone'}
                    </div>
                  </td>

                  {/* Casualty Triage */}
                  <td className="p-3.5 align-top space-y-1">
                    <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                      <Users className="w-3 h-3 text-amber-600" />
                      <span>Stranded: <strong>{inc.strandedCount}</strong></span>
                    </div>
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md">
                        Injured: <strong>{inc.injuredCount}</strong>
                      </span>
                    </div>
                  </td>

                  {/* Tactical Status Pill */}
                  <td className="p-3.5 align-top">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-display font-black border-2 shadow-xs ${
                        inc.status === 'REPORTED'
                          ? 'bg-red-50 text-red-700 border-red-300'
                          : inc.status === 'DISPATCHED'
                          ? 'bg-blue-50 text-blue-700 border-blue-300'
                          : inc.status === 'ON_SITE'
                          ? 'bg-amber-50 text-amber-800 border-amber-300'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${
                        inc.status === 'REPORTED'
                          ? 'bg-red-500 animate-ping'
                          : inc.status === 'DISPATCHED'
                          ? 'bg-blue-500'
                          : inc.status === 'ON_SITE'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`} />
                      {inc.status}
                    </span>
                  </td>

                  {/* Reported Time */}
                  <td className="p-3.5 align-top text-xs font-mono font-semibold text-slate-600">
                    {formatDateTime(inc.reportedAt)}
                  </td>

                  {/* Dispatch Action Button */}
                  <td className="p-3.5 pr-4 align-top text-right">
                    {inc.status !== 'RESOLVED' && (
                      <button
                        onClick={() =>
                          updateIncidentStatus(
                            inc.id,
                            inc.status === 'REPORTED'
                              ? 'DISPATCHED'
                              : inc.status === 'DISPATCHED'
                              ? 'ON_SITE'
                              : 'RESOLVED'
                          )
                        }
                        className={`px-3.5 py-1.5 rounded-xl font-display font-black text-xs border-2 transition-all shadow-sm active:scale-95 inline-flex items-center gap-1.5 ${
                          inc.status === 'REPORTED'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-blue-700 shadow-blue-200'
                            : inc.status === 'DISPATCHED'
                            ? 'bg-amber-500 hover:bg-amber-400 text-white border-amber-600 shadow-amber-200'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-600 shadow-emerald-200'
                        }`}
                      >
                        {inc.status === 'REPORTED' && <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />}
                        {inc.status === 'REPORTED'
                          ? 'DISPATCH'
                          : inc.status === 'DISPATCHED'
                          ? 'MARK ON-SITE'
                          : 'RESOLVE'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
