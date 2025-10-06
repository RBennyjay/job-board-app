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
    const docRef = await addDoc(collection(db, "jobs"), {
        ...jobData,
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
    const term = searchTerm.toLowerCase();
    
    // Firestore only supports prefix search efficiently. We'll search by title.
    const startAt = term;
    const endAt = term + '\uf8ff'; // Unicode character for upper bound of a string

    try {
        const q = query(
            jobsCollection,
            //  create a Firestore index for 'title' and 'createdAt' for this query to work.
            where("title", ">=", startAt),
            where("title", "<=", endAt),
            orderBy("title"),
            orderBy("createdAt", "desc") // Show newest search results first
        );

        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

    } catch (error) {
        console.error("Error searching jobs in Firestore:", error);
        // If an index error occurs, the Firebase console will provide a direct link to create the index.
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