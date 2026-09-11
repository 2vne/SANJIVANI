import React from 'react';

export type StatusVariant = 'online' | 'active' | 'warning' | 'danger' | 'offline';

interface StatusIndicatorProps {
  status: StatusVariant;
  label?: string;
  pulse?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  pulse = true,
}) => {
  const colors: Record<StatusVariant, { dot: string; text: string; bg: string; border: string }> = {
    online: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
    active: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-300' },
    warning: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300' },
    danger: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-300' },
    offline: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-300' },
  };

  const style = colors[status];

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${style.bg} ${style.border}`}>
      <span className="relative flex h-2.5 w-2.5">
        {pulse && status !== 'offline' && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${style.dot}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${style.dot}`} />
      </span>
      {label && <span className={`text-xs font-display font-bold ${style.text}`}>{label}</span>}
    </div>
  );
};
