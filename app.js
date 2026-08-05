"use strict";

import { formatTime, capitalizeFirst, dayOfYear, cpToWin, classifyLoss, levelLabel } from "./utils.js";

if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

const PERF_DEBUG = false;

let state;

let matchChatPanelOpen;

let gameStarted;

let tournamentMatchActive;

let opponentMoveHighlight;

let explainMode;

let lastTournamentState;

let currentUser;

let internetClockOffsetMs = 0;

const TOURNAMENT_ADMIN_EMAIL = "ipem146centenario@gmail.com";

(function injectTapFeedbackStyles_() {
  const style = document.createElement("style");
  style.textContent = `\n          html, *, *::before, *::after {\n            -webkit-tap-highlight-color: transparent;\n          }\n          button, .btn, a, [role="button"], .avatar-bubble, .avatar-option {\n            touch-action: manipulation;\n          }\n          button:active,\n          .btn:active,\n          .avatar-option:active,\n          .avatar-bubble:active {\n            transform: scale(0.96);\n            opacity: 0.85;\n            transition: transform 0.08s ease-out, opacity 0.08s ease-out;\n          }\n        `;
  document.head.appendChild(style);
})();

const PIECES = {
  wK: "♔",
  wQ: "♕",
  wR: "♖",
  wB: "♗",
  wN: "♘",
  wP: "♙",
  bK: "♚",
  bQ: "♛",
  bR: "♜",
  bB: "♝",
  bN: "♞",
  bP: "♟"
};

const FILES = [ "a", "b", "c", "d", "e", "f", "g", "h" ];

const AVATAR_MASCOTS = {
  knight: {
    emoji: "♞",
    label: "Caballo saltarín",
    anim: "avatar-bounce",
    color1: "#7c3aed",
    color2: "#a78bfa"
  },
  pawn: {
    emoji: "♟",
    label: "Peón valiente",
    anim: "avatar-wiggle",
    color1: "#2563eb",
    color2: "#60a5fa"
  },
  rook: {
    emoji: "♜",
    label: "Torre firme",
    anim: "avatar-pulse",
    color1: "#059669",
    color2: "#34d399"
  },
  bishop: {
    emoji: "♝",
    label: "Alfil astuto",
    anim: "avatar-tilt",
    color1: "#d97706",
    color2: "#fbbf24"
  },
  queen: {
    emoji: "♛",
    label: "Dama veloz",
    anim: "avatar-spin",
    color1: "#db2777",
    color2: "#f472b6"
  },
  king: {
    emoji: "♚",
    label: "Rey sabio",
    anim: "avatar-nod",
    color1: "#dc2626",
    color2: "#f87171"
  }
};

let avatarStylesInjected = false;

function injectAvatarStyles_() {
  if (avatarStylesInjected) return;
  avatarStylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `\n          .avatar-bubble {\n            display: inline-flex; align-items: center; justify-content: center;\n            width: 34px; height: 34px; border-radius: 50%;\n            font-size: 18px; line-height: 1; cursor: pointer;\n            box-shadow: 0 2px 6px rgba(0,0,0,.25);\n            border: 2px solid rgba(255,255,255,.6);\n            vertical-align: middle; margin-right: 8px;\n            user-select: none; flex-shrink: 0;\n            transition: transform 0.15s ease-out;\n          }\n          .avatar-bubble.large { width: 54px; height: 54px; font-size: 28px; }\n          .avatar-bubble.static { animation: none !important; }\n          .avatar-bubble:hover { transform: scale(1.08); }\n          @keyframes avatar-bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }\n          @keyframes avatar-wiggle { 0%,100%{transform:rotate(-8deg)} 50%{transform:rotate(8deg)} }\n          @keyframes avatar-pulse  { 0%,100%{transform:scale(1)} 50%{transform:scale(1.12)} }\n          @keyframes avatar-tilt   { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(14deg)} }\n          @keyframes avatar-spin   { 0%{transform:rotate(0deg)} 100%{transform:rotate(360deg)} }\n          @keyframes avatar-nod    { 0%,100%{transform:translateY(0) rotate(0)} 50%{transform:translateY(2px) rotate(-4deg)} }\n          .avatar-bounce { animation: avatar-bounce 1.1s ease-in-out infinite; }\n          .avatar-wiggle { animation: avatar-wiggle 1.4s ease-in-out infinite; }\n          .avatar-pulse  { animation: avatar-pulse 1.3s ease-in-out infinite; }\n          .avatar-tilt   { animation: avatar-tilt 1.6s ease-in-out infinite; }\n          .avatar-spin   { animation: avatar-spin 3.2s linear infinite; }\n          .avatar-nod    { animation: avatar-nod 1.2s ease-in-out infinite; }\n          /* Quien tenga activado "reducir movimiento" en su sistema no\n             tiene por qué ver 6 mascotas dando vueltas sin parar en cada\n             pantalla; se les congela la pose (sin perder el color/forma\n             que identifica a cada una). */\n          @media (prefers-reduced-motion: reduce) {\n            .avatar-bounce, .avatar-wiggle, .avatar-pulse,\n            .avatar-tilt, .avatar-spin, .avatar-nod { animation: none; }\n            .avatar-bubble:hover { transform: none; }\n          }\n          #avatar-picker-backdrop {\n            position: fixed; inset: 0; background: rgba(0,0,0,.55);\n            display: flex; align-items: center; justify-content: center;\n            z-index: 9999;\n          }\n          /* Antes en colores fijos (#1e1e2e / #fff), lo que dejaba el\n             modal desentonando si la app tiene o suma un tema claro. Usa\n             las mismas variables que ya define el resto de la app\n             (--surface/--text), con el valor anterior como fallback por\n             si este archivo se usa suelto sin ese tema. */\n          #avatar-picker-box {\n            background: var(--surface, #1e1e2e); color: var(--text, #fff);\n            padding: 20px; border-radius: 14px;\n            max-width: 320px; width: 90%; text-align: center;\n            box-shadow: 0 10px 30px rgba(0,0,0,.4);\n          }\n          #avatar-picker-box h3 { margin: 0 0 12px; font-size: 16px; }\n          #avatar-picker-grid {\n            display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;\n            margin-bottom: 14px;\n          }\n          .avatar-option {\n            display: flex; flex-direction: column; align-items: center; gap: 6px;\n            padding: 8px 4px; border-radius: 10px; cursor: pointer;\n            border: 2px solid transparent;\n            transition: background-color 0.15s ease-out, border-color 0.15s ease-out;\n          }\n          .avatar-option:hover { background: var(--surface2, rgba(255,255,255,.08)); }\n          .avatar-option.selected { border-color: var(--accent, #fff); background: var(--surface2, rgba(255,255,255,.08)); }\n          /* Las opciones ahora llevan tabindex/role="button" (ver\n             openAvatarPicker), así que necesitan un foco visible propio\n             para quien navega con teclado; antes no había forma de saber\n             cuál estaba seleccionada sin mouse. */\n          .avatar-option:focus-visible {\n            outline: 2px solid var(--accent, #fff);\n            outline-offset: 2px;\n          }\n          .avatar-option span.opt-label { font-size: 11px; opacity: .85; }\n          #avatar-picker-close {\n            background: var(--surface2, #444); color: var(--text, #fff); border: none; border-radius: 8px;\n            padding: 8px 16px; cursor: pointer; font-size: 13px;\n            transition: filter 0.15s ease-out;\n          }\n          #avatar-picker-close:hover { filter: brightness(1.15); }\n          #avatar-picker-close:focus-visible {\n            outline: 2px solid var(--accent, #fff);\n            outline-offset: 2px;\n          }\n        `;
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
  holder.querySelector(".avatar-bubble").onclick = openAvatarPicker;
}

function renderBoardAvatars_() {
  injectAvatarStyles_();
  const wEl = document.getElementById("clock-w");
  const bEl = document.getElementById("clock-b");
  [ wEl, bEl ].forEach(el => {
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
  const options = Object.keys(AVATAR_MASCOTS).map(id => {
    const sel = id === current ? " selected" : "";
    return `\n            <div class="avatar-option${sel}" data-avatar="${id}" tabindex="0" role="button" aria-pressed="${id === current}" aria-label="${escapeHtml_(AVATAR_MASCOTS[id].label)}">\n              ${avatarBubbleHTML_(id, {
      large: true
    })}\n              <span class="opt-label">${escapeHtml_(AVATAR_MASCOTS[id].label)}</span>\n            </div>`;
  }).join("");
  backdrop.innerHTML = `\n          <div id="avatar-picker-box">\n            <h3>🐴 Elegí tu mascota</h3>\n            <div id="avatar-picker-grid">${options}</div>\n            <button id="avatar-picker-close">Cerrar</button>\n          </div>`;
  document.body.appendChild(backdrop);
  backdrop.addEventListener("click", e => {
    if (e.target === backdrop) closeAvatarPicker_();
  });
  document.addEventListener("keydown", handleAvatarPickerEscape_);
  const chooseAvatar = opt => {
    state.avatar = opt.dataset.avatar;
    save();
    renderMiniAvatar();
    renderBoardAvatars_();
    closeAvatarPicker_();
    toast("✓ Mascota actualizada");
  };
  backdrop.querySelectorAll(".avatar-option").forEach(opt => {
    opt.addEventListener("click", () => chooseAvatar(opt));
    opt.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        chooseAvatar(opt);
      }
    });
  });
  document.getElementById("avatar-picker-close").addEventListener("click", closeAvatarPicker_);
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
  avatar: "knight"
};

state = loadState();

let toastTimer = null;

let alertOnClose_ = null;

function escapeHtml_(text) {
  return String(text == null ? "" : text).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("chessSchoolData"));
    return {
      ...DEFAULT_STATE,
      ...saved || {}
    };
  } catch {
    return {
      ...DEFAULT_STATE
    };
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
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), durationMs || 2200);
}

function showAlert(text, variant) {
  const box = document.getElementById("alert-box");
  box.classList.remove("result-win", "result-loss", "result-draw");
  if (variant) box.classList.add("result-" + variant);
  document.getElementById("alert-box-text").textContent = text;
  document.getElementById("alert-analyze-btn").style.display = "none";
  const backBtn = document.getElementById("alert-back-to-tournament-btn");
  if (backBtn) backBtn.style.display = "none";
  const chatBtn = document.getElementById("alert-chat-btn");
  if (chatBtn) chatBtn.style.display = "none";
  alertOnClose_ = null;
  document.getElementById("alert").classList.add("show");
}

function closeAlert_() {
  document.getElementById("alert").classList.remove("show");
  const cb = alertOnClose_;
  alertOnClose_ = null;
  if (cb) cb();
}

function offerAnalysis(gameId) {
  const btn = document.getElementById("alert-analyze-btn");
  btn.style.display = "inline-flex";
  btn.onclick = () => {
    closeAlert_();
    openAnalysisModal(gameId);
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
      document.getElementById("alert-box").appendChild(btn);
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
      if (!matchChatPanelOpen) toggleMatchChatPanel();
    };
  }
}

document.getElementById("alert").onclick = e => {
  if (e.target.id === "alert") {
    closeAlert_();
  }
};

const game = new Chess;

let selected = null;

let validMoves = [];

let showLegalMoves = localStorage.getItem("chessShowLegalMoves") !== "off";

let showThreats = localStorage.getItem("chessShowThreats") !== "off";

let dragCtx = null;

let justDraggedUntil = 0;

const DRAG_THRESHOLD = 6;

const SoundFX = (() => {
  let ctx = null;
  let enabled = true;
  let ringInterval = null;
  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC;
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }
  function tone(freq, start, duration, {type: type = "sine", gain: gain = .16, glideTo: glideTo = null} = {}) {
    const c = ensureCtx();
    if (!c) return;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, c.currentTime + start);
    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, c.currentTime + start + duration);
    }
    g.gain.setValueAtTime(1e-4, c.currentTime + start);
    g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + .012);
    g.gain.exponentialRampToValueAtTime(1e-4, c.currentTime + start + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(c.currentTime + start);
    osc.stop(c.currentTime + start + duration + .02);
  }
  function noiseHit(start, duration, gain = .18) {
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
    g.gain.exponentialRampToValueAtTime(1e-4, c.currentTime + start + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(c.destination);
    src.start(c.currentTime + start);
  }
  const fx = {
    setEnabled(v) {
      enabled = v;
    },
    isEnabled() {
      return enabled;
    },
    unlock() {
      ensureCtx();
    },
    move() {
      if (!enabled) return;
      tone(520, 0, .09, {
        type: "triangle",
        gain: .14
      });
    },
    capture() {
      if (!enabled) return;
      noiseHit(0, .11, .22);
      tone(220, .01, .1, {
        type: "square",
        gain: .1
      });
    },
    castle() {
      if (!enabled) return;
      tone(440, 0, .08, {
        type: "triangle",
        gain: .13
      });
      tone(560, .08, .1, {
        type: "triangle",
        gain: .13
      });
    },
    check() {
      if (!enabled) return;
      tone(740, 0, .09, {
        type: "sawtooth",
        gain: .12
      });
      tone(880, .09, .12, {
        type: "sawtooth",
        gain: .12
      });
    },
    checkmate() {
      if (!enabled) return;
      tone(660, 0, .14, {
        type: "sawtooth",
        gain: .15
      });
      tone(523, .14, .14, {
        type: "sawtooth",
        gain: .15
      });
      tone(392, .28, .32, {
        type: "sawtooth",
        gain: .16
      });
    },
    draw() {
      if (!enabled) return;
      tone(440, 0, .16, {
        type: "sine",
        gain: .13
      });
      tone(440, .18, .16, {
        type: "sine",
        gain: .13
      });
    },
    select() {
      if (!enabled) return;
      tone(880, 0, .045, {
        type: "sine",
        gain: .06
      });
    },
    chatMessage() {
      if (!enabled) return;
      tone(700, 0, .06, {
        type: "sine",
        gain: .09
      });
      tone(920, .07, .08, {
        type: "sine",
        gain: .09
      });
    },
    announcement() {
      if (!enabled) return;
      tone(660, 0, .1, {
        type: "sine",
        gain: .15
      });
      tone(880, .12, .1, {
        type: "sine",
        gain: .15
      });
      tone(1040, .24, .16, {
        type: "sine",
        gain: .16
      });
    },
    invalid() {
      if (!enabled) return;
      tone(160, 0, .13, {
        type: "square",
        gain: .09
      });
    },
    gameStart() {
      if (!enabled) return;
      tone(392, 0, .09, {
        type: "triangle",
        gain: .12
      });
      tone(494, .09, .09, {
        type: "triangle",
        gain: .12
      });
      tone(659, .18, .16, {
        type: "triangle",
        gain: .14
      });
    },
    promote() {
      if (!enabled) return;
      tone(523, 0, .08, {
        type: "triangle",
        gain: .13
      });
      tone(659, .08, .08, {
        type: "triangle",
        gain: .13
      });
      tone(784, .16, .14, {
        type: "triangle",
        gain: .15
      });
    },
    levelUp() {
      if (!enabled) return;
      tone(523, 0, .1, {
        type: "triangle",
        gain: .14
      });
      tone(659, .1, .1, {
        type: "triangle",
        gain: .14
      });
      tone(784, .2, .1, {
        type: "triangle",
        gain: .14
      });
      tone(1047, .3, .28, {
        type: "triangle",
        gain: .17
      });
    },
    startRing() {
      if (ringInterval) return;
      const ringPattern = () => {
        if (!enabled) return;
        tone(1e3, 0, .35, {
          type: "sine",
          gain: .15
        });
        tone(1e3, .45, .35, {
          type: "sine",
          gain: .15
        });
      };
      ringPattern();
      ringInterval = setInterval(ringPattern, 2e3);
    },
    stopRing() {
      if (ringInterval) {
        clearInterval(ringInterval);
        ringInterval = null;
      }
    }
  };
  return fx;
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
    capturedSquare: isEnPassant ? move.to[0] + move.from[1] : move.to,
    promoted: !!(move.flags && move.flags.includes("p"))
  };
}

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
      fetch("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js").then(res => res.text()).then(code => {
        const blob = new Blob([ code ], {
          type: "application/javascript"
        });
        sfWorker = new Worker(URL.createObjectURL(blob));
      });
    } catch (err) {
      console.error("No se pudo iniciar Stockfish", err);
    }
  }
}

function ensureStockfishWorker() {
  if (!sfWorker) initStockfishWorker();
}

function getStockfishSkill(difficulty) {
  switch (difficulty) {
   case "facil":
    return 2;

   case "medio":
    return 8;

   case "dificil":
    return 15;

   case "experto":
    return 20;

   default:
    return 8;
  }
}

function getStockfishDepth(difficulty) {
  switch (difficulty) {
   case "facil":
    return 2;

   case "medio":
    return 5;

   case "dificil":
    return 10;

   case "experto":
    return 14;

   default:
    return 5;
  }
}

function getStockfishMoveTime(difficulty) {
  switch (difficulty) {
   case "facil":
    return 150;

   case "medio":
    return 350;

   case "dificil":
    return 700;

   case "experto":
    return 1100;

   default:
    return 350;
  }
}

function maybeTriggerBotMove() {
  if (tournamentMatchActive) {
    if (opponentMoveHighlight) {
      clearOpponentMoveHighlight();
      render();
    }
    syncTournamentMove();
    return;
  }
  if (!botEnabled || !gameStarted || game.game_over() || game.turn() !== botColor) return;
  ensureStockfishWorker();
  botThinking = true;
  render();
  if (!sfWorker) {
    setTimeout(() => {
      const moves = game.ugly_moves({
        verbose: true
      });
      if (moves.length > 0) {
        const m = moves[Math.floor(Math.random() * moves.length)];
        const fenBeforeMove = game.fen();
        const rndMove = game.move({
          from: m.from,
          to: m.to,
          promotion: m.promotion || "q"
        });
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
    if (typeof line === "string" && line.startsWith("bestmove")) {
      const bestMove = line.split(" ")[1];
      if (bestMove && bestMove.length >= 4) {
        const from = bestMove.substring(0, 2);
        const to = bestMove.substring(2, 4);
        const promotion = bestMove.length > 4 ? bestMove[4] : undefined;
        const fenBeforeMove = game.fen();
        const sfMove = game.move({
          from: from,
          to: to,
          promotion: promotion || "q"
        });
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
  sfWorker.postMessage("uci");
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

const RTC_ICE_SERVERS = {
  iceServers: [ {
    urls: "stun:stun.l.google.com:19302"
  } ]
};

let callPc = null;

let callLocalStream = null;

let callDocUnsub = null;

let callCandidatesUnsub = [];

let callState = "idle";

let callIsMuted = false;

let callPendingOffer = null;

let tournamentTimeoutClaimBusy = false;

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
        }, {
          once: true
        });
      }
    }, {
      once: true
    });
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
  return {
    x: (displayCol + .5) * 12.5,
    y: (displayRow + .5) * 12.5
  };
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
  const endX = p2.x - dx / len * shorten;
  const endY = p2.y - dy / len * shorten;
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
    const moves = temp.moves({
      verbose: true
    });
    const set = new Set;
    for (const m of moves) set.add(m.to);
    return set;
  } catch (e) {
    return new Set;
  }
}

let threatenedSquaresCache = {
  fen: null,
  result: null
};

function getThreatenedSquares(fen) {
  if (threatenedSquaresCache.fen === fen) return threatenedSquaresCache.result;
  const whiteTargets = computeReachableSquares(fen, "w");
  const blackTargets = computeReachableSquares(fen, "b");
  const temp = new Chess(fen);
  const threatened = new Set;
  const squares = [ "a", "b", "c", "d", "e", "f", "g", "h" ];
  for (const file of squares) {
    for (let rank = 1; rank <= 8; rank++) {
      const sq = file + rank;
      const p = temp.get(sq);
      if (!p) continue;
      if (p.color === "w" && blackTargets.has(sq)) threatened.add(sq);
      if (p.color === "b" && whiteTargets.has(sq)) threatened.add(sq);
    }
  }
  threatenedSquaresCache = {
    fen: fen,
    result: threatened
  };
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
  const boardFrameEl = board.closest(".board-frame");
  if (boardFrameEl) boardFrameEl.classList.toggle("thinking", !!botThinking);
  const isCheck = game.in_check();
  const turn = game.turn();
  const threatsEnabled = !tournamentMatchActive && (document.getElementById("toggle-threats") ? document.getElementById("toggle-threats").checked : showThreats);
  const threatenedSquares = threatsEnabled ? getThreatenedSquares(game.fen()) : null;
  const pvpFlipEl = document.getElementById("pvp-flip");
  const pvpAutoFlip = !!(pvpFlipEl && pvpFlipEl.checked);
  const isFlipped = tournamentMatchActive ? tournamentMyColor() === "b" : botEnabled ? botColor === "w" : pvpAutoFlip && turn === "b";
  const rows = isFlipped ? [ 7, 6, 5, 4, 3, 2, 1, 0 ] : [ 0, 1, 2, 3, 4, 5, 6, 7 ];
  const cols = isFlipped ? [ 7, 6, 5, 4, 3, 2, 1, 0 ] : [ 0, 1, 2, 3, 4, 5, 6, 7 ];
  const squares = [ "a", "b", "c", "d", "e", "f", "g", "h" ];
  let movedPieceEl = null;
  let capturedSquareEl = null;
  const fullHistory = game.history({
    verbose: true
  });
  const lastMove = fullHistory.length > 0 ? fullHistory[fullHistory.length - 1] : null;
  const oldArrow = board.querySelector(".opp-move-arrow-overlay");
  if (oldArrow) oldArrow.remove();
  const needsRebuild = !boardSquareEls_ || boardFlipState_ !== isFlipped || board.children.length !== 64;
  if (needsRebuild) {
    board.innerHTML = "";
    boardSquareEls_ = new Map;
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
    square.classList.remove("selected", "last", "opp-move", "check", "hint", "threat", "capture-flash");
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
    if (isCheck && pieceObj && pieceObj.type === "k" && pieceObj.color === turn) {
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
  const statusText = !gameStarted ? "Pulsa 'Iniciar partida' para comenzar" : botThinking ? "🤖 La IA está pensando…" : game.game_over() ? "Partida terminada" : `Turno de las ${turn === "w" ? "Blancas" : "Negras"}${isCheck ? " · ¡Jaque!" : ""}`;
  document.getElementById("status").textContent = statusText;
  updateClockDisplay();
}

function renderCapturedMaterial() {
  const capturedWEl = document.getElementById("captured-w");
  const capturedBEl = document.getElementById("captured-b");
  const capturedWFloatEl = document.getElementById("captured-w-float");
  const capturedBFloatEl = document.getElementById("captured-b-float");
  if (!capturedWEl && !capturedBEl && !capturedWFloatEl && !capturedBFloatEl) return;
  const vals = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9
  };
  const order = [ "q", "r", "b", "n", "p" ];
  const STANDARD = {
    p: 8,
    n: 2,
    b: 2,
    r: 2,
    q: 1
  };
  const board = game.board();
  const counts = {
    w: {
      p: 0,
      n: 0,
      b: 0,
      r: 0,
      q: 0
    },
    b: {
      p: 0,
      n: 0,
      b: 0,
      r: 0,
      q: 0
    }
  };
  let whiteValue = 0;
  let blackValue = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.type === "k") continue;
      counts[p.color][p.type]++;
      if (p.color === "w") whiteValue += vals[p.type]; else blackValue += vals[p.type];
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
    return amount > 0 ? `<span style="font-size:12px; font-weight:600; color:var(--text); margin-left:4px;">+${amount}</span>` : "";
  }
  const wHtml = glyphsHtml(missingBlack, "b") + advantageHtml(diff > 0 ? diff : 0);
  const bHtml = glyphsHtml(missingWhite, "w") + advantageHtml(diff < 0 ? -diff : 0);
  if (capturedWEl) capturedWEl.innerHTML = wHtml;
  if (capturedBEl) capturedBEl.innerHTML = bHtml;
  if (capturedWFloatEl) capturedWFloatEl.innerHTML = wHtml;
  if (capturedBFloatEl) capturedBFloatEl.innerHTML = bHtml;
}

function updateEvalBar() {
  const board = game.board();
  let score = 0;
  const vals = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0
  };
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        const val = vals[p.type];
        score += p.color === "w" ? val : -val;
      }
    }
  }
  const percentage = Math.max(5, Math.min(95, 50 + score * 5));
  document.getElementById("eval-bar").style.width = percentage + "%";
}

let renderedMoveCount = 0;

function renderMoves() {
  const container = document.getElementById("moves");
  const emptyMsg = document.getElementById("moves-empty");
  const countEl = document.getElementById("moves-count");
  const verboseHistory = game.history({
    verbose: true
  });
  if (countEl) countEl.textContent = verboseHistory.length;
  if (!verboseHistory.length) {
    container.querySelectorAll(".move-row").forEach(el => el.remove());
    renderedMoveCount = 0;
    if (emptyMsg) emptyMsg.style.display = "";
    return;
  }
  if (emptyMsg) emptyMsg.style.display = "none";
  const buildMoveSpan = m => {
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
    container.querySelectorAll(".move-row").forEach(el => el.remove());
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
  pieceEl.addEventListener("pointerdown", e => {
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
      pieceEl: pieceEl,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
      currentDropEl: null
    };
    window.addEventListener("pointermove", onPieceDragMove);
    window.addEventListener("pointerup", onPieceDragUp, {
      once: true
    });
  });
}

function updateSelectionHighlights() {
  const board = document.getElementById("board");
  if (!board) return;
  board.querySelectorAll(".square.selected").forEach(sq => sq.classList.remove("selected"));
  board.querySelectorAll(".square.hint").forEach(sq => sq.classList.remove("hint"));
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
    const moves = game.moves({
      square: dragCtx.from,
      verbose: true
    });
    validMoves = moves.map(m => m.to);
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
  return new Promise(resolve => {
    const overlay = document.getElementById("promo");
    const box = document.getElementById("promo-box");
    if (!overlay || !box) {
      resolve("q");
      return;
    }
    const options = [ {
      code: "q",
      label: "Dama"
    }, {
      code: "r",
      label: "Torre"
    }, {
      code: "b",
      label: "Alfil"
    }, {
      code: "n",
      label: "Caballo"
    } ];
    box.innerHTML = "";
    const title = document.createElement("div");
    title.className = "promo-title";
    title.textContent = "Elegí la pieza para coronar";
    box.appendChild(title);
    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = PIECES[color + opt.code.toUpperCase()];
      btn.setAttribute("aria-label", opt.label);
      btn.title = opt.label;
      btn.addEventListener("click", () => {
        overlay.classList.remove("show");
        resolve(opt.code);
      }, {
        once: true
      });
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
  document.querySelectorAll(".square.drop-target").forEach(sq => sq.classList.remove("drop-target"));
  document.querySelectorAll(".square.drag-origin").forEach(sq => sq.classList.remove("drag-origin"));
  if (to && validMoves.includes(to)) {
    let promotion = "q";
    if (isPromotionMove(game, ctx.from, to)) {
      render();
      promotion = await askPromotion(game.turn());
    }
    const fenBeforeMove = game.fen();
    const move = game.move({
      from: ctx.from,
      to: to,
      promotion: promotion
    });
    if (move) {
      addIncrement();
      selected = null;
      validMoves = [];
      markMoveForAnimation(move);
      playSoundForMove(move, game);
      showMoveExplanation(fenBeforeMove, move);
      if (navigator.vibrate) {
        const isCapture = move.flags && (move.flags.includes("c") || move.flags.includes("e"));
        navigator.vibrate(isCapture ? [ 14, 30, 14 ] : 12);
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
    const move = game.move({
      from: from,
      to: sqName,
      promotion: promotion
    });
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
    const moves = game.moves({
      square: sqName,
      verbose: true
    });
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
      const winnerColor = game.turn() === "w" ? "b" : "w";
      const winner = winnerColor === "w" ? "Blancas" : "Negras";
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
  const tempGame = new Chess;
  const positions = [ clonePosition(tempGame) ];
  history.forEach(m => {
    tempGame.move(m);
    positions.push(clonePosition(tempGame));
  });
  const record = {
    id: "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    date: (new Date).toLocaleDateString("es-AR"),
    time: (new Date).toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit"
    }),
    result: resultText,
    mode: botEnabled ? "bot" : "pvp",
    difficulty: botEnabled ? botDifficulty : null,
    humanColor: botEnabled ? botColor === "w" ? "b" : "w" : null,
    moves: history,
    positions: positions,
    analysis: null
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
    fen: g.fen()
  };
}

function renderSavedGamesList() {
  const container = document.getElementById("saved-games-list");
  const emptyMsg = document.getElementById("saved-games-empty");
  if (!container || !emptyMsg) return;
  container.querySelectorAll(".saved-game-item").forEach(el => el.remove());
  const games = state.savedGames || [];
  if (!games.length) {
    emptyMsg.style.display = "block";
    return;
  }
  emptyMsg.style.display = "none";
  games.forEach(g => {
    const item = document.createElement("div");
    item.className = "saved-game-item";
    item.innerHTML = `\n            <div class="saved-game-info">\n              <b>${g.result}</b>\n              <small>${g.date} · ${g.time} · ${g.moves.length} jugadas</small>\n            </div>\n            <div class="saved-game-actions">\n              <button class="btn secondary" data-analyze="${g.id}">🔎 Analizar</button>\n              <button class="btn danger" data-delete="${g.id}">🗑</button>\n            </div>\n          `;
    container.appendChild(item);
  });
  container.querySelectorAll("[data-analyze]").forEach(btn => {
    btn.onclick = () => openAnalysisModal(btn.dataset.analyze);
  });
  container.querySelectorAll("[data-delete]").forEach(btn => {
    btn.onclick = () => {
      state.savedGames = (state.savedGames || []).filter(g => g.id !== btn.dataset.delete);
      save();
      renderSavedGamesList();
    };
  });
}

let clockTimer = null;

let clock = {
  w: 300,
  b: 300
};

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
  const prevTurn = game.turn() === "w" ? "b" : "w";
  if (clockEnabled && turnStartAt) {
    const elapsed = Math.max(0, Math.floor((Date.now() - turnStartAt) / 1e3));
    clock[prevTurn] = Math.max(0, clock[prevTurn] - elapsed);
  }
  const increment = getIncrement();
  if (increment && clockEnabled && !game.game_over()) {
    clock[prevTurn] += increment;
  }
  turnStartAt = clockEnabled ? Date.now() : null;
  updateClockDisplay();
}

function initClock(start = false) {
  clearInterval(clockTimer);
  const initial = getInitialTime();
  clockEnabled = initial > 0;
  clock = {
    w: initial,
    b: initial
  };
  clockFlagged = false;
  turnStartAt = start && initial > 0 ? Date.now() : null;
  if (start && initial > 0) {
    clockTimer = setInterval(() => {
      if (tournamentMatchActive || game.game_over()) return;
      updateClockDisplay();
    }, 1e3);
  }
  updateClockDisplay();
}

function getClockRemaining_(color) {
  if (!clockEnabled) return clock[color];
  if (game.turn() === color && turnStartAt && !game.game_over()) {
    const elapsed = Math.max(0, Math.floor((Date.now() - turnStartAt) / 1e3));
    return Math.max(0, clock[color] - elapsed);
  }
  return clock[color];
}

function updateClockDisplay() {
  if (tournamentMatchActive) return;
  const w = document.getElementById("clock-w");
  const b = document.getElementById("clock-b");
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
  const level = Math.floor(state.xp / 1e3) + 1;
  const progress = state.xp % 1e3;
  document.getElementById("mini-name").textContent = state.name || "Alumno";
  renderMiniAvatar();
  document.getElementById("mini-level").textContent = `Nivel ${level} · ${levelLabel(level)}`;
  document.getElementById("mini-xp").style.width = progress / 10 + "%";
  document.getElementById("mini-xp-text").textContent = `${progress} / 1000 XP`;
  document.getElementById("stat-xp").textContent = state.xp;
  document.getElementById("stat-wins").textContent = state.wins;
  document.getElementById("stat-puzzles").textContent = state.puzzles;
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
  if (mainProgressEl) mainProgressEl.style.width = progress / 10 + "%";
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
        row.innerHTML = `\n                <td>${entry.activity}</td>\n                <td>${entry.result}</td>\n                <td>+${entry.xp} XP</td>\n                <td>${entry.date}</td>\n              `;
        historyBody.appendChild(row);
      }
    }
  }
}

function celebrateLevelUp(level) {
  SoundFX.levelUp();
  if (navigator.vibrate) navigator.vibrate([ 20, 40, 20, 40, 60 ]);
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
  const colors = [ "var(--accent)", "var(--accent2)", "#ffffff", "var(--success)" ];
  const originX = window.innerWidth / 2;
  const originY = window.innerHeight * .22;
  for (let i = 0; i < 28; i++) {
    const p = document.createElement("span");
    p.className = "level-up-particle";
    const angle = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 140;
    const size = 4 + Math.random() * 7;
    p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    p.style.setProperty("--dy", Math.sin(angle) * dist - 40 + "px");
    p.style.setProperty("--dur", 1.1 + Math.random() * .9 + "s");
    p.style.setProperty("--delay", Math.random() * .25 + "s");
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
  state.history.push({
    activity: activity,
    result: result,
    xp: amount,
    date: (new Date).toLocaleDateString("es-AR")
  });
  save();
  toast(`🎉 +${amount} XP`);
  updateProfile();
}

function showPage(name) {
  document.querySelectorAll(".page").forEach(page => {
    page.classList.toggle("active", page.id === "page-" + name);
  });
  document.querySelectorAll("[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === name);
  });
  if (name === "jugar") render();
  if (name === "torneo" && typeof refreshTournament === "function") refreshTournament();
  if (name === "pantalla-publica" && typeof renderPublicScreen === "function") renderPublicScreen(lastTournamentState);
}

document.querySelectorAll("[data-page]").forEach(button => {
  button.onclick = () => showPage(button.dataset.page);
});

document.querySelectorAll("[data-page-action]").forEach(button => {
  button.onclick = () => showPage(button.dataset.pageAction);
});

document.getElementById("mode").addEventListener("change", updateModeUI);

updateModeUI();

const pvpFlipToggle = document.getElementById("pvp-flip");

if (pvpFlipToggle) {
  pvpFlipToggle.addEventListener("change", () => {
    if (gameStarted) render();
  });
}

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

document.body.addEventListener("pointerdown", () => SoundFX.unlock(), {
  once: true
});

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

if (legalMovesCheckbox) {
  legalMovesCheckbox.addEventListener("change", () => setShowLegalMoves(legalMovesCheckbox.checked));
}

if (legalMovesCheckboxCfg) {
  legalMovesCheckboxCfg.addEventListener("change", () => setShowLegalMoves(legalMovesCheckboxCfg.checked));
}

if (legalMovesBtn) {
  legalMovesBtn.addEventListener("click", () => setShowLegalMoves(!showLegalMoves));
}

syncLegalMovesUI();

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

const chatNotifCheckboxCfg = document.getElementById("toggle-chatnotif-cfg");

function syncChatNotifCfgUI_() {
  if (chatNotifCheckboxCfg) chatNotifCheckboxCfg.checked = !matchChatMuted;
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

const BACKUP_KEYS = [ "chessSchoolData", "chessTheme", "chessPieceStyle", "chessShowLegalMoves", "chessShowThreats", "chessExplainMode", "chessSoundEnabled", "chessMatchChatMuted" ];

const exportJsonBtn = document.getElementById("export-json");

if (exportJsonBtn) {
  exportJsonBtn.addEventListener("click", () => {
    const backup = {
      app: "escuela-de-ajedrez",
      version: 1,
      exportedAt: (new Date).toISOString(),
      data: {}
    };
    BACKUP_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value !== null) backup.data[key] = value;
    });
    const blob = new Blob([ JSON.stringify(backup, null, 2) ], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const safeName = (state.name || "alumno").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "") || "alumno";
    const dateStr = (new Date).toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ajedrez-${safeName}-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("📤 Datos exportados");
  });
}

const importJsonInput = document.getElementById("import-json");

if (importJsonInput) {
  importJsonInput.addEventListener("change", e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader;
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (err) {
        toast("❌ Ese archivo no es un JSON válido");
        importJsonInput.value = "";
        return;
      }
      const payload = parsed && parsed.data && typeof parsed.data === "object" ? parsed.data : null;
      if (!payload || !payload.chessSchoolData) {
        toast("❌ Ese archivo no parece un respaldo de esta app");
        importJsonInput.value = "";
        return;
      }
      if (!confirm("¿Importar este respaldo? Se reemplaza tu progreso, perfil y preferencias actuales por los del archivo. No se puede deshacer.")) {
        importJsonInput.value = "";
        return;
      }
      BACKUP_KEYS.forEach(key => {
        if (typeof payload[key] === "string") localStorage.setItem(key, payload[key]);
      });
      importJsonInput.value = "";
      toast("📥 Datos importados. Recargando…");
      setTimeout(() => location.reload(), 700);
    };
    reader.onerror = () => toast("❌ No se pudo leer el archivo");
    reader.readAsText(file);
  });
}

const resetDataBtn = document.getElementById("reset-data");

if (resetDataBtn) {
  resetDataBtn.addEventListener("click", () => {
    if (!confirm("¿Borrar todo tu progreso (XP, historial de partidas y estadísticas)? Esto no se puede deshacer.")) {
      return;
    }
    state = {
      ...DEFAULT_STATE,
      name: state.name,
      course: state.course,
      avatar: state.avatar
    };
    save();
    updateProfile();
    toast("🗑️ Progreso borrado");
  });
}

document.getElementById("new-game").onclick = () => {
  const modeValue = document.getElementById("mode").value;
  botEnabled = modeValue === "bot";
  if (botEnabled) ensureStockfishWorker();
  botDifficulty = document.getElementById("bot-difficulty").value;
  const humanColor = document.getElementById("bot-color").value;
  botColor = humanColor === "w" ? "b" : "w";
  botThinking = false;
  game.reset();
  selected = null;
  validMoves = [];
  gameStarted = true;
  resetEduPanel();
  initClock(true);
  render();
  document.getElementById("new-game").textContent = "🔄 Nueva partida";
  toast(botEnabled ? `▶️ Partida iniciada · IA` : "▶️ Partida iniciada");
  SoundFX.gameStart();
  maybeTriggerBotMove();
};

