// src/Scouting/rolesAnalyzer.js
import { MAPS_COORDINATES } from "./maps/mapsConfig.js";

const electron = window.require ? window.require('electron') : null;
const ipcRenderer = electron ? electron.ipcRenderer : null;

export const extraerRolesCT = (demoUrl, mapname, jugadoresObjetivo) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await ipcRenderer.invoke('read-demo-file', demoUrl);
      if (!result.success) return reject(new Error(result.error));

      const dataArray = new Uint8Array(result.data);
      const worker = new Worker("worker.js");

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error("Timeout procesando roles CT."));
      }, 60000);

      let estadisticasPosiciones = {};
      jugadoresObjetivo.forEach(j => {
        estadisticasPosiciones[j] = {
          "B Ancla": 0, "L (Short)": 0, "Medio (AWP / Ventana)": 0, "Liga (Conector)": 0, "A Ancla": 0, "Fuera de Zona": 0, totalRondasCT: 0
        };
      });

      worker.onmessage = (e) => {
        if (e.data === "ready") {
          worker.postMessage({ filename: "roles.dem", data: dataArray });
        } else {
          const msg = window.proto.Message.deserializeBinary(e.data).toObject();

          if (msg.msgtype === 6 && msg.round && msg.round.ticksList && msg.round.ticksList.length > 0) {
            
            if (msg.round.ticksList.length < 300) return;

            const primerTick = msg.round.ticksList[0].tick;
            const targetTick = primerTick + 1600;
            let fotoTomada = false;

            for (let i = 0; i < msg.round.ticksList.length; i++) {
              const subMsg = msg.round.ticksList[i];

              if (!fotoTomada && (subMsg.tick >= targetTick || i === msg.round.ticksList.length - 1)) {
                
                if (subMsg.tickstate && subMsg.tickstate.playersList) {
                  subMsg.tickstate.playersList.forEach(p => {
                    
                    if (jugadoresObjetivo.includes(p.name) && p.team === 'CT' && p.isAlive) {
                      estadisticasPosiciones[p.name].totalRondasCT++;

                      const posX = p.x !== undefined ? p.x : (p.position ? p.position.x : 0);
                      const posY = p.y !== undefined ? p.y : (p.position ? p.position.y : 0);

                      let zonaEncontrada = "Fuera de Zona";
                      
                      const normalizedMap = mapname ? mapname.toLowerCase() : "";
                      const zonasMapa = MAPS_COORDINATES[normalizedMap]?.ct_zones;

                      if (zonasMapa) {
                        for (const [nombreZona, limites] of Object.entries(zonasMapa)) {
                          if (posX >= limites.xMin && posX <= limites.xMax && posY >= limites.yMin && posY <= limites.yMax) {
                            zonaEncontrada = nombreZona;
                            break;
                          }
                        }
                      }
                      
                      estadisticasPosiciones[p.name][zonaEncontrada]++;
                    }
                  });
                }
                
                fotoTomada = true;
                break; 
              }
            }
          }

          if (msg.msgtype === 5) {
            clearTimeout(timeout);
            worker.terminate();
            resolve(estadisticasPosiciones);
          }
        }
      };
    } catch (err) {
      reject(err);
    }
  });
};