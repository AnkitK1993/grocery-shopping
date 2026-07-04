/**
 * Authentication: Firebase email/password + Google sign-in when configured,
 * otherwise a local demo sign-in so the app is fully usable offline.
 *
 * The allowlist is stored in Firestore at config/access { allowedEmails: [...] }
 * and kept in sync live. ADMIN_EMAIL is always allowed regardless.
 */
const Auth = {
  user: null,
  _listeners: [],
  _allowedEmails: [...ALLOWED_EMAILS],
  _accessUnsub: null,

  onChange(cb) {
    this._listeners.push(cb);
  },

  _emit() {
    this._listeners.forEach((cb) => cb(this.user));
  },

  isAllowed(email) {
    const normalized = String(email || "").toLowerCase();
    return this._allowedEmails.some((e) => e.toLowerCase() === normalized);
  },

  isAdmin(email) {
    return String(email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase();
  },

  /* ---------- access list (Firestore) ---------- */

  _accessRef() {
    return firebase.firestore().collection("config").doc("access");
  },

  _startAccessListener() {
    this._accessUnsub = this._accessRef().onSnapshot(
      (snap) => {
        const data = snap.data();
        this._allowedEmails =
          data && data.allowedEmails && data.allowedEmails.length
            ? data.allowedEmails
            : [ADMIN_EMAIL];

        // Kick out anyone whose access was just revoked
        if (this.user && !this.isAllowed(this.user.email)) {
          showToast("Your access has been revoked", "error", 4000);
          firebase.auth().signOut();
        }
      },
      () => {
        // On permission error fall back to hardcoded list
        this._allowedEmails = [...ALLOWED_EMAILS];
      }
    );
  },

  getAccessList() {
    return [...this._allowedEmails];
  },

  async saveAccessList(emails) {
    const list = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
    // Always keep the admin in the list
    if (!list.includes(ADMIN_EMAIL.toLowerCase())) {
      list.unshift(ADMIN_EMAIL.toLowerCase());
    }
    await this._accessRef().set({ allowedEmails: list });
  },

  /* ---------- init ---------- */

  init() {
    if (FIREBASE_ENABLED) {
      this._startAccessListener();

      if (GOOGLE_SIGNIN_ONLY) {
        document.querySelector(".auth-form").style.display = "none";
        document.querySelector(".auth-divider").style.display = "none";
        document.querySelector(".auth-footer").textContent =
          "Sign in with the family Google account to continue.";
      }

      firebase.auth().onAuthStateChanged((fbUser) => {
        if (fbUser && !this.isAllowed(fbUser.email)) {
          showToast(`${fbUser.email} is not authorized to use this app`, "error", 4000);
          firebase.auth().signOut();
          this.user = null;
          this._emit();
          return;
        }
        this.user = fbUser
          ? { uid: fbUser.uid, name: fbUser.displayName || fbUser.email, email: fbUser.email }
          : null;
        this._emit();
      });
    } else {
      const saved = localStorage.getItem("gs-demo-user");
      this.user = saved ? JSON.parse(saved) : null;
      setTimeout(() => this._emit(), 0);
    }

    $("signInBtn").addEventListener("click", () => this.signIn());
    $("signUpBtn").addEventListener("click", () => this.signUp());
    $("googleSignInBtn").addEventListener("click", () => this.googleSignIn());
    $("signOutBtn").addEventListener("click", () => this.signOut());
  },

  _credentials() {
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    if (!email || !email.includes("@")) {
      showToast("Please enter a valid email", "error");
      return null;
    }
    if (!FIREBASE_ENABLED) return { email, password };
    if (password.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return null;
    }
    return { email, password };
  },

  async signIn() {
    const creds = this._credentials();
    if (!creds) return;
    if (FIREBASE_ENABLED) {
      try {
        await firebase.auth().signInWithEmailAndPassword(creds.email, creds.password);
      } catch (err) {
        showToast(this._friendlyError(err), "error");
      }
    } else {
      this._demoLogin(creds.email);
    }
  },

  async signUp() {
    const creds = this._credentials();
    if (!creds) return;
    if (FIREBASE_ENABLED) {
      try {
        await firebase.auth().createUserWithEmailAndPassword(creds.email, creds.password);
        showToast("Account created!", "success");
      } catch (err) {
        showToast(this._friendlyError(err), "error");
      }
    } else {
      this._demoLogin(creds.email);
    }
  },

  async googleSignIn() {
    if (FIREBASE_ENABLED) {
      try {
        await firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
      } catch (err) {
        showToast(this._friendlyError(err), "error");
      }
    } else {
      this._demoLogin("demo.user@gmail.com", "Demo User");
      showToast("Demo mode: signed in as Demo User", "info");
    }
  },

  async signOut() {
    if (FIREBASE_ENABLED) {
      await firebase.auth().signOut();
    } else {
      localStorage.removeItem("gs-demo-user");
      this.user = null;
      this._emit();
    }
  },

  _demoLogin(email, name) {
    this.user = {
      uid: "demo-" + email.replace(/[^a-z0-9]/gi, ""),
      name: name || email.split("@")[0],
      email
    };
    localStorage.setItem("gs-demo-user", JSON.stringify(this.user));
    this._emit();
  },

  _friendlyError(err) {
    const map = {
      "auth/user-not-found": "No account with that email. Try Create Account.",
      "auth/wrong-password": "Incorrect password.",
      "auth/invalid-credential": "Incorrect email or password.",
      "auth/email-already-in-use": "Account already exists. Try Sign In.",
      "auth/weak-password": "Password must be at least 6 characters.",
      "auth/popup-closed-by-user": "Sign-in popup was closed."
    };
    return map[err.code] || err.message || "Sign-in failed";
  }
};
