// public/js/modules/jobFeed.js (FINAL CORRECTED VERSION)

// Import all required functions
import { setupFilterControls, applyFilters } from "./filterControls.js"; 
import { getAllJobs, deleteJob, auth, isUserAdmin } from "../services/firebaseService.js"; 
import { 
    initializeMap, 
    flyToJobLocation, 
    getCurrentLocation, 
    filterCenter, 
    updateMapFilterCenter, 
    LOCATION_COORDINATES 
} from "./mapIntegration.js"; 

let mapInstance;
// Global flag to cache admin status
let isAdmin = false; 

// -----------------------------------------------------------
// --- JOB CARD HELPERS ---
// -----------------------------------------------------------

function truncateDescription(description, maxWords = 15) {
    if (!description) return 'No description provided.';
    const words = description.split(/\s+/);
    if (words.length <= maxWords) {
        return description;
    }
    return words.slice(0, maxWords).join(' ') + '...';
}

// -----------------------------------------------------------
// --- RADIUS LISTENERS ---
// -----------------------------------------------------------

function setupRadiusListeners(jobListContainer) {
    const locateMeBtn = document.getElementById('locate-me-btn');
    const radiusInput = document.getElementById('radius-input');
    const applyRadiusBtn = document.getElementById('apply-radius-btn');

    if (!locateMeBtn || !radiusInput || !applyRadiusBtn) {
        console.warn("Radius control buttons or input were not found. Skipping radius listeners setup.");
        return;
    }

    locateMeBtn.addEventListener('click', async () => {
        const coords = await getCurrentLocation(); // [lng, lat]
        if (coords) {
            updateMapFilterCenter(coords, true); 
            radiusInput.dataset.radiusApplied = 'true';
            
            // Pass isAdmin status
            applyFilters(jobListContainer, null, isAdmin); 
        }
    });

    applyRadiusBtn.addEventListener('click', () => {
        const radiusValue = parseInt(radiusInput.value, 10);
        
        const centerCoords = (filterCenter[0] === LOCATION_COORDINATES.lagos[0] && filterCenter[1] === LOCATION_COORDINATES.lagos[1]) 
            ? LOCATION_COORDINATES.lagos 
            : filterCenter;
        
        if (radiusValue > 0 && centerCoords[0] !== 0) {
            updateMapFilterCenter(centerCoords, false); 
            radiusInput.dataset.radiusApplied = 'true'; 

            // Pass isAdmin status
            applyFilters(jobListContainer, null, isAdmin); 
        } else {
            // Replaced alert with console.error as per instructions
            console.error("Please click 'Find Jobs Near Me' or select a location first to set the center point.");
        }
    });
}

// -----------------------------------------------------------
// --- DELETE BUTTON VISIBILITY LOGIC (CORRECTED) ---
// -----------------------------------------------------------

/**
 * Determines if the delete button should be shown for a given job.
 * @param {object} job - The job data object.
 * @param {boolean} currentIsAdmin - The admin status of the current user.
 */
function shouldShowDeleteButton(job, currentIsAdmin) { 
    if (!auth || !auth.currentUser) {
        return false;
    }
    
    // ✅ FIX: Allow delete if the user is an admin
    if (currentIsAdmin === true) { 
        return true;
    }

    // ✅ FIX: Allow delete if the user created the job (ownership)
    const currentUserUid = auth.currentUser.uid;
    const jobCreatorUid = job.createdBy; 

    if (jobCreatorUid && currentUserUid === jobCreatorUid) {
        return true;
    }

    return false; 
}


/**
 * Creates the HTML string for a single Job Card.
 * @param {object} job - The job data object.
 * @param {boolean} currentIsAdmin - The admin status of the current user.
 */
