/**
 * Expense logging: save the final bill at the end of a trip, view past
 * expenses, and keep a trip history (items bought + bill amount).
 */
const Expenses = {
  expenses: [],
  history: [],

  init() {
    $("saveBillBtn").addEventListener("click", () => this.saveBill());

    DataStore.onExpenses((list) => {
      this.expenses = list;
      this.renderExpenses();
    });
    DataStore.onHistory((list) => {
      this.history = list;
      this.renderHistory();
    });
  },

  saveBill() {
    const amount = parseFloat($("billAmount").value);
    if (!amount || amount <= 0) {
      showToast("Enter a valid bill amount", "error");
      return;
    }
    const notes = $("billNotes").value.trim();

    DataStore.addExpense({
      amount,
      notes,
      by: Auth.user ? Auth.user.name : "unknown"
    });

    // Snapshot the trip into history
    const total = Checklist.items.length;
    const done = Checklist.items.filter((i) => i.completed).length;
    DataStore.addHistory({
      totalItems: total,
      completedItems: done,
      bill: amount,
      notes
    });

    $("billAmount").value = "";
    $("billNotes").value = "";
    haptic([40, 30, 40]);
    showToast(`Bill of ${formatCurrency(amount)} saved!`, "success");
  },

  renderExpenses() {
    const container = $("expensesList");
    if (this.expenses.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>No expenses logged yet.</p></div>`;
      return;
    }
    const totalSpent = this.expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const rows = [...this.expenses].reverse().map((e) => `
      <div class="expense-item">
        <div class="expense-info">
          <div class="expense-amount">${formatCurrency(e.amount)}</div>
          <div class="expense-date">${formatDate(e.at)} · by ${escapeHtml(e.by || "unknown")}</div>
          ${e.notes ? `<div class="expense-notes">${escapeHtml(e.notes)}</div>` : ""}
        </div>
      </div>`).join("");

    container.innerHTML = `
      <div class="expense-item" style="border-left-color: var(--success-color);">
        <div class="expense-info">
          <div class="expense-date">Total spent (${this.expenses.length} trips)</div>
          <div class="expense-amount">${formatCurrency(totalSpent)}</div>
        </div>
      </div>
      ${rows}`;
  },

  renderHistory() {
    const container = $("historyList");
    if (this.history.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>No history yet. Complete your first shopping trip!</p></div>`;
      return;
    }
    container.innerHTML = [...this.history].reverse().map((h) => `
      <div class="history-item">
        <div class="history-date">${formatDate(h.at)}</div>
        <div class="history-stats">
          <div class="stat-item">
            <div class="stat-label">Items</div>
            <div class="stat-value">${h.completedItems}/${h.totalItems}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Bill</div>
            <div class="stat-value">${formatCurrency(h.bill)}</div>
          </div>
        </div>
        ${h.notes ? `<div class="expense-notes">${escapeHtml(h.notes)}</div>` : ""}
      </div>`).join("");
  }
};
