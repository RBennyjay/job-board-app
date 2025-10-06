// public/js/modules/filterControls.js

// Import the service function for advanced filtering and the initial fetch
import { createJobCardHTML } from "./jobFeed.js"; 
import { filterJobs, getAllJobs } from "../services/firebaseService.js";
// Import the job card rendering helper from jobFeed.js
// import { createJobCardHTML } from "./jobFeed.js"; 


/**
 * Fetches the current state of all advanced filters from the UI elements.
 * @returns {object} An object containing the current filter values (only non-empty).
 */
function getActiveFilters() {
    const filters = {};
    
    // Collect values from the dropdowns
    const categoryValue = document.getElementById('filter-category')?.value;
    const locationValue = document.getElementById('filter-location')?.value;
    const salaryValue = document.getElementById('filter-salary')?.value;

    // Only include filters that have a selected value (i.e., not the default empty string)
    if (categoryValue) {
        filters.category = categoryValue;
    }
    if (locationValue) {
        filters.location = locationValue;
    }
    if (salaryValue) {
        filters.salary = salaryValue;
    }
    
    return filters;
}

/**
 * Handles the actual filtering, data fetching, and re-rendering of the job list.
 * This is the core logic that combines filters with the live feed.
 * @param {HTMLElement} jobListContainer - The container to update with job cards.
 */
async function applyFilters(jobListContainer) {
    const filters = getActiveFilters();
    
    // Visually indicate that a search is happening
    jobListContainer.innerHTML = '<p style="text-align: center; padding: 2rem;">Applying filters...</p>';
    
    try {
        let jobs;
        
        if (Object.keys(filters).length === 0) {
            // If no filters are active, fetch all jobs
            jobs = await getAllJobs();
        } else {
            // Otherwise, use the advanced filter function
            jobs = await filterJobs(filters);
        }
        
        // Re-render the job list dynamically
        if (jobs.length === 0) {
            jobListContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: gray;">No results match your selected filters.</p>';
        } else {
            const jobCardsHTML = jobs.map(createJobCardHTML).join('');
            jobListContainer.innerHTML = jobCardsHTML;
        }

    } catch (error) {
        console.error("Error applying filters:", error);
        jobListContainer.innerHTML = `<p style="color: red; padding: 2rem;">Error applying filters. (Check console for database index warnings)</p>`;
    }
}

/**
 * Sets up all event listeners for the filter controls.
 * @param {HTMLElement} jobListContainer - The container element for the job cards.
 */
export function setupFilterControls(jobListContainer) {
    
    // Array of all filter elements (Category, Location, Salary)
    const filterElements = [
        document.getElementById('filter-category'),
        document.getElementById('filter-location'),
        document.getElementById('filter-salary')
    ].filter(el => el != null);

    // 1. Attach 'change' listeners to apply filters immediately upon selection
    filterElements.forEach(select => {
        select.addEventListener('change', () => applyFilters(jobListContainer));
    });

    // 2. Attach listener for the Reset button
    const resetButton = document.getElementById('reset-filters-btn');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            filterElements.forEach(select => select.value = ''); // Reset all to default (empty string)
            applyFilters(jobListContainer); // Re-run with no filters
        });
    }
}