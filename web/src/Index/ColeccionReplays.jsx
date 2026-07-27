import { useState, useEffect } from "react";
// 📌 ASEGÚRATE DE CREAR ESTE ARCHIVO Y AJUSTAR LA RUTA
import MapaConsolidado from "./MapaConsolidado"; 

const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

const extraerDatosPistolWasm = (demo, bandoBuscado, equipoObjetivo) => {
  return new Promise(async (resolve) => {
    try {
      const result = await ipcRenderer.invoke('read-demo-file', demo.archivo.rutaRelativa);
      if (!result.success) return resolve(null);

      const dataArray = new Uint8Array(result.data);
      const worker = new Worker("worker.js");
      
      let roundCounter = 0;
      let targetRoundNumber = null;

      const timeout = setTimeout(() => {
        worker.terminate();
        resolve(null);
      }, 45000); 

      worker.onmessage = (e) => {
        if (e.data === "ready") {
          worker.postMessage({ filename: demo.archivo.nombre, data: dataArray });
        } else {
          const msg = window.proto.Message.deserializeBinary(e.data).toObject();

          if (msg.msgtype === 6 && msg.round && msg.round.ticksList && msg.round.ticksList.length > 0) {
            roundCounter++;

            // 🎯 EN LA RONDA 1, BUSCAMOS EL "CORE" DE JUGADORES
            if (roundCounter === 1) {
              let bandoRealDelEquipo = null;
              
              if (equipoObjetivo?.nombresReales) {
                const nombresBuscar = equipoObjetivo.nombresReales.map(n => n.toLowerCase().trim());
                
                // Revisamos los ticks para encontrar coincidencias parciales (Core)
                for (let i = 0; i < Math.min(msg.round.ticksList.length, 20); i++) {
                  const tick = msg.round.ticksList[i];
                  if (tick.tickstate && tick.tickstate.playersList) {
                    
                    // 🧠 CONTADOR DE COINCIDENCIAS (CORE)
                    let matchesEncontrados = 0;
                    let bandoDetectadoTemp = null;

                    tick.tickstate.playersList.forEach(p => {
                      const name = p.name ? p.name.toLowerCase() : "";
                      const esDelEquipo = nombresBuscar.some(target => target && name.includes(target));
                      if (esDelEquipo) {
                        matchesEncontrados++;
                        bandoDetectadoTemp = p.team;
                      }
                    });

                    // Si encontramos al menos 3 jugadores de la plantilla, ¡ES NUESTRO EQUIPO!
                    if (matchesEncontrados >= 3 && (bandoDetectadoTemp === 'T' || bandoDetectadoTemp === 'CT')) {
                      bandoRealDelEquipo = bandoDetectadoTemp;
                      console.log(`✅ [CORE DETECTADO] Encontrados ${matchesEncontrados} jugadores en ${demo.archivo.nombre}. Bando: ${bandoRealDelEquipo}`);
                      break;
                    }
                  }
                }
              }

              // Fallback por seguridad
              if (!bandoRealDelEquipo) bandoRealDelEquipo = 'CT';

              const bandoRequerido = bandoBuscado === 'TT' ? 'T' : 'CT';

              // 🧠 LÓGICA DE SELECCIÓN DE MITAD (MR12)
              if (bandoRealDelEquipo === bandoRequerido) {
                targetRoundNumber = 1; 
              } else {
                targetRoundNumber = 13; 
              }

              console.log(`🎯 [WASM] ${demo.archivo.nombre} | Equipo en ${bandoRealDelEquipo}. Buscas ${bandoBuscado} -> Extrayendo Ronda ${targetRoundNumber}`);
            }

            // 🚀 Extraemos la ronda exacta calculada
            if (roundCounter === targetRoundNumber) {
              clearTimeout(timeout);
              worker.terminate(); 
              resolve(msg.round);
            }
          }
          
          if (msg.msgtype === 5) {
            clearTimeout(timeout);
            worker.terminate();
            resolve(null);
          }
        }
      };
    } catch (error) {
      console.error("Error procesando WASM:", error);
      resolve(null);
    }
  });
};

