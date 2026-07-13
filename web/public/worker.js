importScripts("./wasm/wasm_exec.js");

onmessage = (event) => {
  var filename = event.data.filename;
  var demoData = event.data.data;

  console.log(`[Worker] Recibida la demo: ${filename}. Tamaño: ${demoData.length} bytes`);

  if (demoData instanceof Uint8Array) {
    console.log("[Worker] Formato correcto. Iniciando wasmParseDemo...");
    
    globalThis.wasmParseDemo(filename, demoData, async function (data) {
      if (data instanceof Uint8Array) {
        postMessage(data);
      } else {
        console.warn("[Worker] Aviso: El motor devolvió texto en lugar de binarios.", data);
        postMessage(JSON.parse(data));
      }
    });
  } else {
    console.error("❌ [Worker] Error Crítico: Los datos no llegaron en formato Uint8Array.");
  }
};

async function loadWasm() {
  console.log("[Worker] Iniciando motor WASM...");
  const go = new globalThis.Go();
  
  try {
    // 🚨 AQUÍ ESTABAN LOS PARÉNTESIS QUE FALTABAN
    const result = await WebAssembly.instantiateStreaming(
      fetch("./wasm/main.wasm?v=" + new Date().getTime()),
      go.importObject
    );
    
    go.run(result.instance);
    console.log("[Worker] ✅ Motor WASM cargado exitosamente.");
    
    postMessage("ready"); 
  } catch (error) {
    console.error("❌ [Worker] Error fatal al cargar main.wasm:", error);
  }
}

loadWasm();