/** Theme manager: light / dark / matrix modes + accent colors. Persists to localStorage. */

const Themes = {
  THEMES: ["light", "dark", "matrix"],
  ACCENTS: ["blue", "green", "purple", "red", "orange"],

  init() {
    this.applyTheme(localStorage.getItem("gs-theme") || "light");
    this.applyAccent(localStorage.getItem("gs-accent") || "blue");

    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.applyTheme(btn.dataset.theme);
        haptic();
      });
    });

    document.querySelectorAll(".color-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        this.applyAccent(btn.dataset.color);
        haptic();
      });
    });
  },

  applyTheme(theme) {
    if (!this.THEMES.includes(theme)) theme = "light";
    document.body.classList.remove("light-mode", "dark-mode", "matrix-mode");
    document.body.classList.add(`${theme}-mode`);
    localStorage.setItem("gs-theme", theme);

    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === theme);
    });

    // Keep the browser chrome color in sync on mobile
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.content = theme === "matrix" ? "#000000" : theme === "dark" ? "#121212" : "#2196F3";
    }
  },

  applyAccent(color) {
    if (!this.ACCENTS.includes(color)) color = "blue";
    this.ACCENTS.forEach((c) => document.body.classList.remove(`accent-${c}`));
    document.body.classList.add(`accent-${color}`);
    localStorage.setItem("gs-accent", color);

    document.querySelectorAll(".color-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.color === color);
    });
  }
};
