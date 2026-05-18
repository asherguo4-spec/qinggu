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
  try {
    let blob: Blob;
    let mimeType = 'image/png';

    if (imageData.startsWith('http')) {
      const response = await fetch(imageData);
      if (!response.ok) throw new Error(`HTTP Error: ${response.statusText}`);
      blob = await response.blob();
      mimeType = blob.type || 'image/png';
    } else {
      const base64Content = imageData.split(',')[1] || imageData;
      const byteCharacters = atob(base64Content);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      blob = new Blob([byteArray], { type: 'image/png' });
    }

    const extension = mimeType.split('/')[1] || 'png';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 10)}.${extension}`;
    const storageRef = ref(storage, `${bucketName}/${fileName}`);

    await uploadBytes(storageRef, blob, { contentType: mimeType });
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Upload error:', error);
    if (imageData.startsWith('http')) return imageData;
    throw error;
  }
};
