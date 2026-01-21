import { useState, useEffect } from "react";
import axios from "axios";
import { clear } from 'idb-keyval';
import "./Home.css";

// ☁️ CONFIGURACIÓN DE RUTAS
const CLOUDFLARE_URL = "https://pub-6aca6add705b46cc8d8bbe3f1fdf6076.r2.dev/";
const IS_LOCALHOST = window.location.hostname === "localhost";

// Si estás en tu PC usa la ruta del disco D (vía Vite), si no usa Cloudflare
const BASE_PATH = IS_LOCALHOST 
  ? "D:/Demo Cs2/licheo/" 
  : CLOUDFLARE_URL;

// Lista de mapas para los botones de arriba
const MAP_POOL = ["Mirage", "Inferno", "Nuke", "Ancient", "Anubis", "Overpass", "Dust2", "Train"];

export function Home() {
  const [matches, setMatches] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [filterMap, setFilterMap] = useState("ALL");

  // 1. CARGAR DATOS AL INICIAR
  useEffect(() => {
    // Definimos la URL según el entorno
    const finalUrl = `${BASE_PATH}partidos.json?t=${Date.now()}`;

    axios.get(finalUrl)
      .then(response => {
        setMatches(response.data);
        setLoading(false);
      })
      .catch(error => {
        console.error("Error cargando lista:", error);
        // Respaldo: Si falla Cloudflare en Vercel, intenta el archivo local en public
        if (!IS_LOCALHOST) {
          axios.get("/partidos.json")
            .then(res => setMatches(res.data))
            .catch(() => console.warn("No se encontró respaldo local en Vercel"));
        }
        setLoading(false);
      });
  }, []);

  // 2. FUNCIÓN PARA BORRAR CACHÉ
  const handleClearCache = async () => {
    if (window.confirm("¿Estás seguro? Se borrarán las demos descargadas de tu PC para liberar espacio.")) {
      try {
        await clear();
        alert("♻️ Espacio liberado correctamente.");
      } catch (e) {
        alert("Error al intentar borrar la caché.");
      }
    }
  };

  // 3. LÓGICA DE FILTRADO
  const displayedMatches = filterMap === "ALL" 
    ? matches 
    : matches.filter(m => m.map.toLowerCase() === filterMap.toLowerCase());

  return (
    <div className="dashboard-container">
      
      {/* --- BARRA SUPERIOR (FILTROS) --- */}
      <div className="control-bar">
        <div className="filter-group">
          <button 
            className={`filter-btn ${filterMap === "ALL" ? "active" : ""}`}
            onClick={() => setFilterMap("ALL")}
          >
            TODOS
          </button>
          
          {MAP_POOL.map(mapName => (
            <button 
              key={mapName}
              className={`filter-btn ${filterMap === mapName ? "active" : ""}`}
              onClick={() => setFilterMap(mapName)}
            >
              {mapName}
            </button>
          ))}
        </div>

        <button className="btn-cache" onClick={handleClearCache} title="Borrar demos del disco">
          🗑️ Borrar Caché
        </button>
      </div>

      {/* --- LISTA DE PARTIDOS --- */}
      {loading ? (
        <div className="loading-msg">Cargando biblioteca de demos...</div>
      ) : (
        <div className="matches-table">
          
          <div className="table-header">
            <div>Fecha</div>
            <div>Mapa</div>
            <div>Matchup</div>
            <div>Ver</div>
          </div>

          {displayedMatches.map((match) => (
            <div 
              key={match.id} 
              className={`match-row map-${match.map.toLowerCase()}`}
            >
              <div className="cell-date">{match.date}</div>
              <div className="cell-map">{match.map}</div>
              <div className="cell-title">{match.title}</div>
              
              <div>
                {match.filename ? (
                  <a 
                    href={`/player?demourl=${BASE_PATH}${match.filename}`}
                    className="btn-play"
                  >
                    ▶ PLAY
                  </a>
                ) : (
                  <span style={{color:'#444', fontSize:'0.7rem', display:'block', textAlign:'center'}}>
                    SUBIENDO
                  </span>
                )}
              </div>
            </div>
          ))}

          {displayedMatches.length === 0 && (
            <div style={{textAlign:'center', padding:'40px', color:'#555'}}>
              No hay partidos registrados en {filterMap}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}