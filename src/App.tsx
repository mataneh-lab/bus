import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Bus, MapPin, Navigation, Clock, Activity, Users, Shield, Zap, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Fix Leaflet icon issue
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Constants & Data ---

const KAOHSIUNG_CENTER: [number, number] = [22.6273, 120.3014];

const LANDMARKS = [
  { name: "Kaohsiung Main Station", pos: [22.6396, 120.3021] as [number, number], color: "blue" },
  { name: "Pier-2 Art Center", pos: [22.6200, 120.2830] as [number, number], color: "purple" },
  { name: "Lotus Pond", pos: [22.6844, 120.2974] as [number, number], color: "green" },
  { name: "Dream Mall", pos: [22.5952, 120.3069] as [number, number], color: "orange" },
  { name: "85 Sky Tower", pos: [22.6117, 120.3003] as [number, number], color: "red" },
  { name: "Formosa Boulevard", pos: [22.6315, 120.3019] as [number, number], color: "blue" },
];

// Define some routes
const ROUTES = [
  { id: "248", name: "Station - Pier 2", color: "#2563eb", points: [[22.6396, 120.3021], [22.6315, 120.3019], [22.6277, 120.2947], [22.6231, 120.2868], [22.6200, 120.2830]] },
  { id: "301", name: "Station - Lotus Pond", color: "#059669", points: [[22.6396, 120.3021], [22.6500, 120.3100], [22.6650, 120.3050], [22.6750, 120.2950], [22.6844, 120.2974]] },
  { id: "168", name: "Ring Route East", color: "#db2777", points: [[22.6396, 120.3021], [22.6350, 120.3200], [22.6200, 120.3300], [22.6050, 120.3200], [22.5952, 120.3069]] },
  { id: "70", name: "Station - 85 Sky Tower", color: "#ea580c", points: [[22.6396, 120.3021], [22.6315, 120.3019], [22.6200, 120.3020], [22.6117, 120.3003]] },
];

interface BusData {
  id: string;
  routeId: string;
  progress: number; // 0-100
  speed: number;
  occupancy: number; // 0-100%
  lastUpdate: string;
}

