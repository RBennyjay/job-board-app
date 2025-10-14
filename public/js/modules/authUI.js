// public/js/modules/authUI.js

import { googleLogin, googleSignOut } from "./auth.js";
import { isUserAdmin } from "../services/firebaseService.js";

// Get DOM elements
const desktopStatusSlot = document.getElementById("auth-status-desktop");
const mobileNavLinks = document.querySelector(".mobile-nav-links");
const mobileLoginContainer = document.querySelector(".mobile-login-container");
const desktopNavLinks = document.getElementById("nav-links");
const menuBtn = document.getElementById("menu-btn");

/**
 * Helper to create logout link for mobile nav.
 */
function createLogoutLink(signOutHandler, menuButton) {
  const link = document.createElement("a");
  link.id = "logout-nav-link";
  link.href = "#feed";
  link.textContent = "Log Out";

  link.addEventListener("click", (e) => {
    e.preventDefault();
    signOutHandler();
    if (menuButton && menuButton.classList.contains("mobile-menu-open")) {
      menuButton.click();
    }
  });

  return link;
}

/**
 * Handles UI updates based on auth state.
 * @param {object | null} user - Firebase user object
 */
export async function updateAuthUI(user) {
  // Clean up old logout link if any
  const existingMobileLogout = document.getElementById("logout-nav-link");
  if (existingMobileLogout) existingMobileLogout.remove();

  mobileLoginContainer.style.display = "none";

  // Always reference Admin links freshly each time in case DOM reloads
  const adminNavDesktop = document.getElementById("admin-nav-link-desktop");
  const adminNavMobile = document.getElementById("admin-nav-link-mobile");

  if (user) {
    // --- LOGGED IN ---

    const userName = user.displayName ? user.displayName.split(" ")[0] : "User";

    desktopStatusSlot.innerHTML = `
      <div id="user-status-container" class="user-profile-status">
          <div id="avatar-icon" class="mobile-user-avatar" title="${user.displayName || "User"}">
              <i class="fas fa-user"></i>
          </div>
          <span class="desktop-greeting">Hi, ${userName}!</span>
      </div>
      <button id="logout-header-btn" class="btn-secondary">Log Out</button>
    `;

    // Add mobile Log Out link
    const mobileLogoutLink = createLogoutLink(googleSignOut, menuBtn);
    mobileNavLinks.appendChild(mobileLogoutLink);

    // Add desktop Log Out listener
    document.getElementById("logout-header-btn").addEventListener("click", googleSignOut);

    //  Check Admin Role & toggle visibility
    try {
      const adminStatus = await isUserAdmin(user.email);
      console.log("🔑 Admin status for", user.email, ":", adminStatus);

      if (adminNavDesktop) adminNavDesktop.style.display = adminStatus ? "inline-block" : "none";
      if (adminNavMobile) adminNavMobile.style.display = adminStatus ? "block" : "none";
    } catch (err) {
      console.error("Error checking admin status:", err);
      if (adminNavDesktop) adminNavDesktop.style.display = "none";
      if (adminNavMobile) adminNavMobile.style.display = "none";
    }

  } else {
    // --- LOGGED OUT ---
    desktopStatusSlot.innerHTML = `
      <button id="google-login-header-btn" class="btn-secondary google-login-btn">
        <i class="fab fa-google"></i> Sign In
      </button>
    `;

    document
      .getElementById("google-login-header-btn")
      .addEventListener("click", googleLogin);

    // Hide Admin Links
    if (adminNavDesktop) adminNavDesktop.style.display = "none";
    if (adminNavMobile) adminNavMobile.style.display = "none";
  }
}
