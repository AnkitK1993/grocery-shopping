# 🛒 Grocery Shopping

A collaborative, real-time shopping checklist + expense logger built with plain HTML, CSS and JavaScript. Designed for two people (e.g. you and your dad) shopping together at a large store like DMart — when one person checks off an item, it instantly checks off on the other person's phone.

## Features

- **Real-time sync** — Firebase Realtime Database keeps every device's list in sync instantly.
- **Authentication** — Email/password and Google sign-in (Firebase Auth). Both accounts share one family list.
- **Checklist items** — Product name, quantity, optional section/category, and floor.
- **Categorized grid** — Items are displayed in a touch-friendly grid, grouped by section + floor, with per-section progress counts and category filter chips.
- **Tap to check off** — Tap a card to mark it done; shows who checked it.
- **Completion banners** — A 2-second animated banner fires when a section finishes ("Section Completed!") or the whole list is done ("All Done!") — on *both* devices.
- **Expense logging** — Enter the final bill at the end of the trip; running total, notes, and trip history are saved.
- **Themes** — Light, Dark, and a Matrix theme (neon green on black) with 5 accent colors.
- **Accessibility** — Settings controls to scale the global font size (80–150%) and zoom the whole screen, large 44px touch targets, ARIA roles, reduced-motion support.
- **Offline demo mode** — With no Firebase config the app runs entirely on localStorage and still "syncs" across browser tabs via BroadcastChannel, so you can try everything immediately.

## Quick start (demo mode)

Just open `index.html` in a browser — or serve it:

```bash
npx serve .
# or
python -m http.server 8000
```

Open the URL on your phone (same Wi-Fi) or in two browser tabs to see the cross-tab sync.

## Enabling real Firebase sync

1. Create a project at [console.firebase.google.com](https://console.firebase.google.com).
2. **Authentication → Sign-in method**: enable *Email/Password* and *Google*.
3. **Realtime Database**: create a database, start in locked mode, then set rules.
   These rules restrict access to the allowed account(s) — keep them in sync
   with `ALLOWED_EMAILS` in `js/config.js`:
   ```json
   {
     "rules": {
       "lists": {
         "$listId": {
           ".read": "auth != null && auth.token.email === 'ankit.konchady@gmail.com'",
           ".write": "auth != null && auth.token.email === 'ankit.konchady@gmail.com'"
         }
       }
     }
   }
   ```
   To allow a second person (e.g. your dad), change both rules to:
   ```
   "auth != null && (auth.token.email === 'ankit.konchady@gmail.com' || auth.token.email === 'dad@example.com')"
   ```
   and add the email to `ALLOWED_EMAILS` in `js/config.js`.
4. **Project settings → Your apps → Web app**: register an app and copy the config object.
5. Paste the config into `js/config.js` (`FIREBASE_CONFIG`). The presence of an `apiKey` automatically switches the app from demo mode to Firebase mode.
6. Deploy anywhere static (Firebase Hosting, GitHub Pages, Netlify) and have both phones sign in — you'll share the `family-list` defined by `SHARED_LIST_ID` in `js/config.js`.

## Project structure

```
index.html              App shell (auth, tabs, settings modal)
css/styles.css          Core mobile-first styles
css/themes.css          Accent colors + Matrix theme
css/accessibility.css   Font scaling, zoom, focus, touch targets
js/config.js            Firebase config + shared list id
js/utils.js             Toasts, banner, sound, haptics, formatting
js/themes.js            Theme/accent manager
js/accessibility.js     Font size + zoom controls
js/auth.js              Firebase auth with offline demo fallback
js/firebase.js          DataStore: RTDB or localStorage+BroadcastChannel
js/checklist.js         Grouped grid, check-off, completion banners
js/expenses.js          Bill logging + trip history
js/app.js               Bootstrap, tabs, settings
```

## Tech notes

- No build step, no dependencies — Firebase is loaded from the CDN (compat builds).
- Optimized for phones: bottom-sheet modals, sticky header, thumb-sized targets, safe-area viewport.
- Haptics use `navigator.vibrate` (Android); completion sounds are synthesized with WebAudio (no audio files).
