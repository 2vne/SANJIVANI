import { SeverityLevel, IncidentCategory, ResourceCategory } from '../types';

export const MAP_DEFAULT_CENTER = {
  lat: 19.0760,
  lng: 72.8777, // Metro Disaster Zone (e.g. Mumbai Coastal Region)
  zoom: 12,
};

export const SEVERITY_COLORS: Record<SeverityLevel, { bg: string; text: string; border: string; glow: string; badge: string }> = {
  CRITICAL: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-300',
    glow: 'shadow-badge-fire',
    badge: 'bg-red-500 text-white font-bold',
  },
  HIGH: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    glow: 'shadow-badge-electric',
    badge: 'bg-amber-500 text-white font-bold',
  },
  MEDIUM: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    glow: 'shadow-badge-grass',
    badge: 'bg-emerald-500 text-white font-bold',
  },
  LOW: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300',
    glow: 'shadow-badge-water',
    badge: 'bg-blue-500 text-white font-bold',
  },
};

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  FLOOD: 'Flash Flooding',
  EARTHQUAKE: 'Seismic Impact',
  WILDFIRE: 'Wildfire Hazard',
  POWER_OUTAGE: 'Grid Collapse',
  MEDICAL_EMERGENCY: 'Mass Casualty / Medevac',
  STRUCTURAL_COLLAPSE: 'Structural Collapse',
  HAZMAT: 'Hazmat Incident',
  LANDSLIDE: 'Landslide Barrier',
};

export const RESOURCE_CATEGORY_LABELS: Record<ResourceCategory, string> = {
  MEDICAL_UNIT: 'Medevac Unit',
  SEARCH_RESCUE: 'Search & Rescue Ops',
  SUPPLY_CONVOY: 'Supply Logistics',
  HEAVY_EQUIPMENT: 'Debris Removal',
  WATER_VESSEL: 'Rescue Boat Unit',
  HELICOPTER: 'Aero-Rescue Unit',
};
