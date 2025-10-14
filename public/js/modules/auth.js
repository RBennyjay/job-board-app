// public/js/modules/auth.js

import { saveUserProfile, clearAdminCache } from "../services/firebaseService.js";
import { auth } from "../services/firebaseConfig.js";
import { updateAuthUI } from "./authUI.js";
import { router } from "../main.js";
import {
    GoogleAuthProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

// --- Google Sign-in ---
export async function googleLogin() {
    try {
        const result = await signInWithPopup(auth, provider);
        console.log("Google login success:", result.user.email);
        return result.user;
    } catch (error) {
        console.error("Google login failed:", error.message);
        return null;
    }
}

// --- Google Sign-out ---
export async function googleSignOut() {
    try {
        //  Clear cached admin status before signing out
        clearAdminCache();

        await signOut(auth);
        console.log("✅ User signed out successfully.");

        // UI update handled automatically by onAuthStateChanged
    } catch (error) {
        console.error("❌ Sign out failed:", error.message);
    }
}

// --- Watch Authentication State ---
export function watchAuthStatus() {
    let hasRunInitialRouter = false;

    onAuthStateChanged(auth, async (user) => {
        //  Update the UI (ensures admin button toggles correctly)
        await updateAuthUI(user);

        if (user) {
            console.log("✅ Logged in as:", user.email);

            // Save or update the user profile in Firestore
            await saveUserProfile(user);

            // Force reroute after saving profile to stabilize admin visibility
            if (hasRunInitialRouter) {
                console.log("Forcing re-route after profile save to stabilize admin status.");
                router();
            }
        } else {
            console.log("❌ No user logged in.");

            // Redirect away from restricted pages
            if (window.location.hash.includes('#post') || window.location.hash.includes('#admin')) {
                window.location.hash = '#feed';
            }
        }

        // Run router once on initial load
        if (!hasRunInitialRouter) {
            hasRunInitialRouter = true;
            console.log("Initial router run.");
            router();
        }
    });
}
