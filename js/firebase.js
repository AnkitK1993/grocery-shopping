/**
 * DataStore — single real-time data layer for the whole app.
 *
 * Firebase mode : Firestore under lists/{SHARED_LIST_ID}/items|expenses|history
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
  _unsubs: [],
  _channel: null,

  onItems(cb) { this._itemsCb = cb; },
  onExpenses(cb) { this._expensesCb = cb; },
  onHistory(cb) { this._historyCb = cb; },

  /* ---------- lifecycle ---------- */

  start() {
    if (FIREBASE_ENABLED) {
      const listen = (name, cb, trackSync) => {
        const unsub = this._col(name).onSnapshot(
          (snap) => {
            if (trackSync) setSyncStatus(!snap.metadata.fromCache);
            cb(this._fromSnap(snap));
          },
          (err) => console.error(name, err)
        );
        this._unsubs.push(unsub);
      };
      listen("items",    (list) => this._itemsCb(list),    true);
      listen("expenses", (list) => this._expensesCb(list), false);
      listen("history",  (list) => this._historyCb(list),  false);
    } else {
      this._channel = new BroadcastChannel("gs-sync");
      this._channel.onmessage = () => this._emitLocal();
      this._emitLocal();
      setSyncStatus(true, "Demo mode (local)");
    }
  },

  stop() {
    if (FIREBASE_ENABLED) {
      this._unsubs.forEach((unsub) => unsub());
      this._unsubs = [];
    } else if (this._channel) {
      this._channel.close();
      this._channel = null;
    }
  },

  /* ---------- items ---------- */

  addItem(item) {
    item.id = uid();
    item.createdAt = Date.now();
    if (FIREBASE_ENABLED) {
      this._col("items").doc(item.id).set(item);
    } else {
      const data = this._localRead();
      data.items[item.id] = item;
      this._localWrite(data);
    }
  },

  updateItem(id, patch) {
    if (FIREBASE_ENABLED) {
      this._col("items").doc(id).update(patch);
    } else {
      const data = this._localRead();
      if (data.items[id]) Object.assign(data.items[id], patch);
      this._localWrite(data);
    }
  },

  deleteItem(id) {
    if (FIREBASE_ENABLED) {
      this._col("items").doc(id).delete();
    } else {
      const data = this._localRead();
      delete data.items[id];
      this._localWrite(data);
    }
  },

  clearItems() {
    if (FIREBASE_ENABLED) {
      this._batchDelete("items");
    } else {
      const data = this._localRead();
      data.items = {};
      this._localWrite(data);
    }
  },

  /* ---------- expenses & history ---------- */

  addExpense(expense) {
    expense.id = uid();
    expense.at = Date.now();
    if (FIREBASE_ENABLED) {
      this._col("expenses").doc(expense.id).set(expense);
    } else {
      const data = this._localRead();
      data.expenses[expense.id] = expense;
      this._localWrite(data);
    }
  },

  addHistory(entry) {
    entry.id = uid();
    entry.at = Date.now();
    if (FIREBASE_ENABLED) {
      this._col("history").doc(entry.id).set(entry);
    } else {
      const data = this._localRead();
      data.history[entry.id] = entry;
      this._localWrite(data);
    }
  },

  clearAll() {
    if (FIREBASE_ENABLED) {
      this._batchDelete("items");
      this._batchDelete("expenses");
      this._batchDelete("history");
    } else {
      this._localWrite({ items: {}, expenses: {}, history: {} });
    }
  },

  /* ---------- internals ---------- */

  _col(name) {
    return firebase.firestore()
      .collection("lists").doc(SHARED_LIST_ID).collection(name);
  },

  _batchDelete(name) {
    this._col(name).get().then((snap) => {
      const batch = firebase.firestore().batch();
      snap.docs.forEach((d) => batch.delete(d.ref));
      return batch.commit();
    });
  },

  _fromSnap(snap) {
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.createdAt || a.at || 0) - (b.createdAt || b.at || 0));
  },

  _toList(obj) {
    return obj
      ? Object.values(obj).sort((a, b) => (a.createdAt || a.at || 0) - (b.createdAt || b.at || 0))
      : [];
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
