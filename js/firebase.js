/**
 * DataStore — single real-time data layer for the whole app.
 *
 * Firebase mode : Realtime Database under lists/{SHARED_LIST_ID}/...
 *                 Every connected device gets instant updates.
 * Demo mode     : localStorage + BroadcastChannel, so two browser tabs
 *                 on the same machine still sync in real time.
 *
 * Data shape:
 *   items/{id}    = { id, name, quantity, category, floor, completed,
 *                     completedBy, createdBy, createdAt }
 *   expenses/{id} = { id, amount, notes, by, at }
 *   history/{id}  = { id, at, totalItems, completedItems, bill }
 */
const DataStore = {
  _itemsCb: () => {},
  _expensesCb: () => {},
  _historyCb: () => {},
  _channel: null,

  onItems(cb) { this._itemsCb = cb; },
  onExpenses(cb) { this._expensesCb = cb; },
  onHistory(cb) { this._historyCb = cb; },

  /* ---------- lifecycle ---------- */

  start() {
    if (FIREBASE_ENABLED) {
      this._ref("items").on("value", (snap) => this._itemsCb(this._toList(snap.val())));
      this._ref("expenses").on("value", (snap) => this._expensesCb(this._toList(snap.val())));
      this._ref("history").on("value", (snap) => this._historyCb(this._toList(snap.val())));

      firebase.database().ref(".info/connected").on("value", (snap) => {
        setSyncStatus(snap.val() === true);
      });
    } else {
      this._channel = new BroadcastChannel("gs-sync");
      this._channel.onmessage = () => this._emitLocal();
      this._emitLocal();
      setSyncStatus(true, "Demo mode (local)");
    }
  },

  stop() {
    if (FIREBASE_ENABLED) {
      this._ref("items").off();
      this._ref("expenses").off();
      this._ref("history").off();
    } else if (this._channel) {
      this._channel.close();
      this._channel = null;
    }
  },

  /* ---------- items ---------- */

  addItem(item) {
    item.id = uid();
    item.createdAt = Date.now();
    this._set(`items/${item.id}`, item);
  },

  updateItem(id, patch) {
    if (FIREBASE_ENABLED) {
      this._ref(`items/${id}`).update(patch);
    } else {
      const data = this._localRead();
      if (data.items[id]) Object.assign(data.items[id], patch);
      this._localWrite(data);
    }
  },

  deleteItem(id) {
    this._set(`items/${id}`, null);
  },

  clearItems() {
    this._set("items", null);
  },

  /* ---------- expenses & history ---------- */

  addExpense(expense) {
    expense.id = uid();
    expense.at = Date.now();
    this._set(`expenses/${expense.id}`, expense);
  },

  addHistory(entry) {
    entry.id = uid();
    entry.at = Date.now();
    this._set(`history/${entry.id}`, entry);
  },

  clearAll() {
    if (FIREBASE_ENABLED) {
      this._ref("").set(null);
    } else {
      this._localWrite({ items: {}, expenses: {}, history: {} });
    }
  },

  /* ---------- internals ---------- */

  _ref(path) {
    return firebase.database().ref(`lists/${SHARED_LIST_ID}/${path}`);
  },

  _set(path, value) {
    if (FIREBASE_ENABLED) {
      this._ref(path).set(value);
    } else {
      const data = this._localRead();
      const [bucket, id] = path.split("/");
      if (id === undefined) {
        data[bucket] = value === null ? {} : value;
      } else if (value === null) {
        delete data[bucket][id];
      } else {
        data[bucket][id] = value;
      }
      this._localWrite(data);
    }
  },

  _toList(obj) {
    return obj ? Object.values(obj).sort((a, b) => (a.createdAt || a.at || 0) - (b.createdAt || b.at || 0)) : [];
  },

  _localRead() {
    try {
      return JSON.parse(localStorage.getItem("gs-data")) || { items: {}, expenses: {}, history: {} };
    } catch {
      return { items: {}, expenses: {}, history: {} };
    }
  },

  _localWrite(data) {
    localStorage.setItem("gs-data", JSON.stringify(data));
    if (this._channel) this._channel.postMessage("changed");
    this._emitLocal();
  },

  _emitLocal() {
    const data = this._localRead();
    this._itemsCb(this._toList(data.items));
    this._expensesCb(this._toList(data.expenses));
    this._historyCb(this._toList(data.history));
  }
};

/** Header sync indicator */
function setSyncStatus(online, label) {
  const dot = $("syncIndicator");
  const text = $("syncText");
  dot.classList.toggle("online", online);
  dot.classList.toggle("offline", !online);
  text.textContent = label || (online ? "Connected" : "Offline — changes will sync");
}
