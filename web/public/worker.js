// AGREGUÉ LA BARRA AL PRINCIPIO AQUÍ 👇
importScripts("/wasm/wasm_exec.js");

onmessage = (event) => {
  console.log("received event: ", event);
  var demoData = event.data.data;
  var filename = event.data.filename;
  console.log("file: ", filename);
  if (demoData instanceof Uint8Array) {
    globalThis.wasmParseDemo(filename, demoData, async function (data) {
      if (data instanceof Uint8Array) {
        postMessage(data);
      } else {
        console.log(
          "[message] text data received from server, this is weird. We're using protobufs ?!?!?",
          data
        );
        postMessage(JSON.parse(data));
      }
    });
  }
};

async function loadWasm() {
  const go = new globalThis.Go();
  await WebAssembly.instantiateStreaming(
    // CORREGIDO EL NOMBRE DEL ARCHIVO AQUÍ 👇
    fetch("/wasm/main.wasm"),
    go.importObject
  ).then((result) => {
    go.run(result.instance);
    console.log("should be loaded now");
    postMessage("ready");
  });
}
loadWasm();