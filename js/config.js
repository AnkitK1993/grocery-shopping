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

/** True when a real Firebase config has been provided. */
const FIREBASE_ENABLED = Boolean(FIREBASE_CONFIG.apiKey);
