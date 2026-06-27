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
    routeNodes, sourceCountry, destCountry, source, destination,
    
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
  const intensity = (Math.sin(time) + 1) / 2; // 0 to 1

  // Capa de Resplandor (Glow)
  const airportGlowLayer = new ScatterplotLayer({
    id: 'airports-glow-layer',
    data: validAirports,
    pickable: false,
    opacity: 0.2 + (intensity * 0.3), // Animación de pulsación
    stroked: false,
    filled: true,
    radiusScale: 1,
    radiusMinPixels: 0,
    parameters: { depthTest: false, blend: true },
    getPosition: d => [d.longitude, d.latitude],
    getRadius: d => {
        if (appMode === 'routing') {
            if (source && d.iata === source) return 80000;
            if (destination && d.iata === destination) return 80000;
        } else if (appMode === 'mst') {
            if (mstCountry && d.country === mstCountry) return 60000;
        }
        return 0; // Sin resplandor para los inactivos
    },
    getFillColor: d => {
        if (appMode === 'routing') {
            if (source && d.iata === source) return [56, 189, 248, 255]; // Cian Neón
            if (destination && d.iata === destination) return [167, 139, 250, 255]; // Morado Neón
        } else if (appMode === 'mst') {
            if (mstCountry && d.country === mstCountry) return [251, 191, 36, 150]; // Amarillo Neón
        }
        return [0, 0, 0, 0];
    },
    updateTriggers: {
        getRadius: [appMode, sourceCountry, destCountry, mstCountry, source, destination],
        getFillColor: [appMode, sourceCountry, destCountry, mstCountry, source, destination]
    }
  });

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
            if (source && d.iata === source) return 40000;
            if (destination && d.iata === destination) return 40000;
        } else if (appMode === 'mst') {
            if (mstCountry && d.country === mstCountry) return 30000;
            if (!mstCountry) return 20000; // Red global
        }
        return 10000; 
    },
    getFillColor: d => {
        if (appMode === 'routing') {
            if (source && d.iata === source) return [255, 255, 255, 255]; 
            if (destination && d.iata === destination) return [255, 255, 255, 255]; 
            if (sourceCountry || destCountry) return [148, 163, 184, 80]; 
            return [255, 255, 255, 120]; 
        } else if (appMode === 'mst') {
            if (mstCountry && d.country === mstCountry) return [255, 255, 255, 255]; // Núcleo blanco
            if (mstCountry && d.country !== mstCountry) return [148, 163, 184, 40]; // Super atenuado
            return [255, 255, 255, 120]; // Blanco tenue para MST global
        }
        return [255, 255, 255, 120];
    },
    updateTriggers: {
        getRadius: [appMode, sourceCountry, destCountry, mstCountry, source, destination],
        getFillColor: [appMode, sourceCountry, destCountry, mstCountry, source, destination]
    }
  });

  const arcLayers = [];
  const textLayers = [];

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
              getWidth: 3.5, // Un poco más grueso para que se vea genial
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

  const getTooltipContent = ({object}) => {
    if (!object) return null;
    
    // Estilos principales del glassmorphism
    const style = {
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      color: '#fff',
      padding: '16px',
      fontFamily: '"Inter", sans-serif',
      fontSize: '14px',
      pointerEvents: 'none',
      minWidth: '240px',
      transition: 'opacity 0.2s ease-out',
      zIndex: 1000
    };

    if (object.name) {
        return {
          html: `
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #94A3B8; font-weight: 700;">
                ${object.country}
              </div>
              <div style="font-weight: 800; font-size: 20px; color: #38BDF8; line-height: 1.1;">
                ${object.city}
              </div>
              <div style="margin-top: 6px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1);">
                <div style="display: flex; align-items: center; gap: 8px; color: #E2E8F0; font-weight: 500; font-size: 14px;">
                  <span style="font-size: 18px; filter: drop-shadow(0 0 4px rgba(255,255,255,0.3));">✈️</span> 
                  <span style="flex: 1;">${object.name}</span>
                  <span style="background: rgba(251, 191, 36, 0.15); border: 1px solid rgba(251, 191, 36, 0.3); color: #FBBF24; padding: 2px 6px; border-radius: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.5px;">
                    ${object.iata}
                  </span>
                </div>
              </div>
              <div style="margin-top: 8px; font-size: 11px; color: #64748B; font-family: monospace; letter-spacing: 0.5px; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 6px; text-align: center;">
                LAT <span style="color:#94A3B8">${object.latitude.toFixed(4)}</span> &nbsp;•&nbsp; LNG <span style="color:#94A3B8">${object.longitude.toFixed(4)}</span>
              </div>
            </div>
          `,
          style
        };
    }
    
    if (object.source && object.target && object.distance) {
        return {
          html: `
             <div style="display: flex; flex-direction: column; gap: 8px; text-align: center;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #FBBF24; font-weight: 700;">
                Conexión de Red Óptima
              </div>
              <div style="font-weight: 800; font-size: 22px; color: #fff; display: flex; justify-content: center; align-items: center; gap: 12px; margin: 4px 0;">
                ${object.source} <span style="color: #64748B; font-size: 16px;">➔</span> ${object.target}
              </div>
              <div style="margin-top: 4px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); color: #94A3B8; font-size: 13px;">
                Distancia: <span style="color: #38BDF8; font-weight: 700; font-size: 15px; margin-left: 4px;">${object.distance.toLocaleString()} km</span>
              </div>
            </div>
          `,
          style
        };
    }
    
    if (object.source) {
        return {
          html: `
             <div style="display: flex; flex-direction: column; gap: 8px; text-align: center;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #38BDF8; font-weight: 700;">
                Conexión de Vuelo
              </div>
              <div style="font-weight: 800; font-size: 22px; color: #fff; display: flex; justify-content: center; align-items: center; gap: 12px; margin: 4px 0;">
                ${object.source} <span style="color: #64748B; font-size: 16px;">➔</span> ${object.target}
              </div>
            </div>
          `,
          style
        };
    }

    return null;
  };

  return (
    <div className="w-full h-full absolute top-0 left-0 bg-[#020617]">
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
        layers={[landLayer, airportGlowLayer, airportsLayer, ...arcLayers, ...textLayers]}
        getTooltip={getTooltipContent}
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
