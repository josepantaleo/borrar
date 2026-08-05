"use strict";

// Nota: formatTime, capitalizeFirst, dayOfYear, cpToWin, classifyLoss
// y levelLabel vienen de utils.js, cargado como <script> clásico
// ANTES que este archivo en index.html (ya no se usa import de
// módulos ES para poder abrir la app con doble clic, sin servidor).

// PWA: registra el service worker que cachea el "app shell" (ver
// sw.js) para que la app se pueda instalar y las lecciones/
// ejercicios funcionen sin conexión. Los "if" de abajo evitan
// romper en navegadores viejos sin soporte, o si se abre el
// archivo directo desde disco (file://) en vez de servido por http.
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Silencioso: si falla el registro (por ejemplo, servidor sin
      // HTTPS en un dominio que no sea localhost), la app sigue
      // funcionando normal, solo sin instalación/offline.
    });
  });
}

// Instrumentación temporal de rendimiento (mediciones con
// performance.now/JSON.stringify y sus console.log asociados), usada
// en su momento para diagnosticar cuellos de botella en el torneo.
// Queda apagada por defecto para no gastar CPU en la ruta crítica en
// producción; para reactivarla al depurar, poner esto en true.
const PERF_DEBUG = false;

// Instrumentación temporal para diagnosticar el bug reportado de
// "los cronómetros de la partida de torneo no cuentan hacia atrás".
// Loguea, como máximo una vez por segundo, el estado exacto que usa
// updateTournamentClockDisplay() para decidir si mueve el número o
// no, más el momento en que se marca "joined" y el momento en que se
// escribe turnStartAt en cada jugada. Poner en false para apagarlo
// (o borrar este bloque y los bloques marcados "CLOCK_DEBUG" más
// abajo una vez encontrada la causa).
const CLOCK_DEBUG = true;
let _clockDebugLastLog = 0;

// Forward declarations para variables globales usadas en
// funciones definidas antes de su inicialización.
let state;
let matchChatPanelOpen;
let gameStarted;
let tournamentMatchActive;
let opponentMoveHighlight;
let explainMode;
let lastTournamentState;
let currentUser;
// Corrección del reloj de este dispositivo contra la hora real de
// Internet (ver syncInternetClock_ más abajo), no contra turnStartAt
// ni contra el reloj propio de la máquina.
let internetClockOffsetMs = 0;
const TOURNAMENT_ADMIN_EMAIL = "ipem146centenario@gmail.com";

function syncedNow_() {
  return Date.now() + internetClockOffsetMs;
}

async function syncInternetClock_() {
  try {
    const start = Date.now();
    const res = await fetch("https://worldtimeapi.org/api/ip", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const serverMs = new Date(data.datetime).getTime();
      const latency = (Date.now() - start) / 2;
      internetClockOffsetMs = (serverMs + latency) - Date.now();
      if (CLOCK_DEBUG) console.log("[CLOCK_DEBUG] Internet clock offset synced:", internetClockOffsetMs, "ms");
    }
  } catch (err) {
    if (CLOCK_DEBUG) console.log("[CLOCK_DEBUG] Fallback to local clock:", err);
  }
}

// =========================
// FEEDBACK TÁCTIL (sin el flash gris de Android/Chrome)
// =========================
(function injectTapFeedbackStyles_() {
  const style = document.createElement("style");
  style.textContent = `
    html, *, *::before, *::after {
      -webkit-tap-highlight-color: transparent;
    }
    button, .btn, a, [role="button"], .avatar-bubble, .avatar-option {
      touch-action: manipulation;
    }
    button:active,
    .btn:active,
    .avatar-option:active,
    .avatar-bubble:active {
      transform: scale(0.96);
      opacity: 0.85;
      transition: transform 0.08s ease-out, opacity 0.08s ease-out;
    }
  `;
  document.head.appendChild(style);
})();

const PIECES = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟"
};

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

// =========================
// AVATARES ANIMADOS (mascotas)
// =========================
const AVATAR_MASCOTS = {
  knight:  { emoji: "♞", label: "Caballo saltarín", anim: "avatar-bounce",  color1: "#7c3aed", color2: "#a78bfa" },
  pawn:    { emoji: "♟", label: "Peón valiente",    anim: "avatar-wiggle",  color1: "#2563eb", color2: "#60a5fa" },
  rook:    { emoji: "♜", label: "Torre firme",      anim: "avatar-pulse",   color1: "#059669", color2: "#34d399" },
  bishop:  { emoji: "♝", label: "Alfil astuto",     anim: "avatar-tilt",    color1: "#d97706", color2: "#fbbf24" },
  queen:   { emoji: "♛", label: "Dama veloz",       anim: "avatar-spin",    color1: "#db2777", color2: "#f472b6" },
  king:    { emoji: "♚", label: "Rey sabio",        anim: "avatar-nod",     color1: "#dc2626", color2: "#f87171" },
};

