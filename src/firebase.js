import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyBWKNwcMrk5Phc1sEwYP7Yc8Q2mZ9vXkLs",
  authDomain: "meije-naturo.firebaseapp.com",
  projectId: "meije-naturo",
  storageBucket: "meije-naturo.firebasestorage.app",
  messagingSenderId: "354199771986",
  appId: "1:354199771986:web:b44f3f10d671dd4b9f388b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
