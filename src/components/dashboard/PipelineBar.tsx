import React from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

export interface PipelineStep {
  id: string;
  label: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: '01', label: 'Initial Situation' },
  { id: '02', label: 'SOS Received' },
  { id: '03', label: 'AI Assessment' },
  { id: '04', label: 'Severity Recalculated' },
  { id: '05', label: 'Resources Reallocated' },
  { id: '06', label: 'ETA Updated' },
  { id: '07', label: 'Citizen Updated' },
  { id: '08', label: 'Audit Recorded' },
];

interface PipelineBarProps {
  currentStepIndex: number;
}

export const PipelineBar: React.FC<PipelineBarProps> = ({ currentStepIndex }) => {
  return (
    <div className="w-full bg-white border-2 border-slate-200 p-2.5 rounded-2xl shadow-sm flex items-center justify-between gap-2 overflow-x-auto font-display select-none">
      {PIPELINE_STEPS.map((step, idx) => {
        const isActive = idx === currentStepIndex;
        const isDone = idx < currentStepIndex;

        return (
          <div
            key={step.id}
            className={`flex-1 min-w-[105px] sm:min-w-[125px] px-3 py-2 rounded-xl border-2 transition-all duration-300 flex flex-col justify-between ${
              isActive
                ? 'bg-[#DC0A2D] text-white border-[#89061C] shadow-md shadow-red-200 scale-[1.03] z-10'
                : isDone
                ? 'bg-red-50/80 border-red-200 text-red-800'
                : 'bg-slate-50/90 border-slate-200 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <span
                className={`text-[11px] font-black font-mono tracking-wider ${
                  isActive ? 'text-[#FFCB05]' : isDone ? 'text-red-600 font-bold' : 'text-slate-400'
                }`}
              >
                {step.id}
              </span>
              {isActive && <Loader2 className="w-3 h-3 text-[#FFCB05] animate-spin" />}
              {isDone && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
            </div>
            <span
              className={`font-sans text-[11px] leading-tight tracking-tight mt-1 truncate ${
                isActive
                  ? 'font-black text-white'
                  : isDone
                  ? 'font-bold text-slate-800'
                  : 'font-semibold text-slate-500'
              }`}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
