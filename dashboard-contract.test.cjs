const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const read = file => fs.readFileSync(path.join(root, file), "utf8");
const html = read("actividad.html");
const mejoras = read("mejoras-seguimiento.js");
const firebase = read("actividad-firebase.js");

const checks = [
  ["contenedor del tablero", html.includes('id="tableroCursoProfesor"')],
  ["resumen de seis métricas", html.includes("tableroCursoResumen") && mejoras.includes("Progreso medio") && mejoras.includes("Nota media")],
  ["filtros académicos y de actividad", mejoras.includes("tableroFiltroCurso") && mejoras.includes("tableroFiltroActividad") && mejoras.includes("tableroFiltroDificultad")],
  ["orden por métricas", mejoras.includes("progreso-desc") && mejoras.includes("nota-desc") && mejoras.includes("actividad-desc") && mejoras.includes("alertas-desc")],
  ["detalle del estudiante", mejoras.includes("tableroCursoDetalle") && mejoras.includes("btn-tablero-detalle")],
  ["exportación CSV", html.includes("btnExportarTableroCurso") && mejoras.includes("exportarTableroCursoCsv")],
  ["estado vacío", mejoras.includes("Ningún estudiante coincide") && mejoras.includes("No hay datos disponibles")],
  ["consulta condicionada a autorización docente", firebase.includes("await window.esDocenteAutorizadoFirebase") && firebase.includes("profesor-data-error")],
  ["vista basada en estudiantes autorizados", mejoras.includes("estudiantesProfesor.map(tableroCursoRegistro")]
];

const failed = checks.filter(([, ok]) => !ok);
checks.forEach(([name, ok]) => console.log(`${ok ? "OK" : "FAIL"}: ${name}`));
if (failed.length) process.exit(1);
console.log("Contrato del tablero docente verificado.");
