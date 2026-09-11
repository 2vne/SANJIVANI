import React from 'react';
import { SeverityLevel } from '../../types';
import { SEVERITY_COLORS } from '../../utils/constants';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  size?: 'sm' | 'md' | 'lg';
  animate?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  animate = true,
}) => {
  const styles = SEVERITY_COLORS[severity];

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-display font-black tracking-wide',
    md: 'text-xs px-3 py-1 font-display font-black tracking-wide',
    lg: 'text-sm px-4 py-1.5 font-display font-black tracking-wider',
  }[size];

  const typeMeta = {
    CRITICAL: { label: 'CRITICAL', typeTag: 'FIRE', dot: 'bg-red-500', badgeClass: 'bg-red-100 text-red-700 border-red-400 shadow-badge-fire' },
    HIGH: { label: 'HIGH', typeTag: 'ELECTRIC', dot: 'bg-amber-500', badgeClass: 'bg-amber-100 text-amber-800 border-amber-400 shadow-badge-electric' },
    MEDIUM: { label: 'MEDIUM', typeTag: 'GRASS', dot: 'bg-emerald-500', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-400 shadow-badge-grass' },
    LOW: { label: 'LOW', typeTag: 'WATER', dot: 'bg-blue-100 text-blue-800 border-blue-400', badgeClass: 'bg-blue-100 text-blue-800 border-blue-400 shadow-badge-water' },
  }[severity];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full uppercase border-2 shadow-sm ${typeMeta.badgeClass} ${sizeClasses} ${
        severity === 'CRITICAL' && animate ? 'animate-pulse' : ''
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          severity === 'CRITICAL'
            ? 'bg-red-500 animate-ping'
            : severity === 'HIGH'
            ? 'bg-amber-500'
            : severity === 'MEDIUM'
            ? 'bg-emerald-500'
            : 'bg-blue-500'
        }`}
      />
      <span>{severity}</span>
    </span>
  );
};
