import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore, doc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCSeiXf-HyIGXtaoKRr4BPpl_-FRoMlEgg",
  authDomain: "english-menu.firebaseapp.com",
  projectId: "english-menu",
  storageBucket: "english-menu.firebasestorage.app",
  messagingSenderId: "448630440287",
  appId: "1:448630440287:web:57033ee745555a02ca36ea",
  measurementId: "G-M71BGHBPDR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const authReady = setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Auth persistence error", error);
});
export const db = getFirestore(app);
export const storage = getStorage(app);
export const menuDocument = doc(db, "restaurantMenus", "bouyourou");
