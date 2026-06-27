import React, { useState, useEffect, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { ScatterplotLayer, ArcLayer, GeoJsonLayer, TextLayer } from '@deck.gl/layers';

const INITIAL_VIEW_STATE = {
  longitude: -77.1143, 
  latitude: -12.0219,
  zoom: 3,
  pitch: 40,
  bearing: 0
};

export default function MapVisualization({ 
    airports, 
    
    // Routing Props
    routeNodes, sourceCountry, destCountry,
    
    // MST Props
    appMode, mstEdges, mstCountry
}) {
  const [time, setTime] = useState(0);

  // Filtrar aeropuertos con coordenadas erróneas (0,0 "Null Island")
  const validAirports = useMemo(() => {
      return airports.filter(a => !(a.latitude === 0 && a.longitude === 0));
  }, [airports]);

  // Mapa de acceso rápido para coordenadas (muy útil para MST masivo)
  const airportMap = useMemo(() => {
      const map = {};
      validAirports.forEach(a => {
          map[a.iata] = a;
      });
      return map;
  }, [validAirports]);

  // Animación
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(t => (t + 0.1) % (Math.PI * 2));
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Capa de masa continental
  const landLayer = new GeoJsonLayer({
    id: 'land-layer',
    data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_admin_0_countries.geojson',
    stroked: true,
    filled: true,
    getFillColor: [15, 23, 42, 255], 
    getLineColor: [30, 41, 59, 255], 
    lineWidthMinPixels: 1,
  });

  // ==========================================
  // CAPA DE PUNTOS (AEROPUERTOS)
  // ==========================================
  const airportsLayer = new ScatterplotLayer({
    id: 'airports-layer',
    data: validAirports, 
    pickable: true,
    opacity: 1,
    stroked: false,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 3, 
    radiusMaxPixels: 20,
    parameters: { depthTest: false },
    getPosition: d => [d.longitude, d.latitude],
    getRadius: d => {
        if (appMode === 'routing') {
            if (d.country === sourceCountry || d.country === destCountry) return 40000;
        } else if (appMode === 'mst') {
            if (mstCountry && d.country === mstCountry) return 30000;
            if (!mstCountry) return 20000; // Red global
        }
        return 10000; 
    },
    getFillColor: d => {
        if (appMode === 'routing') {
            if (d.country === sourceCountry) return [56, 189, 248, 255]; 
            if (d.country === destCountry) return [167, 139, 250, 255]; 
            if (sourceCountry || destCountry) return [148, 163, 184, 80]; 
            return [255, 255, 255, 120]; 
        } else if (appMode === 'mst') {
            if (mstCountry && d.country === mstCountry) return [251, 191, 36, 255]; // Amber 400
            if (mstCountry && d.country !== mstCountry) return [148, 163, 184, 40]; // Super atenuado
            return [251, 191, 36, 150]; // Global
        }
        return [255, 255, 255, 120];
    },
  });

  const arcLayers = [];
  const textLayers = [];
  
  const intensity = (Math.sin(time) + 1) / 2; // 0 to 1

  // ==========================================
  // ARCOS PARA MODO ROUTING (BFS/Dijkstra)
  // ==========================================
  if (appMode === 'routing' && routeNodes && routeNodes.length > 1) {
    const arcData = [];
    const textData = [];

    for (let i = 0; i < routeNodes.length; i++) {
        const ap = airportMap[routeNodes[i]];
        if (ap) {
            textData.push({
                position: [ap.longitude, ap.latitude],
                text: `${ap.city} (${ap.iata})`,
                isFirst: i === 0,
                isLast: i === routeNodes.length - 1
            });
        }
    }

    for (let i = 0; i < routeNodes.length - 1; i++) {
      const source = airportMap[routeNodes[i]];
      const target = airportMap[routeNodes[i+1]];
      if (source && target) {
        arcData.push({
          sourcePosition: [source.longitude, source.latitude],
          targetPosition: [target.longitude, target.latitude],
          source: source.iata,
          target: target.iata
        });
      }
    }

    arcLayers.push(
      new ArcLayer({
        id: 'flight-arcs-glow',
        data: arcData,
        getWidth: 12 + (intensity * 8), 
        getSourcePosition: d => d.sourcePosition,
        getTargetPosition: d => d.targetPosition,
        getSourceColor: [56, 189, 248, 80], 
        getTargetColor: [167, 139, 250, 80], 
      })
    );

    arcLayers.push(
      new ArcLayer({
        id: 'flight-arcs-core',
        data: arcData,
        pickable: true,
        getWidth: 3,
        getSourcePosition: d => d.sourcePosition,
        getTargetPosition: d => d.targetPosition,
        getSourceColor: [56, 189, 248, 255], 
        getTargetColor: [167, 139, 250, 255], 
      })
    );

    textLayers.push(
        new TextLayer({
            id: 'route-text-layer',
            data: textData,
            pickable: false,
            getPosition: d => d.position,
            getText: d => d.text,
            getSize: 12, 
            getColor: d => {
                if (d.isFirst) return [56, 189, 248, 255];
                if (d.isLast) return [167, 139, 250, 255];
                return [255, 255, 255, 255];
            },
            getAngle: 0,
            getTextAnchor: 'middle', 
            getAlignmentBaseline: 'bottom',
            getPixelOffset: [0, -15], 
            fontFamily: 'sans-serif',
            fontWeight: 'bold',
            background: true,
            getBackgroundColor: [15, 23, 42, 230], 
        })
    );
  }

  // ==========================================
  // ARCOS PARA MODO RED ÓPTIMA (MST - Kruskal)
  // ==========================================
  if (appMode === 'mst' && mstEdges && mstEdges.length > 0) {
      const mstArcData = [];
      mstEdges.forEach(edge => {
          const source = airportMap[edge.source];
          const target = airportMap[edge.target];
          if (source && target) {
              mstArcData.push({
                  sourcePosition: [source.longitude, source.latitude],
                  targetPosition: [target.longitude, target.latitude],
                  source: source.iata,
                  target: target.iata,
                  distance: edge.distance_km
              });
          }
      });

      // Telaraña (Web)
      arcLayers.push(
          new ArcLayer({
              id: 'mst-arcs-core',
              data: mstArcData,
              pickable: true,
              getWidth: 2, // Fino pero visible
              getSourcePosition: d => d.sourcePosition,
              getTargetPosition: d => d.targetPosition,
              getSourceColor: [251, 191, 36, 180], // Amber 400 con algo de transparencia
              getTargetColor: [251, 191, 36, 180], 
          })
      );
      
      // Glow latente sobre el MST (para que parezca que pasa energía por la red)
      arcLayers.push(
        new ArcLayer({
            id: 'mst-arcs-glow',
            data: mstArcData,
            pickable: false,
            getWidth: 6 + (intensity * 4), 
            getSourcePosition: d => d.sourcePosition,
            getTargetPosition: d => d.targetPosition,
            getSourceColor: [251, 191, 36, 30], 
            getTargetColor: [251, 191, 36, 30], 
        })
    );
  }

  return (
    <div className="w-full h-full absolute top-0 left-0 bg-[#020617]">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={[landLayer, airportsLayer, ...arcLayers, ...textLayers]}
        getTooltip={({object}) => {
          if (!object) return null;
          if (object.name) {
              return `📌 ${object.city}, ${object.country}\n✈️ Aeropuerto: ${object.name} (${object.iata})\n📍 Lat: ${object.latitude.toFixed(4)}, Lng: ${object.longitude.toFixed(4)}`;
          }
          if (object.source && object.target && object.distance) {
              // Tooltip para aristas MST
              return `🕸️ Conexión de Red: ${object.source} ➔ ${object.target}\n📏 Distancia: ${object.distance.toLocaleString()} km`;
          }
          if (object.source) return `Vuelo: ${object.source} ➔ ${object.target}`;
          return null;
        }}
      />
      
      <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-screen" 
           style={{
             backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
             backgroundSize: '40px 40px'
           }} 
      />
    </div>
  );
}
