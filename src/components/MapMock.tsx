import React, { useState, useEffect, useRef } from "react";
import { Navigation, MapPin, Compass, Shield, Compass as CompassIcon, ArrowUpRight, ArrowUpLeft, CornerUpRight, Map as MapIcon, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { APIProvider, Map, AdvancedMarker, Pin, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Ride } from "../types";
import { playNavSound } from "../utils/audio";

const API_KEY =
  (typeof process !== "undefined" && process?.env?.GOOGLE_MAPS_PLATFORM_KEY) ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "AIzaSyDE9EheEyyJyXCkeEnrrgPDsSoP5isoNGk";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY.trim() !== "";

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#18181b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#18181b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#71717a" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#eab308" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#a1a1aa" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#14532d" }, { opacity: 0.2 }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#15803d" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#27272a" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#09090b" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#a1a1aa" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3f3f46" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#18181b" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#eab308" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#27272a" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#eab308" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1e3a8a" }, { opacity: 0.4 }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3b82f6" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#18181b" }] }
];

interface MapMockProps {
  ride: Ride | null;
  driverOnline: boolean;
  driverLocation?: { latitude: number; longitude: number } | null;
}

// Sub-component to compute and display route polylines using modern Routes API
function RouteDisplay({ origin, destination, isPickup }: {
  origin: google.maps.LatLngLiteral;
  destination: google.maps.LatLngLiteral;
  isPickup: boolean;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");
  const polylinesRef = useRef<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!routesLib || !map || !origin || !destination) return;
    
    // Clear previous routes
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    routesLib.Route.computeRoutes({
      origin,
      destination,
      travelMode: "DRIVING",
      fields: ["path", "distanceMeters", "durationMillis", "viewport"],
    }).then(({ routes }) => {
      if (routes?.[0]) {
        const newPolylines = routes[0].createPolylines();
        newPolylines.forEach(p => {
          p.setOptions({
            strokeColor: isPickup ? "#eab308" : "#10b981",
            strokeOpacity: 0.8,
            strokeWeight: 4,
          });
          p.setMap(map);
        });
        polylinesRef.current = newPolylines;
        
        if (routes[0].viewport) {
          map.fitBounds(routes[0].viewport);
        }
      }
    }).catch(err => {
      console.warn("Routes API call error, drawing simple fallback line:", err);
      // Fallback simple direct path if API query quota is hit
      const line = new google.maps.Polyline({
        path: [origin, destination],
        geodesic: true,
        strokeColor: isPickup ? "#eab308" : "#10b981",
        strokeOpacity: 0.7,
        strokeWeight: 4,
      });
      line.setMap(map);
      polylinesRef.current = [line];
    });

    return () => {
      polylinesRef.current.forEach(p => p.setMap(null));
    };
  }, [routesLib, map, origin.lat, origin.lng, destination.lat, destination.lng, isPickup]);

  return null;
}

