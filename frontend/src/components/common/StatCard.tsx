import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  accentColor?: 'red' | 'orange' | 'yellow' | 'cyan' | 'emerald' | 'blue';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accentColor = 'cyan',
}) => {
  const colorStyles = {
    red: {
      card: 'border-red-200 bg-white hover:border-red-400 hover:shadow-badge-fire',
      badge: 'bg-red-500 text-white border-2 border-red-600 shadow-sm',
      value: 'text-red-600',
      pill: 'bg-red-50 text-red-700 border border-red-200',
    },
    orange: {
      card: 'border-amber-200 bg-white hover:border-amber-400 hover:shadow-badge-electric',
      badge: 'bg-amber-500 text-white border-2 border-amber-600 shadow-sm',
      value: 'text-amber-700',
      pill: 'bg-amber-50 text-amber-800 border border-amber-200',
    },
    yellow: {
      card: 'border-yellow-200 bg-white hover:border-yellow-400 hover:shadow-badge-electric',
      badge: 'bg-yellow-400 text-slate-900 border-2 border-yellow-500 shadow-sm',
      value: 'text-yellow-700',
      pill: 'bg-yellow-50 text-yellow-800 border border-yellow-200',
    },
    cyan: {
      card: 'border-blue-200 bg-white hover:border-blue-400 hover:shadow-badge-water',
      badge: 'bg-blue-500 text-white border-2 border-blue-600 shadow-sm',
      value: 'text-blue-600',
      pill: 'bg-blue-50 text-blue-800 border border-blue-200',
    },
    emerald: {
      card: 'border-emerald-200 bg-white hover:border-emerald-400 hover:shadow-badge-grass',
      badge: 'bg-emerald-500 text-white border-2 border-emerald-600 shadow-sm',
      value: 'text-emerald-600',
      pill: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    },
    blue: {
      card: 'border-indigo-200 bg-white hover:border-indigo-400 hover:shadow-badge-water',
      badge: 'bg-indigo-500 text-white border-2 border-indigo-600 shadow-sm',
      value: 'text-indigo-600',
      pill: 'bg-indigo-50 text-indigo-800 border border-indigo-200',
    },
  }[accentColor];

  return (
    <div
      className={`border-2 rounded-2xl p-4 transition-all duration-200 shadow-sm hover:scale-[1.02] ${colorStyles.card}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-display font-extrabold uppercase tracking-wider text-slate-600">
          {title}
        </span>
        <div className={`p-2.5 rounded-2xl ${colorStyles.badge}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-2 flex items-baseline justify-between">
        <span className={`text-3xl font-display font-black tracking-tight ${colorStyles.value}`}>
          {value}
        </span>
        {trend && (
          <span
            className={`text-xs font-sans font-bold px-2.5 py-1 rounded-full border ${
              trend.isPositive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-red-50 text-red-700 border-red-300'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-1.5 font-medium font-sans flex items-center gap-1">
          {subtitle}
        </p>
      )}
    </div>
  );
};
