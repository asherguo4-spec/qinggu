import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc, updateDoc, onSnapshot, orderBy, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Validate Connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection successful");
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable'))) {
      console.error("Please check your Firebase configuration or wait for provisioning to complete.");
    }
  }
}
testConnection();

export const storage = getStorage(app);
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
  // AI Studio Firebase tools only provision Auth and Firestore.
  // Firebase Storage is NOT provisioned by default, which causes "Max retry time" timeouts.
  // We simply return the image data (HTTP URL or Base64) to be stored in Firestore directly.
  return imageData;
};
