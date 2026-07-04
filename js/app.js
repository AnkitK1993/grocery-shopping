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
  initAccessManagement();

  Auth.onChange((user) => {
    $("loadingScreen").style.display = "none";
    $("appContainer").style.display = "flex";

    if (user) {
      Themes.applyTheme("dark");
      $("authSection").style.display = "none";
      $("mainSection").style.display = "flex";
      $("userName").textContent = user.name || user.email;

      const isAdmin = Auth.isAdmin(user.email);
      $("accessManagementGroup").style.display = isAdmin ? "block" : "none";
      $("masterTabBtn").style.display          = isAdmin ? ""      : "none";
      if (isAdmin) renderAccessList();

      DataStore.start();
      Masters.start();
    } else {
      $("authSection").style.display = "flex";
      $("mainSection").style.display = "none";
      $("accessManagementGroup").style.display = "none";
      $("masterTabBtn").style.display          = "none";
      DataStore.stop();
      Masters.stop();
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
      if (btn.dataset.tab === "master") Masters.render();
      haptic(15);
    });
  });
}

/* ---------- Access Management ---------- */

function initAccessManagement() {
  $("addAllowedEmailBtn").addEventListener("click", async () => {
    const input = $("newAllowedEmail");
    const email = input.value.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      showToast("Enter a valid email address", "error");
      return;
    }
    const list = Auth.getAccessList();
    if (list.map((e) => e.toLowerCase()).includes(email)) {
      showToast("Email already has access", "info");
      return;
    }
    try {
      await Auth.saveAccessList([...list, email]);
      input.value = "";
      showToast(`Access granted to ${email}`, "success");
      renderAccessList();
    } catch (err) {
      showToast("Failed to update access list", "error");
    }
  });

  $("newAllowedEmail").addEventListener("keydown", (e) => {
    if (e.key === "Enter") $("addAllowedEmailBtn").click();
  });
}

function renderAccessList() {
  const ul = $("allowedEmailsList");
  ul.innerHTML = "";
  Auth.getAccessList().forEach((email) => {
    const isAdmin = Auth.isAdmin(email);
    const li = document.createElement("li");
    li.className = "allowed-email-row";
    li.innerHTML = `
      <span class="email-label">${email}</span>
      ${isAdmin ? '<span class="admin-badge">admin</span>' : ""}
      ${isAdmin ? "" : `<button class="remove-email-btn" data-email="${email}" aria-label="Remove ${email}">&times;</button>`}
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll(".remove-email-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const email = btn.dataset.email;
      if (!confirm(`Remove access for ${email}?`)) return;
      const list = Auth.getAccessList().filter((e) => e.toLowerCase() !== email.toLowerCase());
      try {
        await Auth.saveAccessList(list);
        showToast(`Access removed for ${email}`, "warning");
        renderAccessList();
      } catch (err) {
        showToast("Failed to update access list", "error");
      }
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
    if ($("editModal").style.display === "none") {
      overlay.style.display = "none";
    }
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
