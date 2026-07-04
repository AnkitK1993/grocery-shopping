/**
 * Checklist: list of items grouped by Category.
 * Each item row: actions | name + meta | qty | checkbox.
 * Tap the row (anywhere except action buttons) to toggle completion.
 *
 * Firestore item fields: name, quantity, unit, category, section,
 *                        completed, completedBy, createdBy, createdAt
 */
const Checklist = {
  items: [],
  filter: "all",
  _prevGroupDone: null,
  _prevAllDone: false,
  _autofilledFrom: null,     // catalog item that populated the form fields
  _acMatches: [],            // current autocomplete result set
  _acIndex: -1,              // keyboard-highlighted row index (-1 = none)

  init() {
    $("addItemBtn").addEventListener("click", () => this.addFromForm());

    const inp = $("itemName");
    inp.addEventListener("input",  () => { this._showAc(); this._checkAutofill(); });
    inp.addEventListener("blur",   () => { setTimeout(() => this._closeAc(), 200); });
    inp.addEventListener("keydown",(e) => {
      if (e.key === "ArrowDown")  { e.preventDefault(); this._moveAc(1);  return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); this._moveAc(-1); return; }
      if (e.key === "Escape")     { this._closeAc(); return; }
      if (e.key === "Enter") {
        if (this._confirmAc()) { e.preventDefault(); return; }
        this.addFromForm();
      }
    });

    document.querySelector('.filter-btn[data-filter="all"]')
      .addEventListener("click", () => this.setFilter("all"));

    $("saveEditBtn").addEventListener("click",  () => this.saveEdit());
    $("closeEditBtn").addEventListener("click", () => this.closeEdit());
    $("modalOverlay").addEventListener("click", () => this.closeEdit());

    DataStore.onItems((items) => {
      this.items = items;
      this.detectCompletions();
      this.render();
    });
  },

  /* ── autocomplete ─────────────────────────────────────────────── */

  _showAc() {
    const inp      = $("itemName");
    const dropdown = $("itemNameDropdown");
    const query    = (inp ? inp.value : "").trim().toLowerCase();
    if (!query || !dropdown || !inp) { this._closeAc(); return; }

    // Candidate pool: catalog items + unique names from the current shopping list
    const catalogItems  = Masters.getCatalogItems();
    const catalogNames  = new Set(catalogItems.map(i => i.name.toLowerCase()));
    const listExtras    = [];
    const seen          = new Set(catalogNames);
    this.items.forEach(i => {
      const n = (i.name || "").trim();
      if (n && !seen.has(n.toLowerCase())) {
        seen.add(n.toLowerCase());
        listExtras.push({ name: n, category: i.category || "",
                          unit: i.unit || "", section: i.section || "" });
      }
    });
    const pool    = [...catalogItems, ...listExtras];
    const matches = pool.filter(item => item.name.toLowerCase().includes(query));

    this._acMatches = matches;
    this._acIndex   = -1;

    if (!matches.length) { this._closeAc(); return; }

    // Position below the input using fixed coords (escapes overflow-y:auto clips)
    const rect           = inp.getBoundingClientRect();
    dropdown.style.top   = rect.bottom + 2 + "px";
    dropdown.style.left  = rect.left   + "px";
    dropdown.style.width = rect.width  + "px";

    dropdown.innerHTML = matches.map(item => {
      const meta = [item.category, item.section].filter(Boolean).join(" · ");
      return `<div class="autocomplete-item">
        <div class="autocomplete-item-name">${this._hl(item.name, query)}</div>
        ${meta ? `<div class="autocomplete-item-meta">${escapeHtml(meta)}</div>` : ""}
      </div>`;
    }).join("");

    dropdown.style.display = "block";

    dropdown.querySelectorAll(".autocomplete-item").forEach((el, i) => {
      el.addEventListener("mousedown", e => {
        e.preventDefault(); // keep focus on input
        this._pickAc(i);
      });
    });
  },

  /* Highlight the matching substring in bold. */
  _hl(text, query) {
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx)) +
      `<mark>${escapeHtml(text.slice(idx, idx + query.length))}</mark>` +
      escapeHtml(text.slice(idx + query.length));
  },

  _moveAc(dir) {
    const dropdown = $("itemNameDropdown");
    if (!dropdown || dropdown.style.display === "none") return;
    const rows = dropdown.querySelectorAll(".autocomplete-item");
    if (!rows.length) return;
    this._acIndex = Math.max(0, Math.min(rows.length - 1, this._acIndex + dir));
    rows.forEach((r, i) => r.classList.toggle("active", i === this._acIndex));
    rows[this._acIndex].scrollIntoView({ block: "nearest" });
  },

  /* Returns true if a keyboard-highlighted item was confirmed. */
  _confirmAc() {
    if (this._acIndex < 0 || !this._acMatches.length) return false;
    this._pickAc(this._acIndex);
    return true;
  },

  _pickAc(idx) {
    const item = this._acMatches[idx];
    if (!item) return;
    $("itemName").value     = item.name;
    $("itemUnit").value     = item.unit     || "";
    $("itemCategory").value = item.category || "";
    $("itemSection").value  = item.section  || "";
    this._autofilledFrom    = { ...item };
    this._closeAc();
    $("itemQuantity").focus();
  },

  _closeAc() {
    const d = $("itemNameDropdown");
    if (d) { d.style.display = "none"; d.innerHTML = ""; }
    this._acMatches = [];
    this._acIndex   = -1;
  },

  /* Fallback: exact-name autofill when user types the full name without dropdown. */
  _checkAutofill() {
    const name = ($("itemName").value || "").trim();
    if (!name) { this._autofilledFrom = null; return; }
    const cat = Masters.getCatalogItemByName(name);
    if (!cat) {
      if (this._autofilledFrom &&
          this._autofilledFrom.name.toLowerCase() !== name.toLowerCase()) {
        this._autofilledFrom = null;
      }
      return;
    }
    if (this._autofilledFrom && this._autofilledFrom.id === cat.id) return; // already done
    this._autofilledFrom    = { ...cat };
    $("itemUnit").value     = cat.unit     || "";
    $("itemCategory").value = cat.category || "";
    $("itemSection").value  = cat.section  || "";
  },

  /* ── duplicate confirm modal ──────────────────────────────────── */

  _showDupModal(name, status) {
    return new Promise(resolve => {
      $("dupItemName").textContent   = name;
      $("dupItemStatus").textContent = status;
      const overlay = $("dupConfirmModal");
      overlay.style.display = "flex";

      const finish = (result) => {
        overlay.style.display = "none";
        resolve(result);
      };

      $("dupAddAgainBtn").onclick = () => finish(true);
      $("dupCancelBtn").onclick   = () => finish(false);

      // Tap outside the card to cancel
      overlay.onclick = (e) => { if (e.target === overlay) finish(false); };

      // Keyboard: Enter = confirm, Escape = cancel
      const onKey = (e) => {
        if (e.key === "Enter")  { document.removeEventListener("keydown", onKey); finish(true);  }
        if (e.key === "Escape") { document.removeEventListener("keydown", onKey); finish(false); }
      };
      document.addEventListener("keydown", onKey);
    });
  },

  /* ── adding ───────────────────────────────────────────────────── */

  async addFromForm() {
    this._closeAc();
    const name = $("itemName").value.trim();
    if (!name) { showToast("Enter an item name", "warning"); return; }

    const quantity = Math.max(1, parseInt($("itemQuantity").value, 10) || 1);
    const unit     = $("itemUnit").value     || "";
    const category = $("itemCategory").value || "General";
    const section  = $("itemSection").value  || "";

    // ── Duplicate check ──────────────────────────────────────────
    const duplicate = this.items.find(
      (i) => i.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      const status  = duplicate.completed ? "already bought" : "already in your list";
      const proceed = await this._showDupModal(name, status);
      if (!proceed) return;
    }

    // ── Master-catalog update check ──────────────────────────────
    const af = this._autofilledFrom;
    if (af && af.id) {
      const changed =
        unit     !== (af.unit     || "") ||
        category !== (af.category || "") ||
        section  !== (af.section  || "");
      if (changed &&
          confirm(`"${name}" exists in the master catalog with different values.\n\nUpdate the master catalog with the new values?`)) {
        Masters.updateCatalogItem(af.id, { unit, category, section });
      }
    }

    DataStore.addItem({
      name, quantity, unit, category, section,
      completed: false,
      createdBy: Auth.user ? Auth.user.name : "unknown"
    });

    $("itemName").value     = "";
    $("itemQuantity").value = "1";
    this._autofilledFrom    = null;
    $("itemName").focus();
    haptic();
    showToast(`Added "${name}"`, "success", 1500);
  },

  /* ── toggle ───────────────────────────────────────────────────── */

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

  /* ── edit modal ───────────────────────────────────────────────── */

  openEditModal(item) {
    if (!item) return;
    $("editItemId").value       = item.id;
    $("editItemName").value     = item.name;
    $("editItemQuantity").value = item.quantity;
    $("editItemUnit").value     = item.unit     || "";

    Masters._fillSelect("editItemCategory", Masters.getCategories());
    $("editItemCategory").value = item.category || "";
    Masters._fillSelect("editItemSection", Masters.getSections());
    $("editItemSection").value  = item.section  || "";

    $("editModal").style.display    = "flex";
    $("modalOverlay").style.display = "block";
    setTimeout(() => $("editItemName").focus(), 100);
  },

  edit(id, ev) {
    ev.stopPropagation();
    this.openEditModal(this.items.find((i) => i.id === id));
  },

  saveEdit() {
    const id   = $("editItemId").value;
    const name = $("editItemName").value.trim();
    if (!name) { showToast("Item name is required", "warning"); return; }

    DataStore.updateItem(id, {
      name,
      quantity: Math.max(1, parseInt($("editItemQuantity").value, 10) || 1),
      unit:     $("editItemUnit").value     || "",
      category: $("editItemCategory").value || "General",
      section:  $("editItemSection").value  || ""
    });
    this.closeEdit();
    showToast("Item updated", "success", 1500);
  },

  closeEdit() {
    const modal = $("editModal");
    if (modal.style.display === "none") return;
    modal.style.display = "none";
    if ($("settingsModal").style.display === "none") {
      $("modalOverlay").style.display = "none";
    }
  },

  /* ── completion banners ───────────────────────────────────────── */

  groupKey(item) {
    return item.category || "General";
  },

  detectCompletions() {
    const groups = {};
    this.items.forEach((item) => {
      const key = this.groupKey(item);
      groups[key] = groups[key] || { total: 0, done: 0 };
      groups[key].total++;
      if (item.completed) groups[key].done++;
    });
    const groupDone = {};
    Object.entries(groups).forEach(([k, g]) => {
      groupDone[k] = g.total > 0 && g.done === g.total;
    });
    const allDone = this.items.length > 0 && this.items.every((i) => i.completed);

    if (this._prevGroupDone !== null) {
      if (allDone && !this._prevAllDone) {
        showBanner("🎉 All Done!");
      } else if (!allDone) {
        const newlyDone = Object.keys(groupDone).find(
          (k) => groupDone[k] && this._prevGroupDone[k] === false
        );
        if (newlyDone) showBanner(`✅ ${newlyDone} — Done!`);
      }
    }
    this._prevGroupDone = groupDone;
    this._prevAllDone   = allDone;
  },

  /* ── filters ──────────────────────────────────────────────────── */

  setFilter(value) {
    this.filter = value;
    this.render();
  },

  renderFilters() {
    const sections = [...new Set(this.items.map((i) => i.section || "").filter(Boolean))].sort();
    if (this.filter !== "all" && !sections.includes(this.filter)) this.filter = "all";

    document.querySelector('.filter-btn[data-filter="all"]')
      .classList.toggle("active", this.filter === "all");

    $("categoryFilters").innerHTML = sections.map((sec) => `
      <button class="filter-btn ${this.filter === sec ? "active" : ""}"
              data-filter="${escapeHtml(sec)}">${escapeHtml(sec)}</button>
    `).join("");

    $("categoryFilters").querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => this.setFilter(btn.dataset.filter));
    });
  },

  /* ── rendering ────────────────────────────────────────────────── */

  render() {
    this.renderFilters();
    this.renderProgress();

    const container = $("itemsContainer");
    const visible = this.filter === "all"
      ? this.items
      : this.items.filter((i) => (i.section || "") === this.filter);

    if (visible.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <p>${this.items.length === 0
            ? "No items yet. Add some items to get started!"
            : "No items in this section."}</p>
        </div>`;
      return;
    }

    const groups = new Map();
    visible.forEach((item) => {
      const key = this.groupKey(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    container.innerHTML = [...groups.entries()].map(([key, items]) => {
      const done   = items.filter((i) => i.completed).length;
      const header = `
        <div class="group-header ${done === items.length ? "group-done" : ""}">
          <span class="group-title">${escapeHtml(key)}</span>
          <span class="group-count">${done}/${items.length}</span>
        </div>`;
      return header + items.map((item) => this.rowHtml(item)).join("");
    }).join("");

    container.querySelectorAll(".item-row").forEach((row) => {
      row.addEventListener("click", (e) => {
        if (e.target.closest(".item-edit-btn") || e.target.closest(".item-delete-btn")) return;
        this.toggle(row.dataset.id);
      });
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.toggle(row.dataset.id); }
      });
    });
    container.querySelectorAll(".item-delete-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.remove(btn.dataset.id, e));
    });
    container.querySelectorAll(".item-edit-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.edit(btn.dataset.id, e));
    });
  },

  rowHtml(item) {
    const qtyLabel = item.unit ? `${item.quantity} ${item.unit}` : String(item.quantity);
    const meta     = [item.category, item.section].filter(Boolean).join(" · ") || "General";
    return `
      <div class="item-row ${item.completed ? "completed" : ""}"
           data-id="${item.id}" tabindex="0" role="checkbox" aria-checked="${item.completed}"
           aria-label="${escapeHtml(item.name)}, ${escapeHtml(qtyLabel)}">
        <div class="item-row-actions">
          <button class="item-edit-btn"   data-id="${item.id}" aria-label="Edit ${escapeHtml(item.name)}">✏</button>
          <button class="item-delete-btn" data-id="${item.id}" aria-label="Delete ${escapeHtml(item.name)}">✕</button>
        </div>
        <div class="item-row-body">
          <div class="item-row-name">${escapeHtml(item.name)}</div>
          <div class="item-row-meta">${escapeHtml(meta)}${item.completed && item.completedBy ? ` · ✓ ${escapeHtml(item.completedBy)}` : ""}</div>
        </div>
        <div class="item-row-qty">${escapeHtml(qtyLabel)}</div>
        <div class="item-checkbox" aria-hidden="true"></div>
      </div>`;
  },

  renderProgress() {
    const total = this.items.length;
    const done  = this.items.filter((i) => i.completed).length;
    const pct   = total === 0 ? 0 : Math.round((done / total) * 100);
    $("progressFill").style.width  = pct + "%";
    $("progressCount").textContent = `${done} / ${total}`;
  }
};
