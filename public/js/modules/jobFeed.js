// public/js/modules/jobFeed.js

// Import all required functions from firebaseService and mapIntegration
import { setupFilterControls, applyFilters } from "./filterControls.js"; // 🚨 ADDED applyFilters
import { getAllJobs, searchJobs } from "../services/firebaseService.js";
import { 
    initializeMap, 
    highlightJobCard, 
    flyToJobLocation, 
    getCurrentLocation, 
    filterCenter, // Imported for direct state update
    currentRadius // Imported for direct state update
} from "./mapIntegration.js"; 

// A variable to store the Mapbox map instance for easy access in listeners
let mapInstance;

// -----------------------------------------------------------
// --- JOB CARD HELPERS ---
// -----------------------------------------------------------

/**
 * Helper to truncate the job description for a short summary on the card.
 */
function truncateDescription(description, maxWords = 15) {
    if (!description) return 'No description provided.';
    const words = description.split(/\s+/);
    if (words.length <= maxWords) {
        return description;
    }
    return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Creates the HTML string for a single Job Card.
 */
export function createJobCardHTML(job) {
    const location = job.location || 'N/A';
    const companyName = job.company || 'Confidential';
    const category = job.category || 'General';
    const salary = job.salary || 'Competitive';
    const summary = truncateDescription(job.description);
    const date = job.postedAt && job.postedAt.toDate ? 
                 job.postedAt.toDate().toLocaleDateString() : 
                 'Unknown Date';

    return `
        <a href="#details/${job.id}" 
           class="job-card" 
           id="job-card-${job.id}" 
           data-job-id="${job.id}"> 
            
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
// --- SEARCH LISTENER FUNCTION ---
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
            // Re-run applyFilters to ensure all current filters (including radius) are honored
            // For now, we'll let applyFilters handle the list update to simplify logic, 
            // but in a production app, the search and filters should be synchronized better.
            applyFilters(jobListContainer, normalizedQueryTerm); 
        }, 300);
    });
}

// -----------------------------------------------------------
// --- MAP INTERACTION LISTENERS (Card -> Pin) ---
// -----------------------------------------------------------

function setupCardMapListeners() {
    const jobCards = document.querySelectorAll('.job-card');
    jobCards.forEach(card => {
        const jobId = card.dataset.jobId;

        card.addEventListener('mouseenter', () => {
            flyToJobLocation(jobId);
        });
    });
}

// -----------------------------------------------------------
// --- RADIUS LISTENERS ---
// -----------------------------------------------------------

function setupRadiusListeners(jobListContainer) {
    const locateMeBtn = document.getElementById('locate-me-btn');
    const radiusInput = document.getElementById('radius-input');
    const applyRadiusBtn = document.getElementById('apply-radius-btn');

    // 1. Geolocation Button
    locateMeBtn.addEventListener('click', async () => {
        const coords = await getCurrentLocation(); // [lng, lat]
        if (coords) {
            // Update the global filter center point
            filterCenter[0] = coords[0];
            filterCenter[1] = coords[1];
            
            //  Use the stored mapInstance to fly the map
            if (mapInstance) {
                mapInstance.flyTo({ center: coords, zoom: 12 });
            }
            // Set a flag that location filtering is now active
            radiusInput.dataset.radiusApplied = 'true';
            applyFilters(jobListContainer); 
        }
    });

    // 2. Apply Radius Button
    applyRadiusBtn.addEventListener('click', () => {
        const radiusValue = parseInt(radiusInput.value, 10);
        
        if (radiusValue > 0 && filterCenter[0] !== 0) {
            // Update global radius variable
            currentRadius = radiusValue;
            
            // Set a flag in the filter state 
            radiusInput.dataset.radiusApplied = 'true'; 

            // Re-apply all filters
            applyFilters(jobListContainer); 
        } else {
            alert("Please click 'Find Jobs Near Me' or select a location first to set the center point.");
        }
    });
}

// -----------------------------------------------------------
// --- RENDER MAIN FEED (Fixed HTML Structure) ---
// -----------------------------------------------------------

export async function renderJobFeed(containerElement) {
    // 1. Inject the HTML structure (Correctly nested and ordered)
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

    try {
        // 2. Fetch and render initial job list
        const jobs = await getAllJobs();
        
        if (jobs.length === 0) {
            jobListContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: gray;">No jobs posted yet. Be the first!</p>';
        } else {
            const jobCardsHTML = jobs.map(createJobCardHTML).join('');
            jobListContainer.innerHTML = jobCardsHTML;
        }
        
        //  Initialize Map and store the instance
        mapInstance = initializeMap('job-map', jobs);

        // 3. Attach all listeners after the HTML is in the DOM
        setupSearchListener();
        setupFilterControls(jobListContainer);
        setupCardMapListeners();
        setupRadiusListeners(jobListContainer); 

    } catch (error) {
        console.error("Error fetching jobs:", error);
        jobListContainer.innerHTML = `<p style="color: red; padding: 2rem;">Error loading jobs. Check console for database issues (security rules or network error).</p>`;
    }
}