export default function MapMock({ ride, driverOnline, driverLocation }: MapMockProps) {
  const [progress, setProgress] = useState(0);
  const [activeInstruction, setActiveInstruction] = useState("Aguardando chamadas...");

  // Sound triggering effect
  useEffect(() => {
    if (ride && driverOnline) {
      playNavSound();
    }
  }, [activeInstruction]);

  // Handle local state tracking
  useEffect(() => {
    if (!ride) {
      setProgress(0);
      setActiveInstruction("Navegando pela cidade. Pronto para aceitar corridas!");
      return;
    }

    let interval: NodeJS.Timeout;
    const isWaitingStatus = ride.status === "waiting" || ride.status === "procurando_motorista" || ride.status === "pending";
    const isEnRouteStatus = ride.status === "accepted" || ride.status === "on_the_way" || ride.status === "motorista_a_caminho";

    if (isEnRouteStatus) {
      setProgress(0.1);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 0.45) {
            clearInterval(interval);
            return 0.45;
          }
          return prev + 0.08;
        });
      }, 2500);
    } else if (ride.status === "arrived" || ride.status === "motorista_chegou") {
      setProgress(0.5);
    } else if (ride.status === "in_progress" || ride.status === "iniciada") {
      setProgress(0.55);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 0.95) {
            clearInterval(interval);
            return 0.95;
          }
          return prev + 0.08;
        });
      }, 2500);
    } else if (ride.status === "completed" || ride.status === "finished" || ride.status === "finalizada") {
      setProgress(1.0);
    }

    return () => clearInterval(interval);
  }, [ride?.status, ride?.id]);

  // Coordinates on the SVG map (0 to 100) or real GPS offsets
  const defaultBase = { lat: -23.55052, lng: -46.633308 };
  
  const driverGPS = driverLocation 
    ? { lat: driverLocation.latitude, lng: driverLocation.longitude } 
    : defaultBase;

  // Let's create beautiful offsets for pickup/dropoff so they are visible relative to the driver,
  // but use real coordinates if they exist in the ride object for real-time tracking!
  const pickupGPS = ride?.pickupCoords 
    ? { lat: ride.pickupCoords.lat, lng: ride.pickupCoords.lng }
    : { 
        lat: driverGPS.lat + 0.005, 
        lng: driverGPS.lng - 0.004 
      };
  
  const dropoffGPS = ride?.dropoffCoords 
    ? { lat: ride.dropoffCoords.lat, lng: ride.dropoffCoords.lng }
    : { 
        lat: driverGPS.lat - 0.003, 
        lng: driverGPS.lng + 0.006 
      };

  const driverStart = { x: 15, y: 85 };
  const pickupLoc = { x: 45, y: 45 };
  const dropoffLoc = { x: 80, y: 15 };

  let currentPos = { x: 50, y: 55 };
  let distanceLeft = "";
  let etaLeft = "";
  let iconType = "straight";

  if (!driverOnline) {
    currentPos = { x: 15, y: 85 };
    distanceLeft = "-- km";
    etaLeft = "-- min";
  } else if (!ride) {
    currentPos = { x: 50, y: 55 };
    distanceLeft = "0.0 km";
    etaLeft = "Ativo";
  } else {
    const isEnRouteStatus = ride.status === "accepted" || ride.status === "on_the_way" || ride.status === "motorista_a_caminho";
    const isArrivedStatus = ride.status === "arrived" || ride.status === "motorista_chegou";
    const isInProgressStatus = ride.status === "in_progress" || ride.status === "iniciada";
    const isCompletedStatus = ride.status === "completed" || ride.status === "finished" || ride.status === "finalizada";

    if (isEnRouteStatus) {
      const ratioToPickup = progress / 0.45;
      currentPos = {
        x: driverStart.x + (pickupLoc.x - driverStart.x) * ratioToPickup,
        y: driverStart.y + (pickupLoc.y - driverStart.y) * ratioToPickup,
      };
      const dist = Math.max(0.1, (ride.distance * 0.3 * (1 - ratioToPickup)).toFixed(1) as any);
      const min = Math.max(1, Math.round(ride.distance * 1.5 * (1 - ratioToPickup)));
      distanceLeft = `${dist} km`;
      etaLeft = `${min} min`;
      
      if (ratioToPickup < 0.3) {
        iconType = "straight";
        if (activeInstruction !== `Siga na Av. Principal em direção ao embarque`) {
          setActiveInstruction(`Siga na Av. Principal em direção ao embarque`);
        }
      } else if (ratioToPickup < 0.7) {
        iconType = "left";
        if (activeInstruction !== "Curva acentuada à esquerda na Rua das Palmeiras") {
          setActiveInstruction("Curva acentuada à esquerda na Rua das Palmeiras");
        }
      } else {
        iconType = "arrive";
        if (activeInstruction !== `Aproximando-se de ${ride.pickupAddress}`) {
          setActiveInstruction(`Aproximando-se de ${ride.pickupAddress}`);
        }
      }
    } else if (isArrivedStatus) {
      currentPos = pickupLoc;
      distanceLeft = "0 m";
      etaLeft = "0 min";
      iconType = "arrive";
      if (activeInstruction !== `Aguardando ${ride.passengerName} subir na moto...`) {
        setActiveInstruction(`Aguardando ${ride.passengerName} subir na moto...`);
      }
    } else if (isInProgressStatus) {
      const ratioToDropoff = (progress - 0.5) / 0.45;
      currentPos = {
        x: pickupLoc.x + (dropoffLoc.x - pickupLoc.x) * ratioToDropoff,
        y: pickupLoc.y + (dropoffLoc.y - pickupLoc.y) * ratioToDropoff,
      };
      const dist = Math.max(0.1, (ride.distance * (1 - ratioToDropoff)).toFixed(1) as any);
      const min = Math.max(1, Math.round((ride.estimatedTime || (ride.distance * 2)) * (1 - ratioToDropoff)));
      distanceLeft = `${dist} km`;
      etaLeft = `${min} min`;

      if (ratioToDropoff < 0.3) {
        iconType = "straight";
        if (activeInstruction !== `Inicie o trajeto em direção a ${ride.dropoffAddress}`) {
          setActiveInstruction(`Inicie o trajeto em direção a ${ride.dropoffAddress}`);
        }
      } else if (ratioToDropoff < 0.7) {
        iconType = "right";
        if (activeInstruction !== "Vire à direita na Av. dos Bandeirantes (Corredor)") {
          setActiveInstruction("Vire à direita na Av. dos Bandeirantes (Corredor)");
        }
      } else {
        iconType = "arrive";
        if (activeInstruction !== `Seu destino está à direita: ${ride.dropoffAddress}`) {
          setActiveInstruction(`Seu destino está à direita: ${ride.dropoffAddress}`);
        }
      }
    } else if (isCompletedStatus) {
      currentPos = dropoffLoc;
      distanceLeft = "0 km";
      etaLeft = "Fin.";
      iconType = "completed";
      if (activeInstruction !== "Corrida concluída com sucesso! Ótimo trabalho.") {
        setActiveInstruction("Corrida concluída com sucesso! Ótimo trabalho.");
      }
    }
  }

  const getNavIcon = () => {
    switch (iconType) {
      case "left":
        return <ArrowUpLeft className="w-5 h-5 text-yellow-400" />;
      case "right":
        return <ArrowUpRight className="w-5 h-5 text-emerald-400" />;
      case "arrive":
        return <MapPin className="w-5 h-5 text-yellow-400 animate-bounce" />;
      case "completed":
        return <Shield className="w-5 h-5 text-emerald-400" />;
      default:
        return <CornerUpRight className="w-5 h-5 text-zinc-400" />;
    }
  };

  // 1. IF REAL GOOGLE MAP KEY EXISTS -> RENDER FULL PRODUCTION-READY MAPS SDK
  if (hasValidKey) {
    const isEnRoute = ride && (ride.status === "accepted" || ride.status === "on_the_way" || ride.status === "motorista_a_caminho");
    const isArrived = ride && (ride.status === "arrived" || ride.status === "motorista_chegou");
    const isInProgress = ride && (ride.status === "in_progress" || ride.status === "iniciada");

    return (
      <div id="map-container" className="relative w-full h-[320px] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
        
        {/* Real Google Map Frame */}
        <div className="absolute inset-0 w-full h-full z-0">
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={driverGPS}
              center={driverGPS}
              defaultZoom={15}
              gestureHandling="cooperative"
              disableDefaultUI={true}
              styles={darkMapStyles}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
            >
              {/* Driver Marker */}
              <AdvancedMarker position={driverGPS}>
                <div className="relative">
                  <span className="absolute -inset-2 rounded-full bg-yellow-400/30 animate-ping" />
                  <div className="w-8 h-8 bg-zinc-950 border-2 border-yellow-400 rounded-full flex items-center justify-center shadow-xl">
                    <Navigation className="w-4.5 h-4.5 text-yellow-400 fill-current transform rotate-45" />
                  </div>
                </div>
              </AdvancedMarker>

              {/* Pickup Marker if active */}
              {ride && (isEnRoute || isArrived) && (
                <AdvancedMarker position={pickupGPS}>
                  <div className="flex flex-col items-center">
                    <div className="bg-yellow-400 text-zinc-950 font-sans font-bold text-[8px] px-1.5 py-0.5 rounded shadow mb-0.5 whitespace-nowrap">
                      EMBARQUE
                    </div>
                    <Pin background="#eab308" glyphColor="#09090b" scale={0.8} />
                  </div>
                </AdvancedMarker>
              )}

              {/* Destination Marker if active */}
              {ride && (isEnRoute || isArrived || isInProgress) && (
                <AdvancedMarker position={dropoffGPS}>
                  <div className="flex flex-col items-center">
                    <div className="bg-emerald-500 text-white font-sans font-bold text-[8px] px-1.5 py-0.5 rounded shadow mb-0.5 whitespace-nowrap">
                      DESTINO
                    </div>
                    <Pin background="#10b981" glyphColor="#fff" scale={0.8} />
                  </div>
                </AdvancedMarker>
              )}

              {/* Route Polyline Rendering */}
              {ride && isEnRoute && (
                <RouteDisplay origin={driverGPS} destination={pickupGPS} isPickup={true} />
              )}
              {ride && isInProgress && (
                <RouteDisplay origin={pickupGPS} destination={dropoffGPS} isPickup={false} />
              )}
            </Map>
          </APIProvider>
        </div>

        {/* HUD Overlay HUD for directions */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10 pointer-events-none">
          <div className="flex flex-col gap-1 items-start">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/85 backdrop-blur-md rounded-full border border-zinc-800 text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-wider">
              <CompassIcon className="w-3.5 h-3.5 text-yellow-400 animate-spin" style={{ animationDuration: "12s" }} />
              <span>GPS por Satélite</span>
            </div>
            {driverLocation && (
              <div className="px-2 py-0.5 bg-black/90 backdrop-blur-md border border-zinc-800/80 rounded-lg text-[8px] font-mono text-zinc-400">
                GPS: {driverLocation.latitude.toFixed(6)}, {driverLocation.longitude.toFixed(6)}
              </div>
            )}
          </div>
          {ride && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-yellow-400 text-zinc-950 rounded-full font-sans text-[10px] font-extrabold uppercase tracking-wider shadow-lg">
              <span className="w-2 h-2 rounded-full bg-zinc-950 animate-ping"></span>
              <span>Navegação Ativa</span>
            </div>
          )}
        </div>

        <AnimatePresence>
          {ride && driverOnline && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-12 left-3 right-3 bg-zinc-950/95 border border-zinc-800/60 backdrop-blur-xl p-3 rounded-2xl flex items-center gap-3 z-15 shadow-xl"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                {getNavIcon()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-black">
                  Instruções de Trajeto
                </p>
                <h3 className="text-xs text-white font-bold truncate">
                  {activeInstruction}
                </h3>
              </div>
              <div className="text-right border-l border-zinc-800 pl-3">
                <div className="text-xs font-mono font-black text-yellow-400">
                  {distanceLeft}
                </div>
                <div className="text-[9px] font-mono font-bold text-zinc-400 uppercase">
                  {etaLeft}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1" />

        {/* Footer info box */}
        <div className="p-3 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent z-10 w-full">
          <div className="bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-md p-3.5 rounded-2xl flex items-start gap-3 shadow-lg">
            <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400 animate-pulse">
              <MapIcon className="w-4.5 h-4.5" />
            </div>
            <div className="flex-1">
              <h4 className="text-[10px] text-yellow-400 font-mono font-extrabold uppercase tracking-widest">
                Google Maps &amp; GPS Real
              </h4>
              <p className="text-xs text-zinc-100 font-semibold mt-0.5 leading-snug">
                {driverOnline ? activeInstruction : "Você está desconectado. Ative o botão acima para ficar disponível."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. FALLBACK HYBRID MAP WITH SETUP INSTRUCTIONS
  return (
    <div id="map-container" className="relative w-full h-[320px] bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between">
      
      {/* SVG Background FALLBACK Map */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <svg className="w-full h-full opacity-65" viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect x="5" y="5" width="20" height="30" rx="3" fill="#14532d" opacity="0.3" />
          <rect x="65" y="50" width="30" height="40" rx="4" fill="#14532d" opacity="0.2" />
          <circle cx="85" cy="80" r="15" fill="#134e4a" opacity="0.2" />
          <path d="M -10,35 Q 25,25 45,40 T 110,20 L 110,25 Q 65,45 45,45 T -10,40 Z" fill="#1e3a8a" opacity="0.4" />
          
          <defs>
            <pattern id="cityGrid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#27272a" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cityGrid)" />

          <path d="M 0,90 L 100,10" stroke="#18181b" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 0,90 L 100,10" stroke="#eab308" strokeWidth="1" strokeDasharray="2,2" strokeLinecap="round" />

          <path d="M 10,0 L 10,100" stroke="#3f3f46" strokeWidth="1.5" opacity="0.7" />
          <path d="M 45,0 L 45,100" stroke="#3f3f46" strokeWidth="2" opacity="0.7" />
          <path d="M 80,0 L 80,100" stroke="#3f3f46" strokeWidth="1.5" opacity="0.7" />
          <path d="M 0,50 L 100,50" stroke="#3f3f46" strokeWidth="2.5" opacity="0.7" />
          <path d="M 0,15 L 100,15" stroke="#3f3f46" strokeWidth="1.5" opacity="0.7" />

          {ride && (
            <>
              <motion.path
                d={
                  ride.status === "accepted" || ride.status === "on_the_way" || ride.status === "motorista_a_caminho"
                    ? `M ${driverStart.x},${driverStart.y} L ${pickupLoc.x},${pickupLoc.y}`
                    : `M ${pickupLoc.x},${pickupLoc.y} L ${dropoffLoc.x},${dropoffLoc.y}`
                }
                fill="none"
                stroke={ride.status === "accepted" || ride.status === "on_the_way" || ride.status === "motorista_a_caminho" ? "#facc15" : "#10b981"}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
              />

              <motion.path
                d={
                  ride.status === "accepted" || ride.status === "on_the_way" || ride.status === "motorista_a_caminho"
                    ? `M ${driverStart.x},${driverStart.y} L ${pickupLoc.x},${pickupLoc.y}`
                    : `M ${pickupLoc.x},${pickupLoc.y} L ${dropoffLoc.x},${dropoffLoc.y}`
                }
                fill="none"
                stroke={ride.status === "accepted" || ride.status === "on_the_way" || ride.status === "motorista_a_caminho" ? "#facc15" : "#10b981"}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4,4"
                animate={{ strokeDashoffset: [0, -12] }}
                transition={{ repeat: Infinity, ease: "linear", duration: 1.2 }}
              />
            </>
          )}
        </svg>
      </div>

      {/* Floating Instructions Notification Block */}
      <div className="absolute inset-x-3 top-3 z-30 pointer-events-none">
        <div className="flex justify-between items-center z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/85 backdrop-blur-md rounded-full border border-zinc-800 text-[10px] font-mono text-zinc-300 font-bold uppercase tracking-wider">
            <CompassIcon className="w-3.5 h-3.5 text-yellow-400 animate-spin" style={{ animationDuration: "12s" }} />
            <span>Navegação por Satélite Ativa</span>
          </div>
        </div>
      </div>

      {/* Map Nodes (Pins fallback) */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        {ride && (ride.status === "accepted" || ride.status === "on_the_way" || ride.status === "motorista_a_caminho" || ride.status === "arrived" || ride.status === "motorista_chegou") && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${pickupLoc.x}%`, top: `${pickupLoc.y}%` }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-yellow-400 text-zinc-950 font-sans font-black text-[9px] px-2 py-0.5 rounded shadow-lg mb-1 tracking-wider"
            >
              EMBARQUE
            </motion.div>
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-8 w-8 rounded-full bg-yellow-400 opacity-45 animate-ping" />
              <div className="w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center text-zinc-950 shadow-xl">
                <MapPin className="w-3.5 h-3.5 fill-current" />
              </div>
            </div>
          </div>
        )}

        {ride && (ride.status === "accepted" || ride.status === "on_the_way" || ride.status === "motorista_a_caminho" || ride.status === "arrived" || ride.status === "motorista_chegou" || ride.status === "in_progress" || ride.status === "iniciada") && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${dropoffLoc.x}%`, top: `${dropoffLoc.y}%` }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="bg-emerald-500 text-white font-sans font-black text-[9px] px-2 py-0.5 rounded shadow-lg mb-1 tracking-wider"
            >
              DESTINO
            </motion.div>
            <div className="relative flex items-center justify-center">
              <span className="absolute inline-flex h-8 w-8 rounded-full bg-emerald-500 opacity-30 animate-ping" />
              <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-xl">
                <MapPin className="w-3.5 h-3.5 fill-current" />
              </div>
            </div>
          </div>
        )}

        <motion.div
          layout
          transition={{ type: "spring", stiffness: 70, damping: 14 }}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{ left: `${currentPos.x}%`, top: `${currentPos.y}%` }}
        >
          <div className="bg-zinc-950 text-yellow-400 border border-yellow-400/40 font-mono font-bold text-[8px] px-2 py-0.5 rounded-full shadow-2xl mb-1 whitespace-nowrap tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
            MOTO JÁ
          </div>
          <div className="relative">
            <span className="absolute -inset-2.5 rounded-full bg-yellow-400/20 animate-ping" />
            <div className="w-9 h-9 bg-zinc-950 border-2 border-yellow-400 rounded-full flex items-center justify-center shadow-2xl relative">
              <Navigation className="w-4 h-4 text-yellow-400 fill-current transform rotate-45" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Navigation Top Banner (HUD for active rides in simulation mode) */}
      <AnimatePresence>
        {ride && driverOnline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-12 left-3 right-3 bg-zinc-950/95 border border-zinc-800/60 backdrop-blur-xl p-3 rounded-2xl flex items-center gap-3 z-15 shadow-xl"
          >
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              {getNavIcon()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-black">
                Instruções de Trajeto
              </p>
              <h3 className="text-xs text-white font-bold truncate">
                {activeInstruction}
              </h3>
            </div>
            <div className="text-right border-l border-zinc-800 pl-3">
              <div className="text-xs font-mono font-black text-yellow-400">
                {distanceLeft}
              </div>
              <div className="text-[9px] font-mono font-bold text-zinc-400 uppercase">
                {etaLeft}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />

      {/* Bottom Live GPS Instruction Footer */}
      <div className="p-3 bg-gradient-to-t from-zinc-950 via-zinc-950/90 to-transparent z-10 w-full">
        <div className="bg-zinc-950/90 border border-zinc-800/80 backdrop-blur-md p-3.5 rounded-2xl flex items-start gap-3 shadow-lg">
          <div className="p-2 rounded-xl bg-yellow-400/10 text-yellow-400">
            <MapIcon className="w-4.5 h-4.5" />
          </div>
          <div className="flex-1">
            <h4 className="text-[10px] text-yellow-400 font-mono font-extrabold uppercase tracking-widest">
              Satélite &amp; GPS Integrado
            </h4>
            <p className="text-xs text-zinc-100 font-semibold mt-0.5 leading-snug">
              {driverOnline ? activeInstruction : "Você está desconectado. Ative a chave acima para ficar disponível."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