// Custom Bus Icon
const createBusIcon = (color: string) => L.divIcon({
  className: 'custom-bus-icon',
  html: `<div style="background-color: ${color}" class="p-2 rounded-full border-2 border-white shadow-lg text-white transition-all transform hover:scale-110 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6v6"/><path d="M15 6v6"/><path d="M2 12h19.6"/><path d="M18 18h3s1-1 1-2V7s0-1-1-1h-3"/><path d="M14 18h4"/><path d="M10 18h4"/><path d="M6 18h4"/><path d="M2 18h4"/><path d="M2 17V7s0-1 1-1h3"/><path d="M10 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/><path d="M18 22a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>
        </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});


// Helper component to fix Leaflet size and handle centering
function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  
  useEffect(() => {
    map.setView(center);
  }, [center, map]);

  // Fix for map tiles not loading correctly on initialization
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize();
    }, 200);
  }, [map]);

  return null;
}

export default function App() {
  const [buses, setBuses] = useState<BusData[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);

  // Initialize buses
  useEffect(() => {
    const initialBuses: BusData[] = [
      { id: "B-201", routeId: "248", progress: 10, speed: 30, occupancy: 45, lastUpdate: "Just now" },
      { id: "B-202", routeId: "248", progress: 60, speed: 35, occupancy: 80, lastUpdate: "1m ago" },
      { id: "B-301", routeId: "301", progress: 25, speed: 40, occupancy: 20, lastUpdate: "Just now" },
      { id: "B-302", routeId: "301", progress: 85, speed: 25, occupancy: 95, lastUpdate: "2m ago" },
      { id: "B-168", routeId: "168", progress: 40, speed: 50, occupancy: 10, lastUpdate: "Just now" },
      { id: "B-701", routeId: "70", progress: 15, speed: 28, occupancy: 60, lastUpdate: "Just now" },
      { id: "B-702", routeId: "70", progress: 75, speed: 32, occupancy: 40, lastUpdate: "Just now" },
    ];
    setBuses(initialBuses);
  }, []);

  // Simulation effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLive) {
      interval = setInterval(() => {
        setBuses((prevBuses) => 
          prevBuses.map(bus => ({
            ...bus,
            progress: (bus.progress + 0.1 * (bus.speed / 20)) % 100,
            speed: Math.max(10, Math.min(60, bus.speed + (Math.random() - 0.5) * 5))
          }))
        );
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const getBusPosition = (routeId: string, progress: number): [number, number] => {
    const route = ROUTES.find(r => r.id === routeId);
    if (!route) return KAOHSIUNG_CENTER;
    
    const points = route.points;
    const totalSegments = points.length - 1;
    const progressPerSegment = 100 / totalSegments;
    const currentSegmentIndex = Math.min(
      Math.floor(progress / progressPerSegment),
      totalSegments - 1
    );
    
    const start = points[currentSegmentIndex];
    const end = points[currentSegmentIndex + 1];
    
    const segmentProgress = (progress % progressPerSegment) / progressPerSegment;
    
    return [
      start[0] + (end[0] - start[0]) * segmentProgress,
      start[1] + (end[1] - start[1]) * segmentProgress
    ] as [number, number];
  };

  const filteredBuses = buses.filter(bus => 
    bus.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    bus.routeId.includes(searchQuery)
  );

  const selectedBus = useMemo(() => 
    buses.find(b => b.id === selectedBusId), 
  [buses, selectedBusId]);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar - Transit Control Center */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col shadow-2xl z-20">
        <div className="p-6 bg-slate-900 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">KMRT Operations</h1>
              <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mt-1">Live Fleet Tracking</p>
            </div>
            <div className="bg-blue-600 p-2 rounded-xl">
              <Activity className="w-5 h-5 animate-pulse text-white" />
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search Bus ID or Route..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-px bg-slate-100 border-b border-slate-100">
          <div className="bg-white p-4 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Active Fleet</span>
            <span className="text-2xl font-black text-slate-800 tracking-tighter">{buses.length}</span>
          </div>
          <div className="bg-white p-4 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">Avg Load</span>
            <span className="text-2xl font-black text-blue-600 tracking-tighter">62%</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          <AnimatePresence mode="popLayout">
            {filteredBuses.map((bus) => {
              const route = ROUTES.find(r => r.id === bus.routeId);
              const isSelected = selectedBusId === bus.id;
              
              return (
                <motion.div
                  layout
                  key={bus.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedBusId(bus.id)}
                  className={cn(
                    "p-4 rounded-2xl border transition-all cursor-pointer group shadow-sm",
                    isSelected 
                      ? "bg-white border-blue-500 ring-2 ring-blue-500/10 scale-[1.02]" 
                      : "bg-white border-slate-100 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                       <div 
                        className="w-10 h-6 rounded flex items-center justify-center text-[10px] font-black text-white"
                        style={{ backgroundColor: route?.color }}
                      >
                        {bus.routeId}
                      </div>
                      <span className="text-sm font-bold text-slate-800">{bus.id}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium">{bus.lastUpdate}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        {route?.name}
                      </p>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-orange-500" />
                        {Math.round(bus.speed)} km/h
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1 justify-end">
                        <Users className={cn("w-3 h-3", bus.occupancy > 80 ? "text-red-500" : "text-slate-400")} />
                        <span className="text-xs font-bold text-slate-700">{bus.occupancy}%</span>
                      </div>
                      <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden ml-auto">
                        <div 
                          className={cn("h-full transition-all duration-500", bus.occupancy > 80 ? "bg-red-500" : "bg-green-500")}
                          style={{ width: `${bus.occupancy}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="p-4 bg-white border-t border-slate-100">
           <button 
            onClick={() => setIsLive(!isLive)}
            className={cn(
              "w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95",
              isLive ? "bg-red-50 text-red-600 border border-red-100" : "bg-blue-600 text-white"
            )}
          >
            {isLive ? (
              <><Activity className="w-4 h-4" /> Pause Ops</>
            ) : (
              <><Zap className="w-4 h-4" /> Resume Ops</>
            )}
          </button>
        </div>
      </div>

      {/* Map Content */}
      <div className="flex-1 relative">
        <MapContainer 
          center={KAOHSIUNG_CENTER} 
          zoom={13} 
          className="h-full w-full"
          zoomControl={false}
        >
          <MapController center={selectedBus ? getBusPosition(selectedBus.routeId, selectedBus.progress) : KAOHSIUNG_CENTER} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          {/* Draw all routes with light opacity */}
          {ROUTES.map(route => (
            <Polyline 
              key={route.id}
              positions={route.points as [number, number][]}
              color={route.color}
              weight={4}
              opacity={0.15}
            />
          ))}

          {/* Highlight Selected Route */}
          {selectedBus && (
            <Polyline 
              positions={ROUTES.find(r => r.id === selectedBus.routeId)?.points as [number, number][]}
              color={ROUTES.find(r => r.id === selectedBus.routeId)?.color}
              weight={6}
              opacity={0.8}
              dashArray="10, 10"
              className="animate-pulse"
            />
          )}

          {/* Landmarks */}
          {LANDMARKS.map(lm => (
             <Marker key={lm.name} position={lm.pos}>
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-slate-900">{lm.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black">Transport Hub</p>
                  </div>
                </Popup>
             </Marker>
          ))}

          {/* Buses */}
          {buses.map(bus => {
            const pos = getBusPosition(bus.routeId, bus.progress);
            const route = ROUTES.find(r => r.id === bus.routeId);
            
            return (
              <Marker 
                key={bus.id} 
                position={pos} 
                icon={createBusIcon(route?.color || "#000")}
                eventHandlers={{
                  click: () => setSelectedBusId(bus.id)
                }}
              >
                <Popup className="bus-popup">
                  <div className="p-2 min-w-[120px]">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-xs font-black text-slate-800">{bus.id}</span>
                       <div 
                        className="px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase"
                        style={{ backgroundColor: route?.color }}
                      >
                        {bus.routeId}
                      </div>
                    </div>
                    <div className="space-y-1 border-t border-slate-100 pt-2">
                      <p className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>Load:</span>
                        <span className={cn("font-bold", bus.occupancy > 80 ? "text-red-500" : "text-green-600")}>
                          {bus.occupancy}%
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center justify-between">
                        <span>Speed:</span>
                        <span className="font-bold text-slate-700">{Math.round(bus.speed)} km/h</span>
                      </p>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>

        {/* Global Monitor Overlay */}
        <div className="absolute top-6 right-6 z-30 flex flex-col gap-3 pointer-events-none">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 pointer-events-auto">
            <h4 className="text-[10px] font-black uppercase tracking-tighter text-blue-400 mb-3 flex items-center gap-2">
              <Shield className="w-3 h-3" /> System Health
            </h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span>Network Latency</span>
                  <span className="text-green-400">12ms</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-green-400 w-1/12" />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1">
                  <span>GPS Precision</span>
                  <span className="text-blue-400">±2.4m</span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
