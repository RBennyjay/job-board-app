// public/js/modules/jobPostForm.js

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

    // --- FORM VALIDATION (Required Fields) ---
    const title = form.title.value.trim();
    const description = form.description.value.trim();
    const applicationLink = form.applicationLink.value.trim(); 
    const applicationEmail = form.applicationEmail.value.trim(); 
    
    // Basic fields check (original logic)
    if (!title || !description || !form.company.value.trim() || !form.location.value.trim() || !form.category.value) {
        alert("Please fill in all required fields (marked with *).");
        return;
    }
    
    //  NEW VALIDATION: Must provide an application method
    if (!applicationLink && !applicationEmail) {
        alert("Please provide either an Application Link or an Application Email.");
        return;
    }

    // --- Process Tags/Skills: Convert comma-separated string to array ---
    const rawTags = form.tags.value.trim();
    const tagsArray = rawTags 
        ? rawTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) 
        : [];

    const jobData = {
        title: title,
        company: form.company.value.trim(),
        location: form.location.value.trim(),
        description: description,
        salary: form.salary.value.trim() || 'Competitive',
        category: form.category.value,
        tags: tagsArray,
        //  NEW FIELDS ADDED HERE:
        applicationLink: applicationLink || null, // Store null if empty
        applicationEmail: applicationEmail || null, // Store null if empty
        // End of new fields
        postedAt: new Date(),
        posterUid: auth.currentUser.uid,
    };

    try {
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.textContent = "Posting...";
        submitButton.disabled = true;

        await addJob(jobData);
        alert(`Successfully posted job: ${jobData.title}`);

        window.location.hash = '#feed'; // Use hash navigation
        renderJobFeed(container);

    } catch (error) {
        console.error("Error posting job:", error);
        alert("An error occurred while posting the job. See console for details.");
    } finally {
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.textContent = "Post Job";
        submitButton.disabled = false;
    }
}

/**
 * Renders the Job Posting Form component, using external CSS classes.
 * @param {HTMLElement} containerElement - The DOM element to render into.
 */
export function renderJobPostForm(containerElement) {
    // Inject the structured HTML, relying on the 'form-card' and 'form-group' classes for styling
    containerElement.innerHTML = `
        <section id="post-job-page" class="content-container">
            <h1 class="page-title">Post a New Job Opportunity</h1>
            
            <form id="job-post-form" class="form-card">
                
                <fieldset class="form-section">
                    <legend>Basic Job Information</legend>
                    
                    <div class="form-group">
                        <label for="title">Job Title <span class="required">*</span></label>
                        <input type="text" id="title" name="title" required placeholder="e.g., Senior Frontend Developer">
                    </div>

                    <div class="form-group">
                        <label for="company">Company Name <span class="required">*</span></label>
                        <input type="text" id="company" name="company" required placeholder="e.g., Google or Confidential">
                    </div>
                    
                    <div class="form-group">
                        <label for="category">Category <span class="required">*</span></label>
                        <select id="category" name="category" required>
                            <option value="">Select a Category</option>
                            <option value="IT">Information Technology</option>
                            <option value="Finance">Finance & Accounting</option>
                            <option value="Marketing">Marketing & Sales</option>
                            <option value="HR">Human Resources</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </fieldset>

                <fieldset class="form-section">
                    <legend>Job Details</legend>
                    
                    <div class="form-group">
                        <label for="description">Job Description <span class="required">*</span></label>
                        <textarea id="description" name="description" rows="10" required placeholder="Describe the role, responsibilities, and qualifications."></textarea>
                    </div>
                </fieldset>
                
                <fieldset class="form-section form-row">
                    <legend>Location & Compensation</legend>
                    
                    <div class="form-group half-width">
                        <label for="location">Location <span class="required">*</span></label>
                        <input type="text" id="location" name="location" required placeholder="e.g., Lagos, Nigeria (Remote)">
                    </div>
                    
                    <div class="form-group half-width">
                        <label for="salary">Salary Range</label>
                        <input type="text" id="salary" name="salary" placeholder="e.g., ₦150,000 - ₦200,000 / month">
                    </div>
                    
                    <div class="form-group full-width">
                        <label for="tags">Required Tags / Skills</label>
                        <input type="text" id="tags" name="tags" placeholder="e.g., JavaScript, Firebase, React (Separate with commas)">
                        <small class="help-text">Separate tags or skills with a comma (e.g., CSS, SQL, Management).</small>
                    </div>
                </fieldset>
                
                <fieldset class="form-section">
                    <legend>Application Method</legend>
                    
                    <div class="form-group">
                        <label>Application Link</label>
                        <input type="url" id="applicationLink" name="applicationLink" placeholder="Enter a direct application URL (e.g., https://careers.company.com/apply)">
                        <small class="help-text">Provide *either* an Application Link OR an Email.</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Application Email</label>
                        <input type="email" id="applicationEmail" name="applicationEmail" placeholder="Enter an application email address (e.g., hr@company.com)">
                    </div>
                </fieldset>
                <div class="form-actions">
                    <button type="submit" class="btn-primary" id="submit-job-btn">
                        <i class="fas fa-paper-plane"></i> Post Job
                    </button>
                </div>
                
            </form>
        </section>
    `;
    
    // Attach the event listener to the form
    document.getElementById('job-post-form').addEventListener('submit', (e) => handlePostSubmit(e, containerElement));
}