// public/js/modules/jobDetails.js

//  Add  imports for Auth and the new Favorites Service functions
import { getJobById, isJobSaved, saveJob, unsaveJob } from "../services/firebaseService.js";
import { auth } from "../services/firebaseConfig.js"; 


/**
 * Helper to render tags/skills as styled badges for the details page.
 * @param {Array<string>} tags - Array of skill tags.
 * @returns {string} HTML string of tag badges.
 */
function renderDetailTags(tags) {
    if (!tags || tags.length === 0) return '<p style="color: gray;">No specific skills listed by the poster.</p>';
    
    // Using inline styles for quick implementation, considering moving these to styles.css
    return `
        <div class="job-detail-skills" style="display: flex; flex-wrap: wrap; gap: 0.75rem; margin-top: 1rem; margin-bottom: 2rem;">
            ${tags.map(tag => `
                <span style="
                    background-color: var(--color-neutral, #f0f4f8); 
                    color: var(--color-dark); 
                    padding: 0.5rem 1rem;
                    border-radius: 6px;
                    border: 1px solid #e0e0e0;
                    font-size: 0.9rem;
                    font-weight: 500;
                ">${tag}</span>
            `).join('')}
        </div>
    `;
}


/**
 * Renders the detailed view for a single job posting.
 * @param {HTMLElement} containerElement - The DOM element to render into.
 * @param {string} jobId - The ID of the job to fetch and display.
 */
export async function renderJobDetails(containerElement, jobId) {
    containerElement.innerHTML = `<h1 class="page-title">Loading Job Details...</h1>`;
    
    try {
        const job = await getJobById(jobId);

        if (!job) {
            containerElement.innerHTML = `<h1 class="page-title">Job Not Found</h1>
                                         <p style="padding: 1rem; color: gray;">The requested job posting does not exist.</p>`;
            return;
        }
        
        //  Application Button Logic
        const applicationLink = job.applicationLink;
        const applicationEmail = job.applicationEmail;
        let applyButtonHTML;

        if (applicationLink) {
            applyButtonHTML = `<a href="${applicationLink}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="margin-right: 1rem;">Apply on Company Site</a>`;
        } else if (applicationEmail) {
            applyButtonHTML = `<a href="mailto:${applicationEmail}" class="btn-primary" style="margin-right: 1rem;">Apply via Email</a>`;
        } else {
            applyButtonHTML = `<button class="btn-primary" disabled>Application Details Not Provided</button>`;
        }
        
        //  Render Tags
        const skillsHTML = renderDetailTags(job.tags);
        
        // Render the detailed job content
        containerElement.innerHTML = `
            <div style="max-width: 800px; margin: 0 auto; padding-top: 1.5rem;">
                <h1 class="page-title" style="margin-bottom: 0;">${job.title}</h1>
                <p style="font-size: 1.1rem; color: #555; margin-bottom: 0.5rem;">${job.company || 'Confidential'}</p>
                
                <div style="display: flex; flex-wrap: wrap; gap: 2rem; margin-bottom: 1.5rem; color: #333;">
                    <span style="font-weight: 500; color: var(--color-primary);">📍 ${job.location || 'N/A'}</span>
                    <span style="font-weight: 500;">💰 ${job.salary || 'Competitive'}</span>
                    <span style="font-weight: 500;">Category: ${job.category || 'N/A'}</span>
                </div>

                <div style="background-color: white; padding: 2rem; border-radius: 0.5rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 1rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">Description</h2>
                    <p style="white-space: pre-wrap; line-height: 1.6; margin-bottom: 2rem;">${job.description || 'No detailed description available.'}</p>
                    
                    <h2 style="font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">Required Skills</h2>
                    ${skillsHTML}
                    
                    <div class="job-actions" style="margin-top: 3rem; border-top: 1px solid #eee; padding-top: 2rem; display: flex; align-items: center; flex-wrap: wrap; gap: 1rem;">
                        ${applyButtonHTML}
                        
                        <button id="save-job-btn" data-job-id="${job.id}" class="btn-secondary">
                            <i class="fas fa-bookmark"></i> Save Job
                        </button>
                        
                        <button id="share-job-btn" data-job-title="${job.title}" data-job-id="${job.id}" class="btn-secondary">
                            <i class="fas fa-share-alt"></i> Share Link
                        </button>
                    </div>
                    
                    <a href="#feed" class="back-to-feed-link" style="display: block; margin-top: 1.5rem; text-align: center;">← Back to Job Feed</a>
                </div>
            </div>
        `;

        //  CALL SETUP FUNCTIONS HERE (after HTML is in the DOM)
        setupShareButton(job.title, job.id);
        setupSaveButton(job.id); 

    } catch (error) {
        console.error("Error fetching job details:", error);
        containerElement.innerHTML = `<h1 class="page-title">Error</h1>
                                     <p style="color: red; padding: 1rem;">Could not load job details. Check console for details.</p>`;
    }
}

// -----------------------------------------------------------
// --- Helper Functions  ---
// -----------------------------------------------------------

export function setupShareButton(jobTitle, jobId) {
    const shareButton = document.getElementById('share-job-btn');
    if (!shareButton) return;

    // 1. Construct the URL for the specific job
    const jobUrl = `${window.location.origin}/#details/${jobId}`; 
    
    // 2. Define the content to share
    const shareData = {
        title: `Job Alert: ${jobTitle} | Lagos Job Board`,
        text: `Check out this great job opportunity on the Lagos Job Board: ${jobTitle}.`,
        url: jobUrl,
    };

    shareButton.addEventListener('click', async () => {
        // --- Strategy 1: Use Web Share API (BEST) ---
        if (navigator.share && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
                console.log('Job shared successfully via Web Share API.');
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Error sharing:', err.name, err.message);
                }
            }
        } 
        
        // --- Strategy 2: Fallback to custom modal/links  ---
        else {
            console.log('Web Share API not available, opening fallback modal.');
            openFallbackShareModal(jobTitle, jobUrl);
        }
    });
}

