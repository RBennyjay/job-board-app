import { saveUserProfile } from "../services/firebaseService.js";

import { auth } from "../services/firebaseConfig.js"; 
import { updateAuthUI } from "./authUI.js"; 
import { 
    GoogleAuthProvider, signInWithPopup, onAuthStateChanged 
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

// Watch auth state and update UI/DB
export function watchAuthStatus() {
    onAuthStateChanged(auth, async (user) => {
        //  Call the UI updater immediately with the current user status
        updateAuthUI(user); 

        if (user) {
            console.log("✅ Logged in as:", user.email);
            await saveUserProfile(user);
        } else {
            console.log("❌ No user logged in");
        }
    });
}