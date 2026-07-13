import React, { useState, useEffect } from "react";
import "../Player/protos/Message_pb.js"; 
import { detectarEquiposDisponibles } from "./coreDetector";

const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

const extraerCabeceraDemo = (demoUrl) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await ipcRenderer.invoke('read-demo-file', demoUrl);
      if (!result.success) return reject(new Error(result.error));

      const dataArray = new Uint8Array(result.data);
      const worker = new Worker("worker.js");

      // 📌 Mantenemos el margen seguro de 45 segundos para evitar Timeouts
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error("La demo tardó demasiado en responder (Timeout). Asegúrate de que el archivo no esté corrupto."));
      }, 45000); 

      let infoTemp = { mapname: null, tname: null, ctname: null };
      
      // 🚨 MAPAS DE SEGUIMIENTO INMUNE
      let bandoInicialMap = new Map(); // Registra el bando de origen absoluto de cada jugador
      let playersMap = new Map();      // Registra la posición en tiempo real
      
      let ticksProcesados = 0;
      let rosterCapturado = false;

      worker.onmessage = (e) => {
        if (e.data === "ready") {
          worker.postMessage({ filename: "scout.dem", data: dataArray });
        } else {
          const msg = window.proto.Message.deserializeBinary(e.data).toObject();
          
          // 1. Recuperamos los nombres reales de los equipos de la cabecera init
          if (msg.msgtype === 4 && msg.init) {
            infoTemp.mapname = msg.init.mapname;
            infoTemp.tname = msg.init.tname;
            infoTemp.ctname = msg.init.ctname;
          }

          if (msg.msgtype === 6 && msg.round && msg.round.ticksList && !rosterCapturado) {
            
            // Reloj incondicional activo
            ticksProcesados += msg.round.ticksList.length;

            for (let i = 0; i < msg.round.ticksList.length; i++) {
              const subMsg = msg.round.ticksList[i];
              if (subMsg.tickstate && subMsg.tickstate.playersList) {
                
                subMsg.tickstate.playersList.forEach(p => {
                  if (p.name && (p.team === 'T' || p.team === 'CT')) {
                    
                    // 🚨 FOTO DE ORIGEN FIJA: Se guarda SOLO la primera vez que asoma el jugador
                    if (!bandoInicialMap.has(p.name)) {
                      bandoInicialMap.set(p.name, p.team);
                    }

                    // Actualización del bando actual
                    playersMap.set(p.name, p.team);
                  }
                });
              }
            }

            let countT = 0, countCT = 0;
            playersMap.forEach((team) => {
              if (team === 'T') countT++;
              if (team === 'CT') countCT++;
            });

            if ((countT >= 5 && countCT >= 5) || ticksProcesados > 10000) {
              rosterCapturado = true;
            }
          }

          if ((infoTemp.mapname && rosterCapturado) || msg.msgtype === 5) {
            clearTimeout(timeout);
            worker.terminate(); 
            
            let arrT = [];
            let arrCT = [];
            playersMap.forEach((team, name) => {
              if (team === 'T') arrT.push(name);
              if (team === 'CT') arrCT.push(name);
            });

            // 🚨 CONTADOR DE INTERCAMBIO CRUZADO INDESTRUCTIBLE
            let votosInversion = 0;
            let votosNormales = 0;

            arrT.forEach(name => {
              const bandoOrigen = bandoInicialMap.get(name);
              if (bandoOrigen === 'CT') votosInversion++;
              if (bandoOrigen === 'T') votosNormales++;
            });

            let finalTName = infoTemp.tname || 'TERRORISTS';
            let finalCTName = infoTemp.ctname || 'COUNTER-TERRORISTS';

            // Si los jugadores estabilizados en TT venían del bando CT original de la cabecera...
            if (votosInversion > votosNormales) {
              finalTName = infoTemp.ctname || 'COUNTER-TERRORISTS';
              finalCTName = infoTemp.tname || 'TERRORISTS';
            }

            resolve({
              mapname: infoTemp.mapname,
              tname: finalTName, 
              ctname: finalCTName, 
              jugadoresT: arrT,
              jugadoresCT: arrCT
            });
          }
        }
      };
    } catch (err) {
      reject(err);
    }
  });
};

