/**
 * Chess Master - Main Application Script
 * Full interactive logic, UI controls, tournament flow, engine integration, and fullscreen handler.
 */

// --- Import Utilities ---
import { 
  formatTime, 
  generatePGN, 
  evaluateBoardState, 
  saveGameToHistory, 
  loadGameHistory 
} from "./utils.js";

// --- Global State ---
let game = null; // Expects Chess() instance from chess.js
let board = null;
let currentMode = "pvp"; // 'pvp', 'ai', 'tournament'
let aiDifficulty = "medium";
let moveHistory = [];
let gameTimer = null;
let whiteTime = 300; // 5 minutes
let blackTime = 300;
let activePlayer = "w";
let isGameActive = false;

// --- DOM Selectors ---
const boardElement = document.getElementById("board");
const statusElement = document.getElementById("game-status");
const timerWhiteElement = document.getElementById("timer-white");
const timerBlackElement = document.getElementById("timer-black");
const moveLogElement = document.getElementById("move-log");
const btnRestart = document.getElementById("btn-restart");
const btnUndo = document.getElementById("btn-undo");
const btnFullscreen = document.getElementById("btn-fullscreen");
const modeSelect = document.getElementById("mode-select");

// --- Initialization ---
function initApp() {
  if (typeof Chess === "undefined") {
    console.error("Chess.js library is missing! Make sure to include it in your HTML.");
    if (statusElement) statusElement.innerText = "Error: Chess.js no encontrada.";
    return;
  }

  game = new Chess();
  setupEventListeners();
  resetGame();
  sizeFullscreenBoard();
}

// --- Game Logic ---
function resetGame() {
  game.reset();
  moveHistory = [];
  whiteTime = 300;
  blackTime = 300;
  activePlayer = "w";
  isGameActive = true;
  
  updateTimersDisplay();
  startTimer();
  updateUI();
}

function startTimer() {
  clearInterval(gameTimer);
  gameTimer = setInterval(() => {
    if (!isGameActive) return;

    if (activePlayer === "w") {
      whiteTime--;
      if (whiteTime <= 0) handleTimeout("w");
    } else {
      blackTime--;
      if (blackTime <= 0) handleTimeout("b");
    }
    updateTimersDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(gameTimer);
}

function updateTimersDisplay() {
  if (timerWhiteElement) timerWhiteElement.innerText = formatTime(whiteTime);
  if (timerBlackElement) timerBlackElement.innerText = formatTime(blackTime);
}

function handleTimeout(player) {
  isGameActive = false;
  stopTimer();
  const winner = player === "w" ? "Negras" : "Blancas";
  if (statusElement) statusElement.innerText = `¡Tiempo agotado! Ganan las ${winner}.`;
}

function makeMove(source, target) {
  if (!isGameActive) return false;

  const move = game.move({
    from: source,
    to: target,
    promotion: "q" // Default auto-promote to queen
  });

  if (move === null) return false; // Invalid move

  moveHistory.push(move);
  activePlayer = game.turn();
  updateUI();

  if (game.game_over()) {
    handleGameOver();
  } else if (currentMode === "ai" && activePlayer === "b") {
    setTimeout(makeAIMove, 400);
  }

  return true;
}

function makeAIMove() {
  if (!isGameActive || game.game_over()) return;

  const possibleMoves = game.moves();
  if (possibleMoves.length === 0) return;

  const chosenMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];

  game.move(chosenMove);
  activePlayer = game.turn();
  updateUI();

  if (game.game_over()) {
    handleGameOver();
  }
}

function undoMove() {
  if (!isGameActive) return;
  
  game.undo();
  if (currentMode === "ai") {
    game.undo(); // Undo AI's response too
  }
  
  activePlayer = game.turn();
  updateUI();
}

function handleGameOver() {
  isGameActive = false;
  stopTimer();

  let message = "Juego terminado: ";
  if (game.in_checkmate()) {
    const winner = game.turn() === "w" ? "Negras" : "Blancas";
    message += `¡Jaque mate! Ganan las ${winner}.`;
  } else if (game.in_draw()) {
    message += "Tablas (Empate).";
  } else if (game.in_stalemate()) {
    message += "Tablas por ahogado.";
  } else if (game.in_threefold_repetition()) {
    message += "Tablas por repetición.";
  } else {
    message += "Fin de la partida.";
  }

  if (statusElement) statusElement.innerText = message;
  saveGameToHistory(game.pgn());
}

// --- UI Rendering ---
function updateUI() {
  if (statusElement && isGameActive) {
    const turnName = activePlayer === "w" ? "Blancas" : "Negras";
    const checkText = game.in_check() ? " ¡JAQUE!" : "";
    statusElement.innerText = `Turno de: ${turnName}${checkText}`;
  }

  renderMoveLog();
}

function renderMoveLog() {
  if (!moveLogElement) return;
  moveLogElement.innerHTML = "";
  
  const history = game.history({ verbose: true });
  for (let i = 0; i < history.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const whiteMove = history[i] ? history[i].san : "";
    const blackMove = history[i + 1] ? history[i + 1].san : "";

    const row = document.createElement("div");
    row.className = "log-row";
    row.innerText = `${moveNum}. ${whiteMove} ${blackMove}`;
    moveLogElement.appendChild(row);
  }
  moveLogElement.scrollTop = moveLogElement.scrollHeight;
}

// --- Responsive & Fullscreen Handling ---
function toggleFullscreen() {
  document.body.classList.toggle("fullscreen-game");
  sizeFullscreenBoard();
}

function sizeFullscreenBoard() {
  const bc = document.body.classList;
  if (!bc.contains("fullscreen-game") && !bc.contains("tournament-match-active")) {
    resetBoardFrameSize();
    return;
  }

  const boardFrame = document.querySelector(".board-frame");
  if (!boardFrame) return;

  const availableWidth = window.innerWidth - 32;
  const availableHeight = window.innerHeight - 160;
  const size = Math.max(260, Math.min(availableWidth, availableHeight));

  boardFrame.style.width = size + "px";
  boardFrame.style.height = size + "px";
}

function resetBoardFrameSize() {
  const boardFrame = document.querySelector(".board-frame");
  if (boardFrame) {
    boardFrame.style.width = "";
    boardFrame.style.height = "";
  }
}

// --- Event Listeners Setup ---
function setupEventListeners() {
  if (btnRestart) btnRestart.addEventListener("click", resetGame);
  if (btnUndo) btnUndo.addEventListener("click", undoMove);
  if (btnFullscreen) btnFullscreen.addEventListener("click", toggleFullscreen);

  if (modeSelect) {
    modeSelect.addEventListener("change", (e) => {
      currentMode = e.target.value;
      resetGame();
    });
  }

  window.addEventListener("resize", sizeFullscreenBoard);
}

// Initialize application on DOM content load
document.addEventListener("DOMContentLoaded", initApp);