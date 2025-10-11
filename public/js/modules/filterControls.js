// public/js/modules/filterControls.js

// Imports
import { createJobCardHTML } from "./jobFeed.js"; 
import { filterJobs, getAllJobs } from "../services/firebaseService.js";
import { 
    isJobInRadius, 
    plotJobMarkers, 
    resetFilterCenter, 
    flyToStandoutLocation, 
    resetMapView,
    currentRadius 
} from './mapIntegration.js';

/**
 * Helper to convert salary string (e.g., '100k+', '1M+') from the filter dropdown 
 * to a numeric value (e.g., 100000).
 */
function parseSalaryValue(salaryString) {
    // 1. Remove '+' and convert 'k'/'M' to their numeric equivalents
    let norm = salaryString.toLowerCase().replace('+', '');
    
    // Convert 'k' to multiplication factor 1000
    if (norm.endsWith('k')) {
        norm = norm.replace('k', '');
        const minK = parseInt(norm, 10);
        return { min: minK * 1000, max: undefined };
    } 
    
    // Convert 'M' to multiplication factor 1000000
    if (norm.endsWith('m')) {
        norm = norm.replace('m', '');
        const minM = parseFloat(norm); // Use parseFloat for 1.5M, etc.
        return { min: minM * 1000000, max: undefined };
    }
    
    // 2. Handle simple numbers or ranges (e.g., '100000-200000')
    const parts = norm.split('-').map(p => parseInt(p, 10));
    
    const min = parts[0] || 0;
    const max = parts[1]; // will be undefined if no range exists
    
    if (isNaN(min)) return { min: 0, max: undefined };
    
    return { min, max };
}

/**
 *  HELPER: Robustly converts a job's stored salary into the **minimum** single numeric value for comparison.
 * This ensures that when a user filters for 500k+, only jobs guaranteeing at least 500k are shown.
 * @param {string|number} salary - The raw salary value from the job object.
 * @returns {number} The normalized numeric value or NaN if unparseable.
 */
function normalizeJobSalary(salary) {
    if (!salary) return NaN;
    if (typeof salary === 'number') return salary;
    
    let norm = String(salary).toLowerCase().trim();
    
    // 1. Handle K/M shorthands (These are typically singular values)
    if (norm.includes('k')) {
        norm = norm.replace(/[^0-9k.]/g, ''); 
        return parseFloat(norm) * 1000;
    }
    if (norm.includes('m')) {
        norm = norm.replace(/[^0-9m.]/g, ''); 
        return parseFloat(norm) * 1000000;
    }
    
    // 2.  FALLBACK for full numbers and ranges (e.g., "NGN 500000 - 600000")
    
    // Replace all non-digit, non-period, non-whitespace characters with a space.
    const cleanedText = norm.replace(/[^0-9\.\s]/g, ' '); 
    
    // Split the cleaned string by spaces, convert each piece to a number, and filter out non-positive/NaN values.
    const numbers = cleanedText.split(/\s+/)
                               .map(parseFloat)
                               .filter(n => !isNaN(n) && n > 0);
    
    if (numbers.length === 0) {
        return NaN; // No valid numbers found
    }
    
    // 💡 Find the SMALLEST number. This represents the guaranteed minimum salary.
    const minNumber = Math.min(...numbers);
    
    return minNumber;
}


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
        }
        
        
        // 2. Client-Side Filtering (Salary and Radius)
        jobs = jobs.filter(job => {
            let salaryPass = true;
            
            if (activeFilters.salary) {
                // Use the now-fixed normalization function (returns the MINIMUM guaranteed salary)
                const jobSalaryNumeric = normalizeJobSalary(job.salary); 
                
                // If jobSalaryNumeric is NaN, skip salary filtering for this job
                if (isNaN(jobSalaryNumeric)) {
                    salaryPass = true; // Let the job pass if its salary is not parsable
                } else {
                    const { min, max } = parseSalaryValue(activeFilters.salary);
                    
                    if (max) {
                        // Range filter 
                        salaryPass = jobSalaryNumeric >= min && jobSalaryNumeric <= max;
                    } else {
                        // Minimum filter 
                        salaryPass = jobSalaryNumeric >= min;
                    }
                }
            }
            
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
            plotJobMarkers([]); 
        } else {
            const jobCardsHTML = jobs.map(createJobCardHTML).join('');
            jobListContainer.innerHTML = jobCardsHTML;
            plotJobMarkers(jobs); 
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
            if(radiusInput) {
                // ADDED: Reset the input value
                radiusInput.value = '50';
                radiusInput.dataset.radiusApplied = 'false';
            }
            
            // Calls the function in mapIntegration.js, which resets the map state and center marker
            resetFilterCenter(); 
            
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