// public/js/modules/auth.js

import { saveUserProfile } from "../services/firebaseService.js";

import { auth } from "../services/firebaseConfig.js"; 
import { updateAuthUI } from "./authUI.js"; 
import { 
    GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

// Google Sign-in function
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

//  Google Sign-out function
export async function googleSignOut() {
    try {
        await signOut(auth);
        console.log("User signed out successfully.");
        // UI update handled by onAuthStateChanged listener
    } catch (error) {
        console.error("Sign out failed:", error.message);
    }
}


// Watch auth state and update UI/DB
export function watchAuthStatus() {
    onAuthStateChanged(auth, async (user) => {
        //  Call the UI updater immediately with the current user status
        updateAuthUI(user); 

        if (user) {
            console.log("✅ Logged in as:", user.email);
            // Wait for user profile data to be saved/updated
            await saveUserProfile(user); 
        } else {
            console.log("❌ No user logged in");
            // redirect to the feed if the user logs out from a restricted page
            if (window.location.hash.includes('#post') || window.location.hash.includes('#admin')) {
                 window.location.hash = '#feed';
            }
        }
    });
}