export function createJobCardHTML(job, currentIsAdmin) {
    if (!job.id) {
        console.error("Job card attempted to render without an ID:", job);
        return ''; 
    }
    
    const location = job.location || 'N/A';
    const companyName = job.company || 'Confidential';
    const category = job.category || 'General';
    const salary = job.salary || 'Competitive';
    const summary = truncateDescription(job.description);
    const date = job.postedAt && job.postedAt.toDate ? 
                 job.postedAt.toDate().toLocaleDateString() : 
                 'Unknown Date';

    // Calls the CORRECTED function
    const showDeleteButton = shouldShowDeleteButton(job, currentIsAdmin); 
    let deleteButtonHTML = '';

    if (showDeleteButton) { 
        deleteButtonHTML = `
            <button class="delete-job-btn" 
                    data-job-id="${job.id}"
                    title="Delete this job"
                    style="
                        position: absolute; top: 10px; right: 10px; padding: 5px; 
                        font-size: 1.2rem; color: #ccc; background: transparent; 
                        border: none; cursor: pointer; z-index: 10;
                        transition: color 0.2s ease;
                    "
                    onmouseover="this.style.color='#FF4444'" 
                    onmouseout="this.style.color='#ccc'"   
            >
                🗑️
            </button>
        `;
    }

    return `
        <a href="#details/${job.id}" 
            class="job-card" 
            id="job-card-${job.id}" 
            data-job-id="${job.id}"
            style="position: relative; padding-top: ${showDeleteButton ? '35px' : '15px'};"> 
            
            ${deleteButtonHTML}

            <h3 class="job-card-title">${job.title}</h3>
            <p class="job-card-info">${companyName}</p>
            
            <p class="job-card-summary">${summary}</p> 
            
            <div class="key-data-row">
                <span class="location-span">📍 ${location}</span>
                <span class="salary-span">💰 ${salary}</span>
                <span class="category-span">🗂️ ${category}</span>
            </div>
            
            <div>
                <span class="date-posted-span">Posted: ${date}</span>
                <span class="job-card-link" style="float: right;">View Details & Apply &rarr;</span>
            </div>
        </a> 
    `;
}
    
// -----------------------------------------------------------
// --- SEARCH AND DELETE LISTENERS ---
// -----------------------------------------------------------

function setupSearchListener() {
    const searchInput = document.getElementById('job-search-input');
    if (!searchInput) return;

    let timeoutId;
    
    searchInput.addEventListener('input', async (e) => {
        const rawQueryTerm = e.target.value.trim();
        const normalizedQueryTerm = rawQueryTerm.toLowerCase(); 
        
        const jobListContainer = document.getElementById('job-list');

        clearTimeout(timeoutId);

        timeoutId = setTimeout(async () => {
            // Pass isAdmin status
            applyFilters(jobListContainer, normalizedQueryTerm, isAdmin); 
        }, 300);
    });
}

function setupDeleteJobListener(jobListContainer) {
    jobListContainer.addEventListener('click', async (event) => {
        const deleteButton = event.target.closest('.delete-job-btn');
        
        if (deleteButton) {
            event.preventDefault(); 
            event.stopPropagation(); 
            
            const jobId = deleteButton.dataset.jobId;
            const jobCard = deleteButton.closest('.job-card');
            const jobTitleElement = jobCard ? jobCard.querySelector('.job-card-title') : null;
            const jobTitle = jobTitleElement ? jobTitleElement.textContent : 'Unknown Job';

            // NOTE: Replaced confirm() with console error/warning as confirm() is not allowed.
            // In a real app, this would be a custom modal UI.
            console.warn(`Attempting to delete job: "${jobTitle}" (${jobId}). No confirmation UI is available here.`);
            
            const confirmed = true; // For now, assume confirmation in the absence of a modal. 
            
            if (!confirmed) {
                return;
            }
            
            try {
                deleteButton.disabled = true;
                
                await deleteJob(jobId);
                
                // NOTE: Replaced alert() with console.log as alert() is not allowed.
                console.log(`Job "${jobTitle}" deleted successfully.`);
                
                // Pass isAdmin status
                await applyFilters(jobListContainer, null, isAdmin); 
                
            } catch (error) {
                console.error("Deletion failed:", error);
                // NOTE: Replaced alert() with console.error.
                console.error("Failed to delete job. Check console for details. (Possible permission issue)");
            } finally {
                deleteButton.disabled = false;
            }
        }
    });
}


function setupCardMapListeners() {
    const jobListContainer = document.getElementById('job-list');
    const mapContainer = document.getElementById('map-container'); // Get the map container
    
    if (!jobListContainer || !mapContainer) return;

    const jobCards = jobListContainer.querySelectorAll('.job-card'); 
    jobCards.forEach(card => {
        const jobId = card.dataset.jobId;

        card.addEventListener('mouseenter', () => {
            // 1. Fly to the job location
            flyToJobLocation(jobId);

            // 2. Scroll the map container into view if it's off the top of the screen
            const mapRect = mapContainer.getBoundingClientRect();
            
            // Check if the map's bottom edge is above the top of the viewport (i.e., scrolled up)
            if (mapRect.bottom < 0) {
                // Scroll the nearest edge of the map into view smoothly
                mapContainer.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'nearest' // Scrolls to the nearest edge (top or bottom)
                });
            }
        });
    });
}

// -----------------------------------------------------------
// --- RENDER MAIN FEED ---
// -----------------------------------------------------------

