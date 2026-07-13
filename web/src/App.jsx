import { useState } from "react";
import { LocationProvider, Router, Route } from "preact-iso";
import { Home } from "./Index/Home";
import { PlayerApp } from "./Player/PlayerApp";
import { DemoContext } from "./context";

export function App() {
  const [demoData, setDemoData] = useState(null);

  // 🚨 NUEVO: Detectamos si esta ventana es el iframe del reproductor
  const urlParams = new URLSearchParams(window.location.search);
  const isIframePlayer = urlParams.get('player') === 'true';

  if (isIframePlayer) {
    // Si es el iframe, mostramos SOLO el reproductor y anulamos el menú
    return (
      <DemoContext.Provider value={{ demoData, setDemoData }}>
        <PlayerApp />
      </DemoContext.Provider>
    );
  }

  // Flujo normal de la aplicación (El menú lateral)
  return (
    <DemoContext.Provider value={{ demoData, setDemoData }}>
      <LocationProvider>
        <Router>
          <Home path="/" />
          <Home default />
        </Router>
      </LocationProvider>
    </DemoContext.Provider>
  );
}