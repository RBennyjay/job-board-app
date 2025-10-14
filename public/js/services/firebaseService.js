// public/js/services/firebaseService.js

//  NEW IMPORT: Import the Firebase Functions SDK modules for calling server functions
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

// Combine imports and explicitly export 'auth'
//  CRITICAL ASSUMPTION: 'app' is now exported from firebaseConfig.js for Functions SDK
import { db, auth, app } from "./firebaseConfig.js"; 
export { auth };

import {
    collection, addDoc, serverTimestamp, doc, setDoc, getDocs, getDoc,
    deleteDoc, query, where, orderBy, updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const JOBS_COLLECTION = "jobs";

//  NEW: Initialize Firebase Functions and define callable wrappers
const functions = getFunctions(app); 
const listUsersCallable = httpsCallable(functions, 'listAllUsers');
const blockUserCallable = httpsCallable(functions, 'updateUserBlockStatus');

// --- User Profile Service ---
export async function saveUserProfile(user) {
    const userRef = doc(db, "users", user.uid);
    
    // We fetch the document first to check if it exists (i.e., if it's a first-time login)
    const userSnap = await getDoc(userRef);

    const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || "",
        // Always update last login
        lastLogin: serverTimestamp(),
    };

    if (!userSnap.exists()) {
        // CRITICAL FIX: ONLY set isAdmin: false on the FIRST creation.
        userData.createdAt = serverTimestamp();
        userData.isAdmin = false;
        console.log("🔥 New user profile created.");
    }

    await setDoc(userRef, userData, { merge: true });
    
    console.log("✅ User profile saved/updated:", user.email);
}

// --- Job Data Services ---

export async function addJob(jobData) {
    const titleLower = jobData.title ? jobData.title.toLowerCase() : '';

    const docRef = await addDoc(collection(db, JOBS_COLLECTION), {
        ...jobData,
        title_lower: titleLower,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser ? auth.currentUser.uid : null,
        // Jobs are unapproved by default and require moderation
        approved: false 
    });
    console.log("Added job:", docRef.id);
    return docRef.id;
}

export async function updateJob(jobId, jobData) {
    const docRef = doc(db, JOBS_COLLECTION, jobId);
    const titleLower = jobData.title ? jobData.title.toLowerCase() : '';
    
    await updateDoc(docRef, {
        ...jobData,
        title_lower: titleLower,
        updatedAt: serverTimestamp(),
    });
    console.log(`Job ${jobId} updated.`);
}

export async function getAllJobs() {
    const jobsCollection = collection(db, JOBS_COLLECTION);
    // Filter to show only approved jobs to general users
    const q = query(
        jobsCollection, 
        where("approved", "==", true), 
        orderBy("createdAt", "desc")
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function searchJobs(searchTerm) {
    const jobsCollection = collection(db, JOBS_COLLECTION);
    
    const q = query(
        jobsCollection,
        where("approved", "==", true), // Search only approved jobs
        where("title_lower", ">=", searchTerm),
        where("title_lower", "<=", searchTerm + '\uf8ff'),
        orderBy("title_lower")
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function filterJobs(category, location, salary, currentRadius, filterCenter) {
    const jobsCollection = collection(db, JOBS_COLLECTION);
    let filters = [where("approved", "==", true)]; // Filter only approved jobs
    
    if (category) filters.push(where("category", "==", category));
    if (location) filters.push(where("location", "==", location));
    if (salary) filters.push(where("salary", "==", salary));

    let q = query(jobsCollection, ...filters, orderBy("createdAt", "desc"));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deleteJob(jobId) {
    await deleteDoc(doc(db, JOBS_COLLECTION, jobId));
    console.log(`Job ${jobId} deleted.`);
}

// EXPORT ADDED: Admin-specific job deletion
export const deleteJobPost = deleteJob;

export async function getJobById(jobId) {
    const docRef = doc(db, JOBS_COLLECTION, jobId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

// --- Admin Job Moderation Services ---

/**
 * Fetches all jobs (including unapproved) for admin moderation.
 */
export async function getJobsForAdmin() {
    const jobsCollection = collection(db, JOBS_COLLECTION);
    const q = query(jobsCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Updates the approved status of a job.
 * @param {string} jobId - The ID of the job to update.
 * @param {boolean} status - The new approval status (true for approved, false for rejected).
 */
export async function updateJobStatus(jobId, status) {
    const jobRef = doc(db, JOBS_COLLECTION, jobId);
    await updateDoc(jobRef, {
        approved: status,
        updatedAt: serverTimestamp()
    });
    console.log(`Job ${jobId} status updated to approved: ${status}`);
}


// --- Admin/Permission Services (with session cache) ---
export async function isUserAdmin() {
    if (!auth.currentUser) {
        console.warn("DEBUG isUserAdmin: No current user authenticated.");
        return false;
    }

    const uid = auth.currentUser.uid;
    const cacheKey = "isAdmin_" + uid;

    const cached = sessionStorage.getItem(cacheKey);
    if (cached !== null) {
        console.log("DEBUG isUserAdmin: Using cached admin status:", cached === "true");
        return cached === "true";
    }

    const userRef = doc(db, "users", uid);

    try {
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
            console.warn("DEBUG isUserAdmin: User document does not exist for UID:", uid);
            sessionStorage.setItem(cacheKey, "false");
            return false;
        }

        const isAdminValue = userSnap.data().isAdmin === true;
        sessionStorage.setItem(cacheKey, isAdminValue.toString());

        console.log("DEBUG isUserAdmin: Fresh check from Firestore, isAdmin =", isAdminValue);
        return isAdminValue;
    } catch (error) {
        console.error("DEBUG isUserAdmin: Error reading user document:", error);
        sessionStorage.setItem(cacheKey, "false");
        return false;
    }
}

export function clearAdminCache() {
    const user = auth.currentUser;
    if (user) {
        sessionStorage.removeItem("isAdmin_" + user.uid);
    }
}


// ---  Admin User Management Services (Secure Cloud Function Calls) ---

/**
 *  SECURE: Fetches all users via the listAllUsers Cloud Function.
 */
export async function getAllUsers() {
    if (!auth.currentUser) throw new Error("User not authenticated.");
    
    try {
        // Call the remote Cloud Function
        const result = await listUsersCallable(); 
        
        // The result.data is the array of users returned by the Cloud Function
        return result.data || []; 
    } catch (error) {
        console.error("Error fetching users from secure function:", error);
        throw new Error("Failed to load users. Permissions error or function failed.");
    }
}

/**
 * SECURE: Blocks or unblocks a user via the updateUserBlockStatus Cloud Function.
 * @param {string} userId - The ID of the user to block/unblock.
 * @param {boolean} isBlocked - The desired final status (true to block, false to unblock).
 */
export async function blockUser(userId, isBlocked) {
    if (!auth.currentUser) throw new Error("User not authenticated.");
    
    try {
        // Send the target user ID and the desired block status
        const result = await blockUserCallable({ userId, status: isBlocked }); 
        
        // Return the response from the Cloud Function
        return result.data; 
    } catch (error) {
        console.error("Error updating block status via secure function:", error);
        throw new Error("Failed to update user block status.");
    }
}


// --- Favorites Services ---

export async function isJobSaved(jobId) {
    if (!auth.currentUser) return false;
    const saveRef = doc(db, "users", auth.currentUser.uid, "favorites", jobId);
    const saveSnap = await getDoc(saveRef);
    return saveSnap.exists();
}

export async function saveJob(jobId) {
    if (!auth.currentUser) throw new Error("User not logged in.");
    const saveRef = doc(db, "users", auth.currentUser.uid, "favorites", jobId);
    await setDoc(saveRef, { savedAt: serverTimestamp() });
    console.log(`Job ${jobId} saved.`);
}

export async function unsaveJob(jobId) {
    if (!auth.currentUser) throw new Error("User not logged in.");
    const saveRef = doc(db, "users", auth.currentUser.uid, "favorites", jobId);
    await deleteDoc(saveRef);
    console.log(`Job ${jobId} unsaved.`);
}

export async function getSavedJobIds() {
    if (!auth.currentUser) return [];
    const favoritesCollectionRef = collection(db, "users", auth.currentUser.uid, "favorites");
    const snapshot = await getDocs(favoritesCollectionRef);
    return snapshot.docs.map(doc => doc.id);
}