import React, { useEffect, useState } from 'react';
import { apiService } from '../services/apiService';
import { IncidentTrendChart } from '../components/analytics/IncidentTrendChart';
import { ResourceDistChart } from '../components/analytics/ResourceDistChart';
import { BarChart3, Activity, ShieldCheck, Clock, Users, RefreshCw } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadAnalytics = async () => {
    setLoading(true);
    const data = await apiService.fetchAnalytics();
    setAnalytics(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  const summary = analytics?.summary;

  return (
    <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-5">
      {/* Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-slate-200 p-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-100 text-purple-700 border-2 border-purple-200 shadow-sm">
            <BarChart3 className="w-6 h-6 text-purple-700" />
          </div>
          <div>
            <h1 className="text-xl font-display font-black text-slate-900 flex items-center gap-2 tracking-wide">
              DISASTER TELEMETRY & PREDICTIVE ANALYTICS
            </h1>
            <p className="text-xs font-sans font-semibold text-slate-500 mt-0.5">
              Real-time incident density, casualty escalation rates, and logistics bottleneck analysis.
            </p>
          </div>
        </div>

        <button
          onClick={loadAnalytics}
          className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-display font-black rounded-xl border-2 border-red-700 shadow-sm text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>RE-SYNC TELEMETRY</span>
        </button>
      </div>

      {/* Primary Backend Analytics Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Incidents */}
        <div className="p-5 bg-gradient-to-b from-red-50/40 to-white border-2 border-red-200 hover:border-red-400 rounded-2xl space-y-2 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-display font-black text-red-700 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-red-600" />
              TOTAL INCIDENTS
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-black bg-red-100 text-red-700 border border-red-300">
              ACTIVE
            </span>
          </div>
          <div className="text-3xl font-display font-black text-slate-900">
            {loading ? '...' : summary?.totalIncidents ?? 0}
          </div>
          <p className="text-xs font-sans font-semibold text-red-600/90 flex items-center gap-1">
            <span>🔥 {summary?.criticalIncidents ?? 0} Critical Emergencies</span>
          </p>
        </div>

        {/* Avg Response ETA */}
        <div className="p-5 bg-gradient-to-b from-blue-50/40 to-white border-2 border-blue-200 hover:border-blue-400 rounded-2xl space-y-2 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-display font-black text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              AVG RESPONSE ETA
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-black bg-blue-100 text-blue-700 border border-blue-300">
              FAST
            </span>
          </div>
          <div className="text-3xl font-display font-black text-blue-700">
            {loading ? '...' : `${summary?.avgResponseEta ?? 4.2} Min`}
          </div>
          <p className="text-xs font-sans font-semibold text-slate-500">
            TomTom & OSRM Dynamic Routing
          </p>
        </div>

        {/* Resource Utilization */}
        <div className="p-5 bg-gradient-to-b from-emerald-50/40 to-white border-2 border-emerald-200 hover:border-emerald-400 rounded-2xl space-y-2 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-display font-black text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              RESOURCE UTILIZATION
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-black bg-emerald-100 text-emerald-700 border border-emerald-300">
              FLEET
            </span>
          </div>
          <div className="text-3xl font-display font-black text-emerald-700">
            {loading ? '...' : `${summary?.dispatchedResources ?? 0} / ${summary?.totalResources ?? 0}`}
          </div>
          <p className="text-xs font-sans font-semibold text-slate-500">
            Active EN_ROUTE & ON_SITE units
          </p>
        </div>

        {/* Shelter Occupancy */}
        <div className="p-5 bg-gradient-to-b from-amber-50/40 to-white border-2 border-amber-200 hover:border-amber-400 rounded-2xl space-y-2 shadow-sm transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-display font-black text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-600" />
              SHELTER OCCUPANCY
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-display font-black bg-amber-100 text-amber-800 border border-amber-300">
              CAPACITY
            </span>
          </div>
          <div className="text-3xl font-display font-black text-amber-600">
            {loading ? '...' : `${summary?.shelterOccupancyPct ?? 0}%`}
          </div>
          <p className="text-xs font-sans font-semibold text-slate-500">
            {summary?.totalShelterOccupancy ?? 0} / {summary?.totalShelterCapacity ?? 0} Beds Occupied
          </p>
        </div>
      </div>

      {/* Dynamic Backend Recharts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <IncidentTrendChart data={analytics?.incidentTrend} />
        <ResourceDistChart data={analytics?.resourceDistChartData} />
      </div>
    </div>
  );
};
