// public/js/main.js

import { watchAuthStatus } from "./modules/auth.js";
import { renderJobFeed } from "./modules/jobFeed.js";
import { renderJobPostForm } from "./modules/jobPostForm.js";
import { renderJobDetails } from "./modules/jobDetails.js";
import { renderFavorites } from "./modules/favorites.js";
import { viewHQIn3D, resetMapView } from "./modules/mapIntegration.js";
import { isUserAdmin } from "./services/firebaseService.js";

import { renderAdminDashboard } from "./modules/admin.js"; 

const appContainer = document.getElementById("app-container");

// --- Router ---
export function router() {
  const path = window.location.hash.slice(1) || "feed";
  const [view, id] = path.split("/");

  if (appContainer) {
    appContainer.innerHTML = "";

    switch (view) {
      case "feed":
        renderJobFeed(appContainer);
        break;
      case "post":
        renderJobPostForm(appContainer, id);
        break;
      case "details":
        if (id) {
          renderJobDetails(appContainer, id);
        } else {
          window.location.hash = "#feed";
        }
        break;
      case "favorites":
        renderFavorites(appContainer);
        break;
      case "admin":
        renderAdminDashboard(appContainer);
        break;
      default:
        appContainer.innerHTML =
          '<h1 class="page-title">404: Page Not Found</h1>';
    }
  }

  highlightActiveLink();
}

// --- Highlight Active Nav ---
function highlightActiveLink() {
  const header = document.getElementById("main-header");
  if (!header) return;

  const currentHash = window.location.hash.slice(1).split("/")[0] || "feed";
  const allLinks = header.querySelectorAll('a[href^="#"]');

  allLinks.forEach((link) => {
    link.classList.remove("nav-active");
    const linkHash = link.getAttribute("href").slice(1).split("/")[0];

    if (linkHash === currentHash) {
      link.classList.add("nav-active");
    }
  });
}

// GLOBAL STATE FOR 3D VIEW
let is3DViewActive = false;

// --- Global Event Listeners ---
function setupGlobalEventListeners() {
  const mobileMenu = document.getElementById("mobile-menu");
  const menuBtn = document.getElementById("menu-btn");
  const body = document.body;

  let isOpen = false;

  const toggleMenu = () => {
    isOpen = !isOpen;
    if (isOpen) {
      mobileMenu.classList.add("mobile-menu-open");
      body.classList.add("content-pushed");
      menuBtn.innerHTML = '<i class="fas fa-times fa-lg"></i>';
    } else {
      mobileMenu.classList.remove("mobile-menu-open");
      body.classList.remove("content-pushed");
      menuBtn.innerHTML = '<i class="fas fa-bars fa-lg"></i>';
    }
  };

  menuBtn.addEventListener("click", toggleMenu);

  document.body.addEventListener("click", (e) => {
    const target = e.target.closest('a[href^="#"]');
    if (target && isOpen && mobileMenu.contains(target)) {
      toggleMenu();
    }
  });

  // Desktop Post Job Button Listener
  const postJobBtn = document.getElementById("post-job-nav-btn");
  if (postJobBtn) postJobBtn.addEventListener("click", () => (window.location.hash = "#post"));

  // Mobile Post Job Button Listener
  const mobilePostBtn = document.getElementById("post-job-mobile-btn");
  if (mobilePostBtn)
    mobilePostBtn.addEventListener("click", () => {
      window.location.hash = "#post";
      if (isOpen) toggleMenu();
    });
}

