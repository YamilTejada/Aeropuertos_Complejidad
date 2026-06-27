from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models_database #Importar localmente
import heapq

# Crear las tablas en caso no existan en Supabase
models_database.Base.metadata.create_all(bind=engine)

app = FastAPI()

# ==========================================
# CONFIGURACIÓN DE CORS
# ==========================================
origenes_permitidos = [
    "http://localhost:5173", 
    "http://127.0.0.1:5173",
    "http://localhost:3000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origenes_permitidos, 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# DEPENDENCIA DE BASE DE DATOS
# ==========================================
def get_db():
    db = SessionLocal() 
    try:
        yield db 
    finally:
        db.close() 

# ==========================================
# ENDPOINTS
# ==========================================

@app.get("/api/v1/airports")
def get_airports(db: Session = Depends(get_db)):
    db_airports = db.query(models_database.Airport).all()
    return db_airports

# Función helper para armar el grafo en memoria a partir de BD
def build_graph(db: Session):
    rutas = db.query(models_database.Route).all()
    grafo = {}
    for ruta in rutas:
        src = ruta.source_airport
        dst = ruta.destination_airport
        dist = ruta.distance_km if ruta.distance_km else 0
        
        if src not in grafo:
            grafo[src] = []
        grafo[src].append((dst, dist))
    return grafo

@app.get("/bfs")
def calculate_bfs(origen: str, destino: str, db: Session = Depends(get_db)):
    if origen == destino:
        return {"exito": False, "error": "Origen y destino no pueden ser el mismo"}

    grafo = build_graph(db)
        
    if origen not in grafo:
        return {"exito": False, "error": f"El aeropuerto de origen {origen} no tiene rutas de salida registradas."}

    # Búsqueda en Amplitud (BFS) - Prioriza menor cantidad de escalas
    cola = [([{"iata": origen, "dist_to_next": 0}], 0.0)]
    visitados = set([origen])
    
    while cola:
        camino, distancia_total = cola.pop(0)
        nodo_actual_obj = camino[-1]
        nodo_actual = nodo_actual_obj["iata"]
        
        if nodo_actual == destino:
            ruta_optima_iatas = [n["iata"] for n in camino]
            return {
                "exito": True,
                "algoritmo_usado": "Búsqueda en Amplitud (BFS)",
                "escalas": len(camino) - 2,
                "distancia_total_km": round(distancia_total, 2),
                "ruta_optima": ruta_optima_iatas,
                "ruta_detallada": camino
            }
            
        for vecino, dist_vecino in grafo.get(nodo_actual, []):
            if vecino not in visitados:
                visitados.add(vecino)
                nuevo_camino = list(camino)
                nuevo_camino[-1] = {"iata": nodo_actual, "dist_to_next": round(dist_vecino, 2)}
                nuevo_camino.append({"iata": vecino, "dist_to_next": 0})
                nueva_distancia = distancia_total + dist_vecino
                cola.append((nuevo_camino, nueva_distancia))
                
    return {"exito": False, "error": f"No se encontró una ruta conectada entre {origen} y {destino}"}


@app.get("/dijkstra")
def calculate_dijkstra(origen: str, destino: str, db: Session = Depends(get_db)):
    if origen == destino:
        return {"exito": False, "error": "Origen y destino no pueden ser el mismo"}

    grafo = build_graph(db)
        
    if origen not in grafo:
        return {"exito": False, "error": f"El aeropuerto de origen {origen} no tiene rutas de salida registradas."}

    import itertools
    tie_breaker = itertools.count()

    # Dijkstra - Prioriza menor distancia en km reales
    # La cola de prioridad guarda tuplas: (distancia, tie_breaker, nodo, camino)
    # tie_breaker evita que heapq intente comparar los diccionarios del camino.
    cola = [(0.0, next(tie_breaker), origen, [{"iata": origen, "dist_to_next": 0}])]
    visitados = {} # Guarda la menor distancia conocida a un nodo para evitar rutas subóptimas
    
    while cola:
        distancia_actual, _, nodo_actual, camino = heapq.heappop(cola)
        
        if nodo_actual == destino:
            ruta_optima_iatas = [n["iata"] for n in camino]
            return {
                "exito": True,
                "algoritmo_usado": "Dijkstra (Menor Distancia)",
                "escalas": len(camino) - 2,
                "distancia_total_km": round(distancia_actual, 2),
                "ruta_optima": ruta_optima_iatas,
                "ruta_detallada": camino
            }
            
        # Si ya hemos encontrado un camino más corto hacia este nodo, lo ignoramos
        if nodo_actual in visitados and visitados[nodo_actual] <= distancia_actual:
            continue
            
        visitados[nodo_actual] = distancia_actual
        
        for vecino, dist_vecino in grafo.get(nodo_actual, []):
            nueva_dist = distancia_actual + dist_vecino
            
            # Solo consideramos el vecino si encontramos una ruta más corta hacia él
            if vecino not in visitados or nueva_dist < visitados.get(vecino, float('inf')):
                nuevo_camino = list(camino)
                nuevo_camino[-1] = {"iata": nodo_actual, "dist_to_next": round(dist_vecino, 2)}
                nuevo_camino.append({"iata": vecino, "dist_to_next": 0})
                
                heapq.heappush(cola, (nueva_dist, next(tie_breaker), vecino, nuevo_camino))
                
    return {"exito": False, "error": f"No se encontró una ruta conectada entre {origen} y {destino}"}

# ==========================================
# ALGORITMO DE KRUSKAL (Minimum Spanning Tree)
# ==========================================
class UnionFind:
    def __init__(self):
        self.parent = {}
        self.rank = {}

    def find(self, i):
        if self.parent.setdefault(i, i) == i:
            return i
        self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i, j):
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i != root_j:
            if self.rank.setdefault(root_i, 0) < self.rank.setdefault(root_j, 0):
                self.parent[root_i] = root_j
            elif self.rank[root_i] > self.rank[root_j]:
                self.parent[root_j] = root_i
            else:
                self.parent[root_j] = root_i
                self.rank[root_i] += 1
            return True
        return False

