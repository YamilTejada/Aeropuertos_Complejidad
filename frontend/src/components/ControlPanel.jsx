import React, { useState, useRef, useEffect } from 'react';
import AutocompleteInput from './AutocompleteInput';
import { PlaneTakeoff, ShieldAlert, Route, MapPin, RefreshCw, Zap, Ruler, Network, Globe } from 'lucide-react';

export default function ControlPanel({ 
  countries,
  appMode,
  setAppMode,
  
  // Routing props
  sourceCountry, setSourceCountry, 
  sourceAirports, source, setSource, 
  destCountry, setDestCountry,
  destAirports, destination, setDestination, 
  algorithm, setAlgorithm,
  routeResult, onCalculateRoute,
  
  // MST Props
  mstCountry, setMstCountry,
  mstResult, onCalculateMST,
  
  onClear, isLoading, error, allAirports
}) {
  
  const getCityName = (iata) => {
      const ap = allAirports.find(a => a.iata === iata);
      return ap ? ap.city : iata;
  };

  const getCountryName = (iata) => {
      const ap = allAirports.find(a => a.iata === iata);
      return ap ? ap.country : '';
  };

  const panelRef = useRef(null);

  useEffect(() => {
      if (routeResult) {
          // Scroll automático para los resultados de búsqueda de ruta
          setTimeout(() => {
              if (panelRef.current) {
                  panelRef.current.scrollTo({
                      top: panelRef.current.scrollHeight,
                      behavior: 'smooth'
                  });
              }
          }, 300);
      }
  }, [routeResult]);

  return (
    <div ref={panelRef} className="absolute top-6 left-6 z-10 w-[420px] min-w-[420px] bg-glass-bg backdrop-blur-xl border border-glass-border p-6 rounded-2xl shadow-2xl overflow-y-auto max-h-[96vh] custom-scrollbar">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
            <PlaneTakeoff className="h-7 w-7 text-neon-cyan mr-3" />
            <h1 className="text-2xl font-black tracking-tight text-white">
                Aero<span className="text-neon-cyan font-light">Route</span>
            </h1>
        </div>
        <button 
            onClick={onClear}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
            title="Limpiar Mapa"
        >
            <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs Selector */}
      <div className="flex mb-6 bg-black/40 p-1 rounded-xl border border-white/5 relative">
          <button
              onClick={() => { setAppMode('routing'); onClear(); }}
              className={`flex-1 flex items-center justify-center py-2.5 px-2 rounded-lg transition-all duration-300 z-10 ${
                  appMode === 'routing' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
          >
              <Route className={`h-4 w-4 mr-2 ${appMode === 'routing' ? 'text-neon-cyan' : ''}`} />
              <span className="text-[11px] font-bold tracking-widest uppercase">Buscador</span>
          </button>
          
          <button
              onClick={() => { setAppMode('mst'); onClear(); }}
              className={`flex-1 flex items-center justify-center py-2.5 px-2 rounded-lg transition-all duration-300 z-10 ${
                  appMode === 'mst' ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
          >
              <Network className={`h-4 w-4 mr-2 ${appMode === 'mst' ? 'text-amber-400' : ''}`} />
              <span className="text-[11px] font-bold tracking-widest uppercase">Red Óptima</span>
          </button>

          {/* Animación del Pill de fondo de Tabs */}
          <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-lg transition-all duration-300 ease-out border border-white/10`}
              style={{ left: appMode === 'routing' ? '4px' : 'calc(50%)' }}
          ></div>
      </div>

      {/* =========================================================
          MODO: BUSCADOR DE RUTAS (BFS/Dijkstra)
          ========================================================= */}
      {appMode === 'routing' && (
        <>
            {/* Origen */}
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center mb-3">
                    <MapPin className="h-4 w-4 text-neon-cyan mr-2" />
                    <h2 className="text-sm font-bold text-white tracking-wide uppercase">Punto de Partida</h2>
                </div>
                <AutocompleteInput 
                    label="País de Origen" options={countries} value={sourceCountry}
                    onSelect={setSourceCountry} placeholder="Ej. Peru, Spain..." isStringArray={true}
                />
                <AutocompleteInput 
                    label="Aeropuerto de Origen" options={sourceAirports} value={source}
                    onSelect={setSource} placeholder="Ej. Jorge Chavez (LIM)"
                />
            </div>
            
            {/* Destino */}
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center mb-3">
                    <MapPin className="h-4 w-4 text-neon-purple mr-2" />
                    <h2 className="text-sm font-bold text-white tracking-wide uppercase">Destino Final</h2>
                </div>
                <AutocompleteInput 
                    label="País de Destino" options={countries} value={destCountry}
                    onSelect={setDestCountry} placeholder="Ej. Japan, USA..." isStringArray={true}
                />
                <AutocompleteInput 
                    label="Aeropuerto de Destino" options={destAirports} value={destination}
                    onSelect={setDestination} placeholder="Ej. Haneda (HND)"
                />
            </div>

            {/* Toggle de Algoritmo */}
            <div className="mb-6 p-1 bg-black/40 rounded-xl flex items-center border border-white/5 relative">
                <button
                    onClick={() => setAlgorithm('bfs')}
                    className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-300 z-10 ${algorithm === 'bfs' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Zap className={`h-4 w-4 mb-1 ${algorithm === 'bfs' ? 'text-neon-cyan' : ''}`} />
                    <span className="text-[10px] font-bold tracking-widest uppercase">BFS (Menos Escalas)</span>
                </button>
                <button
                    onClick={() => setAlgorithm('dijkstra')}
                    className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-300 z-10 ${algorithm === 'dijkstra' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <Ruler className={`h-4 w-4 mb-1 ${algorithm === 'dijkstra' ? 'text-neon-purple' : ''}`} />
                    <span className="text-[10px] font-bold tracking-widest uppercase">Dijkstra (Menos Km)</span>
                </button>
                <div 
                    className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-lg transition-all duration-300 ease-out border border-white/10`}
                    style={{ left: algorithm === 'bfs' ? '4px' : 'calc(50%)' }}
                ></div>
            </div>

            <button
                onClick={onCalculateRoute}
                disabled={isLoading || !source || !destination}
                className={`w-full flex items-center justify-center p-3.5 rounded-xl font-bold tracking-widest text-sm transition-all duration-300 ${
                isLoading || !source || !destination
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10'
                    : algorithm === 'bfs' 
                        ? 'bg-neon-cyan hover:bg-[#7dd3fc] text-slate-900 shadow-[0_0_20px_rgba(56,189,248,0.2)]'
                        : 'bg-neon-purple hover:bg-[#c4b5fd] text-slate-900 shadow-[0_0_20px_rgba(167,139,250,0.2)]'
                }`}
            >
                {isLoading ? 'CALCULANDO...' : 'BUSCAR MEJOR RUTA'}
            </button>

            {/* Panel Resultados Routing */}
            {routeResult && routeResult.ruta_detallada && (
                <div className="mt-6 border-t border-white/10 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-[11px] uppercase tracking-widest text-neon-cyan mb-4 font-bold flex items-center">
                        <Route className="h-4 w-4 mr-2" /> Especificaciones de la Ruta
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Escalas</p>
                                <p className="text-xl font-mono text-white">{routeResult.escalas}</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Distancia Total</p>
                                <p className="text-xl font-mono text-neon-purple">{routeResult.distancia_total_km?.toLocaleString()} <span className="text-xs text-gray-500">km</span></p>
                            </div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Algoritmo Utilizado</p>
                                <p className="text-[13px] font-bold text-white flex items-center mb-2">
                                    <span className={`w-2 h-2 rounded-full mr-2 ${routeResult.algoritmo_usado.includes('BFS') ? 'bg-neon-cyan' : 'bg-neon-purple'}`}></span>
                                    {routeResult.algoritmo_usado}
                                </p>
                                <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                                    {routeResult.algoritmo_usado.includes('BFS') 
                                        ? "Se ha calculado la ruta priorizando la menor cantidad de paradas o escalas posibles, ideal para vuelos más directos sin importar la distancia física." 
                                        : "Se ha calculado la ruta priorizando la distancia geográfica más corta, minimizando el recorrido en kilómetros independientemente de la cantidad de escalas."}
                                </p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 relative mt-4">
                            <div className="absolute left-[27px] top-8 bottom-8 w-px bg-white/10"></div>
                            {routeResult.ruta_detallada.map((nodeInfo, index) => {
                                const isFirst = index === 0;
                                const isLast = index === routeResult.ruta_detallada.length - 1;
                                const iata = nodeInfo.iata;
                                const distToNext = nodeInfo.dist_to_next;
                                return (
                                    <div key={iata + index} className="flex items-start mb-6 last:mb-0 relative z-10">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mr-3 border-2 ${isFirst ? 'bg-slate-900 border-neon-cyan' : isLast ? 'bg-slate-900 border-neon-purple' : 'bg-slate-800 border-slate-500'}`}>
                                            <div className={`w-2 h-2 rounded-full ${isFirst ? 'bg-neon-cyan' : isLast ? 'bg-neon-purple' : 'bg-slate-400'}`}></div>
                                        </div>
                                        <div className="pt-0.5 w-full">
                                            <div className="flex justify-between items-center w-full">
                                                <p className={`font-mono text-sm font-bold ${isFirst ? 'text-neon-cyan' : isLast ? 'text-neon-purple' : 'text-slate-300'}`}>{iata}</p>
                                                <span className="text-[10px] uppercase text-slate-500 bg-white/5 px-2 py-0.5 rounded">{getCountryName(iata)}</span>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">{getCityName(iata)}</p>
                                            {!isLast && distToNext > 0 && (
                                                <div className="mt-3 text-[10px] text-neon-cyan font-mono flex items-center">
                                                    <div className="w-4 h-px bg-neon-cyan/50 mr-2"></div>
                                                    {distToNext.toLocaleString()} km
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
      )}

      {/* =========================================================
          MODO: RED ÓPTIMA MST (Kruskal)
          ========================================================= */}
      {appMode === 'mst' && (
        <>
            <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center mb-3">
                    <Globe className="h-4 w-4 text-amber-400 mr-2" />
                    <h2 className="text-sm font-bold text-white tracking-wide uppercase">Región de la Red</h2>
                </div>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    Selecciona un país para calcular el Minimum Spanning Tree (MST). Si lo dejas en blanco, se calculará la red global.
                </p>
                <AutocompleteInput 
                    label="Filtrar por País (Opcional)" options={countries} value={mstCountry}
                    onSelect={setMstCountry} placeholder="Ej. Brazil, India, Mundo..." isStringArray={true}
                />
            </div>

            <button
                onClick={onCalculateMST}
                disabled={isLoading}
                className={`w-full flex items-center justify-center p-3.5 rounded-xl font-bold tracking-widest text-sm transition-all duration-300 ${
                isLoading
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/10'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-900 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                }`}
            >
                {isLoading ? 'CALCULANDO RED...' : 'GENERAR RED ÓPTIMA'}
            </button>

            {/* Panel Resultados Kruskal */}
            {mstResult && mstResult.mst_edges && (
                <div className="mt-6 border-t border-white/10 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-[11px] uppercase tracking-widest text-amber-400 mb-4 font-bold flex items-center">
                        <Network className="h-4 w-4 mr-2" /> Análisis de Infraestructura
                    </h3>
                    
                    <div className="bg-white/5 p-3 rounded-lg border border-white/5 mb-3">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Algoritmo Utilizado</p>
                        <p className="text-xs text-gray-200 flex items-center">
                            <span className="w-2 h-2 rounded-full mr-2 bg-amber-400"></span>
                            {mstResult.algoritmo_usado}
                        </p>
                        <p className="text-[10px] text-gray-500 mt-2 leading-relaxed">
                            Se ha diseñado una red teórica que conecta todos los aeropuertos seleccionados utilizando la mínima cantidad total de asfalto/distancia, sin formar ciclos ineficientes.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-center">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Nodos</p>
                            <p className="text-xl font-mono text-white">{mstResult.aeropuertos_conectados}</p>
                            <p className="text-[9px] text-slate-500 mt-1">Aeropuertos</p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-lg border border-white/5 text-center">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Aristas</p>
                            <p className="text-xl font-mono text-white">{mstResult.total_aristas}</p>
                            <p className="text-[9px] text-slate-500 mt-1">Vuelos</p>
                        </div>
                    </div>
                    
                    <div className="bg-white/5 p-4 rounded-lg border border-amber-400/20 text-center">
                        <p className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-1 font-bold">Inversión en Distancia (Mínima Global)</p>
                        <p className="text-2xl font-black font-mono text-amber-400">
                            {mstResult.distancia_total_km?.toLocaleString()} <span className="text-sm text-amber-400/50">km</span>
                        </p>
                    </div>
                </div>
            )}
        </>
      )}

      {/* Error display general */}
      {error && (
        <div className="mt-6 flex items-center text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20 text-xs">
          <ShieldAlert className="h-5 w-5 mr-3 flex-shrink-0" />
          {error}
        </div>
      )}
      
    </div>
  );
}