document.getElementById("undo").onclick = () => {
  if (botThinking) return;
  game.undo();
  if (botEnabled && !game.game_over() && game.turn() === botColor) {
    game.undo();
  }
  selected = null;
  validMoves = [];
  render();
  toast("↩️ Jugada deshecha");
};

document.getElementById("resign").onclick = () => {
  if (game.game_over()) return;
  state.games++;
  state.losses++;
  const record = saveFinishedGame("Rendición");
  showAlert("🏳️ Te rendiste.");
  save();
  updateProfile();
  if (record) offerAnalysis(record.id);
};

document.getElementById("copy-game").onclick = () => {
  navigator.clipboard?.writeText(game.history().join(" ")).then(() => toast("📋 Partida copiada"));
};

const movesToggleBtn = document.getElementById("moves-toggle");

const floatingMovesCard = document.querySelector(".floating-moves-card");

if (movesToggleBtn && floatingMovesCard) {
  movesToggleBtn.addEventListener("click", () => {
    floatingMovesCard.classList.toggle("collapsed");
  });
}

function setupFullscreenToggle(buttonId) {
  const btn = document.getElementById(buttonId);
  if (!btn) return;
  function updateBtnLabel() {
    const isFs = document.body.classList.contains("fullscreen-game");
    btn.textContent = isFs ? btn.dataset.exitText || "❎ Salir" : btn.dataset.enterText || "📺 Pantalla completa";
  }
  btn.onclick = async () => {
    if (!document.body.classList.contains("fullscreen-game")) {
      document.body.classList.add("fullscreen-game");
      updateBtnLabel();
      await document.documentElement.requestFullscreen().catch(() => {});
      requestAnimationFrame(sizeFullscreenBoard);
    } else {
      document.body.classList.remove("fullscreen-game");
      updateBtnLabel();
      resetBoardFrameSize();
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
    }
  };
  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement && document.body.classList.contains("fullscreen-game")) {
      document.body.classList.remove("fullscreen-game");
      updateBtnLabel();
      resetBoardFrameSize();
    }
  });
  updateBtnLabel();
}

setupFullscreenToggle("game-fullscreen");

function sizeFullscreenBoard() {
  const bc = document.body.classList;
  if (!bc.contains("fullscreen-game") && !bc.contains("tournament-board-max")) return;
  const boardFrame = document.querySelector(".board-frame");
  const gameCard = document.getElementById("game-card");
  if (!boardFrame || !gameCard) return;
  const clockEl = gameCard.querySelector(".clock");
  const controlsEl = gameCard.querySelector(".controls-panel");
  const tournamentBarEl = document.getElementById("tournament-match-bar");
  const cardStyle = getComputedStyle(gameCard);
  const gap = parseFloat(cardStyle.rowGap || cardStyle.gap || "12") || 12;
  const paddingV = (parseFloat(cardStyle.paddingTop) || 0) + (parseFloat(cardStyle.paddingBottom) || 0);
  const paddingH = (parseFloat(cardStyle.paddingLeft) || 0) + (parseFloat(cardStyle.paddingRight) || 0);
  const viewportW = window.visualViewport ? window.visualViewport.width : window.innerWidth;
  const viewportH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const cardRect = gameCard.getBoundingClientRect();
  const clockH = clockEl ? clockEl.getBoundingClientRect().height : 0;
  const controlsH = controlsEl ? controlsEl.getBoundingClientRect().height : 0;
  const tournamentBarH = tournamentBarEl && tournamentBarEl.offsetParent !== null ? tournamentBarEl.getBoundingClientRect().height : 0;
  const availableH = (cardRect.height || viewportH) - clockH - controlsH - tournamentBarH - gap * 2 - paddingV;
  const availableW = (cardRect.width || viewportW) - paddingH;
  const side = Math.max(140, Math.floor(Math.min(availableW, availableH)));
  boardFrame.style.width = side + "px";
  boardFrame.style.height = side + "px";
}

function resetBoardFrameSize() {
  const boardFrame = document.querySelector(".board-frame");
  if (boardFrame) {
    boardFrame.style.width = "";
    boardFrame.style.height = "";
  }
}

(function setupFullscreenResize() {
  let resizeTimer = null;
  const scheduleResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(sizeFullscreenBoard, 60);
  };
  window.addEventListener("resize", scheduleResize);
  window.addEventListener("orientationchange", () => setTimeout(sizeFullscreenBoard, 200));
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", scheduleResize);
  }
  const gameCard = document.getElementById("game-card");
  if (gameCard && "ResizeObserver" in window) {
    const ro = new ResizeObserver(scheduleResize);
    ro.observe(gameCard);
    const clockEl = gameCard.querySelector(".clock");
    const controlsEl = gameCard.querySelector(".controls-panel");
    const tournamentBarEl = document.getElementById("tournament-match-bar");
    if (clockEl) ro.observe(clockEl);
    if (controlsEl) ro.observe(controlsEl);
    if (tournamentBarEl) ro.observe(tournamentBarEl);
  }
})();

const THEMES = {
  blue: "Azul moderno",
  wood: "Madera clásica",
  green: "Verde torneo",
  purple: "Violeta",
  red: "Rojo intenso",
  ocean: "Océano",
  midnight: "Medianoche",
  light: "Claro elegante"
};

function applyTheme(theme) {
  const current = THEMES[theme] ? theme : "blue";
  document.body.dataset.theme = current;
  localStorage.setItem("chessTheme", current);
  document.getElementById("current-theme-name").textContent = THEMES[current];
  document.querySelectorAll("[data-theme-card]").forEach(c => {
    c.classList.toggle("active", c.dataset.themeCard === current);
  });
}

document.querySelectorAll(".theme-btn").forEach(btn => {
  btn.onclick = () => applyTheme(btn.dataset.theme);
});

document.getElementById("reset-theme").onclick = () => applyTheme("blue");

applyTheme(localStorage.getItem("chessTheme") || "blue");

const PIECE_STYLES = {
  classic: "Clásico",
  bold: "Sólido",
  outline: "Contorno",
  neon: "Neón",
  minimal: "Minimalista",
  gold: "Dorado",
  glass: "Cristal",
  retro: "Retro",
  wood: "Madera",
  fire: "Fuego",
  ice: "Hielo",
  pastel: "Pastel",
  rainbow: "Arcoíris",
  longshadow: "Sombra larga"
};

function applyPieceStyle(style) {
  const current = PIECE_STYLES[style] ? style : "classic";
  document.body.classList.remove(...Object.keys(PIECE_STYLES).map(s => "pstyle-" + s));
  document.body.classList.add("pstyle-" + current);
  localStorage.setItem("chessPieceStyle", current);
  document.getElementById("current-piece-style-name").textContent = PIECE_STYLES[current];
  document.querySelectorAll("[data-piece-style-card]").forEach(c => {
    c.classList.toggle("active", c.dataset.pieceStyleCard === current);
  });
}

document.querySelectorAll(".piece-style-btn").forEach(btn => {
  btn.onclick = () => applyPieceStyle(btn.dataset.pieceStyle);
});

document.getElementById("reset-piece-style").onclick = () => applyPieceStyle("classic");

applyPieceStyle(localStorage.getItem("chessPieceStyle") || "classic");

updateProfile();

initClock(false);

render();

savedGamesList();

function savedGamesList() {
  renderSavedGamesList();
}

let analysisCurrentRecord = null;

let analysisPly = 0;

let analysisRunToken = 0;

let sfAnalysisWorker = null;

const ANALYSIS_DEPTH = 12;

const MATE_SCORE = 1e5;

const TAG_INFO = {
  best: {
    icon: "✅",
    label: "Mejor jugada",
    cls: "tag-best"
  },
  good: {
    icon: "👍",
    label: "Buena",
    cls: "tag-good"
  },
  inaccuracy: {
    icon: "⚠️",
    label: "Imprecisión",
    cls: "tag-inaccuracy"
  },
  mistake: {
    icon: "❌",
    label: "Error",
    cls: "tag-mistake"
  },
  blunder: {
    icon: "‼️",
    label: "Blunder",
    cls: "tag-blunder"
  }
};

function initAnalysisWorker() {
  try {
    sfAnalysisWorker = new Worker("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js");
    sfAnalysisWorker.postMessage("uci");
    sfAnalysisWorker.postMessage("setoption name Skill Level value 20");
  } catch (e) {
    try {
      fetch("https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js").then(res => res.text()).then(code => {
        const blob = new Blob([ code ], {
          type: "application/javascript"
        });
        sfAnalysisWorker = new Worker(URL.createObjectURL(blob));
        sfAnalysisWorker.postMessage("uci");
        sfAnalysisWorker.postMessage("setoption name Skill Level value 20");
      });
    } catch (err) {
      console.error("No se pudo iniciar el motor de análisis", err);
    }
  }
}

initAnalysisWorker();

function heuristicEval(fen) {
  try {
    const c = new Chess(fen);
    const values = {
      p: 100,
      n: 320,
      b: 330,
      r: 500,
      q: 900,
      k: 0
    };
    let score = 0;
    c.board().forEach(row => row.forEach(sq => {
      if (sq) score += (sq.color === "w" ? 1 : -1) * values[sq.type];
    }));
    return c.turn() === "w" ? score : -score;
  } catch (e) {
    return 0;
  }
}

function sfEvalFen(fen, depth) {
  return new Promise(resolve => {
    if (!sfAnalysisWorker) {
      resolve({
        score: heuristicEval(fen),
        bestMove: null,
        engine: false
      });
      return;
    }
    let lastScore = 0;
    let lastPv = [];
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      sfAnalysisWorker.removeEventListener("message", handler);
      resolve({
        score: heuristicEval(fen),
        bestMove: null,
        engine: false,
        pv: []
      });
    }, 8e3);
    function handler(e) {
      const line = typeof e.data === "string" ? e.data : "";
      if (line.startsWith("info") && line.indexOf(" score ") !== -1) {
        const m = line.match(/score (cp|mate) (-?\d+)/);
        if (m) {
          if (m[1] === "cp") {
            lastScore = parseInt(m[2], 10);
          } else {
            const mateIn = parseInt(m[2], 10);
            lastScore = mateIn > 0 ? MATE_SCORE - mateIn : -MATE_SCORE - mateIn;
          }
        }
        const pvMatch = line.match(/ pv (.+)$/);
        if (pvMatch) {
          lastPv = pvMatch[1].trim().split(/\s+/);
        }
      }
      if (line.startsWith("bestmove")) {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        sfAnalysisWorker.removeEventListener("message", handler);
        const parts = line.split(" ");
        const bm = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
        resolve({
          score: lastScore,
          bestMove: bm,
          engine: true,
          pv: lastPv
        });
      }
    }
    sfAnalysisWorker.addEventListener("message", handler);
    sfAnalysisWorker.postMessage("position fen " + fen);
    sfAnalysisWorker.postMessage("go depth " + depth);
  });
}

async function evalPosition(fen, depth) {
  const temp = new Chess(fen);
  if (temp.in_checkmate()) return {
    score: -MATE_SCORE,
    bestMove: null,
    pv: []
  };
  if (temp.game_over()) return {
    score: 0,
    bestMove: null,
    pv: []
  };
  return sfEvalFen(fen, depth);
}

function uciToSan(fen, uciMove) {
  if (!uciMove || uciMove.length < 4) return null;
  try {
    const temp = new Chess(fen);
    const from = uciMove.substring(0, 2);
    const to = uciMove.substring(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
    const mv = temp.move({
      from: from,
      to: to,
      promotion: promotion || "q"
    });
    return mv ? mv.san : null;
  } catch (e) {
    return null;
  }
}

function commentFor(tag, playedSan, bestSan, color) {
  const quien = color === "w" ? "Blancas" : "Negras";
  switch (tag) {
   case "best":
    return `✅ ${quien} jugó ${playedSan}, la mejor jugada según el motor.`;

   case "good":
    return `👍 ${quien} jugó ${playedSan}, una buena jugada que mantiene una posición sólida.`;

   case "inaccuracy":
    return `⚠️ Imprecisión de ${quien.toLowerCase()} con ${playedSan}.` + (bestSan ? ` El motor prefería ${bestSan}.` : "");

   case "mistake":
    return `❌ Error de ${quien.toLowerCase()} con ${playedSan}, cede ventaja al rival.` + (bestSan ? ` Mejor era ${bestSan}.` : "");

   case "blunder":
    return `‼️ ¡Blunder! ${quien} jugó ${playedSan} y perdió mucha ventaja (o la partida).` + (bestSan ? ` La jugada correcta era ${bestSan}.` : "");

   default:
    return playedSan || "";
  }
}

async function openAnalysisModal(gameId) {
  const record = (state.savedGames || []).find(g => g.id === gameId);
  if (!record) return;
  analysisCurrentRecord = record;
  document.getElementById("analysis-modal").style.display = "flex";
  document.getElementById("analysis-meta").textContent = `${record.date} · ${record.time} · ${record.moves.length} jugadas · ${record.result}`;
  const progressWrap = document.getElementById("analysis-progress");
  const body = document.getElementById("analysis-body");
  if (record.analysis) {
    progressWrap.style.display = "none";
    body.style.display = "block";
    analysisPly = record.positions.length - 1;
    renderAnalysisResults(record);
    return;
  }
  progressWrap.style.display = "block";
  body.style.display = "none";
  await runFullAnalysis(record);
}

function updateAnalysisProgress(done, total) {
  const text = document.getElementById("analysis-progress-text");
  const fill = document.getElementById("analysis-progress-fill");
  text.textContent = `Analizando jugada ${done}/${total}…`;
  fill.style.width = total ? Math.round(done / total * 100) + "%" : "0%";
}

async function runFullAnalysis(record) {
  const myToken = ++analysisRunToken;
  const positions = record.positions;
  const total = positions.length;
  updateAnalysisProgress(0, total - 1);
  const results = [];
  for (let i = 0; i < total; i++) {
    if (myToken !== analysisRunToken) return;
    const r = await evalPosition(positions[i].fen, ANALYSIS_DEPTH);
    results.push(r);
    updateAnalysisProgress(i, total - 1);
  }
  if (myToken !== analysisRunToken) return;
  const scores = results.map(r => r.score);
  const perMove = [];
  const counts = {
    w: {
      best: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0
    },
    b: {
      best: 0,
      good: 0,
      inaccuracy: 0,
      mistake: 0,
      blunder: 0
    }
  };
  const accSums = {
    w: [],
    b: []
  };
  for (let i = 0; i < record.moves.length; i++) {
    const color = positions[i].fen.split(" ")[1];
    const scoreBefore = scores[i];
    const scoreAfter = scores[i + 1];
    const loss = Math.max(0, scoreBefore + scoreAfter);
    const tag = classifyLoss(loss);
    counts[color][tag]++;
    const winBefore = cpToWin(scoreBefore);
    const winAfter = cpToWin(-scoreAfter);
    const moveAcc = Math.max(0, Math.min(100, 103.1668 * Math.exp(-.04354 * (winBefore - winAfter)) - 3.1668));
    accSums[color].push(moveAcc);
    const bestUci = results[i].bestMove;
    const bestSan = tag === "best" ? null : uciToSan(positions[i].fen, bestUci);
    const playedSan = record.moves[i];
    perMove.push({
      tag: tag,
      loss: loss,
      color: color,
      playedSan: playedSan,
      bestSan: bestSan
    });
  }
  const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 100;
  const accuracy = {
    w: avg(accSums.w),
    b: avg(accSums.b)
  };
  const usedEngine = results.some(r => r.engine);
  record.analysis = {
    scores: scores,
    perMove: perMove,
    counts: counts,
    accuracy: accuracy,
    usedEngine: usedEngine
  };
  save();
  document.getElementById("analysis-progress").style.display = "none";
  document.getElementById("analysis-body").style.display = "block";
  analysisPly = positions.length - 1;
  renderAnalysisResults(record);
}

function closeAnalysisModal() {
  document.getElementById("analysis-modal").style.display = "none";
  analysisRunToken++;
}

function renderAnalysisResults(record) {
  renderAnalysisSummary(record);
  renderEvalGraph(record);
  renderAnalysisBoard();
  renderAnalysisMoveList();
  renderAnalysisComment();
}

function renderAnalysisSummary(record) {
  const a = record.analysis;
  const container = document.getElementById("analysis-summary");
  container.innerHTML = "";
  if (!a) return;
  if (a.usedEngine === false) {
    const notice = document.createElement("div");
    notice.style.gridColumn = "1 / -1";
    notice.style.color = "var(--muted)";
    notice.style.fontSize = "0.8rem";
    notice.textContent = "⚠️ El motor no respondió a tiempo: se usó una evaluación básica por material.";
    container.appendChild(notice);
  }
  [ "w", "b" ].forEach(color => {
    const label = color === "w" ? "♔ Blancas" : "♚ Negras";
    const c = a.counts[color];
    const card = document.createElement("div");
    card.className = "analysis-side-card";
    card.innerHTML = `\n            <h4>${label}</h4>\n            <div class="analysis-accuracy">${a.accuracy[color].toFixed(1)}%</div>\n            <div style="color: var(--muted); font-size: 0.8rem">Precisión estimada</div>\n            <div class="analysis-tag-row">\n              <span>✅ ${c.best}</span>\n              <span>👍 ${c.good}</span>\n              <span>⚠️ ${c.inaccuracy}</span>\n              <span>❌ ${c.mistake}</span>\n              <span>‼️ ${c.blunder}</span>\n            </div>\n          `;
    container.appendChild(card);
  });
}

function renderEvalGraph(record) {
  const graph = document.getElementById("analysis-eval-graph");
  graph.innerHTML = "";
  const a = record.analysis;
  if (!a) return;
  const scores = a.scores;
  scores.forEach((rawScore, i) => {
    const turnAt = record.positions[i].fen.split(" ")[1];
    const whiteScore = turnAt === "w" ? rawScore : -rawScore;
    const clamped = Math.max(-600, Math.min(600, whiteScore));
    const pct = 50 + clamped / 600 * 50;
    const bar = document.createElement("div");
    bar.className = "bar" + (whiteScore < 0 ? " black-adv" : "") + (i === analysisPly ? " current" : "");
    bar.style.height = Math.max(4, Math.abs(pct - 50) * 2) + "%";
    bar.title = i === 0 ? "Posición inicial" : `Tras ${record.moves[i - 1]}`;
    bar.onclick = () => {
      analysisPly = i;
      renderAnalysisResults(record);
    };
    graph.appendChild(bar);
  });
}

function renderAnalysisBoard() {
  const record = analysisCurrentRecord;
  const boardEl = document.getElementById("analysis-board");
  boardEl.innerHTML = "";
  const pos = record.positions[analysisPly];
  if (!pos || !pos.fen) return;
  const board = new Chess(pos.fen).board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = document.createElement("div");
      sq.className = "square " + ((r + c) % 2 ? "dark" : "light");
      const p = board[r][c];
      if (p) {
        const piece = document.createElement("div");
        piece.className = "piece " + (p.color === "w" ? "white-piece" : "black-piece");
        piece.textContent = PIECES[p.color + p.type.toUpperCase()];
        piece.dataset.piece = p.type.toUpperCase();
        sq.appendChild(piece);
      }
      boardEl.appendChild(sq);
    }
  }
  const evalEl = document.getElementById("analysis-eval-current");
  const a = record.analysis;
  if (a && evalEl) {
    const rawScore = a.scores[analysisPly];
    const turnAt = pos.fen.split(" ")[1];
    const whiteScore = turnAt === "w" ? rawScore : -rawScore;
    let text;
    if (Math.abs(whiteScore) >= MATE_SCORE - 300) {
      const movesToMate = MATE_SCORE - Math.abs(whiteScore);
      text = `Mate en ${movesToMate} para ${whiteScore > 0 ? "blancas" : "negras"}`;
    } else {
      const pawns = (whiteScore / 100).toFixed(2);
      text = (whiteScore > 0 ? "+" : "") + pawns + (whiteScore >= 0 ? " (ventaja blancas)" : " (ventaja negras)");
    }
    evalEl.textContent = text;
  }
}

function renderAnalysisComment() {
  const record = analysisCurrentRecord;
  const commentEl = document.getElementById("analysis-comment");
  if (!commentEl || !record || !record.analysis) return;
  if (analysisPly === 0) {
    commentEl.textContent = "Posición inicial. Navegá las jugadas para ver el análisis de cada una.";
    return;
  }
  const mv = record.analysis.perMove[analysisPly - 1];
  commentEl.textContent = mv ? commentFor(mv.tag, mv.playedSan, mv.bestSan, mv.color) : "";
}

function renderAnalysisMoveList() {
  const record = analysisCurrentRecord;
  const container = document.getElementById("analysis-move-list");
  container.innerHTML = "";
  const perMove = record.analysis ? record.analysis.perMove : [];
  function buildBtn(idx) {
    const san = record.moves[idx];
    if (san === undefined) {
      const span = document.createElement("span");
      return span;
    }
    const btn = document.createElement("button");
    const info = perMove[idx];
    const tagInfo = info ? TAG_INFO[info.tag] : null;
    btn.className = "analysis-move-btn" + (tagInfo ? " " + tagInfo.cls : "") + (idx + 1 === analysisPly ? " active" : "");
    btn.innerHTML = `<span>${san}</span>` + (tagInfo ? `<span class="mv-icon">${tagInfo.icon}</span>` : "");
    if (tagInfo) btn.title = tagInfo.label;
    btn.onclick = () => {
      analysisPly = idx + 1;
      renderAnalysisResults(record);
    };
    return btn;
  }
  for (let i = 0; i < record.moves.length; i += 2) {
    const row = document.createElement("div");
    row.className = "analysis-move-row";
    const num = document.createElement("span");
    num.className = "analysis-move-num";
    num.textContent = i / 2 + 1 + ".";
    row.appendChild(num);
    row.appendChild(buildBtn(i));
    row.appendChild(buildBtn(i + 1));
    container.appendChild(row);
  }
}

document.getElementById("analysis-close").onclick = closeAnalysisModal;

document.getElementById("analysis-first").onclick = () => {
  analysisPly = 0;
  renderAnalysisResults(analysisCurrentRecord);
};

document.getElementById("analysis-prev").onclick = () => {
  analysisPly = Math.max(0, analysisPly - 1);
  renderAnalysisResults(analysisCurrentRecord);
};

document.getElementById("analysis-next").onclick = () => {
  analysisPly = Math.min(analysisCurrentRecord.positions.length - 1, analysisPly + 1);
  renderAnalysisResults(analysisCurrentRecord);
};

document.getElementById("analysis-last").onclick = () => {
  analysisPly = analysisCurrentRecord.positions.length - 1;
  renderAnalysisResults(analysisCurrentRecord);
};

const TUTOR_DEPTH = 14;

const TUTOR_TIPS_APERTURA = [ "En la apertura, priorizá desarrollar tus piezas menores (caballos y alfiles) antes de sacar la dama.", "Tratá de enrocar pronto: pone a tu rey a salvo y conecta las torres.", "Controlá el centro (casillas d4, d5, e4, e5): te da más espacio y opciones.", "Evitá mover la misma pieza dos veces en la apertura sin una buena razón.", "No saques la dama demasiado pronto: puede convertirse en blanco de ataques con pérdida de tiempo." ];

const TUTOR_TIPS_MEDIO_JUEGO = [ "Antes de mover, preguntate siempre: ¿qué amenaza mi rival con su última jugada?", "Buscá las piezas rivales mal defendidas: suelen ser un buen objetivo táctico.", "Una torre en columna abierta o un caballo bien plantado en el centro valen mucho.", "Si tenés ventaja de material, buscá cambiar piezas para simplificar la posición.", "Cuidá la seguridad de tu rey: no debilites innecesariamente los peones que lo protegen.", "Pensá en tu plan antes de cada jugada, no solo en la jugada en sí." ];

const TUTOR_TIPS_FINAL = [ "En el final, activá a tu rey: se convierte en una pieza de ataque muy importante.", "Los peones pasados son muy valiosos en el final: intentá coronarlos o bloquearlos.", "Contá bien los tiempos: en los finales, un tempo de más puede decidir la partida.", "Con torres en el tablero, la actividad de las piezas suele valer más que el material." ];

const DAILY_TIPS = [ {
  title: "Desarrollá tus piezas primero",
  text: "En la apertura, priorizá desarrollar tus piezas menores (caballos y alfiles) antes de sacar la dama."
}, {
  title: "Enrocá pronto",
  text: "Tratá de enrocar pronto: pone a tu rey a salvo y conecta las torres."
}, {
  title: "Controlá el centro",
  text: "Las casillas centrales (d4, d5, e4, e5) permiten que tus piezas tengan mayor movilidad."
}, {
  title: "No repitas piezas sin razón",
  text: "Evitá mover la misma pieza dos veces en la apertura sin una buena razón."
}, {
  title: "Cuidado con sacar la dama temprano",
  text: "No saques la dama demasiado pronto: puede convertirse en blanco de ataques con pérdida de tiempo."
}, {
  title: "Preguntate qué amenaza el rival",
  text: "Antes de mover, preguntate siempre: ¿qué amenaza mi rival con su última jugada?"
}, {
  title: "Buscá piezas mal defendidas",
  text: "Las piezas rivales mal defendidas suelen ser un buen objetivo táctico."
}, {
  title: "Ocupá columnas abiertas",
  text: "Una torre en columna abierta o un caballo bien plantado en el centro valen mucho."
}, {
  title: "Simplificá con ventaja de material",
  text: "Si tenés ventaja de material, buscá cambiar piezas para simplificar la posición."
}, {
  title: "Protegé a tu rey",
  text: "Cuidá la seguridad de tu rey: no debilites innecesariamente los peones que lo protegen."
}, {
  title: "Jugá siempre con un plan",
  text: "Pensá en tu plan antes de cada jugada, no solo en la jugada en sí."
}, {
  title: "Activá tu rey en el final",
  text: "En el final, activá a tu rey: se convierte en una pieza de ataque muy importante."
}, {
  title: "Valorá los peones pasados",
  text: "Los peones pasados son muy valiosos en el final: intentá coronarlos o bloquearlos."
}, {
  title: "Contá bien los tiempos",
  text: "En los finales, un tempo de más puede decidir la partida."
}, {
  title: "Priorizá la actividad de tus piezas",
  text: "Con torres en el tablero, la actividad de las piezas suele valer más que el material."
} ];

function renderDailyTip() {
  const titleEl = document.getElementById("daily-tip-title");
  const textEl = document.getElementById("daily-tip-text");
  if (!titleEl || !textEl) return;
  const idx = dayOfYear(new Date) % DAILY_TIPS.length;
  const tip = DAILY_TIPS[idx];
  titleEl.textContent = tip.title;
  textEl.textContent = tip.text;
}

renderDailyTip();

const PIECE_NAMES = {
  p: "peón",
  n: "caballo",
  b: "alfil",
  r: "torre",
  q: "dama",
  k: "rey"
};

const TUTOR_START_SQUARES = {
  n: [ "b1", "g1", "b8", "g8" ],
  b: [ "c1", "f1", "c8", "f8" ]
};

const TUTOR_CENTER_SQUARES = [ "d4", "d5", "e4", "e5" ];

let tutorRunToken = 0;

let lastTutorFen = null;

let lastTutorMove = null;

function tutorGamePhase(fen) {
  const c = new Chess(fen);
  const ply = c.history().length;
  const pieceCount = c.board().flat().filter(Boolean).length;
  if (ply < 16) return "apertura";
  if (pieceCount <= 12) return "final";
  return "medio";
}

