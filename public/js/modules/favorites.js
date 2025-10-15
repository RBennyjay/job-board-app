// public/js/modules/favorites.js

import { 
  auth, 
  getSavedJobIds, 
  getJobById, 
  unsaveJob 
} from "../services/firebaseService.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { createJobCardHTML, updateCardSaveButtonUI } from "./jobFeed.js";

/**
 * Renders the user's favorite jobs
 * @param {HTMLElement} container - The main container to render the favorites list
 */
export async function renderFavorites(container) {
  const favoritesListContainer = document.createElement("div");
  favoritesListContainer.className =
    "favorites-list grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6";

  container.innerHTML = `
    <section class="favorites-section max-w-7xl mx-auto">
      <h2 class="text-3xl font-bold mb-4 text-center">My Favorite Jobs</h2>
    </section>
  `;
  container.appendChild(favoritesListContainer);

  // Listen for authentication state
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      favoritesListContainer.innerHTML = `
        <p class="text-center text-gray-500 py-8">
          Please <a href="#login" class="text-blue-500 underline font-semibold">log in</a> 
          to view your favorite jobs.
        </p>
      `;
      return;
    }

    try {
      const userId = user.uid;

      // Step 1: Fetch saved job IDs for this user
      const savedJobIds = await getSavedJobIds(userId);
      if (!savedJobIds || savedJobIds.length === 0) {
        favoritesListContainer.innerHTML = `
          <p class="text-center text-gray-500 py-8">You haven’t saved any jobs yet.</p>
        `;
        return;
      }

      // Step 2: Fetch all jobs safely (handle missing or deleted ones)
      const jobPromises = savedJobIds.map(async (id) => {
        try {
          return await getJobById(id);
        } catch (err) {
          console.warn(`⚠️ Skipping job ${id}:`, err.message);
          return null;
        }
      });

      const jobs = (await Promise.all(jobPromises)).filter((job) => job !== null);

      // Step 3: Render results
      if (jobs.length === 0) {
        favoritesListContainer.innerHTML = `
          <p class="text-center text-gray-500 py-8">
            The jobs you saved are no longer available or visible.
          </p>
        `;
        return;
      }

      // ✅ Render each job card
      jobs.forEach((job) => {
        const jobHTML = createJobCardHTML(job, false);
        const wrapper = document.createElement("div");
        wrapper.innerHTML = jobHTML;
        favoritesListContainer.appendChild(wrapper.firstElementChild);
      });

      // ✅ Mark all save buttons as active (saved)
      favoritesListContainer.querySelectorAll(".save-job-btn-card").forEach((btn) => {
        updateCardSaveButtonUI(btn, true);
      });

      // ✅ Attach unsave functionality
      setupUnsaveJobListener(favoritesListContainer);

    } catch (error) {
      console.error("❌ Error loading favorite jobs:", error);
      favoritesListContainer.innerHTML = `
        <p class="text-center text-red-500 py-8">
          There was an error loading your favorite jobs. Please try again later.
        </p>
      `;
    }
  });
}

/**
 * Allows the user to remove a job from favorites directly on the page
 */
function setupUnsaveJobListener(container) {
  container.addEventListener("click", async (event) => {
    const unsaveButton = event.target.closest(".save-job-btn-card");

    if (unsaveButton && unsaveButton.dataset.isSaved === "true") {
      event.preventDefault();
      const jobId = unsaveButton.dataset.jobId;

      try {
        unsaveButton.disabled = true;
        await unsaveJob(jobId);
        console.log(`✅ Job ${jobId} unsaved successfully.`);

        const jobCard = unsaveButton.closest(".job-card");
        if (jobCard) {
          jobCard.style.opacity = "0";
          jobCard.style.transition = "opacity 0.3s ease, max-height 0.3s ease";
          jobCard.style.maxHeight = "0";
          setTimeout(() => jobCard.remove(), 300);
        }

        if (container.querySelectorAll(".job-card").length === 0) {
          renderFavorites(document.getElementById("app-container"));
        }
      } catch (error) {
        console.error("❌ Error unsaving job:", error);
        unsaveButton.disabled = false;
        alert("Failed to remove from favorites. Please try again.");
      }
    }
  });
}
