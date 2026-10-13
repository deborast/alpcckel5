import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js"; 

const firebaseConfig = {
    apiKey: "AIzaSyBPN9O_aaI8j3f9tl6IRyDv_No8XiPBQm0",
    authDomain: "alpcckel5.firebaseapp.com",
    databaseURL: "https://alpcckel5-default-rtdb.asia-southeast1.firebasedatabase.app", 
    projectId: "alpcckel5",
    storageBucket: "alpcckel5.firebasestorage.app",
    messagingSenderId: "322517741473",
    appId: "1:322517741473:web:ab3a40695eb569551065e0",
    measurementId: "G-GNSWE9ZD5Z"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);