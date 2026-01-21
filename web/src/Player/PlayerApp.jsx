import { useEffect, useState, useContext, useRef } from "react";
import { useLocation } from "preact-iso";
import axios from "axios";
import { get, set } from 'idb-keyval'; // ⚡ IMPORTANTE: Librería para caché
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
      console.log("Message received from worker", e);
      if (e.data === "ready") {
        setIsWasmLoaded(true);
      } else {
        const msg = proto.Message.deserializeBinary(e.data).toObject();
        loaderMessageBus.emit(msg);
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
      if (!msg.playing) {
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
    };
  }, []);

  // 2. LÓGICA DE DESCARGA INTELIGENTE (CACHÉ + CLOUDFLARE)
  useEffect(() => {
    console.log("isWasmLoaded", isWasmLoaded);
    
    // Caso A: Demo cargada localmente (arrastrada)
    if (isWasmLoaded && demoData.demoData) {
      console.log("Posting local demo data to worker.");
      worker.current.postMessage(demoData.demoData);
    } 
    // Caso B: Demo desde URL (Cloudflare)
    else if (isWasmLoaded && location.query.demourl) {
      const demoUrl = location.query.demourl;
      
      // Extraemos el nombre real del archivo
      let filename = demoUrl.substring(demoUrl.lastIndexOf('/') + 1);

      // --- PASO 1: BUSCAR EN CACHÉ LOCAL ---
      setLoadingMessage(["Verificando archivos locales..."]);
      
      get(filename).then((cachedData) => {
        if (cachedData) {
          // ¡ÉXITO! ESTABA GUARDADA
          console.log("⚡ Demo encontrada en caché. Saltando descarga.");
          setLoadingMessage(["Cargando desde disco local..."]);
          
          worker.current.postMessage({
            filename: filename,
            data: cachedData,
          });
        } else {
          // NO ESTABA: DESCARGAR DE LA NUBE
          console.log("☁️ Iniciando descarga desde Cloudflare...");
          setIsDownloading(true);

          axios
            .get(demoUrl, {
              responseType: "arraybuffer",
              onDownloadProgress: (progressEvent) => {
                var totalSize = progressEvent.event.target.getResponseHeader("X-Demo-Length");
                setDownloadProgress(
                  totalSize ? (progressEvent.loaded / totalSize) * 100 : 0
                );
                setLoadingMessage([`Descargando demo de la nube...`]);
              },
            })
            .then((response) => {
              setIsDownloading(false);
              setDownloadProgress(0);
              setLoadingMessage(["Guardando y procesando..."]);
              
              const contentDisposition = response.headers["content-disposition"];
              
              if (contentDisposition) {
                const match = contentDisposition.match(/filename="([^"]+)"/);
                if (match) {
                  filename = match[1];
                }
              }
              
              const dataArray = new Uint8Array(response.data);

              // --- PASO 2: GUARDAR EN CACHÉ PARA LA PRÓXIMA ---
              set(filename, dataArray)
                .then(() => console.log("💾 Demo guardada en caché local."))
                .catch(err => console.error("Error guardando caché:", err));
              
              // ENVIAR AL WORKER
              worker.current.postMessage({
                filename: filename,
                data: dataArray,
              });
            })
            .catch((error) => {
              setIsDownloading(false);
              setDownloadProgress(0);
              setIsError(true);
              setLoadingMessage(["Error downloading demo: " + error.message]);
            });
        }
      });
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
      {/* ----------------------------------------- */}

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