function pickTutorTip(fen) {
  const phase = tutorGamePhase(fen);
  const pool = phase === "apertura" ? TUTOR_TIPS_APERTURA : phase === "final" ? TUTOR_TIPS_FINAL : TUTOR_TIPS_MEDIO_JUEGO;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getMoveReasons(mv) {
  const reasons = [];
  if (mv.flags.includes("k") || mv.flags.includes("q")) {
    reasons.push("enroca, poniendo al rey a resguardo y activando la torre");
  }
  if (mv.san.includes("#")) {
    reasons.push("¡es jaque mate, termina la partida!");
  } else if (mv.san.includes("+")) {
    reasons.push("da jaque, obligando a responder de inmediato");
  }
  if (mv.flags.includes("c") || mv.flags.includes("e")) {
    reasons.push("captura una pieza rival" + (mv.captured ? " (" + PIECE_NAMES[mv.captured] + ")" : "") + ", ganando material");
  }
  if (mv.flags.includes("p")) {
    reasons.push("corona un peón, convirtiéndolo en una pieza mucho más poderosa");
  }
  if (TUTOR_START_SQUARES[mv.piece] && TUTOR_START_SQUARES[mv.piece].includes(mv.from)) {
    reasons.push("desarrolla una pieza que todavía no había entrado en juego");
  }
  if (TUTOR_CENTER_SQUARES.includes(mv.to) && mv.piece !== "k") {
    reasons.push("ocupa una casilla central, ganando espacio e influencia");
  }
  if (mv.piece === "k" && !mv.flags.includes("k") && !mv.flags.includes("q")) {
    reasons.push("mueve al rey; hay que vigilar que quede seguro después de esta jugada");
  }
  return reasons;
}

function pvToSanLine(fen, pv) {
  if (!pv || !pv.length) return "";
  const temp = new Chess(fen);
  const fenParts = fen.split(" ");
  let turn = fenParts[1] === "b" ? "b" : "w";
  let moveNumber = parseInt(fenParts[5], 10) || 1;
  const parts = [];
  for (let i = 0; i < pv.length; i++) {
    const uci = pv[i];
    if (!uci || uci.length < 4) break;
    const from = uci.substring(0, 2);
    const to = uci.substring(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    const mv = temp.move({
      from: from,
      to: to,
      promotion: promotion || "q"
    });
    if (!mv) break;
    if (turn === "w") {
      parts.push(moveNumber + ". " + mv.san);
    } else {
      if (i === 0) {
        parts.push(moveNumber + "... " + mv.san);
      } else {
        parts.push(mv.san);
      }
      moveNumber++;
    }
    turn = turn === "w" ? "b" : "w";
  }
  return parts.join(" ");
}

function explainTutorMove(fenBefore, uciMove, scoreCp, engineUsed) {
  const temp = new Chess(fenBefore);
  const mover = temp.turn();
  const moverLabel = mover === "w" ? "las Blancas" : "las Negras";
  const rivalLabel = mover === "w" ? "las Negras" : "las Blancas";
  const from = uciMove.substring(0, 2);
  const to = uciMove.substring(2, 4);
  const promotion = uciMove.length > 4 ? uciMove[4] : undefined;
  const mv = temp.move({
    from: from,
    to: to,
    promotion: promotion || "q"
  });
  if (!mv) {
    return {
      san: uciMove,
      text: "El motor recomienda esta jugada en la posición actual.",
      evalText: ""
    };
  }
  const reasons = getMoveReasons(mv);
  let text;
  if (reasons.length) {
    text = capitalizeFirst(mv.san) + ": " + capitalizeFirst(reasons.slice(0, 2).join(", y además ")) + ".";
  } else {
    text = mv.san + " es la jugada mejor valorada por el motor en esta posición.";
  }
  let evalText;
  if (Math.abs(scoreCp) >= MATE_SCORE - 300) {
    const movesToMate = MATE_SCORE - Math.abs(scoreCp);
    evalText = "Mate en " + movesToMate + " para " + (scoreCp > 0 ? moverLabel : rivalLabel);
  } else if (Math.abs(scoreCp) < 40) {
    evalText = "Posición aproximadamente equilibrada";
  } else {
    const pawns = (scoreCp / 100).toFixed(2);
    evalText = (scoreCp > 0 ? "+" : "") + pawns + " a favor de " + moverLabel;
  }
  if (!engineUsed) evalText += " (estimado por material)";
  return {
    san: mv.san,
    text: text,
    evalText: evalText
  };
}

explainMode = localStorage.getItem("chessExplainMode") !== "off";

const explainToggleEl = document.getElementById("toggle-explain");

const explainToggleElCfg = document.getElementById("toggle-explain-cfg");

const EDU_DEFAULT_TITLE = "Pensá antes de mover";

const EDU_DEFAULT_TEXT = "Antes de jugar, preguntate: ¿qué amenaza mi rival?";

function resetEduPanel() {
  const titleEl = document.getElementById("edu-title");
  const textEl = document.getElementById("edu-text");
  if (titleEl) titleEl.textContent = EDU_DEFAULT_TITLE;
  if (textEl) textEl.textContent = EDU_DEFAULT_TEXT;
}

function syncExplainUI() {
  if (explainToggleEl) explainToggleEl.checked = explainMode;
  if (explainToggleElCfg) explainToggleElCfg.checked = explainMode;
}

function setExplainMode(value) {
  explainMode = value;
  localStorage.setItem("chessExplainMode", explainMode ? "on" : "off");
  syncExplainUI();
  if (!explainMode) resetEduPanel();
  toast(explainMode ? "📚 Explicaciones activadas" : "📚 Explicaciones desactivadas");
}

syncExplainUI();

if (explainToggleEl) explainToggleEl.onchange = () => setExplainMode(explainToggleEl.checked);

if (explainToggleElCfg) explainToggleElCfg.onchange = () => setExplainMode(explainToggleElCfg.checked);

function shouldExplainMover(moverColor) {
  return !botEnabled || moverColor === botColor;
}

function showMoveExplanation(fenBefore, mv) {
  if (tournamentMatchActive) return;
  if (!explainMode || !mv) return;
  if (!shouldExplainMover(mv.color)) return;
  const sideLabel = mv.color === "w" ? "Las Blancas jugaron" : "Las Negras jugaron";
  const reasons = getMoveReasons(mv);
  let text;
  if (reasons.length) {
    text = capitalizeFirst(reasons.slice(0, 2).join(", y además ")) + ".";
  } else {
    text = "Es una jugada de desarrollo o mejora posicional, sin un motivo táctico inmediato evidente.";
  }
  const tip = pickTutorTip(fenBefore);
  const titleEl = document.getElementById("edu-title");
  const textEl = document.getElementById("edu-text");
  if (!titleEl || !textEl) return;
  titleEl.textContent = mv.san + " · " + sideLabel;
  textEl.textContent = capitalizeFirst(text) + " 💡 " + tip;
}

async function requestTutorSuggestion() {
  if (!gameStarted || game.game_over()) {
    toast("Iniciá una partida para pedirle ayuda al tutor.");
    return;
  }
  const myToken = ++tutorRunToken;
  const btn = document.getElementById("tutor-suggest-btn");
  const output = document.getElementById("tutor-output");
  const loading = document.getElementById("tutor-loading");
  btn.disabled = true;
  output.style.display = "none";
  loading.style.display = "block";
  const fen = game.fen();
  const result = await evalPosition(fen, TUTOR_DEPTH);
  if (myToken !== tutorRunToken) return;
  loading.style.display = "none";
  btn.disabled = false;
  if (!result.bestMove) {
    output.style.display = "block";
    document.getElementById("tutor-move-san").textContent = "—";
    document.getElementById("tutor-eval").textContent = "";
    document.getElementById("tutor-explanation").textContent = "No hay jugadas para sugerir en esta posición.";
    document.getElementById("tutor-pv").style.display = "none";
    document.getElementById("tutor-tip").textContent = "";
    document.getElementById("tutor-play-btn").style.display = "none";
    return;
  }
  const {san: san, text: text, evalText: evalText} = explainTutorMove(fen, result.bestMove, result.score, result.engine);
  const tip = pickTutorTip(fen);
  const pvLine = pvToSanLine(fen, result.pv);
  lastTutorFen = fen;
  lastTutorMove = result.bestMove;
  document.getElementById("tutor-move-san").textContent = san;
  document.getElementById("tutor-eval").textContent = evalText;
  document.getElementById("tutor-explanation").textContent = text;
  const pvEl = document.getElementById("tutor-pv");
  if (pvLine && pvLine.split(" ").length > 1) {
    document.getElementById("tutor-pv-text").textContent = pvLine;
    pvEl.style.display = "block";
  } else {
    pvEl.style.display = "none";
  }
  document.getElementById("tutor-tip").textContent = "💡 " + tip;
  document.getElementById("tutor-play-btn").style.display = "block";
  output.style.display = "block";
}

function playTutorMove() {
  if (!lastTutorMove || game.fen() !== lastTutorFen) {
    toast("La posición cambió: pedile una nueva sugerencia al tutor.");
    return;
  }
  if (!gameStarted || game.game_over() || botThinking) return;
  if (botEnabled && game.turn() === botColor) return;
  const from = lastTutorMove.substring(0, 2);
  const to = lastTutorMove.substring(2, 4);
  const promotion = lastTutorMove.length > 4 ? lastTutorMove[4] : undefined;
  const move = game.move({
    from: from,
    to: to,
    promotion: promotion || "q"
  });
  if (!move) return;
  addIncrement();
  selected = null;
  validMoves = [];
  markMoveForAnimation(move);
  playSoundForMove(move, game);
  document.getElementById("tutor-output").style.display = "none";
  lastTutorMove = null;
  lastTutorFen = null;
  render();
  checkGameOver();
  maybeTriggerBotMove();
}

document.getElementById("tutor-suggest-btn").onclick = requestTutorSuggestion;

document.getElementById("tutor-play-btn").onclick = playTutorMove;

const LESSONS = {
  1: {
    category: "fundamentos",
    xp: 25,
    content: `\n            <h4>¿Cómo se mueve cada pieza?</h4>\n            <p>El <b>peón</b> avanza una casilla (dos en su primer movimiento) y captura en diagonal. El <b>caballo</b> se mueve en "L" y es la única pieza que salta por encima de otras. El <b>alfil</b> se mueve en diagonal y siempre queda en casillas del mismo color. La <b>torre</b> se mueve en línea recta, por filas y columnas. La <b>dama</b> combina los movimientos de torre y alfil. El <b>rey</b> se mueve una casilla en cualquier dirección.</p>\n            <h4>Valor aproximado</h4>\n            <p>Peón = 1, Caballo = 3, Alfil = 3, Torre = 5, Dama = 9. El rey no tiene valor material: si lo pierden, pierden la partida.</p>\n            <div class="mini-diagram" data-fen="8/8/8/3N4/8/8/8/8" data-highlight="b3,b5,c2,c6,e2,e6,f3,f5"></div>\n            <p class="mini-diagram-caption">El caballo en d4 puede saltar a cualquiera de las 8 casillas marcadas.</p>\n            <div class="lesson-tip">💡 Los caballos son mejores cerca del centro; en el borde del tablero controlan muy pocas casillas.</div>\n          `,
    puzzle: {
      fen: "2b1k3/pppppppp/8/8/8/8/PPPPPPPP/1N2KB2 w - - 0 1",
      solution: [ "b1c3" ],
      prompt: "Es tu turno. Desarrollá el caballo hacia una casilla central.",
      success: "¡Muy bien! Cc3 lleva al caballo cerca del centro, donde controla más casillas.",
      fail: "Probá otra casilla: buscá acercar el caballo al centro del tablero.",
      hint: "El caballo se mueve en forma de L. Desde b1, una buena casilla central es c3."
    }
  },
  2: {
    category: "fundamentos",
    xp: 30,
    content: `\n            <h4>¿Cuándo conviene capturar?</h4>\n            <p>No todas las capturas son buenas. Antes de capturar, comparen el valor de la pieza que capturan con el valor de la pieza que arriesgan. Capturar una pieza de mayor valor que la propia siempre es una ganancia de material.</p>\n            <h4>Piezas "colgadas"</h4>\n            <p>Una pieza está colgada cuando no tiene ninguna defensa y puede ser capturada gratis. Antes de cada jugada, revisen si el rival dejó alguna pieza sin proteger.</p>\n            <div class="mini-diagram" data-fen="8/8/8/3n4/8/8/8/8" data-highlight="d5"></div>\n            <p class="mini-diagram-caption">Este caballo no tiene ninguna pieza que lo defienda: está "colgado".</p>\n            <div class="lesson-tip">💡 Contá siempre: ¿qué gano y qué puedo llegar a perder con esta captura?</div>\n          `,
    puzzle: {
      fen: "1nb1k3/ppp1pppp/8/3n4/8/8/PPP1PPPP/1N1QK3 w - - 0 1",
      solution: [ "d1d5" ],
      prompt: "El caballo negro en d5 no tiene ninguna defensa. Capturalo.",
      success: "¡Correcto! Dxd5 gana una pieza completamente gratis.",
      fail: "Todavía se puede ganar material gratis. Fijate qué pieza negra no tiene ninguna defensa.",
      hint: "La dama en d1 y el caballo en d5 están en la misma columna."
    }
  },
  3: {
    category: "fundamentos",
    xp: 35,
    content: `\n            <h4>Jaque</h4>\n            <p>Hay jaque cuando el rey está siendo atacado. Deben responder de inmediato: mover el rey, bloquear el ataque o capturar la pieza que da jaque.</p>\n            <h4>Jaque mate</h4>\n            <p>Si están en jaque y no hay ninguna manera de solucionarlo, es <b>jaque mate</b> y la partida termina.</p>\n            <h4>Tablas</h4>\n            <p>La partida puede terminar en tablas por ahogado (el jugador en turno no está en jaque pero no tiene jugadas legales), por acuerdo mutuo, o por repetición de posición.</p>\n            <div class="mini-diagram" data-fen="k7/2K5/1Q6/8/8/8/8/8" data-highlight="a8"></div>\n            <p class="mini-diagram-caption">Ejemplo de ahogado: el rey negro no está en jaque, pero no tiene ninguna casilla legal. Tablas.</p>\n            <div class="lesson-tip">💡 Un patrón clásico: si el rey rival quedó encerrado detrás de sus propios peones, una torre o dama en la última fila puede dar jaque mate.</div>\n          `,
    puzzle: {
      fen: "6k1/1ppppppp/8/8/8/8/1PPPP3/R5K1 w - - 0 1",
      solution: [ "a1a8" ],
      checkmate: true,
      prompt: "El rey negro está encerrado por sus propios peones. Encontrá el jaque mate en una jugada.",
      success: "¡Jaque mate! La torre controla toda la octava fila y el rey no tiene escapatoria.",
      fail: "Esa jugada no es mate. Pensá en llevar la torre a la última fila.",
      hint: "Mové la torre a lo largo de la columna 'a' hasta la última fila."
    }
  },
  4: {
    category: "estrategia",
    xp: 40,
    content: `\n            <h4>¿Por qué importa el centro?</h4>\n            <p>Las casillas centrales (d4, d5, e4, e5) son las más valiosas del tablero: desde ahí, las piezas controlan más casillas y se pueden trasladar rápido a cualquier sector.</p>\n            <h4>Cómo ocuparlo</h4>\n            <p>En la apertura, lo habitual es avanzar los peones centrales (e4/d4 o e5/d5) para ganar espacio y abrir líneas para el desarrollo de las piezas menores.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/8/8/8/8" data-highlight="d4,d5,e4,e5"></div>\n            <p class="mini-diagram-caption">Las 4 casillas centrales: d4, d5, e4 y e5.</p>\n            <div class="lesson-tip">💡 "Quien domina el centro, domina el tablero." Evitá mover peones de torre o de alfil temprano sin una buena razón.</div>\n          `,
    puzzle: {
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      solution: [ "e2e4", "d2d4" ],
      prompt: "Es la posición inicial. Jugá un movimiento que luche por el centro.",
      success: "¡Excelente! Ese avance central abre líneas para el alfil y la dama.",
      fail: "Esa jugada no pelea por el centro. Pensá en los peones de reina o de rey.",
      hint: "Los peones 'e' y 'd' son los que controlan las casillas centrales."
    }
  },
  5: {
    category: "estrategia",
    xp: 45,
    content: `\n            <h4>Desarrollo antes que ataques prematuros</h4>\n            <p>Antes de buscar amenazas, saquen sus piezas menores (caballos y alfiles) de la fila inicial. Un desarrollo rápido permite enrocar antes y evita perder tiempos.</p>\n            <h4>La regla de "una pieza por jugada"</h4>\n            <p>En la apertura, eviten mover dos veces la misma pieza o sacar la dama demasiado pronto: le da tiempo al rival para desarrollarse mientras la atacan.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/4k3/8/8/8" data-highlight="e4"></div>\n            <p class="mini-diagram-caption">Un rey en el centro, sin enrocar, es un blanco fácil para las piezas rivales.</p>\n            <div class="lesson-tip">💡 Un buen orden típico: peón central, caballo, alfil, enroque.</div>\n          `,
    puzzle: {
      fen: "1nb1k3/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/4KBNR w - - 0 1",
      solution: [ "g1f3" ],
      prompt: "Elegí la jugada que mejor combina desarrollo y preparación para enrocar.",
      success: "¡Muy bien! Cf3 desarrolla una pieza y deja el camino libre para el enroque corto.",
      fail: "Esa jugada no desarrolla una pieza nueva. Buscá sacar el caballo.",
      hint: "El caballo en g1 puede saltar a una casilla útil sin bloquear el enroque."
    }
  },
  6: {
    category: "estrategia",
    xp: 45,
    content: `\n            <h4>¿Qué es el enroque?</h4>\n            <p>El enroque es la única jugada donde se mueven dos piezas a la vez: el rey se desplaza dos casillas hacia una torre, y esa torre salta al otro lado del rey. Sirve para poner al rey a resguardo y conectar las torres.</p>\n            <h4>Condiciones</h4>\n            <p>No pueden haber piezas entre el rey y la torre, ninguno de los dos se movió antes, el rey no puede estar en jaque, y no puede pasar ni terminar en una casilla atacada.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/8/8/8/5RK1" data-highlight="f1,g1"></div>\n            <p class="mini-diagram-caption">Así queda el rey y la torre después del enroque corto (O-O).</p>\n            <div class="lesson-tip">💡 Como regla general, enrocá lo antes posible: un rey en el centro es un blanco fácil.</div>\n          `,
    puzzle: {
      fen: "1nb1k3/pppppppp/8/8/8/8/PPPPPPPP/1NB1K2R w K - 0 1",
      solution: [ "e1g1" ],
      prompt: "El camino está despejado. Enrocá corto para poner a resguardo al rey.",
      success: "¡Perfecto! El enroque corto pone al rey a salvo y activa la torre.",
      fail: "Esa no es la jugada de enroque. El rey se mueve dos casillas hacia la torre.",
      hint: "Mové el rey de e1 a g1 (enroque corto)."
    }
  },
  7: {
    category: "tactica",
    xp: 50,
    content: `\n            <h4>El ataque doble (horquilla)</h4>\n            <p>Un ataque doble ocurre cuando una sola pieza amenaza a dos objetivos al mismo tiempo. El rival solo puede salvar uno de ellos, así que ustedes ganan material.</p>\n            <h4>El caballo, especialista en horquillas</h4>\n            <p>Por su movimiento en "L", el caballo es ideal para dar horquillas: puede atacar dos piezas que están lejos entre sí y que no se defienden mutuamente.</p>\n            <div class="mini-diagram" data-fen="8/8/8/4N3/8/8/8/8" data-highlight="c4,c6,d3,d7,f3,f7,g4,g6"></div>\n            <p class="mini-diagram-caption">Desde e5, el caballo controla estas 8 casillas a la vez: cualquier par de piezas rivales ahí puede caer en una horquilla.</p>\n            <div class="lesson-tip">💡 Antes de saltar con el caballo, revisen si la casilla de destino ataca al rey y a otra pieza valiosa a la vez.</div>\n          `,
    puzzle: {
      fen: "2r1k3/pppppppp/8/1N6/8/8/PPPPPPPP/1NB3K1 w - - 0 1",
      sequence: [ "b5d6", "e8d8", "d6c8" ],
      midMessage: "¡Cd6+ es jaque! El rey se aparta del jaque. Ahora terminá la horquilla.",
      prompt: "Encontrá la jugada de caballo que ataca al rey y a la torre al mismo tiempo, y después ganá la torre.",
      success: "¡Horquilla completa! Diste jaque con el caballo y después te comiste la torre.",
      fail: "Esa jugada no ataca dos piezas a la vez. Buscá una casilla de caballo que dé jaque.",
      hint: "Desde d6, el caballo controla e8 y c8 al mismo tiempo. Después de que el rey se mueva, comé la torre en c8."
    }
  },
  8: {
    category: "tactica",
    xp: 50,
    content: `\n            <h4>¿Qué es una clavada?</h4>\n            <p>Una pieza está clavada cuando no se puede (o no conviene) mover porque detrás de ella hay una pieza más valiosa, generalmente el rey. Las clavadas absolutas (contra el rey) son ilegales de romper.</p>\n            <h4>Cómo aprovecharla</h4>\n            <p>Una vez clavada una pieza, suele ser un buen objetivo: pueden sumar más atacantes sobre ella, ya que no se puede escapar sin exponer al rey.</p>\n            <div class="mini-diagram" data-fen="8/6k1/8/8/3n4/8/8/B7" data-highlight="d4"></div>\n            <p class="mini-diagram-caption">El caballo está clavado: si se mueve, expone al rey al ataque del alfil.</p>\n            <div class="lesson-tip">💡 Los alfiles y torres son las piezas que suelen clavar; siempre a lo largo de una línea recta o diagonal.</div>\n          `,
    puzzle: {
      fen: "r5k1/pppppppp/4n3/8/8/8/BPPPPPPP/1N4K1 w - - 0 1",
      solution: [ "a2c4" ],
      prompt: "Colocá el alfil en la diagonal para clavar el caballo negro contra el rey.",
      success: "¡Bien visto! Ac4 clava el caballo: si se mueve, queda expuesto el rey.",
      fail: "Esa jugada no clava ninguna pieza. Buscá la diagonal que une al alfil con el rey rival.",
      hint: "El alfil debe quedar en la misma diagonal que el caballo y el rey negro."
    }
  },
  9: {
    category: "tactica",
    xp: 55,
    content: `\n            <h4>El ataque descubierto</h4>\n            <p>Ocurre cuando mueven una pieza que estaba bloqueando el ataque de otra pieja propia (torre, alfil o dama), y al apartarse, esa pieza de atrás queda atacando algo. La pieza que se mueve también puede capturar o amenazar algo por su cuenta: es un "dos por uno".</p>\n            <h4>El jaque descubierto</h4>\n            <p>Es el más peligroso: al descubrir jaque, la pieza que se movió queda libre para capturar cualquier cosa, porque el rival está obligado a resolver el jaque primero.</p>\n            <div class="mini-diagram" data-fen="3k4/8/8/8/3B4/8/8/3R4" data-highlight="d1,d4,d8"></div>\n            <p class="mini-diagram-caption">El alfil tapa a la torre. Si se aparta (capturando algo de paso), la torre queda dando jaque.</p>\n            <div class="lesson-tip">💡 Busquen piezas propias alineadas con el rey rival, con solo una pieza propia en el medio.</div>\n          `,
    puzzle: {
      fen: "rn1k4/p1p1pppp/8/3B4/8/8/PPP1PPPP/1N1R2K1 w - - 0 1",
      solution: [ "d5a8" ],
      prompt: "El alfil bloquea a tu propia torre. Movelo para ganar material con jaque descubierto.",
      success: "¡Excelente! Al capturar la torre en a8, además descubrís el jaque de tu torre en d1 sobre el rey.",
      fail: "Esa jugada no aprovecha el ataque descubierto. Fijate qué pieza tuya bloquea a la torre en d1.",
      hint: "El alfil está sobre la misma columna que tu torre y el rey rival. Movelo capturando algo."
    }
  },
  10: {
    category: "tactica",
    xp: 60,
    content: `\n            <h4>La desviación</h4>\n            <p>La desviación consiste en eliminar u obligar a moverse a la pieza que defiende algo importante (una casilla de mate, una pieza valiosa). Sin su defensor, ese punto débil queda a merced del ataque.</p>\n            <h4>Cómo identificarla</h4>\n            <p>Busquen qué pieza rival cumple una tarea defensiva clave, y pregúntense: "¿puedo capturarla, atacarla o forzarla a moverse?"</p>\n            <div class="mini-diagram" data-fen="8/8/5n2/8/8/8/8/8" data-highlight="f6"></div>\n            <p class="mini-diagram-caption">Este caballo es el único defensor de casillas clave cerca del rey. Sin él, esas casillas quedan débiles.</p>\n            <div class="lesson-tip">💡 Si una sola pieza defiende dos cosas importantes, suele ser el blanco ideal para una desviación.</div>\n          `,
    puzzle: {
      fen: "r5k1/pppppp1p/5n2/8/8/2B5/PPPPPPPP/1N4K1 w - - 0 1",
      solution: [ "c3f6" ],
      prompt: "El caballo negro es el único defensor de casillas clave cerca del rey. Eliminalo.",
      success: "¡Muy bien! Al capturar el caballo, eliminás al defensor y dejás al rey negro mucho más débil.",
      fail: "Esa jugada no elimina al defensor. Buscá una captura con el alfil.",
      hint: "El alfil en c3 y el caballo en f6 están en la misma diagonal."
    }
  },
  11: {
    category: "tactica",
    xp: 60,
    content: `\n            <h4>La sobrecarga</h4>\n            <p>Una pieza está sobrecargada cuando tiene que defender dos cosas a la vez. Si la atacan con una tercera amenaza, no va a poder cumplir con las dos tareas: al resolver una, dejará la otra sin protección.</p>\n            <h4>Ejemplo típico</h4>\n            <p>Una torre que defiende simultáneamente la última fila (contra el mate) y una pieza propia está sobrecargada: pueden ganar esa pieza sabiendo que, si recaptura, se abre una debilidad mayor.</p>\n            <div class="mini-diagram" data-fen="3r2k1/8/8/3n4/8/8/8/8" data-highlight="d5,d8"></div>\n            <p class="mini-diagram-caption">La torre en d8 cumple dos tareas a la vez: defiende al caballo y controla la última fila.</p>\n            <div class="lesson-tip">💡 Contá cuántas tareas defensivas tiene cada pieza rival antes de decidir un plan táctico.</div>\n          `,
    puzzle: {
      fen: "1n1r2k1/ppp2ppp/8/3n4/8/1B6/PPPP4/4R1K1 w - - 0 1",
      sequence: [ "b3d5", "d8d5", "e1e8" ],
      checkmate: true,
      midMessage: "La torre recaptura en d5... pero eso le quita el control de la última fila.",
      prompt: "La torre negra defiende al caballo y, a la vez, la última fila. Aprovechá la sobrecarga para terminar la partida.",
      success: "¡Sobrecarga perfecta! Al capturar el caballo, la torre negra tuvo que elegir: y al recapturar, abandonó la última fila. Jaque mate.",
      fail: "Esa jugada no explota la sobrecarga. Buscá una captura con el alfil sobre el caballo.",
      hint: "El alfil puede capturar el caballo en d5. Si la torre recaptura, la última fila queda libre para tu torre."
    }
  },
  12: {
    category: "estrategia",
    xp: 100,
    content: `\n            <h4>Pensar antes de mover</h4>\n            <p>Un buen método de pensamiento ajedrecístico combina varias preguntas: ¿tengo jaques, capturas o amenazas disponibles? ¿qué pieza rival está peor colocada? ¿cuál es mi pieza menos activa y cómo la mejoro?</p>\n            <h4>El plan general</h4>\n            <p>El ajedrez no se juega jugada por jugada sin rumbo: conviene tener siempre una idea de fondo (ganar espacio, atacar al rey, mejorar la peor pieza) y elegir jugadas que se acerquen a ese objetivo.</p>\n            <div class="mini-diagram" data-fen="6k1/8/8/8/8/8/8/2B3K1" data-highlight="c1"></div>\n            <p class="mini-diagram-caption">¿Cuál es tu pieza peor colocada ahora mismo? Este alfil todavía sigue en su casilla inicial.</p>\n            <div class="lesson-tip">💡 Si no ven ninguna jugada táctica forzada, la mejor jugada suele ser la que mejora su pieza peor colocada.</div>\n          `,
    puzzle: {
      fen: "2b3k1/pppppppp/8/8/8/N7/PPPPPPPP/5BK1 w - - 0 1",
      solution: [ "a3c4" ],
      prompt: "El caballo está mal ubicado en el borde. Centralizalo para mejorar tu peor pieza.",
      success: "¡Excelente aplicación del método! Un caballo centralizado vale mucho más que uno en el borde.",
      fail: "Esa jugada no mejora la posición del caballo. Buscá acercarlo al centro.",
      hint: "Desde a3, el caballo tiene una buena casilla central disponible."
    }
  },
  13: {
    category: "fundamentos",
    xp: 40,
    content: `\n            <h4>¿Cómo se lee una jugada?</h4>\n            <p>Cada casilla se nombra con una letra (columna, de "a" a "h") y un número (fila, de 1 a 8). Las piezas se abrevian: R=Rey (K en inglés), D=Dama (Q), T=Torre (R), A=Alfil (B), C=Caballo (N). Los peones no llevan letra.</p>\n            <h4>Ejemplos</h4>\n            <p>"e4" significa que un peón avanza a e4. "Cf3" significa que un caballo se mueve a f3. "Cxf3" indica que esa jugada captura una pieza. "O-O" es el enroque corto.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/8/5N2/8/8" data-highlight="f3"></div>\n            <p class="mini-diagram-caption">La casilla "f3": columna f, fila 3.</p>\n            <div class="lesson-tip">💡 Practicar la notación les permite seguir partidas de otros jugadores y analizar las suyas.</div>\n          `,
    puzzle: {
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      solution: [ "g1f3" ],
      prompt: "Jugá el movimiento que en notación se escribe 'Cf3'.",
      success: "¡Correcto! Esa es exactamente la jugada Cf3: el caballo de rey se desarrolla.",
      fail: "Esa no es la jugada Cf3. Recordá: C = caballo, y f3 es la casilla de destino.",
      hint: "Buscá el caballo que puede llegar a la casilla f3 en una jugada."
    }
  },
  14: {
    category: "fundamentos",
    xp: 45,
    content: `\n            <h4>¿Cuándo conviene cambiar piezas?</h4>\n            <p>Cambiar piezas (intercambiarlas por otras de valor similar) suele convenir cuando están mejor posicionados, cuando tienen ventaja material (simplificar ayuda a concretar la ventaja) o cuando eliminan la pieza más activa del rival.</p>\n            <h4>Cuándo evitarlo</h4>\n            <p>Si están peor o necesitan complicar la partida, evitar cambios suele dar más chances, ya que mantiene piezas en el tablero para generar contrajuego.</p>\n            <div class="mini-diagram" data-fen="4k3/8/8/8/8/1P6/8/4K3" data-highlight="b3"></div>\n            <p class="mini-diagram-caption">Con una ventaja de material (como este peón de más), cambiar piezas ayuda a simplificar hacia la victoria.</p>\n            <div class="lesson-tip">💡 Regla práctica: si están mejor, cambien piezas (no peones); si están peor, evítenlo.</div>\n          `,
    puzzle: {
      fen: "1n2k3/pppppppp/8/3q4/3Q4/1P6/P1PPPPPP/1N2K3 w - - 0 1",
      solution: [ "d4d5" ],
      prompt: "Tenés una ventaja de material (un peón de más). Cambiá las damas para simplificar la posición.",
      success: "¡Bien pensado! Al cambiar damas estando mejor, se acercan a ganar la partida con menos riesgo.",
      fail: "Esa jugada no cambia las damas. Buscá la captura de dama por dama.",
      hint: "Las dos damas están en la misma columna."
    }
  },
  15: {
    category: "estrategia",
    xp: 55,
    content: `\n            <h4>¿Qué es una columna abierta?</h4>\n            <p>Es una columna sin peones de ningún color. Las torres son mucho más fuertes ahí porque pueden moverse libremente de un extremo al otro del tablero e infiltrarse en el campo rival.</p>\n            <h4>Cómo usarla</h4>\n            <p>Coloquen sus torres en columnas abiertas (o semiabiertas, sin peones propios) apenas puedan. Suele ser más importante que mover un peón más en el flanco.</p>\n            <div class="mini-diagram" data-fen="6k1/ppp1pppp/8/8/8/8/PPP1PPPP/R5K1" data-highlight="d1,d2,d3,d4,d5,d6,d7,d8"></div>\n            <p class="mini-diagram-caption">La columna "d" no tiene peones de ningún color: está abierta.</p>\n            <div class="lesson-tip">💡 "Torre en columna abierta" es uno de los principios estratégicos más útiles para el medio juego.</div>\n          `,
    puzzle: {
      fen: "1n3bk1/ppp1pppp/8/8/8/8/PPP1PPPP/R4BK1 w - - 0 1",
      solution: [ "a1d1" ],
      prompt: "La columna 'd' está completamente abierta. Llevá tu torre ahí.",
      success: "¡Perfecto! Td1 ocupa la única columna abierta del tablero.",
      fail: "Esa jugada no coloca la torre en la columna abierta. Fijate qué columna no tiene peones.",
      hint: "Ninguna de las dos partes tiene peones en la columna 'd'."
    }
  },
  16: {
    category: "estrategia",
    xp: 55,
    content: `\n            <h4>Caballo bueno vs. caballo malo</h4>\n            <p>Un caballo en el borde del tablero (columnas 'a' u 'h') controla muy pocas casillas y suele estar "malo". Un caballo en el centro, apoyado por un peón y sin poder ser atacado por peones rivales, es una pieza excelente: se llama <b>outpost</b> o "casilla fuerte".</p>\n            <h4>Cómo mejorarlo</h4>\n            <p>Si su caballo está mal ubicado, busquen la ruta más corta para llevarlo a una casilla central protegida.</p>\n            <div class="mini-diagram" data-fen="8/8/8/3N4/8/8/8/N7" data-highlight="d5"></div>\n            <p class="mini-diagram-caption">El caballo en a1 apenas controla 2 casillas; el mismo caballo en d5 controla hasta 8.</p>\n            <div class="lesson-tip">💡 Antes de mover otra pieza, revisen si su caballo peor colocado tiene una ruta de mejora disponible.</div>\n          `,
    puzzle: {
      fen: "2b3k1/pppppppp/8/8/N7/8/PPPPPPPP/5BK1 w - - 0 1",
      solution: [ "a4c5" ],
      prompt: "El caballo está en el borde, sin controlar casi nada. Llevalo a una casilla central.",
      success: "¡Bien! Esa casilla central es mucho más fuerte que el borde del tablero.",
      fail: "Esa jugada no mejora al caballo. Buscá una casilla más central.",
      hint: "Desde a4, el caballo tiene una casilla central disponible en la columna 'c'."
    }
  },
  17: {
    category: "tactica",
    xp: 60,
    content: `\n            <h4>El doble ataque con la dama</h4>\n            <p>La dama, al combinar los movimientos de torre y alfil, es ideal para atacar dos piezas a la vez desde una sola casilla, incluso en direcciones distintas (una por columna o fila, otra por diagonal).</p>\n            <h4>Cómo buscarlo</h4>\n            <p>Fíjense si hay dos piezas rivales sin defensa que compartan una fila, columna o diagonal con una misma casilla disponible para su dama.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/3Q4/8/8/8" data-highlight="d1,d8,a4,h4,a1,g7"></div>\n            <p class="mini-diagram-caption">Desde d4, la dama controla toda la columna, la fila y las dos diagonales a la vez.</p>\n            <div class="lesson-tip">💡 Un doble ataque de dama suele ganar material aunque el rival tenga jaque o amenazas propias, siempre que puedan calcular bien el orden de jugadas.</div>\n          `,
    puzzle: {
      fen: "4k3/pppnpppp/8/r7/8/8/PP1PPPPP/3Q2K1 w - - 0 1",
      sequence: [ "d1a4", "a5a6", "a4d7" ],
      midMessage: "La torre se salva corriendo por la columna 'a'. El caballo quedó solo: andá por él.",
      prompt: "Encontrá la jugada de dama que ataca la torre y el caballo negros al mismo tiempo, y quedate con la pieza que no pueda salvar.",
      success: "¡Doble ataque perfecto! Dxa4 amenazó las dos piezas; al salvar la torre, te quedaste con el caballo.",
      fail: "Esa jugada no ataca las dos piezas a la vez. Buscá una casilla que una la columna de la torre con la diagonal del caballo.",
      hint: "Buscá una casilla en la misma columna que la torre y en la misma diagonal que el caballo. Si salvan la torre, comé el caballo."
    }
  },
  18: {
    category: "tactica",
    xp: 70,
    content: `\n            <h4>La jugada intermedia (zwischenzug)</h4>\n            <p>A veces, antes de resolver el intercambio o la jugada "obvia", conviene intercalar una jugada más fuerte (un jaque o una amenaza mayor) que cambie la evaluación de la posición. El rival debe responder a esa jugada primero.</p>\n            <h4>Cómo detectarla</h4>\n            <p>Antes de recapturar automáticamente, pregúntense: "¿tengo un jaque o una amenaza más fuerte disponible ahora mismo?"</p>\n            <div class="mini-diagram" data-fen="4k3/8/8/1B6/8/8/8/8" data-highlight="b5,c6,d7,e8"></div>\n            <p class="mini-diagram-caption">Antes de resolver lo obvio, revisen si hay un jaque disponible como este.</p>\n            <div class="lesson-tip">💡 No siempre la jugada más obvia es la mejor: revisen si hay una jugada intermedia antes de continuar la secuencia esperada.</div>\n          `,
    puzzle: {
      fen: "1n2k3/pppp1ppp/8/8/3r4/3B4/PPP1PPPP/3Q2K1 w - - 0 1",
      sequence: [ "d3b5", "e8e7", "d1d4" ],
      midMessage: "Ab5+ obliga al rey a moverse antes de ocuparte de cualquier otra cosa.",
      prompt: "Podrías capturar la torre directamente, pero hay una jugada intermedia mejor. Encontrala, y después capturá la torre.",
      success: "¡Excelente! Ab5+ es la jugada intermedia: ganás un tiempo con jaque y después te quedás con la torre igual.",
      fail: "Esa jugada no es la intermedia más fuerte. Pensá en un jaque con el alfil antes de capturar la torre.",
      hint: "El alfil puede dar jaque en lugar de capturar directamente. Después de que el rey se mueva, capturá la torre con la dama."
    }
  },
  19: {
    category: "tactica",
    xp: 80,
    content: `\n            <h4>¿Qué es un sacrificio?</h4>\n            <p>Sacrificar es entregar material a cambio de una compensación mayor: un ataque decisivo, jaque mate, o una ventaja posicional muy grande. No todo sacrificio es correcto: hay que calcular bien lo que se obtiene a cambio.</p>\n            <h4>El "sacrificio griego" (Axh7+)</h4>\n            <p>Un patrón clásico: si el rey rival enrocó corto y su alfil apunta a h7 (o h2), a veces se puede sacrificar el alfil ahí para exponer al rey y lanzar un ataque decisivo con las piezas restantes.</p>\n            <div class="mini-diagram" data-fen="8/8/8/8/8/8/2B5/8" data-highlight="c2,d3,e4,f5,g6,h7"></div>\n            <p class="mini-diagram-caption">La diagonal larga hacia h7: la ruta clásica del sacrificio griego.</p>\n            <div class="lesson-tip">💡 Antes de sacrificar, calculen al menos 2 o 3 jugadas del ataque resultante: un sacrificio sin seguimiento concreto suele ser solo pérdida de material.</div>\n          `,
    puzzle: {
      fen: "r5k1/pppppppp/8/8/8/3B1N2/PPPPPPPP/R5K1 w - - 0 1",
      sequence: [ "d3h7", "g8h7", "f3g5" ],
      midMessage: "El rey captura el alfil... y camina directo hacia el resto del ataque.",
      prompt: "El rey negro enrocó corto y tu alfil apunta directo a h7. Jugá el sacrificio clásico y continuá el ataque.",
      success: "¡Sacrificio griego completo! Axh7+ Rxh7 Cg5+ expone al rey negro por completo: el ataque recién empieza.",
      fail: "Esa jugada no es el sacrificio en h7. Fijate en qué diagonal está tu alfil.",
      hint: "El alfil en d3 apunta directo a la casilla h7. Después de que el rey capture, seguí el ataque con el caballo."
    }
  },
  20: {
    category: "estrategia",
    xp: 120,
    content: `\n            <h4>Cómo armar un plan</h4>\n            <p>Después de la apertura, cada posición pide un plan concreto: puede ser ganar espacio, atacar al rey, mejorar la peor pieza o crear una debilidad en el bando rival. Un plan da sentido a cada jugada individual.</p>\n            <h4>Señales para elegir un plan</h4>\n            <p>Miren la estructura de peones, la seguridad de ambos reyes y qué piezas están mejor o peor colocadas. Eso les va a indicar de qué lado del tablero conviene jugar.</p>\n            <div class="mini-diagram" data-fen="6k1/5ppp/8/8/8/8/5PPP/6K1" data-highlight="f2,g2,h2"></div>\n            <p class="mini-diagram-caption">Un plan concreto: avanzar estos tres peones para atacar al rey enrocado.</p>\n            <div class="lesson-tip">💡 Un plan simple y consistente vence a una sucesión de jugadas sueltas sin conexión entre sí.</div>\n          `,
    puzzle: {
      fen: "2b3k1/ppppp1pp/5n2/8/4P3/8/PPPP1PPP/2B3K1 w - - 0 1",
      solution: [ "e4e5" ],
      prompt: "Elegí la jugada que ejecuta un plan claro: ganar espacio y ganar tiempo atacando al caballo.",
      success: "¡Gran plan! e5 gana espacio y obliga al caballo negro a retroceder, perdiendo tiempo.",
      fail: "Esa jugada no sigue el plan de ganar espacio con tempo. Pensá en avanzar el peón central.",
      hint: "El peón central puede avanzar una casilla y atacar al caballo negro."
    }
  }
};

const EXERCISES = {
  1: {
    category: "principiante",
    xp: 20,
    fen: "3nkb2/1pp2ppp/8/8/r2Q4/8/1PP2PPP/1N4K1 w - - 0 1",
    solution: [ "d4a4" ],
    prompt: "Tu dama puede capturar la torre o el caballo negros. Elegí la captura que gana más material.",
    success: "¡Correcto! La torre vale más que el caballo: Dxa4 es la mejor captura.",
    fail: "Esa captura suma menos material. Compará el valor de la torre y del caballo, y elegí la pieza más valiosa.",
    hint: "Compará: torre = 5 puntos, caballo = 3 puntos."
  },
  2: {
    category: "principiante",
    xp: 20,
    fen: "2b1k3/pp3ppp/8/8/6n1/8/PP3PPP/1N2K2R w K - 0 1",
    solution: [ "e1g1" ],
    prompt: "Es tu turno. Poné a resguardo al rey con la mejor jugada de seguridad.",
    success: "¡Bien! El enroque corto es la jugada más segura para tu rey en esta posición.",
    fail: "Esa jugada no mejora la seguridad del rey. Pensá en enrocar.",
    hint: "El rey puede enrocar corto: se mueve dos casillas hacia la torre."
  },
  3: {
    category: "estrategia",
    xp: 30,
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    solution: [ "e2e4", "d2d4", "g1f3", "c2c4" ],
    prompt: "Elegí una jugada de apertura sólida que luche por el centro o desarrolle una pieza.",
    success: "¡Buena elección! Es una de las jugadas de apertura más sólidas y más jugadas a nivel mundial.",
    fail: "Esa jugada no es la más recomendable para empezar. Pensá en los peones centrales o en desarrollar un caballo.",
    hint: "e4, d4, Cf3 y c4 son las jugadas de apertura más comunes y sólidas."
  },
  4: {
    category: "tactica",
    xp: 35,
    fen: "r1q3k1/pp3ppp/2N5/8/8/8/PP3PPP/2B3K1 w - - 0 1",
    sequence: [ "c6e7", "g8f8", "e7c8" ],
    midMessage: "Ce7+ es jaque: el rey se aparta. Ahora completá la horquilla.",
    prompt: "Encontrá el salto de caballo que ataca al rey y a la dama negros a la vez, y después ganá la dama.",
    success: "¡Horquilla real completa! Diste jaque con el caballo y después ganaste la dama.",
    fail: "Esa jugada no genera un ataque doble. Buscá una casilla de caballo que dé jaque.",
    hint: "Desde e7, el caballo controla tanto c8 como g8. Después del jaque, comé la dama en c8."
  },
  5: {
    category: "tactica",
    xp: 35,
    fen: "2b3k1/p1p2ppp/8/4n2q/8/8/P1P2PPP/1RB3K1 w - - 0 1",
    solution: [ "b1b5" ],
    prompt: "Clavá el caballo negro contra la dama llevando tu torre a la quinta fila.",
    success: "¡Bien visto! Tb5 clava el caballo: si se mueve, pierde la dama.",
    fail: "Esa jugada no clava ninguna pieza. Buscá la fila que comparten el caballo y la dama negros.",
    hint: "El caballo y la dama negros están en la misma fila (la 5)."
  },
  6: {
    category: "tactica",
    xp: 50,
    fen: "rn4kb/1ppppp1p/8/8/8/8/2PPPPPP/QN4K1 w - - 0 1",
    solution: [ "a1a8" ],
    prompt: "Tenés dos capturas con jaque disponibles. Elegí la que gana más material.",
    success: "¡Correcto! Dxa8+ gana la torre (más valiosa que el alfil) y además da jaque.",
    fail: "Esa captura suma menos material. Compará el valor de la torre y el del alfil antes de elegir.",
    hint: "Torre = 5 puntos, alfil = 3 puntos. Elegí capturar la pieza más valiosa."
  },
  7: {
    category: "estrategia",
    xp: 50,
    fen: "r5k1/ppp1p1pp/5n2/8/8/8/PPP2PPP/1NB3K1 w - - 0 1",
    solution: [ "c1g5" ],
    prompt: "Tu alfil sigue en la fila inicial. Activalo presionando al caballo negro.",
    success: "¡Buena mejora de pieza! Ag5 activa tu peor pieza y presiona al caballo.",
    fail: "Esa jugada no activa al alfil de la mejor manera. Buscá la diagonal larga hacia el caballo.",
    hint: "El alfil puede salir por la diagonal hasta la casilla g5."
  },
  8: {
    category: "tactica",
    xp: 75,
    fen: "7k/2pp2pp/8/8/8/8/2PPP3/1Q4K1 w - - 0 1",
    solution: [ "b1b8" ],
    checkmate: true,
    prompt: "El rey negro está atrapado en la esquina por sus propios peones. Encontrá el mate en una jugada.",
    success: "¡Jaque mate! La dama controla toda la última fila y el rey no tiene ninguna escapatoria.",
    fail: "Esa jugada no es mate. Pensá en llevar la dama a la última fila.",
    hint: "Llevá la dama por la columna 'b' hasta la última fila."
  },
  9: {
    category: "principiante",
    xp: 25,
    fen: "1n2k3/pppppppp/8/8/2B5/8/PP1PPPPP/1N4K1 w - - 0 1",
    solution: [ "c4f7" ],
    prompt: "Leé bien la posición: hay un peón negro totalmente indefenso. Capturalo.",
    success: "¡Bien leído! El peón en f7 no tenía ninguna defensa, y de paso das jaque.",
    fail: "Todavía hay una captura gratis disponible. Revisá qué peón negro no tiene ninguna pieza que lo proteja.",
    hint: "El alfil y el peón negro comparten la misma diagonal."
  },
  10: {
    category: "principiante",
    xp: 25,
    fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    solution: [ "e2e4" ],
    prompt: "Jugá exactamente el movimiento que en notación se escribe 'e4'.",
    success: "¡Correcto! Esa jugada es exactamente 'e4': el peón de rey avanza dos casillas.",
    fail: "Esa no es la jugada 'e4'. Fijate bien qué peón y qué casilla indica la notación.",
    hint: "Buscá el peón que puede llegar a la casilla e4 en una sola jugada."
  },
  11: {
    category: "estrategia",
    xp: 35,
    fen: "6k1/pppp1ppp/8/8/8/8/PPPP1PPP/5RK1 w - - 0 1",
    solution: [ "f1e1" ],
    prompt: "Encontrá la única columna sin peones y colocá tu torre ahí.",
    success: "¡Perfecto! La columna 'e' está completamente abierta: tu torre queda mucho más activa ahí.",
    fail: "Esa jugada no coloca la torre en la columna abierta. Fijate cuál es la única columna sin peones.",
    hint: "Ninguna de las dos partes tiene peones en la columna 'e'."
  },
  12: {
    category: "estrategia",
    xp: 40,
    fen: "2b1k3/pppppppp/8/8/8/8/PPPP1PPP/4KB1N w - - 0 1",
    solution: [ "h1g3" ],
    prompt: "Tu caballo está totalmente aislado en el borde. Mejoralo llevándolo hacia el centro.",
    success: "¡Bien! Cg3 saca al caballo del borde y lo acerca a casillas mucho más útiles.",
    fail: "Esa jugada no mejora al caballo. Buscá una casilla más cercana al centro.",
    hint: "Desde h1, el caballo tiene una única casilla razonable de desarrollo."
  },
  13: {
    category: "estrategia",
    xp: 50,
    fen: "1nb3k1/1ppppppp/8/8/8/8/PPPPPPPP/1N4K1 w - - 0 1",
    solution: [ "a2a4" ],
    prompt: "Elegí la jugada que empieza un plan de expansión en el flanco de dama.",
    success: "¡Buen plan! Avanzar el peón dos casillas gana espacio de inmediato en ese flanco.",
    fail: "Esa jugada no es la más ambiciosa para empezar el plan. Pensá en avanzar el peón dos casillas.",
    hint: "El peón todavía no se movió: puede avanzar una o dos casillas."
  },
  14: {
    category: "tactica",
    xp: 40,
    fen: "6k1/pppppppp/8/2n1b3/8/3P4/PPP1PPPP/6K1 w - - 0 1",
    sequence: [ "d3d4", "e5f6", "d4c5" ],
    midMessage: "Salvaron el alfil, que valía más. El caballo quedó indefenso: comelo.",
    prompt: "Encontrá el avance de peón que ataca al caballo y al alfil negros a la vez, y quedate con la pieza que no puedan salvar.",
    success: "¡Horquilla de peón completa! d4 atacó las dos piezas; al salvar el alfil, ganaste el caballo igual.",
    fail: "Esa jugada no genera la horquilla. Pensá en avanzar el peón una casilla.",
    hint: "Un peón blanco ataca en diagonal hacia adelante. Buscá la casilla que ataque dos piezas a la vez, y después comé la que quedó sin defensa."
  },
  15: {
    category: "tactica",
    xp: 50,
    fen: "r1b1k3/pp1p1ppp/8/1N6/8/8/PPPP1PPP/2B3K1 w - - 0 1",
    sequence: [ "b5c7", "e8e7", "c7a8" ],
    midMessage: "Cc7+ es jaque: el rey se aparta. Ahora terminá de ganar la torre.",
    prompt: "En vez de una jugada tranquila, encontrá la jugada intermedia que da jaque, y después ganá la torre.",
    success: "¡Excelente intermedia! Cc7+ ganó tiempo con jaque y después te llevaste la torre en a8.",
    fail: "Esa jugada no es la intermedia más fuerte. Buscá un salto de caballo que dé jaque.",
    hint: "Desde c7, el caballo ataca tanto al rey como a la torre. Después del jaque, comé la torre en a8."
  },
  16: {
    category: "tactica",
    xp: 55,
    fen: "r5k1/pppppppp/8/8/8/4N3/PBPPPPPP/R5K1 w - - 0 1",
    sequence: [ "b2g7", "g8g7", "e3f5" ],
    midMessage: "El rey recaptura el alfil... y queda mucho más expuesto de lo que parece.",
    prompt: "Evaluá si conviene sacrificar el alfil para exponer al rey negro. Jugalo y seguí el ataque.",
    success: "¡Sacrificio correcto! Axg7 destruyó el refugio del rey negro, y el caballo llegó con jaque para continuar el ataque.",
    fail: "Esa jugada no es el sacrificio que expone al rey. Fijate en qué diagonal larga está tu alfil.",
    hint: "El alfil en b2 apunta directo a la casilla g7 por la diagonal larga. Después de la recaptura, seguí con el caballo."
  },
  17: {
    category: "tactica",
    xp: 60,
    fen: "k7/pp2pp2/8/8/8/8/4PPP1/1NQ3K1 w - - 0 1",
    solution: [ "c1c8" ],
    checkmate: true,
    prompt: "El rey negro está atrapado por sus propios peones. Encontrá el mate en una jugada.",
    success: "¡Jaque mate! El rey no puede capturar la dama ni escapar: sus propios peones se lo impiden.",
    fail: "Esa jugada no es mate. Pensá en llevar la dama a la última fila, lejos del alcance del rey.",
    hint: "La dama puede llegar a la última fila por la columna 'c'."
  },
  18: {
    category: "tactica",
    xp: 65,
    fen: "3rk3/pppp1ppp/8/4N3/8/8/PPPP1PPP/4R1K1 w - - 0 1",
    sequence: [ "e5c6", "e8e7", "c6d8" ],
    midMessage: "El jaque descubierto obliga al rey a moverse. Ahora calculá la segunda jugada y quedate con la torre.",
    prompt: "Calculá dos jugadas: encontrá el salto de caballo que descubre jaque, y después ganá la torre negra.",
    success: "¡Cálculo perfecto! Cc6+ descubrió el jaque de tu torre y, dos jugadas después, ganaste la torre.",
    fail: "Esa jugada no descubre el jaque. Pensá en apartar el caballo de la columna 'e'.",
    hint: "Tu torre en e1 y el rey negro están en la misma columna: el caballo la está tapando. Después del jaque, comé la torre en d8."
  },
  19: {
    category: "estrategia",
    xp: 70,
    fen: "2k5/8/8/8/8/8/2P5/2K5 w - - 0 1",
    solution: [ "c1b2", "c1d2", "c1b1", "c1d1" ],
    prompt: "Todavía no conviene avanzar el peón. Mejorá primero la posición de tu rey.",
    success: "¡Buena decisión! En los finales de peones, conviene activar el rey antes de avanzar el peón.",
    fail: "Avanzar el peón ahora no es la mejor decisión. Activá primero tu rey.",
    hint: "Mové el rey hacia el centro o hacia el peón, en lugar de avanzar el peón."
  },
  20: {
    category: "tactica",
    xp: 100,
    fen: "1n4k1/ppp1pppp/8/8/8/8/PPP1PPPP/1N1Q2K1 w - - 0 1",
    solution: [ "d1d8" ],
    checkmate: true,
    prompt: "Combiná todo lo aprendido y encontrá el jaque mate en una jugada.",
    success: "¡Jaque mate! Dd8 controla toda la última fila y los propios peones negros sellan la suerte del rey.",
    fail: "Esa jugada no es mate. Pensá en llevar la dama a la última fila por una columna despejada.",
    hint: "La columna 'd' está completamente libre hasta la última fila."
  }
};

const LESSON_CATEGORY_LABEL = {
  fundamentos: "Fundamentos",
  estrategia: "Estrategia",
  tactica: "Táctica"
};

const EXERCISE_CATEGORY_LABEL = {
  principiante: "Principiante",
  estrategia: "Estrategia",
  tactica: "Táctica"
};

function wireFilterButtons(selector, cardSelector, dataAttr, emptyElId) {
  const buttons = document.querySelectorAll(selector);
  buttons.forEach(btn => {
    btn.addEventListener("click", () => {
      buttons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const filter = btn.dataset[dataAttr];
      const cards = document.querySelectorAll(cardSelector);
      let visibleCount = 0;
      cards.forEach(card => {
        const show = filter === "all" || card.dataset.category === filter;
        card.style.display = show ? "" : "none";
        if (show) visibleCount++;
      });
      const emptyEl = document.getElementById(emptyElId);
      if (emptyEl) emptyEl.style.display = visibleCount === 0 ? "" : "none";
    });
  });
}

wireFilterButtons("[data-learning-filter]", "[data-lesson-card]", "learningFilter", "learning-empty");

wireFilterButtons("[data-exercise-filter]", "[data-exercise-card]", "exerciseFilter", null);

function updateLearningProgress() {
  const completed = state.lessonsCompleted || [];
  const total = Object.keys(LESSONS).length;
  const pct = Math.round(completed.length / total * 100);
  const textEl = document.getElementById("learning-progress-text");
  const barEl = document.getElementById("learning-progress-bar");
  const detailEl = document.getElementById("learning-progress-detail");
  if (textEl) textEl.textContent = pct + "%";
  if (barEl) barEl.style.width = pct + "%";
  if (detailEl) detailEl.textContent = `${completed.length} de ${total} lecciones completadas`;
  document.querySelectorAll("[data-lesson-card]").forEach(card => {
    const id = card.dataset.lessonId;
    const isDone = completed.includes(id);
    card.classList.toggle("completed", isDone);
    const btn = card.querySelector(".lesson-btn");
    if (btn) btn.textContent = isDone ? "✓ Repasar" : "Comenzar";
  });
}

function updateExerciseDashboard() {
  const stats = state.exerciseStats || {
    solved: [],
    firstTry: 0,
    attempts: 0,
    streak: 0,
    bestStreak: 0
  };
  const totalEl = document.getElementById("exercise-total-stat");
  const correctEl = document.getElementById("exercise-correct-stat");
  const streakEl = document.getElementById("exercise-streak-stat");
  const bestEl = document.getElementById("exercise-best-stat");
  if (totalEl) totalEl.textContent = (stats.solved || []).length;
  if (correctEl) {
    const pct = stats.attempts ? Math.round(stats.firstTry / stats.attempts * 100) : 0;
    correctEl.textContent = pct + "%";
  }
  if (streakEl) streakEl.textContent = (stats.streak || 0) + " 🔥";
  if (bestEl) bestEl.textContent = stats.bestStreak || 0;
  document.querySelectorAll("[data-exercise-card]").forEach(card => {
    const id = card.dataset.exerciseId;
    const isDone = (stats.solved || []).includes(id);
    card.classList.toggle("completed", isDone);
  });
}

function ensureLearningState() {
  if (!state.lessonsCompleted) state.lessonsCompleted = [];
  if (!state.exerciseStats) {
    state.exerciseStats = {
      solved: [],
      firstTry: 0,
      attempts: 0,
      streak: 0,
      bestStreak: 0
    };
  }
}

ensureLearningState();

function renderBoardGrid(boardEl, matrix, options = {}) {
  boardEl.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sqName = FILES[c] + (8 - r);
      const sq = document.createElement("div");
      sq.className = "square " + ((r + c) % 2 ? "dark" : "light");
      sq.dataset.square = sqName;
      if (options.selected === sqName) sq.classList.add("selected");
      if (options.highlight && options.highlight.includes(sqName)) sq.classList.add("diagram-highlight");
      const p = matrix[r][c];
      if (p) {
        const piece = document.createElement("div");
        piece.className = "piece " + (p.color === "w" ? "piece-white" : "piece-black");
        piece.textContent = PIECES[p.color + p.type.toUpperCase()];
        sq.appendChild(piece);
      }
      if (options.onClick) sq.addEventListener("click", () => options.onClick(sqName));
      boardEl.appendChild(sq);
    }
  }
}

