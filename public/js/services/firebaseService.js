// public/js/services/firebaseService.js
import { db } from "./firebaseConfig.js"; // Import the initialized db object
import { auth } from "./firebaseConfig.js"; // Import the initialized auth object

import { 
    collection, addDoc, serverTimestamp, doc, setDoc, getDocs, getDoc, 
    deleteDoc,
    //  NEW IMPORTS for Querying
    query, where, orderBy 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


// --- User Profile Service ---
export async function saveUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
        createdAt: serverTimestamp()
    }, { merge: true });
    console.log("✅ User profile saved:", user.email);
}

// --- Job Data Services ---


// Function to add a new job posting
export async function addJob(jobData) {
    // jobData now includes applicationLink and applicationEmail
    
    // 🚨 FIX 1: Add a new lowercase title field for searching
    const titleLower = jobData.title ? jobData.title.toLowerCase() : '';

    const docRef = await addDoc(collection(db, "jobs"), {
        ...jobData,
        // Include the new lowercase field
        title_lower: titleLower, 
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser ? auth.currentUser.uid : null
    });
    console.log("Added job:", docRef.id);
    return docRef.id;
}


// Function to fetch all job postings (for the main feed)
export async function getAllJobs() {
    //  Added ordering by createdAt to show newest jobs first by default
    const jobsCollection = collection(db, "jobs");
    const q = query(jobsCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

//   Executes a search query on the 'title' field
export async function searchJobs(searchTerm) {
    const jobsCollection = collection(db, "jobs");
    
    // 1. Clean the search term by trimming whitespace and converting to lowercase
    const cleanTerm = searchTerm.trim().toLowerCase();
    
    if (!cleanTerm) {
        return [];
    }
    
    // 2. Use the cleaned term for query boundaries
    const startAt = cleanTerm;
    const endAt = cleanTerm + '\uf8ff'; 

    try {
        const q = query(
            jobsCollection,
            // 🚨 CRITICAL FIX: Query the new lowercase field: 'title_lower'
            where("title_lower", ">=", startAt),
            where("title_lower", "<=", endAt),
            // You will now need a new composite index for (title_lower, createdAt)
            orderBy("title_lower"), 
            orderBy("createdAt", "desc") 
        );

        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

    } catch (error) {
        console.error("Error searching jobs in Firestore:", error);
        // You will likely need a new composite index: (title_lower, createdAt)
        throw error;
    }
}

// Fetch a single job posting by ID (for the details page)
export async function getJobById(id) {
    const docRef = doc(db, "jobs", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    } else {
        console.log("No such job document exists!");
        return null;
    }
}

/**
 * Checks if a job is currently saved by the user.
 * @param {string} jobId - The ID of the job to check.
 * @returns {Promise<boolean>} True if saved, false otherwise.
 */
export async function isJobSaved(jobId) {
    if (!auth.currentUser) return false;
    const userId = auth.currentUser.uid;
    
    // Reference to the specific favorite document: /users/{userId}/favorites/{jobId}
    const favoriteRef = doc(db, "users", userId, "favorites", jobId);
    const docSnap = await getDoc(favoriteRef);
    
    return docSnap.exists();
}

/**
 * Saves a job to the user's favorites list.
 * @param {string} jobId - The ID of the job to save.
 */
export async function saveJob(jobId) {
    if (!auth.currentUser) {
        console.error("User not logged in. Cannot save job.");
        return;
    }
    const userId = auth.currentUser.uid;
    const favoriteRef = doc(db, "users", userId, "favorites", jobId);

    // Use setDoc to create the favorite document. The content just needs the timestamp.
    await setDoc(favoriteRef, {
        jobId: jobId,
        savedAt: serverTimestamp()
    });
    console.log(`Job ${jobId} saved for user ${userId}.`);
}

/**
 * Removes a job from the user's favorites list.
 * @param {string} jobId - The ID of the job to unsave.
 */
export async function unsaveJob(jobId) {
    if (!auth.currentUser) {
        console.error("User not logged in. Cannot unsave job.");
        return;
    }
    const userId = auth.currentUser.uid;
    const favoriteRef = doc(db, "users", userId, "favorites", jobId);

    await deleteDoc(favoriteRef);
    console.log(`Job ${jobId} unsaved for user ${userId}.`);
}

// -----------------------------------------------------------
// --- NEW: Advanced Filter Services (Optimization) ---
// -----------------------------------------------------------

/**
 * Helper to extract the highest numerical value from a salary string (client-side).
 * @param {string} salaryText - The raw salary string (e.g., "₦150,000 - ₦200,000 / month").
 * @returns {number} The largest number found (normalized to a monthly equivalent for simple comparison).
 */
function extractMaxSalary(salaryText) {
    if (!salaryText) return 0;
    // Clean up currency symbols and commas
    const cleanedText = salaryText.toLowerCase().replace(/[^0-9\.]/g, ' ').trim();
    const numbers = cleanedText.split(/\s+/).map(Number).filter(n => !isNaN(n) && n > 0);
    
    if (numbers.length === 0) return 0;
    
    // Find the largest number (high end of the range)
    let maxNumber = Math.max(...numbers);
    
    // NOTE: This assumes all salaries are in the same rough unit (e.g., monthly).
    return maxNumber;
}

/**
 * Executes a multi-criteria job filter query against Firestore.
 * This function handles simple equality checks on Firestore and complex range checks client-side.
 * @param {object} filters - An object containing filter keys (category, location, salary).
 * @returns {Promise<Array<object>>} The filtered list of jobs.
 */
export async function filterJobs(filters) {
    const jobsCollection = collection(db, "jobs");
    let queryConstraints = [];
    let isSalaryFilterActive = false;

    // --- 1. Add Equality Constraints (Category & Location) ---
    // Firestore allows multiple equality (==) where clauses on different fields.
    if (filters.category) {
        // Needs a composite index on (category, createdAt)
        queryConstraints.push(where("category", "==", filters.category));
    }
    if (filters.location) {
        //  Needs a composite index on (location, createdAt)
        queryConstraints.push(where("location", "==", filters.location));
    }
    
    // Track if a salary filter is active, but DO NOT apply it to the Firestore query
    if (filters.salary) {
        isSalaryFilterActive = true;
    }

    // --- 2. Add Ordering ---
    queryConstraints.push(orderBy("createdAt", "desc"));


    // --- 3. Build and Execute the Query (DB Optimization) ---
    const q = query(jobsCollection, ...queryConstraints);

    try {
        const snapshot = await getDocs(q);
        let jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // --- 4. Client-Side Filtering for Salary (Complex Logic) ---
        // If the salary filter is active, perform the range check locally on the fetched jobs.
        if (isSalaryFilterActive) {
            jobs = jobs.filter(job => {
                const salaryTerm = filters.salary.replace('+', ''); // e.g., "100k"
                let requiredAmount = 0;
                
                // Convert filter term (e.g., "300k") to a number (300000)
                if (salaryTerm.endsWith('k')) {
                    requiredAmount = parseFloat(salaryTerm) * 1000;
                } else if (salaryTerm.endsWith('M')) {
                    requiredAmount = parseFloat(salaryTerm) * 1000000;
                } else {
                    return true; 
                }

                const jobMaxSalary = extractMaxSalary(job.salary);

                // Check if the job's max salary meets or exceeds the filter requirement
                return jobMaxSalary >= requiredAmount;
            });
        }
        
        return jobs;
    } catch (error) {
        console.error("Error executing filter query:", error);
        // This is where Firestore may prompt you to create a composite index.
        throw error;
    }
}