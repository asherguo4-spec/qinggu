import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc, updateDoc, onSnapshot, orderBy, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Validating Connection to Firestore is removed to prevent offline warnings in restricted network

export const googleProvider = new GoogleAuthProvider();

export const logAction = async (userId: string, action: string, details?: any) => {
  try {
    const logRef = doc(collection(db, 'logs'));
    await setDoc(logRef, {
      user_id: userId,
      action,
      details: details !== undefined ? JSON.stringify(details) : null,
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error("Log error", e);
  }
};

export const uploadImage = async (imageData: string, bucketName: string = 'creations'): Promise<string> => {
  if (imageData.startsWith("data:image")) {
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed with status ${res.status}: ${text}`);
      }
      const data = await res.json();
      if (data.url) return data.url;
    } catch (e) {
      console.error("Cloudinary upload proxy failed:", e);
      throw e;
    }
  }
  return imageData;
};