function fenBoardToMatrix(fen) {
  const rows = fen.split(" ")[0].split("/");
  const matrix = [];
  for (let r = 0; r < 8; r++) {
    const row = [];
    for (const ch of rows[r]) {
      if (/\d/.test(ch)) {
        for (let k = 0; k < parseInt(ch, 10); k++) row.push(null);
      } else {
        row.push({
          color: ch === ch.toUpperCase() ? "w" : "b",
          type: ch.toLowerCase()
        });
      }
    }
    matrix.push(row);
  }
  return matrix;
}

function createPuzzleBoard(boardEl) {
  const ctx = {
    chess: null,
    selected: null,
    solvedOrFailed: false,
    onResult: null
  };
  function draw() {
    renderBoardGrid(boardEl, ctx.chess.board(), {
      selected: ctx.selected,
      onClick: onSquareClick
    });
  }
  function flash(sqName, className) {
    const sqEl = boardEl.querySelector(`[data-square="${sqName}"]`);
    if (!sqEl) return;
    sqEl.classList.add(className);
    setTimeout(() => sqEl.classList.remove(className), 500);
  }
  async function onSquareClick(sqName) {
    if (ctx.solvedOrFailed) return;
    const piece = ctx.chess.get(sqName);
    if (ctx.selected === sqName) {
      ctx.selected = null;
      draw();
      return;
    }
    if (ctx.selected) {
      const from = ctx.selected;
      let promotion = "q";
      if (isPromotionMove(ctx.chess, from, sqName)) {
        const color = ctx.chess.turn();
        ctx.selected = null;
        draw();
        promotion = await askPromotion(color);
      }
      const attempt = {
        from: from,
        to: sqName,
        promotion: promotion
      };
      const uci = from + sqName;
      ctx.selected = null;
      attemptMove(uci, attempt);
      return;
    }
    if (piece && piece.color === ctx.chess.turn()) {
      ctx.selected = sqName;
      draw();
    }
  }
  function attemptMove(uci, attempt) {
    if (ctx.onAttempt) ctx.onAttempt(uci, attempt);
  }
  ctx.load = function(fen) {
    ctx.chess = new Chess(fen);
    ctx.selected = null;
    ctx.solvedOrFailed = false;
    draw();
  };
  ctx.draw = draw;
  ctx.flash = flash;
  return ctx;
}

const lessonBoardCtx = createPuzzleBoard(document.getElementById("lesson-puzzle-board"));

const exerciseBoardCtx = createPuzzleBoard(document.getElementById("exercise-puzzle-board"));

function makeSequenceRunner(boardCtx, feedbackEl, retryBtnEl) {
  const rt = {
    stepIndex: 0,
    resolved: false,
    failedOnce: false,
    puzzle: null
  };
  rt.start = function(puzzle) {
    rt.puzzle = puzzle;
    rt.stepIndex = 0;
    rt.resolved = false;
    rt.failedOnce = false;
    boardCtx.load(puzzle.fen);
    boardCtx.solvedOrFailed = false;
    feedbackEl.textContent = "";
    feedbackEl.className = "puzzle-feedback";
    if (retryBtnEl) retryBtnEl.style.display = "none";
  };
  rt.isLastPlayerStep = function() {
    const seq = rt.puzzle.sequence;
    if (!seq) return true;
    return rt.stepIndex === seq.length - 1;
  };
  rt.attempt = function(uci, attempt, callbacks) {
    const {onSolved: onSolved, onWrong: onWrong} = callbacks || {};
    if (rt.resolved || boardCtx.solvedOrFailed) return;
    const testChess = new Chess(boardCtx.chess.fen());
    const move = testChess.move(attempt);
    if (!move) {
      boardCtx.draw();
      return;
    }
    const puzzle = rt.puzzle;
    const isFinal = rt.isLastPlayerStep();
    let isCorrect;
    if (puzzle.sequence) {
      const expected = puzzle.sequence[rt.stepIndex];
      isCorrect = isFinal && puzzle.checkmate ? testChess.in_checkmate() : uci === expected;
    } else {
      isCorrect = puzzle.checkmate ? testChess.in_checkmate() : puzzle.solution.includes(uci);
    }
    if (!isCorrect) {
      boardCtx.draw();
      boardCtx.flash(attempt.to, "wrong-flash");
      feedbackEl.textContent = "❌ " + puzzle.fail;
      feedbackEl.className = "puzzle-feedback wrong";
      if (retryBtnEl) retryBtnEl.style.display = "";
      const wasFirstFailure = !rt.failedOnce;
      rt.failedOnce = true;
      if (onWrong) onWrong(wasFirstFailure);
      return;
    }
    boardCtx.chess = testChess;
    boardCtx.draw();
    boardCtx.flash(attempt.to, "solved-flash");
    if (isFinal) {
      rt.resolved = true;
      boardCtx.solvedOrFailed = true;
      feedbackEl.textContent = "✅ " + puzzle.success;
      feedbackEl.className = "puzzle-feedback correct";
      if (onSolved) onSolved();
      return;
    }
    feedbackEl.textContent = "✅ " + (puzzle.midMessage || "¡Bien! El rival responde. Seguí calculando.");
    feedbackEl.className = "puzzle-feedback correct";
    boardCtx.solvedOrFailed = true;
    const autoUci = puzzle.sequence[rt.stepIndex + 1];
    const from = autoUci.slice(0, 2);
    const to = autoUci.slice(2, 4);
    setTimeout(() => {
      const autoChess = new Chess(boardCtx.chess.fen());
      autoChess.move({
        from: from,
        to: to,
        promotion: "q"
      });
      boardCtx.chess = autoChess;
      boardCtx.draw();
      boardCtx.flash(to, "opponent-flash");
      boardCtx.solvedOrFailed = false;
      rt.stepIndex += 2;
    }, 700);
  };
  return rt;
}

let currentLessonId = null;

let lessonPuzzleSolved = false;

const lessonRunner = makeSequenceRunner(lessonBoardCtx, document.getElementById("lesson-puzzle-feedback"), document.getElementById("lesson-puzzle-retry"));

function checklistAllChecked() {
  const boxes = document.querySelectorAll("#lesson-modal .lesson-check");
  return Array.from(boxes).every(b => b.checked);
}

function refreshLessonCompleteButton() {
  const btn = document.getElementById("lesson-complete");
  if (!btn) return;
  const alreadyDone = (state.lessonsCompleted || []).includes(String(currentLessonId));
  if (alreadyDone) {
    btn.disabled = true;
    btn.textContent = "✓ Lección completada";
    return;
  }
  btn.textContent = "✓ Marcar como completada";
  btn.disabled = !(lessonPuzzleSolved && checklistAllChecked());
}

function renderMiniDiagrams(containerEl) {
  containerEl.querySelectorAll(".mini-diagram[data-fen]").forEach(el => {
    const highlight = (el.dataset.highlight || "").split(",").filter(Boolean);
    const boardDiv = document.createElement("div");
    boardDiv.className = "board mini-diagram-board";
    renderBoardGrid(boardDiv, fenBoardToMatrix(el.dataset.fen), {
      highlight: highlight
    });
    el.innerHTML = "";
    el.appendChild(boardDiv);
  });
}

function openLessonModal(id) {
  const lesson = LESSONS[id];
  if (!lesson) return;
  currentLessonId = id;
  lessonPuzzleSolved = (state.lessonsCompleted || []).includes(String(id));
  const card = document.querySelector(`[data-lesson-card][data-lesson-id="${id}"]`);
  const titleText = card ? card.querySelector("h3").textContent : "Lección";
  document.getElementById("lesson-modal-category").textContent = "📚 " + (LESSON_CATEGORY_LABEL[lesson.category] || "Lección");
  document.getElementById("lesson-title").textContent = titleText;
  const contentEl = document.getElementById("lesson-content");
  contentEl.innerHTML = lesson.content;
  renderMiniDiagrams(contentEl);
  document.querySelectorAll("#lesson-modal .lesson-check").forEach(b => {
    b.checked = lessonPuzzleSolved;
    b.onchange = refreshLessonCompleteButton;
  });
  document.getElementById("lesson-puzzle-prompt").textContent = lesson.puzzle.prompt;
  lessonRunner.start(lesson.puzzle);
  const feedbackEl = document.getElementById("lesson-puzzle-feedback");
  if (lessonPuzzleSolved) {
    lessonBoardCtx.solvedOrFailed = true;
    feedbackEl.textContent = "✓ Ya resolviste esta posición.";
    feedbackEl.classList.add("correct");
  }
  lessonBoardCtx.onAttempt = function(uci, attempt) {
    if (lessonPuzzleSolved) return;
    lessonRunner.attempt(uci, attempt, {
      onSolved: () => {
        lessonPuzzleSolved = true;
        refreshLessonCompleteButton();
      }
    });
    refreshLessonCompleteButton();
  };
  refreshLessonCompleteButton();
  document.getElementById("lesson-modal").style.display = "flex";
}

function closeLessonModal() {
  document.getElementById("lesson-modal").style.display = "none";
  currentLessonId = null;
}

document.querySelectorAll(".lesson-btn").forEach(btn => {
  btn.addEventListener("click", () => openLessonModal(btn.dataset.lesson));
});

document.getElementById("lesson-close").addEventListener("click", closeLessonModal);

document.getElementById("lesson-modal").addEventListener("click", e => {
  if (e.target.id === "lesson-modal") closeLessonModal();
});

document.getElementById("lesson-puzzle-hint").addEventListener("click", () => {
  const lesson = LESSONS[currentLessonId];
  if (!lesson) return;
  toast("💡 " + lesson.puzzle.hint);
});

document.getElementById("lesson-puzzle-retry").addEventListener("click", () => {
  const lesson = LESSONS[currentLessonId];
  if (!lesson) return;
  lessonRunner.start(lesson.puzzle);
});

document.getElementById("lesson-complete").addEventListener("click", () => {
  if (!currentLessonId) return;
  const lesson = LESSONS[currentLessonId];
  const idStr = String(currentLessonId);
  if ((state.lessonsCompleted || []).includes(idStr)) return;
  state.lessonsCompleted.push(idStr);
  save();
  addXP(lesson.xp, "Lección completada", "Completada");
  updateLearningProgress();
  refreshLessonCompleteButton();
});

let currentExerciseId = null;

let exerciseAttemptCounted = false;

const exerciseRunner = makeSequenceRunner(exerciseBoardCtx, document.getElementById("puzzle-feedback"), document.getElementById("exercise-puzzle-retry"));

function openExerciseModal(id) {
  const ex = EXERCISES[id];
  if (!ex) return;
  currentExerciseId = id;
  exerciseAttemptCounted = false;
  const card = document.querySelector(`[data-exercise-card][data-exercise-id="${id}"]`);
  const titleText = card ? card.querySelector("h3").textContent : "Ejercicio";
  document.getElementById("exercise-modal-category").textContent = "⚡ " + (EXERCISE_CATEGORY_LABEL[ex.category] || "Ejercicio");
  document.getElementById("exercise-modal-title").textContent = titleText;
  document.getElementById("exercise-modal-streak").textContent = "🔥 Racha: " + (state.exerciseStats && state.exerciseStats.streak || 0);
  document.getElementById("exercise-question").textContent = ex.prompt;
  document.getElementById("exercise-result").style.display = "none";
  exerciseRunner.start(ex);
  exerciseBoardCtx.onAttempt = function(uci, attempt) {
    exerciseRunner.attempt(uci, attempt, {
      onSolved: () => {
        ensureLearningState();
        const stats = state.exerciseStats;
        const idStr = String(id);
        const alreadySolved = (stats.solved || []).includes(idStr);
        if (!alreadySolved) {
          if (!exerciseAttemptCounted) {
            stats.attempts = (stats.attempts || 0) + 1;
            exerciseAttemptCounted = true;
          }
          if (!exerciseRunner.failedOnce) {
            stats.firstTry = (stats.firstTry || 0) + 1;
            stats.streak = (stats.streak || 0) + 1;
            stats.bestStreak = Math.max(stats.bestStreak || 0, stats.streak);
          } else {
            stats.streak = 0;
          }
          stats.solved = stats.solved || [];
          stats.solved.push(idStr);
          save();
          addXP(ex.xp, "Ejercicio resuelto", "Correcto");
        }
        document.getElementById("exercise-modal-streak").textContent = "🔥 Racha: " + stats.streak;
        document.getElementById("exercise-result-score").textContent = "1/1";
        document.getElementById("exercise-result-text").textContent = alreadySolved ? "Ya habías resuelto este ejercicio antes. ¡Repaso completado!" : `¡Resuelto! Ganaste ${ex.xp} XP.`;
        document.getElementById("exercise-result").style.display = "";
        updateExerciseDashboard();
      },
      onWrong: wasFirstFailure => {
        if (!wasFirstFailure) return;
        ensureLearningState();
        const stats = state.exerciseStats;
        const idStr = String(id);
        const alreadySolved = (stats.solved || []).includes(idStr);
        if (alreadySolved || exerciseAttemptCounted) return;
        stats.attempts = (stats.attempts || 0) + 1;
        exerciseAttemptCounted = true;
        stats.streak = 0;
        save();
        document.getElementById("exercise-modal-streak").textContent = "🔥 Racha: 0";
        updateExerciseDashboard();
      }
    });
  };
  document.getElementById("exercise-modal").style.display = "flex";
}

function closeExerciseModal() {
  document.getElementById("exercise-modal").style.display = "none";
  currentExerciseId = null;
}

document.querySelectorAll(".exercise-start").forEach(btn => {
  btn.addEventListener("click", () => openExerciseModal(btn.dataset.exercise));
});

document.getElementById("exercise-close").addEventListener("click", closeExerciseModal);

document.getElementById("exercise-modal").addEventListener("click", e => {
  if (e.target.id === "exercise-modal") closeExerciseModal();
});

document.getElementById("exercise-puzzle-hint").addEventListener("click", () => {
  const ex = EXERCISES[currentExerciseId];
  if (!ex) return;
  toast("💡 " + ex.hint);
});

document.getElementById("exercise-puzzle-retry").addEventListener("click", () => {
  const ex = EXERCISES[currentExerciseId];
  if (!ex) return;
  document.getElementById("exercise-result").style.display = "none";
  exerciseRunner.start(ex);
});

updateLearningProgress();

updateExerciseDashboard();

const FB_CONFIG_KEY = "chessSchoolFirebaseConfig";

const FB_ROOM_KEY = "chessSchoolFirebaseRoom";

const START_FEN_TOURNEY = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBdZDmedsEcht9kc3hSGOTEsbzr7D9t-wk",
  authDomain: "torneo-ajedrez-escuelaipem146.firebaseapp.com",
  projectId: "torneo-ajedrez-escuelaipem146",
  storageBucket: "torneo-ajedrez-escuelaipem146.firebasestorage.app",
  messagingSenderId: "220659996001",
  appId: "1:220659996001:web:8c7f82674634f026eea120",
  measurementId: "G-BXEGXS25VQ"
};

let fbDb = null;

let fbRoomRef = null;

let gamesCollectionRef = null;

function gameDocId_(round, board) {
  return round + "_" + board;
}

function matchChatCollectionRef_(round, board) {
  return gamesCollectionRef.doc(gameDocId_(round, board)).collection("chat");
}

let announcementsCollectionRef = null;

let announcementsUnsub = null;

let lastAnnouncementId_ = null;

let announcementHistory_ = [];

let publicScreenActiveGames_ = [];

let publicScreenCycleIndex_ = 0;

let publicScreenCycleTimer_ = null;

let publicScreenZoomKey_ = null;

let countdownClockOffsetMs_ = 0;

let roundCountdownTimer_ = null;

function syncedNow_() {
  return Date.now() + countdownClockOffsetMs_;
}

function assertAdminOrReferee() {
  if (!isCurrentUserAdmin(lastTournamentState) && !isCurrentUserReferee()) {
    throw new Error("Esta acción es exclusiva del administrador o del árbitro del torneo");
  }
}

function subscribeAnnouncements() {
  if (announcementsUnsub) {
    announcementsUnsub();
    announcementsUnsub = null;
  }
  lastAnnouncementId_ = null;
  announcementHistory_ = [];
  let firstSnapshot = true;
  announcementsUnsub = announcementsCollectionRef.orderBy("ts", "desc").limit(10).onSnapshot(qsnap => {
    announcementHistory_ = qsnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));
    renderAnnouncementHistory_();
    const top = announcementHistory_[0] || null;
    renderAnnouncementBanner_(top);
    if (!firstSnapshot && top && top.id !== lastAnnouncementId_) {
      toast("📢 " + (top.text || ""), 6e3);
      SoundFX.announcement();
    }
    lastAnnouncementId_ = top ? top.id : null;
    firstSnapshot = false;
  }, () => {});
}

let announcementBannerTimer_ = null;

function renderAnnouncementBanner_(data) {
  const bannerEl = document.getElementById("tournament-announcement-banner");
  const textEl = document.getElementById("tournament-announcement-text");
  if (!bannerEl || !textEl) return;
  clearTimeout(announcementBannerTimer_);
  if (!data || !data.text) {
    bannerEl.style.display = "none";
    return;
  }
  textEl.textContent = data.text;
  bannerEl.style.display = "";
  announcementBannerTimer_ = setTimeout(() => {
    bannerEl.style.display = "none";
  }, 6e3);
}

function formatAnnouncementTime_(ts) {
  if (!ts || typeof ts.toDate !== "function") return "";
  return ts.toDate().toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function stopRoundCountdownTimer_() {
  if (roundCountdownTimer_) {
    clearInterval(roundCountdownTimer_);
    roundCountdownTimer_ = null;
  }
}

function renderRoundCountdown_(state) {
  const bannerEl = document.getElementById("tournament-round-countdown-banner");
  const labelEl = document.getElementById("tournament-round-countdown-label");
  const timeEl = document.getElementById("tournament-round-countdown-time");
  const cancelBtn = document.getElementById("tournament-round-countdown-cancel-btn");
  if (!bannerEl || !labelEl || !timeEl) return;
  stopRoundCountdownTimer_();
  const setAt = state.meta.roundCountdownSetAt;
  const durationMs = state.meta.roundCountdownMs;
  const hasTarget = setAt && typeof setAt.toMillis === "function" && durationMs;
  if (cancelBtn) cancelBtn.style.display = hasTarget ? "" : "none";
  if (!hasTarget) {
    bannerEl.style.display = "none";
    bannerEl.classList.remove("round-countdown-urgent");
    return;
  }
  const targetMs = setAt.toMillis() + durationMs;
  labelEl.textContent = `Ronda ${state.meta.round + 1} arranca en`;
  bannerEl.style.display = "";
  const tick = () => {
    const remainingMs = targetMs - syncedNow_();
    if (remainingMs <= 0) {
      timeEl.textContent = "¡ya!";
      bannerEl.classList.remove("round-countdown-urgent");
      stopRoundCountdownTimer_();
      return;
    }
    const remainingSec = Math.ceil(remainingMs / 1e3);
    timeEl.textContent = formatTime(remainingSec);
    bannerEl.classList.toggle("round-countdown-urgent", remainingSec <= 60);
  };
  tick();
  roundCountdownTimer_ = setInterval(tick, 250);
}

function escapeAnnouncementHtml_(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function renderAnnouncementHistory_() {
  const toggleBtn = document.getElementById("tournament-announcement-history-toggle");
  const listEl = document.getElementById("tournament-announcement-history-list");
  if (!toggleBtn || !listEl) return;
  if (!announcementHistory_.length) {
    toggleBtn.style.display = "none";
    listEl.style.display = "none";
    return;
  }
  toggleBtn.style.display = "";
  toggleBtn.textContent = `📋 Ver anuncios (${announcementHistory_.length})`;
  listEl.innerHTML = announcementHistory_.map(a => {
    const time = formatAnnouncementTime_(a.ts);
    return `<div class="announcement-history-item">` + `<span class="announcement-history-text">${escapeAnnouncementHtml_(a.text)}</span>` + (time ? `<span class="announcement-history-time">${time}</span>` : "") + `</div>`;
  }).join("");
}

async function sendTournamentAnnouncement(text) {
  assertAdminOrReferee();
  const clean = (text || "").trim();
  if (!clean) throw new Error("Escribí un mensaje para anunciar");
  await announcementsCollectionRef.add({
    text: clean,
    ts: srvTimestamp(),
    byEmail: currentUser ? currentUser.email : null
  });
}

async function fbSetRoundCountdown(minutes) {
  assertAdminOrReferee();
  const m = Number(minutes);
  if (!m || m <= 0) throw new Error("Elegí una cantidad de minutos válida");
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    tx.update(fbRoomRef, {
      meta: {
        ...data.meta,
        roundCountdownSetAt: srvTimestamp(),
        roundCountdownMs: Math.round(m * 6e4)
      }
    });
  });
}

async function fbCancelRoundCountdown() {
  assertAdminOrReferee();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) return;
    const data = snap.data();
    tx.update(fbRoomRef, {
      meta: {
        ...data.meta,
        roundCountdownSetAt: null,
        roundCountdownMs: null
      }
    });
  });
}

function subscribeMatchChat(round, board) {
  unsubscribeMatchChat();
  matchChatMessages = [];
  matchChatUnreadCount = 0;
  matchChatPanelOpen = false;
  matchChatFirstSnapshot = true;
  renderMatchChat();
  if (!tournamentMyColor()) return;
  matchChatUnsub = matchChatCollectionRef_(round, board).orderBy("at", "asc").limitToLast(200).onSnapshot(qsnap => {
    const previousCount = matchChatMessages.length;
    matchChatMessages = qsnap.docs.map(d => d.data());
    const newMessages = matchChatMessages.slice(previousCount);
    const newCount = newMessages.length;
    if (newCount > 0 && !matchChatPanelOpen) {
      matchChatUnreadCount += newCount;
    }
    renderMatchChat();
    notifyNewMatchChatMessages_(newMessages, matchChatFirstSnapshot);
    matchChatFirstSnapshot = false;
  }, () => {});
}

function notifyNewMatchChatMessages_(newMessages, isInitialLoad) {
  if (isInitialLoad || !newMessages.length || matchChatMuted) return;
  const myEmail = currentUser ? currentUser.email.toLowerCase() : "";
  const fromOpponent = newMessages.filter(m => (m.senderEmail || "").toLowerCase() !== myEmail);
  if (!fromOpponent.length) return;
  SoundFX.chatMessage();
  if (matchChatPanelOpen) return;
  const last = fromOpponent[fromOpponent.length - 1];
  const gameNotStarted = game.history().length === 0;
  if (gameNotStarted) {
    showChatMessagePopup(last.senderName || "Tu rival", last.text || "");
  } else {
    const preview = (last.text || "").length > 60 ? last.text.slice(0, 60) + "…" : last.text || "";
    toast("💬 " + (last.senderName || "Tu rival") + ": " + preview);
  }
}

function unsubscribeMatchChat() {
  if (matchChatUnsub) {
    matchChatUnsub();
    matchChatUnsub = null;
  }
  matchChatMessages = [];
  matchChatUnreadCount = 0;
  matchChatPanelOpen = false;
  const panelEl = document.getElementById("tournament-match-chat-panel");
  if (panelEl) panelEl.style.display = "none";
  const inputEl = document.getElementById("tournament-match-chat-input");
  if (inputEl) inputEl.value = "";
  resetMatchChatComposer_();
}

function renderMatchChat() {
  const wrapEl = document.getElementById("tournament-match-chat");
  const listEl = document.getElementById("tournament-match-chat-messages");
  const noteEl = document.getElementById("tournament-match-chat-note");
  const unreadEl = document.getElementById("tournament-match-chat-unread");
  const inputRow = document.querySelector("#tournament-match-chat-panel .chat-input-row");
  const clearBtn = document.getElementById("tournament-match-chat-clear-btn");
  const toggleBtn = document.getElementById("tournament-match-chat-toggle-btn");
  if (!wrapEl || !listEl) return;
  const myColor = tournamentMyColor();
  const canChat = !!myColor;
  wrapEl.style.display = tournamentMatchActive && canChat ? "" : "none";
  if (!canChat) return;
  if (inputRow) inputRow.style.display = "";
  if (noteEl) noteEl.textContent = "";
  if (clearBtn) {
    clearBtn.style.display = matchChatMessages.length ? "" : "none";
  }
  renderMatchChatMuteBtn_();
  if (unreadEl) {
    if (matchChatUnreadCount > 0) {
      unreadEl.textContent = String(matchChatUnreadCount);
      unreadEl.style.display = "";
    } else {
      unreadEl.style.display = "none";
    }
  }
  if (toggleBtn) {
    toggleBtn.classList.toggle("chat-toggle-pulse", matchChatUnreadCount > 0 && !matchChatPanelOpen);
  }
  if (!matchChatMessages.length) {
    listEl.innerHTML = '<p class="chat-message-empty">Todavía no hay mensajes. ¡Saludá a tu rival!</p>';
  } else {
    const myEmail = currentUser ? currentUser.email : "";
    listEl.innerHTML = matchChatMessages.map(m => {
      const mine = myEmail && (m.senderEmail || "").toLowerCase() === myEmail;
      const name = escapeHtml_(m.senderName || "Jugador");
      const text = escapeHtml_(m.text || "");
      const time = m.at ? new Date(m.at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit"
      }) : "";
      return `<div class="chat-message${mine ? " mine" : ""}">` + `<span class="chat-message-meta">${name}${time ? ` <span class="chat-message-time">· ${time}</span>` : ""}</span>${text}` + `</div>`;
    }).join("");
    listEl.scrollTop = listEl.scrollHeight;
  }
}

function toggleMatchChatPanel() {
  matchChatPanelOpen = !matchChatPanelOpen;
  const panelEl = document.getElementById("tournament-match-chat-panel");
  if (panelEl) panelEl.style.display = matchChatPanelOpen ? "" : "none";
  if (matchChatPanelOpen) {
    matchChatUnreadCount = 0;
    renderMatchChat();
    const listEl = document.getElementById("tournament-match-chat-messages");
    if (listEl) listEl.scrollTop = listEl.scrollHeight;
    const inputEl = document.getElementById("tournament-match-chat-input");
    if (inputEl) inputEl.focus();
  }
}

async function sendMatchChatMessage() {
  const inputEl = document.getElementById("tournament-match-chat-input");
  if (!inputEl) return;
  const text = inputEl.value.trim();
  if (!text) return;
  if (!tournamentMatchCtx || !currentUser) return;
  const myColor = tournamentMyColor();
  if (!myColor) return;
  inputEl.value = "";
  resetMatchChatComposer_();
  try {
    await matchChatCollectionRef_(tournamentMatchCtx.round, tournamentMatchCtx.board).add({
      text: text.slice(0, 300),
      senderEmail: currentUser.email,
      senderName: currentUser.displayName || currentUser.email,
      senderColor: myColor,
      at: Date.now()
    });
  } catch (err) {
    inputEl.value = text;
    toast("❌ No se pudo enviar el mensaje: " + err.message);
  }
}

