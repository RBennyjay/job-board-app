// public/js/modules/mapIntegration.js

export const LOCATION_COORDINATES = {
    'lagos': [3.3792, 6.5244], // Central Lagos
    'abuja': [7.4913, 9.0722], // Central Abuja
    'remote': [0, 0], // Center of the map or a placeholder
    'hybrid': [3.3792, 6.5244] // Use Lagos as a default for Hybrid
};


export let filterCenter = LOCATION_COORDINATES['lagos']; // Default to Lagos
export let currentRadius = 50; // Default radius in kilometers

// 1. SETUP: _MAPBOX_ACCESS_TOKEN
mapboxgl.accessToken = 'pk.eyJ1IjoiYmVubnlqYXk0ciIsImEiOiJjbWdmc2U1bjIwNDI2Mmxxd3dxenZ3YXZrIn0.tlg41JkXB6vso-2GvX5y1g';

// Global map instance
let map; 
let allMarkers = {}; // Global store for all Mapbox marker objects
let filterCenterMarker = null; // 💡 Moved global state variable here

/**
 * Helper function to determine coordinates from job data.
 */
function getJobCoordinates(job) {
    if (job.latitude && job.longitude) {
        return [job.longitude, job.latitude];
    }
    
    if (job.location) {
        const key = job.location.toLowerCase().trim();
        return LOCATION_COORDINATES[key];
    }

    return null; 
}


// --- Exported Functions ---

/**
 * Initializes the Mapbox map in the specified container.
 */
export function initializeMap(containerId, jobs) {
    if (map) return map; // Return existing map instance

    // FIX: Assign to the global 'map' variable, don't redeclare with 'const'
    map = new mapboxgl.Map({
        container: containerId, // Use the passed containerId
        style: 'mapbox://styles/mapbox/standard', 
        center: [3.42, 6.44], // Center on Lagos Island/Victoria Island
        zoom: 15,
        pitch: 65, // Maximize the 3D building view
        bearing: 15 
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
        // Plot markers on initial load
        plotJobMarkers(jobs);
        
        // FIX: Add 3D Terrain logic inside 'load' or 'style.load' listener
        // The Mapbox Standard style is fully loaded here, safe to add terrain
        map.addSource('mapbox-dem', { 
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1', // The elevation data source
            'tileSize': 512,
            'maxzoom': 14
        });
        
        map.setTerrain({ 
            'source': 'mapbox-dem', 
            'exaggeration': 1.0 
        });
    });

    return map;
}

/**
 * Global function to highlight a job card and optionally scroll to it.
 */
export function highlightJobCard(jobId, shouldHighlight) {
    const card = document.getElementById(`job-card-${jobId}`);
    if (card) {
        if (shouldHighlight) {
            card.classList.add('job-card-active');
            card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            card.classList.remove('job-card-active');
        }
    }
}

/**
 * Plots markers on the map for each job listing.
 */
export function plotJobMarkers(jobs) {
    if (!map) return;

    // Remove old markers before plotting new ones (important for filtering)
    Object.values(allMarkers).forEach(marker => marker.remove());
    allMarkers = {}; 
    
    jobs.forEach((job) => {
        const coordinates = getJobCoordinates(job);

        if (coordinates) {
            const el = document.createElement('div');
            el.className = 'marker'; 
            el.setAttribute('data-job-id', job.id); // Tag element for easy lookup

            const marker = new mapboxgl.Marker(el)
                .setLngLat(coordinates)
                .addTo(map);

            // Marker Interactivity (Pin -> Card)
            el.addEventListener('mouseenter', () => {
                highlightJobCard(job.id, true);
            });
            el.addEventListener('mouseleave', () => {
                highlightJobCard(job.id, false);
            });
            el.addEventListener('click', () => {
                map.flyTo({ center: coordinates, zoom: 12 });
            });
            
            allMarkers[job.id] = marker;
        }
    });

    return allMarkers;
}

/**
 * Card -> Pin Interaction: Function to fly to a job's location when its card is hovered.
 */
export function flyToJobLocation(jobId) {
    const marker = allMarkers[jobId];
    if (marker) {
        const coordinates = marker.getLngLat();
        // Fly to location without changing zoom significantly, just a nudge
        map.flyTo({ center: coordinates, speed: 0.5 });
    }
}


// -----------------------------------------------------------
// --- GEOLOCATION HELPER ---
// -----------------------------------------------------------

