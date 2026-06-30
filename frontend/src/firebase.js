import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// 1. Startup validation to log existence of all VITE_FIREBASE_* variables without printing actual secrets
console.log("Firebase configuration presence validation:", {
  apiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: !!import.meta.env.VITE_FIREBASE_APP_ID
});

const requiredVars = [
  { name: 'VITE_FIREBASE_API_KEY', val: import.meta.env.VITE_FIREBASE_API_KEY },
  { name: 'VITE_FIREBASE_AUTH_DOMAIN', val: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN },
  { name: 'VITE_FIREBASE_PROJECT_ID', val: import.meta.env.VITE_FIREBASE_PROJECT_ID },
  { name: 'VITE_FIREBASE_STORAGE_BUCKET', val: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET },
  { name: 'VITE_FIREBASE_MESSAGING_SENDER_ID', val: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID },
  { name: 'VITE_FIREBASE_APP_ID', val: import.meta.env.VITE_FIREBASE_APP_ID }
];

const missing = requiredVars.filter(v => !v.val || v.val === 'your_firebase_api_key_here').map(v => v.name);

// Keep Mock Mode only as an explicit development fallback.
// It must only activate when: import.meta.env.DEV === true OR VITE_ENABLE_MOCK_AUTH === "true"
const isMockAllowed = import.meta.env.DEV === true || import.meta.env.VITE_ENABLE_MOCK_AUTH === "true";

let app = null;
let auth = null;
let isFirebaseInitialized = false;

if (missing.length > 0) {
  if (!isMockAllowed) {
    // If any variable is missing, display a clear error explaining exactly which variable is missing instead of silently enabling Mock Mode.
    const errMsg = `CRITICAL: Firebase Initialization Failed. Missing required environment variables: ${missing.join(', ')}. Mock authentication is not allowed in production environments. Please configure your build or deployment variables.`;
    console.error(errMsg);
    throw new Error(errMsg);
  } else {
    console.warn(`Firebase parameters missing: ${missing.join(', ')}. Mock authentication is active as development fallback.`);
  }
} else {
  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    };
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    isFirebaseInitialized = true;
    console.log("🔥 Firebase Client successfully initialized.");
  } catch (error) {
    console.error("🔴 Failed to initialize Firebase Client:", error);
    if (!isMockAllowed) {
      throw error;
    }
  }
}

export { app, auth, GoogleAuthProvider, isFirebaseInitialized, isMockAllowed };
