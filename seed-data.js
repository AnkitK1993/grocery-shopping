/**
 * ONE-TIME SEED SCRIPT
 * Adds the initial grocery list to Firestore.
 * Remove the <script> tag in index.html once items appear in the app.
 */
(function seedOnce() {
  let seeded = false;

  Auth.onChange(async (user) => {
    if (!user || !FIREBASE_ENABLED || seeded) return;
    seeded = true;

    const col = firebase.firestore()
      .collection("lists").doc(SHARED_LIST_ID).collection("items");

    const existing = await col.limit(1).get();
    if (!existing.empty) {
      console.log("[seed] Items already exist — skipping.");
      return;
    }

    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    let t = Date.now();
    const item = (name, quantity, unit, category, subcategory = "") => ({
      id: uid(), name, quantity, unit, category, subcategory,
      completed: false,
      createdBy: user.name || "Ankit",
      createdAt: (t += 10)
    });

    const items = [
      /* ── Oils & Fats ─────────────────────────────────────────── */
      item("Saffola Rice Bran Oil (non-refined)", 5,   "L",      "Oils & Fats"),
      item("Teel Oil",                            1,   "bottle", "Oils & Fats"),
      item("Parachute Coconut Oil",               1,   "bottle", "Oils & Fats"),
      item("Gowardhan Ghee",                      1,   "kg",     "Oils & Fats"),
      item("Gowardhan Ghee",                      500, "g",      "Oils & Fats"),

      /* ── Flours & Grains ──────────────────────────────────────── */
      item("Jowar Atta",    1,   "kg", "Flours & Grains"),
      item("Nachni Atta",   1,   "kg", "Flours & Grains"),
      item("Rice Atta",     1,   "kg", "Flours & Grains"),
      item("Besan",         1,   "kg", "Flours & Grains"),
      item("Rawa",          500, "g",  "Flours & Grains"),
      item("Lapsi (coarse)",1,   "kg", "Flours & Grains"),

      /* ── Rice ────────────────────────────────────────────────── */
      item("Rice (loose)",    10, "kg", "Rice"),
      item("Wada Kolam Rice",  5, "kg", "Rice"),

      /* ── Pulses & Legumes › Dals ─────────────────────────────── */
      item("Toor Dal",       500, "g",  "Pulses & Legumes", "Dals"),
      item("Moong Dal (split)", 500, "g", "Pulses & Legumes", "Dals"),
      item("Urad Dal",         1,   "kg", "Pulses & Legumes", "Dals"),

      /* ── Pulses & Legumes › Whole Pulses ─────────────────────── */
      item("Moong (whole green)", 1,   "kg", "Pulses & Legumes", "Whole Pulses"),
      item("Kabuli Chana",        1,   "kg", "Pulses & Legumes", "Whole Pulses"),
      item("Horsegram",         500,   "g",  "Pulses & Legumes", "Whole Pulses"),
      item("Rajma",             500,   "g",  "Pulses & Legumes", "Whole Pulses"),
      item("Green Vatana",      500,   "g",  "Pulses & Legumes", "Whole Pulses"),
      item("Black Vatana",      500,   "g",  "Pulses & Legumes", "Whole Pulses"),
      item("Akkha Masoor",      500,   "g",  "Pulses & Legumes", "Whole Pulses"),
      item("Matki",             500,   "g",  "Pulses & Legumes", "Whole Pulses"),
      item("Soya Bean",         500,   "g",  "Pulses & Legumes", "Whole Pulses"),
      item("Sabudana",          500,   "g",  "Pulses & Legumes", "Whole Pulses"),

      /* ── Spices ──────────────────────────────────────────────── */
      item("Jeera",                  1,   "packet", "Spices"),
      item("Haldi Powder",           1,   "packet", "Spices"),
      item("Coriander Seeds",      500,   "g",      "Spices"),
      item("Bedgi Mirchi (dry)",     3,   "packet", "Spices"),
      item("Guntur Mirchi (dry)",    1,   "packet", "Spices"),
      item("Hing",                   1,   "packet", "Spices"),
      item("Rai",                    1,   "packet", "Spices"),

      /* ── Beverages ───────────────────────────────────────────── */
      item("Waghbakri Chai",              250, "g",   "Beverages"),
      item("Tata Grande Coffee (blue)",   200, "g",   "Beverages"),
      item("Kokum Syrup",                   1, "can", "Beverages"),

      /* ── Dry Snacks & Nuts ───────────────────────────────────── */
      item("Peanuts (raw)",   500, "g",      "Dry Snacks & Nuts"),
      item("Dry Coconut",       1, "packet", "Dry Snacks & Nuts"),
      item("Dry Fruits Mix",    1, "packet", "Dry Snacks & Nuts"),
      item("Marie Biscuits",    1, "packet", "Dry Snacks & Nuts"),

      /* ── Staples ─────────────────────────────────────────────── */
      item("Sugar",     2, "kg", "Staples"),
      item("Tata Salt", 1, "kg", "Staples"),

      /* ── Sauces & Condiments ─────────────────────────────────── */
      item("Del Monte Tomato Ketchup (refill)", 1, "packet", "Sauces & Condiments"),
      item("Hot & Sweet Tomato Ketchup (small)", 1, "bottle", "Sauces & Condiments"),

      /* ── Household & Cleaning ────────────────────────────────── */
      item("Vim Liquid (refill pack)",                1, "packet", "Household & Cleaning"),
      item("Wheel Detergent Powder — Floral (small)", 1, "packet", "Household & Cleaning"),
      item("Fabric Softener (small)",                 1, "bottle", "Household & Cleaning"),
      item("Toilet Pot Fragrance",                    1, "piece",  "Household & Cleaning"),
      item("Garbage Bags — Black & Green, Medium (19×21)", 1, "packet", "Household & Cleaning"),
      item("Agarbatti",                               1, "packet", "Household & Cleaning"),
      item("Tissue Packets",                          1, "packet", "Household & Cleaning"),

      /* ── Personal Care ───────────────────────────────────────── */
      item("Dabur Activated Charcoal Toothpaste", 1, "piece",  "Personal Care"),
      item("Shampoo (Ankit)",                     1, "bottle", "Personal Care"),
      item("Head & Shoulders Shampoo (small)",    1, "bottle", "Personal Care"),
      item("Dove Anti-Hairfall Conditioner (small)", 1, "bottle", "Personal Care"),
    ];

    console.log(`[seed] Writing ${items.length} items…`);
    const db = firebase.firestore();
    const batch = db.batch();
    items.forEach((it) => batch.set(col.doc(it.id), it));
    await batch.commit();
    console.log(`[seed] ✅ Done — ${items.length} items added.`);
  });
})();
