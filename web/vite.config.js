import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

export default defineConfig({
  base: './', // <-- LÍNEA AGREGADA PARA ELECTRON
  plugins: [preact()],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  server: {
    open: true,
    port: 3000
    // ¡Ya no hace falta la sección 'fs'!
  }
});