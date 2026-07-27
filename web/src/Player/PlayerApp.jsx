import { useEffect, useState, useContext, useRef } from "react";
import { useLocation } from "preact-iso";
import axios from "axios";
import { get, set } from 'idb-keyval';
import "./PlayerApp.css";
import "./weapons.css";
import ErrorBoundary from "./Error.jsx";
import MessageBus from "./MessageBus.js";
import Player from "./Player.js";
import Map2d from "./map/Map2d.jsx";
import InfoPanel from "./panel/InfoPanel.jsx";
import "./protos/Message_pb.js";
import DemoContext from "../context.js";
import { MSG_PLAY_CHANGE } from "./constants.js";

export function PlayerApp() {
  const location = useLocation();
  const worker = useRef(null);
  const player = useRef(null);

  const demoData = useContext(DemoContext);

  const [playerMessageBus] = useState(new MessageBus());
  const [loaderMessageBus] = useState(new MessageBus());

  const [isWasmLoaded, setIsWasmLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(["Loading..."]);
  const [isError, setIsError] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  // 🚨 NUEVOS ESTADOS PARA EL FILTRO DE JUGADAS
  const [filtroBando, setFiltroBando] = useState("TT");
  const [filtroCompra, setFiltroCompra] = useState("Pistol");
  const opcionesCompra = ["Pistol", "Eco", "Forzado", "Anti", "Buy", "Primer buy"];

  // 🚨 ESTADOS PARA EL BOTÓN APLICAR Y LA DEMO VIRTUAL
  const [filtrosAplicados, setFiltrosAplicados] = useState(null);
  const [mostrarDemoVirtual, setMostrarDemoVirtual] = useState(false);

// 🚨 FUNCIÓN PARA APLICAR LOS FILTROS (En PlayerApp.jsx)
  const handleAplicarFiltros = () => {
    const filtrosActuales = { bando: filtroBando, compra: filtroCompra };
    setFiltrosAplicados(filtrosActuales);
    setMostrarDemoVirtual(true);
    
    // Disparamos un evento hacia fuera del iframe
    window.parent.postMessage({ 
      type: 'APLICAR_FILTROS', 
      filtros: filtrosActuales 
    }, '*');
  };

  // 1. INICIALIZAR WORKER Y PLAYER
  useEffect(() => {
    if (!worker.current) {
      worker.current = new Worker("worker.js");
      console.log("Worker created.");
    }

    if (!player.current) {
      player.current = new Player(playerMessageBus, loaderMessageBus);
      console.log("Player created.");
    }

    worker.current.onmessage = (e) => {
      if (window.hangTimeout) {
        clearTimeout(window.hangTimeout);
        window.hangTimeout = setTimeout(() => {
          setIsError(true);
          setLoadingMessage([
            "⚠️ Error Crítico: Formato de CS2 incompatible.",
            "El motor WASM se colgó al intentar leer esta demo y fue reiniciado."
          ]);
          if (worker.current) {
            worker.current.terminate();
            worker.current = new Worker("worker.js");
          }
        }, 60000);
      }

      if (e.data === "ready") {
        setIsWasmLoaded(true);
      } else {
        const msg = proto.Message.deserializeBinary(e.data).toObject();
        loaderMessageBus.emit(msg);

// 🚨 LA SOLUCIÓN INYECTADA AQUÍ: 
        if (msg.msgtype === 4 || msg.msgtype === 5) {
          clearTimeout(window.hangTimeout);
          window.hangTimeout = null;
          
          // 🔥 CAMBIO AQUÍ: Arranca pausado
          setIsPlaying(false); 
          setHasPlayed(true);

          // Si tienes acceso al objeto player, fuérzalo a pausar
          if (player.current && typeof player.current.pause === 'function') {
             player.current.pause();
          }
        }
      }
    };

    playerMessageBus.listen([13], function (msg) {
      alert(msg.message);
    });

    playerMessageBus.listen([4], (msg) => {
      setLoadingMessage([
        "Loading match...",
        msg.init.tname + " vs " + msg.init.ctname,
        "Map: " + msg.init.mapname,
      ]);
    });

    playerMessageBus.listen([MSG_PLAY_CHANGE], function (msg) {
      setIsPlaying(msg.playing);
      if (msg.playing) {
        setHasPlayed(true);
      }
      if (!msg.playing && !hasPlayed) {
        setLoadingMessage(["Loading..."]);
      }
    });

    return () => {
      if (worker.current) {
        worker.current.terminate();
        console.log("Worker terminated.");
        worker.current = null;
      }

      if (player.current) {
        player.current = null;
      }

      if (window.hangTimeout) {
        clearTimeout(window.hangTimeout);
        window.hangTimeout = null;
      }
    };
  }, []);

// 2. LÓGICA DE CARGA DE DEMO
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isVirtual = params.get('virtual') === 'true';

    // 🚨 NUEVA LÓGICA: MODO PLAYLIST VIRTUAL
    if (isVirtual) {
      setLoadingMessage(["Conectando con el motor de Playlist..."]);
      
const handleVirtualData = (event) => {
        if (event.data && event.data.type === 'LOAD_VIRTUAL_DEMO') {
          setLoadingMessage(["Armando compilado de jugadas..."]);
          
          const mapaCrudo = event.data.map || 'ancient';
          const mapaNormalizado = mapaCrudo.startsWith('de_') ? mapaCrudo : `de_${mapaCrudo}`;

          // 1. Inyectamos la cabecera
          loaderMessageBus.emit({ 
            msgtype: 4, 
            init: { mapname: mapaNormalizado, tname: "FILTRADOS TT", ctname: "FILTRADOS CT" } 
          });

// 2. Inyectamos cada ronda extraída RENUMERADA
          event.data.rounds.forEach((ronda, index) => {
            const nuevoNumero = index + 1;
            
            // 🚨 FORZAMOS EL NÚMERO EN TODAS PARTES PARA QUE REACT NO SE ROMPA
            ronda.round = nuevoNumero;
            if (ronda.teamstate) {
              ronda.teamstate.round = nuevoNumero;
            }

            loaderMessageBus.emit({ msgtype: 6, round: ronda });
          });

          // 3. Le decimos al reproductor que ya "terminó de cargar"
          loaderMessageBus.emit({ msgtype: 5 });
          
          // 4. Arrancamos pausados listos para ver
          setIsPlaying(false);
          setHasPlayed(true);
        }
      };

      window.addEventListener('message', handleVirtualData);
      return () => window.removeEventListener('message', handleVirtualData);
    }

    // --- LÓGICA ORIGINAL PARA DEMOS NORMALES ---
    if (!isWasmLoaded) return;
    console.log("isWasmLoaded", isWasmLoaded);

    const startWatchdog = () => {
      if (window.hangTimeout) clearTimeout(window.hangTimeout);
      window.hangTimeout = setTimeout(() => {
        setIsError(true);
        setLoadingMessage(["⚠️ Error Crítico: La demo tiene un formato incompatible."]);
        if (worker.current) worker.current.terminate();
      }, 60000);
    };

    if (demoData.demoData) {
      startWatchdog();
      worker.current.postMessage(demoData.demoData);
    } else {
      const rawDemourl = params.get('demourl');
      if (!rawDemourl) return;
      const demoUrl = decodeURIComponent(rawDemourl);
      
      if (demoUrl.startsWith('file:///')) {
        setLoadingMessage(["Leyendo demo desde disco..."]);
        const electron = window.require('electron');
        electron.ipcRenderer.invoke('read-demo-file', demoUrl).then((result) => {
          if (!result.success) {
            setIsError(true);
            setLoadingMessage(["Error al leer: " + result.error]);
            return;
          }
          startWatchdog();
          worker.current.postMessage({ filename: demoUrl.substring(demoUrl.lastIndexOf('/') + 1), data: new Uint8Array(result.data) });
        });
      }
    }
  }, [isWasmLoaded]);

  return (
    <ErrorBoundary>

      {/* --- BOTÓN FLOTANTE PARA VOLVER AL MENÚ --- */}
      <a href="/" style={{
          position: 'fixed',
          top: '20px',
          left: '20px',
          zIndex: 9999,
          backgroundColor: '#2f3542',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          textDecoration: 'none',
          fontWeight: 'bold',
          border: '1px solid #57606f',
          boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontFamily: 'Arial, sans-serif'
      }}>
        ⬅ Menú Principal
      </a>
      
      {/* 🚨 NUEVA BARRA DE FILTROS REPLAY */}
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#0a0a0a', padding: '12px 20px', borderBottom: '1px solid #222', 
        gap: '20px', width: '100%', position: 'absolute', top: 0, zIndex: 9000
      }}>
        <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🎯 FILTROS
        </h3>
        
        {/* Filtro de Bando */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <button onClick={() => setFiltroBando('TT')} style={btnBaseStyle(filtroBando === 'TT', '#ffb300')}>⚔️ TT</button>
          <button onClick={() => setFiltroBando('CT')} style={btnBaseStyle(filtroBando === 'CT', '#00d2ff')}>🛡️ CT</button>
        </div>

        <div style={{ width: '1px', height: '20px', backgroundColor: '#333' }} />

        {/* Filtro de Economía */}
        <div style={{ display: 'flex', gap: '5px' }}>
          {opcionesCompra.map(tipo => (
            <button key={tipo} onClick={() => setFiltroCompra(tipo)} style={btnTipoStyle(filtroCompra === tipo)}>
              {tipo.toUpperCase()}
            </button>
          ))}
        </div>

        {/* 🚨 BOTÓN APLICAR */}
        <div style={{ width: '1px', height: '20px', backgroundColor: '#333' }} />
        
        <button 
          onClick={handleAplicarFiltros} 
          style={btnAplicarStyle}
        >
          Aplicar
        </button>
      </div>

      <div className="grid-container" style={{ paddingTop: '50px' }}> 
        <div className="grid-item map">
          <Map2d messageBus={playerMessageBus} />
        </div>
        <div className="grid-item infoPanel">
          <InfoPanel messageBus={playerMessageBus} />
        </div>
      </div>
      
      {/* 📌 Nota: Tienes un segundo grid-container duplicado aquí en tu código original. 
          Si no lo necesitas, puedes borrarlo. */}
      <div className="grid-container">
        <div className="grid-item map">
          <Map2d messageBus={playerMessageBus} />
        </div>
        <div className="grid-item infoPanel">
          <InfoPanel messageBus={playerMessageBus} />
        </div>
      </div>

      {!isPlaying && !hasPlayed && (
        <div className="loading-overlay">
          <div className="loading-dialog">
            {isError ? (
              <div className="error-icon">⚠️</div>
            ) : (
              <div className="loading-spinner"></div>
            )}
            {loadingMessage.map((msg, idx) => (
              <p key={idx}>{msg}</p>
            ))}
            {isDownloading && (
              <div className="progress-bar-container">
                <div
                  className="progress-bar"
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
  
}

// 🚨 ESTILOS PARA LOS BOTONES DEL FILTRO
const btnBaseStyle = (activo, colorFoco) => ({
  backgroundColor: activo ? `${colorFoco}22` : 'transparent',
  border: `1px solid ${activo ? colorFoco : '#333'}`,
  color: activo ? colorFoco : '#888',
  padding: '6px 12px',
  borderRadius: '4px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '0.8rem',
  transition: 'all 0.2s ease',
});

const btnTipoStyle = (activo) => ({
  backgroundColor: activo ? '#222' : 'transparent',
  border: `1px solid ${activo ? '#fff' : '#333'}`,
  color: activo ? '#fff' : '#888',
  padding: '6px 12px',
  borderRadius: '4px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '0.8rem',
  transition: 'all 0.2s ease',
});

// 🚨 ESTILO NUEVO PARA EL BOTÓN APLICAR
const btnAplicarStyle = {
  backgroundColor: '#1d4ed8', // Azul fuerte
  border: '1px solid #2563eb',
  color: '#fff',
  padding: '6px 16px',
  borderRadius: '4px',
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: '0.85rem',
  transition: 'background-color 0.2s ease',
};