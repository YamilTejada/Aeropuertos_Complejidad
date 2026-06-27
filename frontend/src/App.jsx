import React, { useState, useEffect, useMemo } from 'react';
import ControlPanel from './components/ControlPanel';
import MapVisualization from './components/MapVisualization';
import { getAirports, calculateRoute, calculateMST } from './services/api';

function App() {
  const [airports, setAirports] = useState([]);
  
  // Modos de App: 'routing' o 'mst'
  const [appMode, setAppMode] = useState('routing');
  
  // States para MODO ROUTING
  const [sourceCountry, setSourceCountry] = useState(null);
  const [source, setSource] = useState(null);
  const [destCountry, setDestCountry] = useState(null);
  const [destination, setDestination] = useState(null);
  const [algorithm, setAlgorithm] = useState('bfs');
  const [routeResult, setRouteResult] = useState(null); 
  
  // States para MODO MST (Kruskal)
  const [mstCountry, setMstCountry] = useState(null);
  const [mstResult, setMstResult] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAirports() {
      const data = await getAirports();
      setAirports(data);
    }
    loadAirports();
  }, []);

  const countries = useMemo(() => {
    const uniqueCountries = [...new Set(airports.map(a => a.country))].filter(Boolean);
    return uniqueCountries.sort();
  }, [airports]);

  const sourceAirports = useMemo(() => {
    if (!sourceCountry) return airports;
    return airports.filter(a => a.country === sourceCountry);
  }, [airports, sourceCountry]);

  const destAirports = useMemo(() => {
    if (!destCountry) return airports;
    return airports.filter(a => a.country === destCountry);
  }, [airports, destCountry]);

  const handleCalculateRoute = async () => {
    if (!source || !destination) return;
    if (source === destination) {
        setError("El origen y destino no pueden ser el mismo.");
        return;
    }
    
    setIsLoading(true);
    setError(null);
    setRouteResult(null);

    try {
      const result = await calculateRoute(source, destination, algorithm);
      if (result && result.exito) {
          setRouteResult(result);
      } else {
          setError(result?.error || "La ruta no pudo ser encontrada.");
      }
    } catch (err) {
      setError("Error conectando con el backend.");
    }
    setIsLoading(false);
  };

  const handleCalculateMST = async () => {
    setIsLoading(true);
    setError(null);
    setMstResult(null);

    try {
      // Si mstCountry es null, buscará en todo el mundo
      const result = await calculateMST(mstCountry);
      if (result && result.exito) {
          setMstResult(result);
      } else {
          setError(result?.error || "No se pudo generar la red óptima para esta región.");
      }
    } catch (err) {
      setError("Error conectando con el backend para Kruskal.");
    }
    setIsLoading(false);
  };

  const handleClear = () => {
    setSourceCountry(null);
    setSource(null);
    setDestCountry(null);
    setDestination(null);
    setRouteResult(null);
    setMstCountry(null);
    setMstResult(null);
    setError(null);
  };

  return (
    <div className="relative w-screen h-screen bg-space-dark text-white font-sans overflow-hidden">
      <MapVisualization 
        airports={airports} 
        
        // Routing props
        routeNodes={routeResult?.ruta_optima || []} 
        sourceCountry={sourceCountry}
        destCountry={destCountry}
        source={source}
        destination={destination}
        
        // MST Props
        appMode={appMode}
        mstEdges={mstResult?.mst_edges || []}
        mstCountry={mstCountry}
      />
      
      <ControlPanel 
        countries={countries}
        appMode={appMode}
        setAppMode={setAppMode}
        
        // Routing props
        sourceCountry={sourceCountry}
        setSourceCountry={setSourceCountry}
        sourceAirports={sourceAirports}
        source={source}
        setSource={setSource}
        destCountry={destCountry}
        setDestCountry={setDestCountry}
        destAirports={destAirports}
        destination={destination}
        setDestination={setDestination}
        algorithm={algorithm}
        setAlgorithm={setAlgorithm}
        routeResult={routeResult}
        onCalculateRoute={handleCalculateRoute}
        
        // MST props
        mstCountry={mstCountry}
        setMstCountry={setMstCountry}
        mstResult={mstResult}
        onCalculateMST={handleCalculateMST}
        
        onClear={handleClear}
        isLoading={isLoading}
        error={error}
        allAirports={airports}
      />
    </div>
  );
}

export default App;
