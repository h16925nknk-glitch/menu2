import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

import {
  getFirestore,
  doc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";


export const firebaseConfig = {
  apiKey: "ここは今のEnglish MenuのapiKey",
  authDomain: "english-menu.firebaseapp.com",
  projectId: "english-menu",
  storageBucket: "english-menu.firebasestorage.app",
  messagingSenderId: "448630440287",
  appId: "ここは今のEnglish MenuのappId",
  measurementId: "G-M71BGHBPDR"
};


export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const authReady = setPersistence(
  auth,
  browserLocalPersistence
).catch((error) => {
  console.error("Auth persistence error:", error);
});

export const db = getFirestore(app);

export const storage = getStorage(app);

export const menuDocument = doc(
  db,
  "restaurantMenus",
  "bouyourou"
);
