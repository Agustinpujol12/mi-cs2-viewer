import { useState, useEffect } from "react";
import axios from "axios";
import { clear } from 'idb-keyval';
import "./Home.css";

// ☁️ CONFIGURACIÓN DE RUTAS
const CLOUDFLARE_URL = "https://pub-6aca6add705b46cc8d8bbe3f1fdf6076.r2.dev/";
const IS_LOCALHOST = window.location.hostname === "localhost";

// 🚨 CORRECCIÓN DEFINITIVA:
// La raíz es "public". Desde ahí accedemos a "/licheo/" o "/misdemos/".
const LOCAL_PATH = "/"; 

const BASE_PATH = IS_LOCALHOST ? LOCAL_PATH : CLOUDFLARE_URL;

// Lista de mapas
const MAP_POOL = ["Mirage", "Inferno", "Nuke", "Ancient", "Anubis", "Overpass", "Dust2", "Train"];

export function Home() {
  const [matches, setMatches] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [filterMap, setFilterMap] = useState("ALL");
  
  // 🔘 ESTADO: "LICHEOS" o "DAMAJUANA"
  const [dataSource, setDataSource] = useState("LICHEOS");

  // 1. CARGAR DATOS (Se ejecuta al cambiar el botón)
  useEffect(() => {
    setLoading(true);
    setMatches([]); // Limpiamos la lista visualmente

    // 🔍 LÓGICA DE ARCHIVOS JSON:
    // Si es LICHEOS   -> Busca "partidos.json" en la raíz.
    // Si es DAMAJUANA -> Busca "misdemos.json" DENTRO de la carpeta "misdemos/".
    const jsonPath = dataSource === "LICHEOS" 
      ? "licheo/partidos.json" 
      : "misdemos/misdemos.json";
    
    const finalUrl = `${BASE_PATH}${jsonPath}?t=${Date.now()}`;
    
    console.log(`📂 Cargando modo ${dataSource}...`);
    console.log(`📄 URL del JSON: ${finalUrl}`);

    axios.get(finalUrl)
      .then(response => {
        if (Array.isArray(response.data)) {
            setMatches(response.data);
        } else {
            console.error("Formato incorrecto (no es array):", response.data);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Error cargando lista:", error);
        setLoading(false);
      });
  }, [dataSource]);

  // 2. FUNCIÓN PARA BORRAR CACHÉ
  const handleClearCache = async () => {
    if (window.confirm("¿Borrar caché? Se eliminarán las demos guardadas.")) {
      try {
        await clear();
        alert("♻️ Caché borrada.");
      } catch (e) {
        alert("Error al borrar la caché.");
      }
    }
  };

  // 3. LÓGICA DE FILTRADO DE MAPAS
  const displayedMatches = filterMap === "ALL" 
    ? matches 
    : matches.filter(m => m.map && m.map.toLowerCase() === filterMap.toLowerCase());

  // 📂 LÓGICA DE CARPETAS DE DEMOS:
  // Si es LICHEOS   -> Busca los .dem en la carpeta "licheo/"
  // Si es DAMAJUANA -> Busca los .dem en la carpeta "misdemos/"
  const folderPrefix = dataSource === "LICHEOS" ? "licheo/" : "misdemos/";

  return (
    <div className="dashboard-container">
      
{/* 🔘 BOTONES PRINCIPALES (SELECCIÓN DE CARPETA) */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          /* 👇 AGREGAMOS 'mode-btn' AQUÍ */
          className={`filter-btn mode-btn ${dataSource === "LICHEOS" ? "active" : ""}`}
          onClick={() => { setDataSource("LICHEOS"); setFilterMap("ALL"); }}
          style={{ flex: 1, textAlign: 'center', fontSize: '1.1rem', padding: '12px' }}
        >
          🏆 LICHEOS
        </button>
        <button 
          /* 👇 AQUÍ TAMBIÉN */
          className={`filter-btn mode-btn ${dataSource === "DAMAJUANA" ? "active" : ""}`}
          onClick={() => { setDataSource("DAMAJUANA"); setFilterMap("ALL"); }}
          style={{ flex: 1, textAlign: 'center', fontSize: '1.1rem', padding: '12px' }}
        >
          🍷 DAMAJUANA
        </button>
      </div>

      {/* BARRA DE FILTROS DE MAPA */}
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
        <div className="loading-msg">
            {dataSource === "LICHEOS" ? "Cargando Licheos..." : "Cargando Damajuana..."}
        </div>
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
                    /* 🔗 AQUÍ SE CONSTRUYE LA RUTA FINAL */
                    /* EJEMPLO: /licheo/archivo.dem  O  /misdemos/archivo.dem */
                    href={`/player?demourl=${BASE_PATH}${folderPrefix}${match.filename}`}
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
              No hay demos disponibles en {dataSource}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}