let avatarStylesInjected = false;
function injectAvatarStyles_() {
  if (avatarStylesInjected) return;
  avatarStylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    .avatar-bubble {
      display: inline-flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; border-radius: 50%;
      font-size: 18px; line-height: 1; cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,.25);
      border: 2px solid rgba(255,255,255,.6);
      vertical-align: middle; margin-right: 8px;
      user-select: none; flex-shrink: 0;
      transition: transform 0.15s ease-out;
    }
    .avatar-bubble.large { width: 54px; height: 54px; font-size: 28px; }
    .avatar-bubble.static { animation: none !important; }
    .avatar-bubble:hover { transform: scale(1.08); }
    @keyframes avatar-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    @keyframes avatar-wiggle { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }
    @keyframes avatar-pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }
    @keyframes avatar-tilt   { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(14deg)} }
    @keyframes avatar-spin   { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }
    @keyframes avatar-nod    { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(2px) rotate(-4deg)} }
    .avatar-bounce { animation: avatar-bounce 1.1s ease-in-out infinite; }
    .avatar-wiggle { animation: avatar-wiggle 1.4s ease-in-out infinite; }
    .avatar-pulse  { animation: avatar-pulse 1.3s ease-in-out infinite; }
    .avatar-tilt   { animation: avatar-tilt 1.6s ease-in-out infinite; }
    .avatar-spin   { animation: avatar-spin 3.2s linear infinite; }
    .avatar-nod    { animation: avatar-nod 1.2s ease-in-out infinite; }
    @media (prefers-reduced-motion: reduce) {
      .avatar-bounce, .avatar-wiggle, .avatar-pulse,
      .avatar-tilt, .avatar-spin, .avatar-nod { animation: none; }
      .avatar-bubble:hover { transform: none; }
    }
    #avatar-picker-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,.55);
      display: flex; align-items: center; justify-content: center;
      z-index: 9999;
    }
    #avatar-picker-box {
      background: var(--surface, #1e1e2e); color: var(--text, #fff);
      padding: 20px; border-radius: 14px;
      max-width: 320px; width: 90%; text-align: center;
      box-shadow: 0 10px 30px rgba(0,0,0,.4);
    }
    #avatar-picker-box h3 { margin: 0 0 12px; font-size: 16px; }
    #avatar-picker-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
      margin-bottom: 14px;
    }
    .avatar-option {
      display: flex; flex-direction: column; align-items: center; gap: 6px;
      padding: 8px 4px; border-radius: 10px; cursor: pointer;
      border: 2px solid transparent;
      transition: background-color 0.15s ease-out, border-color 0.15s ease-out;
    }
    .avatar-option:hover { background: var(--surface2, rgba(255,255,255,.08)); }
    .avatar-option.selected { border-color: var(--accent, #fff); background: var(--surface2, rgba(255,255,255,.08)); }
    .avatar-option:focus-visible {
      outline: 2px solid var(--accent, #fff);
      outline-offset: 2px;
    }
    .avatar-option span.opt-label { font-size: 11px; opacity: .85; }
    #avatar-picker-close {
      background: var(--surface2, #444); color: var(--text, #fff); border: none; border-radius: 8px;
      padding: 8px 16px; cursor: pointer; font-size: 13px;
      transition: filter 0.15s ease-out;
    }
    #avatar-picker-close:hover { filter: brightness(1.15); }
    #avatar-picker-close:focus-visible {
      outline: 2px solid var(--accent, #fff);
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
}

function avatarBubbleHTML_(id, opts = {}) {
  const m = AVATAR_MASCOTS[id] || AVATAR_MASCOTS.knight;
  const size = opts.large ? " large" : "";
  const still = opts.static ? " static" : "";
  const grad = `linear-gradient(135deg, ${m.color1}, ${m.color2})`;
  return `<span class="avatar-bubble${size}${still} ${m.anim}" style="background:${grad}" title="${escapeHtml_(m.label)}">${m.emoji}</span>`;
}

function renderMiniAvatar() {
  injectAvatarStyles_();
  const nameEl = document.getElementById("mini-name");
  if (!nameEl) return;
  let holder = document.getElementById("mini-avatar");
  if (!holder) {
    holder = document.createElement("span");
    holder.id = "mini-avatar";
    nameEl.parentNode.insertBefore(holder, nameEl);
  }
  holder.innerHTML = avatarBubbleHTML_(state.avatar || "knight");
  holder.onclick = openAvatarPicker;
  const bubble = holder.querySelector(".avatar-bubble");
  if (bubble) bubble.onclick = openAvatarPicker;
}

function renderBoardAvatars_() {
  injectAvatarStyles_();
  const wEl = document.getElementById("clock-w");
  const bEl = document.getElementById("clock-b");
  [wEl, bEl].forEach((el) => {
    if (!el) return;
    let av = el.querySelector(".avatar-bubble");
    if (!av) {
      el.insertAdjacentHTML("afterbegin", avatarBubbleHTML_(state.avatar || "knight"));
    }
  });
}

function openAvatarPicker() {
  injectAvatarStyles_();
  closeAvatarPicker_();
  const backdrop = document.createElement("div");
  backdrop.id = "avatar-picker-backdrop";
  const current = state.avatar || "knight";
  const options = Object.keys(AVATAR_MASCOTS).map((id) => {
    const sel = id === current ? " selected" : "";
    return `
      <div class="avatar-option${sel}" data-avatar="${id}" tabindex="0" role="button" aria-pressed="${id === current}" aria-label="${escapeHtml_(AVATAR_MASCOTS[id].label)}">
        ${avatarBubbleHTML_(id, { large: true })}
        <span class="opt-label">${escapeHtml_(AVATAR_MASCOTS[id].label)}</span>
      </div>`;
  }).join("");
  backdrop.innerHTML = `
    <div id="avatar-picker-box">
      <h3>🐴 Elegí tu mascota</h3>
      <div id="avatar-picker-grid">${options}</div>
      <button id="avatar-picker-close">Cerrar</button>
    </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeAvatarPicker_();
  });
  document.addEventListener("keydown", handleAvatarPickerEscape_);
  const chooseAvatar = (opt) => {
    state.avatar = opt.dataset.avatar;
    save();
    renderMiniAvatar();
    renderBoardAvatars_();
    closeAvatarPicker_();
    toast("✓ Mascota actualizada");
  };
  backdrop.querySelectorAll(".avatar-option").forEach((opt) => {
    opt.addEventListener("click", () => chooseAvatar(opt));
    opt.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        chooseAvatar(opt);
      }
    });
  });
  const closeBtn = document.getElementById("avatar-picker-close");
  if (closeBtn) closeBtn.addEventListener("click", closeAvatarPicker_);
}

function handleAvatarPickerEscape_(e) {
  if (e.key === "Escape") closeAvatarPicker_();
}

function closeAvatarPicker_() {
  const el = document.getElementById("avatar-picker-backdrop");
  if (el) el.remove();
  document.removeEventListener("keydown", handleAvatarPickerEscape_);
}

const DEFAULT_STATE = {
  name: "Alumno",
  course: "",
  xp: 0,
  wins: 0,
  losses: 0,
  draws: 0,
  games: 0,
  puzzles: 0,
  history: [],
  savedGames: [],
  avatar: "knight",
};

state = loadState();
let toastTimer = null;
let alertOnClose_ = null;

function escapeHtml_(text) {
  return String(text == null ? "" : text).replace(/[&<>"']/g, (ch) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("chessSchoolData"));
    return { ...DEFAULT_STATE, ...(saved || {}) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function save() {
  try {
    localStorage.setItem("chessSchoolData", JSON.stringify(state));
  } catch (err) {
    console.error("No se pudo guardar el progreso en localStorage:", err);
    if (!save._warned) {
      save._warned = true;
      toast("⚠️ No se pudo guardar tu progreso en este navegador");
    }
  }
}

function showError(err, fallbackMsg) {
  console.error(err);
  const msg = err && err.message ? err.message : fallbackMsg || "Ocurrió un error inesperado";
  toast("❌ " + msg);
}

function toast(text, durationMs) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), durationMs || 2200);
}

function showAlert(text, variant) {
  const box = document.getElementById("alert-box");
  if (!box) return;
  box.classList.remove("result-win", "result-loss", "result-draw");
  if (variant) box.classList.add("result-" + variant);
  const txtEl = document.getElementById("alert-box-text");
  if (txtEl) txtEl.textContent = text;
  const analyzeBtn = document.getElementById("alert-analyze-btn");
  if (analyzeBtn) analyzeBtn.style.display = "none";
  const backBtn = document.getElementById("alert-back-to-tournament-btn");
  if (backBtn) backBtn.style.display = "none";
  const chatBtn = document.getElementById("alert-chat-btn");
  if (chatBtn) chatBtn.style.display = "none";
  alertOnClose_ = null;
  const alertOverlay = document.getElementById("alert");
  if (alertOverlay) alertOverlay.classList.add("show");
}

function closeAlert_() {
  const alertOverlay = document.getElementById("alert");
  if (alertOverlay) alertOverlay.classList.remove("show");
  const cb = alertOnClose_;
  alertOnClose_ = null;
  if (cb) cb();
}

function offerAnalysis(gameId) {
  const btn = document.getElementById("alert-analyze-btn");
  if (!btn) return;
  btn.style.display = "inline-flex";
  btn.onclick = () => {
    closeAlert_();
    if (typeof openAnalysisModal === "function") openAnalysisModal(gameId);
  };
}

function showAlertBackToTournamentButton_() {
  let btn = document.getElementById("alert-back-to-tournament-btn");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "alert-back-to-tournament-btn";
    btn.className = "btn primary";
    btn.style.marginTop = "10px";
    const analyzeBtn = document.getElementById("alert-analyze-btn");
    if (analyzeBtn && analyzeBtn.parentNode) {
      analyzeBtn.parentNode.insertBefore(btn, analyzeBtn.nextSibling);
    } else {
      const box = document.getElementById("alert-box");
      if (box) box.appendChild(btn);
    }
  }
  btn.textContent = "🏆 Volver al torneo";
  btn.style.display = "inline-flex";
  btn.onclick = () => closeAlert_();
}

function showChatMessagePopup(senderName, text) {
  const preview = text.length > 140 ? text.slice(0, 140) + "…" : text;
  showAlert("💬 " + senderName + ": " + preview);
  const btn = document.getElementById("alert-chat-btn");
  if (btn) {
    btn.style.display = "inline-flex";
    btn.onclick = () => {
      closeAlert_();
      if (!matchChatPanelOpen && typeof toggleMatchChatPanel === "function") toggleMatchChatPanel();
    };
  }
}

const mainAlert = document.getElementById("alert");
if (mainAlert) {
  mainAlert.onclick = (e) => {
    if (e.target.id === "alert") closeAlert_();
  };
}

const game = new Chess();
let selected = null;
let validMoves = [];
let showLegalMoves = localStorage.getItem("chessShowLegalMoves") !== "off";
let showThreats = localStorage.getItem("chessShowThreats") !== "off";
let dragCtx = null;
let justDraggedUntil = 0;
const DRAG_THRESHOLD = 6;

// =========================
// MOTOR DE SONIDO (Web Audio API)
// =========================
const SoundFX = (() => {
  let ctx = null;
  let enabled = true;
  let ringInterval = null;

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  function tone(freq, start, duration, { type = "sine", gain = 0.16, glideTo = null } = {}) {
    const c = ensureCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + start);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + start + duration);
    }
    g.gain.setValueAtTime(0.0001, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + duration + 0.02);
  }

  function noiseHit(start, duration, gain = 0.18) {
    const c = ensureCtx();
    if (!c) return;
    const bufferSize = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    const src = c.createBufferSource();
    src.buffer = buffer;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(c.destination);
    src.start(c.currentTime + start);
  }

  return {
    setEnabled(v) { enabled = v; },
    isEnabled() { return enabled; },
    unlock() { ensureCtx(); },
    move() { if (enabled) tone(520, 0, 0.09, { type: "triangle", gain: 0.14 }); },
    capture() {
      if (!enabled) return;
      noiseHit(0, 0.11, 0.22);
      tone(220, 0.01, 0.1, { type: "square", gain: 0.1 });
    },
    castle() {
      if (!enabled) return;
      tone(440, 0, 0.08, { type: "triangle", gain: 0.13 });
      tone(560, 0.08, 0.1, { type: "triangle", gain: 0.13 });
    },
    check() {
      if (!enabled) return;
      tone(740, 0, 0.09, { type: "sawtooth", gain: 0.12 });
      tone(880, 0.09, 0.12, { type: "sawtooth", gain: 0.12 });
    },
    checkmate() {
      if (!enabled) return;
      tone(660, 0, 0.14, { type: "sawtooth", gain: 0.15 });
      tone(523, 0.14, 0.14, { type: "sawtooth", gain: 0.15 });
      tone(392, 0.28, 0.32, { type: "sawtooth", gain: 0.16 });
    },
    draw() {
      if (!enabled) return;
      tone(440, 0, 0.16, { type: "sine", gain: 0.13 });
      tone(440, 0.18, 0.16, { type: "sine", gain: 0.13 });
    },
    select() { if (enabled) tone(880, 0, 0.045, { type: "sine", gain: 0.06 }); },
    chatMessage() {
      if (!enabled) return;
      tone(700, 0, 0.06, { type: "sine", gain: 0.09 });
      tone(920, 0.07, 0.08, { type: "sine", gain: 0.09 });
    },
    announcement() {
      if (!enabled) return;
      tone(660, 0, 0.1, { type: "sine", gain: 0.15 });
      tone(880, 0.12, 0.1, { type: "sine", gain: 0.15 });
      tone(1040, 0.24, 0.16, { type: "sine", gain: 0.16 });
    },
    invalid() { if (enabled) tone(160, 0, 0.13, { type: "square", gain: 0.09 }); },
    gameStart() {
      if (!enabled) return;
      tone(392, 0, 0.09, { type: "triangle", gain: 0.12 });
      tone(494, 0.09, 0.09, { type: "triangle", gain: 0.12 });
      tone(659, 0.18, 0.16, { type: "triangle", gain: 0.14 });
    },
    promote() {
      if (!enabled) return;
      tone(523, 0, 0.08, { type: "triangle", gain: 0.13 });
      tone(659, 0.08, 0.08, { type: "triangle", gain: 0.13 });
      tone(784, 0.16, 0.14, { type: "triangle", gain: 0.15 });
    },
    levelUp() {
      if (!enabled) return;
      tone(523, 0, 0.1, { type: "triangle", gain: 0.14 });
      tone(659, 0.1, 0.1, { type: "triangle", gain: 0.14 });
      tone(784, 0.2, 0.1, { type: "triangle", gain: 0.14 });
      tone(1047, 0.3, 0.28, { type: "triangle", gain: 0.17 });
    },
    startRing() {
      if (ringInterval) return;
      const ringPattern = () => {
        if (!enabled) return;
        tone(1000, 0, 0.35, { type: "sine", gain: 0.15 });
        tone(1000, 0.45, 0.35, { type: "sine", gain: 0.15 });
      };
      ringPattern();
      ringInterval = setInterval(ringPattern, 2000);
    },
    stopRing() {
      if (ringInterval) {
        clearInterval(ringInterval);
        ringInterval = null;
      }
    },
  };
})();

function playSoundForMove(move, gameAfter) {
  if (!move) return;
  if (gameAfter && gameAfter.in_checkmate()) {
    SoundFX.checkmate();
    return;
  }
  if (gameAfter && gameAfter.in_check()) {
    SoundFX.check();
    return;
  }
  if (move.flags && (move.flags.includes("k") || move.flags.includes("q"))) {
    SoundFX.castle();
    return;
  }
  if (move.flags && move.flags.includes("p")) {
    SoundFX.promote();
    return;
  }
  if (move.flags && (move.flags.includes("c") || move.flags.includes("e"))) {
    SoundFX.capture();
    return;
  }
  SoundFX.move();
}

let justMovedAnim = null;
function markMoveForAnimation(move) {
  if (!move) return;
  const isEnPassant = !!(move.flags && move.flags.includes("e"));
  const isCapture = !!(move.flags && (move.flags.includes("c") || isEnPassant));
  justMovedAnim = {
    from: move.from,
    to: move.to,
    captured: isCapture,
    capturedType: move.captured || null,
    capturedColor: move.color === "w" ? "b" : "w",
    capturedSquare: isEnPassant ? (move.to[0] + move.from[1]) : move.to,
    promoted: !!(move.flags && move.flags.includes("p")),
  };
}

// =========================
// IA & STOCKFISH
// =========================
let botEnabled = false;
let botColor = "b";
let botDifficulty = "medio";
let botThinking = false;
let sfWorker = null;

function initStockfishWorker() {
  try {
    sfWorker = new Worker("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js");
  } catch (e) {
    try {
      fetch("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js")
        .then(res => res.text())
        .then(code => {
          const blob = new Blob([code], { type: "application/javascript" });
          sfWorker = new Worker(URL.createObjectURL(blob));
        });
    } catch(err) {
      console.error("No se pudo iniciar Stockfish", err);
    }
  }
}

function ensureStockfishWorker() {
  if (!sfWorker) initStockfishWorker();
}

function getStockfishSkill(difficulty) {
  switch(difficulty) {
    case 'facil': return 2;
    case 'medio': return 8;
    case 'dificil': return 15;
    case 'experto': return 20;
    default: return 8;
  }
}

function getStockfishDepth(difficulty) {
  switch(difficulty) {
    case 'facil': return 2;
    case 'medio': return 5;
    case 'dificil': return 10;
    case 'experto': return 14;
    default: return 5;
  }
}

function getStockfishMoveTime(difficulty) {
  switch(difficulty) {
    case 'facil': return 150;
    case 'medio': return 350;
    case 'dificil': return 700;
    case 'experto': return 1100;
    default: return 350;
  }
}

function maybeTriggerBotMove() {
  if (tournamentMatchActive) {
    if (opponentMoveHighlight) {
      clearOpponentMoveHighlight();
      render();
    }
    if (typeof syncTournamentMove === "function") syncTournamentMove();
    return;
  }
  if (!botEnabled || !gameStarted || game.game_over() || game.turn() !== botColor) return;
  ensureStockfishWorker();
  botThinking = true;
  render();

  if (!sfWorker) {
    setTimeout(() => {
      const moves = game.ugly_moves({ verbose: true });
      if (moves.length > 0) {
        const m = moves[Math.floor(Math.random() * moves.length)];
        const fenBeforeMove = game.fen();
        const rndMove = game.move({ from: m.from, to: m.to, promotion: m.promotion || 'q' });
        addIncrement();
        markMoveForAnimation(rndMove);
        playSoundForMove(rndMove, game);
        showMoveExplanation(fenBeforeMove, rndMove);
        botThinking = false;
        render();
        checkGameOver();
      }
    }, 120);
    return;
  }

  const skill = getStockfishSkill(botDifficulty);
  const depth = getStockfishDepth(botDifficulty);
  const movetime = getStockfishMoveTime(botDifficulty);

  sfWorker.onmessage = function(e) {
    const line = e.data;
    if (typeof line === 'string' && line.startsWith('bestmove')) {
      const bestMove = line.split(' ')[1];
      if (bestMove && bestMove.length >= 4) {
        const from = bestMove.substring(0, 2);
        const to = bestMove.substring(2, 4);
        const promotion = bestMove.length > 4 ? bestMove[4] : undefined;
        
        const fenBeforeMove = game.fen();
        const sfMove = game.move({ from, to, promotion: promotion || 'q' });
        addIncrement();
        markMoveForAnimation(sfMove);
        playSoundForMove(sfMove, game);
        showMoveExplanation(fenBeforeMove, sfMove);
      }
      botThinking = false;
      render();
      checkGameOver();
    }
  };

  sfWorker.postMessage('uci');
  sfWorker.postMessage(`setoption name Skill Level value ${skill}`);
  sfWorker.postMessage(`position fen ${game.fen()}`);
  sfWorker.postMessage(`go depth ${depth} movetime ${movetime}`);
}

function updateModeUI() {
  const modeSelect = document.getElementById("mode");
  if (!modeSelect) return;
  const isBot = modeSelect.value === "bot";
  const difficultyLabel = document.getElementById("bot-difficulty-label");
  const colorLabel = document.getElementById("bot-color-label");
  if (difficultyLabel) difficultyLabel.style.display = isBot ? "" : "none";
  if (colorLabel) colorLabel.style.display = isBot ? "" : "none";
  const pvpFlipLabel = document.getElementById("pvp-flip-label");
  if (pvpFlipLabel) pvpFlipLabel.style.display = isBot ? "none" : "";
}

gameStarted = false;
tournamentMatchActive = false;
let tournamentMatchCtx = null;
let tournamentMatchBusy = false;
let tournamentResultShown = false;
let tournamentClockTimer = null;
let tournamentCurrentGameRow = null;

let matchChatUnsub = null;
let matchChatMessages = [];
matchChatPanelOpen = false;
let matchChatUnreadCount = 0;
let matchChatFirstSnapshot = true;
let matchChatMuted = localStorage.getItem("chessMatchChatMuted") === "on";

const RTC_ICE_SERVERS = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
let callPc = null;
let callLocalStream = null;
let callDocUnsub = null;
let callCandidatesUnsub = [];
let callState = "idle";
let callIsMuted = false;
let callPendingOffer = null;
let tournamentTimeoutClaimBusy = false;

function tournamentMyColor() {
  if (!tournamentMatchCtx || !currentUser) return "w";
  return currentUser.email === tournamentMatchCtx.whiteEmail ? "w" : "b";
}

function tournamentClockWaitingForBothPlayers() {
  if (!tournamentCurrentGameRow) return false;
  return tournamentCurrentGameRow.status === "waiting";
}

function animateMoveTransition(board, anim, movedPieceEl, capturedSquareEl) {
  const fromEl = anim.from ? board.querySelector(`[data-square="${anim.from}"]`) : null;
  const toEl = anim.to ? board.querySelector(`[data-square="${anim.to}"]`) : null;

  if (movedPieceEl && fromEl && toEl && anim.from !== anim.to) {
    const fromRect = fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();
    const dx = fromRect.left - toRect.left;
    const dy = fromRect.top - toRect.top;

    movedPieceEl.style.transition = "none";
    movedPieceEl.style.transform = `translate(${dx}px, ${dy}px)`;
    void movedPieceEl.offsetWidth;
    movedPieceEl.style.transition = "transform 0.22s cubic-bezier(0.22, 1, 0.36, 1)";
    movedPieceEl.style.transform = "translate(0, 0)";

    movedPieceEl.addEventListener("transitionend", () => {
      movedPieceEl.style.transition = "";
      movedPieceEl.style.transform = "";
      if (anim.promoted) {
        movedPieceEl.classList.add("piece-promoted");
        movedPieceEl.addEventListener("animationend", () => {
          movedPieceEl.classList.remove("piece-promoted");
        }, { once: true });
      }
    }, { once: true });
  } else if (movedPieceEl && anim.promoted) {
    movedPieceEl.classList.add("piece-promoted");
  }

  if (anim.captured && capturedSquareEl && anim.capturedType && anim.capturedColor) {
    const ghost = document.createElement("div");
    ghost.className = "piece piece-captured-ghost " + (anim.capturedColor === "w" ? "white-piece" : "black-piece");
    ghost.textContent = PIECES[anim.capturedColor + anim.capturedType.toUpperCase()];
    ghost.dataset.piece = anim.capturedType.toUpperCase();
    capturedSquareEl.appendChild(ghost);
    setTimeout(() => ghost.remove(), 280);
  }
}

function squareDisplayPercent(sqName, rows, cols, squares) {
  const file = squares.indexOf(sqName[0]);
  const rank = parseInt(sqName[1], 10);
  const r = 8 - rank;
  const displayRow = rows.indexOf(r);
  const displayCol = cols.indexOf(file);
  if (displayRow === -1 || displayCol === -1) return null;
  return { x: (displayCol + 0.5) * 12.5, y: (displayRow + 0.5) * 12.5 };
}

function buildOpponentMoveArrow(fromSq, toSq, rows, cols, squares) {
  const p1 = squareDisplayPercent(fromSq, rows, cols, squares);
  const p2 = squareDisplayPercent(toSq, rows, cols, squares);
  if (!p1 || !p2) return null;

  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.classList.add("opp-move-arrow-overlay");

  const defs = document.createElementNS(svgNS, "defs");
  const marker = document.createElementNS(svgNS, "marker");
  marker.setAttribute("id", "oppMoveArrowHead");
  marker.setAttribute("viewBox", "0 0 10 10");
  marker.setAttribute("refX", "7");
  marker.setAttribute("refY", "5");
  marker.setAttribute("markerWidth", "4.2");
  marker.setAttribute("markerHeight", "4.2");
  marker.setAttribute("orient", "auto-start-reverse");
  const arrowHeadPath = document.createElementNS(svgNS, "path");
  arrowHeadPath.setAttribute("d", "M0,0 L10,5 L0,10 z");
  arrowHeadPath.setAttribute("fill", "rgba(70, 160, 255, 0.9)");
  marker.appendChild(arrowHeadPath);
  defs.appendChild(marker);
  svg.appendChild(defs);

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const shorten = 4;
  const endX = p2.x - (dx / len) * shorten;
  const endY = p2.y - (dy / len) * shorten;

  const line = document.createElementNS(svgNS, "line");
  line.setAttribute("x1", p1.x);
  line.setAttribute("y1", p1.y);
  line.setAttribute("x2", endX);
  line.setAttribute("y2", endY);
  line.setAttribute("stroke", "rgba(70, 160, 255, 0.9)");
  line.setAttribute("stroke-width", "2.4");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("marker-end", "url(#oppMoveArrowHead)");
  svg.appendChild(line);

  return svg;
}

function computeReachableSquares(fen, colorToMove) {
  const parts = fen.split(" ");
  parts[1] = colorToMove;
  parts[3] = "-";
  try {
    const temp = new Chess(parts.join(" "));
    const moves = temp.moves({ verbose: true });
    const set = new Set();
    for (const m of moves) set.add(m.to);
    return set;
  } catch (e) {
    return new Set();
  }
}

let threatenedSquaresCache = { fen: null, result: null };
function getThreatenedSquares(fen) {
  if (threatenedSquaresCache.fen === fen) return threatenedSquaresCache.result;
  const whiteTargets = computeReachableSquares(fen, "w");
  const blackTargets = computeReachableSquares(fen, "b");
  const temp = new Chess(fen);
  const threatened = new Set();
  const squares = ["a", "b", "c", "d", "e", "f", "g", "h"];
  for (const file of squares) {
    for (let rank = 1; rank <= 8; rank++) {
      const sq = file + rank;
      const p = temp.get(sq);
      if (!p) continue;
      if (p.color === "w" && blackTargets.has(sq)) threatened.add(sq);
      if (p.color === "b" && whiteTargets.has(sq)) threatened.add(sq);
    }
  }
  threatenedSquaresCache = { fen, result: threatened };
  return threatened;
}

opponentMoveHighlight = null;
let opponentMoveHighlightTimer = null;

function clearOpponentMoveHighlight() {
  clearTimeout(opponentMoveHighlightTimer);
  opponentMoveHighlightTimer = null;
  opponentMoveHighlight = null;
}

let boardSquareEls_ = null;
let boardFlipState_ = null;

function render() {
  const board = document.getElementById("board");
  if (!board) return;
  const boardFrameEl = board.closest(".board-frame");
  if (boardFrameEl) boardFrameEl.classList.toggle("thinking", !!botThinking);
  const isCheck = game.in_check();
  const turn = game.turn();

  const threatsEnabled =
    !tournamentMatchActive &&
    (document.getElementById("toggle-threats") ? document.getElementById("toggle-threats").checked : showThreats);
  const threatenedSquares = threatsEnabled ? getThreatenedSquares(game.fen()) : null;

  const pvpFlipEl = document.getElementById("pvp-flip");
  const pvpAutoFlip = !!(pvpFlipEl && pvpFlipEl.checked);

  const isFlipped = tournamentMatchActive
    ? tournamentMyColor() === "b"
    : botEnabled
    ? botColor === "w"
    : (pvpAutoFlip && turn === "b");
  const rows = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const cols = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  const squares = ['a','b','c','d','e','f','g','h'];
  let movedPieceEl = null;
  let capturedSquareEl = null;

  const fullHistory = game.history({ verbose: true });
  const lastMove = fullHistory.length > 0 ? fullHistory[fullHistory.length - 1] : null;

  const oldArrow = board.querySelector(".opp-move-arrow-overlay");
  if (oldArrow) oldArrow.remove();

  const needsRebuild =
    !boardSquareEls_ || boardFlipState_ !== isFlipped || board.children.length !== 64;

  if (needsRebuild) {
    board.innerHTML = "";
    boardSquareEls_ = new Map();
    for (const r of rows) {
      for (const c of cols) {
        const sqName = squares[c] + (8 - r);
        const square = document.createElement("div");
        square.className = "square " + ((r + c) % 2 ? "dark" : "light");
        square.dataset.square = sqName;
        square.style.touchAction = "manipulation";

        if (c === (isFlipped ? 7 : 0)) {
          const rank = document.createElement("span");
          rank.className = "coord rank";
          rank.textContent = 8 - r;
          square.appendChild(rank);
        }
        if (r === (isFlipped ? 0 : 7)) {
          const file = document.createElement("span");
          file.className = "coord file";
          file.textContent = squares[c];
          square.appendChild(file);
        }

        square.onclick = () => clickSquare(sqName);
        board.appendChild(square);
        boardSquareEls_.set(sqName, square);
      }
    }
    boardFlipState_ = isFlipped;
  }

  for (const [sqName, square] of boardSquareEls_) {
    square.classList.remove(
      "selected", "last", "opp-move", "check", "hint", "threat", "capture-flash"
    );
    const oldPiece = square.querySelector(".piece:not(.piece-captured-ghost)");
    if (oldPiece) oldPiece.remove();

    if (selected === sqName) square.classList.add("selected");

    if (lastMove && (lastMove.from === sqName || lastMove.to === sqName)) {
      square.classList.add("last");
    }

    if (opponentMoveHighlight && (opponentMoveHighlight.from === sqName || opponentMoveHighlight.to === sqName)) {
      square.classList.add("opp-move");
    }

    const pieceObj = game.get(sqName);
    if (isCheck && pieceObj && pieceObj.type === 'k' && pieceObj.color === turn) {
      square.classList.add("check");
    }

    if (validMoves.includes(sqName) && showLegalMoves) {
      square.classList.add("hint");
    }

    if (pieceObj) {
      if (threatenedSquares && threatenedSquares.has(sqName)) {
        square.classList.add("threat");
      }
      const pieceEl = document.createElement("div");
      pieceEl.className = "piece " + (pieceObj.color === "w" ? "white-piece" : "black-piece");
      pieceEl.textContent = PIECES[pieceObj.color + pieceObj.type.toUpperCase()];
      pieceEl.dataset.piece = pieceObj.type.toUpperCase();
      pieceEl.style.touchAction = "manipulation";
      square.appendChild(pieceEl);
      attachPieceDrag(pieceEl, sqName);
      if (justMovedAnim && justMovedAnim.to === sqName) {
        movedPieceEl = pieceEl;
      }
    }

    if (justMovedAnim && justMovedAnim.captured && justMovedAnim.capturedSquare === sqName) {
      capturedSquareEl = square;
    }

    if (justMovedAnim && justMovedAnim.to === sqName && justMovedAnim.captured) {
      square.classList.add("capture-flash");
    }
  }

  if (opponentMoveHighlight && opponentMoveHighlight.from && opponentMoveHighlight.to) {
    const arrowSvg = buildOpponentMoveArrow(opponentMoveHighlight.from, opponentMoveHighlight.to, rows, cols, squares);
    if (arrowSvg) board.appendChild(arrowSvg);
  }

  if (justMovedAnim) {
    animateMoveTransition(board, justMovedAnim, movedPieceEl, capturedSquareEl);
  }

  justMovedAnim = null;

  renderMoves();
  renderCapturedMaterial();
  updateEvalBar();

  const statusEl = document.getElementById("status");
  if (statusEl) {
    const statusText = !gameStarted
      ? "Pulsa 'Iniciar partida' para comenzar"
      : botThinking
        ? "🤖 La IA está pensando…"
        : game.game_over()
          ? "Partida terminada"
          : `Turno de las ${turn === "w" ? "Blancas" : "Negras"}${isCheck ? " · ¡Jaque!" : ""}`;
    statusEl.textContent = statusText;
  }
  updateClockDisplay();
}

function renderCapturedMaterial() {
  const capturedWEl = document.getElementById("captured-w");
  const capturedBEl = document.getElementById("captured-b");
  const capturedWFloatEl = document.getElementById("captured-w-float");
  const capturedBFloatEl = document.getElementById("captured-b-float");
  if (!capturedWEl && !capturedBEl && !capturedWFloatEl && !capturedBFloatEl) return;

  const vals = { p: 1, n: 3, b: 3, r: 5, q: 9 };
  const order = ["q", "r", "b", "n", "p"];
  const STANDARD = { p: 8, n: 2, b: 2, r: 2, q: 1 };

  const board = game.board();
  const counts = { w: { p: 0, n: 0, b: 0, r: 0, q: 0 }, b: { p: 0, n: 0, b: 0, r: 0, q: 0 } };
  let whiteValue = 0;
  let blackValue = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.type === "k") continue;
      counts[p.color][p.type]++;
      if (p.color === "w") whiteValue += vals[p.type];
      else blackValue += vals[p.type];
    }
  }

  function missingFor(color) {
    const extraQueens = Math.max(0, counts[color].q - STANDARD.q);
    const missing = {};
    for (const t of order) missing[t] = Math.max(0, STANDARD[t] - counts[color][t]);
    missing.p = Math.max(0, missing.p - extraQueens);
    return missing;
  }

  const missingWhite = missingFor("w");
  const missingBlack = missingFor("b");
  const diff = whiteValue - blackValue;

  function glyphsHtml(missing, pieceColor) {
    let html = "";
    for (const t of order) {
      for (let i = 0; i < missing[t]; i++) {
        html += `<span style="font-size:16px; line-height:1; color:var(--text); opacity:0.85;">${PIECES[pieceColor + t.toUpperCase()]}</span>`;
      }
    }
    return html;
  }

  function advantageHtml(amount) {
    return amount > 0
      ? `<span style="font-size:12px; font-weight:600; color:var(--text); margin-left:4px;">+${amount}</span>`
      : "";
  }

  const wHtml = glyphsHtml(missingBlack, "b") + advantageHtml(diff > 0 ? diff : 0);
  const bHtml = glyphsHtml(missingWhite, "w") + advantageHtml(diff < 0 ? -diff : 0);
  if (capturedWEl) capturedWEl.innerHTML = wHtml;
  if (capturedBEl) capturedBEl.innerHTML = bHtml;
  if (capturedWFloatEl) capturedWFloatEl.innerHTML = wHtml;
  if (capturedBFloatEl) capturedBFloatEl.innerHTML = bHtml;
}

function updateEvalBar() {
  const evalBar = document.getElementById("eval-bar");
  if (!evalBar) return;
  const board = game.board();
  let score = 0;
  const vals = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  for (let r=0; r<8; r++) {
    for (let c=0; c<8; c++) {
      const p = board[r][c];
      if (p) {
        const val = vals[p.type];
        score += (p.color === 'w' ? val : -val);
      }
    }
  }
  const percentage = Math.max(5, Math.min(95, 50 + score * 5));
  evalBar.style.width = percentage + "%";
}

let renderedMoveCount = 0;

function renderMoves() {
  const container = document.getElementById("moves");
  if (!container) return;
  const emptyMsg = document.getElementById("moves-empty");
  const countEl = document.getElementById("moves-count");

  const verboseHistory = game.history({ verbose: true });
  if (countEl) countEl.textContent = verboseHistory.length;

  if (!verboseHistory.length) {
    container.querySelectorAll(".move-row").forEach((el) => el.remove());
    renderedMoveCount = 0;
    if (emptyMsg) emptyMsg.style.display = "";
    return;
  }
  if (emptyMsg) emptyMsg.style.display = "none";

  const buildMoveSpan = (m) => {
    const span = document.createElement("span");
    span.className = "move";
    if (m.captured) span.classList.add("move-capture");
    if (m.san.includes("+") || m.san.includes("#")) span.classList.add("move-check");
    const icon = document.createElement("span");
    icon.className = "move-icon";
    icon.textContent = PIECES[m.color + m.piece.toUpperCase()] || "";
    const text = document.createElement("span");
    text.textContent = m.san;
    span.append(icon, text);
    return span;
  };

  if (verboseHistory.length < renderedMoveCount) {
    container.querySelectorAll(".move-row").forEach((el) => el.remove());
    renderedMoveCount = 0;
  }

  const prevCurrent = container.querySelector(".move-row.current-move");
  if (prevCurrent) prevCurrent.classList.remove("current-move");

  let startIndex = renderedMoveCount;

  if (startIndex % 2 === 1 && startIndex < verboseHistory.length) {
    const rows = container.querySelectorAll(".move-row");
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
      lastRow.replaceChild(buildMoveSpan(verboseHistory[startIndex]), lastRow.children[2]);
      startIndex++;
    }
  }

  for (let i = startIndex; i < verboseHistory.length; i += 2) {
    const row = document.createElement("div");
    row.className = "move-row";
    const num = document.createElement("span");
    num.className = "move-num";
    num.textContent = Math.floor(i / 2) + 1 + ".";
    row.appendChild(num);
    row.appendChild(buildMoveSpan(verboseHistory[i]));
    row.appendChild(verboseHistory[i + 1] ? buildMoveSpan(verboseHistory[i + 1]) : document.createElement("span"));
    container.appendChild(row);
  }

  renderedMoveCount = verboseHistory.length;

  const rows = container.querySelectorAll(".move-row");
  if (rows.length) rows[rows.length - 1].classList.add("current-move");

  container.scrollTop = container.scrollHeight;
}

function attachPieceDrag(pieceEl, sqName) {
  pieceEl.addEventListener("pointerdown", (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    if (!gameStarted || game.game_over() || botThinking) return;
    if (botEnabled && game.turn() === botColor) return;
    if (tournamentMatchActive && game.turn() !== tournamentMyColor()) return;
    if (tournamentMatchActive && tournamentClockWaitingForBothPlayers()) {
      toast("⏳ Esperando a que el rival entre a la partida.");
      return;
    }
    if (tournamentMatchActive && tournamentCurrentGameRow && tournamentCurrentGameRow.status === "suspended") {
      toast("⏸️ El árbitro suspendió esta partida.");
      return;
    }
    const piece = game.get(sqName);
    if (!piece || piece.color !== game.turn()) return;

    const rect = pieceEl.getBoundingClientRect();
    dragCtx = {
      from: sqName,
      pieceEl,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
      currentDropEl: null,
    };
    window.addEventListener("pointermove", onPieceDragMove);
    window.addEventListener("pointerup", onPieceDragUp, { once: true });
  });
}

function updateSelectionHighlights() {
  const board = document.getElementById("board");
  if (!board) return;
  board.querySelectorAll(".square.selected").forEach((sq) => sq.classList.remove("selected"));
  board.querySelectorAll(".square.hint").forEach((sq) => sq.classList.remove("hint"));
  if (selected) {
    const originEl = board.querySelector(`.square[data-square="${selected}"]`);
    if (originEl) originEl.classList.add("selected");
  }
  if (showLegalMoves) {
    for (const sq of validMoves) {
      const el = board.querySelector(`.square[data-square="${sq}"]`);
      if (el) el.classList.add("hint");
    }
  }
}

function onPieceDragMove(e) {
  if (!dragCtx) return;
  const dx = e.clientX - dragCtx.startX;
  const dy = e.clientY - dragCtx.startY;

  if (!dragCtx.moved) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    dragCtx.moved = true;

    selected = dragCtx.from;
    const moves = game.moves({ square: dragCtx.from, verbose: true });
    validMoves = moves.map((m) => m.to);
    SoundFX.select();
    updateSelectionHighlights();
    const sqEl = dragCtx.pieceEl.closest(".square");
    dragCtx.pieceEl.classList.add("dragging");
    dragCtx.pieceEl.style.width = dragCtx.width + "px";
    dragCtx.pieceEl.style.height = dragCtx.height + "px";
    if (sqEl) sqEl.classList.add("drag-origin");
  }

  if (!dragCtx.pieceEl) return;
  dragCtx.pieceEl.style.left = e.clientX - dragCtx.offsetX + "px";
  dragCtx.pieceEl.style.top = e.clientY - dragCtx.offsetY + "px";

  dragCtx.pieceEl.style.pointerEvents = "none";
  const under = document.elementFromPoint(e.clientX, e.clientY);
  dragCtx.pieceEl.style.pointerEvents = "";
  const squareEl = under ? under.closest(".square") : null;

  if (dragCtx.currentDropEl && dragCtx.currentDropEl !== squareEl) {
    dragCtx.currentDropEl.classList.remove("drop-target");
  }
  if (squareEl && validMoves.includes(squareEl.dataset.square)) {
    squareEl.classList.add("drop-target");
    dragCtx.currentDropEl = squareEl;
  } else {
    dragCtx.currentDropEl = null;
  }
}

function isPromotionMove(chessInstance, from, to) {
  const piece = chessInstance.get(from);
  if (!piece || piece.type !== "p") return false;
  const rank = to[1];
  return rank === "8" || rank === "1";
}

function askPromotion(color) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("promo");
    const box = document.getElementById("promo-box");
    if (!overlay || !box) {
      resolve("q");
      return;
    }
    const options = [
      { code: "q", label: "Dama" },
      { code: "r", label: "Torre" },
      { code: "b", label: "Alfil" },
      { code: "n", label: "Caballo" },
    ];
    box.innerHTML = "";
    const title = document.createElement("div");
    title.className = "promo-title";
    title.textContent = "Elegí la pieza para coronar";
    box.appendChild(title);
    options.forEach((opt) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = PIECES[color + opt.code.toUpperCase()];
      btn.setAttribute("aria-label", opt.label);
      btn.title = opt.label;
      btn.addEventListener(
        "click",
        () => {
          overlay.classList.remove("show");
          resolve(opt.code);
        },
        { once: true }
      );
      box.appendChild(btn);
    });
    overlay.classList.add("show");
  });
}

async function onPieceDragUp(e) {
  window.removeEventListener("pointermove", onPieceDragMove);
  if (!dragCtx) return;
  const ctx = dragCtx;
  dragCtx = null;

  if (!ctx.moved) return;

  justDraggedUntil = Date.now() + 300;

  const under = document.elementFromPoint(e.clientX, e.clientY);
  const squareEl = under ? under.closest(".square") : null;
  const to = squareEl ? squareEl.dataset.square : null;

  document.querySelectorAll(".square.drop-target").forEach((sq) => sq.classList.remove("drop-target"));
  document.querySelectorAll(".square.drag-origin").forEach((sq) => sq.classList.remove("drag-origin"));

  if (to && validMoves.includes(to)) {
    let promotion = "q";
    if (isPromotionMove(game, ctx.from, to)) {
      render();
      promotion = await askPromotion(game.turn());
    }
    const fenBeforeMove = game.fen();
    const move = game.move({ from: ctx.from, to, promotion });
    if (move) {
      addIncrement();
      selected = null;
      validMoves = [];
      markMoveForAnimation(move);
      playSoundForMove(move, game);
      showMoveExplanation(fenBeforeMove, move);
      if (navigator.vibrate) {
        const isCapture = move.flags && (move.flags.includes("c") || move.flags.includes("e"));
        navigator.vibrate(isCapture ? [14, 30, 14] : 12);
      }
      render();
      checkGameOver();
      maybeTriggerBotMove();
      return;
    }
  }

  selected = null;
  validMoves = [];
  if (to && to !== ctx.from) SoundFX.invalid();
  render();
}

async function clickSquare(sqName) {
  if (Date.now() < justDraggedUntil) return;
  if (!gameStarted || game.game_over() || botThinking) return;
  if (botEnabled && game.turn() === botColor) return;
  if (tournamentMatchActive && game.turn() !== tournamentMyColor()) return;
  if (tournamentMatchActive && tournamentClockWaitingForBothPlayers()) {
    toast("⏳ Esperando a que el rival entre a la partida.");
    return;
  }
  if (tournamentMatchActive && tournamentCurrentGameRow && tournamentCurrentGameRow.status === "suspended") {
    toast("⏸️ El árbitro suspendió esta partida.");
    return;
  }

  if (selected === sqName) {
    selected = null;
    validMoves = [];
    updateSelectionHighlights();
    return;
  }

  if (selected) {
    const from = selected;
    let promotion = "q";
    if (isPromotionMove(game, from, sqName)) {
      promotion = await askPromotion(game.turn());
    }
    const fenBeforeMove = game.fen();
    const move = game.move({ from, to: sqName, promotion });
    if (move) {
      addIncrement();
      selected = null;
      validMoves = [];
      markMoveForAnimation(move);
      playSoundForMove(move, game);
      showMoveExplanation(fenBeforeMove, move);
      render();
      checkGameOver();
      maybeTriggerBotMove();
      return;
    }
  }

  const piece = game.get(sqName);
  if (piece && piece.color === game.turn()) {
    selected = sqName;
    const moves = game.moves({ square: sqName, verbose: true });
    validMoves = moves.map(m => m.to);
    SoundFX.select();
  } else {
    if (selected) SoundFX.invalid();
    selected = null;
    validMoves = [];
  }
  updateSelectionHighlights();
}

function checkGameOver() {
  if (tournamentMatchActive) return;
  if (game.game_over()) {
    let resultText = "Partida terminada";
    if (game.in_checkmate()) {
      const winnerColor = game.turn() === 'w' ? 'b' : 'w';
      const winner = winnerColor === 'w' ? 'Blancas' : 'Negras';
      resultText = `Jaque mate · Ganaron las ${winner}`;
      state.games++;
      const humanWon = !botEnabled || winnerColor !== botColor;
      if (humanWon) {
        state.wins++;
        showAlert(`♚ ¡JAQUE MATE! Ganaron las ${winner}.`);
        addXP(60, "Partida ganada", resultText);
      } else {
        state.losses++;
        showAlert(`♚ Jaque mate. Ganó la IA jugando con ${winner.toLowerCase()}.`);
        addXP(15, "Partida perdida", resultText);
      }
    } else {
      state.games++;
      state.draws++;
      resultText = "Tablas";
      SoundFX.draw();
      showAlert("🤝 Partida tablas");
      addXP(20, "Partida empatada", resultText);
    }
    const record = saveFinishedGame(resultText);
    save();
    updateProfile();
    if (record) offerAnalysis(record.id);
  }
}

function saveFinishedGame(resultText) {
  const history = game.history();
  if (!history.length) return null;

  const tempGame = new Chess();
  const positions = [clonePosition(tempGame)];
  history.forEach(m => {
    tempGame.move(m);
    positions.push(clonePosition(tempGame));
  });

  const record = {
    id: "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    date: new Date().toLocaleDateString("es-AR"),
    time: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
    result: resultText,
    mode: botEnabled ? "bot" : "pvp",
    difficulty: botEnabled ? botDifficulty : null,
    humanColor: botEnabled ? (botColor === 'w' ? 'b' : 'w') : null,
    moves: history,
    positions: positions,
    analysis: null,
  };
  state.savedGames = state.savedGames || [];
  state.savedGames.unshift(record);
  state.savedGames = state.savedGames.slice(0, 30);
  save();
  renderSavedGamesList();
  return record;
}

function clonePosition(g) {
  return {
    fen: g.fen(),
  };
}

function renderSavedGamesList() {
  const container = document.getElementById("saved-games-list");
  const emptyMsg = document.getElementById("saved-games-empty");
  if (!container || !emptyMsg) return;
  container.querySelectorAll(".saved-game-item").forEach((el) => el.remove());

  const games = state.savedGames || [];
  if (!games.length) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";

  games.forEach((g) => {
    const item = document.createElement("div");
    item.className = "saved-game-item";
    item.innerHTML = `
      <div class="saved-game-info">
        <b>${escapeHtml_(g.result)}</b>
        <small>${g.date} · ${g.time} · ${g.moves.length} jugadas</small>
      </div>
      <div class="saved-game-actions">
        <button class="btn secondary" data-analyze="${g.id}">🔎 Analizar</button>
        <button class="btn danger" data-delete="${g.id}">🗑</button>
      </div>
    `;
    container.appendChild(item);
  });

  container.querySelectorAll("[data-analyze]").forEach((btn) => {
    btn.onclick = () => {
      if (typeof openAnalysisModal === "function") openAnalysisModal(btn.dataset.analyze);
    };
  });
  container.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.onclick = () => {
      state.savedGames = (state.savedGames || []).filter(g => g.id !== btn.dataset.delete);
      save();
      renderSavedGamesList();
    };
  });
}

// RELOJ
let clockTimer = null;
let clock = { w: 300, b: 300 };
let clockEnabled = false;
let turnStartAt = null;
let clockFlagged = false;

function getRawMinutesFromSelect(selectId, customInputId) {
  const el = document.getElementById(selectId);
  if (!el) return 0;
  const mode = el.value;
  if (mode === "none") return 0;
  if (mode === "custom") {
    const customEl = document.getElementById(customInputId);
    return Math.max(1, Number(customEl && customEl.value) || 5);
  }
  return Number(mode);
}

function getMinutesFromSelect(selectId, customInputId) {
  return getRawMinutesFromSelect(selectId, customInputId) * 60;
}

function setSelectFromValue(selectId, customLabelId, customInputId, value, presetValues) {
  const select = document.getElementById(selectId);
  if (!select) return;
  const str = String(value || 0);
  if (!value && presetValues[0] === "none") {
    select.value = "none";
  } else if (presetValues.indexOf(str) !== -1) {
    select.value = str;
  } else {
    select.value = "custom";
    const customEl = document.getElementById(customInputId);
    if (customEl) customEl.value = value;
  }
  const labelEl = document.getElementById(customLabelId);
  if (labelEl) labelEl.style.display = select.value === "custom" ? "" : "none";
}

function getIncrementFromSelect(selectId, customInputId) {
  const el = document.getElementById(selectId);
  if (!el) return 0;
  const value = el.value;
  if (value === "custom") {
    const customEl = document.getElementById(customInputId);
    return Math.max(0, Number(customEl && customEl.value) || 0);
  }
  return Number(value);
}

function wireCustomToggle(selectId, customLabelId) {
  const selectEl = document.getElementById(selectId);
  const labelEl = document.getElementById(customLabelId);
  if (!selectEl || !labelEl) return;
  const sync = () => {
    labelEl.style.display = selectEl.value === "custom" ? "" : "none";
  };
  selectEl.addEventListener("change", sync);
  sync();
}

wireCustomToggle("time-mode", "custom-time-label");
wireCustomToggle("increment", "custom-increment-label");
wireCustomToggle("tournament-time-mode", "tournament-custom-time-label");
wireCustomToggle("tournament-increment", "tournament-custom-increment-label");
wireCustomToggle("tournament-settings-time-mode", "tournament-settings-custom-time-label");
wireCustomToggle("tournament-settings-increment", "tournament-settings-custom-increment-label");

function getInitialTime() {
  return getMinutesFromSelect("time-mode", "custom-minutes");
}

function getIncrement() {
  return getIncrementFromSelect("increment", "custom-increment");
}

function addIncrement() {
  if (tournamentMatchActive) return;
  const prevTurn = game.turn() === 'w' ? 'b' : 'w';
  if (clockEnabled && turnStartAt) {
    const elapsed = Math.max(0, Math.floor((syncedNow_() - turnStartAt) / 1000));
    clock[prevTurn] = Math.max(0, clock[prevTurn] - elapsed);
  }
  const increment = getIncrement();
  if (increment && clockEnabled && !game.game_over()) {
    clock[prevTurn] += increment;
  }
  turnStartAt = clockEnabled ? syncedNow_() : null;
  updateClockDisplay();
}

function initClock(start = false) {
  clearInterval(clockTimer);
  const initial = getInitialTime();
  clockEnabled = initial > 0;
  clock = { w: initial, b: initial };
  clockFlagged = false;
  turnStartAt = start && initial > 0 ? syncedNow_() : null;

  if (start && initial > 0) {
    clockTimer = setInterval(() => {
      if (tournamentMatchActive || game.game_over()) return;
      updateClockDisplay();
    }, 1000);
  }
  updateClockDisplay();
}

function getClockRemaining_(color) {
  if (!clockEnabled) return clock[color];
  if (game.turn() === color && turnStartAt && !game.game_over()) {
    const elapsed = Math.max(0, Math.floor((syncedNow_() - turnStartAt) / 1000));
    return Math.max(0, clock[color] - elapsed);
  }
  return clock[color];
}

function updateClockDisplay() {
  if (tournamentMatchActive) return;
  const w = document.getElementById("clock-w");
  const b = document.getElementById("clock-b");
  if (!w || !b) return;
  renderBoardAvatars_();
  const wTime = w.querySelector(".clock-time");
  const bTime = b.querySelector(".clock-time");
  const wSecs = getClockRemaining_("w");
  const bSecs = getClockRemaining_("b");
  (wTime || w).textContent = formatTime(wSecs);
  (bTime || b).textContent = formatTime(bSecs);
  w.classList.toggle("active", game.turn() === "w" && !game.game_over());
  b.classList.toggle("active", game.turn() === "b" && !game.game_over());

  if (clockEnabled && !clockFlagged && !game.game_over()) {
    const turn = game.turn();
    const remaining = turn === "w" ? wSecs : bSecs;
    if (remaining <= 0) {
      clockFlagged = true;
      clock[turn] = 0;
      clearInterval(clockTimer);
      const winner = turn === "w" ? "Negras" : "Blancas";
      state.games++;
      const record = saveFinishedGame(`Tiempo agotado · Ganaron las ${winner}`);
      save();
      showAlert(`⏱️ Tiempo agotado. Ganaron las ${winner}.`);
      if (record) offerAnalysis(record.id);
    }
  }
}

let lastKnownLevel = null;

function updateProfile() {
  const level = Math.floor(state.xp / 1000) + 1;
  const progress = state.xp % 1000;
  const nameEl = document.getElementById("mini-name");
  if (nameEl) nameEl.textContent = state.name || "Alumno";
  renderMiniAvatar();
  const levelEl = document.getElementById("mini-level");
  if (levelEl) levelEl.textContent = `Nivel ${level} · ${levelLabel(level)}`;
  const xpBar = document.getElementById("mini-xp");
  if (xpBar) xpBar.style.width = (progress / 10) + "%";
  const xpTxt = document.getElementById("mini-xp-text");
  if (xpTxt) xpTxt.textContent = `${progress} / 1000 XP`;
  const statXp = document.getElementById("stat-xp");
  if (statXp) statXp.textContent = state.xp;
  const statWins = document.getElementById("stat-wins");
  if (statWins) statWins.textContent = state.wins;
  const statPuzzles = document.getElementById("stat-puzzles");
  if (statPuzzles) statPuzzles.textContent = state.puzzles;

  updateDashboardStats(level, progress);

  if (lastKnownLevel === null) {
    lastKnownLevel = level;
  } else if (level > lastKnownLevel) {
    celebrateLevelUp(level);
    lastKnownLevel = level;
  }
}

function computeOverallAccuracy() {
  const games = state.savedGames || [];
  const values = [];
  for (const g of games) {
    if (!g.analysis || !g.analysis.accuracy) continue;
    const humanColor = g.humanColor || "w";
    const acc = g.analysis.accuracy[humanColor];
    if (typeof acc === "number") values.push(acc);
  }
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function updateDashboardStats(level, progress) {
  const progressTitleEl = document.getElementById("progress-title");
  const mainProgressEl = document.getElementById("main-progress");
  if (progressTitleEl) progressTitleEl.textContent = `Nivel ${level} · ${levelLabel(level)}`;
  if (mainProgressEl) mainProgressEl.style.width = (progress / 10) + "%";

  const accuracyEl = document.getElementById("stat-accuracy");
  if (accuracyEl) {
    const acc = computeOverallAccuracy();
    accuracyEl.textContent = acc === null ? "—" : Math.round(acc) + "%";
  }

  const gamesTotalEl = document.getElementById("games-total");
  const gamesWinsEl = document.getElementById("games-wins");
  const gamesLossesEl = document.getElementById("games-losses");
  const gamesDrawsEl = document.getElementById("games-draws");
  if (gamesTotalEl) gamesTotalEl.textContent = state.games;
  if (gamesWinsEl) gamesWinsEl.textContent = state.wins;
  if (gamesLossesEl) gamesLossesEl.textContent = state.losses;
  if (gamesDrawsEl) gamesDrawsEl.textContent = state.draws;

  const historyBody = document.getElementById("history-table");
  if (historyBody) {
    historyBody.innerHTML = "";
    const entries = (state.history || []).slice().reverse();
    if (!entries.length) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="4" style="color: var(--muted)">Todavía no hay actividad registrada.</td>`;
      historyBody.appendChild(row);
    } else {
      for (const entry of entries) {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${escapeHtml_(entry.activity)}</td>
          <td>${escapeHtml_(entry.result)}</td>
          <td>+${entry.xp} XP</td>
          <td>${entry.date}</td>
        `;
        historyBody.appendChild(row);
      }
    }
  }
}

function celebrateLevelUp(level) {
  SoundFX.levelUp();
  if (navigator.vibrate) navigator.vibrate([20, 40, 20, 40, 60]);

  const banner = document.createElement("div");
  banner.className = "level-up-banner";
  banner.innerHTML = `🎉 ¡Subiste a Nivel ${level}!`;
  document.body.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add("show"));
  setTimeout(() => {
    banner.classList.remove("show");
    setTimeout(() => banner.remove(), 300);
  }, 2200);

  const layer = document.createElement("div");
  layer.className = "level-up-particles";
  document.body.appendChild(layer);

  const colors = ["var(--accent)", "var(--accent2)", "#ffffff", "var(--success)"];
  const originX = window.innerWidth / 2;
  const originY = window.innerHeight * 0.22;

  for (let i = 0; i < 28; i++) {
    const p = document.createElement("span");
    p.className = "level-up-particle";
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 140;
    const size = 4 + Math.random() * 7;
    p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    p.style.setProperty("--dy", Math.sin(angle) * dist - 40 + "px");
    p.style.setProperty("--dur", 1.1 + Math.random() * 0.9 + "s");
    p.style.setProperty("--delay", Math.random() * 0.25 + "s");
    p.style.left = originX + (Math.random() * 40 - 20) + "px";
    p.style.top = originY + "px";
    p.style.width = size + "px";
    p.style.height = size + "px";
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    layer.appendChild(p);
  }

  setTimeout(() => layer.remove(), 2400);
}

function addXP(amount, activity, result = "Completado") {
  state.xp += amount;
  state.history.push({ activity, result, xp: amount, date: new Date().toLocaleDateString("es-AR") });
  save();
  toast(`🎉 +${amount} XP`);
  updateProfile();
}

function showPage(name) {
  document.querySelectorAll(".page").forEach((page) => {
    page.classList.toggle("active", page.id === "page-" + name);
  });
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle("active", button.dataset.page === name);
  });
  if (name === "jugar") render();
  if (name === "torneo" && typeof refreshTournament === "function") refreshTournament();
  if (name === "pantalla-publica" && typeof renderPublicScreen === "function") renderPublicScreen(lastTournamentState);
}

document.querySelectorAll("[data-page]").forEach((button) => {
  button.onclick = () => showPage(button.dataset.page);
});

document.querySelectorAll("[data-page-action]").forEach((button) => {
  button.onclick = () => showPage(button.dataset.pageAction);
});

const modeEl = document.getElementById("mode");
if (modeEl) modeEl.addEventListener("change", updateModeUI);
updateModeUI();

const pvpFlipToggle = document.getElementById("pvp-flip");
if (pvpFlipToggle) {
  pvpFlipToggle.addEventListener("change", () => {
    if (gameStarted) render();
  });
}

// SONIDO
let soundEnabled = localStorage.getItem("chessSoundEnabled") !== "off";
const soundToggle = document.getElementById("toggle-sound");
const soundToggleCfg = document.getElementById("toggle-sound-cfg");

function syncSoundUI() {
  if (soundToggle) soundToggle.checked = soundEnabled;
  if (soundToggleCfg) soundToggleCfg.checked = soundEnabled;
}

function setSoundEnabled(value) {
  soundEnabled = value;
  localStorage.setItem("chessSoundEnabled", soundEnabled ? "on" : "off");
  SoundFX.setEnabled(soundEnabled);
  syncSoundUI();
  if (soundEnabled) {
    SoundFX.unlock();
    SoundFX.select();
  }
}

SoundFX.setEnabled(soundEnabled);
syncSoundUI();
if (soundToggle) soundToggle.addEventListener("change", () => setSoundEnabled(soundToggle.checked));
if (soundToggleCfg) soundToggleCfg.addEventListener("change", () => setSoundEnabled(soundToggleCfg.checked));

document.body.addEventListener("pointerdown", () => SoundFX.unlock(), { once: true });

// JUGADAS LEGALES
const legalMovesCheckbox = document.getElementById("toggle-legal");
const legalMovesCheckboxCfg = document.getElementById("toggle-legal-cfg");
const legalMovesBtn = document.getElementById("toggle-legal-btn");

function syncLegalMovesUI() {
  if (legalMovesCheckbox) legalMovesCheckbox.checked = showLegalMoves;
  if (legalMovesCheckboxCfg) legalMovesCheckboxCfg.checked = showLegalMoves;
  if (legalMovesBtn) {
    legalMovesBtn.textContent = showLegalMoves ? "🎯 Jugadas: ON" : "🎯 Jugadas: OFF";
    legalMovesBtn.classList.toggle("off", !showLegalMoves);
    legalMovesBtn.setAttribute("aria-pressed", String(showLegalMoves));
  }
}

function setShowLegalMoves(value) {
  showLegalMoves = value;
  localStorage.setItem("chessShowLegalMoves", value ? "on" : "off");
  syncLegalMovesUI();
  render();
  toast(showLegalMoves ? "🎯 Jugadas posibles activadas" : "🎯 Jugadas posibles desactivadas");
}

if (legalMovesCheckbox) legalMovesCheckbox.addEventListener("change", () => setShowLegalMoves(legalMovesCheckbox.checked));
if (legalMovesCheckboxCfg) legalMovesCheckboxCfg.addEventListener("change", () => setShowLegalMoves(legalMovesCheckboxCfg.checked));
if (legalMovesBtn) legalMovesBtn.addEventListener("click", () => setShowLegalMoves(!showLegalMoves));
syncLegalMovesUI();

// AMENAZAS
const threatsCheckbox = document.getElementById("toggle-threats");
const threatsCheckboxCfg = document.getElementById("toggle-threats-cfg");

function syncThreatsUI() {
  if (threatsCheckbox) threatsCheckbox.checked = showThreats;
  if (threatsCheckboxCfg) threatsCheckboxCfg.checked = showThreats;
}

function setShowThreats(value) {
  showThreats = value;
  localStorage.setItem("chessShowThreats", showThreats ? "on" : "off");
  syncThreatsUI();
  if (gameStarted) render();
  toast(showThreats ? "⚔️ Amenazas activadas" : "⚔️ Amenazas desactivadas");
}

if (threatsCheckbox) threatsCheckbox.addEventListener("change", () => setShowThreats(threatsCheckbox.checked));
if (threatsCheckboxCfg) threatsCheckboxCfg.addEventListener("change", () => setShowThreats(threatsCheckboxCfg.checked));
syncThreatsUI();

// MODO EXPLICACIÓN DIDÁCTICA
explainMode = localStorage.getItem("chessExplainMode") !== "off";
const explainCheckbox = document.getElementById("toggle-explain");
const explainCheckboxCfg = document.getElementById("toggle-explain-cfg");

function syncExplainUI() {
  if (explainCheckbox) explainCheckbox.checked = explainMode;
  if (explainCheckboxCfg) explainCheckboxCfg.checked = explainMode;
}

function setShowExplainMode(value) {
  explainMode = value;
  localStorage.setItem("chessExplainMode", value ? "on" : "off");
  syncExplainUI();
  toast(explainMode ? "💡 Explicaciones de jugadas activadas" : "💡 Explicaciones desactivadas");
}

if (explainCheckbox) explainCheckbox.addEventListener("change", () => setShowExplainMode(explainCheckbox.checked));
if (explainCheckboxCfg) explainCheckboxCfg.addEventListener("change", () => setShowExplainMode(explainCheckboxCfg.checked));
syncExplainUI();

function showMoveExplanation(fenBefore, move) {
  if (!explainMode || !move) return;
  const explainEl = document.getElementById("explain-text");
  if (!explainEl) return;

  let text = "";
  const pieceNames = { p: "El peón", n: "El caballo", b: "El alfil", r: "La torre", q: "La dama", k: "El rey" };
  const pName = pieceNames[move.piece.toLowerCase()] || "La pieza";

  if (move.san.includes("#")) {
    text = `¡Jaque Mate! ${pName} asesta el golpe final.`;
  } else if (move.san.includes("+")) {
    text = `¡Jaque! ${pName} ataca directamente al rey enemigo.`;
  } else if (move.flags && move.flags.includes("e")) {
    text = `${pName} realiza una captura al paso.`;
  } else if (move.flags && move.flags.includes("c")) {
    const capturedName = pieceNames[move.captured ? move.captured.toLowerCase() : "p"] || "pieza";
    text = `${pName} captura a ${capturedName.toLowerCase()} en ${move.to}.`;
  } else if (move.flags && (move.flags.includes("k") || move.flags.includes("q"))) {
    text = `Enroque: resguarda al rey y activa la torre simultáneamente.`;
  } else if (move.flags && move.flags.includes("p")) {
    text = `¡Coronación! El peón alcanza la última fila y se transforma.`;
  } else {
    text = `${pName} avanza a ${move.to}.`;
  }

  explainEl.textContent = text;
}

// CHAT Y NOTIFICACIONES
const chatNotifCheckboxCfg = document.getElementById("toggle-chatnotif-cfg");
function syncChatNotifCfgUI_() {
  if (chatNotifCheckboxCfg) chatNotifCheckboxCfg.checked = !matchChatMuted;
}
function setMatchChatMuted(muted) {
  matchChatMuted = muted;
  localStorage.setItem("chessMatchChatMuted", matchChatMuted ? "on" : "off");
  syncChatNotifCfgUI_();
}
if (chatNotifCheckboxCfg) {
  chatNotifCheckboxCfg.checked = !matchChatMuted;
  chatNotifCheckboxCfg.addEventListener("change", () => {
    setMatchChatMuted(!chatNotifCheckboxCfg.checked);
    toast(matchChatMuted ? "🔕 Chat silenciado" : "🔔 Chat con notificaciones");
  });
}

const avatarBtnCfg = document.getElementById("config-avatar-btn");
if (avatarBtnCfg) avatarBtnCfg.addEventListener("click", openAvatarPicker);

// PERFIL Y DATOS
const studentNameInput = document.getElementById("student-name");
const studentCourseInput = document.getElementById("student-course");
if (studentNameInput) studentNameInput.value = state.name === "Alumno" ? "" : state.name;
if (studentCourseInput) studentCourseInput.value = state.course || "";
const saveProfileBtn = document.getElementById("save-profile");
if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", () => {
    const name = studentNameInput ? studentNameInput.value.trim() : "";
    const course = studentCourseInput ? studentCourseInput.value.trim() : "";
    state.name = name || "Alumno";
    state.course = course;
    save();
    updateProfile();
    toast("💾 Perfil guardado");
  });
}

// TEMAS Y PIEZAS
function applyTheme(themeName) {
  document.documentElement.setAttribute("data-theme", themeName);
  localStorage.setItem("chessTheme", themeName);
  const themeSelect = document.getElementById("config-theme-select");
  if (themeSelect) themeSelect.value = themeName;
}

function applyPieceStyle(pieceStyle) {
  document.documentElement.setAttribute("data-piece-style", pieceStyle);
  localStorage.setItem("chessPieceStyle", pieceStyle);
  const pieceSelect = document.getElementById("config-piece-select");
  if (pieceSelect) pieceSelect.value = pieceStyle;
}

const resetPreferencesBtn = document.getElementById("reset-preferences");
if (resetPreferencesBtn) {
  resetPreferencesBtn.addEventListener("click", () => {
    if (!confirm("¿Restaurar tema, fichas y las 4 ayudas de juego a los valores de fábrica? No afecta tu progreso ni tu perfil.")) {
      return;
    }
    applyTheme("blue");
    applyPieceStyle("classic");
    showLegalMoves = true;
    localStorage.setItem("chessShowLegalMoves", "on");
    syncLegalMovesUI();
    showThreats = true;
    localStorage.setItem("chessShowThreats", "on");
    syncThreatsUI();
    explainMode = true;
    localStorage.setItem("chessExplainMode", "on");
    syncExplainUI();
    setSoundEnabled(true);
    setMatchChatMuted(false);
    if (gameStarted) render();
    toast("↺ Preferencias restauradas a los valores de fábrica");
  });
}

// RESPALDO DE DATOS (IMPORTAR / EXPORTAR)
const BACKUP_KEYS = [
  "chessSchoolData",
  "chessTheme",
  "chessPieceStyle",
  "chessShowLegalMoves",
  "chessShowThreats",
  "chessExplainMode",
  "chessMatchChatMuted",
  "chessSoundEnabled"
];

function exportUserData() {
  const exportObj = {};
  BACKUP_KEYS.forEach((key) => {
    const val = localStorage.getItem(key);
    if (val !== null) {
      exportObj[key] = val;
    }
  });
  exportObj._exportDate = new Date().toISOString();
  exportObj._version = 1;

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
  const dlAnchor = document.createElement("a");
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `ajedrez_respaldo_${(state.name || "alumno").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
  toast("📥 Copia de seguridad exportada");
}

function importUserData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("El archivo no contiene un formato de respaldo válido.");
      }
      let count = 0;
      BACKUP_KEYS.forEach((key) => {
        if (parsed[key] !== undefined) {
          localStorage.setItem(key, parsed[key]);
          count++;
        }
      });
      if (count === 0 && !parsed.chessSchoolData) {
        throw new Error("No se encontraron datos de ajedrez válidos en este archivo.");
      }
      state = loadState();
      updateProfile();
      syncSoundUI();
      syncLegalMovesUI();
      syncThreatsUI();
      syncExplainUI();
      syncChatNotifCfgUI_();
      if (parsed.chessTheme) applyTheme(parsed.chessTheme);
      if (parsed.chessPieceStyle) applyPieceStyle(parsed.chessPieceStyle);
      renderSavedGamesList();
      if (gameStarted) render();
      toast("📤 Datos importados correctamente");
    } catch (err) {
      showError(err, "Error al importar el archivo de respaldo");
    }
  };
  reader.readAsText(file);
}

const exportBtn = document.getElementById("export-data");
if (exportBtn) exportBtn.addEventListener("click", exportUserData);

const importBtn = document.getElementById("import-data");
const importFileInput = document.getElementById("import-file-input");
if (importBtn && importFileInput) {
  importBtn.addEventListener("click", () => importFileInput.click());
  importFileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      importUserData(e.target.files[0]);
      importFileInput.value = "";
    }
  });
}

const clearProgressBtn = document.getElementById("clear-progress");
if (clearProgressBtn) {
  clearProgressBtn.addEventListener("click", () => {
    if (confirm("⚠️ ¿Estás seguro de reiniciar todo tu progreso (XP, historial, victorias)? Esta acción no se puede deshacer.")) {
      state = { ...DEFAULT_STATE };
      save();
      updateProfile();
      renderSavedGamesList();
      toast("🧹 Progreso reiniciado");
    }
  });
}

// Inicializaciones de arranque
syncInternetClock_();
updateProfile();
renderSavedGamesList();