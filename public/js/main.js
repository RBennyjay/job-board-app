// public/js/main.js

import { watchAuthStatus } from "./modules/auth.js";
import { renderJobFeed } from "./modules/jobFeed.js";
import { renderJobPostForm } from "./modules/jobPostForm.js";
import { renderJobDetails } from "./modules/jobDetails.js"; //  NEW IMPORT

const appContainer = document.getElementById("app-container");

// --- Router Function ---
function router() {
    
    const path = window.location.hash.slice(1) || 'feed'; 
    const [view, id] = path.split('/'); // Splits "details/ID" into ['details', 'ID']
    
    if (appContainer) {
        // Clear the container before rendering the new view
        appContainer.innerHTML = ''; 

        switch (view) { // Switch on the first part of the path ('feed', 'post', 'details')
            case 'feed':
                renderJobFeed(appContainer);
                break;
            case 'post':
                renderJobPostForm(appContainer);
                break;
            case 'details': //  NEW CASE
                if (id) {
                    renderJobDetails(appContainer, id);
                } else {
                    window.location.hash = '#feed'; // Redirect if ID is missing
                }
                break;
            default:
                appContainer.innerHTML = '<h1 class="page-title">404: Page Not Found</h1>';
        }
    }
}


// --- Initialization ---
function initializeApp() {
    
    // 1. Start watching authentication state
    watchAuthStatus(); 

    // 2. Setup the navigation bar links
    document.getElementById('post-job-nav-btn').addEventListener('click', () => {
        window.location.hash = '#post';
    });

    // 3. Set up SPA routing listeners
    window.addEventListener('hashchange', router);
    
    // 4. Initial route load
    router();
}


// Start the application after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);