// --- Build Nav Links ---
function setupNavLinks() {
  const header = document.getElementById("main-header");
  const desktopNavContainer = header.querySelector("#nav-links");
  const mobileNavContainer = document
    .getElementById("mobile-menu")
    .querySelector(".mobile-nav-links");

  // Only proceed if containers exist and links haven't been built yet (optional check)
  if (!desktopNavContainer || !mobileNavContainer || desktopNavContainer.children.length > 0) return;

  const navItems = [
    {
      href: "#3DView",
      text: "View HQ in 3D",
      isAction: true,
      desktop: false,
      id: "mobile-3d-view-btn",
    },
    { href: "#feed", text: "Job Feed", isAction: false, desktop: true },
    { href: "#favorites", text: "Favorites", isAction: false, desktop: true },
    {
      href: "#admin",
      text: "Admin",
      isAction: false,
      desktop: true,
      desktopId: "admin-nav-link-desktop",
      mobileId: "admin-nav-link-mobile",
    },
  ];

  desktopNavContainer.innerHTML = "";
  mobileNavContainer.innerHTML = "";

  const createNavLink = (item, isMobile = false) => {
    const a = document.createElement("a");
    a.href = item.href;
    a.textContent = item.text;
    a.style.textDecoration = "none";
    a.style.fontWeight = "500";

    if (isMobile && item.mobileId) a.id = item.mobileId;
    else if (!isMobile && item.desktopId) a.id = item.desktopId;

    // Hide Admin link by default
    if (item.desktopId || item.mobileId) a.style.display = "none";

    return a;
  };

  navItems.forEach((item) => {
    if (item.desktop) {
      const desktopLink = createNavLink(item, false);
      desktopNavContainer.appendChild(desktopLink);
    }

    const mobileLink = createNavLink(item, true);
    mobileLink.style.padding = "0.75rem 1rem";

    if (item.isAction) {
      const updateMobileButtonUI = () => {
        mobileLink.textContent = is3DViewActive ? "Reset View" : "View HQ in 3D";
        mobileLink.innerHTML =
          (is3DViewActive ? '<i class="fas fa-undo"></i> ' : '<i class="fas fa-globe"></i> ') +
          mobileLink.textContent;
      };

      updateMobileButtonUI();
      mobileLink.href = "javascript:void(0);";

      mobileLink.addEventListener("click", (e) => {
        e.preventDefault();
        if (!is3DViewActive) viewHQIn3D();
        else resetMapView();
        is3DViewActive = !is3DViewActive;
        updateMobileButtonUI();
      });
    }

    mobileNavContainer.appendChild(mobileLink);
  });
}

// 🛑 REMOVED: loadUsersForManagement and setupAdminTabs logic belongs in modules/admin.js

// --- Initialize App ---
async function initializeApp() {
  // 1. Setup listeners and initial navigation structure once
  setupGlobalEventListeners();
  setupNavLinks(); 

  // 2. Listen to auth status (which controls admin link visibility and runs router)
  watchAuthStatus(async (user) => {
    console.log("[Main] Auth status changed:", user ? user.email : "No user");

    const adminLinkDesktop = document.getElementById("admin-nav-link-desktop");
    const adminLinkMobile = document.getElementById("admin-nav-link-mobile");

    // Ensure links exist before trying to toggle them
    if (!adminLinkDesktop || !adminLinkMobile) {
      console.warn("⚠️ Admin links not found in DOM yet.");
      return;
    }

    if (user) {
      try {
        const isAdmin = await isUserAdmin();
        console.log("[Main] isUserAdmin() =>", isAdmin);

        // 3. Toggle visibility based on Admin status
        if (isAdmin) {
          adminLinkDesktop.style.display = "inline-block";
          adminLinkMobile.style.display = "block";
          console.log("✅ Admin Nav links now visible for admin user.");
        } else {
          adminLinkDesktop.style.display = "none";
          adminLinkMobile.style.display = "none";
          console.log("🚫 User not admin. Admin links hidden.");
        }
      } catch (e) {
        console.error("❌ Error checking admin status:", e);
        // Default to hidden on error
        adminLinkDesktop.style.display = "none";
        adminLinkMobile.style.display = "none";
      }
    } else {
      // Not logged in — hide admin links
      adminLinkDesktop.style.display = "none";
      adminLinkMobile.style.display = "none";
      console.log("🚪 User logged out — Admin links hidden.");
    }

    // 4. Run the router after authentication state is confirmed
    router();
  });

  // 5. Listen for hash changes
  window.addEventListener("hashchange", router);
}

document.addEventListener("DOMContentLoaded", initializeApp);