function setMatchChatMuted(muted) {
  matchChatMuted = muted;
  localStorage.setItem("chessMatchChatMuted", matchChatMuted ? "on" : "off");
  renderMatchChatMuteBtn_();
  syncChatNotifCfgUI_();
}

function toggleMatchChatMute() {
  setMatchChatMuted(!matchChatMuted);
  toast(matchChatMuted ? "🔕 Chat silenciado" : "🔔 Chat con notificaciones");
}

function renderMatchChatMuteBtn_() {
  const btn = document.getElementById("tournament-match-chat-mute-btn");
  if (!btn) return;
  btn.textContent = matchChatMuted ? "🔕" : "🔔";
  btn.title = matchChatMuted ? "Activar notificaciones de este chat" : "Silenciar notificaciones de este chat";
  btn.classList.toggle("muted", matchChatMuted);
}

function resetMatchChatComposer_() {
  const counterEl = document.getElementById("tournament-match-chat-counter");
  if (counterEl) counterEl.textContent = "";
  const sendBtn = document.getElementById("tournament-match-chat-send-btn");
  if (sendBtn) sendBtn.disabled = true;
}

async function clearMatchChat() {
  if (!tournamentMatchCtx || !tournamentMyColor()) return;
  if (!matchChatMessages.length) return;
  if (!confirm("¿Vaciar el chat de esta mesa? Se borran los mensajes para los dos jugadores y no se puede deshacer.")) {
    return;
  }
  const round = tournamentMatchCtx.round;
  const board = tournamentMatchCtx.board;
  try {
    const snap = await matchChatCollectionRef_(round, board).get();
    if (snap.empty) return;
    const batch = fbDb.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    toast("🗑️ Chat vaciado");
  } catch (err) {
    toast("❌ No se pudo vaciar el chat: " + err.message);
  }
}

function callDocRef_(round, board) {
  return gamesCollectionRef.doc(gameDocId_(round, board)).collection("call").doc("session");
}

function callCandidatesRef_(round, board, who) {
  return callDocRef_(round, board).collection(who);
}

function renderCallUI() {
  const wrapEl = document.getElementById("tournament-match-call");
  const idleEl = document.getElementById("tournament-match-call-idle");
  const incomingEl = document.getElementById("tournament-match-call-incoming");
  const outgoingEl = document.getElementById("tournament-match-call-outgoing");
  const activeEl = document.getElementById("tournament-match-call-active");
  const noteEl = document.getElementById("tournament-match-call-note");
  const muteBtn = document.getElementById("tournament-match-call-mute-btn");
  if (!wrapEl) return;
  const myColor = tournamentMyColor();
  wrapEl.style.display = tournamentMatchActive && myColor ? "" : "none";
  if (!myColor) return;
  idleEl.style.display = callState === "idle" ? "" : "none";
  incomingEl.style.display = callState === "incoming" ? "flex" : "none";
  outgoingEl.style.display = callState === "outgoing" ? "flex" : "none";
  activeEl.style.display = callState === "active" ? "flex" : "none";
  if (muteBtn) {
    muteBtn.textContent = callIsMuted ? "🔈 Reactivar micrófono" : "🔇 Silenciar";
    muteBtn.classList.toggle("muted", callIsMuted);
  }
  if (noteEl) {
    noteEl.textContent = callState === "idle" ? "Llamada de audio opcional entre vos y tu rival, no queda grabada." : "";
  }
}

function teardownCallLocal_() {
  SoundFX.stopRing();
  if (callPc) {
    callPc.onicecandidate = null;
    callPc.ontrack = null;
    callPc.close();
    callPc = null;
  }
  if (callLocalStream) {
    callLocalStream.getTracks().forEach(t => t.stop());
    callLocalStream = null;
  }
  callCandidatesUnsub.forEach(unsub => unsub());
  callCandidatesUnsub = [];
  const audioEl = document.getElementById("tournament-match-call-remote-audio");
  if (audioEl) audioEl.srcObject = null;
  callIsMuted = false;
  callState = "idle";
  callPendingOffer = null;
  renderCallUI();
}

function listenRemoteCandidates_(round, board, who) {
  const unsub = callCandidatesRef_(round, board, who).onSnapshot(qsnap => {
    qsnap.docChanges().forEach(change => {
      if (change.type === "added" && callPc) {
        callPc.addIceCandidate(new RTCIceCandidate(change.doc.data())).catch(() => {});
      }
    });
  });
  callCandidatesUnsub.push(unsub);
}

function newCallPeerConnection_() {
  const pc = new RTCPeerConnection(RTC_ICE_SERVERS);
  pc.ontrack = event => {
    const audioEl = document.getElementById("tournament-match-call-remote-audio");
    if (audioEl) audioEl.srcObject = event.streams[0];
  };
  return pc;
}

async function startAudioCall() {
  if (!tournamentMatchCtx || callState !== "idle" || !tournamentMyColor()) return;
  const round = tournamentMatchCtx.round;
  const board = tournamentMatchCtx.board;
  try {
    callLocalStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });
  } catch (err) {
    toast("❌ No se pudo acceder al micrófono: " + err.message);
    return;
  }
  callState = "outgoing";
  renderCallUI();
  SoundFX.startRing();
  callPc = newCallPeerConnection_();
  callLocalStream.getTracks().forEach(track => callPc.addTrack(track, callLocalStream));
  const offerCandidates = callCandidatesRef_(round, board, "offerCandidates");
  callPc.onicecandidate = event => {
    if (event.candidate) offerCandidates.add(event.candidate.toJSON());
  };
  try {
    const offerDescription = await callPc.createOffer();
    await callPc.setLocalDescription(offerDescription);
    await callDocRef_(round, board).set({
      offer: {
        type: offerDescription.type,
        sdp: offerDescription.sdp
      },
      answer: null,
      status: "calling",
      callerEmail: currentUser ? currentUser.email : "",
      at: Date.now()
    });
  } catch (err) {
    toast("❌ No se pudo iniciar la llamada: " + err.message);
    teardownCallLocal_();
    return;
  }
  listenRemoteCandidates_(round, board, "answerCandidates");
}

async function acceptIncomingCall_(offer) {
  if (!tournamentMatchCtx || !tournamentMyColor()) return;
  const round = tournamentMatchCtx.round;
  const board = tournamentMatchCtx.board;
  try {
    callLocalStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });
  } catch (err) {
    toast("❌ No se pudo acceder al micrófono: " + err.message);
    return;
  }
  callPc = newCallPeerConnection_();
  callLocalStream.getTracks().forEach(track => callPc.addTrack(track, callLocalStream));
  const answerCandidates = callCandidatesRef_(round, board, "answerCandidates");
  callPc.onicecandidate = event => {
    if (event.candidate) answerCandidates.add(event.candidate.toJSON());
  };
  try {
    await callPc.setRemoteDescription(new RTCSessionDescription(offer));
    const answerDescription = await callPc.createAnswer();
    await callPc.setLocalDescription(answerDescription);
    await callDocRef_(round, board).update({
      answer: {
        type: answerDescription.type,
        sdp: answerDescription.sdp
      },
      status: "active"
    });
  } catch (err) {
    toast("❌ No se pudo atender la llamada: " + err.message);
    teardownCallLocal_();
    return;
  }
  listenRemoteCandidates_(round, board, "offerCandidates");
  callState = "active";
  renderCallUI();
  SoundFX.stopRing();
}

async function declineIncomingCall_() {
  if (!tournamentMatchCtx) return;
  try {
    await callDocRef_(tournamentMatchCtx.round, tournamentMatchCtx.board).update({
      status: "declined"
    });
  } catch (err) {}
  teardownCallLocal_();
}

async function hangUpCall() {
  if (!tournamentMatchCtx) {
    teardownCallLocal_();
    return;
  }
  const round = tournamentMatchCtx.round;
  const board = tournamentMatchCtx.board;
  teardownCallLocal_();
  try {
    await callDocRef_(round, board).set({
      status: "ended",
      at: Date.now()
    }, {
      merge: true
    });
    const [offerSnap, answerSnap] = await Promise.all([ callCandidatesRef_(round, board, "offerCandidates").get(), callCandidatesRef_(round, board, "answerCandidates").get() ]);
    const batch = fbDb.batch();
    offerSnap.docs.forEach(d => batch.delete(d.ref));
    answerSnap.docs.forEach(d => batch.delete(d.ref));
    batch.set(callDocRef_(round, board), {
      status: "idle",
      offer: null,
      answer: null
    }, {
      merge: true
    });
    await batch.commit();
  } catch (err) {}
}

function toggleCallMute() {
  if (!callLocalStream) return;
  callIsMuted = !callIsMuted;
  callLocalStream.getAudioTracks().forEach(t => t.enabled = !callIsMuted);
  renderCallUI();
}

function subscribeCallSignaling(round, board) {
  unsubscribeCallSignaling();
  callDocUnsub = callDocRef_(round, board).onSnapshot(docSnap => {
    const data = docSnap.exists ? docSnap.data() : null;
    if (!data || data.status === "idle" || data.status === "ended" || data.status === "declined") {
      if (callState !== "idle") teardownCallLocal_();
      return;
    }
    const myColor = tournamentMyColor();
    const myEmail = currentUser ? currentUser.email : "";
    const iAmCaller = data.callerEmail && data.callerEmail.toLowerCase() === myEmail;
    if (data.status === "calling" && !iAmCaller && callState === "idle" && myColor) {
      callState = "incoming";
      callPendingOffer = data.offer;
      renderCallUI();
      SoundFX.startRing();
    } else if (data.status === "active" && iAmCaller && data.answer && callPc && !callPc.currentRemoteDescription) {
      callPc.setRemoteDescription(new RTCSessionDescription(data.answer)).catch(() => {});
      callState = "active";
      renderCallUI();
      SoundFX.stopRing();
    }
  }, () => {});
}

function unsubscribeCallSignaling() {
  if (callDocUnsub) {
    callDocUnsub();
    callDocUnsub = null;
  }
  teardownCallLocal_();
}

let lastRoundGames = [];

let gamesRoundUnsub = null;

let subscribedRound_ = undefined;

let tournamentUnsub = null;

let tournamentBusy = false;

lastTournamentState = null;

let lastKnownTournamentStatus_ = null;

let tournamentEditingPlayerId = null;

currentUser = null;

let connectionMode = "online";

let lanClient_ = null;

function srvTimestamp() {
  return connectionMode === "lan" ? window.LAN.serverTimestamp() : firebase.firestore.FieldValue.serverTimestamp();
}

function getTimestampMs(ts) {
  if (ts && typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts === "number") return ts;
  return 0;
}

async function syncInternetClock_() {
  const endpoints = [ {
    url: "https://worldtimeapi.org/api/timezone/Etc/UTC",
    parse: d => d.unixtime * 1e3
  }, {
    url: "https://timeapi.io/api/Time/current/zone?timeZone=UTC",
    parse: d => new Date(d.dateTime + "Z").getTime()
  } ];
  for (const {url: url, parse: parse} of endpoints) {
    try {
      const t0 = Date.now();
      const res = await fetch(url, {
        cache: "no-store"
      });
      const t1 = Date.now();
      if (!res.ok) continue;
      const data = await res.json();
      const serverMs = parse(data);
      if (!Number.isFinite(serverMs)) continue;
      const roundTrip = t1 - t0;
      internetClockOffsetMs = serverMs + roundTrip / 2 - t1;
      return true;
    } catch (err) {}
  }
  return false;
}

function syncedNow_() {
  return Date.now() + internetClockOffsetMs;
}

syncInternetClock_();

setInterval(syncInternetClock_, 5 * 60 * 1e3);

function slugifyForLanEmail_(name) {
  const base = (name || "jugador").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, ".").replace(/^\.+|\.+$/g, "");
  return (base || "jugador") + "@lan.local";
}

async function connectLan(hostAddr, room, displayName, isHost) {
  const statusEl = document.getElementById("lan-connect-status");
  if (statusEl) {
    statusEl.textContent = "Conectando…";
    statusEl.classList.remove("correct");
  }
  try {
    if (!displayName) throw new Error("Ingresá tu nombre primero");
    if (!window.LAN) throw new Error("No se cargó lan-shim.js (revisá el <script> en index.html)");
    const addr = (hostAddr || "").trim().replace(/^wss?:\/\//, "").replace(/\/+$/, "");
    if (!addr) throw new Error("Ingresá la dirección del anfitrión (ej: 192.168.0.15:8080)");
    if (lanClient_) {
      lanClient_.close();
      lanClient_ = null;
    }
    const roomName = room || "main";
    const {client: client, db: db} = await window.LAN.connect("ws://" + addr, roomName, displayName);
    lanClient_ = client;
    connectionMode = "lan";
    fbDb = db;
    fbRoomRef = fbDb.collection("torneos").doc(roomName);
    gamesCollectionRef = fbRoomRef.collection("games");
    announcementsCollectionRef = fbRoomRef.collection("announcements");
    subscribedRound_ = undefined;
    lastRoundGames = [];
    currentUser = {
      email: isHost ? TOURNAMENT_ADMIN_EMAIL : slugifyForLanEmail_(displayName),
      displayName: displayName
    };
    setTournamentRoom(roomName);
    document.getElementById("tournament-auth-box").style.display = "";
    const lanBox = document.getElementById("tournament-lan-box");
    if (lanBox) lanBox.style.display = "none";
    const modeSelect = document.getElementById("tournament-mode-select");
    if (modeSelect) modeSelect.style.display = "none";
    updateAuthUI();
    subscribeTournament();
    subscribeAnnouncements();
    if (statusEl) statusEl.textContent = "";
    toast(isHost ? "🖥️ Conectado como anfitrión (red local)" : "📲 Conectado a la sala LAN");
  } catch (err) {
    if (statusEl) statusEl.textContent = "❌ " + err.message;
  }
}

let authListenerAttached = false;

const TOURNAMENT_REFEREE_EMAIL = "josepantaleo@gmail.com";

function isCurrentUserReferee() {
  return !!currentUser && currentUser.email === TOURNAMENT_REFEREE_EMAIL;
}

function assertReferee() {
  if (!isCurrentUserReferee()) {
    throw new Error("Esta acción es exclusiva del árbitro del torneo");
  }
}

function getFirebaseConfig() {
  const raw = localStorage.getItem(FB_CONFIG_KEY) || "";
  if (!raw) return DEFAULT_FIREBASE_CONFIG;
  try {
    return JSON.parse(raw) || DEFAULT_FIREBASE_CONFIG;
  } catch (err) {
    return DEFAULT_FIREBASE_CONFIG;
  }
}

function setFirebaseConfig(cfg) {
  localStorage.setItem(FB_CONFIG_KEY, JSON.stringify(cfg));
}

function getTournamentRoom() {
  return localStorage.getItem(FB_ROOM_KEY) || "main";
}

function setTournamentRoom(room) {
  localStorage.setItem(FB_ROOM_KEY, room || "main");
}

function parseFirebaseConfigInput(text) {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Pegá la configuración de Firebase");
  const match = trimmed.match(/\{[\s\S]*\}/);
  let objText = match ? match[0] : trimmed;
  try {
    return JSON.parse(objText);
  } catch (err) {
    objText = objText.replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)(\s*:)/g, '$1"$2"$3');
    objText = objText.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_, inner) => JSON.stringify(inner));
    objText = objText.replace(/,(\s*[}\]])/g, "$1");
    try {
      return JSON.parse(objText);
    } catch (err2) {
      throw new Error("No se pudo interpretar la configuración de Firebase. Pegala en formato JSON (con comillas en las claves).");
    }
  }
}

function normalizeTournamentState(data) {
  const defaults = {
    name: "",
    round: 0,
    status: "setup",
    adminEmails: [],
    totalRounds: null,
    roundStatus: "playing",
    roundApprovalMode: "manual",
    pendingApprovalAt: null,
    autoApprovalCancelled: false,
    woGraceMinutes: 0,
    roundCountdownSetAt: null,
    roundCountdownMs: null
  };
  if (!data) {
    return {
      meta: {
        ...defaults
      },
      players: [],
      pairings: []
    };
  }
  return {
    meta: Object.assign({
      ...defaults
    }, data.meta || {}),
    players: data.players || [],
    pairings: data.pairings || []
  };
}

function connectFirebase(config, room) {
  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(config);
    }
    fbDb = firebase.firestore();
  } catch (err) {
    throw new Error("Configuración de Firebase inválida: " + err.message);
  }
  fbRoomRef = fbDb.collection("torneos").doc(room || "main");
  gamesCollectionRef = fbRoomRef.collection("games");
  announcementsCollectionRef = fbRoomRef.collection("announcements");
  subscribedRound_ = undefined;
  lastRoundGames = [];
  document.getElementById("tournament-auth-box").style.display = "";
  const modeSelectEl_ = document.getElementById("tournament-mode-select");
  if (modeSelectEl_) modeSelectEl_.style.display = "none";
  const lanBoxEl_ = document.getElementById("tournament-lan-box");
  if (lanBoxEl_) lanBoxEl_.style.display = "none";
  if (!authListenerAttached) {
    authListenerAttached = true;
    firebase.auth().onAuthStateChanged(user => {
      if (connectionMode === "lan") return;
      currentUser = user ? {
        email: (user.email || "").toLowerCase(),
        displayName: user.displayName || user.email
      } : null;
      updateAuthUI();
      renderTournamentState(lastTournamentState);
    });
  }
  subscribeTournament();
  subscribeAnnouncements();
}

function updateAuthUI() {
  const statusEl = document.getElementById("tournament-auth-status");
  const signinBtn = document.getElementById("tournament-google-signin-btn");
  const signoutBtn = document.getElementById("tournament-signout-btn");
  if (currentUser) {
    statusEl.textContent = connectionMode === "lan" ? `Conectado como ${currentUser.displayName} — 📶 red local (sin internet)` : `Conectado como ${currentUser.displayName} (${currentUser.email})`;
    signinBtn.style.display = "none";
    signoutBtn.style.display = "";
  } else {
    statusEl.textContent = "Iniciá sesión con tu cuenta de Gmail para jugar o administrar el torneo.";
    signinBtn.style.display = connectionMode === "lan" ? "none" : "";
    signoutBtn.style.display = "none";
  }
  updateModeBadge();
  updateConfigAccountUI_();
}

function updateConfigAccountUI_() {
  const statusEl = document.getElementById("config-account-status");
  const signoutBtn = document.getElementById("config-signout-btn");
  if (!statusEl || !signoutBtn) return;
  if (currentUser) {
    statusEl.textContent = `Conectado como ${currentUser.displayName} (${currentUser.email})`;
    signoutBtn.style.display = "";
  } else {
    statusEl.textContent = 'Todavía no iniciaste sesión con Gmail. Entrá a "Torneo" para hacerlo.';
    signoutBtn.style.display = "none";
  }
}

function isCurrentUserAdmin(state) {
  if (!currentUser) return false;
  return currentUser.email === TOURNAMENT_ADMIN_EMAIL;
}

function isBootstrapping(state) {
  return false;
}

function assertAdmin() {
  if (!isCurrentUserAdmin(lastTournamentState)) {
    throw new Error("Necesitás ser administrador de este torneo para hacer esto");
  }
}

function updateModeBadge() {
  const badges = [ document.getElementById("tournament-mode-badge"), document.getElementById("tournament-mode-badge-active") ];
  if (!currentUser) {
    badges.forEach(b => b && (b.style.display = "none"));
    return;
  }
  const admin = isCurrentUserAdmin(lastTournamentState);
  const referee = isCurrentUserReferee();
  const text = referee ? "🧑‍⚖️ Modo Árbitro" : admin ? "🛠️ Modo Administrador" : "👤 Modo Jugador";
  badges.forEach(b => {
    if (!b) return;
    b.textContent = text;
    b.style.display = "";
  });
}

function subscribeRoundGames(round) {
  if (subscribedRound_ === round && (gamesRoundUnsub || round == null)) return;
  if (gamesRoundUnsub) {
    gamesRoundUnsub();
    gamesRoundUnsub = null;
  }
  subscribedRound_ = round;
  if (!gamesCollectionRef || round == null) {
    lastRoundGames = [];
    return;
  }
  gamesRoundUnsub = gamesCollectionRef.where("round", "==", round).onSnapshot(qsnap => {
    lastRoundGames = qsnap.docs.map(d => d.data());
    if (!tournamentMatchActive) {
      renderTournamentState(lastTournamentState);
    }
    refreshPublicScreenActiveMiniBoard_();
    renderPublicScreenZoomBoard_();
    handleLiveMatchUpdate(lastTournamentState);
  }, () => {});
}

function closeActiveMatchOnTournamentChange_(reason) {
  if (!tournamentMatchActive) return;
  closeAlert_();
  toast(reason);
  exitTournamentMatch();
}

function subscribeTournament() {
  if (tournamentUnsub) {
    tournamentUnsub();
    tournamentUnsub = null;
  }
  const statusEl = document.getElementById("tournament-connect-status");
  tournamentUnsub = fbRoomRef.onSnapshot(snap => {
    statusEl.textContent = "✓ Conectado.";
    statusEl.classList.add("correct");
    if (PERF_DEBUG && snap.exists) {
      const __raw = snap.data();
      const __bytes = JSON.stringify(__raw).length;
      console.log(`[perf] room snapshot ~${(__bytes / 1024).toFixed(1)}KB | pairings=${(__raw.pairings || []).length} players=${(__raw.players || []).length}`);
    }
    const state = normalizeTournamentState(snap.exists ? snap.data() : null);
    if (!snap.metadata.hasPendingWrites) {
      const setAt = state.meta.roundCountdownSetAt;
      if (setAt && typeof setAt.toMillis === "function") {
        countdownClockOffsetMs_ = setAt.toMillis() - Date.now();
      }
    }
    const previousStatus = lastKnownTournamentStatus_;
    lastKnownTournamentStatus_ = state.meta.status;
    lastTournamentState = state;
    const hasActiveOrFinishedRound = state.meta.status === "active" || state.meta.status === "finished";
    subscribeRoundGames(hasActiveOrFinishedRound ? state.meta.round : null);
    if (!tournamentMatchActive) {
      renderTournamentState(state);
      if (typeof renderPublicScreen === "function") renderPublicScreen(state);
    }
    handleLiveMatchUpdate(state);
    if (previousStatus !== null && previousStatus !== state.meta.status) {
      if (state.meta.status === "finished") {
        closeActiveMatchOnTournamentChange_("🏁 El administrador finalizó el torneo.");
      } else if (state.meta.status === "setup") {
        closeActiveMatchOnTournamentChange_("🔄 El administrador reinició el torneo.");
      }
    }
  }, err => {
    statusEl.textContent = "❌ No se pudo conectar: " + err.message;
    statusEl.classList.remove("correct");
  });
}

async function getTournamentStateOnce() {
  const snap = await fbRoomRef.get();
  return normalizeTournamentState(snap.exists ? snap.data() : null);
}

function parsePlayersInput(text) {
  return text.split("\n").map(line => line.trim()).filter(Boolean).map(line => {
    const parts = line.split(",");
    const name = (parts[0] || "").trim();
    const email = (parts.slice(1).join(",") || "").trim().toLowerCase();
    return {
      name: name,
      email: email
    };
  }).filter(p => p.name);
}

function applyResultToPlayers_(white, black, result, sign) {
  if (!white || !black || !result) return;
  if (result === "1-0" || result === "wo-black") white.points += 1 * sign; else if (result === "0-1" || result === "wo-white") black.points += 1 * sign; else if (result === "1/2-1/2") {
    white.points += .5 * sign;
    black.points += .5 * sign;
  }
}

async function fbCreateTournament(name, playerEntries, totalRounds, adminEmails, timeControl, roundApprovalMode, woGraceMinutes) {
  if (!isBootstrapping(lastTournamentState)) assertAdmin();
  const seenEmails = new Set;
  for (const p of playerEntries) {
    if (!p.name) continue;
    const email = (p.email || "").toLowerCase().trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`El email "${p.email}" de ${p.name} no parece válido`);
    }
    if (email) {
      if (seenEmails.has(email)) throw new Error(`El email ${email} está repetido entre los jugadores`);
      seenEmails.add(email);
    }
  }
  const players = playerEntries.filter(p => p.name).map((p, i) => ({
    id: "p" + (i + 1),
    name: p.name,
    email: (p.email || "").toLowerCase(),
    points: 0,
    played: [],
    byes: 0,
    colorBalance: 0,
    status: "active"
  }));
  const rounds = Number(totalRounds);
  const tc = timeControl || {
    minutes: 0,
    increment: 0
  };
  await fbRoomRef.set({
    meta: {
      name: name || "Torneo",
      round: 0,
      status: "active",
      roundStatus: "playing",
      roundApprovalMode: roundApprovalMode === "auto" ? "auto" : "manual",
      pendingApprovalAt: null,
      autoApprovalCancelled: false,
      totalRounds: rounds > 0 ? rounds : null,
      adminEmails: [ TOURNAMENT_ADMIN_EMAIL ],
      timeControlMinutes: tc.minutes > 0 ? tc.minutes : 0,
      timeControlIncrement: tc.increment > 0 ? tc.increment : 0,
      woGraceMinutes: Number(woGraceMinutes) > 0 ? Number(woGraceMinutes) : 0
    },
    players: players,
    pairings: []
  });
  return getTournamentStateOnce();
}

function validatePlayerNameEmail_(name, email) {
  name = (name || "").trim();
  email = (email || "").trim().toLowerCase();
  if (!name) throw new Error("El nombre no puede estar vacío");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`El email "${email}" no parece válido`);
  }
  return {
    name: name,
    email: email
  };
}

async function fbAddPlayer(rawName, rawEmail) {
  assertAdmin();
  const {name: name, email: email} = validatePlayerNameEmail_(rawName, rawEmail);
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = data.players || [];
    if (email && players.some(p => (p.email || "").toLowerCase() === email)) {
      throw new Error(`Ya hay un jugador con el email ${email}`);
    }
    let n = players.length + 1;
    const usedIds = new Set(players.map(p => p.id));
    while (usedIds.has("p" + n)) n++;
    const newPlayer = {
      id: "p" + n,
      name: name,
      email: email,
      points: 0,
      played: [],
      byes: 0,
      colorBalance: 0,
      status: "active"
    };
    tx.update(fbRoomRef, {
      players: players.concat([ newPlayer ])
    });
  });
  return getTournamentStateOnce();
}

async function fbSelfRegister(rawName) {
  if (!currentUser) throw new Error("Iniciá sesión con Google primero");
  const name = (rawName || "").trim() || currentUser.displayName;
  if (!name) throw new Error("Ingresá tu nombre");
  const email = currentUser.email;
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no se creó el torneo");
    const data = snap.data();
    if (data.meta && data.meta.status === "finished") {
      throw new Error("El torneo ya finalizó, no se puede inscribir");
    }
    const players = data.players || [];
    if (players.some(p => (p.email || "").toLowerCase() === email)) {
      throw new Error("Ya estás inscripto en este torneo");
    }
    let n = players.length + 1;
    const usedIds = new Set(players.map(p => p.id));
    while (usedIds.has("p" + n)) n++;
    const newPlayer = {
      id: "p" + n,
      name: name,
      email: email,
      points: 0,
      played: [],
      byes: 0,
      colorBalance: 0,
      status: "pending"
    };
    tx.update(fbRoomRef, {
      players: players.concat([ newPlayer ])
    });
  });
  return getTournamentStateOnce();
}

async function fbApproveRegistration(playerId) {
  assertAdmin();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = data.players || [];
    const idx = players.findIndex(p => p.id === playerId);
    if (idx === -1) throw new Error("No se encontró esa inscripción");
    if (players[idx].status !== "pending") {
      throw new Error("Esta inscripción ya fue procesada");
    }
    const updated = players.slice();
    updated[idx] = {
      ...updated[idx],
      status: "active"
    };
    tx.update(fbRoomRef, {
      players: updated
    });
  });
  return getTournamentStateOnce();
}

async function fbRejectRegistration(playerId) {
  assertAdmin();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = data.players || [];
    const idx = players.findIndex(p => p.id === playerId);
    if (idx === -1) throw new Error("No se encontró esa inscripción");
    if (players[idx].status !== "pending") {
      throw new Error("Esta inscripción ya fue procesada");
    }
    tx.update(fbRoomRef, {
      players: players.filter(p => p.id !== playerId)
    });
  });
  return getTournamentStateOnce();
}

async function fbApproveAllRegistrations() {
  assertAdmin();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = data.players || [];
    const pending = players.filter(p => p.status === "pending");
    if (pending.length === 0) throw new Error("No hay inscripciones pendientes");
    const updated = players.map(p => p.status === "pending" ? {
      ...p,
      status: "active"
    } : p);
    tx.update(fbRoomRef, {
      players: updated
    });
  });
  return getTournamentStateOnce();
}

async function fbRejectAllRegistrations() {
  assertAdmin();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = data.players || [];
    const pending = players.filter(p => p.status === "pending");
    if (pending.length === 0) throw new Error("No hay inscripciones pendientes");
    tx.update(fbRoomRef, {
      players: players.filter(p => p.status !== "pending")
    });
  });
  return getTournamentStateOnce();
}

async function fbEditPlayer(playerId, rawName, rawEmail) {
  assertAdmin();
  const {name: name, email: email} = validatePlayerNameEmail_(rawName, rawEmail);
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = data.players || [];
    const idx = players.findIndex(p => p.id === playerId);
    if (idx === -1) throw new Error("No se encontró ese jugador");
    if (email && players.some((p, i) => i !== idx && (p.email || "").toLowerCase() === email)) {
      throw new Error(`Ya hay otro jugador con el email ${email}`);
    }
    const updatedPlayers = players.slice();
    updatedPlayers[idx] = {
      ...updatedPlayers[idx],
      name: name,
      email: email
    };
    const pairings = (data.pairings || []).map(pr => {
      const copy = {
        ...pr
      };
      if (copy.whiteId === playerId) {
        copy.whiteName = name;
        copy.whiteEmail = email;
      }
      if (copy.blackId === playerId) {
        copy.blackName = name;
        copy.blackEmail = email;
      }
      return copy;
    });
    tx.update(fbRoomRef, {
      players: updatedPlayers,
      pairings: pairings
    });
  });
  return getTournamentStateOnce();
}

async function fbDeletePlayer(playerId) {
  assertAdmin();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = data.players || [];
    const player = players.find(p => p.id === playerId);
    if (!player) throw new Error("No se encontró ese jugador");
    const pairings = data.pairings || [];
    const hasHistory = pairings.some(pr => pr.whiteId === playerId || pr.blackId === playerId);
    if (hasHistory) {
      throw new Error("Este jugador ya tiene partidas emparejadas: para sacarlo sin perder el historial usá 'Retirar jugador' en vez de eliminarlo.");
    }
    tx.update(fbRoomRef, {
      players: players.filter(p => p.id !== playerId)
    });
  });
  return getTournamentStateOnce();
}

async function fbWithdrawPlayer(playerId) {
  assertReferee();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = data.players || [];
    const idx = players.findIndex(p => p.id === playerId);
    if (idx === -1) throw new Error("No se encontró ese jugador");
    if (players[idx].status === "disqualified") {
      throw new Error("Este jugador está descalificado, no se puede retirar");
    }
    const updated = players.slice();
    updated[idx] = {
      ...updated[idx],
      status: "withdrawn"
    };
    tx.update(fbRoomRef, {
      players: updated
    });
  });
  return getTournamentStateOnce();
}

async function fbReactivatePlayer(playerId) {
  assertReferee();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = data.players || [];
    const idx = players.findIndex(p => p.id === playerId);
    if (idx === -1) throw new Error("No se encontró ese jugador");
    if (players[idx].status === "disqualified") {
      throw new Error("Un jugador descalificado no puede reincorporarse");
    }
    const updated = players.slice();
    updated[idx] = {
      ...updated[idx],
      status: "active"
    };
    tx.update(fbRoomRef, {
      players: updated
    });
  });
  return getTournamentStateOnce();
}

async function fbDisqualifyPlayer(playerId) {
  assertReferee();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = data.players || [];
    const idx = players.findIndex(p => p.id === playerId);
    if (idx === -1) throw new Error("No se encontró ese jugador");
    const updated = players.slice();
    updated[idx] = {
      ...updated[idx],
      status: "disqualified"
    };
    tx.update(fbRoomRef, {
      players: updated
    });
  });
  return getTournamentStateOnce();
}

function buildNextRoundPairings_(players, currentRound, timeControl, pairingsForTiebreak, forcedByeId) {
  const nextRound = currentRound + 1;
  const activePlayers = players.filter(p => (p.status || "active") === "active");
  let pool = pairingsForTiebreak ? rankPlayers_(activePlayers, pairingsForTiebreak) : activePlayers.slice();
  pool = pool.slice().sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (pairingsForTiebreak && (b._buchholz || 0) !== (a._buchholz || 0)) return (b._buchholz || 0) - (a._buchholz || 0);
    if (pairingsForTiebreak) return a.name.localeCompare(b.name);
    return a.id < b.id ? -1 : 1;
  });
  let byePlayer = null;
  if (pool.length % 2 === 1) {
    if (forcedByeId) {
      byePlayer = pool.find(p => p.id === forcedByeId) || null;
    }
    if (!byePlayer) {
      for (let i = pool.length - 1; i >= 0; i--) {
        if (pool[i].byes === 0) {
          byePlayer = pool[i];
          break;
        }
      }
      if (!byePlayer) byePlayer = pool[pool.length - 1];
    }
    pool = pool.filter(p => p.id !== byePlayer.id);
  }
  let unpaired = pool.slice();
  const newPairings = [];
  const colorBalanceById = {};
  players.forEach(p => colorBalanceById[p.id] = p.colorBalance || 0);
  let board = 1;
  while (unpaired.length > 0) {
    const p1 = unpaired.shift();
    let idx = unpaired.findIndex(p => p1.played.indexOf(p.id) === -1);
    if (idx === -1) idx = 0;
    const p2 = unpaired.splice(idx, 1)[0];
    const bal1 = colorBalanceById[p1.id] || 0;
    const bal2 = colorBalanceById[p2.id] || 0;
    const p1GetsWhite = bal1 <= bal2;
    const white = p1GetsWhite ? p1 : p2;
    const black = p1GetsWhite ? p2 : p1;
    colorBalanceById[white.id] = (colorBalanceById[white.id] || 0) + 1;
    colorBalanceById[black.id] = (colorBalanceById[black.id] || 0) - 1;
    newPairings.push({
      round: nextRound,
      board: board++,
      whiteId: white.id,
      whiteName: white.name,
      whiteEmail: white.email || "",
      blackId: black.id,
      blackName: black.name,
      blackEmail: black.email || "",
      result: ""
    });
  }
  if (byePlayer) {
    newPairings.push({
      round: nextRound,
      board: board++,
      whiteId: byePlayer.id,
      whiteName: byePlayer.name,
      whiteEmail: byePlayer.email || "",
      blackId: "",
      blackName: "BYE",
      blackEmail: "",
      result: "1-0"
    });
    byePlayer.points += 1;
    byePlayer.byes += 1;
  }
  const updatedPlayers = players.map(p => {
    if (byePlayer && p.id === byePlayer.id) {
      return {
        ...p,
        points: byePlayer.points,
        byes: byePlayer.byes,
        colorBalance: colorBalanceById[p.id] || 0
      };
    }
    return {
      ...p,
      colorBalance: colorBalanceById[p.id] || 0
    };
  });
  const minutes = timeControl && timeControl.minutes || 0;
  const increment = timeControl && timeControl.increment || 0;
  const newGames = newPairings.filter(p => p.blackId !== "").map(p => ({
    round: p.round,
    board: p.board,
    fen: START_FEN_TOURNEY,
    lastMoveSan: "",
    status: "ongoing",
    clock: minutes > 0 ? {
      w: minutes * 60,
      b: minutes * 60
    } : null,
    turnStartAt: null,
    increment: increment,
    joined: {
      w: false,
      b: false
    },
    startedAt: Date.now()
  }));
  return {
    nextRound: nextRound,
    newPairings: newPairings,
    updatedPlayers: updatedPlayers,
    newGames: newGames
  };
}

async function fbGenerateRound() {
  assertAdmin();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = (data.players || []).map(p => ({
      ...p,
      played: (p.played || []).slice()
    }));
    if (players.length < 2) throw new Error("Hacen falta al menos 2 jugadores");
    const pairingsAll = (data.pairings || []).map(p => ({
      ...p
    }));
    const currentRound = data.meta && data.meta.round || 0;
    const totalRounds = data.meta && data.meta.totalRounds;
    if (data.meta && data.meta.status === "finished") {
      throw new Error("El torneo ya está finalizado. Reabrilo si querés jugar otra ronda.");
    }
    if (totalRounds && currentRound >= totalRounds) {
      throw new Error("El torneo ya jugó las " + totalRounds + " rondas configuradas.");
    }
    const pending = pairingsAll.filter(p => p.round === currentRound && !p.result);
    if (currentRound > 0 && pending.length > 0) {
      throw new Error("Todavía hay partidas de la ronda " + currentRound + " sin resultado cargado");
    }
    if (currentRound > 0) {
      throw new Error('A partir de la ronda 1, usá el botón "Aprobar ronda" para generar la próxima.');
    }
    const timeControl = {
      minutes: data.meta && data.meta.timeControlMinutes || 0,
      increment: data.meta && data.meta.timeControlIncrement || 0
    };
    const {nextRound: nextRound, newPairings: newPairings, updatedPlayers: updatedPlayers, newGames: newGames} = buildNextRoundPairings_(players, currentRound, timeControl, pairingsAll);
    tx.set(fbRoomRef, {
      meta: {
        name: data.meta.name,
        round: nextRound,
        status: "active",
        roundStatus: "playing",
        roundApprovalMode: data.meta.roundApprovalMode === "auto" ? "auto" : "manual",
        pendingApprovalAt: null,
        autoApprovalCancelled: false,
        totalRounds: totalRounds || null,
        adminEmails: data.meta.adminEmails || [],
        timeControlMinutes: timeControl.minutes,
        timeControlIncrement: timeControl.increment,
        woGraceMinutes: data.meta && data.meta.woGraceMinutes || 0
      },
      players: updatedPlayers,
      pairings: pairingsAll.concat(newPairings)
    });
    newGames.forEach(g => tx.set(gamesCollectionRef.doc(gameDocId_(g.round, g.board)), g));
  });
  return getTournamentStateOnce();
}

