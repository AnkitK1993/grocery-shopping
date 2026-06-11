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
  apiKey: "",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:0000000000000000000000"
};

/** Both family members share this list. Change to keep separate lists. */
const SHARED_LIST_ID = "family-list";

/** True when a real Firebase config has been provided. */
const FIREBASE_ENABLED = Boolean(FIREBASE_CONFIG.apiKey);