export function DashboardScouting({ demos }) {
  const [procesando, setProcesando] = useState(true);
  const [progreso, setProgreso] = useState(0);
  const [errorCritico, setErrorCritico] = useState(null);
  
  const [equiposDetectados, setEquiposDetectados] = useState([]);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [mapaGlobal, setMapaGlobal] = useState("");
  const [demosFiltradasConteo, setDemosFiltradasConteo] = useState(0);

  // 2. LECTURA DE DEMOS (Con Candado de Mapas y Recuperación del ID)
  useEffect(() => {
    let montado = true;

    const inicializarLecturaDemos = async () => {
      setProcesando(true);
      setErrorCritico(null);
      let mapaValidado = null;
      let listaDemosParaAnalizar = [];

      for (let i = 0; i < demos.length; i++) {
        if (!montado) return;
        const demo = demos[i];
        setProgreso(Math.round((i / demos.length) * 100));

        try {
          const infoReal = await extraerCabeceraDemo(demo.archivo.rutaRelativa);
          
          if (!mapaValidado) {
            mapaValidado = infoReal.mapname;
          } else if (mapaValidado !== infoReal.mapname) {
            throw new Error(`Conflicto de mapas: "${demo.archivo.nombre}" es de ${infoReal.mapname.toUpperCase()}, pero el reporte inició con ${mapaValidado.toUpperCase()}. No se pueden mezclar mapas en un mismo reporte.`);
          }

          // 🚨 ACÁ ESTABA EL ERROR: Faltaba devolverle el demoId al objeto
          listaDemosParaAnalizar.push({
            demoId: i.toString(), 
            mapname: infoReal.mapname,
            equipos: [
              { nombre: infoReal.tname, jugadores: infoReal.jugadoresT },
              { nombre: infoReal.ctname, jugadores: infoReal.jugadoresCT }
            ]
          });

        } catch (error) {
          setErrorCritico(error.message);
          setProcesando(false);
          return; 
        }
      }

      if (montado) {
        setProgreso(100);
        setMapaGlobal(mapaValidado);
        
        const elencos = detectarEquiposDisponibles(listaDemosParaAnalizar);
        setEquiposDetectados(elencos);
        
        window.currentDemosCrudas = listaDemosParaAnalizar;

        setTimeout(() => setProcesando(false), 500);
      }
    };

    inicializarLecturaDemos();
    return () => { montado = false; };
  }, [demos]);

// Ejecuta el filtrado destructivo y calcula el Core real tras la fusión
  const seleccionarTargetScouting = (elenco) => {
    let contadorPartidas = 0;
    let conteoJugadoresTarget = {}; 
    let rosterGlobal = new Set();

    if (window.currentDemosCrudas) {
      window.currentDemosCrudas.forEach(demo => {
        let juegaEnEstaDemo = false;
        let rosterDemo = null;

        demo.equipos.forEach(eq => {
          // Si el equipo de la demo comparte 3+ jugadores con el cluster fusionado
          const coincidencias = eq.jugadores.filter(j => elenco.nombresReales.includes(j)).length;
          if (coincidencias >= 3) {
            juegaEnEstaDemo = true;
            rosterDemo = eq.jugadores;
          }
        });

        // Si es una demo de Parivision, contamos quiénes jugaron para sacar a los titulares
        if (juegaEnEstaDemo) {
          contadorPartidas++;
          rosterDemo.forEach(j => {
            rosterGlobal.add(j);
            conteoJugadoresTarget[j] = (conteoJugadoresTarget[j] || 0) + 1;
          });
        }
      });
    }

    // Aislamos matemáticamente a los 5 que más jugaron en estas demos seleccionadas
    const coreCalculado = Object.keys(conteoJugadoresTarget)
      .sort((a, b) => conteoJugadoresTarget[b] - conteoJugadoresTarget[a])
      .slice(0, 5);

    setEquipoSeleccionado(elenco);
    setDemosFiltradasConteo(contadorPartidas);
    setInfoReporte(prev => ({
      ...prev,
      coreDetectado: coreCalculado,
      jugadoresObjetivo: Array.from(rosterGlobal)
    }));
  };

  if (procesando) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a0a' }}>
        <h2 style={{ color: '#ffb300' }}>⚙️ Mapeando Elencos de Jugadores...</h2>
        <div style={{ width: '400px', backgroundColor: '#222', height: '8px', borderRadius: '4px', overflow: 'hidden', marginTop: '20px' }}>
          <div style={{ width: `${progreso}%`, backgroundColor: '#ffb300', height: '100%', transition: '0.3s' }} />
        </div>
      </div>
    );
  }

  if (errorCritico) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#1a0505' }}>
        <h2 style={{ color: '#ff4444' }}>❌ Error en Análisis de Estructura</h2>
        <p style={{ color: '#ddd' }}>{errorCritico}</p>
      </div>
    );
  }

  // ================= PANTALLA OBLIGATORIA DE SELECCIÓN DE ENTORNO =================
  if (!equipoSeleccionado) {
    return (
      <div style={{ padding: '40px', overflowY: 'auto', height: '100%', boxSizing: 'border-box', backgroundColor: '#0a0a0a' }}>
        <h2 style={{ color: '#fff', fontSize: '1.8rem', margin: '0 0 10px 0' }}>📋 Equipos Detectados en las Demos</h2>
        <p style={{ color: '#666', margin: '0 0 30px 0' }}>Selecciona cuál de los siguientes grupos de jugadores deseas trackear para el Scouting:</p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '25px' }}>
          {equiposDetectados.map((elenco, index) => {
            const esMasFrecuente = index === 0 && elenco.conteoApariciones > 1;
            return (
              <div 
                key={index} 
                onClick={() => seleccionarTargetScouting(elenco)}
                style={{
                  ...boxEquipoStyle,
                  border: esMasFrecuente ? '2px solid #ffb300' : '1px solid #222',
                  boxShadow: esMasFrecuente ? '0 0 15px rgba(255,179,0,0.1)' : 'none'
                }}
              >
                {esMasFrecuente && (
                  <span style={{ backgroundColor: '#ffb300', color: '#000', padding: '3px 8px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 'bold', alignSelf: 'flex-start', marginBottom: '10px' }}>
                    🔥 REPETIDO EN {elenco.conteoApariciones} DEMOS (SUGERIDO)
                  </span>
                )}
                <h3 style={{ margin: '0 0 15px 0', color: esMasFrecuente ? '#ffb300' : '#fff' }}>
                  {elenco.nombreSugerido !== 'Equipo Desconocido' ? elenco.nombreSugerido.toUpperCase() : `GRUPO OBJETIVO #${index + 1}`}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                  {elenco.nombresReales.map(j => (
                    <span key={j} style={labelJugadorListStyle}>👤 {j}</span>
                  ))}
                </div>
                <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#555', borderTop: '1px solid #222', paddingTop: '10px', width: '100%', textAlign: 'right' }}>
                  Apariciones: <strong>{elenco.conteoApariciones} mapa(s)</strong>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ================= DASHBOARD INTEGRAL FILTRADO =================
  return (
    <div style={{ padding: '30px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      
      {/* Cabecera limpia */}
      <div style={{ marginBottom: '30px', borderBottom: '1px solid #222', paddingBottom: '20px', display: 'flex', justifyContent: 'between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#ffb300', fontSize: '2rem' }}>ANÁLISIS ESTRATÉGICO</h1>
          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <span style={{ backgroundColor: '#2a2000', color: '#ffb300', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold' }}>🗺️ {mapaGlobal ? mapaGlobal.toUpperCase() : ''}</span>
            <span style={{ backgroundColor: '#111', color: '#888', padding: '5px 10px', borderRadius: '4px' }}>🎯 Analizando {demosFiltradasConteo} de las {demos.length} demos</span>
          </div>
        </div>
        <button onClick={() => setEquipoSeleccionado(null)} style={btnVolverStyle}>🔄 Cambiar Objetivo</button>
      </div>

      {/* Target unificado e inmune a colados */}
      <div style={{ ...cardDashboardStyle, marginBottom: '30px' }}>
        <h2 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1.3rem' }}>👥 Roster Objetivo bajo Seguimiento</h2>
        <p style={{ color: '#666', margin: '0 0 15px 0', fontSize: '0.85rem' }}>Los rivales y las demos coladas de otros equipos fueron completamente eliminados del buffer.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {equipoSeleccionado.nombresReales.map(j => (
            <span key={j} style={tagRosterActivoStyle}>👤 {j}</span>
          ))}
        </div>
      </div>

      {/* Secciones Espejo vacías esperando lógica de táctica */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        <div style={{ ...cardDashboardStyle, borderTop: '4px solid #ffb300' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#ffb300', fontSize: '1.2rem' }}>⚔️ TÁCTICAS OFFENSIVE (TT)</h2>
          <div style={placeholderAnalisisStyle}>
            <h4 style={{ color: '#ccc', margin: '0 0 5px 0' }}>🔫 Rondas de Pistolas</h4>
            <p style={{ color: '#444', margin: 0, fontSize: '0.85rem' }}>Listo para procesar compras y posicionamientos de este Roster...</p>
          </div>
        </div>

        <div style={{ ...cardDashboardStyle, borderTop: '4px solid #00d2ff' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#00d2ff', fontSize: '1.2rem' }}>🛡️ SETUPS DEFENSIVE (CT)</h2>
          <div style={placeholderAnalisisStyle}>
            <h4 style={{ color: '#ccc', margin: '0 0 5px 0' }}>🔫 Rondas de Pistolas</h4>
            <p style={{ color: '#444', margin: 0, fontSize: '0.85rem' }}>Listo para procesar compras y posicionamientos de este Roster...</p>
          </div>
        </div>
      </div>

    </div>
  );
}

// Estilos de la pasarela de selección
const boxEquipoStyle = { backgroundColor: '#111', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', ':hover': { transform: 'scale(1.02)' } };
const labelJugadorListStyle = { backgroundColor: '#161616', border: '1px solid #252525', color: '#aaa', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', width: '100%' };

// Estilos del Dashboard
const cardDashboardStyle = { backgroundColor: '#111', border: '1px solid #222', borderRadius: '8px', padding: '20px' };
const tagRosterActivoStyle = { backgroundColor: '#2a2000', border: '1px solid #ffb300', color: '#ffb300', padding: '8px 14px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' };
const placeholderAnalisisStyle = { backgroundColor: '#070707', padding: '15px', borderRadius: '4px', border: '1px solid #1a1a1a' };
const btnVolverStyle = { backgroundColor: '#222', color: '#fff', border: '1px solid #333', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' };