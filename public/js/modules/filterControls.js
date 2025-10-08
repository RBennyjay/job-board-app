// public/js/modules/filterControls.js

// Imports
import { createJobCardHTML } from "./jobFeed.js"; 
import { filterJobs, getAllJobs } from "../services/firebaseService.js";
// Added resetMapView to the imports
import { isJobInRadius, plotJobMarkers, resetFilterCenter, flyToStandoutLocation, resetMapView } from './mapIntegration.js';

/**
 * Fetches the current state of all advanced filters from the UI elements.
 * @returns {object} An object containing the current filter values (only non-empty).
 */
function getActiveFilters() {
    const filters = {};
    
    const categoryValue = document.getElementById('filter-category')?.value;
    const locationValue = document.getElementById('filter-location')?.value;
    const salaryValue = document.getElementById('filter-salary')?.value;
    const radiusInput = document.getElementById('radius-input');
    
    if (categoryValue) {
        filters.category = categoryValue;
    }
    if (locationValue) {
        filters.location = locationValue;
    }
    if (salaryValue) {
        filters.salary = salaryValue;
    }
    
    // Check the data attribute for the radius status
    if (radiusInput?.dataset.radiusApplied === 'true') {
        filters.radiusApplied = true;
    }
    
    return filters;
}

/**
 * Handles the actual filtering, data fetching, and re-rendering of the job list.
 * @param {HTMLElement} jobListContainer - The container to update with job cards.
 * @param {string} [searchTerm] - Optional term from the search box.
 */
export async function applyFilters(jobListContainer, searchTerm = '') {
    const activeFilters = getActiveFilters();
    
    jobListContainer.innerHTML = '<p style="text-align: center; padding: 2rem;">Applying filters...</p>';
    
    try {
        let jobs;
        
        // 1. Fetch from database using the strongest filters (location, category, search)
        const dbFilters = { ...activeFilters };
        delete dbFilters.radiusApplied; 
        delete dbFilters.salary; 

        if (Object.keys(dbFilters).length === 0 && searchTerm === '') {
            jobs = await getAllJobs();
        } else {
            // Priority: Search term, then Category/Location
            const query = searchTerm || dbFilters.category || dbFilters.location || '';
            jobs = await filterJobs(dbFilters); 
            // NOTE: filterJobs should ideally handle the searchTerm internally or be split for clarity
        }
        
        
        // 2. Client-Side Filtering (Salary and Radius)
        jobs = jobs.filter(job => {
            let salaryPass = true;
            // Add your salary checking logic here if (activeFilters.salary) { ... }
            
            let radiusPass = true;
            if (activeFilters.radiusApplied) {
                radiusPass = isJobInRadius(job);
            }
            
            // Apply search term filtering as a fallback client-side check if searchTerm is present
            let searchPass = true;
            if (searchTerm) {
                 const normTerm = searchTerm.toLowerCase();
                 searchPass = job.title.toLowerCase().includes(normTerm) ||
                              job.company.toLowerCase().includes(normTerm) ||
                              job.location.toLowerCase().includes(normTerm);
            }

            return salaryPass && radiusPass && searchPass;
        });


        // 3. Final Rendering and Map Update
        if (jobs.length === 0) {
            jobListContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: gray;">No results match your selected filters.</p>';
            plotJobMarkers([]); // 🚨 Clear all markers
        } else {
            const jobCardsHTML = jobs.map(createJobCardHTML).join('');
            jobListContainer.innerHTML = jobCardsHTML;
            plotJobMarkers(jobs); // 🚨 Re-plot map markers for the filtered list
        }

    } catch (error) {
        console.error("Error applying filters:", error);
        jobListContainer.innerHTML = `<p style="color: red; padding: 2rem;">Error applying filters. (Check console for database index warnings)</p>`;
    }
}


/**
 * Sets up all event listeners for the filter controls.
 */
export function setupFilterControls(jobListContainer) {
    
    const filterElements = [
        document.getElementById('filter-category'),
        document.getElementById('filter-location'),
        document.getElementById('filter-salary')
    ].filter(el => el != null);

    // 1. Attach 'change' listeners to apply filters immediately upon selection
    filterElements.forEach(select => {
        select.addEventListener('change', () => applyFilters(jobListContainer));
    });

    // 2. Attach listener for the Reset Filter button
    const resetFilterButton = document.getElementById('reset-filters-btn');
    if (resetFilterButton) {
        resetFilterButton.addEventListener('click', () => {
            filterElements.forEach(select => select.value = ''); 
            
            // Reset Radius filter state and center point
            const radiusInput = document.getElementById('radius-input');
            if(radiusInput) radiusInput.dataset.radiusApplied = 'false';
            resetFilterCenter(); // Reset the global filterCenter back to Lagos
            
            applyFilters(jobListContainer); 
        });
    }

    // --- 3. 3D View Toggle Logic ---

    const featuredJobCoordinates = [3.44, 6.45]; 
    const featuredButtonDesktop = document.getElementById('show-featured-job-button-desktop');
    const featuredButtonMobile = document.getElementById('show-featured-job-button-mobile');
    
    // UPDATED: Get both new reset button elements
    const resetButtonDesktop = document.getElementById('reset-map-view-btn-desktop');
    const resetButtonMobile = document.getElementById('reset-map-view-btn-mobile');


    // Helper to toggle button visibility across all instances
    function toggleViewButtons(showReset) {
        // Toggle Desktop Buttons
        if (resetButtonDesktop) {
            resetButtonDesktop.style.display = showReset ? 'inline-block' : 'none';
        }
        if (featuredButtonDesktop) {
            featuredButtonDesktop.style.display = showReset ? 'none' : 'inline-block';
        }

        // Toggle Mobile Buttons
        if (resetButtonMobile) {
            // Using 'block' for mobile nav links usually works better than 'inline-block'
            resetButtonMobile.style.display = showReset ? 'block' : 'none'; 
        }
        if (featuredButtonMobile) {
            featuredButtonMobile.style.display = showReset ? 'none' : 'block';
        }
    }


    // A. Setup 3D Button Listener (applies to both desktop and mobile)
    [featuredButtonDesktop, featuredButtonMobile].forEach(buttonOrAnchor => {
        if (buttonOrAnchor) {
            buttonOrAnchor.addEventListener('click', (event) => {
                event.preventDefault(); 
                flyToStandoutLocation(featuredJobCoordinates);
                toggleViewButtons(true); 
            });
        }
    });
    
    // B. Setup Reset Button Listener (applies to both desktop and mobile)
    [resetButtonDesktop, resetButtonMobile].forEach(buttonOrAnchor => {
        if (buttonOrAnchor) {
             buttonOrAnchor.addEventListener('click', (event) => {
                event.preventDefault(); // Added for the mobile <a> tag
                resetMapView(); 
                toggleViewButtons(false); 
            });
        }
    });
}