async function fbApproveRound() {
  assertAdmin();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const meta = {
      ...data.meta
    };
    if (meta.status !== "active" || meta.roundStatus !== "pending_approval") {
      throw new Error("No hay ninguna ronda pendiente de aprobación en este momento");
    }
    const players = (data.players || []).map(p => ({
      ...p,
      played: (p.played || []).slice()
    }));
    const pairingsAll = (data.pairings || []).map(p => ({
      ...p
    }));
    const roundPairings = pairingsAll.filter(p => p.round === meta.round);
    const pending = roundPairings.filter(p => !p.result);
    if (pending.length > 0) {
      throw new Error("Todavía hay partidas de esta ronda sin resultado cargado");
    }
    const timeControl = {
      minutes: meta.timeControlMinutes || 0,
      increment: meta.timeControlIncrement || 0
    };
    const {nextRound: nextRound, newPairings: newPairings, updatedPlayers: updatedPlayers, newGames: newGames} = buildNextRoundPairings_(players, meta.round, timeControl, pairingsAll);
    meta.round = nextRound;
    meta.roundStatus = "playing";
    meta.pendingApprovalAt = null;
    meta.autoApprovalCancelled = false;
    tx.update(fbRoomRef, {
      meta: meta,
      players: updatedPlayers,
      pairings: pairingsAll.concat(newPairings)
    });
    newGames.forEach(g => tx.set(gamesCollectionRef.doc(gameDocId_(g.round, g.board)), g));
  });
  return getTournamentStateOnce();
}

async function fbCancelAutoApproval() {
  assertAdmin();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    if (data.meta.roundStatus !== "pending_approval") return;
    tx.update(fbRoomRef, {
      meta: {
        ...data.meta,
        autoApprovalCancelled: true
      }
    });
  });
  return getTournamentStateOnce();
}

async function fbCloseRound() {
  assertReferee();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const meta = {
      ...data.meta
    };
    if (meta.status !== "active" || meta.roundStatus !== "pending_approval") {
      throw new Error("Solo se puede cerrar una ronda que ya tiene todos los resultados cargados");
    }
    const pairings = (data.pairings || []).map(p => p.round === meta.round ? {
      ...p,
      locked: true
    } : p);
    meta.roundStatus = "closed";
    tx.update(fbRoomRef, {
      meta: meta,
      pairings: pairings
    });
  });
  return getTournamentStateOnce();
}

async function fbGenerateRoundFromClosed(forcedByeId) {
  assertReferee();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const meta = {
      ...data.meta
    };
    if (meta.status !== "active" || meta.roundStatus !== "closed") {
      throw new Error('Primero hay que "Cerrar ronda" antes de generar la próxima');
    }
    const players = (data.players || []).map(p => ({
      ...p,
      played: (p.played || []).slice()
    }));
    const pairingsAll = (data.pairings || []).map(p => ({
      ...p
    }));
    if (forcedByeId) {
      const activeCount = players.filter(p => (p.status || "active") === "active").length;
      if (activeCount % 2 === 0) {
        throw new Error("No hace falta asignar BYE: la cantidad de jugadores activos es par");
      }
      const candidate = players.find(p => p.id === forcedByeId && (p.status || "active") === "active");
      if (!candidate) throw new Error("El jugador elegido para el BYE no está activo en el torneo");
    }
    const timeControl = {
      minutes: meta.timeControlMinutes || 0,
      increment: meta.timeControlIncrement || 0
    };
    const {nextRound: nextRound, newPairings: newPairings, updatedPlayers: updatedPlayers, newGames: newGames} = buildNextRoundPairings_(players, meta.round, timeControl, pairingsAll, forcedByeId || undefined);
    meta.round = nextRound;
    meta.roundStatus = "playing";
    meta.pendingApprovalAt = null;
    meta.autoApprovalCancelled = false;
    tx.update(fbRoomRef, {
      meta: meta,
      players: updatedPlayers,
      pairings: pairingsAll.concat(newPairings)
    });
    newGames.forEach(g => tx.set(gamesCollectionRef.doc(gameDocId_(g.round, g.board)), g));
  });
  return getTournamentStateOnce();
}

async function fbSetGameSuspended(round, board, suspended) {
  assertReferee();
  round = Number(round);
  board = Number(board);
  const gameDocRef = gamesCollectionRef.doc(gameDocId_(round, board));
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(gameDocRef);
    if (!snap.exists) throw new Error("No se encontró esa partida");
    const g = {
      ...snap.data()
    };
    if (g.status === "finished") throw new Error("Esa partida ya terminó, no se puede suspender");
    g.status = suspended ? "suspended" : "ongoing";
    if (!suspended && g.clock && g.turnStartAt) g.turnStartAt = srvTimestamp();
    tx.update(gameDocRef, g);
  });
  return getTournamentStateOnce();
}

async function fbAutoDeclareForfeits() {
  assertReferee();
  const meta = lastTournamentState && lastTournamentState.meta;
  if (!meta) return [];
  const graceMinutes = Number(meta.woGraceMinutes) || 0;
  if (!graceMinutes || meta.status !== "active" || meta.roundStatus !== "playing") return [];
  const graceMs = graceMinutes * 6e4;
  const now = Date.now();
  const qsnap = await gamesCollectionRef.where("round", "==", meta.round).get();
  const candidates = qsnap.docs.map(d => ({
    ref: d.ref,
    data: d.data()
  })).filter(({data: g}) => {
    if (g.status !== "ongoing" || !g.startedAt) return false;
    if (now - g.startedAt < graceMs) return false;
    const joined = g.joined || {
      w: false,
      b: false
    };
    return joined.w !== joined.b;
  });
  if (candidates.length === 0) return [];
  const declared = [];
  for (const {ref: ref} of candidates) {
    try {
      await fbDb.runTransaction(async tx => {
        const snap = await tx.get(ref);
        if (!snap.exists) return;
        const g = {
          ...snap.data()
        };
        if (g.status !== "ongoing" || !g.startedAt || now - g.startedAt < graceMs) return;
        const joined = g.joined || {
          w: false,
          b: false
        };
        if (joined.w === joined.b) return;
        g.status = "finished";
        g.resultReason = "wo-auto";
        g._woWinnerIsWhite = joined.w;
        tx.update(ref, {
          status: g.status,
          resultReason: g.resultReason
        });
        declared.push({
          round: g.round,
          board: g.board,
          whiteJoined: joined.w
        });
      });
    } catch (err) {}
  }
  if (declared.length === 0) return [];
  const results = [];
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) return;
    const data = snap.data();
    const meta2 = {
      ...data.meta
    };
    const players = (data.players || []).map(p => ({
      ...p,
      played: (p.played || []).slice()
    }));
    const byId = {};
    players.forEach(p => byId[p.id] = p);
    const pairings = (data.pairings || []).map(p => ({
      ...p
    }));
    declared.forEach(d => {
      const pr = pairings.find(p => p.round === d.round && p.board === d.board);
      if (!pr || pr.result) return;
      const white = byId[pr.whiteId];
      const black = byId[pr.blackId];
      if (!white || !black) return;
      const result = d.whiteJoined ? "wo-black" : "wo-white";
      applyResultToPlayers_(white, black, result, 1);
      pr.result = result;
      if (white.played.indexOf(black.id) === -1) white.played.push(black.id);
      if (black.played.indexOf(white.id) === -1) black.played.push(white.id);
      results.push({
        board: pr.board,
        winner: d.whiteJoined ? white.name : black.name,
        absent: d.whiteJoined ? black.name : white.name
      });
    });
    if (results.length === 0) return;
    const roundPairings = pairings.filter(p => p.round === meta2.round);
    const allDone = roundPairings.every(p => p.result);
    if (allDone) {
      const totalRounds = meta2.totalRounds;
      if (totalRounds && meta2.round >= totalRounds) {
        meta2.status = "finished";
        meta2.roundStatus = "playing";
      } else {
        meta2.roundStatus = "pending_approval";
        meta2.pendingApprovalAt = Date.now();
        meta2.autoApprovalCancelled = false;
      }
    }
    tx.update(fbRoomRef, {
      players: players,
      pairings: pairings,
      meta: meta2
    });
  });
  return results;
}

async function fbSubmitResult(round, board, result) {
  round = Number(round);
  board = Number(board);
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = (data.players || []).map(p => ({
      ...p,
      played: (p.played || []).slice()
    }));
    const byId = {};
    players.forEach(p => byId[p.id] = p);
    const pairings = (data.pairings || []).map(p => ({
      ...p
    }));
    const target = pairings.find(p => p.round === round && p.board === board);
    if (!target) throw new Error("No se encontró esa partida");
    if (target.blackId === "") throw new Error("Esa fila es un BYE, no se puede cambiar");
    const myEmail = currentUser ? currentUser.email : "";
    const isParticipant = myEmail && ((target.whiteEmail || "").toLowerCase() === myEmail || (target.blackEmail || "").toLowerCase() === myEmail);
    if (!isCurrentUserAdmin(lastTournamentState) && !isCurrentUserReferee() && !isParticipant) {
      throw new Error("No tenés permiso para cargar el resultado de esta partida");
    }
    if (target.locked && !isCurrentUserReferee()) {
      throw new Error("Esta ronda ya fue cerrada por el árbitro; solo el árbitro puede corregir resultados de una ronda cerrada");
    }
    applyResultToPlayers_(byId[target.whiteId], byId[target.blackId], target.result, -1);
    target.result = result;
    applyResultToPlayers_(byId[target.whiteId], byId[target.blackId], result, 1);
    if (byId[target.whiteId].played.indexOf(target.blackId) === -1) {
      byId[target.whiteId].played.push(target.blackId);
    }
    if (byId[target.blackId].played.indexOf(target.whiteId) === -1) {
      byId[target.blackId].played.push(target.whiteId);
    }
    let gameDocRef = null;
    let gameUpdate = null;
    if (result === "wo-white" || result === "wo-black") {
      gameDocRef = gamesCollectionRef.doc(gameDocId_(round, board));
      const gSnap = await tx.get(gameDocRef);
      if (gSnap.exists) {
        gameUpdate = {
          status: "finished",
          resultReason: "wo"
        };
      }
    }
    const meta = {
      ...data.meta
    };
    const totalRounds = meta.totalRounds;
    if (meta.status === "active" && meta.roundStatus !== "pending_approval" && meta.roundStatus !== "closed") {
      const roundPairings = pairings.filter(p => p.round === meta.round);
      const allDone = roundPairings.every(p => p.result);
      if (allDone) {
        if (totalRounds && meta.round >= totalRounds) {
          meta.status = "finished";
          meta.roundStatus = "playing";
        } else {
          meta.roundStatus = "pending_approval";
          meta.pendingApprovalAt = Date.now();
          meta.autoApprovalCancelled = false;
        }
      }
    }
    tx.update(fbRoomRef, {
      players: players,
      pairings: pairings,
      meta: meta
    });
    if (gameDocRef && gameUpdate) tx.update(gameDocRef, gameUpdate);
  });
  return getTournamentStateOnce();
}

async function fbFinishTournament() {
  assertAdmin();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    tx.update(fbRoomRef, {
      meta: {
        ...data.meta,
        status: "finished"
      }
    });
  });
  return getTournamentStateOnce();
}

async function fbReopenTournament() {
  assertAdmin();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    tx.update(fbRoomRef, {
      meta: {
        ...data.meta,
        status: "active"
      }
    });
  });
  return getTournamentStateOnce();
}

async function fbUpdateSettings(name, totalRounds, adminEmails, timeControl, roundApprovalMode, woGraceMinutes) {
  assertAdmin();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const tc = timeControl || {
      minutes: data.meta.timeControlMinutes || 0,
      increment: data.meta.timeControlIncrement || 0
    };
    tx.update(fbRoomRef, {
      meta: {
        ...data.meta,
        name: name || data.meta.name,
        totalRounds: totalRounds || null,
        adminEmails: [ TOURNAMENT_ADMIN_EMAIL ],
        timeControlMinutes: tc.minutes > 0 ? tc.minutes : 0,
        timeControlIncrement: tc.increment > 0 ? tc.increment : 0,
        roundApprovalMode: roundApprovalMode === "auto" ? "auto" : "manual",
        woGraceMinutes: woGraceMinutes === undefined ? data.meta.woGraceMinutes || 0 : Number(woGraceMinutes) > 0 ? Number(woGraceMinutes) : 0
      }
    });
  });
  return getTournamentStateOnce();
}

async function fbMakeMove(round, board, fen, lastMoveSan, gameOverResult, lastFrom, lastTo, clientMoveAt, isTimeoutClaim) {
  round = Number(round);
  board = Number(board);
  const tournamentServerNowMs_ = syncedNow_();
  const effectiveMoveAt = Math.min((clientMoveAt || Date.now()) + internetClockOffsetMs, tournamentServerNowMs_);
  const gameDocRef = gamesCollectionRef.doc(gameDocId_(round, board));
  const cachedGame = lastRoundGames.find(g => g.round === round && g.board === board) || (tournamentCurrentGameRow && tournamentCurrentGameRow.round === round && tournamentCurrentGameRow.board === board ? tournamentCurrentGameRow : null);
  if (cachedGame && !isTimeoutClaim) {
    if (cachedGame.status === "finished") throw new Error("Esa partida ya terminó");
    if (cachedGame.status === "suspended") throw new Error("Esta partida está suspendida por el árbitro");
    const isRealMove = cachedGame.clock && fen !== cachedGame.fen;
    if (isRealMove) {
      const joined = cachedGame.joined || {
        w: false,
        b: false
      };
      if (!joined.w || !joined.b) {
        throw new Error("Todavía no entraron los dos jugadores a la partida");
      }
    }
    const patch = {
      fen: fen,
      lastMoveSan: lastMoveSan || ""
    };
    if (lastFrom) patch.lastFrom = lastFrom;
    if (lastTo) patch.lastTo = lastTo;
    if (isRealMove) {
      const moverColor = new Chess(cachedGame.fen).turn();
      const elapsed = cachedGame.turnStartAt ? Math.max(0, Math.floor((effectiveMoveAt - getTimestampMs(cachedGame.turnStartAt)) / 1e3)) : 0;
      const newClock = {
        ...cachedGame.clock,
        [moverColor]: Math.max(0, cachedGame.clock[moverColor] - elapsed)
      };
      if (!gameOverResult && cachedGame.increment) {
        newClock[moverColor] += cachedGame.increment;
      }
      patch.clock = newClock;
      patch.turnStartAt = srvTimestamp();
    }
    if (gameOverResult) {
      patch.status = "finished";
      patch.result = gameOverResult;
    }
    await gameDocRef.update(patch);
    const writtenGame = {
      ...cachedGame,
      ...patch
    };
    if (isRealMove) writtenGame.turnStartAt = effectiveMoveAt;
    if (!gameOverResult) {
      return {
        gameRow: writtenGame
      };
    }
    const fastState = await fbSubmitResult(round, board, gameOverResult);
    fastState.gameRow = writtenGame;
    return fastState;
  }
  let writtenGame = null;
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(gameDocRef);
    if (!snap.exists) throw new Error("No se encontró esa partida");
    const g = {
      ...snap.data()
    };
    if (g.status === "finished") throw new Error("Esa partida ya terminó");
    if (g.status === "suspended") throw new Error("Esta partida está suspendida por el árbitro");
    if (g.clock && fen !== g.fen) {
      const joined = g.joined || {
        w: false,
        b: false
      };
      if (!joined.w || !joined.b) {
        throw new Error("Todavía no entraron los dos jugadores a la partida");
      }
    }
    if (g.clock && fen !== g.fen) {
      const moverColor = new Chess(g.fen).turn();
      const elapsed = g.turnStartAt ? Math.max(0, Math.floor((effectiveMoveAt - getTimestampMs(g.turnStartAt)) / 1e3)) : 0;
      g.clock = {
        ...g.clock,
        [moverColor]: Math.max(0, g.clock[moverColor] - elapsed)
      };
      if (!gameOverResult && g.increment) {
        g.clock = {
          ...g.clock,
          [moverColor]: g.clock[moverColor] + g.increment
        };
      }
      g.turnStartAt = srvTimestamp();
    }
    g.fen = fen;
    g.lastMoveSan = lastMoveSan || "";
    if (lastFrom) g.lastFrom = lastFrom;
    if (lastTo) g.lastTo = lastTo;
    if (gameOverResult) {
      g.status = "finished";
      g.result = gameOverResult;
    }
    tx.update(gameDocRef, g);
    writtenGame = g;
    if (g.clock && fen !== g.fen) writtenGame.turnStartAt = effectiveMoveAt;
  });
  if (!gameOverResult) {
    return {
      gameRow: writtenGame
    };
  }
  const state = await fbSubmitResult(round, board, gameOverResult);
  state.gameRow = writtenGame;
  return state;
}

async function fbMarkJoined(round, board, color) {
  round = Number(round);
  board = Number(board);
  const gameDocRef = gamesCollectionRef.doc(gameDocId_(round, board));
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(gameDocRef);
    if (!snap.exists) return;
    const g = snap.data();
    const joined = g.joined || {
      w: false,
      b: false
    };
    if (joined[color]) return;
    tx.update(gameDocRef, {
      joined: {
        ...joined,
        [color]: true
      }
    });
  });
}

async function fbResetAll() {
  assertAdmin();
  const gamesSnap = await gamesCollectionRef.get();
  const docs = gamesSnap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = fbDb.batch();
    docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  if (announcementsCollectionRef) {
    const announcementsSnap = await announcementsCollectionRef.get();
    const announcementDocs = announcementsSnap.docs;
    for (let i = 0; i < announcementDocs.length; i += 400) {
      const batch = fbDb.batch();
      announcementDocs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await fbRoomRef.set({
    meta: {
      name: "",
      round: 0,
      status: "setup",
      adminEmails: [],
      totalRounds: null
    },
    players: [],
    pairings: []
  });
  return getTournamentStateOnce();
}

function playerStatusLabel_(status) {
  if (status === "pending") return "⏳ Pendiente de autorización";
  if (status === "withdrawn") return "🚪 Retirado";
  if (status === "disqualified") return "⛔ Descalificado";
  return "✅ Activo";
}

function resultLabel(result) {
  if (result === "1-0") return "1 - 0";
  if (result === "0-1") return "0 - 1";
  if (result === "1/2-1/2") return "½ - ½";
  if (result === "wo-black") return "WO Blancas (1-0)";
  if (result === "wo-white") return "WO Negras (0-1)";
  return "";
}

let _rankPlayersCache_ = {
  players: null,
  pairings: null,
  result: null
};

function rankPlayers_(players, pairings) {
  if (_rankPlayersCache_.players === players && _rankPlayersCache_.pairings === pairings) {
    return _rankPlayersCache_.result;
  }
  const result = rankPlayersCompute_(players, pairings);
  _rankPlayersCache_ = {
    players: players,
    pairings: pairings,
    result: result
  };
  return result;
}

function rankPlayersCompute_(players, pairings) {
  const byId = {};
  players.forEach(p => byId[p.id] = p);
  const record = {};
  players.forEach(p => record[p.id] = {
    w: 0,
    d: 0,
    l: 0
  });
  (pairings || []).forEach(pr => {
    if (!pr.result || !record[pr.whiteId]) return;
    if (pr.blackId === "") {
      record[pr.whiteId].w += 1;
      return;
    }
    if (!record[pr.blackId]) return;
    if (pr.result === "1-0" || pr.result === "wo-black") {
      record[pr.whiteId].w += 1;
      record[pr.blackId].l += 1;
    } else if (pr.result === "0-1" || pr.result === "wo-white") {
      record[pr.whiteId].l += 1;
      record[pr.blackId].w += 1;
    } else if (pr.result === "1/2-1/2") {
      record[pr.whiteId].d += 1;
      record[pr.blackId].d += 1;
    }
  });
  return players.map(p => {
    const buchholz = (p.played || []).reduce((sum, oppId) => sum + (byId[oppId] ? byId[oppId].points : 0), 0);
    return {
      ...p,
      _buchholz: Math.round(buchholz * 100) / 100,
      _record: record[p.id] || {
        w: 0,
        d: 0,
        l: 0
      }
    };
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b._buchholz !== a._buchholz) return b._buchholz - a._buchholz;
    return a.name.localeCompare(b.name);
  });
}

async function fbRecalculatePositions() {
  assertReferee();
  await fbDb.runTransaction(async tx => {
    const snap = await tx.get(fbRoomRef);
    if (!snap.exists) throw new Error("Todavía no creaste un torneo");
    const data = snap.data();
    const players = (data.players || []).map(p => ({
      ...p,
      points: 0,
      byes: 0,
      played: [],
      colorBalance: 0
    }));
    const byId = {};
    players.forEach(p => byId[p.id] = p);
    (data.pairings || []).slice().sort((a, b) => a.round - b.round || a.board - b.board).forEach(pr => {
      const white = byId[pr.whiteId];
      if (!white) return;
      if (pr.blackId === "") {
        if (pr.result) {
          white.byes += 1;
          white.points += 1;
        }
        return;
      }
      const black = byId[pr.blackId];
      if (!black) return;
      if (white.played.indexOf(black.id) === -1) white.played.push(black.id);
      if (black.played.indexOf(white.id) === -1) black.played.push(white.id);
      white.colorBalance += 1;
      black.colorBalance -= 1;
      applyResultToPlayers_(white, black, pr.result, 1);
    });
    tx.update(fbRoomRef, {
      players: players
    });
  });
  return getTournamentStateOnce();
}

function printCurrentRoundPairings(state) {
  const roundPairings = state.pairings.filter(p => p.round === state.meta.round).slice().sort((a, b) => a.board - b.board);
  const rowsHtml = roundPairings.map(p => `\n              <tr>\n                <td>${p.board}</td>\n                <td>${escapeHtml_(p.whiteName)}</td>\n                <td>${p.blackId === "" ? "— (BYE)" : escapeHtml_(p.blackName)}</td>\n                <td>${p.blackId === "" ? "1 - 0" : ""}</td>\n              </tr>`).join("");
  const html = `<!DOCTYPE html>\n<html lang="es"><head><meta charset="utf-8">\n<title>Emparejamientos — ${escapeHtml_(state.meta.name)} — Ronda ${state.meta.round}</title>\n<style>\n  body { font-family: Arial, sans-serif; padding: 24px; color: #111; }\n  h1 { font-size: 20px; margin: 0 0 4px; }\n  h2 { font-size: 15px; margin: 0 0 18px; font-weight: normal; color: #444; }\n  table { width: 100%; border-collapse: collapse; }\n  th, td { border: 1px solid #999; padding: 8px 10px; text-align: left; font-size: 14px; }\n  th { background: #eee; }\n  td:first-child, th:first-child { width: 60px; text-align: center; }\n  td:last-child, th:last-child { width: 110px; text-align: center; }\n</style>\n</head><body>\n  <h1>${escapeHtml_(state.meta.name)}</h1>\n  <h2>Emparejamientos — Ronda ${state.meta.round}</h2>\n  <table>\n    <thead><tr><th>Mesa</th><th>Blancas</th><th>Negras</th><th>Resultado</th></tr></thead>\n    <tbody>${rowsHtml}</tbody>\n  </table>\n</body></html>`;
  const win = window.open("", "_blank");
  if (!win) {
    toast("❌ El navegador bloqueó la ventana de impresión. Habilitá pop-ups para este sitio.");
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => win.print();
  setTimeout(() => {
    try {
      win.print();
    } catch (err) {}
  }, 300);
}

function pdfEnsureSpace_(doc, y, marginTop) {
  if (y > 280) {
    doc.addPage();
    return marginTop;
  }
  return y;
}

function pdfDrawStandingsTable_(doc, marginX, y, ranked, includeStatus) {
  const cols = [ {
    label: "#",
    w: 10
  }, {
    label: "Jugador",
    w: includeStatus ? 58 : 70
  }, {
    label: "Puntos",
    w: 20
  }, {
    label: "Buchholz",
    w: 22
  }, {
    label: "V-E-D",
    w: 24
  }, {
    label: "Partidas",
    w: 20
  } ];
  if (includeStatus) cols.push({
    label: "Estado",
    w: 30
  });
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  let x = marginX;
  cols.forEach(c => {
    doc.text(c.label, x, y);
    x += c.w;
  });
  doc.setFont(undefined, "normal");
  y += 4;
  doc.line(marginX, y, x, y);
  y += 6;
  ranked.forEach((p, i) => {
    y = pdfEnsureSpace_(doc, y, 18);
    const values = [ String(i + 1), p.name, String(p.points), String(p._buchholz), `${p._record.w}-${p._record.d}-${p._record.l}`, String(p.played.length) ];
    if (includeStatus) values.push(playerStatusLabel_(p.status).replace(/^[^\s]+\s/, ""));
    x = marginX;
    values.forEach((v, idx) => {
      doc.text(String(v), x, y);
      x += cols[idx].w;
    });
    y += 7;
  });
  return y;
}

function explainTopThree_(ranked) {
  const medals = [ "1° puesto", "2° puesto", "3° puesto" ];
  const lines = [];
  const top = ranked.slice(0, 3);
  top.forEach((p, i) => {
    const next = ranked[i + 1];
    let reason;
    if (!next) {
      reason = "Único jugador en esta posición.";
    } else if (p.points !== next.points) {
      reason = `Se ubica por encima de ${next.name} por haber sumado más puntos en el torneo (${p.points} vs ${next.points}).`;
    } else if (p._buchholz !== next._buchholz) {
      reason = `Empató en puntos con ${next.name} (${p.points} c/u), pero lo superó por desempate Buchholz ` + `(${p._buchholz} vs ${next._buchholz}). El Buchholz suma los puntos totales que obtuvieron los ` + `rivales a los que se enfrentó cada jugador: enfrentar rivales que a su vez sumaron más puntos ` + `favorece este desempate.`;
    } else {
      reason = `Empató en puntos y en Buchholz con ${next.name} (${p.points} pts, Buchholz ${p._buchholz}). ` + `Al no haber diferencia en ningún desempate calculado, el orden entre ambos se definió de forma ` + `nominal (orden alfabético), por lo que en la práctica comparten esta posición.`;
    }
    lines.push({
      title: `${medals[i]}: ${p.name} — ${p.points} puntos, Buchholz ${p._buchholz} (${p._record.w}V ${p._record.d}E ${p._record.l}D)`,
      body: reason
    });
  });
  return lines;
}

function pdfDrawTopThreeExplanation_(doc, marginX, y, ranked) {
  if (!ranked.length) return y;
  y = pdfEnsureSpace_(doc, y, 18);
  doc.setFontSize(13);
  doc.text("Cómo se determinó el podio (1°, 2° y 3° puesto)", marginX, y);
  y += 8;
  const entries = explainTopThree_(ranked);
  doc.setFontSize(10);
  entries.forEach(entry => {
    y = pdfEnsureSpace_(doc, y, 18);
    doc.setFont(undefined, "bold");
    const titleLines = doc.splitTextToSize(entry.title, 180);
    titleLines.forEach(tl => {
      y = pdfEnsureSpace_(doc, y, 18);
      doc.text(tl, marginX, y);
      y += 5;
    });
    doc.setFont(undefined, "normal");
    const bodyLines = doc.splitTextToSize(entry.body, 180);
    bodyLines.forEach(bl => {
      y = pdfEnsureSpace_(doc, y, 18);
      doc.text(bl, marginX, y);
      y += 5;
    });
    y += 3;
  });
  return y;
}

function pdfDrawPairingsTable_(doc, marginX, y, roundPairings) {
  const cols = [ {
    label: "Mesa",
    w: 16
  }, {
    label: "Blancas",
    w: 60
  }, {
    label: "Negras",
    w: 60
  }, {
    label: "Resultado",
    w: 30
  } ];
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  let x = marginX;
  cols.forEach(c => {
    doc.text(c.label, x, y);
    x += c.w;
  });
  doc.setFont(undefined, "normal");
  y += 4;
  doc.line(marginX, y, x, y);
  y += 6;
  roundPairings.slice().sort((a, b) => a.board - b.board).forEach(p => {
    y = pdfEnsureSpace_(doc, y, 18);
    const values = [ String(p.board), p.whiteName, p.blackId === "" ? "— (BYE)" : p.blackName, p.result ? resultLabel(p.result) : "—" ];
    x = marginX;
    values.forEach((v, idx) => {
      doc.text(v, x, y);
      x += cols[idx].w;
    });
    y += 7;
  });
  return y;
}

function exportStandingsPDF(state) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    toast("❌ No se pudo cargar la librería de PDF. Revisá tu conexión e intentá de nuevo.");
    return;
  }
  const ranked = rankPlayers_(state.players, state.pairings);
  const doc = new window.jspdf.jsPDF;
  const marginX = 14;
  let y = 18;
  doc.setFontSize(16);
  doc.text(state.meta.name || "Torneo", marginX, y);
  y += 7;
  doc.setFontSize(11);
  doc.text(`Tabla de posiciones — Ronda ${state.meta.round}`, marginX, y);
  y += 10;
  pdfDrawStandingsTable_(doc, marginX, y, ranked, false);
  const safeName = (state.meta.name || "torneo").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  doc.save(`posiciones_${safeName}_ronda${state.meta.round}.pdf`);
}

function exportFullTournamentPDF(state) {
  if (!window.jspdf || !window.jspdf.jsPDF) {
    toast("❌ No se pudo cargar la librería de PDF. Revisá tu conexión e intentá de nuevo.");
    return;
  }
  const doc = new window.jspdf.jsPDF;
  const marginX = 14;
  let y = 18;
  doc.setFontSize(18);
  doc.text(state.meta.name || "Torneo", marginX, y);
  y += 9;
  doc.setFontSize(11);
  const generatedAt = (new Date).toLocaleString("es-AR");
  const statusText = state.meta.status === "finished" ? "Finalizado" : "En curso";
  const roundsNote = state.meta.totalRounds ? ` de ${state.meta.totalRounds}` : "";
  const timeControlText = state.meta.timeControlMinutes > 0 ? `${state.meta.timeControlMinutes} min` + (state.meta.timeControlIncrement > 0 ? ` + ${state.meta.timeControlIncrement}s` : "") : "Sin reloj";
  [ `Estado: ${statusText}`, `Ronda actual: ${state.meta.round}${roundsNote}`, `Jugadores: ${state.players.length}`, `Control de tiempo: ${timeControlText}`, `Reporte generado: ${generatedAt}` ].forEach(line => {
    doc.text(line, marginX, y);
    y += 6;
  });
  y += 4;
  if (state.meta.status === "finished") {
    const ranked0 = rankPlayers_(state.players, state.pairings);
    const topScore = ranked0.length ? ranked0[0].points : 0;
    const topTB = ranked0.length ? ranked0[0]._buchholz : 0;
    const champions = ranked0.filter(p => p.points === topScore && p._buchholz === topTB);
    doc.setFont(undefined, "bold");
    doc.text("Campeón: " + (champions.length > 1 ? champions.map(p => p.name).join(", ") + " (empate)" : champions[0] ? champions[0].name : "—"), marginX, y);
    doc.setFont(undefined, "normal");
    y += 10;
  }
  y = pdfEnsureSpace_(doc, y, 18);
  doc.setFontSize(13);
  doc.text("Tabla de posiciones", marginX, y);
  y += 8;
  const ranked = rankPlayers_(state.players, state.pairings);
  y = pdfDrawStandingsTable_(doc, marginX, y, ranked, true);
  y += 6;
  y = pdfEnsureSpace_(doc, y + 4, 18);
  y = pdfDrawTopThreeExplanation_(doc, marginX, y, ranked);
  y += 4;
  const maxRound = state.pairings.reduce((m, p) => Math.max(m, p.round), 0);
  for (let r = 1; r <= maxRound; r++) {
    const roundPairings = state.pairings.filter(p => p.round === r);
    if (roundPairings.length === 0) continue;
    y = pdfEnsureSpace_(doc, y + 4, 18);
    doc.setFontSize(13);
    doc.text(`Ronda ${r}`, marginX, y);
    y += 8;
    y = pdfDrawPairingsTable_(doc, marginX, y, roundPairings);
    y += 6;
  }
  y = pdfEnsureSpace_(doc, y + 4, 18);
  doc.setFontSize(13);
  doc.text("Jugadores inscriptos", marginX, y);
  y += 8;
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  [ "Jugador", "Email", "Estado" ].forEach((label, i) => {
    doc.text(label, marginX + [ 0, 80, 150 ][i], y);
  });
  doc.setFont(undefined, "normal");
  y += 4;
  doc.line(marginX, y, marginX + 180, y);
  y += 6;
  state.players.forEach(p => {
    y = pdfEnsureSpace_(doc, y, 18);
    doc.text(p.name, marginX, y);
    doc.text(p.email || "—", marginX + 80, y);
    doc.text(playerStatusLabel_(p.status).replace(/^[^\s]+\s/, ""), marginX + 150, y);
    y += 7;
  });
  const safeName = (state.meta.name || "torneo").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  doc.save(`torneo_completo_${safeName}_ronda${state.meta.round}.pdf`);
}

let tournamentAutoApproveTimer = null;

function stopAutoApproveTimer() {
  clearInterval(tournamentAutoApproveTimer);
  tournamentAutoApproveTimer = null;
}

let tournamentWOGraceTimer = null;

let alertedDoubleNoShowBoards_ = new Set;

function checkDoubleNoShowBoards_(state) {
  const graceMinutes = Number(state.meta.woGraceMinutes) || 0;
  if (!graceMinutes) return;
  const graceMs = graceMinutes * 6e4;
  const now = Date.now();
  const round = state.meta.round;
  const gamesByBoard = new Map;
  lastRoundGames.forEach(g => gamesByBoard.set(g.board, g));
  state.pairings.filter(p => p.round === round && p.blackId !== "" && !p.result).forEach(p => {
    const game = gamesByBoard.get(p.board);
    const joined = game && game.joined || {
      w: false,
      b: false
    };
    const key = round + "_" + p.board;
    const isDoubleNoShow = game && game.status === "ongoing" && game.startedAt && !joined.w && !joined.b && now - game.startedAt >= graceMs;
    if (isDoubleNoShow) {
      if (!alertedDoubleNoShowBoards_.has(key)) {
        alertedDoubleNoShowBoards_.add(key);
        toast(`🔴 Mesa #${p.board}: ni ${p.whiteName} ni ${p.blackName} se presentaron. No se declaró WO automático — revisalo a mano.`);
      }
    } else {
      alertedDoubleNoShowBoards_.delete(key);
    }
  });
}

function stopWOGraceTimer() {
  clearInterval(tournamentWOGraceTimer);
  tournamentWOGraceTimer = null;
}

function startWOGraceTimerIfNeeded(state) {
  const graceMinutes = Number(state.meta.woGraceMinutes) || 0;
  const shouldRun = isCurrentUserReferee() && graceMinutes > 0 && state.meta.status === "active" && state.meta.roundStatus === "playing";
  if (!shouldRun) {
    stopWOGraceTimer();
    return;
  }
  if (tournamentWOGraceTimer) return;
  const tick = async () => {
    try {
      const declared = await fbAutoDeclareForfeits();
      if (declared && declared.length > 0) {
        declared.forEach(d => {
          toast(`⏱️ WO automático — mesa #${d.board}: gana ${d.winner} (${d.absent} no se presentó a tiempo)`);
        });
      }
    } catch (err) {}
    try {
      if (lastTournamentState) checkDoubleNoShowBoards_(lastTournamentState);
    } catch (err) {}
  };
  tick();
  tournamentWOGraceTimer = setInterval(tick, 15e3);
}

