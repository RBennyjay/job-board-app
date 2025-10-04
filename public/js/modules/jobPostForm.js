import { addJob } from "../services/firebaseService.js";
import { auth } from "../services/firebaseConfig.js"; 
import { renderJobFeed } from "./jobFeed.js"; // To refresh the feed after posting

/**
 * Handles form submission to Firebase.
 * @param {Event} e - The form submit event.
 * @param {HTMLElement} container - The main app container for rerendering.
 */
async function handlePostSubmit(e, container) {
    e.preventDefault();
    const form = e.target;
    
    // Simple authentication check
    if (!auth.currentUser) {
        alert("You must be logged in to post a job.");
        return;
    }

    const jobData = {
        title: form.title.value.trim(),
        company: form.company.value.trim(),
        location: form.location.value.trim(),
        description: form.description.value.trim(),
        salary: form.salary.value.trim(),
        category: form.category.value,
    };

    if (!jobData.title || !jobData.description) {
        alert("Please fill in all required fields (Title and Description).");
        return;
    }

    try {
        form.querySelector('button[type="submit"]').textContent = "Posting...";
        form.querySelector('button[type="submit"]').disabled = true;

        await addJob(jobData);
        alert(`Successfully posted job: ${jobData.title}`);

        // Navigate back to the Job Feed and display the new job
        renderJobFeed(container);

    } catch (error) {
        console.error("Error posting job:", error);
        alert("An error occurred while posting the job. See console for details.");
    } finally {
        form.querySelector('button[type="submit"]').textContent = "Post Job";
        form.querySelector('button[type="submit"]').disabled = false;
    }
}

/**
 * Renders the Job Posting Form component.
 * @param {HTMLElement} containerElement - The DOM element to render into.
 */
export function renderJobPostForm(containerElement) {
    containerElement.innerHTML = `
        <h1 class="page-title">Post a New Opportunity</h1>
        <div style="max-width: 600px; margin: 0 auto; padding: 2rem; background-color: white; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <form id="job-post-form" action="#">
                <div style="margin-bottom: 1rem;">
                    <label for="title" style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Job Title <span style="color: red;">*</span></label>
                    <input type="text" id="title" name="title" required style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 0.25rem;">
                </div>

                <div style="margin-bottom: 1rem;">
                    <label for="company" style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Company Name</label>
                    <input type="text" id="company" name="company" style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 0.25rem;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label for="location" style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Location (e.g., Lagos, Remote)</label>
                    <input type="text" id="location" name="location" style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 0.25rem;">
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label for="category" style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Category</label>
                    <select id="category" name="category" style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 0.25rem;">
                        <option value="frontend">Frontend Development</option>
                        <option value="backend">Backend Development</option>
                        <option value="product">Product Management</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <label for="salary" style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Salary Range</label>
                    <input type="text" id="salary" name="salary" placeholder="e.g., NGN 500,000 - 800,000 / month" style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 0.25rem;">
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <label for="description" style="display: block; font-weight: 500; margin-bottom: 0.5rem;">Job Description <span style="color: red;">*</span></label>
                    <textarea id="description" name="description" rows="6" required style="width: 100%; padding: 0.75rem; border: 1px solid #ccc; border-radius: 0.25rem;"></textarea>
                </div>

                <button type="submit" class="btn-primary" style="width: 100%;">Post Job</button>
            </form>
        </div>
    `;
    
    // Attach the event listener to the form
    document.getElementById('job-post-form').addEventListener('submit', (e) => handlePostSubmit(e, containerElement));
}