/**
 * Checklist: grouped grid of items by Section (with floor), tap to check off,
 * category filters, progress bar, and 2-second completion banners.
 * Banners fire on data changes, so BOTH devices celebrate in real time.
 */
const Checklist = {
  items: [],
  filter: "all",
  _prevSectionDone: null, // null until first snapshot (no banners on initial load)
  _prevAllDone: false,

  init() {
    $("addItemBtn").addEventListener("click", () => this.addFromForm());
    $("itemName").addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.addFromForm();
    });

    document.querySelector('.filter-btn[data-filter="all"]')
      .addEventListener("click", () => this.setFilter("all"));

    DataStore.onItems((items) => {
      this.items = items;
      this.detectCompletions();
      this.render();
    });
  },

  /* ---------- adding ---------- */

  addFromForm() {
    const name = $("itemName").value.trim();
    if (!name) {
      showToast("Enter an item name", "warning");
      return;
    }
    const quantity = Math.max(1, parseInt($("itemQuantity").value, 10) || 1);
    const category = $("itemCategory").value.trim() || "General";
    const floor = $("itemFloor").value.trim();

    DataStore.addItem({
      name, quantity, category, floor,
      completed: false,
      createdBy: Auth.user ? Auth.user.name : "unknown"
    });

    $("itemName").value = "";
    $("itemQuantity").value = "1";
    $("itemName").focus();
    haptic();
    showToast(`Added "${name}"`, "success", 1500);
  },

  /* ---------- checking off ---------- */

  toggle(id) {
    const item = this.items.find((i) => i.id === id);
    if (!item) return;
    DataStore.updateItem(id, {
      completed: !item.completed,
      completedBy: !item.completed && Auth.user ? Auth.user.name : null
    });
    haptic();
    playSound("tick");
  },

  remove(id, ev) {
    ev.stopPropagation();
    const item = this.items.find((i) => i.id === id);
    DataStore.deleteItem(id);
    if (item) showToast(`Removed "${item.name}"`, "info", 1500);
  },

  /* ---------- completion banners ---------- */

  sectionKey(item) {
    return item.floor ? `${item.category} · Floor ${item.floor}` : item.category;
  },

  detectCompletions() {
    const sections = {};
    this.items.forEach((item) => {
      const key = this.sectionKey(item);
      sections[key] = sections[key] || { total: 0, done: 0 };
      sections[key].total++;
      if (item.completed) sections[key].done++;
    });

    const sectionDone = {};
    Object.entries(sections).forEach(([key, s]) => {
      sectionDone[key] = s.total > 0 && s.done === s.total;
    });
    const allDone = this.items.length > 0 && this.items.every((i) => i.completed);

    if (this._prevSectionDone !== null) {
      if (allDone && !this._prevAllDone) {
        showBanner("🎉 All Done!");
      } else if (!allDone) {
        const newlyDone = Object.keys(sectionDone).find(
          (key) => sectionDone[key] && this._prevSectionDone[key] === false
        );
        if (newlyDone) showBanner(`✅ ${newlyDone} — Section Completed!`);
      }
    }

    this._prevSectionDone = sectionDone;
    this._prevAllDone = allDone;
  },

  /* ---------- filters ---------- */

  setFilter(value) {
    this.filter = value;
    this.render();
  },

  renderFilters() {
    const categories = [...new Set(this.items.map((i) => i.category || "General"))].sort();
    if (!categories.includes(this.filter) && this.filter !== "all") this.filter = "all";

    document.querySelector('.filter-btn[data-filter="all"]')
      .classList.toggle("active", this.filter === "all");

    $("categoryFilters").innerHTML = categories.map((cat) => `
      <button class="filter-btn ${this.filter === cat ? "active" : ""}"
              data-filter="${escapeHtml(cat)}">${escapeHtml(cat)}</button>
    `).join("");

    $("categoryFilters").querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.setFilter(btn.dataset.filter));
    });
  },

  /* ---------- rendering ---------- */

  render() {
    this.renderFilters();
    this.renderProgress();

    const container = $("itemsContainer");
    const visible = this.filter === "all"
      ? this.items
      : this.items.filter((i) => (i.category || "General") === this.filter);

    if (visible.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>${this.items.length === 0
            ? "No items yet. Add some items to get started!"
            : "No items in this section."}</p>
        </div>`;
      return;
    }

    // Group by section (category · floor)
    const groups = new Map();
    visible.forEach((item) => {
      const key = this.sectionKey(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    container.innerHTML = [...groups.entries()].map(([key, items]) => {
      const done = items.filter((i) => i.completed).length;
      const header = `
        <div class="group-header ${done === items.length ? "group-done" : ""}">
          <span class="group-title">${escapeHtml(key)}</span>
          <span class="group-count">${done}/${items.length}</span>
        </div>`;
      const cards = items.map((item) => this.cardHtml(item)).join("");
      return header + cards;
    }).join("");

    container.querySelectorAll(".item-card").forEach((card) => {
      card.addEventListener("click", () => this.toggle(card.dataset.id));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.toggle(card.dataset.id);
        }
      });
    });
    container.querySelectorAll(".item-delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.remove(btn.dataset.id, e));
    });
  },

  cardHtml(item) {
    return `
      <div class="item-card ${item.completed ? "completed" : ""}"
           data-id="${item.id}" tabindex="0" role="checkbox"
           aria-checked="${item.completed}"
           aria-label="${escapeHtml(item.name)}, quantity ${item.quantity}">
        <button class="item-delete-btn" data-id="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">✕</button>
        <div class="item-name">${escapeHtml(item.name)}</div>
        <div class="item-details">
          <div class="item-detail-row"><span>Qty</span><strong>${item.quantity}</strong></div>
          ${item.floor ? `<div class="item-detail-row"><span>Floor</span><strong>${escapeHtml(item.floor)}</strong></div>` : ""}
          ${item.completed && item.completedBy ? `<div class="item-detail-row"><span>✓ by</span><strong>${escapeHtml(item.completedBy)}</strong></div>` : ""}
        </div>
        <div class="item-checkbox" aria-hidden="true"></div>
      </div>`;
  },

  renderProgress() {
    const total = this.items.length;
    const done = this.items.filter((i) => i.completed).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    $("progressFill").style.width = pct + "%";
    $("progressCount").textContent = `${done} / ${total}`;
  }
};
