/** App bootstrap: Firebase init, auth gating, tabs, settings modal. */

document.addEventListener("DOMContentLoaded", () => {
  if (FIREBASE_ENABLED) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }

  Themes.init();
  A11y.init();
  Auth.init();
  Checklist.init();
  Expenses.init();
  initTabs();
  initSettings();

  Auth.onChange((user) => {
    $("loadingScreen").style.display = "none";
    $("appContainer").style.display = "flex";

    if (user) {
      $("authSection").style.display = "none";
      $("mainSection").style.display = "flex";
      $("userName").textContent = user.name || user.email;
      DataStore.start();
    } else {
      $("authSection").style.display = "flex";
      $("mainSection").style.display = "none";
      DataStore.stop();
    }
  });

  if (!FIREBASE_ENABLED) {
    setSyncStatus(true, "Demo mode (local)");
  }
});

/* ---------- Tabs ---------- */

function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabs.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".tab-content").forEach((tc) => {
        tc.classList.remove("active");
        tc.style.display = "none";
      });
      const target = $(`${btn.dataset.tab}Tab`);
      target.style.display = "flex";
      target.classList.add("active");
      haptic(15);
    });
  });
}

/* ---------- Settings modal ---------- */

function initSettings() {
  const modal = $("settingsModal");
  const overlay = $("modalOverlay");

  const open = () => {
    modal.style.display = "flex";
    overlay.style.display = "block";
  };
  const close = () => {
    modal.style.display = "none";
    overlay.style.display = "none";
  };

  $("settingsBtn").addEventListener("click", open);
  $("closeSettingsBtn").addEventListener("click", close);
  overlay.addEventListener("click", close);

  // Sound / haptic toggles (stored as "off" only when disabled)
  const soundToggle = $("soundToggle");
  const hapticToggle = $("hapticToggle");
  soundToggle.checked = localStorage.getItem("gs-sound") !== "off";
  hapticToggle.checked = localStorage.getItem("gs-haptic") !== "off";
  soundToggle.addEventListener("change", () => {
    localStorage.setItem("gs-sound", soundToggle.checked ? "on" : "off");
  });
  hapticToggle.addEventListener("change", () => {
    localStorage.setItem("gs-haptic", hapticToggle.checked ? "on" : "off");
  });

  // Danger zone
  $("clearAllBtn").addEventListener("click", () => {
    if (confirm("Delete ALL items, expenses and history for everyone on this list?")) {
      DataStore.clearAll();
      close();
      showToast("All data cleared", "warning");
    }
  });
}
