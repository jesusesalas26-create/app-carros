import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC2qio9yVXc4ZkQt-Nb0PMD1iP7kBd8fCo",
  authDomain: "jse-auto-group.firebaseapp.com",
  projectId: "jse-auto-group",
  storageBucket: "jse-auto-group.firebasestorage.app",
  messagingSenderId: "522861989399",
  appId: "1:522861989399:web:d0c84f052bb1ed646e1652",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);