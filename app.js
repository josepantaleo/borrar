"use strict";

(() => {
  const version = "20260806-6";
  const modules = [
    "./js/modules/01-core-ui.js",
    "./js/modules/02-gameplay.js",
    "./js/modules/03-analysis-tutor.js",
    "./js/modules/04-learning.js",
    "./js/modules/05-online-services.js",
    "./js/modules/06-tournament-data.js",
    "./js/modules/07-tournament-ui.js",
    "./js/modules/08-tournament-match.js",
  ];

  async function loadApplication() {
    try {
      const sources = [];
      for (const modulePath of modules) {
        const response = await fetch(`${modulePath}?v=${version}`, {
          cache: "no-cache",
        });
        if (!response.ok) {
          throw new Error(
            `No se pudo cargar ${modulePath} (HTTP ${response.status})`,
          );
        }
        sources.push(await response.text());
      }

      const bundle = new Blob([sources.join("\n\n")], {
        type: "text/javascript;charset=utf-8",
      });
      const bundleUrl = URL.createObjectURL(bundle);
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = bundleUrl;
          script.onload = resolve;
          script.onerror = () => reject(new Error("No se pudo iniciar la aplicación."));
          document.head.appendChild(script);
        });
      } finally {
        URL.revokeObjectURL(bundleUrl);
      }
    } catch (error) {
      console.error("Error cargando los módulos de la aplicación:", error);
      const message = document.createElement("div");
      message.setAttribute("role", "alert");
      message.style.cssText =
        "position:fixed;inset:16px 16px auto;z-index:100000;padding:14px 16px;" +
        "border-radius:8px;background:#7f1d1d;color:#fff;font:600 14px system-ui";
      message.textContent =
        "No se pudo iniciar la aplicación. Recargá la página y revisá la conexión.";
      document.body.appendChild(message);
    }
  }

  loadApplication();
})();