/**
 * Opens a new window with common share links for platforms.
 * @param {string} title - The job title.
 * @param {string} url - The job URL.
 */
function openFallbackShareModal(title, url) {
    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(`Job Alert: ${title} on the Lagos Job Board! Find this and more here:`);

    const shareWindow = window.open('', '_blank', 'width=600,height=400,toolbar=no,menubar=no');
    
    // Use window.open to create a new page with share links
    shareWindow.document.write(`
        <html>
        <head>
            <title>Share Job</title>
            <style>
                body { font-family: sans-serif; padding: 20px; text-align: center; background-color: #f4f4f4; }
                h2 { color: #333; margin-bottom: 20px; }
                .share-links a {
                    display: block;
                    padding: 10px 20px;
                    margin: 10px auto;
                    width: 250px;
                    text-decoration: none;
                    color: white;
                    border-radius: 5px;
                    font-weight: bold;
                    transition: opacity 0.2s;
                }
                .share-links a:hover { opacity: 0.8; }
                .whatsapp { background-color: #0be075ff; }
                .twitter { background-color: #000000 }
                .linkedin { background-color: #0A66C2 }
                .facebook { background-color: #0866FF }
                .email { background-color: #777; }
            </style>
        </head>
        <body>
            <h2>Share this Job: ${title}</h2>
            <div class="share-links">
                 <a class="whatsapp" href="https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}" target="_blank">
                    <i class="fab fa-whatsapp"></i> Share on WhatsApp 
                </a>
                <a class="twitter" href="https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}" target="_blank">
                    <i class="fab fa-twitter"></i> Share on X (Twitter)
                </a>
                <a class="linkedin" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}" target="_blank">
                    <i class="fab fa-linkedin"></i> Share on LinkedIn
                </a>
                <a class="facebook" href="https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}" target="_blank">
                    <i class="fab fa-facebook"></i> Share on Facebook
                </a>
                <a class="email" href="mailto:?subject=${encodeURIComponent('Job Alert: ' + title)}&body=${encodedText}%0A${encodedUrl}">
                    <i class="fas fa-envelope"></i> Share via Email
                </a>
            </div>
        </body>
        </html>
    `);
    shareWindow.document.close();
}

// --- Setup Save/Unsave Logic ---
/**
 * Initializes the Save/Unsave button's state and listener.
 * @param {string} jobId - The ID of the job.
 */
function setupSaveButton(jobId) {
    const saveButton = document.getElementById('save-job-btn');
    if (!saveButton) return;

    // 1. Initial State Check (Async IIFE)
    (async () => {
        if (auth.currentUser) {
            const isSaved = await isJobSaved(jobId);
            updateButtonUI(saveButton, isSaved);
        }
    })();

    // 2. Click Listener
    saveButton.addEventListener('click', async () => {
        if (!auth.currentUser) {
            alert("Please log in to save jobs.");
            return;
        }

        const isCurrentlySaved = saveButton.classList.contains('saved');

        try {
            if (isCurrentlySaved) {
                await unsaveJob(jobId);
                updateButtonUI(saveButton, false);
                displaySaveNotification("Job removed from favorites!");
            } else {
                await saveJob(jobId);
                updateButtonUI(saveButton, true);
                displaySaveNotification("Job saved to favorites!");
            }
        } catch (error) {
            console.error("Error toggling save status:", error);
            alert("Could not update save status. Please try again.");
            displaySaveNotification("Error updating status.", false);
        }
    });
}


/**
 * Updates the button's text and style.
 * @param {HTMLElement} button - The save button element.
 * @param {boolean} isSaved - The new saved state.
 */
function updateButtonUI(button, isSaved) {
    if (isSaved) {
        button.classList.add('saved');
        button.innerHTML = `<i class="fas fa-bookmark"></i> Saved`;
        button.style.backgroundColor = 'var(--color-primary, #007bff)';
        button.style.color = 'white';
        button.style.borderColor = 'var(--color-primary, #007bff)';
    } else {
        button.classList.remove('saved');
        button.innerHTML = `<i class="fas fa-bookmark"></i> Save Job`;
        // Reset to secondary styles defined in CSS
        button.style.backgroundColor = ''; 
        button.style.color = '';
        button.style.borderColor = '';
    }
}


/**
 * Displays a temporary success/failure notification near the save button.
 * @param {string} message - The message to display.
 * @param {boolean} isSuccess - Determines the color/style of the message.
 */
function displaySaveNotification(message, isSuccess = true) {
    const jobActionsDiv = document.querySelector('.job-actions');
    if (!jobActionsDiv) return;

    // 1. Create or find the notification element
    let notification = document.getElementById('save-notification');
    if (!notification) {
        notification = document.createElement('span');
        notification.id = 'save-notification';
        notification.style.marginLeft = '1rem';
        notification.style.padding = '0.4rem 0.75rem';
        notification.style.borderRadius = '0.25rem';
        notification.style.fontSize = '0.9rem';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease-in-out';
        jobActionsDiv.appendChild(notification);
    }

    // 2. Set content and style
    notification.textContent = message;
    notification.style.backgroundColor = isSuccess ? '#d4edda' : '#f8d7da'; // Green or Red
    notification.style.color = isSuccess ? '#155724' : '#721c24'; // Dark green or Dark red
    
    // 3. Show and hide the notification
    notification.style.opacity = '1';
    
    setTimeout(() => {
        notification.style.opacity = '0';
    }, 2500); // Hide after 2.5 seconds
}
