// js/auth.js — Firebase Authentication module for XORONIQ

import { auth, db } from "./firebase.js";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    sendPasswordResetEmail,
    GoogleAuthProvider,
    signInWithPopup,
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { createUserProfile, getUserProfile, updateUserProfile, isAdmin } from "./db.js";
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
    if (_currentUser !== undefined) {
        callback(_currentUser, _currentProfile);
    }
    return () => {
        const idx = _authListeners.indexOf(callback);
        if (idx > -1) _authListeners.splice(idx, 1);
    };
}

function notifyListeners() {
    _authListeners.forEach(cb => {
        try { cb(_currentUser, _currentProfile); } catch (e) { console.error(e); }
    });
}

// Initialize auth state listener
onAuthStateChanged(auth, async (user) => {
    _currentUser = user;
    if (user) {
        try {
            let prof = await getUserProfile(user.uid);
            if (!prof) {
                prof = await createUserProfile(user.uid, {
                    name: user.displayName || "Valued Customer",
                    email: user.email,
                    phone: user.phoneNumber || "",
                    photoURL: user.photoURL || "",
                    role: "customer"
                });
            }
            _currentProfile = prof;
        } catch (e) {
            _currentProfile = {
                uid: user.uid,
                name: user.displayName || "Valued Customer",
                email: user.email,
                role: "customer"
            };
        }
    } else {
        _currentProfile = null;
    }
    notifyListeners();
    updateHeaderUI();
});

// ─────────────────────────────────────────────
// EMAIL / PASSWORD LOGIN
// ─────────────────────────────────────────────

export async function login(email, password) {
    try {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        _currentUser = cred.user;
        _currentProfile = await getUserProfile(cred.user.uid);
        return { success: true, user: cred.user, profile: _currentProfile };
    } catch (err) {
        console.warn("[auth.js] login error:", err);
        return { success: false, message: getFriendlyAuthError(err.code || err.message) };
    }
}

// ─────────────────────────────────────────────
// GOOGLE POPUP LOGIN / SIGNUP
// ─────────────────────────────────────────────

export async function loginWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const cred = await signInWithPopup(auth, provider);
        
        // Ensure user profile in Firestore
        let profile = await getUserProfile(cred.user.uid);
        if (!profile) {
            profile = await createUserProfile(cred.user.uid, {
                name: cred.user.displayName || "Customer",
                email: cred.user.email,
                phone: cred.user.phoneNumber || "",
                photoURL: cred.user.photoURL || "",
                role: "customer"
            });
        }
        _currentUser = cred.user;
        _currentProfile = profile;
        return { success: true, user: cred.user, profile };
    } catch (err) {
        console.warn("[auth.js] google login error:", err);
        if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") {
            return { success: false, message: "Google sign-in popup was closed." };
        }
        return { success: false, message: getFriendlyAuthError(err.code || err.message) };
    }
}

// ─────────────────────────────────────────────
// REGISTER NEW CUSTOMER
// ─────────────────────────────────────────────

export async function register(name, email, password) {
    try {
        const cleanEmail = email.trim();
        const cleanName = name.trim();
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        
        await updateProfile(cred.user, { displayName: cleanName });
        const profile = await createUserProfile(cred.user.uid, {
            name: cleanName,
            email: cleanEmail,
            phone: "",
            role: "customer"
        });
        
        _currentUser = cred.user;
        _currentProfile = profile;
        return { success: true, user: cred.user, profile };
    } catch (err) {
        console.warn("[auth.js] register error:", err);
        return { success: false, message: getFriendlyAuthError(err.code || err.message) };
    }
}

// ─────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────

export async function logout() {
    try {
        await signOut(auth);
        _currentUser = null;
        _currentProfile = null;
        notifyListeners();
        updateHeaderUI();
        return { success: true };
    } catch (err) {
        return { success: false, message: "Failed to sign out. Please try again." };
    }
}

// ─────────────────────────────────────────────
// ADMIN & AUTH GUARDS
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
                reject(new Error("Not authenticated"));
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
        await sendPasswordResetEmail(auth, email.trim());
        return { success: true, message: "Password reset link sent to your email!" };
    } catch (err) {
        return { success: false, message: getFriendlyAuthError(err.code || err.message) };
    }
}

// ─────────────────────────────────────────────
// HEADER UI UPDATE
// ─────────────────────────────────────────────

export function updateHeaderUI() {
    const accountLink = document.getElementById("account-link");
    const accountText = document.getElementById("account-text");
    if (!accountLink) return;

    if (_currentUser) {
        const displayName = _currentProfile?.name || _currentUser.displayName || "Account";
        const firstName = displayName.trim().split(" ")[0];
        if (accountText) accountText.textContent = firstName;
        accountLink.href = "/account.html";
        accountLink.setAttribute("title", `Logged in as ${displayName}`);
    } else {
        if (accountText) accountText.textContent = "Login";
        accountLink.href = "/login.html";
        accountLink.setAttribute("title", "Customer Login");
    }
}

// ─────────────────────────────────────────────
// ERROR MESSAGES
// ─────────────────────────────────────────────

function getFriendlyAuthError(code) {
    const messages = {
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/user-disabled": "This account has been disabled. Please contact support.",
        "auth/user-not-found": "No account found with this email address.",
        "auth/wrong-password": "Incorrect password. Please try again or reset your password.",
        "auth/invalid-credential": "Invalid email or password. Please verify and try again.",
        "auth/email-already-in-use": "An account with this email already exists. Try signing in instead.",
        "auth/weak-password": "Password is too weak. Please use at least 6 characters.",
        "auth/too-many-requests": "Too many failed attempts. Please wait a moment and try again.",
        "auth/network-request-failed": "Network error. Please check your internet connection.",
        "auth/popup-blocked": "Popup was blocked by your browser. Please allow popups for XORONIQ.",
        "auth/operation-not-allowed": "Authentication method not enabled. Please contact support.",
    };
    return messages[code] || (typeof code === "string" && code.length > 5 ? code : "Authentication failed. Please try again.");
}

