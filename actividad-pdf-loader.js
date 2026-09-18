(function () {
  "use strict";

  const cargas = new Map();

  function cargarScriptExterno(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    if (cargas.has(src)) return cargas.get(src);
    const promesa = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.lazySrc = src;
      script.onload = () => resolve(window[globalName]);
      script.onerror = () => {
        cargas.delete(src);
        reject(new Error(`No se pudo cargar ${src}`));
      };
      document.head.appendChild(script);
    });
    cargas.set(src, promesa);
    return promesa;
  }

  window.asegurarLibreriasPdf = async function (incluirProteccion = false) {
    await cargarScriptExterno(
      "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
      "jspdf"
    );
    if (incluirProteccion) {
      await cargarScriptExterno(
        "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js",
        "PDFLib"
      );
    }
    return true;
  };
})();
