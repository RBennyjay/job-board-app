// public/js/modules/authUI.js

import { googleLogin, googleSignOut } from "./auth.js"; 

// Get DOM elements outside the function
const desktopStatusSlot = document.getElementById('auth-status-desktop');
const mobileNavLinks = document.querySelector('.mobile-nav-links'); 
const mobileLoginContainer = document.querySelector('.mobile-login-container'); 
const desktopNavLinks = document.getElementById('nav-links');
const menuBtn = document.getElementById("menu-btn");


/**
 * Helper function to create the Log Out link element (for NAV MENUS).
 * This is only used for the mobile menu now.
 * @param {Function} signOutHandler The function to call on click.
 * @param {HTMLElement | null} menuButton The mobile menu button to close the menu (only for mobile).
 * @returns {HTMLElement} The created <a> element.
 */
function createLogoutLink(signOutHandler, menuButton) {
    const link = document.createElement('a');
    link.id = 'logout-nav-link'; // Unique ID for mobile
    link.href = '#feed';
    link.textContent = 'Log Out';
    
    // Add event listener
    link.addEventListener('click', (e) => {
        e.preventDefault(); 
        signOutHandler();
        // Close menu on mobile
        if (menuButton && menuButton.classList.contains('mobile-menu-open')) {
            menuButton.click();
        }
    });
    
    return link;
}


/**
 * Handles the display of login/logout/user status elements based on authentication state.
 * @param {object | null} user - The current Firebase user object or null if logged out.
 */
export function updateAuthUI(user) {

    // Clean up any previously injected logout elements
    const existingMobileLogout = document.getElementById('logout-nav-link');
    if (existingMobileLogout) {
        existingMobileLogout.remove();
    }
    
        
    // Ensure the unused mobile login container is hidden
    mobileLoginContainer.style.display = 'none';

    if (user) {
        // --- LOGGED IN: Log Out in Header (Desktop ONLY) & Log Out in Mobile Menu ---
        
        const userName = user.displayName ? user.displayName.split(' ')[0] : 'User';

        // 1.  Avatar, Greeting, AND Log Out Button (Header Log Out hidden on mobile via CSS)
        desktopStatusSlot.innerHTML = `
            <div id="user-status-container" class="user-profile-status">
                <div id="avatar-icon" class="mobile-user-avatar" title="${user.displayName || 'User'}">
                    <i class="fas fa-user"></i>
                </div>
                <span class="desktop-greeting">Hi, ${userName}!</span>
            </div>
            <button id="logout-header-btn" class="btn-secondary">Log Out</button>
        `;
        
        // 2.  Inject Log Out Link into the mobile-nav-links list
        const mobileLogoutLink = createLogoutLink(googleSignOut, menuBtn);
        mobileNavLinks.appendChild(mobileLogoutLink);

       

        // 4. Attach Header Log Out listener
        document.getElementById('logout-header-btn').addEventListener('click', googleSignOut);


    } else {
        // --- LOGGED OUT: Show Sign In Button in Header ---

        // 1. Restore Sign In Button (Visible on both mobile and desktop)
        desktopStatusSlot.innerHTML = `
            <button id="google-login-header-btn" class="btn-secondary google-login-btn">
                 <i class="fab fa-google"></i> Sign In
            </button>
        `;
        
        // 2. Attach Sign In listener to the header button
        document.getElementById('google-login-header-btn').addEventListener('click', googleLogin);
    }
}