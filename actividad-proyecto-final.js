(() => {
  "use strict";

  const PROJECT_ID = "proyecto-final";
  const EXAM_ID = "coloquio-examen";
  const PROJECT_KEY = "proyecto_final_entrega";
  const EXAM_KEY = "coloquio_examen_entrega";
  const TOPICS = [
    "Introducción a JavaScript", "Variables", "Tipos de datos", "Operadores",
    "Condicionales", "Funciones", "Arrays", "Objetos", "Bucles",
    "DOM", "Eventos", "Formularios", "LocalStorage", "Fetch/API",
    "Asincronía", "Módulos", "Manejo de errores", "Git y documentación"
  ];
  const QUESTIONS = [
    "¿Qué problema resuelve tu aplicación y quién es su usuario?",
    "¿Qué variables declaraste con let y cuáles con const? Justificá la decisión.",
    "¿Qué tipos de datos aparecen y cómo validás que sean correctos?",
    "¿Qué operadores son críticos para las reglas de negocio?",
    "¿Qué condicionales controlan los estados principales de la aplicación?",
    "¿Qué funciones creaste y qué responsabilidad tiene cada una?",
    "¿Qué array u objeto representa la información central del proyecto?",
    "¿Qué bucle o método de iteración usaste y por qué?",
    "¿Qué elemento del DOM modificás dinámicamente?",
    "¿Qué evento inicia el flujo principal de usuario?",
    "¿Cómo validás un formulario y cómo comunicás los errores?",
    "¿Qué dato guardás en LocalStorage y qué ventaja aporta?",
    "¿Cómo resolverías una falla de red al consultar una API?",
    "¿Qué parte del código es asíncrona y cómo manejás sus promesas?",
    "¿Qué mejorarías en modularidad, seguridad, pruebas y documentación?"
  ];

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch (_) { return fallback; }
  };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const state = () => window.obtenerEstadoAcademicoActividad?.() || { historialResultados: {}, actividadesFinalizadas: {}, notasDesafiosDocente: {}, secciones: [] };
  let remoteProject = null;
  let remoteExam = null;
  const projectData = () => ({ ...read(PROJECT_KEY, {}), ...(remoteProject || {}) });
  const examData = () => ({ ...read(EXAM_KEY, {}), ...(remoteExam || {}) });
  window.obtenerEntregasAcademicasEspeciales = () => ({
    proyectoFinal: projectData(),
    coloquioExamen: examData()
  });
  window.restaurarEntregasAcademicasEspeciales = (data = {}) => {
    remoteProject = data.proyectoFinal || null;
    remoteExam = data.coloquioExamen || null;
    if (remoteProject) write(PROJECT_KEY, remoteProject);
    if (remoteExam) write(EXAM_KEY, remoteExam);
    updateAcademicGate();
  };

  function calculateAverage() {
    const current = state();
    const grades = (current.secciones || []).map((sec) => {
      if (current.actividadesFinalizadas?.[sec.id] !== true && !localStorage.getItem(`finalized_${sec.id}`)) return null;
      const override = Number(current.notasDesafiosDocente?.[sec.id]?.nota);
      const result = current.historialResultados?.[sec.id] || {};
      const grade = Number.isFinite(override) ? override : Number(result.notaFinal ?? result.notaIA);
      return Number.isFinite(grade) ? Math.max(0, Math.min(10, grade)) : null;
    }).filter((grade) => grade !== null);
    const project = projectData();
    const projectGrade = Number(project.confirmedGrade ?? project.grade);
    if (project.submitted && Number.isFinite(projectGrade)) grades.push(Math.max(0, Math.min(10, projectGrade)));
    return grades.length ? Number((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2)) : null;
  }

  function gradeProject(code, checks) {
    const normalized = String(code || "").toLowerCase();
    const keywordHits = [
      ["let", /\blet\b/], ["const", /\bconst\b/], ["if", /\bif\b/], ["function", /\bfunction\b|=>/],
      ["array", /\[[\s\S]*\]/], ["object", /\{[\s\S]*\}/], ["loop", /\b(for|while|forEach|map|reduce)\b/],
      ["dom", /\bdocument\.|getelementbyid|queryselector/], ["event", /\.addEventListener|onclick/],
      ["form", /<form|submit|preventdefault/], ["storage", /localstorage/], ["api", /\bfetch\s*\(/],
      ["async", /\basync\b|\bawait\b|\.then\s*\(/], ["error", /\btry\b|\bcatch\b|throw new error/],
      ["module", /\bimport\b|\bexport\b/], ["docs", /readme|documentaci[oó]n|comentario|\/\/|\/\*/]
    ];
    const hits = keywordHits.filter(([, regex]) => regex.test(normalized)).length;
    const checklist = Object.values(checks || {}).filter(Boolean).length;
    const lengthScore = Math.min(1, normalized.length / 900);
    return Number(Math.max(1, Math.min(10, (hits / keywordHits.length) * 5 + (checklist / TOPICS.length) * 3 + lengthScore * 2)).toFixed(1));
  }

  function navItem(id, title, icon, onClick, hidden = false) {
    const li = document.createElement("li");
    li.id = `nav-btn-${id}`;
    li.className = "nav-item proyecto-nav-item";
    li.tabIndex = 0;
    li.setAttribute("role", "button");
    li.setAttribute("aria-label", `Abrir ${title}`);
    if (hidden) li.hidden = true;
    li.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${title}</span>`;
    li.onclick = onClick;
    li.onkeydown = (event) => {
      if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick(); }
    };
    return li;
  }

  function activate(id, title) {
    document.querySelectorAll(".section-card").forEach((card) => card.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach((item) => {
      item.classList.remove("active");
      item.setAttribute("aria-current", "false");
    });
    document.getElementById(id)?.classList.add("active");
    const button = document.getElementById(`nav-btn-${id}`);
    button?.classList.add("active");
    button?.setAttribute("aria-current", "page");
    const heading = document.getElementById("currentTitle");
    if (heading) heading.textContent = title;
  }

  function projectMarkup() {
    const saved = projectData();
    const checks = saved.checks || {};
    return `
      <h2 class="section-title"><i class="fa-solid fa-rocket"></i> Proyecto Final Integrador</h2>
      <div class="final-project-intro"><strong>Consigna:</strong> desarrollá una aplicación web funcional que resuelva una necesidad educativa del IPEM 146 e integre los 18 temas trabajados en los desafíos anteriores. Incluí interfaz, validaciones, persistencia, asincronía, manejo de errores, módulos y documentación. Presentá el código y explicá las decisiones técnicas.</div>
      <div class="final-project-grid">
        <section><h3>Checklist de integración</h3><div class="final-project-checks">${TOPICS.map((topic, index) => `<label><input type="checkbox" data-project-topic="${index}" ${checks[index] ? "checked" : ""}> ${index + 1}. ${topic}</label>`).join("")}</div></section>
        <section><h3>Entrega del proyecto</h3><textarea id="proyectoFinalCodigo" rows="16" placeholder="Pegá aquí el código principal o una síntesis ejecutable de tu proyecto...">${esc(saved.code || "")}</textarea><button class="btn btn-primary" id="btnEntregarProyectoFinal"><i class="fa-solid fa-paper-plane"></i> Entregar proyecto final</button><div id="proyectoFinalResultado" class="final-project-result" aria-live="polite"></div></section>
      </div>`;
  }

  function examMarkup() {
    const saved = examData();
    return `
      <h2 class="section-title"><i class="fa-solid fa-user-graduate"></i> COLOQUIO-EXAMEN</h2>
      <div class="final-project-intro"><strong>Condición:</strong> este menú se habilita porque el promedio final es inferior a 7. Resolvé el desafío integrador y respondé las 15 preguntas sobre el código que presentaste.</div>
      <section class="colloquium-challenge"><h3>Desafío integrador</h3><p>Extendé tu proyecto para que permita registrar una actividad, validarla, guardarla localmente, recuperarla al recargar, mostrar un resumen de resultados y manejar un error de entrada o de red sin detener la aplicación.</p><textarea id="coloquioDesafioCodigo" rows="10" placeholder="Escribí aquí la solución o pseudocódigo detallado...">${esc(saved.challenge || "")}</textarea></section>
      <section class="colloquium-questions"><h3>Preguntas teóricas</h3>${QUESTIONS.map((question, index) => `<label><span>${index + 1}. ${question}</span><textarea rows="3" data-exam-question="${index}" placeholder="Respondé con referencias concretas a tu código...">${esc(saved.answers?.[index] || "")}</textarea></label>`).join("")}<button class="btn btn-primary" id="btnEntregarColoquio"><i class="fa-solid fa-check-double"></i> Entregar coloquio</button><div id="coloquioResultado" class="final-project-result" aria-live="polite"></div></section>`;
  }

  function ensureUi() {
    const nav = document.getElementById("navList");
    const container = document.getElementById("sectionsContainer");
    if (!nav || !container || document.getElementById(PROJECT_ID)) return Boolean(document.getElementById(PROJECT_ID));
    const projectCard = document.createElement("div");
    projectCard.id = PROJECT_ID;
    projectCard.className = "section-card";
    projectCard.innerHTML = projectMarkup();
    container.appendChild(projectCard);
    nav.appendChild(navItem(PROJECT_ID, "Proyecto Final", "fa-rocket", () => activate(PROJECT_ID, "Proyecto Final Integrador")));

    const examCard = document.createElement("div");
    examCard.id = EXAM_ID;
    examCard.className = "section-card";
    examCard.innerHTML = examMarkup();
    container.appendChild(examCard);
    nav.appendChild(navItem(EXAM_ID, "COLOQUIO-EXAMEN", "fa-user-graduate", () => activate(EXAM_ID, "COLOQUIO-EXAMEN"), true));

    document.getElementById("btnEntregarProyectoFinal").onclick = submitProject;
    document.getElementById("btnEntregarColoquio").onclick = submitExam;
    projectCard.querySelectorAll("[data-project-topic]").forEach((input) => input.addEventListener("change", () => {
      const project = projectData(); project.checks = project.checks || {}; project.checks[input.dataset.projectTopic] = input.checked; write(PROJECT_KEY, project);
      window.solicitarGuardadoActividad?.();
    }));
    updateAcademicGate();
    return true;
  }

  function submitProject() {
    const code = document.getElementById("proyectoFinalCodigo")?.value || "";
    const checks = Object.fromEntries([...document.querySelectorAll("[data-project-topic]")].map((input) => [input.dataset.projectTopic, input.checked]));
    const grade = gradeProject(code, checks);
    write(PROJECT_KEY, { ...projectData(), code, checks, grade, submitted: true, submittedAt: new Date().toISOString(), gradeConfirmed: false, confirmedGrade: null });
    document.getElementById("proyectoFinalResultado").innerHTML = `<strong>Proyecto entregado. Nota integradora: ${grade}/10.</strong><span>El promedio final se recalculó con las actividades evaluadas y este proyecto.</span>`;
    window.solicitarGuardadoActividad?.();
    updateAcademicGate();
  }

  function submitExam() {
    const challenge = document.getElementById("coloquioDesafioCodigo")?.value || "";
    const answers = [...document.querySelectorAll("[data-exam-question]")].map((input) => input.value);
    const answered = answers.filter((answer) => answer.trim().length >= 20).length;
    const grade = Number(((answered / QUESTIONS.length) * 10).toFixed(1));
    write(EXAM_KEY, { ...examData(), challenge, answers, grade, submitted: true, submittedAt: new Date().toISOString(), gradeConfirmed: false, confirmedGrade: null });
    document.getElementById("coloquioResultado").innerHTML = `<strong>Coloquio entregado: ${grade}/10 (${answered}/${QUESTIONS.length} respuestas desarrolladas).</strong><span>El docente podrá revisar y confirmar la calificación.</span>`;
    window.solicitarGuardadoActividad?.();
  }

  function updateAcademicGate() {
    const average = calculateAverage();
    const button = document.getElementById(`nav-btn-${EXAM_ID}`);
    const card = document.getElementById(EXAM_ID);
    if (!button || !card) return;
    const enabled = average !== null && average < 7;
    button.hidden = !enabled;
    if (!enabled) card.classList.remove("active");
    const result = document.getElementById("proyectoFinalResultado");
    if (result && read(PROJECT_KEY, {}).submitted) result.innerHTML = `<strong>Promedio final actual: ${average === null ? "pendiente" : `${average}/10`}.</strong>${enabled ? "<span>Se habilitó COLOQUIO-EXAMEN por promedio inferior a 7.</span>" : "<span>No se requiere coloquio con el promedio actual.</span>"}`;
  }

  const boot = () => {
    if (!ensureUi()) return;
    updateAcademicGate();
    if (!window.__proyectoFinalWrapped) {
      const original = window.renderInformeVisualEstudiante;
      if (typeof original === "function") {
        window.renderInformeVisualEstudiante = function (...args) { const result = original.apply(this, args); updateAcademicGate(); return result; };
      }
      window.__proyectoFinalWrapped = true;
    }
  };
  const timer = setInterval(() => { boot(); if (document.getElementById(PROJECT_ID)) clearInterval(timer); }, 250);
  document.addEventListener("DOMContentLoaded", boot, { once: true });
})();
