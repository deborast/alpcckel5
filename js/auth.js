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
        
            onValue(ref(db, 'users/' + user.uid), (snapshot) => {
                const inisial = user.displayName ? user.displayName.charAt(0).toUpperCase() : 'P';
                let fotoHtml = inisial;

                if (snapshot.exists()) {
                    const data = snapshot.val();
                    
                    if (data.bio) {
                        document.querySelectorAll('.user-bio-display').forEach(el => el.innerText = data.bio);
                    } else {
                        document.querySelectorAll('.user-bio-display').forEach(el => el.innerText = "hi !");
                    }

                    if (data.foto && data.foto.length > 50) {
                        fotoHtml = `<img src="${data.foto}" class="w-full h-full object-cover rounded-full">`;
                    }
                }

                document.querySelectorAll('.user-photo-display').forEach(el => {
                    el.innerHTML = fotoHtml;
                });
            }); 
        }
    } else {
        if (!isAuthPage) window.location.href = 'login.html';
    }
});

window.logoutUser = () => {
    localStorage.clear();
    sessionStorage.clear();
    signOut(auth).then(() => {
        window.location.href = 'login.html';
    }).catch((error) => {
        alert("Gagal logout: " + error.message);
    });
};