// lib/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCj2cjmUX7UWIHGxetBRZvSomJWUQ7W2fA",
  authDomain: "kenistymalak.firebaseapp.com",
  projectId: "kenistymalak",
  storageBucket: "kenistymalak.appspot.com",
  messagingSenderId: "400742701056",
  appId: "1:400742701056:web:5b0ff5d43446924974a0e5",
  measurementId: "G-7RG7Z31PHV",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };