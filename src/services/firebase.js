
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD2_EfQJL0bJ30qP9_fxCJo-HTOoJ4yTKg",
  authDomain: "oacs-tu-f68b1.firebaseapp.com",
  projectId: "oacs-tu-f68b1",
  storageBucket: "oacs-tu-f68b1.firebasestorage.app",
  messagingSenderId: "840627917923",
  appId: "1:840627917923:web:8543fb529faf4d1c621456"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);         // For student/admin auth [cite: 16]
export const db = getFirestore(app);       // Firestore Database 
export const storage = getStorage(app);    // For document uploads [cite: 18]