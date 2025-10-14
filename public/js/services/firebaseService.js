// public/js/services/firebaseService.js

//  Combine imports and explicitly export 'auth'
import { db, auth } from "./firebaseConfig.js";
export { auth };

import {
    collection, addDoc, serverTimestamp, doc, setDoc, getDocs, getDoc,
    deleteDoc, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const JOBS_COLLECTION = "jobs";

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

export async function addJob(jobData) {
    const titleLower = jobData.title ? jobData.title.toLowerCase() : '';

    const docRef = await addDoc(collection(db, JOBS_COLLECTION), {
        ...jobData,
        title_lower: titleLower,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser ? auth.currentUser.uid : null
    });
    console.log("Added job:", docRef.id);
    return docRef.id;
}

export async function getAllJobs() {
    const jobsCollection = collection(db, JOBS_COLLECTION);
    const q = query(jobsCollection, orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function searchJobs(searchTerm) {
    const jobsCollection = collection(db, JOBS_COLLECTION);
   
    const q = query(
        jobsCollection,
        where("title_lower", ">=", searchTerm),
        where("title_lower", "<=", searchTerm + '\uf8ff'),
        orderBy("title_lower")
    );
   
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function filterJobs(category, location, salary, currentRadius, filterCenter) {
    const jobsCollection = collection(db, JOBS_COLLECTION);
    let filters = [];
   
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

export async function getJobById(jobId) {
    const docRef = doc(db, JOBS_COLLECTION, jobId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

// --- Admin/Permission Services (with session cache) ---
export async function isUserAdmin() {
    if (!auth.currentUser) {
        console.warn("DEBUG isUserAdmin: No current user authenticated.");
        return false;
    }

    const uid = auth.currentUser.uid;
    const cacheKey = "isAdmin_" + uid;

    //  Check sessionStorage first
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

// --- Clear cached admin status on logout ---
export function clearAdminCache() {
    const user = auth.currentUser;
    if (user) {
        sessionStorage.removeItem("isAdmin_" + user.uid);
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
