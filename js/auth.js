import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { auth, db } from './firebase-config.js';


onAuthStateChanged(auth, (user) => {
    const isAuthPage = window.location.href.includes('login.html') || window.location.href.includes('register.html');

    if (user) {
        if (!user.emailVerified) {
            if (!isAuthPage) window.location.href = 'login.html';
        } else {
            if (isAuthPage) window.location.href = 'index.html';

            document.querySelectorAll('.user-name-display').forEach(el => el.innerText = user.displayName || "Pengguna");
        
            document.querySelectorAll('.user-photo-display').forEach(el => {
                if (user.photoURL) {
                    el.innerHTML = `<img src="${user.photoURL}" class="w-full h-full object-cover rounded-full">`;
                } else {
                    const nama = user.displayName || "P";
                    el.innerText = nama.charAt(0).toUpperCase();
                }
            });

            onValue(ref(db, 'users/' + user.uid), (snapshot) => {
                if (snapshot.exists() && snapshot.val().bio) {
                    const teksBio = snapshot.val().bio;
                    document.querySelectorAll('.user-bio-display').forEach(el => el.innerText = teksBio);
                } else {
                    document.querySelectorAll('.user-bio-display').forEach(el => el.innerText = "hi !");
                }
            }, { onlyOnce: true });
        }
    } else {
        if (!isAuthPage) window.location.href = 'login.html';
    }
});

window.logoutUser = () => {
    signOut(auth).then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        alert("Gagal logout: " + error.message);
    });
};