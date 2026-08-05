export function formatTime(totalSeconds) {
  if (totalSeconds == null || totalSeconds <= 0) return "0:00";
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
  return m + ":" + String(s).padStart(2, "0");
}

export function capitalizeFirst(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function cpToWin(cp) {
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export function classifyLoss(loss) {
  if (loss === 0) return "best";
  if (loss < 20) return "good";
  if (loss < 50) return "inaccuracy";
  if (loss < 200) return "mistake";
  return "blunder";
}

export function levelLabel(level) {
  const labels = ["Principiante", "Novato", "Intermedio", "Avanzado", "Experto", "Maestro"];
  return labels[Math.min(Math.max(level, 1), labels.length) - 1] || "Principiante";
}
