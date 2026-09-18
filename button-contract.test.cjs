const fs = require("fs");
const assert = require("assert");

const archivos = [
  "actividad.html",
  "actividad-app.js",
  "actividad-firebase.js",
  "actividad-cooperacion.js",
  "mejoras-seguimiento.js",
  "panel-profesor.js"
];
const fuentes = Object.fromEntries(
  archivos.map(nombre => [nombre, fs.readFileSync(nombre, "utf8")])
);
const codigo = Object.values(fuentes).join("\n");
const llamadas = new Map();
const ignoradas = new Set([
  "alert", "confirm", "prompt", "setTimeout", "clearTimeout",
  "event", "this", "document", "window", "console", "Math", "Date"
]);

for (const [archivo, fuente] of Object.entries(fuentes)) {
  const expresiones = [
    ...fuente.matchAll(/\bonclick\s*=\s*["']([^"']+)["']/gi),
    ...fuente.matchAll(/\.onclick\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*([^;\n]+)/g)
  ];
  for (const coincidencia of expresiones) {
    const expresion = coincidencia[1] || "";
    for (const llamada of expresion.matchAll(/(?<!\.)\b([A-Za-z_$][\w$]*)\s*\(/g)) {
      const nombre = llamada[1];
      if (ignoradas.has(nombre) || ["if", "for", "while", "switch", "catch", "Number", "String", "Boolean"].includes(nombre)) continue;
      if (!llamadas.has(nombre)) llamadas.set(nombre, new Set());
      llamadas.get(nombre).add(archivo);
    }
  }
}

function estaDefinida(nombre) {
  const escaped = nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return [
    new RegExp(`\\bfunction\\s+${escaped}\\s*\\(`),
    new RegExp(`\\b(?:const|let|var)\\s+${escaped}\\s*=`),
    new RegExp(`\\bwindow\\.${escaped}\\s*=`),
    new RegExp(`\\bwindow\\[['"]${escaped}['"]\\]\\s*=`)
  ].some(patron => patron.test(codigo));
}

const faltantes = [...llamadas]
  .filter(([nombre]) => !estaDefinida(nombre))
  .map(([nombre, origenes]) => `${nombre} (${[...origenes].join(", ")})`);

const ids = [...fuentes["actividad.html"].matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)]
  .map(item => item[1]);
const duplicados = [...new Set(ids.filter((id, indice) => ids.indexOf(id) !== indice))];
const botonesSinTipo = [];
for (const [archivo, fuente] of Object.entries(fuentes)) {
  for (const item of fuente.matchAll(/<button\b[^>]*>/gi)) {
    if (!/\btype\s*=/.test(item[0])) {
      const linea = fuente.slice(0, item.index).split(/\r?\n/).length;
      botonesSinTipo.push(`${archivo}:${linea}`);
    }
  }
}

assert.deepStrictEqual(faltantes, [], `Funciones de botones inexistentes:\n${faltantes.join("\n")}`);
assert.deepStrictEqual(duplicados, [], `IDs duplicados en actividad.html:\n${duplicados.join("\n")}`);
assert.deepStrictEqual(botonesSinTipo, [], `Botones sin type="button": ${botonesSinTipo.join(", ")}`);
console.log(`Contrato de botones: OK (${llamadas.size} funciones, ${ids.length} IDs revisados)`);
