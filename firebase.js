import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, doc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAtqq9NmhM9x82ZjvGgVJE3MLEUM-E4pQK",
  authDomain: "sake-flow.firebaseapp.com",
  projectId: "sake-flow",
  storageBucket: "sake-flow.firebasestorage.app",
  messagingSenderId: "70136248883",
  appId: "1:70136248883:web:055fc162a3b78612fac146",
  measurementId: "G-D0QG95KM2J"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const authReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Auth persistence error", error);
});
export const db = getFirestore(app);
export const storage = getStorage(app);
export const menuDocument = doc(db, "restaurantMenus", "bouyourou");
