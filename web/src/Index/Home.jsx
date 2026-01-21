import { useState, useEffect } from "react";
import axios from "axios";
import { clear } from 'idb-keyval';
import "./Home.css";

// ☁️ CONFIGURACIÓN DE RUTAS
const CLOUDFLARE_URL = "https://pub-6aca6add705b46cc8d8bbe3f1fdf6076.r2.dev/";
const IS_LOCALHOST = window.location.hostname === "localhost";

// ✅ CAMBIO CLAVE:
// Al estar en la carpeta 'public', la ruta es relativa a la raíz del sitio web.
const LOCAL_PATH = "/licheo/"; 

const BASE_PATH = IS_LOCALHOST ? LOCAL_PATH : CLOUDFLARE_URL;

// Lista de mapas
const MAP_POOL = ["Mirage", "Inferno", "Nuke", "Ancient", "Anubis", "Overpass", "Dust2", "Train"];

export function Home() {
  const [matches, setMatches] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [filterMap, setFilterMap] = useState("ALL");

  // 1. CARGAR DATOS AL INICIAR
  useEffect(() => {
    const finalUrl = `${BASE_PATH}partidos.json?t=${Date.now()}`;
    
    console.log("Cargando datos desde:", finalUrl);

    axios.get(finalUrl)
      .then(response => {
        if (Array.isArray(response.data)) {
            setMatches(response.data);
        } else {
            console.error("El formato del JSON no es un array:", response.data);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Error cargando lista:", error);
        setLoading(false);
      });
  }, []);

  // 2. FUNCIÓN PARA BORRAR CACHÉ
  const handleClearCache = async () => {
    if (window.confirm("¿Estás seguro? Se borrarán las demos descargadas.")) {
      try {
        await clear();
        alert("♻️ Caché borrada.");
      } catch (e) {
        alert("Error al borrar la caché.");
      }
    }
  };

  // 3. LÓGICA DE FILTRADO
  const displayedMatches = filterMap === "ALL" 
    ? matches 
    : matches.filter(m => m.map.toLowerCase() === filterMap.toLowerCase());

  return (
    <div className="dashboard-container">
      
      {/* BARRA SUPERIOR */}
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

        <button className="btn-cache" onClick={handleClearCache}>
          🗑️ Borrar Caché
        </button>
      </div>

      {/* LISTA DE PARTIDOS */}
      {loading ? (
        <div className="loading-msg">Cargando biblioteca...</div>
      ) : (
        <div className="matches-table">
          <div className="table-header">
            <div>Fecha</div>
            <div>Mapa</div>
            <div>Matchup</div>
            <div>Ver</div>
          </div>

          {displayedMatches.map((match) => (
            <div key={match.id || Math.random()} className={`match-row map-${match.map ? match.map.toLowerCase() : 'unknown'}`}>
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
                  <span>SUBIENDO</span>
                )}
              </div>
            </div>
          ))}

          {displayedMatches.length === 0 && (
            <div style={{textAlign:'center', padding:'40px', color:'#555'}}>
              No hay partidos en esta categoría.
            </div>
          )}
        </div>
      )}
    </div>
  );
}