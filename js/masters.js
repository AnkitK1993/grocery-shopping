/**
 * Masters — tabular CRUD for Units, Sections, Categories, Areas, and Items.
 * Stored in Firestore at config/masters.
 * Data shape:
 *   { units:[{id,name}], sections:[{id,name}], categories:[{id,name}],
 *     areas:[{id,name}],
 *     items:[{id,name,category,unit,section,area}],
 *     _nextIds:{unit,section,category,area,item} }
 *
 * "section"  = store type (Supermarket, Online, etc.)
 * "category" = product category (Oils & Fats, etc.)
 * "area"     = physical shelf location within the store
 */
const Masters = {
  _data: { units: [], sections: [], categories: [], areas: [], items: [], _nextIds: {} },
  _unsub: null,

  /* ── defaults ───────────────────────────────────────────────────── */

  _defaults() {
    return {
      units: [
        {id:1,name:"kg"},{id:2,name:"g"},{id:3,name:"L"},{id:4,name:"mL"},
        {id:5,name:"packet"},{id:6,name:"bottle"},{id:7,name:"can"},
        {id:8,name:"piece"},{id:9,name:"bunch"},{id:10,name:"box"}
      ],
      sections: [
        {id:1,name:"Supermarket"},{id:2,name:"Online"},{id:3,name:"Local Market"}
      ],
      categories: [
        {id:1,name:"Oils & Fats"},{id:2,name:"Flours & Grains"},
        {id:3,name:"Rice"},{id:4,name:"Pulses & Legumes"},
        {id:5,name:"Spices"},{id:6,name:"Beverages"},
        {id:7,name:"Dry Snacks & Nuts"},{id:8,name:"Staples"},
        {id:9,name:"Sauces & Condiments"},{id:10,name:"Household & Cleaning"},
        {id:11,name:"Personal Care"}
      ],
      areas: [
        {id:1,name:"1st floor"},{id:2,name:"Left on Entry"},
        {id:3,name:"Near Masala"},{id:4,name:"Near Pulses"}
      ],
      items: [],
      _nextIds: { unit: 11, section: 4, category: 12, area: 5, item: 1 }
    };
  },

  /* ── migration from old data formats ───────────────────────────── */

  _needsMigration(data) {
    return !data || !data.units || !data.units.length ||
           typeof data.units[0] === "string";
  },

  _migrate(old) {
    let u = 1, s = 1;
    const units      = (old.units    || []).map(n => ({ id: u++, name: n }));
    const categories = (old.sections || []).map(n => ({ id: s++, name: n }));
    return {
      units, categories, items: [],
      sections: [{id:1,name:"Supermarket"},{id:2,name:"Online"},{id:3,name:"Local Market"}],
      areas: [{id:1,name:"1st floor"},{id:2,name:"Left on Entry"},
              {id:3,name:"Near Masala"},{id:4,name:"Near Pulses"}],
      _nextIds: { unit: u, section: 4, category: s, area: 5, item: 1 }
    };
  },

  /* ── lifecycle ──────────────────────────────────────────────────── */

  _ref() {
    return firebase.firestore().collection("config").doc("masters");
  },

  start() {
    if (!FIREBASE_ENABLED) {
      this._data = this._defaults();
      this._updateForms();
      return;
    }
    this._unsub = this._ref().onSnapshot(async (snap) => {
      if (!snap.exists) {
        await this._ref().set(this._defaults());
        return;
      }
      const data = snap.data();
      if (this._needsMigration(data)) {
        await this._ref().set(this._migrate(data));
        return;
      }

      const patch = {};
      if (data.areas && !data.sections) {
        patch.sections = data.areas;
        patch["_nextIds.section"] = ((data._nextIds || {}).area) || (data.areas.length + 1);
      } else if (!data.sections) {
        patch.sections = [{id:1,name:"Supermarket"},{id:2,name:"Online"},{id:3,name:"Local Market"}];
        patch["_nextIds.section"] = 4;
      }
      if (!data.categories) {
        patch.categories = [{id:1,name:"Oils & Fats"},{id:2,name:"Flours & Grains"},
          {id:3,name:"Rice"},{id:4,name:"Pulses & Legumes"},{id:5,name:"Spices"},
          {id:6,name:"Beverages"},{id:7,name:"Dry Snacks & Nuts"},{id:8,name:"Staples"},
          {id:9,name:"Sauces & Condiments"},{id:10,name:"Household & Cleaning"},
          {id:11,name:"Personal Care"}];
        patch["_nextIds.category"] = 12;
      }
      if (!data.areas) {
        patch.areas = [{id:1,name:"1st floor"},{id:2,name:"Left on Entry"},
                       {id:3,name:"Near Masala"},{id:4,name:"Near Pulses"}];
        patch["_nextIds.area"] = 5;
      }
      if (!data.items) {
        patch.items = [];
        patch["_nextIds.item"] = 1;
      }
      if (Object.keys(patch).length) { await this._ref().update(patch); return; }

      this._data = data;
      this._updateForms();
      const tab = $("masterTab");
      if (tab && tab.classList.contains("active")) this.render();
    }, err => console.error("masters:", err));
  },

  stop() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
  },

  /* ── public accessors ───────────────────────────────────────────── */

  getUnits()      { return (this._data.units      || []).map(u => u.name); },
  getSections()   { return (this._data.sections   || []).map(s => s.name); },
  getCategories() { return (this._data.categories || []).map(c => c.name); },
  getAreas()      { return (this._data.areas      || []).map(a => a.name); },
  getCatalogItems()         { return this._data.items || []; },
  getCatalogItemByName(name) {
    const lower = (name || "").trim().toLowerCase();
    return (this._data.items || []).find(i => i.name.toLowerCase() === lower) || null;
  },

  /* ── form population ────────────────────────────────────────────── */

  _updateForms() {
    this._fillSelect("itemUnit",        this.getUnits());
    this._fillSelect("editItemUnit",    this.getUnits());
    this._fillSelect("itemSection",     this.getSections());
    this._fillSelect("editItemSection", this.getSections());
    this._fillSelect("itemCategory",    this.getCategories());
    this._fillSelect("editItemCategory",this.getCategories());
  },

  _fillSelect(id, options) {
    const sel = $(id);
    if (!sel) return;
    const cur    = sel.value;
    const sorted = [...options].sort((a, b) => a.localeCompare(b));
    sel.innerHTML = `<option value="">—</option>` +
      sorted.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join("");
    if (sorted.includes(cur)) sel.value = cur;
  },

  /* ── ID helpers ─────────────────────────────────────────────────── */

  _nextId(type) {
    return (this._data._nextIds || {})[type] ||
           ((this._data[type + "s"] || []).length + 1);
  },

  /* ── CRUD — Units ───────────────────────────────────────────────── */

  async addUnit(name) {
    name = name.trim();
    if (!name || this._data.units.some(u => u.name === name)) return false;
    const id    = this._nextId("unit");
    const units = [...this._data.units, { id, name }];
    await this._ref().update({ units, "_nextIds.unit": id + 1 });
    return true;
  },
  async updateUnit(id, newName) {
    newName = newName.trim();
    if (!newName) return false;
    await this._ref().update({ units: this._data.units.map(u => u.id === id ? { ...u, name: newName } : u) });
    return true;
  },
  async deleteUnit(id) {
    await this._ref().update({ units: this._data.units.filter(u => u.id !== id) });
  },

  /* ── CRUD — Sections (store type) ───────────────────────────────── */

  async addSection(name) {
    name = name.trim();
    if (!name || (this._data.sections || []).some(s => s.name === name)) return false;
    const id       = this._nextId("section");
    const sections = [...(this._data.sections || []), { id, name }];
    await this._ref().update({ sections, "_nextIds.section": id + 1 });
    return true;
  },
  async updateSection(id, newName) {
    newName = newName.trim();
    if (!newName) return false;
    await this._ref().update({
      sections: (this._data.sections || []).map(s => s.id === id ? { ...s, name: newName } : s)
    });
    return true;
  },
  async deleteSection(id) {
    await this._ref().update({ sections: (this._data.sections || []).filter(s => s.id !== id) });
  },

  /* ── CRUD — Categories (product category) ────────────────────────── */

  async addCategory(name) {
    name = name.trim();
    if (!name || (this._data.categories || []).some(c => c.name === name)) return false;
    const id         = this._nextId("category");
    const categories = [...(this._data.categories || []), { id, name }];
    await this._ref().update({ categories, "_nextIds.category": id + 1 });
    return true;
  },
  async updateCategory(id, newName) {
    newName = newName.trim();
    if (!newName) return false;
    await this._ref().update({
      categories: (this._data.categories || []).map(c => c.id === id ? { ...c, name: newName } : c)
    });
    return true;
  },
  async deleteCategory(id) {
    await this._ref().update({ categories: (this._data.categories || []).filter(c => c.id !== id) });
  },

  /* ── CRUD — Areas (physical shelf location) ─────────────────────── */

  async addArea(name) {
    name = name.trim();
    if (!name || (this._data.areas || []).some(a => a.name === name)) return false;
    const id    = this._nextId("area");
    const areas = [...(this._data.areas || []), { id, name }];
    await this._ref().update({ areas, "_nextIds.area": id + 1 });
    return true;
  },
  async updateArea(id, newName) {
    newName = newName.trim();
    if (!newName) return false;
    await this._ref().update({
      areas: (this._data.areas || []).map(a => a.id === id ? { ...a, name: newName } : a)
    });
    return true;
  },
  async deleteArea(id) {
    await this._ref().update({ areas: (this._data.areas || []).filter(a => a.id !== id) });
  },

  /* ── CRUD — Catalog Items ───────────────────────────────────────── */

  async addCatalogItem(obj) {
    const name = (obj.name || "").trim();
    if (!name) return false;
    if ((this._data.items || []).some(i => i.name.toLowerCase() === name.toLowerCase())) return false;
    const id    = this._nextId("item");
    const items = [...(this._data.items || []), {
      id, name,
      category: obj.category || "",
      unit:     obj.unit     || "",
      section:  obj.section  || "",
      area:     obj.area     || ""
    }];
    await this._ref().update({ items, "_nextIds.item": id + 1 });
    return true;
  },
  async updateCatalogItem(id, patch) {
    const items = (this._data.items || []).map(i => i.id === id ? { ...i, ...patch } : i);
    await this._ref().update({ items });
    return true;
  },
  async deleteCatalogItem(id) {
    await this._ref().update({ items: (this._data.items || []).filter(i => i.id !== id) });
  },

  async seedFromChecklist(shopItems) {
    if (!FIREBASE_ENABLED) return;
    if ((this._data.items || []).length > 0) return;
    if (!shopItems || shopItems.length === 0) return;
    const seen = new Set();
    const catalog = [];
    let id = 1;
    shopItems.forEach(si => {
      const name = (si.name || "").trim();
      if (!name || seen.has(name.toLowerCase())) return;
      seen.add(name.toLowerCase());
      catalog.push({ id: id++, name,
        category: si.category || "",
        unit:     si.unit     || "",
        section:  si.section  || "",
        area:     si.area     || "" });
    });
    if (catalog.length === 0) return;
    await this._ref().update({ items: catalog, "_nextIds.item": id });
    showToast(`Imported ${catalog.length} items into catalog`, "success");
  },

  /* ── render ─────────────────────────────────────────────────────── */

  render() {
    const c = $("masterTabContent");
    if (!c) return;
    c.innerHTML =
      this._tblUnits() +
      this._tblSections() +
      this._tblCategories() +
      this._tblAreas() +
      this._tblItems();
    this._wire(c);
  },

  /* ── table builders ─────────────────────────────────────────────── */

  _collapsibleSection(title, bodyHtml) {
    return `
      <div class="master-section">
        <div class="master-section-hd">
          <h3>${title}</h3>
          <span class="ms-chevron"></span>
        </div>
        <div class="master-section-bd">
          ${bodyHtml}
        </div>
      </div>`;
  },

  _tblUnits() {
    const rows = (this._data.units || []).map((u, i) => `
      <tr data-id="${u.id}" data-type="unit">
        <td class="id-col">${i + 1}</td>
        <td class="name-col">${escapeHtml(u.name)}</td>
        <td class="act-col">
          <button class="mtbl-btn edit" title="Edit">✏</button>
          <button class="mtbl-btn delete" title="Delete">✕</button>
        </td>
      </tr>`).join("");
    const body = `
      <div class="master-table-wrap">
        <table class="master-table">
          <thead><tr><th>#</th><th>Name</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="add-row" data-type="unit">
              <td class="id-col">—</td>
              <td><input class="form-input add-name" placeholder="e.g. dozen" /></td>
              <td class="act-col"><button class="mtbl-btn save add-btn">+</button></td>
            </tr>
          </tfoot>
        </table>
      </div>`;
    return this._collapsibleSection("Units", body);
  },

  _tblSections() {
    const rows = (this._data.sections || []).map((s, i) => `
      <tr data-id="${s.id}" data-type="section">
        <td class="id-col">${i + 1}</td>
        <td class="name-col">${escapeHtml(s.name)}</td>
        <td class="act-col">
          <button class="mtbl-btn edit" title="Edit">✏</button>
          <button class="mtbl-btn delete" title="Delete">✕</button>
        </td>
      </tr>`).join("");
    const body = `
      <div class="master-table-wrap">
        <table class="master-table">
          <thead><tr><th>#</th><th>Name</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="add-row" data-type="section">
              <td class="id-col">—</td>
              <td><input class="form-input add-name" placeholder="e.g. Wholesale" /></td>
              <td class="act-col"><button class="mtbl-btn save add-btn">+</button></td>
            </tr>
          </tfoot>
        </table>
      </div>`;
    return this._collapsibleSection("Sections", body);
  },

  _tblCategories() {
    const rows = (this._data.categories || []).map((c, i) => `
      <tr data-id="${c.id}" data-type="category">
        <td class="id-col">${i + 1}</td>
        <td class="name-col">${escapeHtml(c.name)}</td>
        <td class="act-col">
          <button class="mtbl-btn edit" title="Edit">✏</button>
          <button class="mtbl-btn delete" title="Delete">✕</button>
        </td>
      </tr>`).join("");
    const body = `
      <div class="master-table-wrap">
        <table class="master-table">
          <thead><tr><th>#</th><th>Name</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="add-row" data-type="category">
              <td class="id-col">—</td>
              <td><input class="form-input add-name" placeholder="e.g. Frozen Foods" /></td>
              <td class="act-col"><button class="mtbl-btn save add-btn">+</button></td>
            </tr>
          </tfoot>
        </table>
      </div>`;
    return this._collapsibleSection("Categories", body);
  },

  _tblAreas() {
    const rows = (this._data.areas || []).map((a, i) => `
      <tr data-id="${a.id}" data-type="area">
        <td class="id-col">${i + 1}</td>
        <td class="name-col">${escapeHtml(a.name)}</td>
        <td class="act-col">
          <button class="mtbl-btn edit" title="Edit">✏</button>
          <button class="mtbl-btn delete" title="Delete">✕</button>
        </td>
      </tr>`).join("");
    const body = `
      <div class="master-table-wrap">
        <table class="master-table">
          <thead><tr><th>#</th><th>Name</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="add-row" data-type="area">
              <td class="id-col">—</td>
              <td><input class="form-input add-name" placeholder="e.g. Near Dairy" /></td>
              <td class="act-col"><button class="mtbl-btn save add-btn">+</button></td>
            </tr>
          </tfoot>
        </table>
      </div>`;
    return this._collapsibleSection("Areas", body);
  },

  _tblItems() {
    const catalog  = this._data.items || [];
    const unitOpts = this.getUnits().map(u =>
      `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join("");
    const sectOpts = this.getSections().map(s =>
      `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    const catOpts  = this.getCategories().map(c =>
      `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    const areaOpts = this.getAreas().map(a =>
      `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("");

    const importBtn = catalog.length === 0
      ? `<div class="master-import-hint">
           <p>Catalog is empty. You can import from the current shopping list.</p>
           <button class="btn btn-secondary btn-small" id="importFromListBtn">Import from Shopping List</button>
         </div>`
      : "";

    const rows = catalog.map((item, i) => `
      <tr data-id="${item.id}" data-type="item">
        <td class="id-col">${i + 1}</td>
        <td class="name-col">${escapeHtml(item.name)}</td>
        <td class="name-col">${escapeHtml(item.category || "—")}</td>
        <td class="name-col">${escapeHtml(item.unit     || "—")}</td>
        <td class="name-col">${escapeHtml(item.section  || "—")}</td>
        <td class="name-col">${escapeHtml(item.area     || "—")}</td>
        <td class="act-col">
          <button class="mtbl-btn edit" title="Edit">✏</button>
          <button class="mtbl-btn delete" title="Delete">✕</button>
        </td>
      </tr>`).join("");

    const body = `
      ${importBtn}
      <div class="master-table-wrap">
        <table class="master-table">
          <thead>
            <tr><th>#</th><th>Name</th><th>Category</th><th>Unit</th><th>Section</th><th>Area</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr class="add-row" data-type="item">
              <td class="id-col">—</td>
              <td><input class="form-input add-name" placeholder="Item name" /></td>
              <td><select class="form-input add-category">
                <option value="">Category…</option>${catOpts}
              </select></td>
              <td><select class="form-input add-unit">
                <option value="">—</option>${unitOpts}
              </select></td>
              <td><select class="form-input add-section">
                <option value="">—</option>${sectOpts}
              </select></td>
              <td><select class="form-input add-area">
                <option value="">—</option>${areaOpts}
              </select></td>
              <td class="act-col"><button class="mtbl-btn save add-btn">+</button></td>
            </tr>
          </tfoot>
        </table>
      </div>`;
    return this._collapsibleSection("Items", body);
  },

  /* ── wire events ────────────────────────────────────────────────── */

  _wire(c) {
    // Collapse / expand toggle (default collapsed — no ms-open class)
    c.querySelectorAll(".master-section-hd").forEach(hd => {
      hd.addEventListener("click", () => {
        hd.closest(".master-section").classList.toggle("ms-open");
      });
    });

    const importBtn = c.querySelector("#importFromListBtn");
    if (importBtn) {
      importBtn.addEventListener("click", () =>
        this.seedFromChecklist(typeof Checklist !== "undefined" ? Checklist.items : [])
      );
    }

    c.querySelectorAll(".mtbl-btn.edit").forEach(btn => {
      btn.addEventListener("click", e => { e.stopPropagation(); this._startEdit(btn.closest("tr")); });
    });

    c.querySelectorAll(".mtbl-btn.delete").forEach(btn => {
      btn.addEventListener("click", async e => {
        e.stopPropagation();
        const tr   = btn.closest("tr");
        const type = tr.dataset.type;
        const id   = Number(tr.dataset.id) || tr.dataset.id;
        const name = tr.querySelector(".name-col").textContent.trim();
        if (!confirm(`Delete "${name}"?`)) return;
        if      (type === "unit")     await this.deleteUnit(id);
        else if (type === "section")  await this.deleteSection(id);
        else if (type === "category") await this.deleteCategory(id);
        else if (type === "area")     await this.deleteArea(id);
        else if (type === "item")     await this.deleteCatalogItem(id);
        showToast(`Deleted "${name}"`, "info", 1500);
      });
    });

    c.querySelectorAll(".add-btn").forEach(btn => {
      btn.addEventListener("click", () => this._addRow(btn.closest("tr")));
    });
    c.querySelectorAll(".add-name").forEach(inp => {
      inp.addEventListener("keydown", e => {
        if (e.key === "Enter") inp.closest("tr").querySelector(".add-btn").click();
      });
    });
  },

  async _addRow(tr) {
    const type = tr.dataset.type;
    const name = (tr.querySelector(".add-name") || {}).value || "";

    if (type === "unit") {
      if (!await this.addUnit(name)) { showToast("Already exists or empty", "info"); return; }
    } else if (type === "section") {
      if (!await this.addSection(name)) { showToast("Already exists or empty", "info"); return; }
    } else if (type === "category") {
      if (!await this.addCategory(name)) { showToast("Already exists or empty", "info"); return; }
    } else if (type === "area") {
      if (!await this.addArea(name)) { showToast("Already exists or empty", "info"); return; }
    } else if (type === "item") {
      if (!name.trim()) { showToast("Enter item name", "warning"); return; }
      const category = tr.querySelector(".add-category").value;
      const unit     = tr.querySelector(".add-unit").value;
      const section  = tr.querySelector(".add-section").value;
      const area     = tr.querySelector(".add-area").value;
      if (!await this.addCatalogItem({ name: name.trim(), category, unit, section, area })) {
        showToast("Item already exists in catalog", "info"); return;
      }
      tr.querySelector(".add-name").value = "";
      showToast(`Added "${name.trim()}" to catalog`, "success", 1500);
      return;
    }

    tr.querySelector(".add-name").value = "";
    showToast(`Added "${name.trim()}"`, "success", 1000);
  },

  /* ── inline edit ────────────────────────────────────────────────── */

  _startEdit(tr) {
    const type  = tr.dataset.type;
    const id    = Number(tr.dataset.id) || tr.dataset.id;
    const cells = tr.querySelectorAll(".name-col");

    if (type === "item") { this._startItemEdit(tr, id, cells); return; }

    cells[0].innerHTML =
      `<input class="form-input inline-edit-input" value="${escapeHtml(cells[0].textContent.trim())}" />`;

    const actCell = tr.querySelector(".act-col");
    actCell.innerHTML =
      `<button class="mtbl-btn save inline-save">✓</button>
       <button class="mtbl-btn cancel inline-cancel">✕</button>`;

    const save = async () => {
      const newName = tr.querySelector(".inline-edit-input").value.trim();
      let ok = false;
      if      (type === "unit")     ok = await this.updateUnit(id, newName);
      else if (type === "section")  ok = await this.updateSection(id, newName);
      else if (type === "category") ok = await this.updateCategory(id, newName);
      else if (type === "area")     ok = await this.updateArea(id, newName);
      if (ok) showToast("Saved", "success", 1000);
    };

    tr.querySelector(".inline-save").addEventListener("click", save);
    tr.querySelector(".inline-cancel").addEventListener("click", () => this.render());
    tr.querySelector(".inline-edit-input").addEventListener("keydown", e => {
      if (e.key === "Enter") save();
      if (e.key === "Escape") this.render();
    });
    tr.querySelector(".inline-edit-input").focus();
  },

  _startItemEdit(tr, id, cells) {
    const item = (this._data.items || []).find(i => i.id === id);
    if (!item) return;

    const catOpts  = this.getCategories().map(c =>
      `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
    const unitOpts = this.getUnits().map(u =>
      `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join("");
    const sectOpts = this.getSections().map(s =>
      `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join("");
    const areaOpts = this.getAreas().map(a =>
      `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join("");

    // cells: 0=name, 1=category, 2=unit, 3=section, 4=area
    cells[0].innerHTML = `<input class="form-input inline-edit-input" value="${escapeHtml(item.name)}" />`;
    cells[1].innerHTML = `<select class="form-input ie-cat"><option value="">—</option>${catOpts}</select>`;
    cells[2].innerHTML = `<select class="form-input ie-unit"><option value="">—</option>${unitOpts}</select>`;
    cells[3].innerHTML = `<select class="form-input ie-sect"><option value="">—</option>${sectOpts}</select>`;
    cells[4].innerHTML = `<select class="form-input ie-area"><option value="">—</option>${areaOpts}</select>`;

    tr.querySelector(".ie-cat").value  = item.category || "";
    tr.querySelector(".ie-unit").value = item.unit     || "";
    tr.querySelector(".ie-sect").value = item.section  || "";
    tr.querySelector(".ie-area").value = item.area     || "";

    const actCell = tr.querySelector(".act-col");
    actCell.innerHTML =
      `<button class="mtbl-btn save inline-save">✓</button>
       <button class="mtbl-btn cancel inline-cancel">✕</button>`;

    const save = async () => {
      const newName = tr.querySelector(".inline-edit-input").value.trim();
      if (!newName) { showToast("Name required", "warning"); return; }
      await this.updateCatalogItem(id, {
        name:     newName,
        category: tr.querySelector(".ie-cat").value,
        unit:     tr.querySelector(".ie-unit").value,
        section:  tr.querySelector(".ie-sect").value,
        area:     tr.querySelector(".ie-area").value
      });
      showToast("Saved", "success", 1000);
    };

    tr.querySelector(".inline-save").addEventListener("click", save);
    tr.querySelector(".inline-cancel").addEventListener("click", () => this.render());
    tr.querySelector(".inline-edit-input").addEventListener("keydown", e => {
      if (e.key === "Enter") save();
      if (e.key === "Escape") this.render();
    });
    tr.querySelector(".inline-edit-input").focus();
  }
};
