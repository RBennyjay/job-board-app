// public/js/services/firebaseConfig.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWsRDErv4D4gOKQ_R_xr9MD0xVdPVh5Po",
  authDomain: "lagos-job-board.firebaseapp.com",
  projectId: "lagos-job-board",
  storageBucket: "lagos-job-board.firebasestorage.app",
  messagingSenderId: "1002016586541",
  appId: "1:1002016586541:web:293781a0cb59ab1c2a71a4"
};

// Initialize Firebase and export the instances
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); 

export default app;