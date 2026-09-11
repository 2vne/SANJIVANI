import React, { useState } from 'react';
import { useIncidents } from '../hooks/useIncidents';
import { useShelters } from '../hooks/useShelters';
import { SOSButton } from '../components/reporter/SOSButton';
import { IncidentForm } from '../components/reporter/IncidentForm';
import { SafeCheckin } from '../components/reporter/SafeCheckin';
import { NearbyShelters } from '../components/reporter/NearbyShelters';
import { ShieldAlert, Send, UserCheck, Home, Zap } from 'lucide-react';

export const ReporterPage: React.FC = () => {
  const { addIncident } = useIncidents();
  const { shelters } = useShelters();
  const [activeTab, setActiveTab] = useState<'SOS' | 'REPORT' | 'SAFE' | 'SHELTERS'>('SOS');

  const handleSOS = () => {
    addIncident({
      title: 'CRITICAL 1-TAP SOS DISTRESS SIGNAL',
      category: 'MEDICAL_EMERGENCY',
      severity: 'CRITICAL',
      status: 'REPORTED',
      location: {
        lat: 19.0760,
        lng: 72.8777,
        address: 'GPS Auto-Detected Distress Location',
        zone: 'Metro Sector',
      },
      reportedBy: 'Citizen SOS Mobile App',
      strandedCount: 1,
      injuredCount: 0,
      urgentNeeds: ['EVACUATION', 'PARAMEDIC'],
      description: 'Emergency 1-tap SOS signal triggered by citizen device.',
    });
  };

  const handleFormReport = (data: {
    title: string;
    category: any;
    severity: any;
    address: string;
    lat: number;
    lng: number;
    zone?: string;
    strandedCount: number;
    injuredCount: number;
    urgentNeeds: string[];
    description: string;
  }) => {
    addIncident({
      title: data.title,
      category: data.category,
      severity: data.severity,
      status: 'REPORTED',
      location: {
        lat: data.lat,
        lng: data.lng,
        address: data.address,
        zone: data.zone || 'Field Zone',
      },
      reportedBy: 'Citizen Field Report',
      strandedCount: data.strandedCount,
      injuredCount: data.injuredCount,
      urgentNeeds: data.urgentNeeds,
      description: data.description,
    });
  };

  return (
    <div className="flex-1 p-4 max-w-xl mx-auto w-full space-y-5">
      {/* Header Info */}
      <div className="text-center space-y-2 bg-white border-2 border-slate-200 p-5 rounded-2xl shadow-sm">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-300 font-display font-black text-xs uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5 fill-red-500 text-red-600" />
          <span>CITIZEN DISASTER RESCUE PORTAL</span>
        </div>
        <h1 className="text-2xl font-display font-black text-slate-900">
          Emergency Field Response Hub
        </h1>
        <p className="text-xs font-sans font-medium text-slate-500">
          Request immediate rescue, file disaster incident reports, mark safety, or locate nearby safe havens.
        </p>
      </div>

      {/* Mobile Navigation Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1.5 bg-white border-2 border-slate-200 rounded-2xl shadow-sm">
        <button
          onClick={() => setActiveTab('SOS')}
          className={`py-2.5 rounded-xl flex flex-col items-center gap-1 font-display font-black text-xs transition-all active:scale-95 ${
            activeTab === 'SOS'
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-sm border border-red-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>1-TAP SOS</span>
        </button>

        <button
          onClick={() => setActiveTab('REPORT')}
          className={`py-2.5 rounded-xl flex flex-col items-center gap-1 font-display font-black text-xs transition-all active:scale-95 ${
            activeTab === 'REPORT'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-sm border border-blue-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Send className="w-4 h-4" />
          <span>REPORT</span>
        </button>

        <button
          onClick={() => setActiveTab('SAFE')}
          className={`py-2.5 rounded-xl flex flex-col items-center gap-1 font-display font-black text-xs transition-all active:scale-95 ${
            activeTab === 'SAFE'
              ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-sm border border-emerald-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>MARK SAFE</span>
        </button>

        <button
          onClick={() => setActiveTab('SHELTERS')}
          className={`py-2.5 rounded-xl flex flex-col items-center gap-1 font-display font-black text-xs transition-all active:scale-95 ${
            activeTab === 'SHELTERS'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-sm border border-purple-700'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>SHELTERS</span>
        </button>
      </div>

      {/* Active Tab Component */}
      <div className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm">
        {activeTab === 'SOS' && <SOSButton onTriggerSOS={handleSOS} />}
        {activeTab === 'REPORT' && <IncidentForm onSubmitReport={handleFormReport as any} />}
        {activeTab === 'SAFE' && <SafeCheckin />}
        {activeTab === 'SHELTERS' && <NearbyShelters shelters={shelters} />}
      </div>
    </div>
  );
};
