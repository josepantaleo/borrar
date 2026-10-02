(() => {
  "use strict";
  if (window.__actividadPedagogiaInicializada) return;
  window.__actividadPedagogiaInicializada = true;

  const texto = value => String(value ?? "").trim();
  const corregirCodificacion = value => {
    let actual = String(value ?? "");
    for (let ronda = 0; ronda < 3 && /[\u00c3\u00c2\u00e2\u00ef\u00ufffd]/.test(actual); ronda += 1) {
      try {
        const bytes = Uint8Array.from([...actual].map(caracter => {
          const codigo = caracter.codePointAt(0);
          return codigo <= 0xff ? codigo : codigo & 0xff;
        }));
        const corregido = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        if (!corregido || corregido === actual) break;
        actual = corregido;
      } catch (_) {
        break;
      }
    }
    return actual;
  };
  const escapeHtml = value => texto(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));

  function normalizarTextoVisible(root = document.body) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodos = [];
    while (walker.nextNode()) nodos.push(walker.currentNode);
    nodos.forEach(node => {
      const corregido = corregirCodificacion(node.nodeValue);
      if (corregido !== node.nodeValue) node.nodeValue = corregido;
    });
    root.querySelectorAll?.("[title],[aria-label],[placeholder]").forEach(elemento => {
      ["title", "aria-label", "placeholder"].forEach(atributo => {
        if (!elemento.hasAttribute(atributo)) return;
        const actual = elemento.getAttribute(atributo);
        const corregido = corregirCodificacion(actual);
        if (actual !== corregido) elemento.setAttribute(atributo, corregido);
      });
    });
  }

  function obtenerSectionId(origen = null) {
    return origen?.closest?.("[data-section-id]")?.dataset.sectionId ||
      window.obtenerSeccionActivaEstudiante?.() ||
      document.body.dataset.sectionId || "general";
  }

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
      obtenerSectionId(origen),
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
    Object.keys(pesos).forEach(clave => {
      pesos[clave] = Number.isFinite(Number(pesos[clave])) && Number(pesos[clave]) > 0
        ? Number(pesos[clave]) : 0;
    });
    const componentes = Object.fromEntries(Object.entries(pesos).map(([clave, peso]) => {
      const valor = Number(evidencia[clave]);
      return [clave, { peso, puntaje: Number.isFinite(valor) ? Math.max(0, Math.min(10, valor)) : null }];
    }));
    const disponibles = Object.values(componentes).filter(item => item.puntaje !== null && item.peso > 0);
    const evidenciaMinima = ["codigo", "sintaxis", "pruebas"].every(clave => componentes[clave]?.puntaje !== null);
    if (!disponibles.length || !evidenciaMinima) return { nota: null, evidenciaInsuficiente: true, componentes };
    const totalPeso = disponibles.reduce((sum, item) => sum + item.peso, 0);
    const nota = disponibles.reduce((sum, item) => sum + item.puntaje * item.peso, 0) / totalPeso;
    return { nota: Number(nota.toFixed(2)), evidenciaInsuficiente: disponibles.length < 4, componentes };
  };

  async function congelarEntregaDefinitivaActual(sectionId = "") {
    const uid = window.firebaseCurrentUser?.uid;
    const activo = sectionId || window.obtenerSeccionActivaEstudiante?.() ||
      document.body.dataset.sectionId || "general";
    if (!uid || !window.guardarEntregaDefinitivaFirebase) return null;
    const evidencia = window.obtenerEvidenciaEntregaEstudiante?.(activo) || {
      codigo: document.getElementById(`editor-${activo}`)?.value || "",
      pruebas: [],
      respuestas: {},
      errores: [],
      intento: 1
    };
    if (!String(evidencia.codigo || "").trim()) return { ok: false, error: "codigo-vacio" };
    const resultado = await window.guardarEntregaDefinitivaFirebase(uid, activo, evidencia);
    if (resultado?.ok || resultado?.congelada) {
      const boton = document.getElementById(`btn-ai-${activo}`);
      if (boton) {
        boton.dataset.entregaCongelada = "true";
        boton.disabled = true;
      }
    }
    return resultado;
  }
  window.congelarEntregaDefinitivaActual = congelarEntregaDefinitivaActual;

  function congelarEntrega() {
    const boton = document.querySelector("[data-entrega-definitiva], #btnEntregar, #btnEntregarActividad");
    if (!boton || boton.dataset.pedagogiaBound) return;
    boton.dataset.pedagogiaBound = "true";
    boton.addEventListener("click", async () => {
      if (boton.dataset.entregaCongelada === "true") return;
      const resultado = await congelarEntregaDefinitivaActual(obtenerSectionId(boton));
      if (resultado?.ok || resultado?.congelada) {
        boton.dataset.entregaCongelada = "true";
        boton.disabled = true;
        boton.title = "La entrega definitiva está congelada";
      }
    });
  }

  function iniciar() {
    normalizarTextoVisible();
    agregarBotonesExplicacion();
    congelarEntrega();
    window.addEventListener("colaboracion-aceptada", event => {
      const sectionId = event.detail?.sectionId;
      if (sectionId && typeof window.switchSection === "function") window.switchSection(sectionId);
      if (sectionId && window.CSS?.escape) {
        document.querySelector(`[data-section-id="${CSS.escape(sectionId)}"]`)?.scrollIntoView?.({ block: "nearest" });
      }
      window.setTimeout(() => window.iniciarColaboracionCRDTEstudiante?.(), 0);
    });
    new MutationObserver(() => {
      agregarBotonesExplicacion();
      congelarEntrega();
      normalizarTextoVisible();
    }).observe(document.body, { childList: true, subtree: true });
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
