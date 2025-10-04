import { auth } from "../services/firebaseConfig.js"; 

// googleLogin is defined and exported in auth.js
import { googleLogin } from "./auth.js"; 


/**
 * Renders the appropriate login or logout button and updates the Post Job button visibility.
 * @param {object | null} user - The current Firebase user object or null if logged out.
 */
export function updateAuthUI(user) {

    const navLinksContainer = document.getElementById('nav-links');
    const postJobButton = document.getElementById('post-job-nav-btn');
    
    // Check if elements exist before proceeding (good practice)
    if (!navLinksContainer || !postJobButton) {
        console.error("Auth UI failed to find required DOM elements (#nav-links or #post-job-nav-btn).");
        return; 
    }

    if (user) {
        // User is logged in: Show Logout/Profile
        navLinksContainer.innerHTML = `
            <span style="margin-right: 1rem; color: #555;">Hello, ${user.displayName || user.email}</span>
            <button id="logout-btn" class="btn-primary" style="background-color: #dc3545;">Logout</button>
        `;
        // Make the Post Job button active
        postJobButton.style.display = 'block'; 
        
        document.getElementById('logout-btn').addEventListener('click', () => {
            auth.signOut();
            window.location.hash = '#feed'; // Redirect to feed on logout
        });

    } else {
        // User is logged out: Show Login
        navLinksContainer.innerHTML = `
            <button id="login-btn" class="btn-primary">Login with Google</button>
        `;
        // Hide or style the Post Job button to indicate login is required
        postJobButton.style.display = 'none'; 
        
        document.getElementById('login-btn').addEventListener('click', googleLogin);
    }
}