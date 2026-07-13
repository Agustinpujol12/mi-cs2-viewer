const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      nodeIntegrationInSubFrames: true
    }
  });

  win.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, 'dist/index.html')}`
  );

  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- LÓGICA PARA LEER EL ÁRBOL DE DEMOS COMPLETO ---
ipcMain.handle('read-demos-folder', async () => {
  const demosPath = 'D:\\demos';

  if (!fs.existsSync(demosPath)) {
    return { error: 'La carpeta demos no existe en: ' + demosPath };
  }

  try {
    const estructura = [];
    const equipos = fs.readdirSync(demosPath, { withFileTypes: true }).filter(d => d.isDirectory());

    for (const equipo of equipos) {
      const nodoEquipo = { nombre: equipo.name, mapas: [] };
      const rutaEquipo = path.join(demosPath, equipo.name);

      const mapas = fs.readdirSync(rutaEquipo, { withFileTypes: true }).filter(d => d.isDirectory());

      for (const mapa of mapas) {
        const nodoMapa = { nombre: mapa.name, archivos: [] };
        const rutaMapa = path.join(rutaEquipo, mapa.name);

        const archivos = fs.readdirSync(rutaMapa).filter(f => f.endsWith('.dem'));

        nodoMapa.archivos = archivos.map(archivo => {
          const rutaCompleta = path.join(rutaMapa, archivo);
          const urlArchivo = `file:///${rutaCompleta.replace(/\\/g, '/')}`;

          return {
            nombre: archivo,
            rutaRelativa: urlArchivo
          };
        });

        nodoEquipo.mapas.push(nodoMapa);
      }

      estructura.push(nodoEquipo);
    }

    return estructura;
  } catch (err) {
    return { error: 'Error al leer las carpetas: ' + err.message };
  }
});

// --- LÓGICA PARA LEER UN ARCHIVO .DEM DESDE DISCO ---
ipcMain.handle('read-demo-file', async (event, filePath) => {
  const cleanPath = filePath
    .replace(/^file:\/\/\//, '')
    .replace(/\//g, '\\');

  console.log('Leyendo demo desde:', cleanPath);

  try {
    if (!fs.existsSync(cleanPath)) {
      return { success: false, error: 'Archivo no encontrado: ' + cleanPath };
    }

    const buffer = fs.readFileSync(cleanPath);
    
    // ✅ Mandamos el buffer directamente, Electron lo serializa como Uint8Array
    return { success: true, data: buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    )};
  } catch (err) {
    return { success: false, error: err.message };
  }
});