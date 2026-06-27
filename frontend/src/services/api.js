import axios from 'axios';

// Configuración global de axios
const api = axios.create({
  baseURL: 'http://localhost:8000', // URL de FastAPI
  timeout: 10000,
});

export const getAirports = async () => {
  try {
    const response = await api.get('/api/v1/airports');
    return response.data;
  } catch (error) {
    console.error("Error fetching airports from database:", error);
    return [];
  }
};

export const calculateRoute = async (origenIATA, destinoIATA, algoritmo = 'bfs') => {
  try {
    // Llama al endpoint correspondiente: /bfs o /dijkstra
    const response = await api.get(`/${algoritmo}?origen=${origenIATA}&destino=${destinoIATA}`);
    return response.data;
  } catch (error) {
    console.error("Error calculating route:", error);
    throw error;
  }
};

export const calculateMST = async (pais = null) => {
  try {
    const url = pais ? `/kruskal?pais=${encodeURIComponent(pais)}` : '/kruskal';
    const response = await api.get(url);
    return response.data;
  } catch (error) {
    console.error("Error calculating MST:", error);
    throw error;
  }
};
