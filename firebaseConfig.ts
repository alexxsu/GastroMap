
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration - now using environment variables
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCHoA2Vegt3SaybflKyedD7Y33o6kUPZr0",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gastromap-c12c3.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gastromap-c12c3",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gastromap-c12c3.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "253135554462",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:253135554462:web:824a3172c96d5ae1de388f",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-QX1QH1PGHZ"
};

// Google Maps API Key - separate from Firebase
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDE4SM9roZ4PthOaAxpnToXMjLBEd99xD8";

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);

// Guest login helper
export const signInAsGuest = () => signInAnonymously(auth);
