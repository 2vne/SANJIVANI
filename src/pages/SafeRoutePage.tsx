import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Navigation,
    ShieldAlert,
    MapPin,
    Home,
    RefreshCw,
    Crosshair,
    Clock,
    ChevronRight,
    ShieldCheck,
    AlertOctagon,
    Search,
    Loader2,
    X,
    Building,
    CheckCircle2,
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { Shelter } from '../types';
import { SafeRouteMap } from '../components/map/SafeRouteMap';

interface PlaceResult {
    label: string;
    address: string;
    lat: number;
    lng: number;
}

export const SafeRoutePage: React.FC = () => {
    // State for Origin
    const [origin, setOrigin] = useState<{ lat: number; lng: number; address: string }>({
        lat: 18.5204,
        lng: 73.8567,
        address: 'Pune Central (Default)',
    });
    const [originQuery, setOriginQuery] = useState<string>('');
    const [originSuggestions, setOriginSuggestions] = useState<PlaceResult[]>([]);
    const [isSearchingOrigin, setIsSearchingOrigin] = useState<boolean>(false);
    const [isLocating, setIsLocating] = useState<boolean>(false);
    const [showOriginDropdown, setShowOriginDropdown] = useState<boolean>(false);

    // State for Destination
    const [destination, setDestination] = useState<{ lat: number; lng: number; name: string }>({
        lat: 18.5504,
        lng: 73.8867,
        name: 'Safe Haven Relief Center Alpha',
    });
    const [destQuery, setDestQuery] = useState<string>('');
    const [destSuggestions, setDestSuggestions] = useState<PlaceResult[]>([]);
    const [isSearchingDest, setIsSearchingDest] = useState<boolean>(false);
    const [showDestDropdown, setShowDestDropdown] = useState<boolean>(false);

    // Shelters list for quick select
    const [shelters, setShelters] = useState<Shelter[]>([]);
    const [loadingShelters, setLoadingShelters] = useState<boolean>(true);

    // Route calculation result
    const [routeResult, setRouteResult] = useState<{
        distance_km?: number;
        duration_minutes?: number;
        is_rerouted?: boolean;
        reroute_reason?: string | null;
        is_origin_in_danger?: boolean;
        danger_zone_name?: string | null;
        points?: [number, number][];
        escape_leg?: { points: [number, number][] } | null;
        active_zones?: any[];
        has_safe_route?: boolean;
        warning?: string;
    } | null>(null);

    const [calculating, setCalculating] = useState<boolean>(false);
    const [lastSyncTime, setLastSyncTime] = useState<string>('');

    const originRef = useRef<HTMLDivElement>(null);
    const destRef = useRef<HTMLDivElement>(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (originRef.current && !originRef.current.contains(e.target as Node)) {
                setShowOriginDropdown(false);
            }
            if (destRef.current && !destRef.current.contains(e.target as Node)) {
                setShowDestDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 1. Fetch Shelters
    useEffect(() => {
        async function loadShelters() {
            try {
                setLoadingShelters(true);
                const data = await apiService.fetchShelters();
                setShelters(data);
                if (data.length > 0) {
                    setDestination({
                        lat: data[0].location.lat,
                        lng: data[0].location.lng,
                        name: data[0].name,
                    });
                }
            } catch (e) {
                console.error('Error fetching shelters:', e);
            } finally {
                setLoadingShelters(false);
            }
        }
        loadShelters();
    }, []);

    // 2. Compute Route
    const fetchSafeRoute = useCallback(async () => {
        if (!origin.lat || !destination.lat) return;
        try {
            setCalculating(true);
            const data = await apiService.fetchSafeRoute(
                origin.lat,
                origin.lng,
                destination.lat,
                destination.lng
            );
            if (data) {
                setRouteResult(data);
                setLastSyncTime(new Date().toLocaleTimeString());
            }
        } catch (e) {
            console.error('Error calculating safe route:', e);
        } finally {
            setCalculating(false);
        }
    }, [origin.lat, origin.lng, destination.lat, destination.lng]);

    // Initial & Dependency Route Calculation
    useEffect(() => {
        fetchSafeRoute();
    }, [fetchSafeRoute]);

    // 30-Second Auto Refresh
    useEffect(() => {
        const interval = setInterval(() => {
            fetchSafeRoute();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchSafeRoute]);

    // Live Geocoding Search for Origin (Debounced)
    useEffect(() => {
        if (!originQuery.trim() || originQuery.length < 2) {
            setOriginSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearchingOrigin(true);
            const results = await apiService.geocodeAddress(originQuery);
            setOriginSuggestions(results);
            setIsSearchingOrigin(false);
            setShowOriginDropdown(true);
        }, 350);

        return () => clearTimeout(timer);
    }, [originQuery]);

    // Live Geocoding Search for Destination (Debounced)
    useEffect(() => {
        if (!destQuery.trim() || destQuery.length < 2) {
            setDestSuggestions([]);
            return;
        }
        const timer = setTimeout(async () => {
            setIsSearchingDest(true);
            const results = await apiService.geocodeAddress(destQuery);
            setDestSuggestions(results);
            setIsSearchingDest(false);
            setShowDestDropdown(true);
        }, 350);

        return () => clearTimeout(timer);
    }, [destQuery]);

    // Select Origin Place
    const handleSelectOrigin = (place: PlaceResult) => {
        setOrigin({
            lat: place.lat,
            lng: place.lng,
            address: place.label || place.address,
        });
        setOriginQuery(place.label);
        setShowOriginDropdown(false);
    };

    // Select Destination Place
    const handleSelectDestination = (place: PlaceResult) => {
        setDestination({
            lat: place.lat,
            lng: place.lng,
            name: place.label || place.address,
        });
        setDestQuery(place.label);
        setShowDestDropdown(false);
    };

    // Handle GPS location capture
    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return;
        }
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setOrigin({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    address: `GPS Position (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`,
                });
                setOriginQuery('GPS Position');
                setIsLocating(false);
            },
            (err) => {
                console.warn('Geolocation error:', err.message);
                alert('Could not access GPS. Please search your place name directly.');
                setIsLocating(false);
            },
            { timeout: 10000 }
        );
    };

    const isDanger = routeResult?.is_origin_in_danger;
    const isRerouted = routeResult?.is_rerouted;
    const hasSafeRoute = routeResult?.has_safe_route !== false;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-12">
            {/* Top Banner Header */}
            <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-900 text-white py-8 px-4 sm:px-6 shadow-md border-b-4 border-blue-600">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30">
                                <Navigation className="w-7 h-7 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-white flex items-center gap-2">
                                    SANJIVANI SAFE ROUTE ENGINE
                                </h1>
                                <p className="text-blue-200 text-xs sm:text-sm font-medium">
                                    Google Maps place search hazard avoidance routing & emergency evacuation assistance
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="px-3.5 py-1.5 bg-blue-950/80 border border-blue-700/60 rounded-xl text-xs font-mono text-blue-300 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-blue-400" />
                            <span>Live Sync: <strong>{lastSyncTime || 'Syncing...'}</strong></span>
                        </div>

                        <button
                            onClick={fetchSafeRoute}
                            disabled={calculating}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-display font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${calculating ? 'animate-spin' : ''}`} />
                            <span>RECALCULATE</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-6">
                {/* 1. DANGER ZONE WARNING BANNER */}
                {isDanger && (
                    <div className="p-4 rounded-2xl bg-red-600 text-white shadow-lg border-2 border-red-700 animate-pulse flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-white/20 rounded-xl shrink-0">
                                <AlertOctagon className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h3 className="font-display font-black text-lg tracking-wide uppercase">
                                    ⚠️ YOU ARE CURRENTLY INSIDE AN ACTIVE DISASTER ZONE
                                </h3>
                                <p className="text-red-100 text-xs sm:text-sm font-medium mt-0.5">
                                    Location is inside radius of <strong>{routeResult?.danger_zone_name || 'Active Emergency Zone'}</strong>.
                                    Shortest evacuation leg calculated to safety boundary. Evacuate immediately!
                                </p>
                            </div>
                        </div>
                        <div className="px-3 py-1.5 bg-white text-red-700 rounded-xl font-display font-extrabold text-xs shrink-0 shadow-sm">
                            EVACUATION MODE ACTIVE
                        </div>
                    </div>
                )}

                {/* 2. OPTIMAL SAFE ROUTE WITH BYPASSED RED HAZARDS BANNER */}
                {hasSafeRoute && !isDanger && (
                    <div className="p-4.5 rounded-2xl bg-gradient-to-r from-emerald-900 via-slate-900 to-blue-900 text-white shadow-lg border-2 border-emerald-500/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-emerald-500/20 rounded-xl border border-emerald-400/40 shrink-0">
                                <ShieldCheck className="w-7 h-7 text-emerald-400" />
                            </div>
                            <div>
                                <h4 className="font-display font-black text-base tracking-wide uppercase text-emerald-300 flex items-center gap-2">
                                    <span>🛡️ OPTIMAL SAFE ROUTE ACTIVATED</span>
                                    <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-mono">
                                        {routeResult?.active_zones?.length || 4} RED HAZARDS BYPASSED
                                    </span>
                                </h4>
                                <p className="text-slate-200 text-xs font-medium mt-0.5">
                                    {routeResult?.reroute_reason ||
                                        'SANJIVANI Safe Engine has evaluated nearby hazard sectors and verified that the selected path is 100% clear of active disaster zones.'}
                                </p>
                            </div>
                        </div>
                        <div className="px-3.5 py-2 bg-emerald-600/90 text-white rounded-xl font-display font-extrabold text-xs shrink-0 shadow-sm border border-emerald-400/50 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span>VERIFIED BEST PATH</span>
                        </div>
                    </div>
                )}

                {/* 3. NO SAFE ROUTE WARNING */}
                {!hasSafeRoute && (
                    <div className="p-4 rounded-2xl bg-slate-900 border-2 border-red-500 text-white shadow-lg flex items-center gap-3">
                        <AlertOctagon className="w-8 h-8 text-red-500 shrink-0 animate-bounce" />
                        <div>
                            <h4 className="font-display font-black text-base text-red-400 uppercase">
                                🚨 NO SAFE ROUTE CURRENTLY AVAILABLE
                            </h4>
                            <p className="text-slate-300 text-xs font-medium mt-0.5">
                                Destination or perimeter is completely surrounded by active disaster zones.
                                <strong> Shelter in place immediately and await emergency response.</strong>
                            </p>
                        </div>
                    </div>
                )}

                {/* 4. Controls & Input Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left Column: Origin & Destination Selector */}
                    <div className="lg:col-span-4 space-y-5">
                        {/* Origin Card (Google Maps Style Place Search) */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <span className="font-display font-extrabold text-xs text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                    STARTING LOCATION (ORIGIN)
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 font-bold">STEP 1</span>
                            </div>

                            {/* Display Current Origin Pin */}
                            <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 space-y-1">
                                <div className="text-[10px] font-mono text-blue-700 font-bold uppercase">Current Origin Pin</div>
                                <p className="font-display font-bold text-xs text-slate-900">{origin.address}</p>
                                <p className="text-[10px] font-mono text-slate-500">
                                    {origin.lat.toFixed(4)}, {origin.lng.toFixed(4)}
                                </p>
                            </div>

                            {/* Google Maps Style Origin Search Box */}
                            <div className="relative" ref={originRef}>
                                <label className="text-[10px] font-display font-extrabold text-slate-600 uppercase block mb-1">
                                    Search Place Name / Landmark:
                                </label>
                                <div className="relative flex items-center">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={originQuery}
                                        onChange={(e) => setOriginQuery(e.target.value)}
                                        onFocus={() => setShowOriginDropdown(true)}
                                        placeholder="Search origin e.g. Swargate, FC Road, Pune..."
                                        className="w-full pl-9 pr-8 py-2 text-xs font-display font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
                                    />
                                    {isSearchingOrigin ? (
                                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-2.5" />
                                    ) : originQuery ? (
                                        <button
                                            onClick={() => setOriginQuery('')}
                                            className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    ) : null}
                                </div>

                                {/* Auto-complete Dropdown */}
                                {showOriginDropdown && originSuggestions.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-blue-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                                        {originSuggestions.map((place, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSelectOrigin(place)}
                                                className="w-full p-2.5 text-left hover:bg-blue-50 flex items-start gap-2.5 transition-colors"
                                            >
                                                <Building className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <div className="font-display font-bold text-xs text-slate-900">{place.label}</div>
                                                    <div className="text-[10px] font-sans text-slate-500 line-clamp-1">{place.address}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* GPS Button */}
                            <button
                                type="button"
                                onClick={handleUseCurrentLocation}
                                disabled={isLocating}
                                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 border border-blue-700 text-white rounded-xl font-display font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                                <span>{isLocating ? 'CAPTURING GPS...' : 'USE MY CURRENT GPS LOCATION'}</span>
                            </button>
                        </div>

                        {/* Destination Card (Google Maps Style Place Search) */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <span className="font-display font-extrabold text-xs text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Home className="w-4 h-4 text-emerald-600" />
                                    DESTINATION (SAFE HAVEN)
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 font-bold">STEP 2</span>
                            </div>

                            {/* Selected Destination Pin */}
                            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-1">
                                <div className="text-[10px] font-mono text-emerald-700 font-bold uppercase">Selected Destination Pin</div>
                                <p className="font-display font-bold text-xs text-slate-900">{destination.name}</p>
                                <p className="text-[10px] font-mono text-slate-500">
                                    {destination.lat.toFixed(4)}, {destination.lng.toFixed(4)}
                                </p>
                            </div>

                            {/* Google Maps Style Destination Search Box */}
                            <div className="relative" ref={destRef}>
                                <label className="text-[10px] font-display font-extrabold text-slate-600 uppercase block mb-1">
                                    Search Destination Place Name / Area:
                                </label>
                                <div className="relative flex items-center">
                                    <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={destQuery}
                                        onChange={(e) => setDestQuery(e.target.value)}
                                        onFocus={() => setShowDestDropdown(true)}
                                        placeholder="Type destination e.g. Kothrud, Viman Nagar, Hospital..."
                                        className="w-full pl-9 pr-8 py-2 text-xs font-display font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50"
                                    />
                                    {isSearchingDest ? (
                                        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin absolute right-2.5" />
                                    ) : destQuery ? (
                                        <button
                                            onClick={() => setDestQuery('')}
                                            className="absolute right-2.5 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    ) : null}
                                </div>

                                {/* Auto-complete Dropdown */}
                                {showDestDropdown && destSuggestions.length > 0 && (
                                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-emerald-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                                        {destSuggestions.map((place, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSelectDestination(place)}
                                                className="w-full p-2.5 text-left hover:bg-emerald-50 flex items-start gap-2.5 transition-colors"
                                            >
                                                <Building className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                                <div>
                                                    <div className="font-display font-bold text-xs text-slate-900">{place.label}</div>
                                                    <div className="text-[10px] font-sans text-slate-500 line-clamp-1">{place.address}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Quick Select Safe Shelters */}
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <label className="text-[11px] font-display font-extrabold text-slate-700 uppercase">
                                    Quick Select Safe Shelters
                                </label>

                                {loadingShelters ? (
                                    <p className="text-xs text-slate-400 font-mono">Loading available safe havens...</p>
                                ) : (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                        {shelters.map((s) => {
                                            const isSelected = destination.name === s.name;
                                            return (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() =>
                                                        setDestination({
                                                            lat: s.location.lat,
                                                            lng: s.location.lng,
                                                            name: s.name,
                                                        })
                                                    }
                                                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${isSelected
                                                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                                                        : 'bg-slate-50 hover:bg-emerald-50/60 text-slate-800 border-slate-200'
                                                        }`}
                                                >
                                                    <div>
                                                        <div className="font-display font-bold text-xs">{s.name}</div>
                                                        <div className={`text-[10px] font-mono ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                                                            Cap: {s.currentOccupancy}/{s.capacity}
                                                        </div>
                                                    </div>
                                                    <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Interactive Map & Route Metrics */}
                    <div className="lg:col-span-8 space-y-5">
                        {/* Route Overview Metrics Bar */}
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                                <div className="text-[10px] font-mono font-extrabold text-blue-700 uppercase">TOTAL DISTANCE</div>
                                <div className="font-display font-black text-xl text-slate-900 mt-0.5">
                                    {routeResult?.distance_km ?? 0} <span className="text-xs font-normal text-slate-500">km</span>
                                </div>
                            </div>

                            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                                <div className="text-[10px] font-mono font-extrabold text-emerald-700 uppercase">ESTIMATED TIME</div>
                                <div className="font-display font-black text-xl text-slate-900 mt-0.5">
                                    {routeResult?.duration_minutes ?? 0} <span className="text-xs font-normal text-slate-500">min</span>
                                </div>
                            </div>

                            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100">
                                <div className="text-[10px] font-mono font-extrabold text-amber-700 uppercase">SAFETY REROUTE</div>
                                <div className="font-display font-black text-sm text-amber-800 mt-1 uppercase">
                                    {isRerouted ? 'DETOUR ACTIVE' : 'DIRECT PATH'}
                                </div>
                            </div>

                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <div className="text-[10px] font-mono font-extrabold text-slate-600 uppercase">ACTIVE HAZARDS</div>
                                <div className="font-display font-black text-xl text-slate-900 mt-0.5">
                                    {routeResult?.active_zones?.length ?? 0} <span className="text-xs font-normal text-slate-500">zones</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Leaflet Map */}
                        <SafeRouteMap
                            origin={origin}
                            destination={destination}
                            activeZones={routeResult?.active_zones || []}
                            routePoints={routeResult?.points || []}
                            escapeLegPoints={routeResult?.escape_leg?.points}
                            isRerouted={isRerouted}
                            isOriginInDanger={isDanger}
                        />

                        {/* Path & Hazard Breakdown Legend */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                            <h4 className="font-display font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    NAVIGATION LEGEND & ACTIVE HAZARD AVOIDANCE STATUS
                                </span>
                                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-mono font-bold">
                                    {routeResult?.active_zones?.length || 4} ACTIVE HAZARD ZONES DETECTED
                                </span>
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                                <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                                    <div className="w-6 h-1.5 bg-blue-600 rounded-full shrink-0" />
                                    <span className="text-slate-700">Optimal Safe Highway Path</span>
                                </div>

                                <div className="flex items-center gap-2 p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                                    <div className="w-6 h-1.5 bg-amber-500 rounded-full shrink-0 border border-amber-600" />
                                    <span className="text-slate-700">Hazard Avoidance Detour</span>
                                </div>

                                <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-xl border border-red-200">
                                    <div className="w-6 h-1.5 bg-red-500 rounded-full shrink-0 border border-red-600" />
                                    <span className="text-slate-700">Active Red Hazard Circle</span>
                                </div>
                            </div>

                            {/* Bypassed Red Hazards Breakdown */}
                            {routeResult?.active_zones && routeResult.active_zones.length > 0 && (
                                <div className="pt-3 border-t border-slate-100 space-y-2">
                                    <div className="text-[11px] font-display font-black text-slate-700 uppercase tracking-wide flex items-center justify-between">
                                        <span>ACTIVE RED HAZARD SECTORS DYNAMICALY BYPASSED:</span>
                                        <span className="text-[10px] text-emerald-600 font-mono">Status: 100% CLEAR OF PATH</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {routeResult.active_zones.map((zone: any, idx: number) => (
                                            <div key={idx} className="p-2.5 bg-red-50/70 border border-red-200/80 rounded-xl flex items-center justify-between">
                                                <div className="flex items-center gap-2 overflow-hidden">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse shrink-0" />
                                                    <div className="truncate">
                                                        <div className="font-display font-extrabold text-xs text-slate-900 truncate">{zone.title}</div>
                                                        <div className="text-[10px] font-mono text-red-600">Radius: {zone.radius_meters}m • {zone.severity}</div>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-display font-black shrink-0">BYPASSED</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
