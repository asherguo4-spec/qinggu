import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, deleteDoc, updateDoc, onSnapshot, orderBy, getDocFromServer } from 'firebase/firestore';
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
      // 1. Get signature from our backend
      const sigRes = await fetch("/api/cloudinary-signature", { method: "POST" });
      if (!sigRes.ok) {
        throw new Error("Failed to get Cloudinary signature. Please ensure CLOUDINARY API keys are configured in Settings.");
      }
      
      const { timestamp, signature, cloud_name, api_key } = await sigRes.json();
      
      if (!cloud_name || !api_key || !signature) {
          throw new Error("Cloudinary configuration missing. Please add it to Settings -> API Keys & Environment.");
      }

      // 2. Upload directly to Cloudinary bypassing the backend proxy limits
      const formData = new FormData();
      formData.append("file", imageData);
      formData.append("api_key", api_key);
      formData.append("timestamp", timestamp);
      formData.append("signature", signature);
      formData.append("folder", "selindell_creations");

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new Error(`Cloudinary upload failed: ${text}`);
      }

      const data = await uploadRes.json();
      return data.secure_url;
    } catch (e) {
      console.error("Direct Cloudinary upload failed:", e);
      throw e;
    }
  }
  return imageData;
};
