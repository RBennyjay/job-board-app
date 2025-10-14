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

// Global map instance (module-scoped)
let map; 
let allMarkers = {}; // Global store for all Mapbox marker objects
let filterCenterMarker = null; 

//  NEW EXPORTED SETTER FUNCTION 
/**
 * Allows other modules (like jobFeed.js) to set the initialized map object.
 * @param {mapboxgl.Map} mapInstance - The created map object.
 */
export function setMapInstance(mapInstance) {
    map = mapInstance; // Set the module-scoped map variable
}


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
 * @returns {mapboxgl.Map} The created map instance.
 */
export function initializeMap(containerId, jobs) {
    if (map) return map; 

    //  Start map in a 2D view (pitch: 0, bearing: 0) 
    // to make the 'View HQ in 3D' button a true action/toggle.
    map = new mapboxgl.Map({
        container: containerId, // Use the passed containerId
        style: 'mapbox://styles/mapbox/standard', 
        center: [3.42, 6.44], // Center on Lagos Island/Victoria Island
        zoom: 10, // Zoomed out for a broader job feed view
        pitch: 0, //  2D View
        bearing: 0 //  No rotation
    });

    // CRITICAL: Ensure NavigationControl is added (includes the default 3D/North buttons)
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
        // Plot markers on initial load
        plotJobMarkers(jobs);
        
        // Add 3D Terrain logic inside 'load' or 'style.load' listener
        map.addSource('mapbox-dem', { 
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1', 
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
    if (marker && map) { // Added check for map safety
        const coordinates = marker.getLngLat();
        // Fly to location without changing zoom significantly, just a nudge
        map.flyTo({ center: coordinates, speed: 0.5 });
    }
}


// -----------------------------------------------------------
// --- GEOLOCATION HELPER (No changes) ---
// -----------------------------------------------------------

/**
 * Gets the user's current location using the browser's Geolocation API.
 */
export function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported by your browser.');
            return resolve(null);
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Returns [longitude, latitude] to match Mapbox format
                resolve([position.coords.longitude, position.coords.latitude]);
            },
            (error) => {
                console.error("Geolocation Error:", error);
                //  Alert replaced with console.error 
                console.error("Could not get your location. Using default map center.");
                resolve(null);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
    });
}


// -----------------------------------------------------------
// --- HAVERSINE DISTANCE CALCULATION (No changes) ---
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
 */
export function flyToStandoutLocation(coordinates) {
    if (!map || !coordinates) return;

    map.flyTo({
        center: coordinates,
        zoom: 16, 
        pitch: 75, 
        bearing: 45, 
        speed: 0.4, 
        curve: 1.5, 
        duration: 3000, 
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
        zoom: 10, // Match the initial zoom level
        pitch: 0, // Crucially, set the pitch back to 0 (top-down view)
        bearing: 0, // Remove any rotation
        speed: 0.8, 
        duration: 1500 
    });
}

/**
 * Renders a marker at the current filterCenter and flies the map to it.
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
    el.className = 'filter-center-marker'; 
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
 */
export function resetFilterCenter() { 
    filterCenter = LOCATION_COORDINATES['lagos'];
    currentRadius = 50; // Reset radius value
    
    if (filterCenterMarker) {
        filterCenterMarker.remove();
        filterCenterMarker = null;
    }
    
    // Reset the map to the default view
    resetMapView(); 
}



/**
 * Executes the "View HQ in 3D" action, flying the map to Lagos (HQ) with a 3D pitch.
 */
export function viewHQIn3D() {
    if (map) { 
        map.flyTo({
            center: LOCATION_COORDINATES.lagos, 
            zoom: 15, 
            pitch: 65, // Use a high pitch for 3D view
            bearing: 15,
            duration: 1800 
        });
    } else {
        console.error("Map not initialized. Cannot view HQ in 3D.");
    }
}