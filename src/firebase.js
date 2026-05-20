import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDXlffs0qYEWGYh_oYStZ8zple14qm0GEk",
  authDomain: "casafinance-51540.firebaseapp.com",
  projectId: "casafinance-51540",
  storageBucket: "casafinance-51540.firebasestorage.app",
  messagingSenderId: "324925549723",
  appId: "1:324925549723:web:2715c666997f207221ea3e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