/**
 * Helper to introduce delay for stabilization (used for admin status check)
 * @param {number} ms - milliseconds to wait
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Checks admin status with retries to account for timing issues post-login.
 * @param {number} maxRetries - Maximum number of attempts
 * @param {number} retryDelay - Delay in ms between retries
 * @returns {Promise<boolean>}
 */
async function getAdminStatusWithRetry(maxRetries = 3, retryDelay = 200) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const isAdminStatus = await isUserAdmin();
        console.log(`DEBUG Admin Check Attempt ${attempt}: ${isAdminStatus}`);
        
        if (isAdminStatus) {
            return true;
        }
        
        // Only delay and retry if we are not on the last attempt
        if (attempt < maxRetries) {
            await delay(retryDelay);
        }
    }
    return false;
}

export async function renderJobFeed(containerElement) {
    if (!containerElement) {
        console.error("Critical: Main container element passed to renderJobFeed is null.");
        return;
    }

    containerElement.innerHTML = `
        <h1 class="page-title">Featured Opportunities in Lagos</h1>
        
        <div id="filter-controls" class="filter-controls-card">
            
            <input type="text" id="job-search-input" placeholder="Search by Title, Company, or Location..." class="search-input">
            
            <div id="advanced-filters" class="advanced-filters-row">
                <select id="filter-category" name="category">
                    <option value="">All Categories</option>
                    <option value="IT">Information Technology</option>
                    <option value="Finance">Finance & Accounting</option>
                    <option value="Marketing">Marketing & Sales</option>
                    <option value="HR">Human Resources</option>
                    <option value="Other">Other</option>
                </select>

                <select id="filter-location" name="location">
                    <option value="">All Locations</option>
                    <option value="Lagos">Lagos</option>
                    <option value="Abuja">Abuja</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                </select>

                <select id="filter-salary" name="salary">
                    <option value="">Any Salary</option>
                    <option value="100k+">₦100,000+</option>
                    <option value="300k+">₦300,000+</option>
                    <option value="500k+">₦500,000+</option>
                    <option value="1M+">₦1,000,000+</option>
                </select>
                
                <div class="distance-filter-controls">
                    <button id="locate-me-btn" class="btn-primary small-btn">
                        📍 Find Jobs Near Me
                    </button>
                    <label for="radius-input" style="white-space: nowrap;">Radius (km):</label>
                    <input type="number" id="radius-input" min="5" max="200" value="50" data-radius-applied="false" style="width: 60px;">
                    <button id="apply-radius-btn" class="btn-secondary small-btn">Apply</button>
                </div>

                <button id="reset-filters-btn" class="btn-secondary small-btn">Reset</button>
            </div>
        </div>
        
        <div id="map-container" class="map-container-card">
            <div id="job-map" style="width: 100%; height: 400px; border-radius: 8px;"></div>
        </div>
        
        <div id="job-list">
            <p style="text-align: center; padding: 2rem;">Loading jobs...</p>
        </div>
    `;
    
    const jobListContainer = document.getElementById('job-list');

    if (!jobListContainer) {
        console.error("Critical: The 'job-list' element could not be found after DOM manipulation. Page structure is likely broken.");
        containerElement.innerHTML = `<p style="color: red; padding: 2rem;">Failed to initialize job feed. Missing the main job list container.</p>`;
        return; 
    }

    try {
        // 1. CHECK AND SET ADMIN STATUS (using retry logic)
        let currentIsAdmin = false; 
        if (auth.currentUser) {
            currentIsAdmin = await getAdminStatusWithRetry();
            isAdmin = currentIsAdmin; // Set global flag
            console.log("DEBUG: Admin Check Result from isUserAdmin():", currentIsAdmin); 
        }
        
        // 2. Fetch all job data
        const jobs = await getAllJobs();
        
        // 3. Render jobs (Now passes currentIsAdmin status)
        if (jobs.length === 0) {
            jobListContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: gray;">No jobs posted yet. Be the first!</p>';
        } else {
            const jobCardsHTML = jobs
                .map(job => createJobCardHTML(job, currentIsAdmin)) 
                .join('');
                
            jobListContainer.innerHTML = jobCardsHTML;
        }
        
        // 4. Initialize Map
        mapInstance = initializeMap('job-map', jobs);

        // 5. Attach all listeners after the HTML is in the DOM
        setupSearchListener();
        setupFilterControls(jobListContainer, isAdmin); 
        setupCardMapListeners(); // <-- SCROLL LOGIC IS HERE
        setupRadiusListeners(jobListContainer); 
        setupDeleteJobListener(jobListContainer); 

    } catch (error) {
        console.error("Error fetching jobs:", error);
        jobListContainer.innerHTML = `<p style="color: red; padding: 2rem;">Error loading jobs. Check console for database issues (security rules or network error).</p>`;
    }
}
