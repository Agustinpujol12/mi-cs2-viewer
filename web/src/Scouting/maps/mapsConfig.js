// src/Scouting/maps/mapsConfig.js

export const MAPS_COORDINATES = {
  de_mirage: {
    ct_zones: {
      "B Ancla": {
        // Abarca: B Site, Aps, Bench, Forest
        xMin: -2400, xMax: -800,
        yMin: -600,  yMax: 900
      },
      "L (Short)": {
        // Abarca: Catwalk, L, escalera de B
        xMin: -800,  xMax: 200,
        yMin: -400,  yMax: 200
      },
      "Medio (AWP / Ventana)": {
        // Abarca: Ventana (Sniper's Nest), Mid Doors, CT Spawn mirando mid
        xMin: -800,  xMax: 200,
        yMin: -1500, yMax: -400
      },
      "Liga (Conector)": {
        // Abarca: Conector entero y la entrada a Jungle
        xMin: 200,   xMax: 700,
        yMin: -800,  yMax: -200
      },
      "A Ancla": {
        // Abarca: A Site, Caverna, CT Ticket, Stairs
        xMin: 700,   xMax: 1600,
        yMin: -2500, yMax: 0
      }
    }
  }
};