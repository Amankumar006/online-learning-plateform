// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if we have valid config (works in both browser and server environments)
const isValidConfig = firebaseConfig.apiKey && 
  firebaseConfig.projectId && 
  firebaseConfig.apiKey !== 'your_api_key_here' &&
  firebaseConfig.appId && 
  !firebaseConfig.appId.includes('your_app_id_here') &&
  firebaseConfig.apiKey.startsWith('AIza'); // Basic validation for Google API key format

let app: any = null;
let db: any = null;
let auth: any = null;
let storage: any = null;

if (isValidConfig) {
  try {
    // Initialize Firebase only if we have valid config and we're in browser
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    storage = getStorage(app);
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
    // Create mock objects for build time
    db = null;
    auth = null;
    storage = null;
  }
} else {
  console.warn('Firebase config invalid or not in browser environment, using mock objects');
}

export { db, auth, storage };
