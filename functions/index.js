// functions/index.js

// Import Firebase Admin and Functions SDKs
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK
admin.initializeApp();

const db = admin.firestore();

/**
 * Helper function to check if the current user is an admin.
 * @param {string} uid The user's UID.
 * @returns {Promise<boolean>} True if the user is an admin, false otherwise.
 */
async function isAdmin(uid) {
    if (!uid) return false;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        return userDoc.exists && userDoc.data().isAdmin === true;
    } catch (error) {
        console.error("Error checking admin status:", error);
        return false;
    }
}

// ----------------------------------------------------------------------
// 1. SECURE FUNCTION: List All Users for Admin Management
// ----------------------------------------------------------------------
exports.listAllUsers = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const callerUid = context.auth.uid;

    // 2. Authorization Check (Only Admins can list all users)
    if (!(await isAdmin(callerUid))) {
        throw new functions.https.HttpsError('permission-denied', 'Only administrators can access the user list.');
    }

    try {
        const listUsersResult = await admin.auth().listUsers();
        const authUsers = listUsersResult.users;

        // Fetch corresponding Firestore documents to get isAdmin and lastLogin status
        const userDocsPromises = authUsers.map(user => 
            db.collection('users').doc(user.uid).get()
        );
        const userDocs = await Promise.all(userDocsPromises);

        // Combine Auth data with Firestore data
        const users = authUsers.map((user, index) => {
            const firestoreData = userDocs[index].data() || {};
            
            // Map the data structure to match what the client-side expects:
            return {
                uid: user.uid,
                email: user.email,
                isBlocked: user.disabled, // Firebase Auth uses 'disabled'
                lastLogin: firestoreData.lastLogin ? firestoreData.lastLogin.toMillis() : user.metadata.lastSignInTime ? new Date(user.metadata.lastSignInTime).getTime() : 0,
                isAdmin: firestoreData.isAdmin === true,
            };
        });

        return users;
    } catch (error) {
        console.error("Error listing users:", error);
        throw new functions.https.HttpsError('internal', 'Unable to retrieve user list.', error.message);
    }
});


// ----------------------------------------------------------------------
// 2. SECURE FUNCTION: Block/Unblock a User
// ----------------------------------------------------------------------
exports.updateUserBlockStatus = functions.https.onCall(async (data, context) => {
    // 1. Authentication Check
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }

    const callerUid = context.auth.uid;
    const { userId, status } = data; // status is the desired final block status (true=block, false=unblock)

    // Input Validation
    if (!userId || typeof status !== 'boolean') {
        throw new functions.https.HttpsError('invalid-argument', 'The function requires a userId and a boolean status (true to block, false to unblock).');
    }
    
    // Self-Block Prevention
    if (userId === callerUid) {
        throw new functions.https.HttpsError('permission-denied', 'Admins cannot block their own account.');
    }

    // 2. Authorization Check (Only Admins can block users)
    if (!(await isAdmin(callerUid))) {
        throw new functions.https.HttpsError('permission-denied', 'Only administrators can block user accounts.');
    }

    try {
        await admin.auth().updateUser(userId, {
            disabled: status // 'disabled' in Auth SDK means 'blocked'
        });

        // Optional: Update Firestore to reflect the status (useful for some security rules)
        await db.collection('users').doc(userId).update({
            isBlocked: status
        }).catch(err => {
            // Log the error but don't fail the primary function, as the Auth change is done.
            console.warn(`Could not update Firestore 'isBlocked' status for ${userId}:`, err);
        });

        return { 
            success: true, 
            message: `User ${userId} successfully ${status ? 'blocked' : 'unblocked'}.` 
        };
    } catch (error) {
        console.error(`Error updating block status for user ${userId}:`, error);
        throw new functions.https.HttpsError('internal', 'Unable to update user block status.', error.message);
    }
});