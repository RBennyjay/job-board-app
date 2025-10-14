// public/js/main.js

import { watchAuthStatus } from "./modules/auth.js";
import { renderJobFeed } from "./modules/jobFeed.js";
import { renderJobPostForm } from "./modules/jobPostForm.js";
import { renderJobDetails } from "./modules/jobDetails.js";
import { renderFavorites } from "./modules/favorites.js"; // ACTUAL IMPORT for favorites
import { viewHQIn3D, resetMapView } from "./modules/mapIntegration.js";
const appContainer = document.getElementById("app-container");


// --- Core Router Function ---
export function router() {
    // 1. Determine the current view and ID
    const path = window.location.hash.slice(1) || 'feed'; 
    const [view, id] = path.split('/'); 
    
    // 2. Clear container and switch view
    if (appContainer) {
        appContainer.innerHTML = ''; 

        switch (view) {
            case 'feed':
                renderJobFeed(appContainer);
                break;
            case 'post':
                renderJobPostForm(appContainer);
                break;
            case 'details':
                if (id) {
                    renderJobDetails(appContainer, id);
                } else {
                    window.location.hash = '#feed';
                }
                break;
            case 'favorites':
                renderFavorites(appContainer);
                break;
            case 'admin':
                appContainer.innerHTML = '<h1 class="page-title">Admin Dashboard</h1><p>Admin module is coming soon!</p>';
                break;
            default:
                appContainer.innerHTML = '<h1 class="page-title">404: Page Not Found</h1>';
        }
    }
    // 3. Highlight the active link after routing is complete
    highlightActiveLink(); 
}


// --- Navigation and Mobile Logic ---

function highlightActiveLink() {
    const header = document.getElementById('main-header');
    if (!header) return;

    const currentHash = window.location.hash.slice(1).split('/')[0] || 'feed'; 
    
    const allLinks = header.querySelectorAll('a[href^="#"]'); 

    allLinks.forEach(link => {
        link.classList.remove("nav-active");
        const linkHash = link.getAttribute("href").slice(1).split('/')[0];

        if (linkHash === currentHash) {
            link.classList.add("nav-active");
        }
    });
}

// GLOBAL STATE FOR MOBILE BUTTON TOGGLE
let is3DViewActive = false;


function setupNavAndMobileLogic() {
    const header = document.getElementById('main-header');
    const desktopNavContainer = header.querySelector('#nav-links');
    const mobileMenu = document.getElementById("mobile-menu");
    const mobileNavContainer = mobileMenu.querySelector('.mobile-nav-links');
    const menuBtn = document.getElementById("menu-btn");
    const body = document.body;
    
    // Define all navigation items with metadata
    const navItems = [
        
        { 
            href: '#3DView', 
            text: 'View HQ in 3D', 
            isAction: true, // Flag for action button
            desktop: false // Do NOT show on desktop
        },
        
        { href: '#feed', text: 'Job Feed', isAction: false, desktop: true },
        { href: '#favorites', text: 'Favorites', isAction: false, desktop: true }, 
        { href: '#admin', text: 'Admin', isAction: false, desktop: true }, 
    ];
    
    // --- 1. Populate Navigation Links ---
    desktopNavContainer.innerHTML = '';
    mobileNavContainer.innerHTML = ''; 
    
    const createNavLink = (href, text) => {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = text;
        a.style.textDecoration = 'none'; 
        a.style.fontWeight = '500';
        return a;
    };
    
    navItems.forEach(item => {
        
        // Only add standard links to desktop
        if (item.desktop) { 
            desktopNavContainer.appendChild(createNavLink(item.href, item.text));
        }
        
        // Mobile Links (Always create for mobile)
        const mobileLink = createNavLink(item.href, item.text);
        mobileLink.style.padding = '0.75rem 1rem'; 

        // Toggle Logic for Mobile Action Button
        if (item.isAction) {
            
            // Helper function to manage button text and icon
            const updateMobileButtonUI = () => {
                mobileLink.textContent = is3DViewActive ? 'Reset View' : 'View HQ in 3D';
                // Using font-awesome icons for better visual style
                mobileLink.innerHTML = (is3DViewActive ? '<i class="fas fa-undo"></i> ' : '<i class="fas fa-globe"></i> ') + mobileLink.textContent;
            };
            
            // Set initial UI before listeners
            updateMobileButtonUI();
            mobileLink.href = 'javascript:void(0);'; // Prevent hash change

            mobileLink.addEventListener('click', (e) => {
                e.preventDefault();
                
                if (!is3DViewActive) {
                    viewHQIn3D(); // Execute 3D view
                } else {
                    resetMapView(); // Execute Reset view
                }
                
                is3DViewActive = !is3DViewActive; // Toggle the state
                updateMobileButtonUI(); // Update the button text
                
                // Close the menu after clicking
                if (isOpen) {
                    toggleMenu(); 
                }
            });
        }

        mobileNavContainer.appendChild(mobileLink);
    });


    // --- 2. Mobile Menu Logic (Hamburger) ---
    // This part must be defined before the event listeners use it.
    let isOpen = false;

    const toggleMenu = () => {
        isOpen = !isOpen;
        if (isOpen) {
            mobileMenu.classList.add("mobile-menu-open");
            body.classList.add("content-pushed");
            menuBtn.innerHTML = '<i class="fas fa-times fa-lg"></i>'; // 'X' icon
        } else {
            mobileMenu.classList.remove("mobile-menu-open");
            body.classList.remove("content-pushed");
            menuBtn.innerHTML = '<i class="fas fa-bars fa-lg"></i>'; // 'Bars' icon
        }
    };
    
    menuBtn.addEventListener("click", toggleMenu);

    // Close menu when a navigation link is clicked
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('a[href^="#"]');
        if (target && isOpen && mobileMenu.contains(target)) { 
             toggleMenu();
        }
    });

    // --- 3. Handle Button Clicks ---
    
    // Desktop Post Job Button Listener
    // This listener will now work once the map error is resolved
    document.getElementById('post-job-nav-btn').addEventListener('click', () => {
        window.location.hash = '#post';
    });
    
    // Mobile Post Job Button Listener
    const mobilePostBtn = document.getElementById('post-job-mobile-btn');
    if (mobilePostBtn) {
        mobilePostBtn.addEventListener('click', () => {
            window.location.hash = '#post';
            if (isOpen) toggleMenu();
        });
    }

}


// --- Initialization ---
function initializeApp() {
    
    setupNavAndMobileLogic(); 
    
    // 1. Starts the auth listener (which now triggers the initial router call upon login/logout)
    watchAuthStatus(); 

    
    // 2. Listen for subsequent hash changes to trigger routing
    window.addEventListener('hashchange', router); 
}


// Start the application after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);