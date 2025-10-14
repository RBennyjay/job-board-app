// public/js/modules/admin.js

import { getJobsForAdmin, deleteJobPost, updateJobStatus } from '../services/firebaseService.js';
// Functions for user management
import { getAllUsers, blockUser } from '../services/firebaseService.js'; 


/**
 * Renders the full Admin Moderation Dashboard.
 * @param {HTMLElement} container - The main application container to render into.
 */
export async function renderAdminDashboard(container) {
    container.innerHTML = `
        <h1 class="page-title">Admin Moderation Dashboard</h1>
        <div class="admin-controls-container">
            <div class="tabs">
                <button class="tab-button active" data-tab="jobs">Job Postings</button>
                <button class="tab-button" data-tab="users">User Management</button>
            </div>

            <div id="jobs-tab-content" class="tab-content active">
                <h2>Job Postings Awaiting Review</h2>
                <div class="jobs-moderation-list">
                    <p id="job-loading-status" style="text-align: center; padding: 2rem;">Loading jobs for moderation...</p>
                </div>
            </div>

            <div id="users-tab-content" class="tab-content">
                <h2>Registered Users</h2>
                <div class="users-list">
                    <p id="user-loading-status" data-loaded="false" style="text-align: center; padding: 2rem;">Loading user data...</p>
                </div>
            </div>
        </div>
    `;

    // 1. Setup Tab Switching Logic
    setupAdminTabs();

    // 2. Load Jobs by Default
    // Use setTimeout to ensure the DOM has fully settled after innerHTML is set
    setTimeout(() => {
        loadJobsForModeration(container.querySelector('.jobs-moderation-list'));
    }, 0);
}

// --- Helper Functions: Tab Setup ---