function renderApprovalPanel(state, isAdmin, isPendingApproval) {
  const panel = document.getElementById("tournament-approval-panel");
  const statusEl = document.getElementById("tournament-approval-status");
  const adminControls = document.getElementById("tournament-approval-admin-controls");
  const autoBox = document.getElementById("tournament-auto-approve-box");
  const isReferee = isCurrentUserReferee();
  const isClosed = state.meta.roundStatus === "closed";
  if (!isPendingApproval) {
    panel.style.display = "none";
    stopAutoApproveTimer();
    const refPanel = document.getElementById("tournament-referee-round-controls");
    if (refPanel) refPanel.style.display = "none";
    return;
  }
  panel.style.display = "";
  adminControls.style.display = isAdmin && !isClosed ? "" : "none";
  statusEl.textContent = isClosed ? "El árbitro ya cerró esta ronda: los resultados quedaron bloqueados y solo él puede corregirlos. Falta generar la ronda siguiente." : isAdmin ? "Ya están cargados todos los resultados de esta ronda. Revisá la tabla de posiciones y los resultados abajo; podés corregir cualquier resultado antes de aprobar." : "Ya terminaron todas las partidas de esta ronda. Falta que el administrador la revise y apruebe para que se genere la ronda siguiente.";
  const refPanel = document.getElementById("tournament-referee-round-controls");
  if (refPanel) {
    refPanel.style.display = isReferee ? "" : "none";
    const closeBtn = document.getElementById("tournament-close-round-btn");
    const genBtn = document.getElementById("tournament-generate-round-btn");
    if (closeBtn) closeBtn.style.display = isClosed ? "none" : "";
    if (genBtn) genBtn.style.display = isClosed ? "" : "none";
    const byeBox = document.getElementById("tournament-manual-bye-box");
    const byeSelect = document.getElementById("tournament-manual-bye-select");
    if (byeBox && byeSelect) {
      const activePlayers = state.players.filter(p => (p.status || "active") === "active");
      const needsBye = isClosed && isReferee && activePlayers.length % 2 === 1;
      byeBox.style.display = needsBye ? "" : "none";
      if (needsBye) {
        const ranked = rankPlayers_(activePlayers, state.pairings);
        const previousValue = byeSelect.value;
        byeSelect.innerHTML = `<option value="">Automático (por defecto)</option>` + ranked.map(p => `<option value="${p.id}">${escapeHtml_(p.name)} — ${p.points} pts${p.byes ? " · ya tuvo BYE" : ""}</option>`).join("");
        if (ranked.some(p => p.id === previousValue)) byeSelect.value = previousValue;
      }
    }
  }
  const isAuto = state.meta.roundApprovalMode === "auto" && !state.meta.autoApprovalCancelled;
  if (!isAdmin || !isAuto || isClosed) {
    autoBox.style.display = "none";
    stopAutoApproveTimer();
    return;
  }
  autoBox.style.display = "";
  if (tournamentAutoApproveTimer) return;
  const countdownEl = document.getElementById("tournament-auto-approve-countdown");
  const tick = async () => {
    const st = lastTournamentState;
    if (!st) return;
    const m = st.meta;
    const stillAuto = m.status === "active" && m.roundStatus === "pending_approval" && m.roundApprovalMode === "auto" && !m.autoApprovalCancelled;
    if (!stillAuto) {
      stopAutoApproveTimer();
      renderTournamentState(st);
      return;
    }
    const deadline = (m.pendingApprovalAt || Date.now()) + 3e4;
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1e3));
    countdownEl.textContent = `⏱️ Se va a aprobar sola en ${remaining}s...`;
    if (remaining <= 0) {
      stopAutoApproveTimer();
      try {
        await fbApproveRound();
        toast("✅ Ronda aprobada automáticamente: se generó la ronda siguiente.");
      } catch (err) {
        if (!/pendiente de aprobación/.test(err.message)) {
          toast("❌ No se pudo aprobar la ronda automáticamente: " + err.message);
        }
      }
    }
  };
  tick();
  tournamentAutoApproveTimer = setInterval(tick, 500);
}

function renderSelfRegisterCard(state, isFinished) {
  const card = document.getElementById("tournament-self-register-card");
  if (!card) return;
  if (!currentUser || isFinished) {
    card.style.display = "none";
    return;
  }
  card.style.display = "";
  const formEl = document.getElementById("tournament-self-register-form");
  const statusEl = document.getElementById("tournament-self-register-status");
  const already = state.players.find(p => (p.email || "").toLowerCase() === currentUser.email);
  if (already) {
    formEl.style.display = "none";
    statusEl.style.display = "";
    statusEl.textContent = `✓ Ya estás inscripto como "${already.name}" (${playerStatusLabel_(already.status)}).`;
  } else {
    formEl.style.display = "flex";
    statusEl.style.display = "none";
    const nameInput = document.getElementById("tournament-self-register-name");
    if (!nameInput.value) nameInput.value = currentUser.displayName || "";
  }
}

let pairingsDelegationSetup_ = false;

function setupPairingsListDelegation_(listEl) {
  if (pairingsDelegationSetup_) return;
  pairingsDelegationSetup_ = true;
  listEl.addEventListener("click", e => {
    const playBtn = e.target.closest("button[data-play-round]");
    if (playBtn) {
      enterTournamentMatch(Number(playBtn.dataset.playRound), Number(playBtn.dataset.playBoard), playBtn.dataset.white, playBtn.dataset.black, playBtn.dataset.whiteEmail, playBtn.dataset.blackEmail);
      return;
    }
    const resultBtn = e.target.closest("button[data-result]");
    if (resultBtn) {
      (async () => {
        if (tournamentBusy) return;
        tournamentBusy = true;
        try {
          const isAdmin = listEl.dataset.isAdmin === "1";
          if (!isAdmin && !isCurrentUserReferee()) throw new Error("No tenés permiso para cargar resultados");
          const result = resultBtn.dataset.result;
          if ((result === "wo-black" || result === "wo-white") && !confirm("¿Confirmás declarar esta partida como W.O. (incomparecencia)?")) {
            tournamentBusy = false;
            return;
          }
          const wasPending = lastTournamentState && lastTournamentState.meta.roundStatus === "pending_approval";
          const newState = await fbSubmitResult(resultBtn.dataset.round, resultBtn.dataset.board, result);
          if (!wasPending && newState.meta.roundStatus === "pending_approval") {
            toast("✅ Ya están todos los resultados de la ronda. Revisá y aprobá la siguiente ronda.");
          } else if (!wasPending && newState.meta.status === "finished") {
            toast("🏁 Se jugaron todas las rondas: el torneo terminó.");
          }
        } catch (err) {
          toast("❌ No se pudo cargar el resultado: " + err.message);
        } finally {
          tournamentBusy = false;
        }
      })();
      return;
    }
    const suspendBtn = e.target.closest("button[data-suspend-round]");
    if (suspendBtn) {
      (async () => {
        if (tournamentBusy) return;
        tournamentBusy = true;
        try {
          const suspend = suspendBtn.dataset.suspendAction === "suspend";
          await fbSetGameSuspended(suspendBtn.dataset.suspendRound, suspendBtn.dataset.suspendBoard, suspend);
          toast(suspend ? "⏸️ Partida suspendida" : "▶️ Partida reanudada");
        } catch (err) {
          showError(err);
        } finally {
          tournamentBusy = false;
        }
      })();
    }
  });
}

function renderTournamentState(state) {
  const setupBox = document.getElementById("tournament-setup-box");
  const activeBox = document.getElementById("tournament-active-box");
  updateModeBadge();
  if (!currentUser) {
    setupBox.style.display = "none";
    activeBox.style.display = "none";
    stopWOGraceTimer();
    return;
  }
  if (!state || state.meta.status !== "active" && state.meta.status !== "finished") {
    setupBox.style.display = isCurrentUserAdmin(state) ? "" : "none";
    activeBox.style.display = "none";
    stopWOGraceTimer();
    return;
  }
  setupBox.style.display = "none";
  activeBox.style.display = "";
  startWOGraceTimerIfNeeded(state);
  const isAdmin = isCurrentUserAdmin(state);
  const isFinished = state.meta.status === "finished";
  const isPendingApproval = !isFinished && (state.meta.roundStatus === "pending_approval" || state.meta.roundStatus === "closed");
  const roundsNote = state.meta.totalRounds ? ` de ${state.meta.totalRounds}` : "";
  document.getElementById("tournament-title-display").textContent = "🏆 " + state.meta.name;
  document.getElementById("tournament-round-display").textContent = isFinished ? `Torneo finalizado — ronda ${state.meta.round}${roundsNote} — ${state.players.length} jugadores` : isPendingApproval ? `Ronda ${state.meta.round}${roundsNote} — ${state.meta.roundStatus === "closed" ? "🔒 Cerrada, falta generar la siguiente" : "⏳ Pendiente de aprobación"} — ${state.players.length} jugadores` : `Ronda ${state.meta.round}${roundsNote} — ${state.players.length} jugadores`;
  const pendingBadgeEl = document.getElementById("tournament-pending-badge");
  const pendingCount = state.players.filter(p => (p.status || "active") === "pending").length;
  if (pendingBadgeEl) {
    if ((isAdmin || isCurrentUserReferee()) && pendingCount > 0) {
      pendingBadgeEl.textContent = `🔔 ${pendingCount} inscripción${pendingCount === 1 ? "" : "es"} pendiente${pendingCount === 1 ? "" : "s"}`;
      pendingBadgeEl.style.display = "";
      pendingBadgeEl.style.cursor = "pointer";
      pendingBadgeEl.title = "Ir a las inscripciones pendientes";
    } else {
      pendingBadgeEl.style.display = "none";
    }
  }
  const announceComposerEl = document.getElementById("tournament-announcement-composer");
  if (announceComposerEl) announceComposerEl.style.display = isAdmin || isCurrentUserReferee() ? "" : "none";
  const countdownComposerEl = document.getElementById("tournament-round-countdown-composer");
  if (countdownComposerEl) countdownComposerEl.style.display = isAdmin || isCurrentUserReferee() ? "" : "none";
  renderRoundCountdown_(state);
  document.getElementById("tournament-admin-panel").style.display = isAdmin ? "" : "none";
  document.getElementById("tournament-next-round-btn").style.display = !isFinished && state.meta.round === 0 ? "" : "none";
  document.getElementById("tournament-finish-btn").style.display = isFinished ? "none" : "";
  document.getElementById("tournament-reopen-btn").style.display = isFinished ? "" : "none";
  if (!isAdmin) document.getElementById("tournament-settings-panel").style.display = "none";
  renderSelfRegisterCard(state, isFinished);
  renderApprovalPanel(state, isAdmin, isPendingApproval);
  const bannerEl = document.getElementById("tournament-champion-banner");
  if (isFinished) {
    const ranked = rankPlayers_(state.players, state.pairings);
    const topScore = ranked.length ? ranked[0].points : 0;
    const topTB = ranked.length ? ranked[0]._buchholz : 0;
    const champions = ranked.filter(p => p.points === topScore && p._buchholz === topTB);
    document.getElementById("tournament-champion-text").textContent = champions.length > 1 ? "Empate en el primer puesto: " + champions.map(p => p.name).join(", ") : "Campeón: " + (champions[0] ? champions[0].name : "—");
    bannerEl.style.display = "";
  } else {
    bannerEl.style.display = "none";
  }
  const myEmail = currentUser.email;
  const isReferee = isCurrentUserReferee();
  const currentRoundPairings = state.pairings.filter(p => p.round === state.meta.round);
  const listEl = document.getElementById("tournament-pairings-list");
  const currentRoundGames = lastRoundGames;
  setupPairingsListDelegation_(listEl);
  listEl.dataset.isAdmin = isAdmin ? "1" : "0";
  listEl.dataset.isReferee = isReferee ? "1" : "0";
  const sortedPairings = currentRoundPairings.slice().sort((a, b) => a.board - b.board);
  const seenBoards = new Set;
  const gamesByRoundBoard_ = new Map;
  currentRoundGames.forEach(g => gamesByRoundBoard_.set(g.round + "_" + g.board, g));
  const rowsByBoard_ = new Map;
  Array.from(listEl.children).forEach(el => {
    if (el.dataset && el.dataset.boardKey != null) rowsByBoard_.set(el.dataset.boardKey, el);
  });
  sortedPairings.forEach(p => {
    seenBoards.add(String(p.board));
    const isBye = p.blackId === "";
    const game = isBye ? null : gamesByRoundBoard_.get(p.round + "_" + p.board) || null;
    const rowSignature = JSON.stringify([ p, game, isAdmin, isReferee, myEmail ]);
    let row = rowsByBoard_.get(String(p.board));
    if (row && row.dataset.sig === rowSignature) return;
    if (!row) {
      row = document.createElement("div");
      row.className = "pairing-card";
      row.dataset.boardKey = p.board;
      rowsByBoard_.set(String(p.board), row);
      listEl.appendChild(row);
    }
    row.dataset.sig = rowSignature;
    if (isBye) {
      row.innerHTML = `\n              <div class="pairing-card-header">\n                <div class="pairing-card-board">Mesa ${p.board}</div>\n                <span class="pairing-status pairing-status-bye">⭐ Punto automático</span>\n              </div>\n              <div class="pairing-card-names">\n                <span class="pairing-side pairing-side-white">⚪ ${escapeHtml_(p.whiteName)}</span>\n                <span class="vs">—</span>\n                <span class="pairing-side-empty">Libre</span>\n              </div>\n              <div class="pairing-card-detail">Descansa esta ronda (bye, +1 punto)</div>\n            `;
      return;
    }
    const bothJoined = !game || !game.clock || (game.joined || {}).w && (game.joined || {}).b;
    const graceMinutes = Number(state.meta.woGraceMinutes) || 0;
    const joinedInfo = game && game.joined || {
      w: false,
      b: false
    };
    const onlyOneJoined = game && game.status === "ongoing" && joinedInfo.w !== joinedInfo.b;
    const woEtaText = graceMinutes > 0 && onlyOneJoined && game.startedAt ? (() => {
      const remainingMs = game.startedAt + graceMinutes * 6e4 - Date.now();
      const absentName = escapeHtml_(joinedInfo.w ? p.blackName : p.whiteName);
      return remainingMs > 0 ? `⏱️ Esperando a ${absentName} — WO automático en ${Math.ceil(remainingMs / 6e4)} min` : `⏱️ Tiempo de espera reglamentario cumplido para ${absentName}`;
    })() : "";
    const gameStatusText = game && game.status !== "finished" && game.status !== "suspended" && woEtaText ? woEtaText : game && game.status !== "finished" && game.status !== "suspended" && game.lastMoveSan ? "Última jugada: " + game.lastMoveSan : "";
    let statusCls, statusText;
    if (p.result) {
      if (state.meta.roundStatus === "pending_approval" && !p.locked) {
        statusCls = "pending";
        statusText = "🟣 Resultado pendiente de confirmar";
      } else if (p.result === "wo-black" || p.result === "wo-white") {
        statusCls = "wo";
        statusText = "⚫ Incomparecencia";
      } else if (p.result === "1/2-1/2") {
        statusCls = "draw";
        statusText = "🔵 Tablas acordadas";
      } else {
        statusCls = "finished";
        statusText = "⚪ Finalizada";
      }
      if (p.locked) statusText += " 🔒";
    } else if (game && game.status === "suspended") {
      statusCls = "suspended";
      statusText = "⏸️ Suspendida";
    } else if (graceMinutes > 0 && game && game.status === "ongoing" && game.startedAt && !joinedInfo.w && !joinedInfo.b && Date.now() - game.startedAt >= graceMinutes * 6e4) {
      statusCls = "no-show";
      statusText = "🔴 Nadie se presentó";
    } else if (game && game.clock && !bothJoined) {
      statusCls = "waiting";
      statusText = "🟡 Esperando jugadores";
    } else {
      statusCls = "playing";
      statusText = "🟢 En juego";
    }
    const clockHtml = game && game.clock ? `<div class="pairing-card-clock">⏱️ ${formatTime(game.clock.w)} — ${formatTime(game.clock.b)}</div>` : "";
    const isMyGame = p.whiteEmail && p.whiteEmail.toLowerCase() === myEmail || p.blackEmail && p.blackEmail.toLowerCase() === myEmail;
    const canPlay = isAdmin || isMyGame;
    const opts = [ [ "1-0", "1-0" ], [ "1/2-1/2", "½-½" ], [ "0-1", "0-1" ] ];
    if (isReferee) {
      opts.push([ "wo-black", "WO Blancas" ]);
      opts.push([ "wo-white", "WO Negras" ]);
    }
    const canEditResult = (isAdmin || isReferee) && !(p.locked && !isReferee);
    const btnsHtml = canEditResult ? opts.map(([val, label]) => `<button data-round="${p.round}" data-board="${p.board}" data-result="${val}" class="${p.result === val ? "selected" : ""}">${label}</button>`).join("") : p.result ? `<span class="muted">${resultLabel(p.result)}${p.locked ? " 🔒" : ""}</span>` : "";
    const playBtnHtml = `<button class="btn" data-play-round="${p.round}" data-play-board="${p.board}" data-white="${escapeHtml_(p.whiteName)}" data-black="${escapeHtml_(p.blackName)}" data-white-email="${escapeHtml_(p.whiteEmail || "")}" data-black-email="${escapeHtml_(p.blackEmail || "")}">${canPlay ? "▶️ Jugar" : "👁️ Ver"}</button>`;
    const suspendBtnHtml = isReferee && game && game.status !== "finished" ? `<button class="btn" data-suspend-round="${p.round}" data-suspend-board="${p.board}" data-suspend-action="${game.status === "suspended" ? "resume" : "suspend"}">${game.status === "suspended" ? "▶️ Reanudar" : "⏸️ Suspender"}</button>` : "";
    row.innerHTML = `\n            <div class="pairing-card-header">\n              <div class="pairing-card-board">Mesa ${p.board}</div>\n              <span class="pairing-status pairing-status-${statusCls}">${statusText}</span>\n            </div>\n            <div class="pairing-card-names">\n              <span class="pairing-side pairing-side-white">⚪ ${escapeHtml_(p.whiteName)}</span>\n              <span class="vs">vs</span>\n              <span class="pairing-side pairing-side-black">${escapeHtml_(p.blackName)} ⚫</span>\n            </div>\n            ${clockHtml}\n            ${gameStatusText ? `<div class="pairing-card-detail">${gameStatusText}</div>` : ""}\n            <div class="pairing-card-actions">\n              ${playBtnHtml}\n              ${suspendBtnHtml}\n              <div class="pairing-result-btns">${btnsHtml}</div>\n            </div>\n          `;
  });
  Array.from(listEl.children).forEach(el => {
    if (el.dataset && el.dataset.boardKey != null && !seenBoards.has(el.dataset.boardKey)) el.remove();
  });
  sortedPairings.forEach((p, idx) => {
    const row = rowsByBoard_.get(String(p.board));
    if (row && listEl.children[idx] !== row) listEl.insertBefore(row, listEl.children[idx] || null);
  });
  renderStandingsAndPlayers_(state, isAdmin, isReferee);
}

let standingsSignature_ = null;

function renderStandingsAndPlayers_(state, isAdmin, isReferee) {
  const standingsEl = document.getElementById("tournament-standings-list");
  const __t0 = PERF_DEBUG ? performance.now() : 0;
  const ranked2 = rankPlayers_(state.players, state.pairings);
  const __t1 = PERF_DEBUG ? performance.now() : 0;
  const newStandingsSignature = JSON.stringify([ ranked2, isReferee ]);
  if (PERF_DEBUG) {
    const __t2 = performance.now();
    console.log(`[perf] standings rank=${(__t1 - __t0).toFixed(2)}ms stringify=${(__t2 - __t1).toFixed(2)}ms | pairings=${state.pairings.length}`);
  }
  if (standingsSignature_ !== newStandingsSignature) {
    standingsSignature_ = newStandingsSignature;
    let rows = ranked2.map((p, i) => `\n              <tr>\n                <td>${i + 1}</td>\n                <td>${escapeHtml_(p.name)}</td>\n                <td>${p.points}</td>\n                <td>${p._buchholz}</td>\n                <td>${p._record.w}-${p._record.d}-${p._record.l}</td>\n                <td>${p.played.length}</td>\n                <td>${playerStatusLabel_(p.status)}</td>\n              </tr>`).join("");
    standingsEl.innerHTML = `\n            <table class="standings-table">\n              <thead><tr><th>#</th><th>Jugador</th><th>Puntos</th><th>Buchholz</th><th>V-E-D</th><th>Partidas</th><th>Estado</th></tr></thead>\n              <tbody>${rows}</tbody>\n            </table>\n            <p class="muted" style="font-size: 12px; margin-top: 8px">\n              Buchholz = suma de puntos de los rivales que enfrentó cada jugador (desempate). V-E-D = victorias-empates-derrotas (el bye cuenta como victoria).\n            </p>\n          `;
  }
  const refereePanelEl = document.getElementById("tournament-referee-panel");
  if (refereePanelEl) refereePanelEl.style.display = isReferee ? "" : "none";
  const refereeToolsEl = document.getElementById("tournament-referee-tools");
  if (refereeToolsEl) refereeToolsEl.style.display = isReferee ? "flex" : "none";
  renderPlayersPanel(state, isAdmin);
}

function escapePublicScreenHtml_(text) {
  return escapeHtml_(text);
}

function resultLabelForPairing_(pairing) {
  if (!pairing.result) return "";
  if (pairing.blackId === "") return "BYE";
  switch (pairing.result) {
   case "1-0":
    return "1 - 0";

   case "0-1":
    return "0 - 1";

   case "1/2-1/2":
    return "½ - ½";

   case "wo-black":
    return "1 - 0 (WO)";

   case "wo-white":
    return "0 - 1 (WO)";

   default:
    return pairing.result;
  }
}

function publicScreenGameKey_(p) {
  return p.round + "-" + p.board;
}

function publicScreenLiveGameFor_(p) {
  return lastRoundGames.find(g => g.round === p.round && g.board === p.board) || null;
}

const PUBLIC_SCREEN_START_FEN_ = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function renderPublicScreenBoardInto_(boardEl, fen) {
  const matrix = fenBoardToMatrix(fen);
  boardEl.innerHTML = "";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sqName = FILES[c] + (8 - r);
      const sq = document.createElement("div");
      sq.className = "square " + ((r + c) % 2 ? "dark" : "light");
      sq.dataset.square = sqName;
      const p = matrix[r][c];
      if (p) {
        const piece = document.createElement("div");
        piece.className = "piece " + (p.color === "w" ? "white-piece" : "black-piece");
        piece.textContent = PIECES[p.color + p.type.toUpperCase()];
        piece.dataset.piece = p.type.toUpperCase();
        sq.appendChild(piece);
      }
      boardEl.appendChild(sq);
    }
  }
}

function stopPublicScreenCycle_() {
  if (publicScreenCycleTimer_) {
    clearInterval(publicScreenCycleTimer_);
    publicScreenCycleTimer_ = null;
  }
}

function startPublicScreenCycleIfNeeded_() {
  if (publicScreenCycleTimer_) return;
  publicScreenCycleTimer_ = setInterval(advancePublicScreenCycle_, 1e4);
}

function advancePublicScreenCycle_() {
  if (publicScreenActiveGames_.length <= 1) return;
  publicScreenCycleIndex_ = (publicScreenCycleIndex_ + 1) % publicScreenActiveGames_.length;
  renderPublicScreenActiveCard_();
}

function renderPublicScreenActiveCard_() {
  const activeEl = document.getElementById("public-screen-active-tables");
  if (!activeEl) return;
  const games = publicScreenActiveGames_;
  if (!games.length) {
    activeEl.innerHTML = '<p class="public-screen-empty-note">No hay mesas en juego en este momento.</p>';
    return;
  }
  if (publicScreenCycleIndex_ >= games.length) publicScreenCycleIndex_ = 0;
  const p = games[publicScreenCycleIndex_];
  const counterNote = games.length > 1 ? ` <span class="public-screen-cycle-counter">(${publicScreenCycleIndex_ + 1}/${games.length})</span>` : "";
  activeEl.innerHTML = `\n          <div class="public-screen-active-row public-screen-active-row-cycle">\n            <span class="public-screen-board-badge">Mesa ${p.board}${counterNote}</span>\n            <span class="public-screen-vs">${escapePublicScreenHtml_(p.whiteName)} vs ${escapePublicScreenHtml_(p.blackName)}</span>\n          </div>\n          <div class="public-screen-mini-board-wrap" id="public-screen-mini-board-wrap" title="Tocá para ver esta mesa en grande">\n            <div class="board public-screen-mini-board" id="public-screen-mini-board"></div>\n          </div>\n          <p class="public-screen-zoom-hint">🔍 Tocá el tablero para verlo en grande</p>\n          ${games.length > 1 ? '<div class="public-screen-cycle-progress"><div class="public-screen-cycle-progress-bar"></div></div>' : ""}\n        `;
  const liveGame = publicScreenLiveGameFor_(p);
  const fen = liveGame && liveGame.fen || PUBLIC_SCREEN_START_FEN_;
  const miniBoardEl = document.getElementById("public-screen-mini-board");
  if (miniBoardEl) renderPublicScreenBoardInto_(miniBoardEl, fen);
  const wrapEl = document.getElementById("public-screen-mini-board-wrap");
  if (wrapEl) wrapEl.addEventListener("click", () => openPublicScreenZoom_(p));
}

function refreshPublicScreenActiveMiniBoard_() {
  const games = publicScreenActiveGames_;
  if (!games.length || publicScreenCycleIndex_ >= games.length) return;
  const p = games[publicScreenCycleIndex_];
  const miniBoardEl = document.getElementById("public-screen-mini-board");
  if (!miniBoardEl) return;
  const liveGame = publicScreenLiveGameFor_(p);
  const fen = liveGame && liveGame.fen || PUBLIC_SCREEN_START_FEN_;
  renderPublicScreenBoardInto_(miniBoardEl, fen);
}

function openPublicScreenZoom_(p) {
  publicScreenZoomKey_ = publicScreenGameKey_(p);
  stopPublicScreenCycle_();
  let backdrop = document.getElementById("public-screen-zoom-backdrop");
  if (!backdrop) {
    backdrop = document.createElement("div");
    backdrop.id = "public-screen-zoom-backdrop";
    backdrop.innerHTML = `\n            <div id="public-screen-zoom-box">\n              <p class="public-screen-zoom-vs" id="public-screen-zoom-vs"></p>\n              <div class="public-screen-zoom-board-wrap">\n                <div class="board public-screen-zoom-board" id="public-screen-zoom-board"></div>\n              </div>\n              <div class="public-screen-zoom-actions">\n                <button class="btn" id="public-screen-zoom-fullscreen-btn">⛶ Pantalla completa</button>\n                <button class="btn" id="public-screen-zoom-close">Cerrar</button>\n              </div>\n            </div>`;
    document.body.appendChild(backdrop);
    backdrop.addEventListener("click", e => {
      if (e.target === backdrop) closePublicScreenZoom_();
    });
    document.getElementById("public-screen-zoom-close").addEventListener("click", closePublicScreenZoom_);
    document.getElementById("public-screen-zoom-fullscreen-btn").addEventListener("click", () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else if (backdrop.requestFullscreen) {
        backdrop.requestFullscreen();
      }
    });
  }
  backdrop.style.display = "flex";
  renderPublicScreenZoomBoard_();
}

function closePublicScreenZoom_() {
  publicScreenZoomKey_ = null;
  const backdrop = document.getElementById("public-screen-zoom-backdrop");
  if (backdrop) {
    if (document.fullscreenElement === backdrop) {
      document.exitFullscreen().catch(() => {});
    }
    backdrop.style.display = "none";
  }
  if (publicScreenActiveGames_.length > 1) startPublicScreenCycleIfNeeded_();
}

function renderPublicScreenZoomBoard_() {
  if (!publicScreenZoomKey_) return;
  const backdrop = document.getElementById("public-screen-zoom-backdrop");
  const p = publicScreenActiveGames_.find(g => publicScreenGameKey_(g) === publicScreenZoomKey_);
  if (!p || !backdrop) {
    closePublicScreenZoom_();
    return;
  }
  const vsEl = document.getElementById("public-screen-zoom-vs");
  if (vsEl) vsEl.textContent = `Mesa ${p.board} — ${p.whiteName} vs ${p.blackName}`;
  const liveGame = publicScreenLiveGameFor_(p);
  const fen = liveGame && liveGame.fen || PUBLIC_SCREEN_START_FEN_;
  const boardEl = document.getElementById("public-screen-zoom-board");
  if (boardEl) renderPublicScreenBoardInto_(boardEl, fen);
}

function renderPublicScreen(state) {
  const emptyEl = document.getElementById("public-screen-empty");
  const contentEl = document.getElementById("public-screen-content");
  if (!emptyEl || !contentEl) return;
  const hasTournament = !!(state && (state.meta.status === "active" || state.meta.status === "finished"));
  emptyEl.style.display = hasTournament ? "none" : "";
  contentEl.style.display = hasTournament ? "" : "none";
  if (!hasTournament) {
    stopPublicScreenCycle_();
    publicScreenZoomKey_ = null;
    const zoomBackdrop = document.getElementById("public-screen-zoom-backdrop");
    if (zoomBackdrop) zoomBackdrop.style.display = "none";
    publicScreenActiveGames_ = [];
    return;
  }
  const isFinished = state.meta.status === "finished";
  const roundsNote = state.meta.totalRounds ? ` de ${state.meta.totalRounds}` : "";
  const __t0 = PERF_DEBUG ? performance.now() : 0;
  const publicSignature = JSON.stringify([ state.players, state.pairings, state.meta ]);
  if (PERF_DEBUG) {
    const __t1 = performance.now();
    console.log(`[perf] renderPublicScreen stringify=${(__t1 - __t0).toFixed(2)}ms | pairings=${state.pairings.length} players=${state.players.length}`);
  }
  if (contentEl.dataset.sig === publicSignature) return;
  contentEl.dataset.sig = publicSignature;
  document.getElementById("public-screen-name").textContent = state.meta.name || "Torneo";
  document.getElementById("public-screen-round").textContent = isFinished ? `🏁 Torneo finalizado — Ronda ${state.meta.round}${roundsNote}` : `Ronda ${state.meta.round}${roundsNote}`;
  const ranked = rankPlayers_(state.players, state.pairings);
  const standingsEl = document.getElementById("public-screen-standings");
  if (!ranked.length) {
    standingsEl.innerHTML = '<p class="public-screen-empty-note">Todavía no hay jugadores.</p>';
  } else {
    const rows = ranked.map((p, i) => {
      const rec = p._record || {
        w: 0,
        d: 0,
        l: 0
      };
      return `\n                <tr>\n                  <td class="public-screen-rank">${i + 1}</td>\n                  <td>${escapePublicScreenHtml_(p.name)}</td>\n                  <td>${p.points}</td>\n                  <td>${p._buchholz}</td>\n                  <td>${rec.w}/${rec.d}/${rec.l}</td>\n                </tr>`;
    }).join("");
    standingsEl.innerHTML = `\n            <table class="public-screen-table">\n              <thead>\n                <tr><th>#</th><th>Jugador</th><th>Pts</th><th>BH</th><th>V/E/D</th></tr>\n              </thead>\n              <tbody>${rows}</tbody>\n            </table>`;
  }
  const currentRoundPairings = state.pairings.filter(p => p.round === state.meta.round);
  const activePairings = currentRoundPairings.filter(p => p.blackId !== "" && !p.result).sort((a, b) => a.board - b.board);
  const previousGame = publicScreenActiveGames_[publicScreenCycleIndex_];
  const previousKey = previousGame ? publicScreenGameKey_(previousGame) : null;
  publicScreenActiveGames_ = activePairings;
  const keptIndex = previousKey ? activePairings.findIndex(p => publicScreenGameKey_(p) === previousKey) : -1;
  publicScreenCycleIndex_ = keptIndex !== -1 ? keptIndex : 0;
  renderPublicScreenActiveCard_();
  renderPublicScreenZoomBoard_();
  if (activePairings.length > 1 && !publicScreenZoomKey_) {
    startPublicScreenCycleIfNeeded_();
  } else if (!publicScreenZoomKey_) {
    stopPublicScreenCycle_();
  }
  const recentEl = document.getElementById("public-screen-recent-results");
  const finishedCurrent = currentRoundPairings.filter(p => p.result).sort((a, b) => a.board - b.board);
  let recentResults = finishedCurrent.slice();
  if (recentResults.length < 8 && state.meta.round > 1) {
    const prevRoundFinished = state.pairings.filter(p => p.round === state.meta.round - 1 && p.result).sort((a, b) => a.board - b.board);
    recentResults = recentResults.concat(prevRoundFinished);
  }
  recentResults = recentResults.slice(0, 12);
  if (!recentResults.length) {
    recentEl.innerHTML = '<p class="public-screen-empty-note">Todavía no hay resultados cargados.</p>';
  } else {
    recentEl.innerHTML = recentResults.map(p => {
      const opponent = p.blackId === "" ? "— (BYE)" : escapePublicScreenHtml_(p.blackName);
      return `\n                <div class="public-screen-result-row">\n                  <span class="public-screen-board-badge">R${p.round}·M${p.board}</span>\n                  <span class="public-screen-vs">${escapePublicScreenHtml_(p.whiteName)} vs ${opponent}</span>\n                  <span class="public-screen-result-badge">${resultLabelForPairing_(p)}</span>\n                </div>`;
    }).join("");
  }
  const nextRoundEl = document.getElementById("public-screen-next-round");
  if (isFinished) {
    const topScore = ranked.length ? ranked[0].points : 0;
    const topTB = ranked.length ? ranked[0]._buchholz : 0;
    const champions = ranked.filter(p => p.points === topScore && p._buchholz === topTB);
    nextRoundEl.textContent = champions.length > 1 ? "🏆 Empate en el primer puesto: " + champions.map(p => p.name).join(", ") : "🏆 Campeón: " + (champions[0] ? champions[0].name : "—");
  } else if (state.meta.roundStatus === "pending_approval") {
    nextRoundEl.textContent = `Ronda ${state.meta.round} terminada — esperando aprobación para pasar a la ronda ${state.meta.round + 1}`;
  } else if (state.meta.roundStatus === "closed") {
    nextRoundEl.textContent = `Ronda ${state.meta.round} cerrada — generando la ronda ${state.meta.round + 1}`;
  } else if (state.meta.totalRounds && state.meta.round >= state.meta.totalRounds) {
    nextRoundEl.textContent = "Última ronda en curso";
  } else {
    nextRoundEl.textContent = `Próxima ronda: ${state.meta.round + 1}${roundsNote}`;
  }
}

const publicScreenFullscreenBtn = document.getElementById("public-screen-fullscreen-btn");

if (publicScreenFullscreenBtn) {
  publicScreenFullscreenBtn.addEventListener("click", () => {
    const el = document.getElementById("public-screen");
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (el && el.requestFullscreen) {
      el.requestFullscreen();
    }
  });
}

let playersDelegationSetup_ = false;

function setupPlayersListDelegation_(listEl) {
  if (playersDelegationSetup_) return;
  playersDelegationSetup_ = true;
  listEl.addEventListener("click", e => {
    const editBtn = e.target.closest("button[data-edit-player]");
    if (editBtn) {
      tournamentEditingPlayerId = editBtn.dataset.editPlayer;
      renderPlayersPanel(lastTournamentState, true);
      return;
    }
    const cancelBtn = e.target.closest("button[data-cancel-edit-player]");
    if (cancelBtn) {
      tournamentEditingPlayerId = null;
      renderPlayersPanel(lastTournamentState, true);
      return;
    }
    const saveBtn = e.target.closest("button[data-save-player]");
    if (saveBtn) {
      (async () => {
        const playerId = saveBtn.dataset.savePlayer;
        const row = listEl.querySelector(`[data-player-row="${playerId}"]`);
        const name = row.querySelector(".player-edit-name").value;
        const email = row.querySelector(".player-edit-email").value;
        try {
          await fbEditPlayer(playerId, name, email);
          tournamentEditingPlayerId = null;
          toast("✓ Jugador actualizado");
        } catch (err) {
          showError(err);
        }
      })();
      return;
    }
    const deleteBtn = e.target.closest("button[data-delete-player]");
    if (deleteBtn) {
      (async () => {
        const playerId = deleteBtn.dataset.deletePlayer;
        const player = (lastTournamentState ? lastTournamentState.players : []).find(p => p.id === playerId);
        if (!confirm(`¿Eliminar a ${player ? player.name : "este jugador"}? Se recalculará el torneo.`)) return;
        try {
          await fbDeletePlayer(playerId);
          toast("✓ Jugador eliminado");
        } catch (err) {
          showError(err);
        }
      })();
      return;
    }
    const approveBtn = e.target.closest("button[data-approve-registration]");
    if (approveBtn) {
      (async () => {
        const playerId = approveBtn.dataset.approveRegistration;
        try {
          await fbApproveRegistration(playerId);
          toast("✅ Inscripción autorizada");
        } catch (err) {
          showError(err);
        }
      })();
      return;
    }
    const rejectBtn = e.target.closest("button[data-reject-registration]");
    if (rejectBtn) {
      (async () => {
        const playerId = rejectBtn.dataset.rejectRegistration;
        const player = (lastTournamentState ? lastTournamentState.players : []).find(p => p.id === playerId);
        if (!confirm(`¿Rechazar la inscripción de ${player ? player.name : "esta persona"}?`)) return;
        try {
          await fbRejectRegistration(playerId);
          toast("🚫 Inscripción rechazada");
        } catch (err) {
          showError(err);
        }
      })();
      return;
    }
    const withdrawBtn = e.target.closest("button[data-withdraw-player]");
    if (withdrawBtn) {
      (async () => {
        const playerId = withdrawBtn.dataset.withdrawPlayer;
        const player = (lastTournamentState ? lastTournamentState.players : []).find(p => p.id === playerId);
        if (!confirm(`¿Retirar a ${player ? player.name : "este jugador"} del torneo? Conserva su historial, pero no se lo volverá a emparejar.`)) return;
        try {
          await fbWithdrawPlayer(playerId);
          toast("🚪 Jugador retirado");
        } catch (err) {
          showError(err);
        }
      })();
      return;
    }
    const reactivateBtn = e.target.closest("button[data-reactivate-player]");
    if (reactivateBtn) {
      (async () => {
        const playerId = reactivateBtn.dataset.reactivatePlayer;
        try {
          await fbReactivatePlayer(playerId);
          toast("↩️ Jugador reincorporado");
        } catch (err) {
          showError(err);
        }
      })();
      return;
    }
    const disqualifyBtn = e.target.closest("button[data-disqualify-player]");
    if (disqualifyBtn) {
      (async () => {
        const playerId = disqualifyBtn.dataset.disqualifyPlayer;
        const player = (lastTournamentState ? lastTournamentState.players : []).find(p => p.id === playerId);
        if (!confirm(`¿Descalificar a ${player ? player.name : "este jugador"}? Esta acción no tiene vuelta atrás.`)) return;
        try {
          await fbDisqualifyPlayer(playerId);
          toast("⛔ Jugador descalificado");
        } catch (err) {
          showError(err);
        }
      })();
    }
  });
}

