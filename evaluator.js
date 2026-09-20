"use strict";

const acorn = require("acorn");
const walk = require("acorn-walk");
const { getChallenge } = require("./challenges");

const MAX_CODE_LENGTH = 12000;
const TOKEN_PATTERNS = Object.freeze({
  "console.log": /console\s*\.\s*log\s*\(/,
  "Date": /\bDate\s*\(/,
  "const": /\bconst\b/,
  "let": /\blet\b/,
  "typeof": /\btypeof\b/,
  "&&": /&&/,
  "if": /\bif\s*\(/,
  "else": /\belse\b/,
  "for": /\bfor\s*\(/,
  "push": /\.push\s*\(/,
  "shift": /\.shift\s*\(/,
  "length": /\.length\b/,
  "reduce": /\.reduce\s*\(/,
  "filter": /\.filter\s*\(/,
  "trim": /\.trim\s*\(/,
  "toLowerCase": /\.toLowerCase\s*\(/,
  "replace": /\.replace\s*\(/,
  "innerText": /\.innerText\b/,
  "style": /\.style\b/,
  "JSON.parse": /\bJSON\s*\.\s*parse\s*\(/,
  "Error": /\bnew\s+Error\s*\(/,
  "mockLocalStorage": /\bmockLocalStorage\b/,
  "alumno": /\balumno\b/,
  "obtenerEstado": /\bobtenerEstado\b/,
  "calcularAhorroEgresados": /\bcalcularAhorroEgresados\b/,
  "generarCorreo": /\bgenerarCorreo\b/,
  "actualizarAnuncio": /\bactualizarAnuncio\b/,
  "validarInscripcion": /\bvalidarInscripcion\b/,
  "guardarPref": /\bguardarPref\b/,
  "obtenerPref": /\bobtenerPref\b/,
  "registrarNota": /\bregistrarNota\b/,
  "SalaInformatica": /\bSalaInformatica\b/,
  "reservarCompu": /\breservarCompu\b/,
  "centroEstudiantes": /\bcentroEstudiantes\b/,
  "generarReporte": /\bgenerarReporte\b/
});

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function round(value, digits = 1) {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function tokenPresent(source, token) {
  const pattern = TOKEN_PATTERNS[token];
  if (pattern) return pattern.test(source);
  return new RegExp(`\\b${String(token).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(source);
}

function astTokenPresent(ast, token, identifiers) {
  let found = false;
  walk.simple(ast, {
    VariableDeclaration(node) {
      if (node.kind === token) found = true;
    },
    LogicalExpression(node) {
      if (node.operator === token) found = true;
    },
    IfStatement(node) {
      if (token === "if" || (token === "else" && node.alternate)) found = true;
    },
    ForStatement() {
      if (token === "for") found = true;
    },
    CallExpression(node) {
      const callee = node.callee;
      if (token === "console.log" &&
          callee?.type === "MemberExpression" &&
          !callee.computed &&
          callee.object?.type === "Identifier" &&
          callee.object.name === "console" &&
          callee.property?.name === "log") found = true;
      if (token === "JSON.parse" &&
          callee?.type === "MemberExpression" &&
          !callee.computed &&
          callee.object?.name === "JSON" &&
          callee.property?.name === "parse") found = true;
      if (callee?.type === "MemberExpression" && !callee.computed &&
          callee.property?.name === token) found = true;
      if (callee?.type === "Identifier" && callee.name === token) found = true;
    },
    NewExpression(node) {
      if (node.callee?.type === "Identifier" && node.callee.name === token) found = true;
    },
    MemberExpression(node) {
      if (!node.computed && node.property?.type === "Identifier" &&
          node.property.name === token) found = true;
    },
    Identifier(node) {
      if (node.name === token) found = true;
    }
  });
  return found || identifiers?.has(token) === true;
}

function analyzeCode(sectionId, code) {
  const challenge = getChallenge(sectionId);
  if (!challenge) {
    const error = new Error("unknown-section");
    error.code = "unknown-section";
    throw error;
  }

  const source = String(code || "");
  if (!source.trim()) {
    return buildEmptyEvaluation(challenge, "El editor está vacío.");
  }
  if (source.length > MAX_CODE_LENGTH) {
    const error = new Error("code-too-large");
    error.code = "code-too-large";
    throw error;
  }

  let ast;
  try {
    ast = acorn.parse(source, {
      ecmaVersion: "latest",
      sourceType: "script",
      allowAwaitOutsideFunction: false
    });
  } catch (error) {
    return buildSyntaxErrorEvaluation(challenge, error);
  }

  const nodeCounts = new Map();
  const identifiers = new Set();
  let maximumDepth = 0;
  walk.fullAncestor(ast, (node, _state, ancestors) => {
    nodeCounts.set(node.type, (nodeCounts.get(node.type) || 0) + 1);
    maximumDepth = Math.max(maximumDepth, ancestors.length);
    if (node.type === "Identifier") identifiers.add(node.name);
  });

  const nodeEvidence = challenge.requiredNodeTypes.map(type => ({
    requirement: type,
    passed: (nodeCounts.get(type) || 0) > 0
  }));
  const tokenEvidence = challenge.requiredTokens.map(token => ({
    requirement: token,
    passed: astTokenPresent(ast, token, identifiers)
  }));
  const allEvidence = [...nodeEvidence, ...tokenEvidence];
  const passedRequirements = allEvidence.filter(item => item.passed).length;
  const requirementRatio = allEvidence.length ? passedRequirements / allEvidence.length : 1;
  const statementCount = [...nodeCounts.entries()].reduce((total, [type, count]) =>
    total + (type.endsWith("Statement") || type === "VariableDeclaration" ? count : 0), 0
  );
  const completenessRatio = clamp(statementCount / challenge.minimumStatements, 0, 1);

  const variableNames = [];
  walk.simple(ast, {
    VariableDeclarator(node) {
      if (node.id?.type === "Identifier") variableNames.push(node.id.name);
    },
    FunctionDeclaration(node) {
      if (node.id?.name) variableNames.push(node.id.name);
    }
  });
  const descriptiveNames = variableNames.filter(name =>
    name.length >= 3 && !/^(x|y|z|a|b|c|n|i|j|k|dato|valor)\d*$/i.test(name)
  ).length;
  const namingRatio = variableNames.length ? descriptiveNames / variableNames.length : 0.6;
  const hasPendingMarkers = /\b(TODO|FIXME)\b|completar|tu c[oó]digo/i.test(source);
  const usesVar = /\bvar\b/.test(source);
  const longLines = source.split(/\r?\n/).filter(line => line.length > 120).length;
  const emptyBlocks = (nodeCounts.get("BlockStatement") || 0) === 0;
  const repeatedDeclarations = variableNames.length - new Set(variableNames).size;
  const qualityRatio = clamp(
    0.35 +
    namingRatio * 0.35 +
    (usesVar ? 0 : 0.1) +
    (longLines ? 0 : 0.1) +
    (hasPendingMarkers ? 0 : 0.1) +
    (emptyBlocks ? -0.1 : 0) +
    (repeatedDeclarations > 0 ? -0.05 : 0),
    0,
    1
  );

  const syntaxPoints = 25;
  const requirementsPoints = round(55 * requirementRatio, 1);
  const qualityPoints = round(20 * qualityRatio, 1);
  let score = round((syntaxPoints + requirementsPoints + qualityPoints) / 10, 1);
  const limits = [];
  if (completenessRatio < 1) {
    score = Math.min(score, 6);
    limits.push("La solución tiene menos instrucciones principales que las esperadas.");
  }
  if (requirementRatio < 0.5) {
    score = Math.min(score, 5);
    limits.push("Faltan más de la mitad de las estructuras obligatorias.");
  }
  if (hasPendingMarkers) {
    score = Math.min(score, 7);
    limits.push("Persisten marcadores de código pendiente.");
  }
  if (emptyBlocks) {
    limits.push("No se detectaron bloques de instrucciones completos.");
  }
  score = round(clamp(score, 1, 10), 1);

  const missing = allEvidence.filter(item => !item.passed).map(item => item.requirement);
  const confidence = round(clamp((requirementRatio * 0.65) + (qualityRatio * 0.2) + 0.15, 0, 1), 3);
  const requiereRevision = confidence < 0.65 || requirementRatio < 0.6 || hasPendingMarkers || score < 6;
  return {
    nota: score,
    porcentaje: round(score * 10, 1),
    verificadaServidor: true,
    versionEvaluador: "server-ast-v2",
    confianza: confidence,
    requiereRevision,
    criterios: [
      {
        id: "sintaxis",
        nombre: "Sintaxis verificable",
        peso: 25,
        puntos: syntaxPoints,
        estado: "cumplido",
        evidencia: "El servidor pudo analizar el código como JavaScript válido."
      },
      {
        id: "requisitos",
        nombre: "Requisitos del desafío",
        peso: 55,
        puntos: requirementsPoints,
        estado: requirementRatio >= 0.8 ? "cumplido" : requirementRatio >= 0.45 ? "parcial" : "pendiente",
        evidencia: `${passedRequirements}/${allEvidence.length} estructuras o identificadores obligatorios detectados.`
      },
      {
        id: "calidad",
        nombre: "Calidad y claridad",
        peso: 20,
        puntos: qualityPoints,
        estado: qualityRatio >= 0.8 ? "cumplido" : qualityRatio >= 0.45 ? "parcial" : "pendiente",
        evidencia: "Se revisaron nombres, líneas extensas, uso de var y marcadores pendientes."
      }
    ],
    fortalezas: [
      "La sintaxis es válida.",
      ...(requirementRatio >= 0.8 ? ["La mayoría de los requisitos estructurales está presente."] : [])
    ],
    mejoras: missing.length
      ? [`Incorporar o revisar: ${missing.slice(0, 5).join(", ")}.`]
      : ["Probar casos normales y casos límite antes de la revisión docente."],
    limites: limits,
    advertencias: [
      "Evaluación automática del servidor: no ejecuta código no confiable y requiere confirmación docente.",
      `Confianza del análisis: ${round(confidence * 100, 1)}%.`,
      ...(requiereRevision ? ["Se recomienda revisión docente antes de confirmar la nota."] : []),
      ...limits
    ],
    sintaxis: { valida: true, error: "" },
    ejecucion: {
      intentada: false,
      ok: false,
      salida: "",
      salidaEsperada: "",
      similitudSalida: 0,
      error: "El backend seguro no ejecuta código del estudiante."
    },
    conceptos: allEvidence.map(item => ({
      nombre: item.requirement,
      cumple: item.passed,
      evidencia: item.passed ? "Detectado por el analizador del servidor." : "No detectado por el analizador del servidor."
    })),
    metricas: {
      sentenciasPrincipales: statementCount,
      profundidadAst: maximumDepth,
      requisitos: round(requirementRatio, 3),
      calidad: round(qualityRatio, 3),
      comportamiento: 0,
      referencia: round(requirementRatio, 3),
      nombresExigidos: round(requirementRatio, 3),
      confianza: confidence
    }
  };
}

function buildEmptyEvaluation(challenge, reason) {
  return {
    nota: 1,
    porcentaje: 10,
    verificadaServidor: true,
    versionEvaluador: "server-ast-v2",
    confianza: 0,
    requiereRevision: true,
    criterios: [],
    fortalezas: [],
    mejoras: [reason],
    limites: ["Editor vacío: nota máxima 1."],
    advertencias: ["Evaluación automática del servidor: requiere confirmación docente."],
    sintaxis: { valida: false, error: reason },
    ejecucion: { intentada: false, ok: false, salida: "", salidaEsperada: "", similitudSalida: 0, error: reason },
    conceptos: challenge.concepts.map(nombre => ({ nombre, cumple: false, evidencia: "Sin código para analizar." })),
    metricas: { requisitos: 0, calidad: 0, comportamiento: 0, referencia: 0, nombresExigidos: 0, confianza: 0 }
  };
}

function buildSyntaxErrorEvaluation(challenge, parseError) {
  const message = String(parseError?.message || "Error de sintaxis").slice(0, 300);
  const evaluation = buildEmptyEvaluation(challenge, message);
  evaluation.nota = 2;
  evaluation.porcentaje = 20;
  evaluation.limites = ["Error de sintaxis: nota máxima 3."];
  evaluation.sintaxis = { valida: false, error: message };
  return evaluation;
}

module.exports = { MAX_CODE_LENGTH, analyzeCode };
