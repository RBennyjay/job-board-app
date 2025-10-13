// public/js/modules/auth.js

import { saveUserProfile } from "../services/firebaseService.js";
import { auth } from "../services/firebaseConfig.js"; 
import { updateAuthUI } from "./authUI.js"; 
//  Import router from the parent main.js file
import { router } from "../main.js";
import { 
    GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

// Google Sign-in function
export async function googleLogin() {
// ... (rest of googleLogin remains the same)
    try {
        const result = await signInWithPopup(auth, provider);
        console.log("Google login success:", result.user.email);
        return result.user;
    } catch (error) {
        console.error("Google login failed:", error.message);
        return null;
    }
}

//  Google Sign-out function
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
    let hasRunInitialRouter = false; 
    
    onAuthStateChanged(auth, async (user) => {
        //  Call the UI updater immediately with the current user status
        updateAuthUI(user); 

        if (user) {
            console.log("✅ Logged in as:", user.email);
            
            // Wait for user profile data to be saved/updated (CRITICAL AWAIT)
            await saveUserProfile(user); 

            // 🔑 FIX: If the initial router run has completed, 
            // we must re-run the router now that the profile is saved.
            // This forces the feed to re-render, ensuring isUserAdmin() sees the correct status.
            if (hasRunInitialRouter) {
                console.log("Forcing re-route after profile save to stabilize admin status.");
                router(); 
            }
        } else {
            console.log("❌ No user logged in");
            // redirect to the feed if the user logs out from a restricted page
            if (window.location.hash.includes('#post') || window.location.hash.includes('#admin')) {
                 window.location.hash = '#feed';
            }
        }

        //  Only run the router once for the INITIAL page load
        if (!hasRunInitialRouter) {
            hasRunInitialRouter = true;
            console.log("Initial router run.");
            router(); 
        }
    });
}
