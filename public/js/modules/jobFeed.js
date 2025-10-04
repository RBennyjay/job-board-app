import { getAllJobs } from "../services/firebaseService.js";

/**
 * Creates the HTML string for a single Job Card.
 * @param {object} job - The job data object.
 * @returns {string} The HTML string.
 */
function createJobCardHTML(job) {
    
    const location = job.location || 'N/A';
    const companyName = job.company || 'Confidential';
    const date = job.createdAt && job.createdAt.toDate ? 
                 job.createdAt.toDate().toLocaleDateString() : 
                 'Unknown Date';

    // 🚨 FIX: Change the outer <div> to an <a> tag pointing to the new route
    return `
        <a href="#details/${job.id}" class="job-card"> 
            <h3 class="job-card-title" style="font-size: 1.25rem; font-weight: 600; color: var(--color-dark); margin-bottom: 0.5rem;">${job.title}</h3>
            <p style="color: gray; margin-bottom: 0.25rem;">${companyName}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem;">
                <span style="font-size: 0.875rem; color: var(--color-primary); font-weight: 500;">📍 ${location}</span>
                <span style="font-size: 0.75rem; color: #6b7280;">Posted: ${date}</span>
            </div>
        </a> 
    `;
}
/**
 * Renders the main Job Feed component into the target element.
 * @param {HTMLElement} containerElement - The DOM element to render into (e.g., #app-container).
 */
export async function renderJobFeed(containerElement) {
    containerElement.innerHTML = `
        <h1 class="page-title">Featured Opportunities in Lagos</h1>
        
        <div style="background-color: white; padding: 1rem; margin-bottom: 1.5rem; border-radius: 0.5rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);">
            <input type="text" placeholder="Search by Title, Company, or Location..." style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 0.25rem;">
        </div>

        <div id="job-list">
            <p>Loading jobs...</p>
        </div>
    `;

    const jobListContainer = document.getElementById('job-list');

    try {
        // 1. Fetch data from Firestore
        const jobs = await getAllJobs();
        
        // 2. Render jobs or display empty state
        if (jobs.length === 0) {
            jobListContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: gray;">No jobs posted yet. Be the first!</p>';
        } else {
            const jobCardsHTML = jobs.map(createJobCardHTML).join('');
            jobListContainer.innerHTML = jobCardsHTML;
        }

    } catch (error) {
        console.error("Error fetching jobs:", error);
        jobListContainer.innerHTML = `<p style="color: red; padding: 2rem;">Error loading jobs. Check console for details.</p>`;
    }
}