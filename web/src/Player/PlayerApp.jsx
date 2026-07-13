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
        // Cuando recibe el mapa (4) o termina de cargar (5), quitamos el Loading
        if (msg.msgtype === 4 || msg.msgtype === 5) {
          clearTimeout(window.hangTimeout);
          window.hangTimeout = null;
          // Forzamos a que el sistema sepa que ya puede mostrar el mapa
          setIsPlaying(true);
          setHasPlayed(true);
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
    console.log("isWasmLoaded", isWasmLoaded);

    const startWatchdog = () => {
      if (window.hangTimeout) clearTimeout(window.hangTimeout);
      window.hangTimeout = setTimeout(() => {
        setIsError(true);
        setLoadingMessage([
          "⚠️ Error Crítico: La demo tiene un formato incompatible.",
          "El analizador no pudo procesarla."
        ]);
        if (worker.current) worker.current.terminate();
      }, 60000);
    };

    // Caso A: Demo cargada localmente (drag & drop)
    if (isWasmLoaded && demoData.demoData) {
      console.log("Posting local demo data to worker.");
      startWatchdog();
      worker.current.postMessage(demoData.demoData);
    }
    // Caso B y C: Demo desde URL
    else if (isWasmLoaded) {
      // ✅ Parseamos manualmente porque preact-iso falla dentro de iframes en Electron
      const params = new URLSearchParams(window.location.search);
      const rawDemourl = params.get('demourl');

      if (!rawDemourl) return; // No hay demo que cargar

      const demoUrl = decodeURIComponent(rawDemourl);
      console.log("demoUrl detectada:", demoUrl);

      // Caso B: Ruta local de Electron (file:///)
      if (demoUrl.startsWith('file:///')) {
        console.log("Leyendo demo desde disco (Electron):", demoUrl);
        setLoadingMessage(["Leyendo demo desde disco..."]);

        const electron = window.require('electron');
        const ipcRenderer = electron.ipcRenderer;

        ipcRenderer.invoke('read-demo-file', demoUrl).then((result) => {
          if (!result.success) {
            setIsError(true);
            setLoadingMessage(["Error al leer el archivo: " + result.error]);
            return;
          }

          const dataArray = new Uint8Array(result.data);
          const filename = demoUrl.substring(demoUrl.lastIndexOf('/') + 1);

          console.log("Demo leída correctamente, enviando al worker...");
          setLoadingMessage(["Procesando demo..."]);
          startWatchdog();
          worker.current.postMessage({
            filename: filename,
            data: dataArray,
          });
        }).catch((err) => {
          setIsError(true);
          setLoadingMessage(["Error IPC: " + err.message]);
        });
      }
      // Caso C: Demo desde URL HTTP (Cloudflare/Localhost)
      else {
        const filename = demoUrl.substring(demoUrl.lastIndexOf('/') + 1);
        setLoadingMessage(["Verificando archivos locales..."]);

        get(filename).then((cachedData) => {
          if (cachedData) {
            console.log("⚡ Demo encontrada en caché.");
            setLoadingMessage(["Cargando desde disco local..."]);
            startWatchdog();
            worker.current.postMessage({ filename, data: cachedData });
          } else {
            console.log("☁️ Descargando desde origen...");
            setIsDownloading(true);

            axios.get(demoUrl, {
              responseType: "arraybuffer",
              onDownloadProgress: (progressEvent) => {
                const totalSize = progressEvent.event.target.getResponseHeader("X-Demo-Length");
                setDownloadProgress(totalSize ? (progressEvent.loaded / totalSize) * 100 : 0);
                setLoadingMessage([`Descargando demo de la nube...`]);
              },
            })
            .then((response) => {
              setIsDownloading(false);
              setDownloadProgress(0);
              setLoadingMessage(["Guardando y procesando..."]);

              let finalFilename = filename;
              const contentDisposition = response.headers["content-disposition"];
              if (contentDisposition) {
                const match = contentDisposition.match(/filename="([^"]+)"/);
                if (match) finalFilename = match[1];
              }

              const dataArray = new Uint8Array(response.data);
              set(finalFilename, dataArray)
                .then(() => console.log("💾 Demo guardada en caché."))
                .catch(err => console.error("Error guardando caché:", err));

              startWatchdog();
              worker.current.postMessage({ filename: finalFilename, data: dataArray });
            })
            .catch((error) => {
              setIsDownloading(false);
              setIsError(true);
              setLoadingMessage(["Error descargando demo: " + error.message]);
            });
          }
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