@app.get("/kruskal")
def calculate_kruskal(pais: str = None, db: Session = Depends(get_db)):
    airports = db.query(models_database.Airport).all()
    
    valid_iatas = set()
    if pais:
        for a in airports:
            if a.country and a.country.lower() == pais.lower():
                valid_iatas.add(a.iata)
    else:
        for a in airports:
            valid_iatas.add(a.iata)

    if pais and not valid_iatas:
        return {"exito": False, "error": f"No se encontraron aeropuertos en {pais}."}

    rutas_db = db.query(models_database.Route).all()
    
    # Preparamos las aristas
    aristas = []
    for r in rutas_db:
        if r.source_airport in valid_iatas and r.destination_airport in valid_iatas:
            dist = r.distance_km if r.distance_km else 0
            aristas.append((dist, r.source_airport, r.destination_airport))
            
    if not aristas:
        return {"exito": False, "error": "No hay rutas suficientes en esta zona para armar una red."}

    # Kruskal: Ordenar aristas por menor distancia
    aristas.sort(key=lambda x: x[0])
    
    uf = UnionFind()
    mst_edges = []
    distancia_total = 0.0
    
    for dist, src, dst in aristas:
        if uf.union(src, dst):
            mst_edges.append({
                "source": src,
                "target": dst,
                "distance_km": round(dist, 2)
            })
            distancia_total += dist
            
    aeropuertos_conectados = set()
    for edge in mst_edges:
        aeropuertos_conectados.add(edge["source"])
        aeropuertos_conectados.add(edge["target"])
        
    return {
        "exito": True,
        "algoritmo_usado": "Kruskal (Árbol de Expansión Mínima)",
        "distancia_total_km": round(distancia_total, 2),
        "aeropuertos_conectados": len(aeropuertos_conectados),
        "total_aristas": len(mst_edges),
        "mst_edges": mst_edges
    }