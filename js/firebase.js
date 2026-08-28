// js/firebase.js — Firebase Modular SDK initialization for XORONIQ

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAIeLh3I9tPRtHCPCFszon4yaJAxrbLetE",
    authDomain: "marketing-website-45737.firebaseapp.com",
    projectId: "marketing-website-45737",
    storageBucket: "marketing-website-45737.firebasestorage.app",
    messagingSenderId: "1042908231312",
    appId: "1:1042908231312:web:754b83d3fedb3c19328a15"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
