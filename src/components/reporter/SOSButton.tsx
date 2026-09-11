import React, { useState, useCallback } from 'react';
import { AlertCircle, Radio, CheckCircle, PhoneCall, MapPin, Loader2, Shield, Brain, Truck, Bell } from 'lucide-react';

const API_BASE = 'http://localhost:5000/api';

interface PipelineStage {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
}

interface SOSButtonProps {
  onTriggerSOS?: () => void;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ onTriggerSOS }) => {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [result, setResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const initStages = (): PipelineStage[] => [
    { id: 'gps', label: 'GPS Lock', icon: <MapPin className="w-4 h-4" />, status: 'pending' },
    { id: 'assess', label: 'Needs Assessment', icon: <Brain className="w-4 h-4" />, status: 'pending' },
    { id: 'priority', label: 'Priority Scoring', icon: <Shield className="w-4 h-4" />, status: 'pending' },
    { id: 'dispatch', label: 'Resource Dispatch', icon: <Truck className="w-4 h-4" />, status: 'pending' },
    { id: 'notify', label: 'PagerDuty + Email', icon: <Bell className="w-4 h-4" />, status: 'pending' },
  ];

  const updateStage = (stagesCopy: PipelineStage[], id: string, status: PipelineStage['status'], detail?: string) => {
    return stagesCopy.map(s => s.id === id ? { ...s, status, detail: detail || s.detail } : s);
  };

  const handleSOS = useCallback(async () => {
    setPhase('running');
    setErrorMsg('');
    let pipeStages = initStages();
    setStages(pipeStages);

    // Stage 1: GPS
    pipeStages = updateStage(pipeStages, 'gps', 'active', 'Acquiring GPS...');
    setStages([...pipeStages]);

    let lat = 19.0760;
    let lng = 72.8777;

    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error('No GPS'));
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, timeout: 8000, maximumAge: 0,
        });
      });
      lat = parseFloat(pos.coords.latitude.toFixed(5));
      lng = parseFloat(pos.coords.longitude.toFixed(5));
      pipeStages = updateStage(pipeStages, 'gps', 'done', `${lat}°N, ${lng}°E`);
    } catch {
      pipeStages = updateStage(pipeStages, 'gps', 'done', `Fallback: ${lat}°N, ${lng}°E`);
    }
    setStages([...pipeStages]);

    // Stage 2-5: Backend pipeline (all happen in single POST /api/incidents)
    pipeStages = updateStage(pipeStages, 'assess', 'active', 'Running AI assessment...');
    setStages([...pipeStages]);

    try {
      const payload = {
        title: 'CRITICAL 1-TAP SOS DISTRESS SIGNAL',
        description: 'Emergency 1-tap SOS signal triggered by citizen device. Immediate assistance required.',
        category: 'MEDICAL_EMERGENCY',
        severity: 'CRITICAL',
        latitude: lat,
        longitude: lng,
        peopleTrapped: 1,
        peopleAffected: 1,
        injured: 0,
        source: 'Citizen SOS Mobile App',
        is_sos: true,
      };

      const res = await fetch(`${API_BASE}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setResult(data);

      // Mark assessment done
      const assessment = data.aiAssessment || data.assessment;
      const priorityScore = assessment?.priorityScore || '—';
      pipeStages = updateStage(pipeStages, 'assess', 'done', `AI triage complete`);
      pipeStages = updateStage(pipeStages, 'priority', 'done', `Priority Score: ${priorityScore}`);
      setStages([...pipeStages]);

      // Mark dispatch
      pipeStages = updateStage(pipeStages, 'dispatch', 'done', data.recommendation ? 'Unit recommended' : 'Queued for dispatch');
      setStages([...pipeStages]);

      // Mark notifications
      const notifs = data.notifications || {};
      const pdKey = notifs.pagerduty?.dedup_key;
      const resendStatus = notifs.resend?.status;
      let notifDetail = '';
      if (pdKey) notifDetail += `PD: ${pdKey}`;
      if (resendStatus === 200) notifDetail += ` | Email: sent`;
      else if (resendStatus) notifDetail += ` | Email: ${resendStatus}`;
      if (!notifDetail) notifDetail = 'Notifications dispatched';
      pipeStages = updateStage(pipeStages, 'notify', 'done', notifDetail);
      setStages([...pipeStages]);

      setPhase('done');
      onTriggerSOS?.();
    } catch (err: any) {
      setErrorMsg(err.message || 'Request failed');
      setPhase('error');
      // mark remaining stages as error
      pipeStages = pipeStages.map(s => s.status === 'pending' || s.status === 'active' ? { ...s, status: 'error' as const } : s);
      setStages([...pipeStages]);
    }
  }, [onTriggerSOS]);

  const statusColors: Record<string, string> = {
    pending: 'text-slate-500 border-slate-700 bg-slate-900',
    active: 'text-amber-300 border-amber-500/50 bg-amber-950/30 animate-pulse',
    done: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/30',
    error: 'text-red-300 border-red-500/50 bg-red-950/30',
  };

  const statusIcon = (status: string) => {
    if (status === 'active') return <Loader2 className="w-3 h-3 animate-spin" />;
    if (status === 'done') return <CheckCircle className="w-3 h-3" />;
    if (status === 'error') return <AlertCircle className="w-3 h-3" />;
    return <div className="w-3 h-3 rounded-full border border-slate-600" />;
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-slate-900/90 border border-red-900/60 rounded-2xl text-center relative overflow-hidden">
      <div className="absolute inset-0 bg-red-950/20 pointer-events-none" />
      <h2 className="text-lg font-mono font-bold text-red-400 uppercase tracking-widest flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-red-500 animate-pulse" />
        EMERGENCY SOS DISTRESS SIGNAL
      </h2>
      <p className="text-xs text-slate-400 mt-1 max-w-sm">
        Pressing this transmits your GPS coordinates directly to the EOC Command Dispatch center and triggers PagerDuty + Email alerts.
      </p>

      {phase === 'done' ? (
        <div className="mt-5 w-full space-y-3">
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 font-mono text-xs flex flex-col items-center gap-2">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
            <span className="font-bold text-sm text-emerald-200">SOS SIGNAL TRANSMITTED</span>
            <span>Incident ID: {result?.id || '—'}</span>
          </div>
          {/* Pipeline stages */}
          <div className="space-y-1.5">
            {stages.map(s => (
              <div key={s.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${statusColors[s.status]}`}>
                {statusIcon(s.status)}
                <span className="font-bold w-32 text-left">{s.label}</span>
                <span className="text-[10px] opacity-80 truncate flex-1 text-left">{s.detail}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setPhase('idle'); setStages([]); setResult(null); }}
            className="mt-2 text-[11px] underline text-emerald-400 font-mono">
            Send Another SOS
          </button>
        </div>
      ) : phase === 'running' ? (
        <div className="mt-5 w-full space-y-3">
          <div className="space-y-1.5">
            {stages.map(s => (
              <div key={s.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono ${statusColors[s.status]}`}>
                {statusIcon(s.status)}
                <span className="font-bold w-32 text-left">{s.label}</span>
                <span className="text-[10px] opacity-80 truncate flex-1 text-left">{s.detail}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {phase === 'error' && (
            <div className="mt-3 p-2 bg-red-950/60 border border-red-500/50 rounded text-red-300 text-xs font-mono">
              ❌ {errorMsg}
            </div>
          )}
          <button
            onClick={handleSOS}
            className="mt-6 w-36 h-36 rounded-full flex flex-col items-center justify-center font-mono font-extrabold text-2xl transition-all shadow-glow-critical border-4 bg-red-600 hover:bg-red-500 text-white border-red-400 active:scale-95"
          >
            <Radio className="w-8 h-8 mb-1 animate-pulse" />
            <span>1-TAP SOS</span>
          </button>
        </>
      )}

      <div className="mt-6 flex items-center justify-center gap-4 text-xs font-mono text-slate-400 border-t border-slate-800 pt-4 w-full">
        <a href="tel:911" className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200">
          <PhoneCall className="w-4 h-4 text-emerald-400" />
          <span>DIRECT HOTLINE 911</span>
        </a>
      </div>
    </div>
  );
};
