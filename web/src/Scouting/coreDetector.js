/**
 * Agrupa los rosters comparando similitudes (ADN).
 * Si dos equipos comparten al menos 3 jugadores, se fusionan como el mismo equipo.
 */
export function detectarEquiposDisponibles(demosData) {
  if (!demosData || demosData.length === 0) return [];

  const clusters = [];

  demosData.forEach(demo => {
    demo.equipos.forEach(eq => {
      if (eq.jugadores && eq.jugadores.length >= 4) {
        let matchedCluster = null;

        for (let cluster of clusters) {
          const coincidencias = eq.jugadores.filter(j => cluster.jugadoresCore.includes(j)).length;
          if (coincidencias >= 3) {
            matchedCluster = cluster;
            break;
          }
        }

        if (matchedCluster) {
          // FUSIONAMOS: Añadimos el ID de la demo a un Set para no duplicar el conteo
          matchedCluster.demosVistas.add(demo.demoId);
          eq.jugadores.forEach(j => matchedCluster.nombresReales.add(j));
          
          if (eq.nombre && eq.nombre !== 'Eq1' && eq.nombre !== 'Eq2') {
            matchedCluster.nombresTag.push(eq.nombre);
          }
        } else {
          // CREAMOS UN EQUIPO NUEVO
          clusters.push({
            jugadoresCore: eq.jugadores, 
            nombresReales: new Set(eq.jugadores), 
            demosVistas: new Set([demo.demoId]), // 🚨 Candado de seguridad para contar mapas
            nombresTag: (eq.nombre && eq.nombre !== 'Eq1' && eq.nombre !== 'Eq2') ? [eq.nombre] : []
          });
        }
      }
    });
  });

  const resultadoFinal = clusters.map(cluster => {
    let nombreSugerido = 'Equipo Desconocido';
    
    if (cluster.nombresTag.length > 0) {
      const conteos = {};
      cluster.nombresTag.forEach(tag => conteos[tag] = (conteos[tag] || 0) + 1);
      nombreSugerido = Object.keys(conteos).reduce((a, b) => conteos[a] > conteos[b] ? a : b);
    }

    return {
      nombresReales: Array.from(cluster.nombresReales),
      conteoApariciones: cluster.demosVistas.size, // El conteo será igual a la cantidad de archivos .dem únicos
      nombreSugerido: nombreSugerido
    };
  });

  return resultadoFinal.sort((a, b) => b.conteoApariciones - a.conteoApariciones);
}