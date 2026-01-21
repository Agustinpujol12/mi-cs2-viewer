import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// https://vitejs.dev/config/
export default defineConfig(() => {
  return {
    plugins: [preact()],
    server: {
      open: true,
      port: 3000,
      fs: {
        // Permitimos que Vite acceda a tu carpeta de demos en el disco D
        allow: [
          '.', // Carpeta actual del proyecto
          'D:/Demo Cs2/licheo' // Tu carpeta externa de demos
        ]
      }
    }
  };
});