(() => {
  "use strict";
  if (window.__actividadPedagogiaInicializada) return;
  window.__actividadPedagogiaInicializada = true;

  const texto = value => String(value ?? "").trim();
  const escapeHtml = value => texto(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

  function mostrarExplicacion(boton) {
    const origen = boton.closest("[data-question], .question-card, .socratic-question, .quiz-question, fieldset") || boton.parentElement;
    const pregunta = texto(origen?.dataset.question || origen?.querySelector("legend,h3,h4,p,label")?.textContent);
    const concepto = texto(origen?.dataset.concept || "el concepto central de la pregunta");
    const interpretacion = texto(origen?.dataset.interpretation || "Identificá qué acción, relación o decisión te está pidiendo la consigna.");
    const pistas = texto(origen?.dataset.hints || "Separá los datos relevantes, nombrá las condiciones y pensá cómo comprobarías tu respuesta.");
    const guia = texto(origen?.dataset.guide || "¿Qué entrada usarías? ¿Qué resultado esperás? ¿Qué evidencia del código o de una prueba lo demostraría?");
    const modal = document.createElement("div");
    modal.className = "pedagogical-help-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `<div class="pedagogical-help-box">
      <header><h3>?? EXPLICAME QUÉ PIDE</h3><button type="button" aria-label="Cerrar">×</button></header>
      <p><strong>Pregunta</strong><br>${escapeHtml(pregunta || "Leé la consigna completa.")}</p>
      <p><strong>Interpretación</strong><br>${escapeHtml(interpretacion)}</p>
      <p><strong>Concepto evaluado</strong><br>${escapeHtml(concepto)}</p>
      <p><strong>Pistas</strong><br>${escapeHtml(pistas)}</p>
      <p><strong>Preguntas guía</strong><br>${escapeHtml(guia)}</p>
      <p class="pedagogical-help-warning">Esta ayuda no incluye la respuesta ni una solución.</p>
    </div>`;
    modal.addEventListener("click", event => {
      if (event.target === modal || event.target.closest("button")) modal.remove();
    });
    document.body.appendChild(modal);
    modal.querySelector("button")?.focus();
    window.registrarActividadFirebase?.(
      window.firebaseCurrentUser?.uid,
      window.seccionActiva || "general",
      "ayuda_comprension",
      { pregunta, concepto }
    );
  }
  window.mostrarExplicacionQuePide = mostrarExplicacion;

  function agregarBotonesExplicacion() {
    document.querySelectorAll("[data-question], .socratic-question, .quiz-question, fieldset").forEach(origen => {
      if (origen.querySelector(".btn-explicar-que-pide")) return;
      const boton = document.createElement("button");
      boton.type = "button";
      boton.className = "btn btn-secondary btn-explicar-que-pide";
      boton.textContent = "?? EXPLICAME QUÉ PIDE";
      boton.addEventListener("click", () => mostrarExplicacion(boton));
      origen.appendChild(boton);
    });
  }

  window.calcularEvaluacionPorEvidencias = function calcularEvaluacionPorEvidencias(evidencia = {}, ponderaciones = {}) {
    const pesos = {
      codigo: 0.30, objetivo: 0.10, requisitos: 0.15, logica: 0.15,
      sintaxis: 0.10, pruebas: 0.10, respuestas: 0.10, ...ponderaciones
    };
    const componentes = Object.fromEntries(Object.entries(pesos).map(([clave, peso]) => {
      const valor = Number(evidencia[clave]);
      return [clave, { peso, puntaje: Number.isFinite(valor) ? Math.max(0, Math.min(10, valor)) : null }];
    }));
    const disponibles = Object.values(componentes).filter(item => item.puntaje !== null);
    if (!disponibles.length) return { nota: null, evidenciaInsuficiente: true, componentes };
    const totalPeso = disponibles.reduce((sum, item) => sum + item.peso, 0);
    const nota = disponibles.reduce((sum, item) => sum + item.puntaje * item.peso, 0) / totalPeso;
    return { nota: Number(nota.toFixed(2)), evidenciaInsuficiente: disponibles.length < 4, componentes };
  };

  function congelarEntrega() {
    const boton = document.querySelector("[data-entrega-definitiva], #btnEntregar, #btnEntregarActividad");
    if (!boton || boton.dataset.pedagogiaBound) return;
    boton.dataset.pedagogiaBound = "true";
    boton.addEventListener("click", async event => {
      if (boton.dataset.entregaCongelada === "true") return;
      const uid = window.firebaseCurrentUser?.uid;
      const sectionId = window.seccionActiva || document.body.dataset.sectionId || "general";
      const codigo = document.querySelector("textarea[data-code-editor], textarea.codigo-editor, .cm-content")?.value || "";
      const resultado = await window.guardarEntregaDefinitivaFirebase?.(uid, sectionId, {
        codigo, pruebas: [], respuestas: {}, errores: [], intento: Number(window.intentoActual || 1)
      });
      if (resultado?.ok || resultado?.congelada) {
        boton.dataset.entregaCongelada = "true";
        boton.disabled = true;
        boton.title = "La entrega definitiva está congelada";
      }
    }, { capture: true });
  }

  function iniciar() {
    agregarBotonesExplicacion();
    congelarEntrega();
    window.addEventListener("colaboracion-aceptada", event => {
      const sectionId = event.detail?.sectionId;
      if (sectionId && typeof window.switchSection === "function") window.switchSection(sectionId);
      document.querySelector(`[data-section-id="${CSS.escape?.(sectionId || "")}"]`)?.scrollIntoView?.({ block: "nearest" });
      // Si la aceptación llegó después del login o de la carga inicial,
      // fuerza la conexión del editor del estudiante al mismo documento Yjs.
      window.setTimeout(() => window.iniciarColaboracionCRDTEstudiante?.(), 0);
    });
    new MutationObserver(() => { agregarBotonesExplicacion(); congelarEntrega(); })
      .observe(document.body, { childList: true, subtree: true });
    const estado = document.getElementById("firebaseSaveStatus");
    const actualizarRed = conectado => {
      if (!estado) return;
      estado.className = `firebase-status ${conectado ? "online" : "offline"}`;
      estado.textContent = conectado ? "● Guardado / sincronización activa" : "● Sin conexión; cambios pendientes";
    };
    window.addEventListener("online", () => actualizarRed(true));
    window.addEventListener("offline", () => actualizarRed(false));
    actualizarRed(navigator.onLine !== false);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar, { once: true });
  else iniciar();
})();