function setupAdminTabs() {
    const adminContainer = document.querySelector('.admin-controls-container');
    if (!adminContainer) return; 

    const tabButtons = adminContainer.querySelectorAll('.tab-button');
    const tabContents = adminContainer.querySelectorAll('.tab-content');
    const usersListContainer = adminContainer.querySelector('.users-list');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            // Deactivate all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Activate current tab
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab-content`).classList.add('active');

            // Load user data only once when the 'users' tab is clicked.
            const loadingStatus = usersListContainer.querySelector('#user-loading-status');
            
            if (targetTab === 'users' && loadingStatus && loadingStatus.dataset.loaded === 'false') {
                // Set status to 'loading' to prevent duplicate attempts if the fetch takes time
                loadingStatus.dataset.loaded = 'loading'; 
                loadUsersForManagement(usersListContainer);
            }
        });
    });
}

// ------------------------------------
// --- User Management Logic ----------
// ------------------------------------

function createUserManagementCard(user) {
    // Note: The Date.now() fallback is for placeholder data only
    return `
        <li data-user-id="${user.uid}" class="user-management-card">
            <div class="user-info">
                <h3>${user.email}</h3>
                <p>Status: ${user.isBlocked ? '<span style="color: red;">Blocked</span>' : 'Active'}</p>
                <p>Last Login: ${new Date(user.lastLogin || Date.now()).toLocaleDateString()}</p>
            </div>
            <div class="user-actions">
                <button class="action-btn block-btn" data-action="block">
                    ${user.isBlocked ? 'Unblock' : 'Block'} User
                </button>
                <button class="action-btn report-btn" data-action="report">View Reports</button>
            </div>
        </li>
    `;
}

function attachUserManagementListeners(listContainer) {
    listContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;

        const userId = btn.closest('li').dataset.userId;
        const action = btn.dataset.action;

        if (!userId) return;
        btn.disabled = true;

        try {
            switch (action) {
                case 'block':
                    await blockUser(userId); 
                    alert('User block status updated. (Note: Requires Cloud Function for actual effect)');
                    loadUsersForManagement(listContainer); // Re-render the list
                    break;
                case 'report':
                    alert(`Viewing reports for user ${userId} (Not yet implemented)`);
                    break;
            }
        } catch (error) {
            console.error(`Error performing action ${action} on user ${userId}:`, error);
            alert(`Failed to perform action: ${error.message}`);
        } finally {
            btn.disabled = false;
        }
    });
}

async function loadUsersForManagement(listContainer) {
    // Ensure the loading message is visibly updating (optional, but good for feedback)
    const loadingStatus = listContainer.querySelector('#user-loading-status');
    if (loadingStatus) {
        loadingStatus.textContent = 'Fetching users...';
        loadingStatus.style.color = 'black';
        loadingStatus.dataset.loaded = 'loading'; // Ensure this is set
    }
    
    try {
        const users = await getAllUsers(); 
        
        if (users.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: gray;">No users registered.</p>';
            return;
        }

        const userItemsHTML = users.map(user => createUserManagementCard(user)).join('');
        
        listContainer.innerHTML = `<ul class="user-management-ul">${userItemsHTML}</ul>`;
        
        // Finalize state: The loading element is now gone, replaced by the list.
        // The tab logic will correctly see the absence of #user-loading-status next time.

        // Attach listeners
        attachUserManagementListeners(listContainer);

    } catch (error) {
        console.error("Error loading users for admin:", error);
        listContainer.innerHTML = '<p style="color: red; padding: 2rem;">Error loading user data. (Check console for security warnings).</p>';
    }
}


// ------------------------------------
// --- Job Moderation Logic -----------
// ------------------------------------

async function loadJobsForModeration(listContainer) {
    try {
        const jobs = await getJobsForAdmin(); // Fetches all jobs, including unapproved ones

        if (jobs.length === 0) {
            listContainer.innerHTML = '<p style="text-align: center; padding: 2rem; color: gray;">No jobs currently awaiting review.</p>';
            return;
        }

        const jobItemsHTML = jobs.map(job => createModerationJobCard(job)).join('');
        listContainer.innerHTML = `<ul class="moderation-job-list-ul">${jobItemsHTML}</ul>`;

        // Attach listeners for actions
        attachJobModerationListeners(listContainer, jobs);

    } catch (error) {
        console.error("Error loading jobs for admin:", error);
        listContainer.innerHTML = '<p style="color: red; padding: 2rem;">Error loading jobs. Check console.</p>';
    }
}


function createModerationJobCard(job) {
    const statusClass = job.approved ? 'status-approved' : 'status-pending';
    const statusText = job.approved ? 'Approved' : 'Pending Review';

    return `
        <li data-job-id="${job.id}" class="moderation-job-card ${statusClass}">
            <div class="job-info">
                <h3>${job.title} at ${job.company}</h3>
                <p>Status: <span class="status-badge">${statusText}</span></p>
                <p>Location: ${job.location}</p>
            </div>
            <div class="job-actions">
                <button class="action-btn view-btn" data-action="view">View/Edit</button>
                ${!job.approved ? `<button class="action-btn approve-btn" data-action="approve">Approve</button>` : ''}
                <button class="action-btn reject-btn" data-action="reject">Reject</button>
                <button class="action-btn delete-btn" data-action="delete">Delete</button>
            </div>
        </li>
    `;
}

function attachJobModerationListeners(listContainer, jobs) {
    listContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;

        const jobId = btn.closest('li').dataset.jobId;
        const job = jobs.find(j => j.id === jobId);
        const action = btn.dataset.action;

        if (!job || !jobId) return;
        
        // Simple visual feedback during processing
        btn.disabled = true;

        try {
            switch (action) {
                case 'view':
                    // Redirect to the job post form for editing
                    window.location.hash = `#post/${jobId}`; 
                    break;
                case 'approve':
                    await updateJobStatus(jobId, true);
                    alert('Job approved!');
                    loadJobsForModeration(listContainer); // Re-render the list
                    break;
                case 'reject':
                    await updateJobStatus(jobId, false);
                    alert('Job rejected!');
                    loadJobsForModeration(listContainer); // Re-render the list
                    break;
                case 'delete':
                    if (confirm(`Are you sure you want to permanently delete "${job.title}"?`)) {
                        await deleteJobPost(jobId);
                        alert('Job deleted.');
                        loadJobsForModeration(listContainer); // Re-render the list
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error performing action ${action} on job ${jobId}:`, error);
            alert(`Failed to perform action: ${error.message}`);
        } finally {
            btn.disabled = false;
        }
    });
}