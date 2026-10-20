const sidebarHTML = `
    <aside class="w-64 bg-white border-r flex flex-col justify-between h-full z-20 shrink-0">
        <div>
            <div class="p-6 flex items-center gap-3">
                <div class="bg-primary text-white p-2 rounded-lg"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg></div>
                <h1 class="font-bold text-xl text-gray-800">Khodam<span class="text-primary">Belajar</span></h1>
            </div>
            <nav class="px-4 space-y-1" id="nav-menu">
                <a href="index.html" class="menu-item"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg> Beranda</a>
                <a href="target.html" class="menu-item"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke-width="2"/><circle cx="12" cy="12" r="6" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg> Target Belajar</a>
                <a href="modul.html" class="menu-item"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477-4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path></svg> Modul Belajar</a>
                <a href="kuis.html" class="menu-item"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg> Kuis & Nilai</a>
                <a href="profil.html" class="menu-item"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg> Profil</a>
            </nav>
        </div>
        <div class="p-4">
            <div class="bg-primaryLight/50 p-4 rounded-2xl mb-4 relative overflow-hidden">
                <div class="text-primary text-xl mb-2">✨</div>
                <h4 class="font-bold text-gray-800 text-sm">Sudah siap?</h4>
                <p class="text-xs text-gray-500 mt-1 mb-3">Buat modul kapan saja.</p>
                <a href="target.html" class="text-xs font-bold text-primary hover:underline">Mulai Belajar ^^</a>
            </div>
            <div class="flex items-center gap-3 border-t pt-4">
                <div class="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center font-bold text-sm user-photo-display overflow-hidden"></div>
                <div class="flex-1 overflow-hidden">
                    <p class="text-sm font-bold text-gray-800 truncate user-name-display">Memuat...</p>
                    <p class="text-xs text-gray-500 truncate user-bio-display">Pelajar</p>
                </div>
                <!-- TOMBOL LOGOUT KEMBALI DI SINI -->
                <button onclick="logoutUser()" class="text-red-500 hover:bg-red-50 p-2 rounded-lg transition" title="Keluar">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                </button>
            </div>
        </div>
    </aside>
`;

document.getElementById('tempat-sidebar').innerHTML = sidebarHTML;

const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const menuLinks = document.querySelectorAll('#nav-menu .menu-item');

menuLinks.forEach(link => {
    const linkHref = link.getAttribute('href');
    if (linkHref === currentPage) {
        link.className = "flex items-center gap-3 px-4 py-3 bg-primaryLight text-primary font-semibold rounded-xl transition";
    } else {
        link.className = "flex items-center gap-3 px-4 py-3 text-gray-500 rounded-xl hover:bg-gray-50 transition";
    }
});