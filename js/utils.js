/** Shared helpers: DOM, toasts, banner, sound, haptics, formatting. */

const $ = (id) => document.getElementById(id);

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = String(str ?? "");
  return div.innerHTML;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatCurrency(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "numeric", minute: "2-digit"
  });
}

/* ---------- Toast notifications ---------- */

function showToast(message, type = "info", duration = 2500) {
  const container = $("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.setAttribute("role", "status");
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ---------- Completion banner (2 seconds, animated) ---------- */

let bannerTimer = null;
function showBanner(text) {
  const banner = $("completionBanner");
  $("bannerText").textContent = text;
  banner.classList.add("show");
  playSound("complete");
  haptic([60, 40, 60]);
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => banner.classList.remove("show"), 2000);
}

/* ---------- Sound (tiny synth beeps, no audio files needed) ---------- */

let audioCtx = null;
function playSound(kind) {
  if (localStorage.getItem("gs-sound") === "off") return;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === "complete" ? [523.25, 659.25, 783.99] : [440];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.12 + 0.25);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + i * 0.12);
      osc.stop(audioCtx.currentTime + i * 0.12 + 0.3);
    });
  } catch (e) { /* audio unsupported — ignore */ }
}

/* ---------- Haptic feedback ---------- */

function haptic(pattern = 30) {
  if (localStorage.getItem("gs-haptic") === "off") return;
  if (navigator.vibrate) navigator.vibrate(pattern);
}
