
<h1 align="center">CS2 Local Demo Viewer</h1>

<p align="center">
  Reproductor y analizador táctico de <b>demos de Counter-Strike 2 (.dem)</b> en 2D.<br/>
  Proyecto web de alto rendimiento construido con <b>React</b>, <b>WebAssembly (WASM)</b> y <b>Web Workers</b>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB" alt="React"/>
  <img src="https://img.shields.io/badge/WebAssembly-%23654FF0.svg?style=flat&logo=webassembly&logoColor=white" alt="WASM"/>
  <img src="https://img.shields.io/badge/JavaScript-%23F7DF1E.svg?style=flat&logo=javascript&logoColor=black" alt="JavaScript"/>
  <img src="https://img.shields.io/badge/Hecho%20por-Agustín%20Pujol-orange" alt="Autor"/>
</p>

---

## 📖 **DESCRIPCIÓN**

Esta aplicación es un **reproductor táctico bidimensional** diseñado para leer, parsear y visualizar partidas locales de Counter-Strike 2 directamente desde el navegador. 

Utilizando un motor C/Go compilado a WebAssembly, la herramienta procesa los pesados archivos `.dem` en hilos secundarios (Web Workers) para extraer posiciones, utilidades y eventos en tiempo real, renderizándolos sobre mapas tácticos fluidos. Es ideal para analizar estrategias, revisar errores y estudiar posicionamientos competitivos.

---

## ✨ **Novedades y Mejoras Propias**

Hemos adaptado el reproductor clásico para que el análisis de partidas sea mucho más ágil e inteligente:

*   ⌨️ **Atajos de Teclado Globales:** Control total sin depender del mouse. Usa la **Barra Espaciadora** para pausar/reproducir, la letra **`K`** o la **Flecha Derecha** para saltar a la siguiente ronda, y la **Flecha Izquierda** para retroceder.
*   🎯 **Filtros Tácticos de Rondas:** Nueva barra de herramientas superior que permite crear una "playlist virtual" filtrando jugadas por bando (**TT/CT**) o por economía (**Pistol, Eco, Forzado, Anti, Buy**).
*   🧠 **Navegación Inteligente (GamersClub & HLTV):** El componente *RoundNav* ahora detecta automáticamente los patrones de inicio de partida, ignorando las rondas de cuchillo (faca) y corrigiendo el *swap* de equipos para mostrar las rondas válidas de forma impecable.
*   🗺️ **Soporte de Mapas Ampliado:** Integración y lectura corregida de overviews adicionales, como *de_cache.png*, listos para el renderizado 2D.

---

## 🧩 **Componentes del Proyecto**

### ⚙️ **Parser** (*parser/*)
Escrito en Go y compilado a **WebAssembly**.  
Utiliza la librería de parseo de demos de CS: https://github.com/markus-wa/demoinfocs-golang ❤️

### 🖥️ **Frontend** (*web/*)
Escrito en **JavaScript** utilizando Preact.

*   Componente Homepage en *web/src/Index* (página estática inicial).
*   Componente Player en *web/src/Player*.

📌 *Nota importante: El reproductor (Player) utiliza el parser en WebAssembly para decodificar la demo binaria localmente, guardando los datos en memoria para reproducirlos al instante y sin lag.*

### 📦 **Protocol Buffers** (*protos/*)
Formato de mensajes personalizado para enviar los datos de la demo entre el parser (WASM) y la aplicación frontend del reproductor.

### 🗄️ **Backend** (*server/*)
*   Sirve el contenido web estático.
*   Funciona como proxy para la descarga de demos.

### 🌐 **Faceit Browser Plugin** (*browserplugin/faceit/*)
Añade botones a la interfaz de Faceit para reproducir las demos directamente. Internamente resuelve la URL real de la demo y abre el reproductor con el enlace como parámetro. Compatible con navegadores basados en Firefox y Chrome.

### 🐳 **Contenedor y CI/CD** (*.github/workflows/*)
Toda la aplicación se compila en un contenedor y se despliega en GCP, servida completamente por un servidor Go. La integración continua utiliza **GitHub Actions**.

### 🤖 **GitHub Copilot Agents** (*.github/agents/*)
Agentes especializados que proveen guía experta para diferentes áreas del código:
*   **Go Parser Specialist** - Desarrollo del parser WebAssembly.
*   **Frontend Specialist** - UI y visualización en Preact/JS.
*   **Server Specialist** - Servidor HTTP Go y proxy.
*   **Build & CI Specialist** - Procesos de build y GitHub Actions.
*   **Browser Plugin Specialist** - Extensión de navegador e integración FACEIT.
*   **Agent Writer Specialist** - Meta-agente para crear y mantener agentes.

---

## 🛠️ **Desarrollo Local**

El proyecto cuenta con un archivo *Makefile* para facilitar los comandos de desarrollo.

➡️ **Paso 1 – Compilar el parser WebAssembly:**
```bash
make wasm
```

To run the frontend (together with *wasm*, it is enough to develop a Player with manual upload)
```sh
make dev
```

To run the server (runs the server in dev mode, which enables local testing using url like `http://localhost:5173/player?demourl=http://localhost:8080/testdemos/1-6e537ed7-b125-44f8-add6-14e814af55a6-1-1.dem.zst`)
```sh
make server
```
