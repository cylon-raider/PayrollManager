/**
 * Firebase Initialization & Configuration Service
 * 
 * Initializes the connection to the Firebase platform (Auth and Firestore services).
 * Configures instances using environment variables parsed by Vite at build time.
 * Exports singletons of `auth` and `db` to be used globally.
 */

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

// Firebase Project Credentials
// Injected securely via Vite environment variables (.env / production build variables)
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Core Firebase Application
const app = initializeApp(firebaseConfig);

// Initialize and export Authentication service handler
export const auth = getAuth(app);

// Initialize and export Cloud Firestore Database handler.
// Uses `initializeFirestore` rather than `getFirestore` to allow for prospective local configuration tweaks
// (such as caching size parameters or `experimentalForceLongPolling` controls).
export const db = initializeFirestore(app, {});
