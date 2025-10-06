// public/js/modules/jobFeed.js

//   Import the new searchJobs function
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
 *   no longer used in createJobCardHTML but is kept in the file.
 * @param {Array<string>} tags - Array of skill tags.
 * @returns {string} HTML string of tag badges.
 */
function renderTags(tags) {
    if (!tags || tags.length === 0) return '';
    
    // Limits the display to the first 3 tags for visual cleanliness on the card
    const displayTags = tags.slice(0, 3); 
    
    // Using job-card-tags and the span styles defined in styles.css
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
 * @param {object} job - The job data object, including description, tags, category, and salary.
 * @returns {string} The HTML string.
 */
function createJobCardHTML(job) {
    // Safely extract all fields
    const location = job.location || 'N/A';
    const companyName = job.company || 'Confidential';
    const category = job.category || 'General';
    const salary = job.salary || 'Competitive';
    
    //  Get the truncated description for the card summary
    const summary = truncateDescription(job.description);

    // Safely get and format the date
    const date = job.postedAt && job.postedAt.toDate ? 
                 job.postedAt.toDate().toLocaleDateString() : 
                 'Unknown Date';

   
    // const tagsHTML = renderTags(job.tags); 

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
// --- SEARCH LISTENER FUNCTION (Remains the same) ---
// -----------------------------------------------------------

function setupSearchListener() {
    const searchInput = document.getElementById('job-search-input');
    if (!searchInput) return;

    // Implement a simple debounce to limit database reads
    let timeoutId;
    
    searchInput.addEventListener('input', async (e) => {
        const queryTerm = e.target.value.trim();
        const jobListContainer = document.getElementById('job-list');

        clearTimeout(timeoutId);

        // Delay the search by 300ms
        timeoutId = setTimeout(async () => {
            
            jobListContainer.innerHTML = '<p style="text-align: center; padding: 2rem;">Searching jobs...</p>';

            try {
                let jobs;
                if (queryTerm === "") {
                    jobs = await getAllJobs(); 
                } else {
                    jobs = await searchJobs(queryTerm);
                    
                    if (jobs.length === 0) {
                        const allJobs = await getAllJobs();
                        jobs = allJobs.filter(job => 
                            job.company.toLowerCase().includes(queryTerm.toLowerCase()) ||
                            job.location.toLowerCase().includes(queryTerm.toLowerCase())
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
        }, 300); // Debounce time
    });
}


// -----------------------------------------------------------
// --- RENDER MAIN FEED (Remains the same) ---
// -----------------------------------------------------------

export async function renderJobFeed(containerElement) {
    // HTML is cleaned up to remove all inline styles from this section
    containerElement.innerHTML = `
        <h1 class="page-title">Featured Opportunities in Lagos</h1>
        
        <div id="filter-controls" class="filter-controls-card">
            
            <input type="text" id="job-search-input" placeholder="Search by Title, Company, or Location..." class="search-input">
            
            <div id="advanced-filters" class="advanced-filters-row">
                <p style="color: gray; font-size: 0.9rem; padding: 0.5rem 0;">Ready for filtering...</p>
            </div>
        </div>

        <div id="job-list">
            <p style="text-align: center; padding: 2rem;">Loading jobs...</p>
        </div>
    `;

    const jobListContainer = document.getElementById('job-list');

    try {
        const jobs = await getAllJobs();
        
        if (jobs.length === 0) {
            jobListContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: gray;">No jobs posted yet. Be the first!</p>';
        } else {
            const jobCardsHTML = jobs.map(createJobCardHTML).join('');
            jobListContainer.innerHTML = jobCardsHTML;
        }
        
        setupSearchListener();

    } catch (error) {
        console.error("Error fetching jobs:", error);
        jobListContainer.innerHTML = `<p style="color: red; padding: 2rem;">Error loading jobs. Check console for details.</p>`;
    }
}