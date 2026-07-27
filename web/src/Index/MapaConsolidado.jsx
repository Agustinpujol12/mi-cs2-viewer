import React, { useRef, useEffect } from 'react';

// 1️⃣ IMPORTAMOS LAS IMÁGENES CON LA RUTA CORREGIDA (../ en lugar de ../../)
import deAncient from "../assets/overviews/de_ancient.png";
import deAncientNight from "../assets/overviews/de_ancient_night.png";
import deAnubis from "../assets/overviews/de_anubis.png";
import deDust2 from "../assets/overviews/de_dust2.png";
import deInferno from "../assets/overviews/de_inferno.png";
import deMirage from "../assets/overviews/de_mirage.png";
import deNuke from "../assets/overviews/de_nuke.png";
import deNukeLower from "../assets/overviews/de_nuke_lower.png";
import deOverpass from "../assets/overviews/de_overpass.png";
import deTrain from "../assets/overviews/de_train.png";
import deTrainLower from "../assets/overviews/de_train_lower.png";
import deVertigo from "../assets/overviews/de_vertigo.png";
import deVertigoLower from "../assets/overviews/de_vertigo_lower.png";
import emptyMap from "../assets/overviews/empty.png";

const mapOverviews = {
  "de_ancient": deAncient,
  "de_ancient_night": deAncientNight,
  "de_anubis": deAnubis,
  "de_dust2": deDust2,
  "de_inferno": deInferno,
  "de_mirage": deMirage,
  "de_nuke": deNuke,
  "de_nuke_lower": deNukeLower,
  "de_overpass": deOverpass,
  "de_train": deTrain,
  "de_train_lower": deTrainLower,
  "de_vertigo": deVertigo,
  "de_vertigo_lower": deVertigoLower,
  "empty": emptyMap,
};

export default function MapaConsolidado({ eventos, mapaNombre }) {
  const canvasRef = useRef(null);

  // 2️⃣ OBTENEMOS LA IMAGEN DEL DICCIONARIO
  // Si tu parser devuelve "ancient", le agregamos el "de_" para que coincida
  const nombreNormalizado = mapaNombre.startsWith('de_') ? mapaNombre : `de_${mapaNombre}`;
  const mapImage = mapOverviews[nombreNormalizado] || emptyMap;

  useEffect(() => {
    if (!eventos || eventos.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Limpiamos el canvas antes de dibujar
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 3️⃣ DIBUJAMOS LOS DATOS
    eventos.forEach(tick => {
      if (tick.tickstate && tick.tickstate.playersList) {
        
        tick.tickstate.playersList.forEach(player => {
          if (player.hp <= 0) return; // Ignoramos a los muertos

          // 🚨 LA NUEVA MATEMÁTICA
          // Como tu worker parece enviar porcentajes (ej: x=50, y=50), 
          // los multiplicamos por el tamaño del canvas (1024) para expandirlos.
          // (Si notas que siguen un poco corridos, avísame y revisamos MapPlayer.jsx)
          const pixelX = (player.x / 100) * canvas.width; 
          const pixelY = (player.y / 100) * canvas.height;

          if (player.team === 'TT') {
            ctx.fillStyle = 'rgba(255, 179, 0, 0.05)'; // Naranja TT
          } else if (player.team === 'CT') {
            ctx.fillStyle = 'rgba(0, 210, 255, 0.05)'; // Celeste CT
          } else {
            return;
          }

          // Dibujamos un punto táctico
          ctx.beginPath();
          ctx.arc(pixelX, pixelY, 2, 0, 2 * Math.PI);
          ctx.fill();
        });
      }
    });

  }, [eventos, mapaNombre]);

  return (
    <div style={{ position: 'relative', width: '1024px', height: '1024px', backgroundColor: '#111' }}>
      
      {/* Fondo del mapa arreglado */}
      <img 
        src={mapImage} 
        alt={mapaNombre} 
        style={{ 
          width: '100%', height: '100%', 
          objectFit: 'contain', position: 'absolute', top: 0, left: 0,
          filter: "brightness(0.75) contrast(1.15) saturate(1.1)" // Mismo filtro visual de tu Map2d
        }} 
      />
      
      <canvas 
        ref={canvasRef}
        width={1024}
        height={1024}
        style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}
      />
    </div>
  );
}