(function () {
  "use strict";

  let aviso;
  let timer;

  function asegurarAviso() {
    if (aviso) return aviso;
    aviso = document.createElement("div");
    aviso.id = "estadoRedAplicacion";
    aviso.setAttribute("role", "status");
    aviso.setAttribute("aria-live", "polite");
    aviso.hidden = true;
    Object.assign(aviso.style, {
      position: "fixed",
      top: "0",
      left: "0",
      right: "0",
      zIndex: "100002",
      padding: ".55rem .8rem",
      textAlign: "center",
      font: "600 .82rem/1.35 system-ui, sans-serif",
      background: "#7f1d1d",
      color: "#fee2e2",
      borderBottom: "1px solid rgba(254,226,226,.3)"
    });
    document.body.appendChild(aviso);
    return aviso;
  }

  function actualizar(online) {
    const nodo = asegurarAviso();
    clearTimeout(timer);
    if (!online) {
      nodo.textContent = "Sin conexión a Internet. Los cambios pendientes se reintentarán automáticamente.";
      nodo.style.background = "#7f1d1d";
      nodo.style.color = "#fee2e2";
      nodo.hidden = false;
      return;
    }
    nodo.textContent = "Conexión restaurada. Verificando sincronización…";
    nodo.style.background = "#14532d";
    nodo.style.color = "#dcfce7";
    nodo.hidden = false;
    timer = setTimeout(() => { nodo.hidden = true; }, 4500);
  }

  window.addEventListener("offline", () => {
    actualizar(false);
    window.dispatchEvent(new CustomEvent("app-network-offline"));
  });
  window.addEventListener("online", () => {
    actualizar(true);
    window.dispatchEvent(new CustomEvent("app-network-online"));
  });
  window.addEventListener("load", () => {
    if (navigator.onLine === false) actualizar(false);
  }, { once: true });
})();
