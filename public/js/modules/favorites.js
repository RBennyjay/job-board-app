// public/js/modules/favorites.js

import { 
    auth, 
    getSavedJobIds, 
    getJobById,
    unsaveJob 
} from "../services/firebaseService.js";
//  Ensure updateCardSaveButtonUI is imported
import { createJobCardHTML, updateCardSaveButtonUI } from "./jobFeed.js"; 


/**
 * Renders the "Your Favorite Jobs" page.
 * @param {HTMLElement} containerElement - The DOM element where content will be rendered.
 */
export async function renderFavorites(containerElement) {
    if (!auth.currentUser) {
        containerElement.innerHTML = `
            <h1 class="page-title">Your Favorite Jobs</h1>
            <p style="text-align: center; padding: 2rem; color: var(--color-dark);">
                You must be <a href="#login" style="color: var(--color-primary); font-weight: bold;">logged in</a> to view your saved jobs.
            </p>
        `;
        return;
    }

    // Initial structure setup
    containerElement.innerHTML = `
        <h1 class="page-title">Your Favorite Jobs</h1>
        <div id="favorites-list-container" style="display: flex; flex-direction: column; gap: 1.5rem;">
            <p style="text-align: center; padding: 2rem;">Loading your saved jobs...</p>
        </div>
    `;

    const favoritesListContainer = document.getElementById("favorites-list-container");
    const userId = auth.currentUser.uid;
    
    try {
        const savedJobIds = await getSavedJobIds(userId);

        if (savedJobIds.length === 0) {
            favoritesListContainer.innerHTML = `
                <p style="text-align: center; padding: 2rem; color: gray;">
                    You haven't saved any jobs yet. Start browsing the 
                    <a href="#feed" style="color: var(--color-primary); font-weight: bold;">Job Feed</a>!
                </p>
            `;
            return;
        }

        const jobPromises = savedJobIds.map(id => getJobById(id));
        const jobs = (await Promise.all(jobPromises)).filter(job => job !== null);

        if (jobs.length > 0) {
            
            const jobCardsHTML = jobs
                .map(job => createJobCardHTML(job, false)) 
                .join('');
            
            favoritesListContainer.innerHTML = jobCardsHTML;
            
            //  Manually set all button states to 'Saved' after rendering
            favoritesListContainer.querySelectorAll('.save-job-btn-card').forEach(button => {
                // Force the state to true since they are on the favorites page
                updateCardSaveButtonUI(button, true); 
            });

            // 4. Set up the specific listener for unsaving jobs from this list
            setupUnsaveJobListener(favoritesListContainer);
        } else {
            favoritesListContainer.innerHTML = `
                <p style="text-align: center; padding: 2rem; color: gray;">
                    The jobs you saved are no longer available.
                </p>
            `;
        }
    } catch (error) {
        console.error("Error loading favorite jobs:", error);
        favoritesListContainer.innerHTML = `
            <p style="color: red; padding: 2rem; text-align: center;">
                Error loading favorites. Please check your network connection.
            </p>
        `;
    }
}

/**
 * Sets up the click listener to handle unsaving a job directly from the favorites list.
 * @param {HTMLElement} container - The container element (favoritesListContainer).
 */
function setupUnsaveJobListener(container) {
    container.addEventListener('click', async (event) => {
        //  The button is the .save-job-btn-card, which acts as the unsave button here.
        const unsaveButton = event.target.closest('.save-job-btn-card');

        // Check if the button is present AND currently marked as saved
        if (unsaveButton && unsaveButton.dataset.isSaved === 'true') { 
            event.preventDefault(); 
            event.stopPropagation();
            
            const jobId = unsaveButton.dataset.jobId;

            try {
                unsaveButton.disabled = true;
                
                // Unsave the job
                await unsaveJob(jobId);
                console.log(`Job ${jobId} unsaved from favorites.`);
                
                // Remove the job card from the DOM (visual effect)
                const jobCard = unsaveButton.closest('.job-card');
                if (jobCard) {
                    jobCard.style.opacity = '0';
                    jobCard.style.transition = 'opacity 0.3s ease, max-height 0.3s ease';
                    jobCard.style.maxHeight = '0';

                    setTimeout(() => {
                        jobCard.remove();
                        // Re-render the list if it becomes empty
                        if (container.children.length === 0) {
                            renderFavorites(document.getElementById("app-container"));
                        }
                    }, 300);
                }
            } catch (error) {
                console.error("Error unsaving job from favorites list:", error);
                unsaveButton.disabled = false;
            }
        }
    });
}