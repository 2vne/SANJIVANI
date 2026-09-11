import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ResourceDistChartProps {
  data?: Array<{ name: string; deployed: number; available: number }>;
}

export const ResourceDistChart: React.FC<ResourceDistChartProps> = ({ data = [] }) => {
  return (
    <div className="w-full h-80 bg-white border-2 border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h4 className="text-xs font-display font-black text-slate-800 uppercase tracking-wider">
          Resource Deployment vs Reserve Availability
        </h4>
        <div className="flex items-center gap-2 text-[11px] font-display font-bold">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600" /> Deployed
          </span>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600" /> Available
          </span>
        </div>
      </div>

      <div className="h-60 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="name" stroke="#64748B" fontSize={11} fontWeight={600} tickLine={false} />
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
            <Bar dataKey="deployed" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            <Bar dataKey="available" fill="#10B981" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
