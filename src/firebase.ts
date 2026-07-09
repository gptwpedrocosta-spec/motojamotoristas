import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDYRtghzvloxQUM83TUeOLc9lyz-YIcOis",
  authDomain: "gen-lang-client-0577349332.firebaseapp.com",
  projectId: "gen-lang-client-0577349332",
  storageBucket: "gen-lang-client-0577349332.firebasestorage.app",
  messagingSenderId: "144531864367",
  appId: "1:144531864367:web:7799dd6e88aad0ca703fda"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let database;
try {
  database = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  console.warn("Failed to initialize Firestore with persistent cache, falling back to default.", e);
  database = getFirestore(app);
}

export const db = database;
