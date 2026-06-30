// firebase-config.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBMZDenqVJbkU8Q6FDnOKPbIkMxoImTSNU",
    authDomain: "ficotrans.firebaseapp.com",
    projectId: "ficotrans",
    storageBucket: "ficotrans.firebasestorage.app",
    messagingSenderId: "185960224316",
    appId: "1:185960224316:web:82b4291cdd45a2af781539"
  };

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
