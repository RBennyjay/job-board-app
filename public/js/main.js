// public/js/main.js

import { watchAuthStatus } from "./modules/auth.js";
import { renderJobFeed } from "./modules/jobFeed.js";
import { renderJobPostForm } from "./modules/jobPostForm.js";
import { renderJobDetails } from "./modules/jobDetails.js";
// import { renderFavorites } from "./modules/favorites.js"; // Placeholder import


const appContainer = document.getElementById("app-container");


// --- Core Router Function ---
function router() {
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
               
                appContainer.innerHTML = '<h1 class="page-title">Your Favorite Jobs</h1><p>Favorites module is coming soon!</p>';
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

function setupNavAndMobileLogic() {
    const header = document.getElementById('main-header');
    const desktopNavContainer = header.querySelector('#nav-links');
    const mobileMenu = document.getElementById("mobile-menu");
    const mobileNavContainer = mobileMenu.querySelector('.mobile-nav-links');
    const menuBtn = document.getElementById("menu-btn");
    const body = document.body;
    
    const navItems = [
        { href: '#feed', text: 'Job Feed' },
        { href: '#favorites', text: 'Favorites' }, 
        { href: '#admin', text: 'Admin' },
    ];
    
    // --- 1. Populate Navigation Links ---
    const createNavLink = (href, text) => {
        const a = document.createElement('a');
        a.href = href;
        a.textContent = text;
        a.style.textDecoration = 'none'; 
        a.style.fontWeight = '500';
        return a;
    };
    
    navItems.forEach(item => {
        // Desktop Links
        desktopNavContainer.appendChild(createNavLink(item.href, item.text));
        
        // Mobile Links
        const mobileLink = createNavLink(item.href, item.text);
        mobileLink.style.padding = '0.75rem 1rem'; 
        mobileNavContainer.appendChild(mobileLink);
    });


    // --- 2. Mobile Menu Logic (Hamburger) ---
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
    header.addEventListener('click', (e) => {
        const target = e.target.closest('a[href^="#"]');
        if (target && isOpen) {
            toggleMenu();
        }
    });

    // --- 3. Handle Button Clicks ---
    
    // Desktop Post Job Button Listener
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
   
    watchAuthStatus(); 

   
    window.addEventListener('hashchange', router);
    
  
    router();
}


// Start the application after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);