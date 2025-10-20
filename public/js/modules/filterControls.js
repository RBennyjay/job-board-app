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

// --- Helper Functions  ---

function parseSalaryValue(salaryString) {
    let norm = salaryString.toLowerCase().replace('+', '');
    
    
    if (norm.endsWith('k')) {
        norm = norm.replace('k', '');
        const minK = parseInt(norm, 10);
        return { min: minK * 1000, max: undefined };
    } 
    
    if (norm.endsWith('m')) {
        norm = norm.replace('m', '');
        const minM = parseFloat(norm); 
        return { min: minM * 1000000, max: undefined };
    }
    
    const parts = norm.split('-').map(p => parseInt(p, 10));
    
    const min = parts[0] || 0;
    const max = parts[1]; 
    
    if (isNaN(min)) return { min: 0, max: undefined };
    
    return { min, max };
}

function normalizeJobSalary(salary) {
    if (!salary) return NaN;
    if (typeof salary === 'number') return salary;
    
    let norm = String(salary).toLowerCase().trim();
    
    if (norm.includes('k')) {
        norm = norm.replace(/[^0-9k.]/g, ''); 
        return parseFloat(norm) * 1000;
    }
    if (norm.includes('m')) {
        norm = norm.replace(/[^0-9m.]/g, ''); 
        return parseFloat(norm) * 1000000;
    }
    
    const cleanedText = norm.replace(/[^0-9\.\s]/g, ' '); 
    
    const numbers = cleanedText.split(/\s+/)
                               .map(parseFloat)
                               .filter(n => !isNaN(n) && n > 0);
    
    if (numbers.length === 0) {
        return NaN; 
    }
    
    const minNumber = Math.min(...numbers);
    
    return minNumber;
}


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
    
    if (radiusInput?.dataset.radiusApplied === 'true') {
        filters.radiusApplied = true;
    }
    
    return filters;
}

/**
 * Handles the actual filtering, data fetching, and re-rendering of the job list.
 *  Accepts isAdminStatusFromCaller parameter.
 * @param {HTMLElement} jobListContainer - The container to update with job cards.
 * @param {string} [searchTerm] - Optional term from the search box.
 * @param {boolean} isAdminStatusFromCaller - The admin status of the current user.
 */

export async function applyFilters(jobListContainer, searchTerm = '', isAdminStatusFromCaller) {
    const activeFilters = getActiveFilters();
    
    jobListContainer.innerHTML = '<p style="text-align: center; padding: 2rem;">Applying filters...</p>';
    
    try {
        let jobs;
        
        const dbFilters = { ...activeFilters };
        delete dbFilters.radiusApplied; 
        delete dbFilters.salary; 

        // 1. Determine Fetch Strategy
        //  If there is a search term OR if only salary/radius is applied, 
        // fetch ALL jobs to ensure the client-side filtering has the complete data set.
        const onlyCategoryAndLocationFilters = Object.keys(dbFilters).length > 0 && searchTerm === '';

        if (onlyCategoryAndLocationFilters) {
            // Only category/location filters exist. Use a more efficient DB query.
            jobs = await filterJobs(dbFilters); 
        } else {
            // Search term is active, or no filters, or only client-side filters (salary/radius).
            // Fetch ALL jobs and rely on client-side filtering below.
            jobs = await getAllJobs();
        }
        
        
        // 2. Client-Side Filtering (NOW APPLIED TO ALL filters if all jobs are  fetched )
        jobs = jobs.filter(job => {
            
            // --- 2a. Filter by Category & Location (Client-side, only if we fetched ALL jobs)
            if (activeFilters.category && job.category !== activeFilters.category) {
                 return false;
            }
            if (activeFilters.location && job.location !== activeFilters.location) {
                 return false;
            }


            // --- 2b. Salary Filter 
            let salaryPass = true;
            
            if (activeFilters.salary) {
                const jobSalaryNumeric = normalizeJobSalary(job.salary); 
                
                if (isNaN(jobSalaryNumeric)) {
                    salaryPass = true; 
                } else {
                    const { min, max } = parseSalaryValue(activeFilters.salary);
                    
                    if (max) {
                        salaryPass = jobSalaryNumeric >= min && jobSalaryNumeric <= max;
                    } else {
                        salaryPass = jobSalaryNumeric >= min;
                    }
                }
            }
            
            // --- 2c. Radius Filter 
            let radiusPass = true;
            if (activeFilters.radiusApplied) {
                radiusPass = isJobInRadius(job);
            }
            
            // --- 2d. Search Term Filter 
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
            //  Pass isAdminStatusFromCaller status to createJobCardHTML
            const jobCardsHTML = jobs.map(job => createJobCardHTML(job, isAdminStatusFromCaller)).join('');
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
 *  Accepts isAdmin parameter.
 * @param {HTMLElement} jobListContainer - The container to update with job cards.
 * @param {boolean} isAdmin - The admin status of the current user.
 */
export function setupFilterControls(jobListContainer, isAdmin) {
    
    const filterElements = [
        document.getElementById('filter-category'),
        document.getElementById('filter-location'),
        document.getElementById('filter-salary')
    ].filter(el => el != null);

    // 1. Attach 'change' listeners to apply filters immediately upon selection
    filterElements.forEach(select => {
        select.addEventListener('change', () => {
            //  Pass isAdmin status
            applyFilters(jobListContainer, null, isAdmin);
        });
    });

    // 2. Attach listener for the Reset Filter button
    const resetFilterButton = document.getElementById('reset-filters-btn');
    if (resetFilterButton) {
        resetFilterButton.addEventListener('click', () => {
            filterElements.forEach(select => select.value = ''); 
            
            const radiusInput = document.getElementById('radius-input');
            if(radiusInput) {
                radiusInput.value = '50';
                radiusInput.dataset.radiusApplied = 'false';
            }
            
            resetFilterCenter(); 
            
            //  Pass isAdmin status
            applyFilters(jobListContainer, null, isAdmin); 
        });
    }

    // --- 3. 3D View Toggle Logic 

    const featuredJobCoordinates = [3.44, 6.45]; 
    const featuredButtonDesktop = document.getElementById('show-featured-job-button-desktop');
    const featuredButtonMobile = document.getElementById('show-featured-job-button-mobile');
    
    const resetButtonDesktop = document.getElementById('reset-map-view-btn-desktop');
    const resetButtonMobile = document.getElementById('reset-map-view-btn-mobile');

    function toggleViewButtons(showReset) {
        if (resetButtonDesktop) {
            resetButtonDesktop.style.display = showReset ? 'inline-block' : 'none';
        }
        if (featuredButtonDesktop) {
            featuredButtonDesktop.style.display = showReset ? 'none' : 'inline-block';
        }

        if (resetButtonMobile) {
            resetButtonMobile.style.display = showReset ? 'block' : 'none'; 
        }
        if (featuredButtonMobile) {
            featuredButtonMobile.style.display = showReset ? 'none' : 'block';
        }
    }

    [featuredButtonDesktop, featuredButtonMobile].forEach(buttonOrAnchor => {
        if (buttonOrAnchor) {
            buttonOrAnchor.addEventListener('click', (event) => {
                event.preventDefault(); 
                flyToStandoutLocation(featuredJobCoordinates);
                toggleViewButtons(true); 
            });
        }
    });
    
    [resetButtonDesktop, resetButtonMobile].forEach(buttonOrAnchor => {
        if (buttonOrAnchor) {
            buttonOrAnchor.addEventListener('click', (event) => {
                event.preventDefault(); 
                resetMapView(); 
                toggleViewButtons(false); 
            });
        }
    });
}