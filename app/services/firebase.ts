import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAHtLx4tEvl0VmMP-EF83xLCPudU4jQRb8",
    authDomain: "fds-payroll.firebaseapp.com",
    projectId: "fds-payroll",
    storageBucket: "fds-payroll.firebasestorage.app",
    messagingSenderId: "1011073650386",
    appId: "1:1011073650386:web:0bb67dc68af195b04a670b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// Use initializeFirestore to allow for future config tweaks (e.g. experimentalForceLongPolling)
import { initializeFirestore } from "firebase/firestore";
export const db = initializeFirestore(app, {});
