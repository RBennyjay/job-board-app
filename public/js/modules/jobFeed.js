// public/js/modules/jobFeed.js

//   Import the new searchJobs function
import { setupFilterControls } from "./filterControls.js"; 
import { getAllJobs, searchJobs } from "../services/firebaseService.js";

/**
 * Helper to truncate the job description for a short summary on the card.
 * @param {string} description - The full job description text.
 * @param {number} maxWords - Maximum number of words to display.
 * @returns {string} The truncated description followed by "..." if truncated.
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
 * Helper to render tags as styled badges, using external CSS classes.
 * @param {Array<string>} tags - Array of skill tags.
 * @returns {string} HTML string of tag badges.
 */
function renderTags(tags) {
    if (!tags || tags.length === 0) return '';
    
    // Limits the display to the first 3 tags for visual cleanliness on the card
    const displayTags = tags.slice(0, 3); 
    
    return `
        <div class="job-card-tags">
            ${displayTags.map(tag => `
                <span>${tag}</span>
            `).join('')}
            ${tags.length > 3 ? '<span class="tag-more">+ more</span>' : ''}
        </div>
    `;
}

/**
 * Creates the HTML string for a single Job Card, now showing a description summary.
 * 🚨 EXPORTED for use by filterControls.js
 * @param {object} job - The job data object, including description, tags, category, and salary.
 * @returns {string} The HTML string.
 */
export function createJobCardHTML(job) {
    // Safely extract all fields
    const location = job.location || 'N/A';
    const companyName = job.company || 'Confidential';
    const category = job.category || 'General';
    const salary = job.salary || 'Competitive';
    
    //  Get the truncated description for the card summary
    const summary = truncateDescription(job.description);

    // Safely get and format the date
    const date = job.postedAt && job.postedAt.toDate ? 
                 job.postedAt.toDate().toLocaleDateString() : 
                 'Unknown Date';

    return `
        <a href="#details/${job.id}" class="job-card"> 
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
        // 🚨 FIX 1: Normalize the input term once at the start
        const rawQueryTerm = e.target.value.trim();
        const normalizedQueryTerm = rawQueryTerm.toLowerCase(); // Now lowercase for consistency
        
        const jobListContainer = document.getElementById('job-list');

        clearTimeout(timeoutId);

        timeoutId = setTimeout(async () => {
            
            jobListContainer.innerHTML = '<p style="text-align: center; padding: 2rem;">Searching jobs...</p>';

            try {
                let jobs;
                if (normalizedQueryTerm === "") {
                    jobs = await getAllJobs(); 
                } else {
                    // 🚨 FIX 2: Pass the normalized term to searchJobs
                    jobs = await searchJobs(normalizedQueryTerm); 
                    
                    if (jobs.length === 0) {
                        const allJobs = await getAllJobs();
                        jobs = allJobs.filter(job => 
                            // 🚨 FIX 3: Include the job title check in the client-side fallback
                            job.title.toLowerCase().includes(normalizedQueryTerm) ||
                            job.company.toLowerCase().includes(normalizedQueryTerm) ||
                            job.location.toLowerCase().includes(normalizedQueryTerm)
                        );
                    }
                }
                
                // Re-render the filtered list
                if (jobs.length === 0) {
                    jobListContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: gray;">No results found for your search criteria.</p>';
                } else {
                    const jobCardsHTML = jobs.map(createJobCardHTML).join('');
                    jobListContainer.innerHTML = jobCardsHTML;
                }

            } catch (error) {
                console.error("Error during search filtering:", error);
                jobListContainer.innerHTML = `<p style="color: red; padding: 2rem;">Error executing search. Please check your Firestore security rules and indexes.</p>`;
            }
        }, 300);
    });
}

// -----------------------------------------------------------
// --- RENDER MAIN FEED (Fixed) ---
// -----------------------------------------------------------

export async function renderJobFeed(containerElement) {
    // 1. Inject the HTML structure (including filter controls)
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

                <button id="reset-filters-btn" class="btn-secondary small-btn">Reset</button>
            </div>
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
        
        // 3. Attach all listeners after the HTML is in the DOM
        setupSearchListener();
        setupFilterControls(jobListContainer);

    } catch (error) {
        // Display a helpful error if the fetch fails
        console.error("Error fetching jobs:", error);
        jobListContainer.innerHTML = `<p style="color: red; padding: 2rem;">Error loading jobs. Check console for database issues (security rules or network error).</p>`;
    }
}