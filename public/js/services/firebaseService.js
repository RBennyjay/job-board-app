// public/js/services/firebaseService.js

import { db, auth, app } from "./firebaseConfig.js";
export { auth };

import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const JOBS_COLLECTION = "jobs";

// ================================================================
// 🧩 USER PROFILE SERVICE
// ================================================================
export async function saveUserProfile(user) {
  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    const baseData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      photoURL: user.photoURL || "",
      lastLogin: serverTimestamp(),
    };

    if (!userSnap.exists()) {
      // Create new profile (never include isAdmin)
      await setDoc(userRef, {
        ...baseData,
        createdAt: serverTimestamp(),
      });
      console.log("👤 New user profile created in Firestore.");
    } else {
      // Update existing profile (merge safe fields only)
      await setDoc(userRef, baseData, { merge: true });
      console.log("👤 User profile updated in Firestore.");
    }
  } catch (error) {
    console.error("⚠️ Firestore permission denied when saving user profile. Check rules or fields in saveUserProfile().", error);
  }
}

// ================================================================
// 💼 JOB DATA SERVICES
// ================================================================
export async function addJob(jobData) {
  const titleLower = jobData.title ? jobData.title.toLowerCase() : "";

  const docRef = await addDoc(collection(db, JOBS_COLLECTION), {
    ...jobData,
    title_lower: titleLower,
    createdAt: serverTimestamp(),
    createdBy: auth.currentUser ? auth.currentUser.uid : null,
    // Default to approved for demo simplicity
    approved: true,
  });
  console.log("Added job:", docRef.id);
  return docRef.id;
}

export async function updateJob(jobId, jobData) {
  const docRef = doc(db, JOBS_COLLECTION, jobId);
  const titleLower = jobData.title ? jobData.title.toLowerCase() : "";

  await updateDoc(docRef, {
    ...jobData,
    title_lower: titleLower,
    updatedAt: serverTimestamp(),
  });
  console.log(`Job ${jobId} updated.`);
}

export async function getAllJobs() {
  const jobsCollection = collection(db, JOBS_COLLECTION);
  const q = query(
    jobsCollection,
    where("approved", "==", true),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function searchJobs(searchTerm) {
  const jobsCollection = collection(db, JOBS_COLLECTION);
  const q = query(
    jobsCollection,
    where("approved", "==", true),
    where("title_lower", ">=", searchTerm),
    where("title_lower", "<=", searchTerm + "\uf8ff"),
    orderBy("title_lower")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function filterJobs(category, location, salary) {
  const jobsCollection = collection(db, JOBS_COLLECTION);
  const filters = [where("approved", "==", true)];

  if (category) filters.push(where("category", "==", category));
  if (location) filters.push(where("location", "==", location));
  if (salary) filters.push(where("salary", "==", salary));

  const q = query(jobsCollection, ...filters, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function deleteJob(jobId) {
  await deleteDoc(doc(db, JOBS_COLLECTION, jobId));
  console.log(`Job ${jobId} deleted.`);
}

export const deleteJobPost = deleteJob;

export async function getJobById(jobId) {
  const docRef = doc(db, JOBS_COLLECTION, jobId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
}

// ================================================================
// 🛠️ ADMIN JOB MODERATION
// ================================================================
export async function getJobsForAdmin() {
  const jobsCollection = collection(db, JOBS_COLLECTION);
  const q = query(jobsCollection, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

export async function updateJobStatus(jobId, status) {
  const jobRef = doc(db, JOBS_COLLECTION, jobId);
  await updateDoc(jobRef, {
    approved: status,
    updatedAt: serverTimestamp(),
  });
  console.log(`Job ${jobId} status updated to approved: ${status}`);
}

// ================================================================
// 🔐 ADMIN / PERMISSION SERVICES (CACHED)
// ================================================================
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

// ================================================================
// 👥 ADMIN USER MANAGEMENT (DEMO PLACEHOLDER)
// ================================================================
export async function getAllUsers() {
  console.warn("ADMIN UI: Using placeholder data for demo.");
  return [
    { uid: "user123", email: "regular.user@example.com", isBlocked: false, lastLogin: Date.now() - 86400000 },
    { uid: "admin456", email: "admin.user@example.com", isBlocked: false, lastLogin: Date.now() },
    { uid: "blocked789", email: "bad.actor@example.com", isBlocked: true, lastLogin: Date.now() - 3600000 },
  ];
}

export async function blockUser(userId) {
  console.warn(`ADMIN UI: Simulated block/unblock action for user ${userId}.`);
  await new Promise((resolve) => setTimeout(resolve, 500));
  return { success: true };
}

// ================================================================
//  FAVORITES SERVICES
// ================================================================
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

/**
 * Retrieves all saved job IDs for a user.
 * @param {string} userId - Authenticated user's UID.
 * @returns {Promise<string[]>}
 */
export async function getSavedJobIds(userId) {
  if (!userId) {
    console.error("Attempted to fetch favorites without a user ID.");
    return [];
  }

  try {
    const favoritesCollectionRef = collection(db, "users", userId, "favorites");
    const snapshot = await getDocs(favoritesCollectionRef);
    return snapshot.docs.map((doc) => doc.id);
  } catch (error) {
    console.error("Error fetching saved job IDs:", error);
    throw error;
  }
}
