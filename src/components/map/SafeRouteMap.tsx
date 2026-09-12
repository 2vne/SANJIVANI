import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, ShieldAlert, Home, AlertTriangle } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon asset issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const MapController: React.FC<{ centerLat?: number; centerLng?: number; points?: [number, number][] }> = ({
    centerLat,
    centerLng,
    points,
}) => {
    const map = useMap();
    useEffect(() => {
        if (points && points.length > 1) {
            const bounds = L.latLngBounds(points.map((p) => [p[0], p[1]]));
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
        } else if (centerLat && centerLng) {
            map.flyTo([centerLat, centerLng], 14, { duration: 0.8 });
        }
    }, [centerLat, centerLng, points, map]);
    return null;
};

const createOriginIcon = () =>
    L.divIcon({
        className: 'custom-origin-icon',
        html: `
      <div style="
        width: 32px; height: 32px;
        background: #2563EB; border: 3px solid white;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(37,99,235,0.5);
      ">
        <div style="width: 10px; height: 10px; background: white; border-radius: 50%;"></div>
      </div>
    `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
    });

const createDestIcon = () =>
    L.divIcon({
        className: 'custom-dest-icon',
        html: `
      <div style="
        width: 36px; height: 36px;
        background: #10B981; border: 3px solid white;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 12px rgba(16,185,129,0.5);
      ">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        </svg>
      </div>
    `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
    });

const createZoneIcon = (severity: string) => {
    const color = severity === 'CRITICAL' || severity === 'RED' ? '#EF4444' : '#F59E0B';
    return L.divIcon({
        className: 'custom-zone-icon',
        html: `
      <div style="
        width: 28px; height: 28px;
        background: ${color}; border: 2px solid white;
        border-radius: 50%; display: flex; align-items: center; justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        </svg>
      </div>
    `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
    });
};

interface SafeRouteMapProps {
    origin: { lat: number; lng: number; address?: string };
    destination: { lat: number; lng: number; name?: string };
    activeZones: Array<{
        id: string;
        title: string;
        severity: string;
        lat: number;
        lng: number;
        radius_meters: number;
    }>;
    routePoints: [number, number][];
    escapeLegPoints?: [number, number][];
    isRerouted?: boolean;
    isOriginInDanger?: boolean;
}

export const SafeRouteMap: React.FC<SafeRouteMapProps> = ({
    origin,
    destination,
    activeZones,
    routePoints,
    escapeLegPoints,
    isRerouted,
    isOriginInDanger,
}) => {
    const centerLat = origin.lat || 18.5204;
    const centerLng = origin.lng || 73.8567;

    return (
        <div className="w-full h-[520px] rounded-2xl overflow-hidden shadow-md border-2 border-slate-200 relative bg-slate-100">
            <MapContainer
                center={[centerLat, centerLng]}
                zoom={13}
                className="w-full h-full"
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapController centerLat={centerLat} centerLng={centerLng} points={routePoints} />

                {/* Render Active Red Alert Danger Circles */}
                {activeZones.map((zone) => (
                    <React.Fragment key={zone.id}>
                        {/* Outer Danger Buffer Ring */}
                        <Circle
                            center={[zone.lat, zone.lng]}
                            radius={zone.radius_meters}
                            pathOptions={{
                                color: '#DC2626',
                                fillColor: '#EF4444',
                                fillOpacity: 0.22,
                                weight: 3,
                                dashArray: '8, 8',
                            }}
                        />
                        {/* Inner High Impact Core */}
                        <Circle
                            center={[zone.lat, zone.lng]}
                            radius={zone.radius_meters * 0.4}
                            pathOptions={{
                                color: '#B91C1C',
                                fillColor: '#991B1B',
                                fillOpacity: 0.35,
                                weight: 2,
                            }}
                        />
                        <Marker position={[zone.lat, zone.lng]} icon={createZoneIcon(zone.severity)}>
                            <Popup>
                                <div className="p-2.5 font-sans text-xs bg-slate-900 text-white rounded-xl min-w-[200px] border border-red-500 shadow-xl">
                                    <div className="flex items-center gap-1.5 text-red-400 font-display font-extrabold uppercase text-[10px] tracking-wider">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                                        <span>RED ALERT HAZARD ZONE ({zone.severity})</span>
                                    </div>
                                    <h4 className="font-display font-black text-white text-sm mt-1">{zone.title}</h4>
                                    <div className="mt-1.5 flex items-center justify-between text-[10px] font-mono text-red-200 bg-red-950/80 px-2 py-1 rounded border border-red-800">
                                        <span>DANGER RADIUS:</span>
                                        <strong className="text-yellow-300 font-black">{zone.radius_meters} meters</strong>
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    </React.Fragment>
                ))}

                {/* Escape Leg Path (If origin is inside danger zone) */}
                {escapeLegPoints && escapeLegPoints.length > 0 && (
                    <Polyline
                        positions={escapeLegPoints}
                        pathOptions={{
                            color: '#EF4444',
                            weight: 6,
                            dashArray: '6, 6',
                            opacity: 0.95,
                        }}
                    />
                )}

                {/* Main Safe Route Polyline (Glow + Blue Path) */}
                {routePoints && routePoints.length > 0 && (
                    <>
                        <Polyline
                            positions={routePoints}
                            pathOptions={{
                                color: '#1E40AF',
                                weight: 10,
                                opacity: 0.4,
                            }}
                        />
                        <Polyline
                            positions={routePoints}
                            pathOptions={{
                                color: '#2563EB',
                                weight: 6,
                                opacity: 0.95,
                                dashArray: isRerouted ? '8, 8' : undefined,
                            }}
                        />
                    </>
                )}

                {/* Origin Marker */}
                {origin.lat && (
                    <Marker position={[origin.lat, origin.lng]} icon={createOriginIcon()}>
                        <Popup>
                            <div className="p-2 font-sans text-xs bg-white text-slate-900 rounded-lg">
                                <span className="font-display font-extrabold text-blue-700 uppercase text-[10px]">Your Location</span>
                                <p className="font-bold text-slate-900">{origin.address || 'Origin Point'}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}

                {/* Destination Marker */}
                {destination.lat && (
                    <Marker position={[destination.lat, destination.lng]} icon={createDestIcon()}>
                        <Popup>
                            <div className="p-2 font-sans text-xs bg-white text-slate-900 rounded-lg">
                                <span className="font-display font-extrabold text-emerald-700 uppercase text-[10px]">Safe Haven</span>
                                <p className="font-bold text-slate-900">{destination.name || 'Destination'}</p>
                            </div>
                        </Popup>
                    </Marker>
                )}
            </MapContainer>
        </div>
    );
};
