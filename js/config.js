/**
 * Grocery Shopping — configuration.
 *
 * To enable real-time sync between devices, paste your Firebase project
 * config below (Firebase Console → Project settings → Your apps → Web app)
 * and enable Email/Password + Google sign-in under Authentication, plus
 * the Realtime Database.
 *
 * If apiKey is left empty the app runs in OFFLINE DEMO MODE:
 * data is kept in localStorage and synced across tabs of the same
 * browser via BroadcastChannel, so every feature is still testable.
 */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD7KCyX-YwpSu-0njbmwwzMBS0SGaWGzvs",
  authDomain: "grocery-shopping-5d3e2.firebaseapp.com",
  databaseURL: "https://grocery-shopping-5d3e2-default-rtdb.firebaseio.com",
  projectId: "grocery-shopping-5d3e2",
  storageBucket: "grocery-shopping-5d3e2.firebasestorage.app",
  messagingSenderId: "96114243346",
  appId: "1:96114243346:web:b91618027b7b798ae025cb",
  measurementId: "G-PK7VXE0R34"
};

/** Both family members share this list. Change to keep separate lists. */
const SHARED_LIST_ID = "family-list";

/**
 * Access control: only these emails may use the app (case-insensitive).
 * Add your dad's email here later. Leave the array empty to allow anyone.
 * NOTE: also mirror this list in the Realtime Database rules (see README)
 * so it is enforced server-side, not just in the UI.
 */
/** The one account that can always sign in and manage access for others. */
const ADMIN_EMAIL = "ankit.konchady@gmail.com";

const ALLOWED_EMAILS = [ADMIN_EMAIL];

/** When true (and Firebase is enabled), hide the email/password form so
 *  Google sign-in is the only way in. */
const GOOGLE_SIGNIN_ONLY = true;

/** True when a real Firebase config has been provided. */
const FIREBASE_ENABLED = Boolean(FIREBASE_CONFIG.apiKey);
