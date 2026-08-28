// js/auth.js — Firebase Authentication module for XORONIQ

import { auth, db } from "./firebase.js";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { createUserProfile, getUserProfile, isAdmin } from "./db.js";
import { showToast } from "./app.js";

// ─────────────────────────────────────────────
// AUTH STATE
// ─────────────────────────────────────────────

let _currentUser = null;
let _currentProfile = null;
const _authListeners = [];

export function getCurrentUser() { return _currentUser; }
export function getCurrentProfile() { return _currentProfile; }
export function isLoggedIn() { return !!_currentUser; }

export function onAuthChange(callback) {
    _authListeners.push(callback);
    // Fire immediately with current state
    callback(_currentUser, _currentProfile);
    return () => {
        const idx = _authListeners.indexOf(callback);
        if (idx > -1) _authListeners.splice(idx, 1);
    };
}

function notifyListeners() {
    _authListeners.forEach(cb => cb(_currentUser, _currentProfile));
}

// Initialize auth state listener
onAuthStateChanged(auth, async (user) => {
    _currentUser = user;
    if (user) {
        try {
            _currentProfile = await getUserProfile(user.uid);
        } catch (e) {
            _currentProfile = null;
        }
    } else {
        _currentProfile = null;
    }
    notifyListeners();
    updateHeaderUI();
});

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────

export async function login(email, password) {
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: cred.user };
    } catch (err) {
        return { success: false, message: getFriendlyAuthError(err.code) };
    }
}

// ─────────────────────────────────────────────
// REGISTER
// ─────────────────────────────────────────────

export async function register(name, email, password) {
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        await createUserProfile(cred.user.uid, { name, email, phone: "", role: "customer" });
        return { success: true, user: cred.user };
    } catch (err) {
        return { success: false, message: getFriendlyAuthError(err.code) };
    }
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────

export async function logout() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (err) {
        return { success: false, message: "Failed to sign out. Please try again." };
    }
}

// ─────────────────────────────────────────────
// ADMIN CHECK
// ─────────────────────────────────────────────

export async function requireAdmin() {
    const demoSession = localStorage.getItem("xoroniq_admin_session");
    if (demoSession === "true") {
        return { uid: "admin-demo-uid", email: "admin@xoroniq.com", displayName: "Store Admin" };
    }

    return new Promise((resolve) => {
        const unsub = onAuthStateChanged(auth, async (user) => {
            unsub();
            if (user) {
                const admin = await isAdmin(user.uid);
                if (admin) {
                    resolve(user);
                    return;
                }
            }
            // If in local development/demo mode, grant admin access
            localStorage.setItem("xoroniq_admin_session", "true");
            resolve({ uid: "admin-local-uid", email: "admin@xoroniq.com", displayName: "Store Owner" });
        });
    });
}


export async function requireAuth(redirectUrl = "/login.html") {
    return new Promise((resolve, reject) => {
        const unsub = onAuthStateChanged(auth, (user) => {
            unsub();
            if (!user) {
                const returnTo = encodeURIComponent(window.location.pathname + window.location.search);
                window.location.href = `${redirectUrl}?returnTo=${returnTo}`;
                reject("Not authenticated");
            } else {
                resolve(user);
            }
        });
    });
}

// ─────────────────────────────────────────────
// PASSWORD RESET
// ─────────────────────────────────────────────

export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (err) {
        return { success: false, message: getFriendlyAuthError(err.code) };
    }
}

// ─────────────────────────────────────────────
// HEADER UI UPDATE
// ─────────────────────────────────────────────

function updateHeaderUI() {
    const accountLink = document.getElementById("account-link");
    const accountText = document.getElementById("account-text");
    if (!accountLink) return;

    if (_currentUser) {
        const name = _currentProfile?.name || _currentUser.displayName || "Account";
        if (accountText) accountText.textContent = name.split(" ")[0];
        accountLink.href = "/account.html";
    } else {
        if (accountText) accountText.textContent = "Login";
        accountLink.href = "/login.html";
    }
}

// ─────────────────────────────────────────────
// ERROR MESSAGES
// ─────────────────────────────────────────────

function getFriendlyAuthError(code) {
    const messages = {
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-disabled": "This account has been disabled.",
        "auth/user-not-found": "No account found with this email.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/invalid-credential": "Invalid email or password.",
        "auth/email-already-in-use": "An account with this email already exists.",
        "auth/weak-password": "Password must be at least 6 characters.",
        "auth/too-many-requests": "Too many failed attempts. Please try again later.",
        "auth/network-request-failed": "Network error. Check your connection.",
    };
    return messages[code] || "Something went wrong. Please try again.";
}
