import React, { useState, useEffect } from "react";
import "../Player/protos/Message_pb.js"; 
import { detectarEquiposDisponibles } from "./coreDetector";
import { extraerRolesCT } from "./rolesAnalyzer";

const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

// =====================================================================
// 1. FUNCIÓN LÓGICA: EXTRAER CABECERA (SE QUEDA AFUERA)
// =====================================================================
const extraerCabeceraDemo = (demoUrl) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await ipcRenderer.invoke('read-demo-file', demoUrl);
      if (!result.success) return reject(new Error(result.error));

      const dataArray = new Uint8Array(result.data);
      const worker = new Worker("worker.js");

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error("La demo tardó demasiado en responder (Timeout). Asegúrate de que el archivo no esté corrupto."));
      }, 45000); 

      let infoTemp = { mapname: null, tname: null, ctname: null };
      let bandoInicialMap = new Map();
      let playersMap = new Map();      
      let ticksProcesados = 0;
      let rosterCapturado = false;

      worker.onmessage = (e) => {
        if (e.data === "ready") {
          worker.postMessage({ filename: "scout.dem", data: dataArray });
        } else {
          const msg = window.proto.Message.deserializeBinary(e.data).toObject();
          
          if (msg.msgtype === 4 && msg.init) {
            infoTemp.mapname = msg.init.mapname;
            infoTemp.tname = msg.init.tname;
            infoTemp.ctname = msg.init.ctname;
          }

          if (msg.msgtype === 6 && msg.round && msg.round.ticksList && !rosterCapturado) {
            ticksProcesados += msg.round.ticksList.length;

            for (let i = 0; i < msg.round.ticksList.length; i++) {
              const subMsg = msg.round.ticksList[i];
              if (subMsg.tickstate && subMsg.tickstate.playersList) {
                subMsg.tickstate.playersList.forEach(p => {
                  if (p.name && (p.team === 'T' || p.team === 'CT')) {
                    if (!bandoInicialMap.has(p.name)) {
                      bandoInicialMap.set(p.name, p.team);
                    }
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

            let votosInversion = 0;
            let votosNormales = 0;

            arrT.forEach(name => {
              const bandoOrigen = bandoInicialMap.get(name);
              if (bandoOrigen === 'CT') votosInversion++;
              if (bandoOrigen === 'T') votosNormales++;
            });

            let finalTName = infoTemp.tname || 'TERRORISTS';
            let finalCTName = infoTemp.ctname || 'COUNTER-TERRORISTS';

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


// =====================================================================
// 2. COMPONENTE PRINCIPAL (DASHBOARD)
// =====================================================================
export function DashboardScouting({ demos, onEquipoSeleccionado }) {  const [infoReporte, setInfoReporte] = useState({});
  const [procesando, setProcesando] = useState(true);
  const [progreso, setProgreso] = useState(0);
  const [errorCritico, setErrorCritico] = useState(null);
  
  const [equiposDetectados, setEquiposDetectados] = useState([]);
  const [equipoSeleccionado, setEquipoSeleccionado] = useState(null);
  const [mapaGlobal, setMapaGlobal] = useState("");
  const [demosFiltradasConteo, setDemosFiltradasConteo] = useState(0);

  // 🚨 EL ESTADO DEL CANDADO VA AQUÍ ADENTRO
  const [ejecutarScouting, setEjecutarScouting] = useState(false);

  // LECTURA INICIAL DE MAPAS Y EQUIPOS
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

  // SELECCIONAR EQUIPO
  const seleccionarTargetScouting = (elenco) => {
    let contadorPartidas = 0;
    let conteoJugadoresTarget = {}; 
    let rosterGlobal = new Set();

    if (window.currentDemosCrudas) {
      window.currentDemosCrudas.forEach(demo => {
        let juegaEnEstaDemo = false;
        let rosterDemo = null;

        demo.equipos.forEach(eq => {
          const coincidencias = eq.jugadores.filter(j => elenco.nombresReales.includes(j)).length;
          if (coincidencias >= 3) {
            juegaEnEstaDemo = true;
            rosterDemo = eq.jugadores;
          }
        });

        if (juegaEnEstaDemo) {
          contadorPartidas++;
          rosterDemo.forEach(j => {
            rosterGlobal.add(j);
            conteoJugadoresTarget[j] = (conteoJugadoresTarget[j] || 0) + 1;
          });
        }
      });
    }

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
    if (onEquipoSeleccionado) onEquipoSeleccionado(elenco);
  };

  // ================= CÁLCULO DE ROLES (SEGUNDO PLANO) =================
  useEffect(() => {
    // 🚨 EL CANDADO EN ACCIÓN: Si ejecutarScouting es false, no pasa de aquí.
    if (!ejecutarScouting) return;

    if (equipoSeleccionado && mapaGlobal) {
      const calcularStats = async () => {
        setProcesandoRoles(true);
        let statsGlobales = {};

        equipoSeleccionado.nombresReales.forEach(j => {
          statsGlobales[j] = {
            "B Ancla": 0, "L (Short)": 0, "Medio (AWP / Ventana)": 0, "Liga (Conector)": 0, "A Ancla": 0, "Fuera de Zona": 0, totalRondasCT: 0
          };
        });

        for (let demo of demos) {
          try {
            const statsParciales = await extraerRolesCT(demo.archivo.rutaRelativa, mapaGlobal, equipoSeleccionado.nombresReales);
            
            Object.keys(statsParciales).forEach(jugador => {
              Object.keys(statsParciales[jugador]).forEach(zona => {
                statsGlobales[jugador][zona] += statsParciales[jugador][zona];
              });
            });
          } catch (error) {
            console.error("Error leyendo roles de una demo:", error);
          }
        }
        
        setStatsCT(statsGlobales);
        setProcesandoRoles(false);
      };
      
      calcularStats();
    }
  }, [equipoSeleccionado, mapaGlobal, demos, ejecutarScouting]); // 🚨 SE AGREGA A LAS DEPENDENCIAS

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
  const [bandoActivo, setBandoActivo] = useState('CT');
  const [statsCT, setStatsCT] = useState(null);
  const [procesandoRoles, setProcesandoRoles] = useState(false);
  
  return (
    <div style={{ padding: '30px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
      
      {/* Cabecera limpia */}
      <div style={{ marginBottom: '30px', borderBottom: '1px solid #222', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, color: '#fff', fontSize: '2rem' }}>ANÁLISIS ESTRATÉGICO</h1>
          <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
            <span style={{ backgroundColor: '#222', color: '#fff', padding: '5px 10px', borderRadius: '4px', fontWeight: 'bold' }}>🗺️ {mapaGlobal ? mapaGlobal.toUpperCase() : ''}</span>
            <span style={{ backgroundColor: '#111', color: '#888', padding: '5px 10px', borderRadius: '4px' }}>🎯 Analizando {demosFiltradasConteo} demo(s)</span>
          </div>
        </div>
        <button onClick={() => setEquipoSeleccionado(null)} style={btnVolverStyle}>🔄 Cambiar Objetivo</button>
      </div>

      {/* Target unificado */}
      <div style={{ ...cardDashboardStyle, marginBottom: '30px' }}>
        <h2 style={{ margin: '0 0 5px 0', color: '#fff', fontSize: '1.3rem' }}>👥 Roster Objetivo bajo Seguimiento</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '10px' }}>
          {equipoSeleccionado.nombresReales.map(j => (
            <span key={j} style={tagRosterActivoStyle}>👤 {j}</span>
          ))}
        </div>
      </div>

      {/* 🚨 EL BOTÓN DE INICIO ESTÁ AQUÍ */}
      {!ejecutarScouting && (
        <div style={{ marginBottom: '30px', padding: '20px', backgroundColor: '#1a1a1a', borderRadius: '8px', textAlign: 'center', border: '1px solid #333' }}>
          <h3 style={{ color: '#ffb300', marginTop: 0 }}>📊 Cálculo de Roles Pausado</h3>
          <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '15px' }}>
            Presiona el botón para leer las demos y procesar el análisis profundo de posicionamiento.
          </p>
          <button 
            onClick={() => setEjecutarScouting(true)}
            style={{
              padding: '12px 24px', backgroundColor: '#e11d48', color: 'white',
              border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer',
              fontSize: '1rem', transition: '0.2s', boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            }}
          >
            ▶️ Iniciar Análisis de Demos
          </button>
        </div>
      )}

      {/* SELECTOR DE BANDO (TT / CT) */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
        <button 
          onClick={() => setBandoActivo('TT')}
          style={{
            ...btnBandoStyle, 
            backgroundColor: bandoActivo === 'TT' ? '#2a2000' : '#111',
            borderColor: bandoActivo === 'TT' ? '#ffb300' : '#222',
            color: bandoActivo === 'TT' ? '#ffb300' : '#666'
          }}
        >
          ⚔️ SCOUTING TT
        </button>
        <button 
          onClick={() => setBandoActivo('CT')}
          style={{
            ...btnBandoStyle, 
            backgroundColor: bandoActivo === 'CT' ? '#002233' : '#111',
            borderColor: bandoActivo === 'CT' ? '#00d2ff' : '#222',
            color: bandoActivo === 'CT' ? '#00d2ff' : '#666'
          }}
        >
          🛡️ SCOUTING CT
        </button>
      </div>

      {/* CONTENIDO DINÁMICO SEGÚN BANDO */}
      {bandoActivo === 'CT' ? (
        <div style={{ ...cardDashboardStyle, borderTop: '4px solid #00d2ff' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#00d2ff', fontSize: '1.4rem' }}>🛡️ POSICIONAMIENTO Y ROLES (CT)</h2>
          
          {procesandoRoles ? (
            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#0a0a0a', borderRadius: '8px' }}>
              <h3 style={{ color: '#00d2ff', margin: '0 0 10px 0' }}>⏳ Calculando Coordenadas...</h3>
              <p style={{ color: '#666', margin: 0 }}>Procesando el posicionamiento temprano del roster en las demos.</p>
            </div>
          ) : statsCT ? (
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #222' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr style={{ backgroundColor: '#002233' }}>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Jugador</th>
                    <th style={thStyle}>B Ancla</th>
                    <th style={thStyle}>L (Short)</th>
                    <th style={thStyle}>Medio</th>
                    <th style={thStyle}>Liga</th>
                    <th style={thStyle}>A Ancla</th>
                  </tr>
                </thead>
                <tbody>
                  {equipoSeleccionado.nombresReales.map((jugador, index) => {
                    const data = statsCT[jugador] || { "B Ancla": 0, "L (Short)": 0, "Medio (AWP / Ventana)": 0, "Liga (Conector)": 0, "A Ancla": 0, totalRondasCT: 0 };
                    const total = data.totalRondasCT > 0 ? data.totalRondasCT : 1; 
                    
                    const getPct = (zona) => {
                      const porcentaje = ((data[zona] / total) * 100);
                      const colorTexto = porcentaje > 50 ? '#00d2ff' : '#888';
                      const fontWeight = porcentaje > 50 ? 'bold' : 'normal';
                      return <span style={{ color: colorTexto, fontWeight }}>{porcentaje.toFixed(1)}%</span>;
                    };

                    return (
                      <tr key={jugador} style={{ backgroundColor: index % 2 === 0 ? '#111' : '#161616', borderTop: '1px solid #222' }}>
                        <td style={{ ...tdStyle, textAlign: 'left', fontWeight: 'bold', color: '#fff' }}>👤 {jugador}</td>
                        <td style={tdStyle}>{getPct("B Ancla")}</td>
                        <td style={tdStyle}>{getPct("L (Short)")}</td>
                        <td style={tdStyle}>{getPct("Medio (AWP / Ventana)")}</td>
                        <td style={tdStyle}>{getPct("Liga (Conector)")}</td>
                        <td style={tdStyle}>{getPct("A Ancla")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : (
        <div style={{ ...cardDashboardStyle, borderTop: '4px solid #ffb300' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#ffb300', fontSize: '1.4rem' }}>⚔️ TÁCTICAS OFFENSIVE (TT)</h2>
          
          <div style={placeholderAnalisisStyle}>
            <h4 style={{ color: '#ccc', margin: '0 0 10px 0' }}>🗺️ Control de Mapa y Ejecuciones</h4>
            <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>
              Área de análisis Terrorista. Próximamente se integrará el cálculo del Lurker ("Rato") y las tendencias de ejecución (Puntas).
            </p>
          </div>
        </div>
      )}

    </div>
  );
}

// =====================================================================
// ESTILOS
// =====================================================================
const boxEquipoStyle = { backgroundColor: '#111', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s, border-color 0.2s', ':hover': { transform: 'scale(1.02)' } };
const labelJugadorListStyle = { backgroundColor: '#161616', border: '1px solid #252525', color: '#aaa', padding: '6px 12px', borderRadius: '4px', fontSize: '0.85rem', width: '100%' };
const cardDashboardStyle = { backgroundColor: '#111', border: '1px solid #222', borderRadius: '8px', padding: '20px' };
const tagRosterActivoStyle = { backgroundColor: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 14px', borderRadius: '4px', fontSize: '0.9rem', fontWeight: 'bold' };
const placeholderAnalisisStyle = { backgroundColor: '#070707', padding: '20px', borderRadius: '6px', border: '1px solid #1a1a1a' };
const btnVolverStyle = { backgroundColor: '#222', color: '#fff', border: '1px solid #333', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' };
const btnBandoStyle = { flex: 1, padding: '15px', borderRadius: '6px', fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', borderWidth: '2px', borderStyle: 'solid' };
const thStyle = { padding: '15px', color: '#00d2ff', fontSize: '0.9rem', borderBottom: '2px solid #00d2ff', textTransform: 'uppercase' };
const tdStyle = { padding: '12px 15px', color: '#ccc', fontSize: '0.95rem' };