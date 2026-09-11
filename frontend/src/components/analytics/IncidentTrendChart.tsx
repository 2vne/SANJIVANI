import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface IncidentTrendChartProps {
  data?: Array<{ time: string; critical: number; high: number; medium: number }>;
}

export const IncidentTrendChart: React.FC<IncidentTrendChartProps> = ({ data = [] }) => {
  return (
    <div className="w-full h-80 bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h4 className="text-xs font-display font-black text-slate-800 uppercase tracking-wider">
          Incident Volume & Escalation Rate (24h Telemetry)
        </h4>
        <div className="flex items-center gap-2 text-[11px] font-display font-bold">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Critical
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> High
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Medium
          </span>
        </div>
      </div>

      <div className="h-60 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="time" stroke="#64748B" fontSize={11} fontWeight={600} />
            <YAxis stroke="#64748B" fontSize={11} fontWeight={600} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderColor: '#E2E8F0',
                borderWidth: '2px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#0F172A',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              }}
            />
            <Area
              type="monotone"
              dataKey="critical"
              stroke="#EF4444"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorCritical)"
            />
            <Area
              type="monotone"
              dataKey="high"
              stroke="#F59E0B"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorHigh)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
