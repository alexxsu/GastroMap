
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyCHoA2Vegt3SaybflKyedD7Y33o6kUPZr0",
  authDomain: "gastromap-c12c3.firebaseapp.com",
  projectId: "gastromap-c12c3",
  storageBucket: "gastromap-c12c3.firebasestorage.app",
  messagingSenderId: "253135554462",
  appId: "1:253135554462:web:824a3172c96d5ae1de388f",
  measurementId: "G-QX1QH1PGHZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);