function renderPlayersPanel(state, isAdmin) {
  const card = document.getElementById("tournament-players-card");
  if (!card) return;
  const isReferee = isCurrentUserReferee();
  if (!isReferee && !isAdmin) {
    card.style.display = "none";
    return;
  }
  card.style.display = "";
  const listEl = document.getElementById("tournament-players-list");
  setupPlayersListDelegation_(listEl);
  if (tournamentEditingPlayerId && !state.players.some(p => p.id === tournamentEditingPlayerId)) {
    tournamentEditingPlayerId = null;
  }
  const playersSignature = JSON.stringify([ state.players, tournamentEditingPlayerId ]);
  if (listEl.dataset.sig === playersSignature) return;
  listEl.dataset.sig = playersSignature;
  const pendingIds = state.players.filter(p => (p.status || "active") === "pending").map(p => p.id);
  let bulkBar = document.getElementById("tournament-pending-bulk-actions");
  if (!bulkBar) {
    bulkBar = document.createElement("div");
    bulkBar.id = "tournament-pending-bulk-actions";
    bulkBar.style.cssText = "display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;";
    listEl.parentNode.insertBefore(bulkBar, listEl);
  }
  if (isAdmin && pendingIds.length > 0) {
    bulkBar.style.display = "flex";
    bulkBar.innerHTML = `\n            <button class="btn primary" id="tournament-approve-all-btn">✅ Autorizar todos (${pendingIds.length})</button>\n            <button class="btn danger" id="tournament-reject-all-btn">🚫 Rechazar todos (${pendingIds.length})</button>\n          `;
    const approveAllBtn = document.getElementById("tournament-approve-all-btn");
    if (approveAllBtn) {
      approveAllBtn.addEventListener("click", async () => {
        if (!confirm(`¿Autorizar las ${pendingIds.length} inscripciones pendientes?`)) return;
        try {
          await fbApproveAllRegistrations();
          toast("✅ Todas las inscripciones fueron autorizadas");
        } catch (err) {
          showError(err);
        }
      });
    }
    const rejectAllBtn = document.getElementById("tournament-reject-all-btn");
    if (rejectAllBtn) {
      rejectAllBtn.addEventListener("click", async () => {
        if (!confirm(`¿Rechazar las ${pendingIds.length} inscripciones pendientes? Esta acción no se puede deshacer.`)) return;
        try {
          await fbRejectAllRegistrations();
          toast("🚫 Todas las inscripciones pendientes fueron rechazadas");
        } catch (err) {
          showError(err);
        }
      });
    }
  } else {
    bulkBar.style.display = "none";
    bulkBar.innerHTML = "";
  }
  listEl.innerHTML = state.players.map(p => {
    if (p.id === tournamentEditingPlayerId) {
      return `\n                <div class="pairing-row" data-player-row="${p.id}">\n                  <input type="text" class="player-edit-name" value="${p.name.replace(/"/g, "&quot;")}" style="flex:1; min-width:120px; padding:6px 8px; border-radius:8px; border:1px solid var(--surface2); background:var(--surface); color:var(--text)" />\n                  <input type="email" class="player-edit-email" value="${(p.email || "").replace(/"/g, "&quot;")}" placeholder="Email" style="flex:1; min-width:160px; padding:6px 8px; border-radius:8px; border:1px solid var(--surface2); background:var(--surface); color:var(--text)" />\n                  <button class="btn primary" data-save-player="${p.id}">Guardar</button>\n                  <button class="btn" data-cancel-edit-player="1">Cancelar</button>\n                </div>`;
    }
    const status = p.status || "active";
    if (status === "pending") {
      const approvalBtns = isAdmin ? `\n                  <button class="btn primary" data-approve-registration="${p.id}">✅ Autorizar</button>\n                  <button class="btn danger" data-reject-registration="${p.id}">🚫 Rechazar</button>\n                ` : `<span class="muted" style="font-size:12px">Esperando autorización del administrador</span>`;
      return `\n                <div class="pairing-row" data-player-row="${p.id}">\n                  <div class="pairing-names">${escapeHtml_(p.name)}${p.email ? ` <span class="muted" style="font-size:12px">(${escapeHtml_(p.email)})</span>` : ""}\n                    <div class="mini-diagram-caption" style="margin:2px 0 0;text-align:left">${playerStatusLabel_(p.status)}</div>\n                  </div>\n                  ${approvalBtns}\n                </div>`;
    }
    const refereeBtns = isReferee ? `\n                ${status === "active" ? `<button class="btn" data-withdraw-player="${p.id}">🚪 Retirar</button>` : ""}\n                ${status === "withdrawn" ? `<button class="btn" data-reactivate-player="${p.id}">↩️ Reincorporar</button>` : ""}\n                ${status !== "disqualified" ? `<button class="btn danger" data-disqualify-player="${p.id}">⛔ Descalificar</button>` : ""}\n              ` : "";
    const adminBtns = isAdmin ? `\n                <button class="btn" data-edit-player="${p.id}">✏️ Editar</button>\n                <button class="btn danger" data-delete-player="${p.id}">🗑️ Eliminar</button>\n              ` : "";
    return `\n              <div class="pairing-row" data-player-row="${p.id}">\n                <div class="pairing-names">${escapeHtml_(p.name)}${p.email ? ` <span class="muted" style="font-size:12px">(${escapeHtml_(p.email)})</span>` : ""}\n                  <div class="mini-diagram-caption" style="margin:2px 0 0;text-align:left">${playerStatusLabel_(p.status)} · ${p.points} pts</div>\n                </div>\n                ${refereeBtns}\n                ${adminBtns}\n              </div>`;
  }).join("");
}

async function refreshTournament() {
  if (!fbRoomRef) return;
  try {
    const state = await getTournamentStateOnce();
    lastTournamentState = state;
    const hasActiveOrFinishedRound = state.meta.status === "active" || state.meta.status === "finished";
    subscribeRoundGames(hasActiveOrFinishedRound ? state.meta.round : null);
    renderTournamentState(state);
  } catch (err) {
    document.getElementById("tournament-connect-status").textContent = "❌ No se pudo conectar: " + err.message;
    document.getElementById("tournament-connect-status").classList.remove("correct");
  }
}

function tournamentResultMessage(result, reason) {
  const ctx = tournamentMatchCtx;
  const whiteName = ctx ? ctx.whiteName : "Blancas";
  const blackName = ctx ? ctx.blackName : "Negras";
  const suffix = reason ? ` (${reason})` : "";
  const myColor = tournamentMyColor();
  let headline, detail, variant;
  if (result === "1-0") {
    headline = "🏆 ¡Ganaron las Blancas!";
    detail = `${whiteName} le ganó a ${blackName}${suffix}.`;
    variant = myColor === "w" ? "win" : myColor === "b" ? "loss" : null;
    if (myColor === "w") detail += "\n¡Ganaste vos! 🎉";
    if (myColor === "b") detail += "\nPerdiste esta partida.";
  } else if (result === "0-1") {
    headline = "🏆 ¡Ganaron las Negras!";
    detail = `${blackName} le ganó a ${whiteName}${suffix}.`;
    variant = myColor === "b" ? "win" : myColor === "w" ? "loss" : null;
    if (myColor === "b") detail += "\n¡Ganaste vos! 🎉";
    if (myColor === "w") detail += "\nPerdiste esta partida.";
  } else if (result === "1/2-1/2") {
    headline = "🤝 ¡Tablas!";
    detail = `${whiteName} y ${blackName} empataron la partida${suffix}.`;
    variant = myColor ? "draw" : null;
  } else if (result === "wo-black") {
    headline = "🏆 ¡Ganaron las Blancas!";
    detail = `${blackName} no se presentó: ${whiteName} ganó por incomparecencia (W.O.)${suffix}.`;
    variant = myColor === "w" ? "win" : myColor === "b" ? "loss" : null;
    if (myColor === "w") detail += "\n¡Ganaste vos! 🎉";
    if (myColor === "b") detail += "\nPerdiste esta partida.";
  } else if (result === "wo-white") {
    headline = "🏆 ¡Ganaron las Negras!";
    detail = `${whiteName} no se presentó: ${blackName} ganó por incomparecencia (W.O.)${suffix}.`;
    variant = myColor === "b" ? "win" : myColor === "w" ? "loss" : null;
    if (myColor === "b") detail += "\n¡Ganaste vos! 🎉";
    if (myColor === "w") detail += "\nPerdiste esta partida.";
  } else {
    return {
      text: "🏁 Partida de torneo terminada.",
      variant: null
    };
  }
  return {
    text: headline + "\n\n" + detail,
    variant: variant
  };
}

function showTournamentResult(result, reason) {
  const msg = tournamentResultMessage(result, reason);
  showAlert(msg.text, msg.variant);
  showAlertBackToTournamentButton_();
  alertOnClose_ = () => exitTournamentMatch();
}

function tournamentMyColor() {
  if (!tournamentMatchCtx || !currentUser) return "";
  const email = currentUser.email;
  if (tournamentMatchCtx.whiteEmail && tournamentMatchCtx.whiteEmail.toLowerCase() === email) return "w";
  if (tournamentMatchCtx.blackEmail && tournamentMatchCtx.blackEmail.toLowerCase() === email) return "b";
  return "";
}

function tournamentClockWaitingForBothPlayers() {
  const gameRow = tournamentCurrentGameRow;
  if (!gameRow || !gameRow.clock) return false;
  const joined = gameRow.joined || {
    w: false,
    b: false
  };
  return !(joined.w && joined.b);
}

function updateTournamentMatchBar(gameRow) {
  if (!tournamentMatchActive || !tournamentMatchCtx) return;
  const statusEl = document.getElementById("tournament-match-status");
  const myColor = tournamentMyColor();
  if (gameRow && gameRow.status === "finished") {
    statusEl.textContent = "🏁 Partida terminada.";
    document.getElementById("tournament-match-controls").style.display = "none";
    document.getElementById("tournament-match-spectator-note").style.display = "none";
    clearInterval(tournamentClockTimer);
    if (!tournamentResultShown) {
      tournamentResultShown = true;
      let finalResult = gameRow.result;
      if (!finalResult) {
        const pairing = (lastTournamentState && lastTournamentState.pairings || []).find(p => p.round === gameRow.round && p.board === gameRow.board);
        finalResult = pairing ? pairing.result : "";
      }
      showTournamentResult(finalResult);
    }
    return;
  }
  if (gameRow && gameRow.status === "suspended") {
    statusEl.textContent = "⏸️ El árbitro suspendió esta partida. Esperá novedades antes de seguir jugando.";
    document.getElementById("tournament-match-controls").style.display = "none";
    return;
  }
  const turn = game.turn();
  const turnName = turn === "w" ? tournamentMatchCtx.whiteName : tournamentMatchCtx.blackName;
  if (tournamentClockWaitingForBothPlayers()) {
    const joined = gameRow && gameRow.joined || {
      w: false,
      b: false
    };
    const missing = !joined.w ? tournamentMatchCtx.whiteName : tournamentMatchCtx.blackName;
    statusEl.textContent = `⏳ Esperando a que entre ${missing}. El reloj arranca recién con la primera jugada.`;
  } else {
    statusEl.textContent = !myColor ? `Turno de ${turnName}.` : myColor === turn ? `¡Tu turno! Jugás con ${myColor === "w" ? "blancas" : "negras"}.` : `Turno de ${turnName}. Esperando la jugada...`;
  }
}

function handleLiveMatchUpdate(state) {
  if (!tournamentMatchActive || !tournamentMatchCtx) return;
  const gameRow = lastRoundGames.find(g => g.round === tournamentMatchCtx.round && g.board === tournamentMatchCtx.board);
  if (!gameRow) return;
  tournamentCurrentGameRow = gameRow;
  if (gameRow.fen !== game.fen()) {
    game.load(gameRow.fen);
    selected = null;
    validMoves = [];
    if (gameRow.lastFrom && gameRow.lastTo) {
      clearTimeout(opponentMoveHighlightTimer);
      opponentMoveHighlight = {
        from: gameRow.lastFrom,
        to: gameRow.lastTo
      };
    }
    render();
  }
  updateTournamentMatchBar(gameRow);
  updateTournamentClockDisplay();
}

function updateTournamentClockDisplay() {
  const gameRow = tournamentCurrentGameRow;
  const wEl = document.getElementById("clock-w");
  const bEl = document.getElementById("clock-b");
  if (!gameRow || !gameRow.clock || !wEl || !bEl) return;
  if (tournamentMatchBusy) return;
  const turn = game.turn();
  const finished = gameRow.status === "finished";
  const suspended = gameRow.status === "suspended";
  const turnStartAtMs = getTimestampMs(gameRow.turnStartAt);
  const serverNow = syncedNow_();
  const elapsed = finished || suspended || !turnStartAtMs ? 0 : Math.max(0, Math.floor((serverNow - turnStartAtMs) / 1e3));
  const remaining = {
    w: gameRow.clock.w - (turn === "w" && !finished && !suspended ? elapsed : 0),
    b: gameRow.clock.b - (turn === "b" && !finished && !suspended ? elapsed : 0)
  };
  const wSecs = Math.max(0, remaining.w);
  const bSecs = Math.max(0, remaining.b);
  const wTime = wEl.querySelector(".clock-time");
  const bTime = bEl.querySelector(".clock-time");
  (wTime || wEl).textContent = formatTime(wSecs);
  (bTime || bEl).textContent = formatTime(bSecs);
  wEl.classList.toggle("active", turn === "w" && !finished && !suspended);
  bEl.classList.toggle("active", turn === "b" && !finished && !suspended);
  if (!finished && !suspended && (turn === "w" && remaining.w <= 0 || turn === "b" && remaining.b <= 0)) {
    claimTournamentTimeout(turn);
  }
}

async function claimTournamentTimeout(flaggedColor) {
  if (!tournamentMatchActive || !tournamentMatchCtx) return;
  if (tournamentResultShown || tournamentTimeoutClaimBusy) return;
  tournamentTimeoutClaimBusy = true;
  try {
    const result = flaggedColor === "w" ? "0-1" : "1-0";
    const state = await fbMakeMove(tournamentMatchCtx.round, tournamentMatchCtx.board, game.fen(), game.history().slice(-1)[0] || "", result, undefined, undefined, undefined, true);
    const gameRow = state.gameRow;
    if (!tournamentResultShown) {
      tournamentResultShown = true;
      showTournamentResult(result, "tiempo agotado");
    }
    updateTournamentMatchBar(gameRow);
  } catch (err) {} finally {
    tournamentTimeoutClaimBusy = false;
  }
}

async function enterTournamentMatch(round, board, whiteName, blackName, whiteEmail, blackEmail) {
  document.body.classList.add("fullscreen-game");
  const fsBtn_ = document.getElementById("game-fullscreen");
  if (fsBtn_) fsBtn_.textContent = fsBtn_.dataset.exitText || "❎ Salir";
  document.documentElement.requestFullscreen().catch(() => {});
  try {
    const cached = lastRoundGames.find(g => g.round === round && g.board === board);
    let gameRow = cached || null;
    if (!gameRow) {
      const gSnap = await gamesCollectionRef.doc(gameDocId_(round, board)).get();
      gameRow = gSnap.exists ? gSnap.data() : null;
    }
    if (!gameRow) {
      toast("❌ No se encontró esa partida");
      return;
    }
    tournamentMatchCtx = {
      round: round,
      board: board,
      whiteName: whiteName,
      blackName: blackName,
      whiteEmail: whiteEmail || "",
      blackEmail: blackEmail || ""
    };
    tournamentMatchActive = true;
    clearOpponentMoveHighlight();
    clearInterval(clockTimer);
    clockTimer = null;
    botEnabled = false;
    gameStarted = true;
    game.load(gameRow.fen);
    selected = null;
    validMoves = [];
    tournamentResultShown = false;
    showPage("jugar");
    document.body.classList.add("tournament-board-max");
    document.getElementById("tournament-match-bar").style.display = "";
    document.getElementById("tournament-match-title").textContent = `🏆 Torneo · Ronda ${round}, tablero #${board}: ${whiteName} vs ${blackName}`;
    const clockWNameEl = document.getElementById("clock-w-name");
    const clockBNameEl = document.getElementById("clock-b-name");
    if (clockWNameEl) clockWNameEl.textContent = whiteName || "";
    if (clockBNameEl) clockBNameEl.textContent = blackName || "";
    [ "new-game", "undo", "resign", "copy-game" ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    tournamentCurrentGameRow = gameRow;
    clearInterval(tournamentClockTimer);
    const clockEl = document.querySelector("#page-jugar .clock");
    if (gameRow.clock) {
      if (clockEl) clockEl.style.display = "";
      updateTournamentClockDisplay();
      tournamentClockTimer = setInterval(updateTournamentClockDisplay, 500);
    } else if (clockEl) {
      clockEl.style.display = "none";
    }
    [ "modo-educativo-panel", "ayuda-educativa-panel", "tutor-card" ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = "none";
    });
    const myColor = tournamentMyColor();
    const spectatorNote = document.getElementById("tournament-match-spectator-note");
    const controlsEl = document.getElementById("tournament-match-controls");
    if (!myColor) {
      spectatorNote.style.display = "";
      controlsEl.style.display = "none";
    } else {
      spectatorNote.style.display = "none";
      controlsEl.style.display = "flex";
      if (gameRow.clock) {
        fbMarkJoined(round, board, myColor).catch(() => {});
      }
    }
    subscribeMatchChat(round, board);
    if (tournamentMyColor()) subscribeCallSignaling(round, board);
    renderCallUI();
    render();
    updateTournamentMatchBar(gameRow);
    requestAnimationFrame(sizeFullscreenBoard);
  } catch (err) {
    toast("❌ No se pudo abrir la partida: " + err.message);
  }
}

function exitTournamentMatch() {
  tournamentMatchActive = false;
  tournamentMatchCtx = null;
  tournamentResultShown = false;
  clearOpponentMoveHighlight();
  clearInterval(tournamentClockTimer);
  tournamentClockTimer = null;
  tournamentCurrentGameRow = null;
  unsubscribeMatchChat();
  unsubscribeCallSignaling();
  document.getElementById("tournament-match-bar").style.display = "none";
  document.body.classList.remove("tournament-board-max");
  resetBoardFrameSize();
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  if (lastTournamentState) {
    renderTournamentState(lastTournamentState);
    if (typeof renderPublicScreen === "function") renderPublicScreen(lastTournamentState);
  }
  [ "new-game", "undo", "resign", "copy-game" ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "";
  });
  const clockEl = document.querySelector("#page-jugar .clock");
  if (clockEl) clockEl.style.display = "";
  const clockWNameEl = document.getElementById("clock-w-name");
  const clockBNameEl = document.getElementById("clock-b-name");
  if (clockWNameEl) clockWNameEl.textContent = "";
  if (clockBNameEl) clockBNameEl.textContent = "";
  [ "modo-educativo-panel", "ayuda-educativa-panel", "tutor-card" ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = "";
  });
  game.reset();
  gameStarted = false;
  selected = null;
  validMoves = [];
  render();
  showPage("torneo");
}

async function syncTournamentMove() {
  if (!tournamentMatchActive || !tournamentMatchCtx) return;
  if (!tournamentMyColor()) return;
  tournamentMatchBusy = true;
  const clientMoveAt = Date.now();
  try {
    let gameOverResult = null;
    if (game.in_checkmate()) {
      gameOverResult = game.turn() === "w" ? "0-1" : "1-0";
    } else if (game.in_draw() || game.in_stalemate() || game.insufficient_material() || game.in_threefold_repetition()) {
      gameOverResult = "1/2-1/2";
    }
    const lastVerboseMove = game.history({
      verbose: true
    }).slice(-1)[0];
    const state = await fbMakeMove(tournamentMatchCtx.round, tournamentMatchCtx.board, game.fen(), game.history().slice(-1)[0] || "", gameOverResult, lastVerboseMove ? lastVerboseMove.from : "", lastVerboseMove ? lastVerboseMove.to : "", clientMoveAt);
    const gameRow = state.gameRow;
    if (gameRow) tournamentCurrentGameRow = gameRow;
    if (gameOverResult && !tournamentResultShown) {
      tournamentResultShown = true;
      showTournamentResult(gameOverResult);
    }
    if (gameOverResult && state.meta.roundStatus === "pending_approval") {
      toast("✅ Ya están todos los resultados de esta ronda, falta que el administrador la apruebe.");
    }
    updateTournamentMatchBar(gameRow);
  } catch (err) {
    toast("❌ No se pudo sincronizar la jugada: " + err.message);
  } finally {
    tournamentMatchBusy = false;
  }
}

document.getElementById("tournament-match-back-btn").addEventListener("click", exitTournamentMatch);

document.getElementById("tournament-match-resign-btn").addEventListener("click", async () => {
  const myColor = tournamentMyColor();
  if (!myColor) return;
  if (!confirm("¿Seguro que te querés rendir en esta partida?")) return;
  tournamentMatchBusy = true;
  try {
    const state = await fbMakeMove(tournamentMatchCtx.round, tournamentMatchCtx.board, game.fen(), game.history().slice(-1)[0] || "", myColor === "w" ? "0-1" : "1-0");
    const gameRow = state.gameRow;
    if (!tournamentResultShown) {
      tournamentResultShown = true;
      showTournamentResult(myColor === "w" ? "0-1" : "1-0");
    }
    updateTournamentMatchBar(gameRow);
    toast(state.meta.roundStatus === "pending_approval" ? "🏳️ Te rendiste. Resultado cargado. Falta que el administrador apruebe la ronda." : "🏳️ Te rendiste. Resultado cargado.");
  } catch (err) {
    showError(err);
  } finally {
    tournamentMatchBusy = false;
  }
});

document.getElementById("tournament-match-draw-btn").addEventListener("click", async () => {
  if (!tournamentMyColor()) return;
  if (!confirm("¿Las dos partes están de acuerdo en tablas?")) return;
  tournamentMatchBusy = true;
  try {
    const state = await fbMakeMove(tournamentMatchCtx.round, tournamentMatchCtx.board, game.fen(), game.history().slice(-1)[0] || "", "1/2-1/2");
    const gameRow = state.gameRow;
    if (!tournamentResultShown) {
      tournamentResultShown = true;
      showTournamentResult("1/2-1/2");
    }
    updateTournamentMatchBar(gameRow);
    toast(state.meta.roundStatus === "pending_approval" ? "🤝 Tablas cargadas. Falta que el administrador apruebe la ronda." : "🤝 Tablas cargadas.");
  } catch (err) {
    showError(err);
  } finally {
    tournamentMatchBusy = false;
  }
});

document.getElementById("tournament-match-call-btn").addEventListener("click", startAudioCall);

document.getElementById("tournament-match-call-accept-btn").addEventListener("click", () => {
  if (callPendingOffer) acceptIncomingCall_(callPendingOffer);
});

document.getElementById("tournament-match-call-decline-btn").addEventListener("click", declineIncomingCall_);

document.getElementById("tournament-match-call-cancel-btn").addEventListener("click", hangUpCall);

document.getElementById("tournament-match-call-hangup-btn").addEventListener("click", hangUpCall);

document.getElementById("tournament-match-call-mute-btn").addEventListener("click", toggleCallMute);

document.getElementById("tournament-match-chat-toggle-btn").addEventListener("click", toggleMatchChatPanel);

document.getElementById("tournament-match-chat-mute-btn").addEventListener("click", toggleMatchChatMute);

renderMatchChatMuteBtn_();

document.getElementById("tournament-match-chat-send-btn").addEventListener("click", sendMatchChatMessage);

document.getElementById("tournament-match-chat-clear-btn").addEventListener("click", clearMatchChat);

document.getElementById("tournament-match-chat-input").addEventListener("keydown", e => {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMatchChatMessage();
  }
});

document.getElementById("tournament-match-chat-input").addEventListener("input", e => {
  const len = e.target.value.length;
  const counterEl = document.getElementById("tournament-match-chat-counter");
  if (counterEl) counterEl.textContent = len > 0 ? `${len}/300` : "";
  const sendBtn = document.getElementById("tournament-match-chat-send-btn");
  if (sendBtn) sendBtn.disabled = !e.target.value.trim();
});

document.getElementById("tournament-connect-btn").addEventListener("click", async () => {
  const configText = document.getElementById("tournament-config-input").value;
  const room = document.getElementById("tournament-room-input").value.trim() || "main";
  const statusEl = document.getElementById("tournament-connect-status");
  try {
    const config = parseFirebaseConfigInput(configText);
    setFirebaseConfig(config);
    setTournamentRoom(room);
    connectFirebase(config, room);
  } catch (err) {
    statusEl.textContent = "❌ " + err.message;
    statusEl.classList.remove("correct");
  }
});

document.getElementById("tournament-google-signin-btn").addEventListener("click", async () => {
  try {
    const provider = new firebase.auth.GoogleAuthProvider;
    await firebase.auth().signInWithPopup(provider);
  } catch (err) {
    toast("❌ No se pudo iniciar sesión: " + err.message);
  }
});

function disconnectLan_() {
  if (lanClient_) {
    lanClient_.close();
    lanClient_ = null;
  }
  connectionMode = "online";
  currentUser = null;
  const lanBox = document.getElementById("tournament-lan-box");
  if (lanBox) lanBox.style.display = "none";
  const modeSelect = document.getElementById("tournament-mode-select");
  if (modeSelect) modeSelect.style.display = "";
  updateAuthUI();
}

document.getElementById("tournament-signout-btn").addEventListener("click", async () => {
  try {
    if (connectionMode === "lan") {
      disconnectLan_();
      toast("🚪 Saliste de la sala LAN");
      return;
    }
    await firebase.auth().signOut();
  } catch (err) {
    showError(err);
  }
});

const configSignoutBtn = document.getElementById("config-signout-btn");

if (configSignoutBtn) {
  configSignoutBtn.addEventListener("click", async () => {
    try {
      if (connectionMode === "lan") {
        disconnectLan_();
        toast("🚪 Saliste de la sala LAN");
        return;
      }
      await firebase.auth().signOut();
      toast("🚪 Sesión cerrada");
    } catch (err) {
      toast("❌ No se pudo cerrar sesión: " + err.message);
    }
  });
}

const modeOnlineBtn = document.getElementById("tournament-mode-online-btn");

const modeLanBtn = document.getElementById("tournament-mode-lan-btn");

if (modeOnlineBtn) {
  modeOnlineBtn.addEventListener("click", () => {
    const lanBox = document.getElementById("tournament-lan-box");
    if (lanBox) lanBox.style.display = "none";
    if (lanClient_) {
      lanClient_.close();
      lanClient_ = null;
    }
    currentUser = null;
    connectionMode = "online";
    connectFirebase(getFirebaseConfig(), getTournamentRoom());
  });
}

if (modeLanBtn) {
  modeLanBtn.addEventListener("click", () => {
    const lanBox = document.getElementById("tournament-lan-box");
    if (lanBox) lanBox.style.display = "";
    const nameInput = document.getElementById("lan-name-input");
    if (nameInput) nameInput.focus();
  });
}

const lanBackBtn = document.getElementById("lan-back-btn");

if (lanBackBtn) {
  lanBackBtn.addEventListener("click", () => {
    const lanBox = document.getElementById("tournament-lan-box");
    if (lanBox) lanBox.style.display = "none";
  });
}

const lanHostBtn = document.getElementById("lan-host-btn");

if (lanHostBtn) {
  lanHostBtn.addEventListener("click", () => {
    const name = (document.getElementById("lan-name-input").value || "").trim();
    const room = (document.getElementById("lan-room-input").value || "").trim() || "main";
    const addr = (document.getElementById("lan-host-address-input").value || "").trim() || "localhost:8080";
    if (!name) {
      document.getElementById("lan-connect-status").textContent = "❌ Ingresá tu nombre";
      return;
    }
    connectLan(addr, room, name, true);
  });
}

const lanJoinBtn = document.getElementById("lan-join-btn");

if (lanJoinBtn) {
  lanJoinBtn.addEventListener("click", () => {
    const name = (document.getElementById("lan-name-input").value || "").trim();
    const room = (document.getElementById("lan-room-input").value || "").trim() || "main";
    const addr = (document.getElementById("lan-host-input").value || "").trim();
    if (!name) {
      document.getElementById("lan-connect-status").textContent = "❌ Ingresá tu nombre";
      return;
    }
    if (!addr) {
      document.getElementById("lan-connect-status").textContent = "❌ Ingresá la dirección que te compartió el anfitrión";
      return;
    }
    connectLan(addr, room, name, false);
  });
}

document.getElementById("tournament-create-btn").addEventListener("click", async () => {
  const name = document.getElementById("tournament-name-input").value.trim() || "Torneo";
  const playerEntries = parsePlayersInput(document.getElementById("tournament-players-input").value);
  const totalRounds = document.getElementById("tournament-rounds-input").value.trim();
  if (playerEntries.length === 1) {
    toast("❌ Cargá al menos 2 jugadores, o dejá la lista vacía para que se inscriban ellos mismos");
    return;
  }
  if (playerEntries.some(p => !p.email)) {
    toast("❌ Cada jugador necesita su email de Gmail (formato: Nombre, email)");
    return;
  }
  if (totalRounds && (!/^\d+$/.test(totalRounds) || Number(totalRounds) < 1)) {
    toast("❌ La cantidad de rondas tiene que ser un número entero mayor a 0 (o dejalo vacío)");
    return;
  }
  if (!fbRoomRef) {
    toast("❌ Primero conectate a tu proyecto de Firebase");
    return;
  }
  if (!currentUser) {
    toast("❌ Iniciá sesión con Google primero");
    return;
  }
  const timeControl = {
    minutes: getRawMinutesFromSelect("tournament-time-mode", "tournament-custom-minutes"),
    increment: getIncrementFromSelect("tournament-increment", "tournament-custom-increment")
  };
  const roundApprovalMode = document.getElementById("tournament-round-mode").value === "auto" ? "auto" : "manual";
  const woGraceMinutes = document.getElementById("tournament-wo-grace-input").value.trim();
  try {
    await fbCreateTournament(name, playerEntries, totalRounds, undefined, timeControl, roundApprovalMode, woGraceMinutes);
    if (playerEntries.length >= 2) {
      await fbGenerateRound();
      toast("✓ Torneo creado y ronda 1 generada");
    } else {
      toast("✓ Torneo creado. Esperá a que se inscriban jugadores y generá la ronda 1 cuando quieras.");
    }
  } catch (err) {
    toast("❌ No se pudo crear el torneo: " + err.message);
  }
});

document.getElementById("tournament-next-round-btn").addEventListener("click", async () => {
  try {
    await fbGenerateRound();
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-finish-btn").addEventListener("click", async () => {
  if (!confirm("¿Cerrar el torneo ahora y declarar campeón según la tabla actual?")) return;
  try {
    await fbFinishTournament();
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-reopen-btn").addEventListener("click", async () => {
  try {
    await fbReopenTournament();
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-announcement-send-btn").addEventListener("click", async () => {
  const inputEl = document.getElementById("tournament-announcement-input");
  try {
    await sendTournamentAnnouncement(inputEl.value);
    inputEl.value = "";
    toast("📢 Anuncio enviado");
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-announcement-history-toggle").addEventListener("click", () => {
  const listEl = document.getElementById("tournament-announcement-history-list");
  listEl.style.display = listEl.style.display === "none" ? "" : "none";
});

document.querySelectorAll("#tournament-round-countdown-composer [data-countdown-minutes]").forEach(btn => {
  btn.addEventListener("click", async () => {
    try {
      await fbSetRoundCountdown(Number(btn.dataset.countdownMinutes));
      toast("⏳ Countdown iniciado");
    } catch (err) {
      showError(err);
    }
  });
});

document.getElementById("tournament-round-countdown-start-btn").addEventListener("click", async () => {
  const inputEl = document.getElementById("tournament-round-countdown-custom-minutes");
  try {
    await fbSetRoundCountdown(Number(inputEl.value));
    inputEl.value = "";
    toast("⏳ Countdown iniciado");
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-round-countdown-cancel-btn").addEventListener("click", async () => {
  try {
    await fbCancelRoundCountdown();
    toast("⏳ Countdown cancelado");
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-settings-btn").addEventListener("click", () => {
  const state = lastTournamentState;
  if (!state) return;
  document.getElementById("tournament-settings-name-input").value = state.meta.name || "";
  document.getElementById("tournament-settings-rounds-input").value = state.meta.totalRounds || "";
  setSelectFromValue("tournament-settings-time-mode", "tournament-settings-custom-time-label", "tournament-settings-custom-minutes", state.meta.timeControlMinutes || 0, [ "none", "1", "3", "5", "10", "15", "30" ]);
  setSelectFromValue("tournament-settings-increment", "tournament-settings-custom-increment-label", "tournament-settings-custom-increment", state.meta.timeControlIncrement || 0, [ "0", "2", "5", "10", "30" ]);
  document.getElementById("tournament-settings-round-mode").value = state.meta.roundApprovalMode === "auto" ? "auto" : "manual";
  document.getElementById("tournament-settings-wo-grace-input").value = state.meta.woGraceMinutes || "";
  document.getElementById("tournament-settings-panel").style.display = "";
});

document.getElementById("tournament-settings-cancel-btn").addEventListener("click", () => {
  document.getElementById("tournament-settings-panel").style.display = "none";
});

document.getElementById("tournament-settings-save-btn").addEventListener("click", async () => {
  try {
    assertAdmin();
    const name = document.getElementById("tournament-settings-name-input").value.trim() || "Torneo";
    const roundsRaw = document.getElementById("tournament-settings-rounds-input").value.trim();
    if (roundsRaw && (!/^\d+$/.test(roundsRaw) || Number(roundsRaw) < 1)) {
      toast("❌ La cantidad de rondas tiene que ser un número entero mayor a 0 (o dejalo vacío)");
      return;
    }
    const totalRounds = roundsRaw ? Number(roundsRaw) : null;
    const timeControl = {
      minutes: getRawMinutesFromSelect("tournament-settings-time-mode", "tournament-settings-custom-minutes"),
      increment: getIncrementFromSelect("tournament-settings-increment", "tournament-settings-custom-increment")
    };
    const roundApprovalMode = document.getElementById("tournament-settings-round-mode").value === "auto" ? "auto" : "manual";
    const woGraceRaw = document.getElementById("tournament-settings-wo-grace-input").value.trim();
    if (woGraceRaw && (!/^\d+$/.test(woGraceRaw) || Number(woGraceRaw) < 0)) {
      toast("❌ El tiempo de espera tiene que ser un número entero de minutos (o dejalo vacío)");
      return;
    }
    await fbUpdateSettings(name, totalRounds, [ TOURNAMENT_ADMIN_EMAIL ], timeControl, roundApprovalMode, woGraceRaw);
    document.getElementById("tournament-settings-panel").style.display = "none";
    toast("✓ Configuración guardada");
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-approve-round-btn").addEventListener("click", async () => {
  try {
    assertAdmin();
    await fbApproveRound();
    toast("✅ Ronda aprobada: se generó y publicó la ronda siguiente.");
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-cancel-auto-approve-btn").addEventListener("click", async () => {
  try {
    assertAdmin();
    await fbCancelAutoApproval();
    toast("✖️ Aprobación automática cancelada. Aprobá la ronda a mano cuando quieras.");
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-close-round-btn").addEventListener("click", async () => {
  try {
    await fbCloseRound();
    toast("🔒 Ronda cerrada: los resultados quedaron bloqueados salvo para vos.");
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-generate-round-btn").addEventListener("click", async () => {
  try {
    const byeBox = document.getElementById("tournament-manual-bye-box");
    const byeSelect = document.getElementById("tournament-manual-bye-select");
    const forcedByeId = byeBox && byeSelect && byeBox.style.display !== "none" ? byeSelect.value : "";
    await fbGenerateRoundFromClosed(forcedByeId || undefined);
    toast(forcedByeId ? "▶️ Se generó la ronda siguiente con el BYE elegido a mano." : "▶️ Se generó y publicó la ronda siguiente.");
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-recalc-positions-btn").addEventListener("click", async () => {
  if (!confirm("¿Recalcular las posiciones desde el historial de partidas? Esto corrige cualquier desincronización.")) return;
  try {
    await fbRecalculatePositions();
    toast("🔄 Posiciones recalculadas desde el historial de partidas.");
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-print-pairings-btn").addEventListener("click", () => {
  if (!lastTournamentState) return;
  printCurrentRoundPairings(lastTournamentState);
});

document.getElementById("tournament-export-standings-pdf-btn").addEventListener("click", () => {
  if (!lastTournamentState) return;
  exportStandingsPDF(lastTournamentState);
});

document.getElementById("tournament-export-full-pdf-btn").addEventListener("click", () => {
  try {
    assertAdmin();
    if (!lastTournamentState) return;
    exportFullTournamentPDF(lastTournamentState);
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-reset-btn").addEventListener("click", async () => {
  if (!confirm("¿Seguro que querés borrar todo el torneo actual? No se puede deshacer.")) return;
  try {
    await fbResetAll();
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-add-player-btn").addEventListener("click", async () => {
  const nameInput = document.getElementById("tournament-add-player-name");
  const emailInput = document.getElementById("tournament-add-player-email");
  try {
    await fbAddPlayer(nameInput.value, emailInput.value);
    nameInput.value = "";
    emailInput.value = "";
    toast("✓ Jugador agregado");
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-self-register-btn").addEventListener("click", async () => {
  const nameInput = document.getElementById("tournament-self-register-name");
  try {
    await fbSelfRegister(nameInput.value);
    toast("✅ ¡Te inscribiste al torneo!");
  } catch (err) {
    showError(err);
  }
});

document.getElementById("tournament-refresh-btn").addEventListener("click", refreshTournament);

const pendingBadgeBtn = document.getElementById("tournament-pending-badge");

if (pendingBadgeBtn) {
  pendingBadgeBtn.addEventListener("click", () => {
    const playersCard = document.getElementById("tournament-players-card");
    if (playersCard) playersCard.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

(function initTournamentPage() {
  const savedConfig = getFirebaseConfig();
  const savedRoom = getTournamentRoom();
  document.getElementById("tournament-room-input").value = savedRoom;
  if (savedConfig) {
    document.getElementById("tournament-config-input").value = JSON.stringify(savedConfig, null, 2);
    try {
      connectFirebase(savedConfig, savedRoom);
    } catch (err) {
      document.getElementById("tournament-connect-status").textContent = "❌ " + err.message;
    }
  }
})();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (tournamentMatchActive) {
    updateTournamentClockDisplay();
  } else {
    updateClockDisplay();
  }
  if (lastTournamentState && lastTournamentState.meta) {
    renderRoundCountdown_(lastTournamentState);
  }
});
