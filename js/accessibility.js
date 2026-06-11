/** Accessibility controls: global font scaling and screen zoom (80%–150%). */

const A11y = {
  MIN: 80,
  MAX: 150,
  STEP: 10,

  init() {
    this.fontScale = parseInt(localStorage.getItem("gs-font-scale") || "100", 10);
    this.zoomScale = parseInt(localStorage.getItem("gs-zoom-scale") || "100", 10);
    this.applyFont();
    this.applyZoom();

    $("increaseFontBtn").addEventListener("click", () => this.setFont(this.fontScale + this.STEP));
    $("decreaseFontBtn").addEventListener("click", () => this.setFont(this.fontScale - this.STEP));
    $("fontSizeSlider").addEventListener("input", (e) => this.setFont(parseInt(e.target.value, 10)));

    $("increaseZoomBtn").addEventListener("click", () => this.setZoom(this.zoomScale + this.STEP));
    $("decreaseZoomBtn").addEventListener("click", () => this.setZoom(this.zoomScale - this.STEP));
    $("zoomSlider").addEventListener("input", (e) => this.setZoom(parseInt(e.target.value, 10)));
  },

  clamp(v) {
    return Math.min(this.MAX, Math.max(this.MIN, v));
  },

  setFont(value) {
    this.fontScale = this.clamp(value);
    localStorage.setItem("gs-font-scale", String(this.fontScale));
    this.applyFont();
    haptic(15);
  },

  setZoom(value) {
    this.zoomScale = this.clamp(value);
    localStorage.setItem("gs-zoom-scale", String(this.zoomScale));
    this.applyZoom();
    haptic(15);
  },

  applyFont() {
    document.documentElement.style.setProperty("--font-scale", this.fontScale / 100);
    $("fontSizeValue").textContent = `${this.fontScale}%`;
    $("fontSizeSlider").value = this.fontScale;
  },

  applyZoom() {
    document.documentElement.style.setProperty("--zoom-scale", this.zoomScale / 100);
    $("zoomValue").textContent = `${this.zoomScale}%`;
    $("zoomSlider").value = this.zoomScale;
  }
};