/**
 * Gets the user's current location using the browser's Geolocation API.
 */
export function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser.');
            return resolve(null);
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Returns [longitude, latitude] to match Mapbox format
                resolve([position.coords.longitude, position.coords.latitude]);
            },
            (error) => {
                console.error("Geolocation Error:", error);
                alert("Could not get your location. Using default map center.");
                resolve(null);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
}


// -----------------------------------------------------------
// --- HAVERSINE DISTANCE CALCULATION ---
// -----------------------------------------------------------

/**
 * Calculates the distance between two coordinates using the Haversine formula.
 */
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    
    const toRad = (angle) => angle * (Math.PI / 180);
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    lat1 = toRad(lat1);
    lat2 = toRad(lat2);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
    
    return R * c; // Distance in km
}

/**
 * Checks if a job is within the current filter radius.
 */
export function isJobInRadius(job) {
    const jobCoords = getJobCoordinates(job); // [lng, lat]
    
    // If job has no coordinates or if filterCenter is unset (default is Lagos, so this is mostly for safety)
    if (!jobCoords || filterCenter[0] === 0) return false; 

    const distance = getDistance(
        filterCenter[1], filterCenter[0], // Center (lat, lng)
        jobCoords[1], jobCoords[0]       // Job (lat, lng)
    );

    return distance <= currentRadius;
}

/**
 * Executes a dramatic 3D fly-over animation to a specific standout location.
 * @param {Array<number>} coordinates - The target location [lng, lat].
 */
export function flyToStandoutLocation(coordinates) {
    if (!map || !coordinates) return;

    map.flyTo({
        center: coordinates,
        zoom: 16,        // Closer zoom to highlight the immediate area
        pitch: 75,        // Very high pitch (tilt) for a dramatic 3D view
        bearing: 45,       // Rotates the map for a dynamic fly-in
        speed: 0.4,        // Slower speed for a smoother, more cinematic feel
        curve: 1.5,        // Slightly increased curve for a more dramatic arc
        duration: 3000,    // Total animation time in milliseconds (3 seconds)
        essential: true
    });
}

/**
 * Resets the map view back to the default, top-down 2D perspective.
 */
export function resetMapView() {
    if (!map) return;

    map.flyTo({
        center: [3.42, 6.44], // Focus back on Lagos Island/Victoria Island (or a city-wide default)
        zoom: 10,              // Zoom out to a city-wide level
        pitch: 0,              // Crucially, set the pitch back to 0 (top-down view)
        bearing: 0,            // Remove any rotation
        speed: 0.8,            // Quick but smooth transition
        duration: 1500        // 1.5 second animation
    });
}

/**
 * Renders a marker at the current filterCenter and flies the map to it.
 * @param {[number, number]} coordinates - The new center coordinates [lng, lat].
 * @param {boolean} shouldFly - If true, flies the map to the coordinates.
 */
export function updateMapFilterCenter(coordinates, shouldFly = true) {
    if (!map) return;
    
    // 1. Update the global filter center state
    filterCenter[0] = coordinates[0];
    filterCenter[1] = coordinates[1];
    
    // 2. Remove old marker if it exists
    if (filterCenterMarker) {
        filterCenterMarker.remove();
    }
    
    // 3. Create a new, distinct marker for the filter center
    const el = document.createElement('div');
    el.className = 'filter-center-marker'; // Use a distinct class for styling (e.g., a blue dot)
    el.innerHTML = '<i class="fas fa-crosshairs" style="color: var(--color-primary); font-size: 24px;"></i>';

    filterCenterMarker = new mapboxgl.Marker(el)
        .setLngLat(coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(`<h3>Search Center</h3><p>Radius: ${currentRadius} km</p>`))
        .addTo(map);

    // 4. Update the map view
    if (shouldFly) {
        // Fly to the center and zoom out slightly to show the radius context
        map.flyTo({ center: coordinates, zoom: 11, speed: 1.2 });
    }
}


/**
 * EXPORTED helper to reset filter state
 * Overrides the original placeholder function to also handle map state.
 */
export function resetFilterCenter() { // 💡 THIS IS NOW THE ONLY DEFINITION
    filterCenter = LOCATION_COORDINATES['lagos'];
    currentRadius = 50; // Reset radius value
    
    if (filterCenterMarker) {
        filterCenterMarker.remove();
        filterCenterMarker = null;
    }
    
    // Reset the map to the default view
    resetMapView(); 
}