// 2️⃣ COMPONENTE PRINCIPAL
export function ColeccionReplays({ demos, equipoGlobal }) {  const [demoActivaId, setDemoActivaId] = useState(demos.length > 0 ? demos[0].id : null);
  const [filtrosActivos, setFiltrosActivos] = useState(null);
  
  const [datosCruzados, setDatosCruzados] = useState([]);
  const [cargandoConsolidado, setCargandoConsolidado] = useState(false);

  const baseUrl = window.location.href.split('?')[0];

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'APLICAR_FILTROS') {
        setFiltrosActivos(event.data.filtros);
        setDemoActivaId('demo-filtrada'); 
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

useEffect(() => {
    if (filtrosActivos && demos.length > 0) {
      const generarConsolidado = async () => {
        setCargandoConsolidado(true);
        let dataCombinadaTotal = [];

        try {
          if (filtrosActivos.compra.toLowerCase() === 'pistol') {
            
// 🚨 ELIMINAMOS la línea que causaba el error y vamos directo al bucle
            for (const demo of demos) {
              console.log(`Procesando ${demo.archivo.nombre}...`);
              
              // 🚨 LE PASAMOS EL OBJETO COMPLETO QUE VIENE DEL SCOUTING
              const rondaExtraida = await extraerDatosPistolWasm(
                demo, 
                filtrosActivos.bando, 
                equipoGlobal // Pasamos todo el objeto (con su nombreSugerido y nombresReales)
              );
              
              if (rondaExtraida && rondaExtraida.ticksList) {
                 dataCombinadaTotal.push(rondaExtraida);
              }
            }
          }
          
          console.log(`✅ Rondas totales extraídas: ${dataCombinadaTotal.length}`);
          setDatosCruzados(dataCombinadaTotal);
        } catch (error) {
          console.error("Error al generar el consolidado:", error);
        } finally {
          setCargandoConsolidado(false);
        }
      };

      generarConsolidado();
    }
  }, [filtrosActivos, demos]);

return (
    <div style={{ display: 'flex', height: '100%', backgroundColor: '#050505' }}>
      
{/* ========================================== */}
      {/* BARRA LATERAL IZQUIERDA (Lista de demos)     */}
      {/* ========================================== */}
      <div style={{ width: '260px', flexShrink: 0, backgroundColor: '#121212', borderRight: '1px solid #222', overflowY: 'auto' }}>
        <div style={{ padding: '15px', borderBottom: '1px solid #222' }}>
          <h4 style={{ margin: 0, color: '#00d2ff', fontSize: '0.95rem' }}>📺 Demos del Reporte</h4>
          <p style={{ margin: '5px 0 0 0', color: '#555', fontSize: '0.75rem' }}>{demos.length} demo(s)</p>
        </div>

        {/* 🚨 NUEVO INDICADOR DE ESTADO GLOBAL */}
        <div style={{ padding: '15px', borderBottom: '1px solid #222', backgroundColor: '#1a1a1a' }}>
          <h4 style={{ margin: 0, color: '#ffb300', fontSize: '0.85rem' }}>🎯 EQUIPO OBJETIVO:</h4>
          <p style={{ margin: '5px 0 0 0', color: '#fff', fontWeight: 'bold', fontSize: '1rem' }}>
            {equipoGlobal ? equipoGlobal.nombreSugerido.toUpperCase() : "⚠️ NINGUNO (ERROR)"}
          </p>
        </div>

        {filtrosActivos && (
          <div
            onClick={() => setDemoActivaId('demo-filtrada')}
            style={{
              padding: '12px 15px',
              cursor: 'pointer',
              backgroundColor: demoActivaId === 'demo-filtrada' ? '#1e293b' : 'transparent',
              borderLeft: demoActivaId === 'demo-filtrada' ? '3px solid #38bdf8' : '3px solid transparent',
              color: demoActivaId === 'demo-filtrada' ? '#fff' : '#999',
              fontSize: '0.85rem',
              transition: '0.2s',
              borderBottom: '1px solid #222'
            }}
          >
            <div style={{ fontWeight: 'bold', color: '#38bdf8' }}>
              ▶️ Playlist: Resultados
            </div>
            <div style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '3px' }}>
              {filtrosActivos.bando} · {filtrosActivos.compra} (en {demos.length} demos)
            </div>
          </div>
        )}

        {demos.map(d => (
          <div
            key={d.id}
            onClick={() => setDemoActivaId(d.id)}
            style={{
              padding: '12px 15px',
              cursor: 'pointer',
              backgroundColor: demoActivaId === d.id ? '#1e1e1e' : 'transparent',
              borderLeft: demoActivaId === d.id ? '3px solid #00d2ff' : '3px solid transparent',
              color: demoActivaId === d.id ? '#fff' : '#999',
              fontSize: '0.85rem',
              transition: '0.2s'
            }}
          >
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.archivo.nombre}
            </div>
            <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '3px' }}>
              {d.equipo} · {d.mapa}
            </div>
          </div>
        ))}
      </div>

      {/* ========================================== */}
      {/* ÁREA PRINCIPAL (Reproductores de video)      */}
      {/* ========================================== */}
      <div style={{ flex: 1, position: 'relative' }}>
        {demos.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', justifyContent: 'center', alignItems: 'center', color: '#333' }}>
            <h3>No hay demos para mostrar</h3>
          </div>
        ) : (
          <>
            {/* 🚨 REPRODUCTOR VIRTUAL (LA PLAYLIST) */}
            {filtrosActivos && (
              <div style={{
                width: '100%', height: '100%', border: 'none',
                position: 'absolute', top: 0, left: 0,
                display: demoActivaId === 'demo-filtrada' ? 'flex' : 'none',
                flexDirection: 'column',
                backgroundColor: '#0a0a0a',
                color: 'white',
                zIndex: 10
              }}>
                {/* Cabecera del reproductor virtual */}
                <div style={{ padding: '10px 15px', backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, color: '#38bdf8', fontSize: '1rem' }}>
                    ▶️ Playlist de Rondas: {filtrosActivos.bando} - {filtrosActivos.compra.toUpperCase()}
                  </h3>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Se encontraron {datosCruzados.length} rondas</span>
                </div>

                {/* Contenedor del Iframe */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {cargandoConsolidado ? (
                    <div style={{ color: '#fff' }}>
                      <p>⏳ Extrayendo rondas de las demos originales... (Esto demora unos segundos)</p>
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {datosCruzados.length > 0 ? (
                        
                        // 🚨 AQUÍ REEMPLAZAMOS MAPACONSOLIDADO POR EL IFRAME VIRTUAL
                          <iframe
                          title="VirtualPlaylist"
                          src={`${baseUrl}?player=true&virtual=true`}
                          onLoad={(e) => {
                            // Cuando el iframe carga, le inyectamos los datos cruzados
                            e.target.contentWindow.postMessage({
                              type: 'LOAD_VIRTUAL_DEMO',
                              rounds: datosCruzados,
                              map: demos.length > 0 ? demos[0].mapa : 'ancient',
                              filtros: filtrosActivos // 🚨 AGREGAMOS ESTA LÍNEA CLAVE
                            }, '*');
                          }}
                          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                        />

                      ) : (
                        <div style={{ color: '#555', textAlign: 'center' }}>
                          <h2 style={{ color: '#ffb300' }}>📊 Playlist Vacía</h2>
                          <p>No se encontraron datos para estos filtros o hubo un error en la extracción.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REPRODUCTORES DE LAS DEMOS REALES */}
            {demos.map(d => {
              const iframeSrc = `${baseUrl}?player=true&demourl=${encodeURIComponent(d.archivo.rutaRelativa)}`;
              return (
                <iframe
                  key={d.id}
                  src={iframeSrc}
                  title={d.archivo.nombre}
                  style={{
                    width: '100%', height: '100%', border: 'none',
                    position: 'absolute', top: 0, left: 0,
                    display: demoActivaId === d.id ? 'block' : 'none'
                  }}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}