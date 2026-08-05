// ==========================================
// CONFIGURACIÓN Y VARIABLES GLOBALES DE ESTADO
// ==========================================
let chess = typeof Chess !== "undefined" ? new Chess() : null; // Instancia de chess.js
let explainMode = true;
let internetClockOffsetMs = 0;
let CLOCK_DEBUG = false;
let _clockDebugLastLog = 0;

// Estado del torneo / usuario
let tournamentMatchActive = false;
let tournamentCurrentGameRow = null;
let tournamentTimeoutClaimBusy = false;
let currentUser = null;

// Referencia simulada o real de Firestore (ajusta según la inicialización de tu app)
function gamesCollectionRef() {
  if (typeof db !== "undefined" && db) {
    return db.collection("games");
  }
  console.warn("Firestore 'db' no está inicializado.");
  return {
    doc: () => ({
      update: async (data) => console.log("Simulado update doc:", data)
    })
  };
}

// ==========================================
// FUNCIONES AUXILIARES Y DE INTERFAZ (UI)
// ==========================================
function escapeHtml_(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toast(message) {
  console.log("[Toast]:", message);
  const toastEl = document.getElementById("toast");
  if (toastEl) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    setTimeout(() => toastEl.classList.remove("show"), 3000);
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function sizeFullscreenBoard() {
  const boardFrame = document.querySelector(".board-frame");
  if (!boardFrame) return;
  const size = Math.min(window.innerWidth * 0.9, window.innerHeight * 0.8);
  boardFrame.style.width = `${size}px`;
  boardFrame.style.height = `${size}px`;
}

function resetBoardFrameSize() {
  const boardFrame = document.querySelector(".board-frame");
  if (boardFrame) {
    boardFrame.style.width = "";
    boardFrame.style.height = "";
  }
}

function renderBoardAvatars_() {
  // Lógica para actualizar las imágenes/avatares del tablero
  const avatarW = document.getElementById("avatar-w");
  const avatarB = document.getElementById("avatar-b");
  if (tournamentCurrentGameRow) {
    if (avatarW) avatarW.innerText = tournamentCurrentGameRow.whiteEmail ? tournamentCurrentGameRow.whiteEmail[0].toUpperCase() : "W";
    if (avatarB) avatarB.innerText = tournamentCurrentGameRow.blackEmail ? tournamentCurrentGameRow.blackEmail[0].toUpperCase() : "B";
  }
}

function updateProfile() {
  // Actualización de la UI del perfil de usuario
  if (currentUser) {
    const nameEl = document.getElementById("user-name");
    if (nameEl) nameEl.textContent = currentUser.displayName || currentUser.email;
  }
}

function renderSavedGamesList() {
  // Lógica para listar partidas guardadas
}

function render() {
  // Renderizado principal del tablero y estado general de la interfaz
  if (chess && typeof Board !== "undefined") {
    // Código de redibujado del tablero
  }
}

window.addEventListener("resize", () => {
  if (document.body.classList.contains("fullscreen-game") || document.body.classList.contains("tournament-board-max")) {
    sizeFullscreenBoard();
  }
});

// ==========================================
// MODO EDUCATIVO Y EXPLICACIONES
// ==========================================
explainMode = localStorage.getItem("chessExplainMode") !== "off";
const explainToggle = document.getElementById("toggle-explain");
const explainToggleCfg = document.getElementById("toggle-explain-cfg");

function syncExplainUI() {
  if (explainToggle) explainToggle.checked = explainMode;
  if (explainToggleCfg) explainToggleCfg.checked = explainMode;
}

function setExplainMode(value) {
  explainMode = value;
  localStorage.setItem("chessExplainMode", value ? "on" : "off");
  syncExplainUI();
  toast(explainMode ? "💡 Explicaciones activadas" : "💡 Explicaciones desactivadas");
}

if (explainToggle) explainToggle.addEventListener("change", () => setExplainMode(explainToggle.checked));
if (explainToggleCfg) explainToggleCfg.addEventListener("change", () => setExplainMode(explainToggleCfg.checked));
syncExplainUI();

function resetEduPanel() {
  const panel = document.getElementById("edu-panel");
  if (panel) {
    panel.style.display = "none";
    panel.innerHTML = "";
  }
}

function showMoveExplanation(fenBefore, move) {
  if (!explainMode || tournamentMatchActive) return;
  const panel = document.getElementById("edu-panel");
  if (!panel) return;

  const explanation = generateExplanation(fenBefore, move);
  if (!explanation) {
    panel.style.display = "none";
    return;
  }

  panel.innerHTML = `
    <div class="edu-card">
      <div class="edu-title">💡 ¿Por qué esta jugada?</div>
      <div class="edu-body">${escapeHtml_(explanation)}</div>
    </div>
  `;
  panel.style.display = "block";
}

function generateExplanation(fenBefore, move) {
  if (!move) return "";
  const parts = [];
  const pieceNames = { p: "El peón", n: "El caballo", b: "El alfil", r: "La torre", q: "La dama", k: "El rey" };
  const pName = pieceNames[move.piece] || "La pieza";

  if (move.flags && move.flags.includes("k")) return "🛈 Enroque corto: protege al rey y activa la torre en una sola jugada.";
  if (move.flags && move.flags.includes("q")) return "🛈 Enroque largo: resguarda al rey y centraliza la torre de dama.";
  if (move.flags && move.flags.includes("p")) parts.push(`🎉 Coronación: ${pName.toLowerCase()} llegó a la última fila y se convirtió en ${move.promotion === 'q' ? 'Dama' : 'otra pieza'}.`);

  if (move.captured) {
    const capNames = { p: "un peón", n: "un caballo", b: "un alfil", r: "una torre", q: "la dama" };
    parts.push(`💥 Captura: ${pName.toLowerCase()} eliminó a ${capNames[move.captured] || "una pieza"} en ${move.to}.`);
  }

  if (move.san.includes("#")) {
    parts.push("♚ ¡Jaque mate! Esta jugada deja al rey enemigo sin escape y finaliza la partida.");
    return parts.join(" ");
  } else if (move.san.includes("+")) {
    parts.push("⚠️ Jaque: ataca directamente al rey enemigo, obligándolo a defenderse.");
  }

  if (!move.captured && !move.san.includes("+")) {
    const isCenter = ["d4", "d5", "e4", "e5"].includes(move.to);
    if (isCenter) {
      parts.push(`🎯 Control del centro: ${pName.toLowerCase()} se ubica en ${move.to} para dominar el espacio clave del tablero.`);
    } else {
      parts.push(`♟️ Desarrollo: ${pName.toLowerCase()} se mueve a ${move.to} para mejorar su actividad y alcance.`);
    }
  }

  return parts.join(" ");
}

// ==========================================
// HORAS Y SINCRONIZACIÓN DE RELOJ (NTP / SERVER)
// ==========================================
function syncedNow_() {
  return Date.now() + internetClockOffsetMs;
}

async function syncInternetClock_() {
  try {
    const start = Date.now();
    const res = await fetch("https://worldtimeapi.org/api/ip", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    const serverMs = new Date(data.utc_datetime).getTime();
    const latency = (Date.now() - start) / 2;
    internetClockOffsetMs = Math.round((serverMs + latency) - Date.now());
  } catch (e) {
    // Si falla o no hay internet, se mantiene la hora local
  }
}

syncInternetClock_();
setInterval(syncInternetClock_, 10 * 60 * 1000);

// ==========================================
// TORNEO: RELOJES Y LÓGICA DE PARTIDA
// ==========================================
function updateTournamentClockDisplay() {
  if (!tournamentMatchActive || !tournamentCurrentGameRow) return;

  const gameRow = tournamentCurrentGameRow;
  const wEl = document.getElementById("clock-w");
  const bEl = document.getElementById("clock-b");
  if (!wEl || !bEl) return;

  renderBoardAvatars_();
  const wTime = wEl.querySelector(".clock-time") || wEl;
  const bTime = bEl.querySelector(".clock-time") || bEl;

  const initialSecs = (gameRow.timeMinutes || 5) * 60;
  let wSecs = gameRow.clock ? gameRow.clock.w : initialSecs;
  let bSecs = gameRow.clock ? gameRow.clock.b : initialSecs;

  // Descuenta tiempo solo si la partida está activa y ambos entraron ("joined")
  if (gameRow.status === "active" && tournamentClockWaitingForBothPlayers() === false && gameRow.turnStartAt) {
    const elapsed = Math.max(0, Math.floor((syncedNow_() - gameRow.turnStartAt) / 1000));
    if (gameRow.fen.split(" ")[1] === "w") {
      wSecs = Math.max(0, wSecs - elapsed);
    } else {
      bSecs = Math.max(0, bSecs - elapsed);
    }
  }

  wTime.textContent = formatTime(wSecs);
  bTime.textContent = formatTime(bSecs);

  const currentTurnColor = gameRow.fen.split(" ")[1];
  wEl.classList.toggle("active", currentTurnColor === "w" && gameRow.status === "active");
  bEl.classList.toggle("active", currentTurnColor === "b" && gameRow.status === "active");

  if (CLOCK_DEBUG && Date.now() - _clockDebugLastLog > 1000) {
    _clockDebugLastLog = Date.now();
    console.log("[CLOCK_DEBUG]", {
      status: gameRow.status,
      turn: currentTurnColor,
      wSecs,
      bSecs,
      joinedW: gameRow.joinedW,
      joinedB: gameRow.joinedB,
      turnStartAt: gameRow.turnStartAt
    });
  }

  // Detección de caída de bandera por tiempo
  if (gameRow.status === "active" && !tournamentTimeoutClaimBusy) {
    if (wSecs <= 0 || bSecs <= 0) {
      const timeoutWinner = wSecs <= 0 ? "b" : "w";
      claimTournamentTimeoutWin_(timeoutWinner);
    }
  }
}

function tournamentClockWaitingForBothPlayers() {
  if (!tournamentCurrentGameRow) return true;
  return !(tournamentCurrentGameRow.joinedW && tournamentCurrentGameRow.joinedB);
}

function tournamentMyColor() {
  if (!tournamentCurrentGameRow || !currentUser) return "w";
  if (tournamentCurrentGameRow.whiteEmail === currentUser.email) return "w";
  if (tournamentCurrentGameRow.blackEmail === currentUser.email) return "b";
  return "w"; // Espectador por defecto
}

async function claimTournamentTimeoutWin_(winnerColor) {
  if (tournamentTimeoutClaimBusy || !tournamentCurrentGameRow) return;
  tournamentTimeoutClaimBusy = true;
  try {
    const gameRef = gamesCollectionRef().doc(`${tournamentCurrentGameRow.round}_${tournamentCurrentGameRow.board}`);
    await gameRef.update({
      status: "finished",
      result: winnerColor === "w" ? "1-0" : "0-1",
      winReason: "tiempo"
    });
  } catch (err) {
    console.error("Error al reclamar victoria por tiempo:", err);
  } finally {
    tournamentTimeoutClaimBusy = false;
  }
}

// Bucle de actualización del reloj del torneo
setInterval(() => {
  if (tournamentMatchActive) {
    updateTournamentClockDisplay();
  }
}, 500);

// ==========================================
// INICIALIZACIÓN
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  updateProfile();
  renderSavedGamesList();
  render();
});