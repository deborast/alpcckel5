import { ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './firebase-config.js';
import { GEMINI_API_KEY } from './js/env.js';

const targetRef = ref(db, 'target_belajar');

let allTargetsData = {};
let activeTargetId = null;
let loadingInterval; 

function calcProgressBab(modulData) {
    let tBab = 0, sBab = 0;
    if(modulData.materi && Array.isArray(modulData.materi)) {
        tBab = modulData.materi.length;
        modulData.materi.forEach(b => { if(b.selesai) sBab++; });
    }
    return { tBab, sBab, isModulSelesai: (tBab > 0 && sBab === tBab) };
}

window.showToast = (title, message, type = "success") => {
    const toast = document.getElementById('customToast') || document.createElement('div');
    if (!document.getElementById('customToast')) { toast.id = "customToast"; document.body.appendChild(toast); }
    toast.innerHTML = `<div class="p-2 rounded-full ${type === 'success' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${type === 'success' ? 'M5 13l4 4L19 7' : 'M6 18L18 6M6 6l12 12'}"></path></svg></div><div><h4 class="font-bold text-gray-800 text-lg">${title}</h4><p class="text-sm text-gray-500 mt-1">${message}</p></div>`;
    toast.className = `fixed top-8 right-8 z-[100] transform transition-transform duration-500 bg-white border-l-4 shadow-2xl rounded-2xl p-5 flex items-start gap-4 w-80 translate-x-0 ${type === 'success' ? 'border-green-500' : 'border-red-500'}`;
    setTimeout(() => { toast.classList.remove('translate-x-0'); toast.classList.add('translate-x-[150%]'); }, 4000);
};

onValue(targetRef, (snapshot) => {
    allTargetsData = {};
    if (snapshot.exists()) snapshot.forEach((child) => { allTargetsData[child.key] = child.val(); });
    renderTargetList();
    if (activeTargetId && !document.getElementById('viewFolder').classList.contains('hidden')) renderFolder(activeTargetId);
});

function renderTargetList() {
    const container = document.getElementById('containerTargetList');
    container.innerHTML = `<div onclick="bukaModal()" class="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer hover:bg-primaryLight hover:border-primary transition group h-64"><div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-white mb-4 transition">+</div><h4 class="font-bold text-gray-700 group-hover:text-primary">Buat folder target baru</h4></div>`;

    Object.entries(allTargetsData).forEach(([id, data]) => {
        let totalModul = 0, selesaiModul = 0;
        const modulList = data.modul_list || {};
        if (data.materi && !modulList['legacy']) modulList['legacy'] = { judul_modul: "Modul Pertama", materi: data.materi };
        
        Object.values(modulList).forEach(m => { totalModul++; if (calcProgressBab(m).isModulSelesai) selesaiModul++; });
        const persenTarget = totalModul === 0 ? 0 : Math.round((selesaiModul/totalModul)*100);

        const card = document.createElement('div');
        card.className = "bg-white p-6 rounded-2xl shadow-sm border flex flex-col justify-between h-64 hover:shadow-md transition cursor-pointer";
        card.onclick = () => bukaFolder(id); 
        card.innerHTML = `
            <div>
                <div class="w-12 h-12 rounded-xl bg-primaryLight text-primary flex items-center justify-center font-bold mb-4">📁</div>
                <h3 class="font-bold text-xl text-gray-800 line-clamp-1 group-hover:text-primary">${data.judul}</h3>
                <p class="text-sm text-gray-500 mt-1 line-clamp-2">${data.deskripsi || 'Tidak ada deskripsi'}</p>
            </div>
            <div class="mt-auto pt-4 border-t">
                <div class="flex justify-between items-center mb-2"><span class="text-xs font-bold text-gray-500">${selesaiModul} / ${totalModul} Modul</span><span class="text-xs font-bold text-primary">${persenTarget}%</span></div>
                <div class="w-full bg-gray-100 rounded-full h-1.5 mb-3 overflow-hidden"><div class="bg-primary h-1.5 rounded-full" style="width: ${persenTarget}%"></div></div>
                <div class="flex gap-2">
                    <button onclick="event.stopPropagation(); editTarget('${id}', '${data.judul}', '${data.deskripsi || ''}', '${data.tanggal}')" class="p-2 text-gray-400 hover:text-blue-500 rounded-lg"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    <button onclick="event.stopPropagation(); hapusTarget('${id}')" class="p-2 text-gray-400 hover:text-red-500 rounded-lg"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                </div>
            </div>
        `;
        container.prepend(card);
    });
}

window.bukaFolder = (id) => { activeTargetId = id; document.getElementById('viewTargetList').classList.add('hidden'); document.getElementById('viewFolder').classList.remove('hidden'); renderFolder(id); };
window.kembaliKeTarget = () => { activeTargetId = null; document.getElementById('viewFolder').classList.add('hidden'); document.getElementById('viewTargetList').classList.remove('hidden'); };

function renderFolder(id) {
    const data = allTargetsData[id];
    document.getElementById('folderJudul').innerText = "Target: " + data.judul;
    const containerModul = document.getElementById('containerModulList');
    
    containerModul.innerHTML = `<div onclick="bukaModalKhodam()" class="border-2 border-dashed border-primaryLight bg-[#fcfbZm] rounded-2xl flex flex-col items-center justify-center p-6 cursor-pointer hover:bg-primaryLight transition h-48 group"><div class="text-3xl mb-2 group-hover:scale-125 transition-transform">🔮</div><h4 class="font-bold text-primary text-center">Panggil Khodam AI</h4></div>`;

    const modulList = data.modul_list || {};
    if (data.materi && !modulList['legacy']) modulList['legacy'] = { judul_modul: "Modul Pertama", materi: data.materi };

    Object.entries(modulList).forEach(([modulId, modulData]) => {
        const { tBab, sBab, isModulSelesai } = calcProgressBab(modulData);
        const persenBab = tBab === 0 ? 0 : Math.round((sBab/tBab)*100);

        const card = document.createElement('div');
        card.className = `p-6 rounded-2xl shadow-sm border-2 ${isModulSelesai ? 'border-green-300 bg-green-50/20' : 'bg-white border-gray-100'} flex flex-col h-48 hover:border-primary transition cursor-pointer group`;
        
        card.onclick = () => window.location.href = `baca.html?target=${id}&modul=${modulId}`;
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2 gap-2">
                <h4 class="font-bold text-lg text-gray-800 line-clamp-2 leading-snug">${modulData.judul_modul}</h4>
                <button onclick="event.stopPropagation(); hapusModul('${id}', '${modulId}')" class="text-gray-300 hover:text-red-500 transition shrink-0 opacity-0 group-hover:opacity-100" title="Hapus Modul">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                </button>
            </div>
            <div class="mt-auto">
                <div class="flex justify-between text-xs text-gray-500 font-bold mb-1"><span>${sBab}/${tBab} Bab Selesai</span><span class="text-primary">${persenBab}%</span></div>
                <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden mb-4"><div class="${isModulSelesai ? 'bg-green-500' : 'bg-primary'} h-1.5 rounded-full" style="width: ${persenBab}%"></div></div>
                <div class="flex justify-between items-center text-primary font-bold text-sm border-t pt-3">Masuk Modul &rarr;</div>
            </div>
        `;
        containerModul.prepend(card);
    });
}

// crud modul
window.hapusModul = async (idTarget, idModul) => {
    if(confirm("Yakin ingin menghapus modul ini beserta isinya?")) {
        try {
            await remove(ref(db, `target_belajar/${idTarget}/modul_list/${idModul}`));
            showToast("Terhapus", "Modul berhasil dihapus dari Target Belajar.");
        } catch(err) {
            showToast("Gagal", "Gagal menghapus modul.", "error");
        }
    }
};

// logic khodam
window.cekFilePdf = () => { if(document.getElementById('aiPdf').files.length > 0) document.getElementById('btnHapusPdf').classList.remove('hidden'); };
window.hapusPdf = () => { document.getElementById('aiPdf').value = ""; document.getElementById('btnHapusPdf').classList.add('hidden'); };
window.bukaModalKhodam = () => { document.getElementById('aiTopik').value = ""; if(document.getElementById('aiKisi')) document.getElementById('aiKisi').value = ""; hapusPdf(); document.getElementById('modalKhodam').classList.remove('hidden'); document.getElementById('modalKhodam').classList.add('flex'); document.getElementById('formKhodamArea').classList.remove('hidden'); document.getElementById('aiLoadingArea').classList.add('hidden'); document.getElementById('aiLoadingArea').classList.remove('flex'); };
window.tutupModalKhodam = () => { document.getElementById('modalKhodam').classList.add('hidden'); document.getElementById('modalKhodam').classList.remove('flex'); hapusPdf(); clearInterval(loadingInterval); };

window.generateAI = async () => {
    const formArea = document.getElementById('formKhodamArea'), loadArea = document.getElementById('aiLoadingArea'), teksLoading = document.getElementById('loadingText');
    const topikModul = document.getElementById('aiTopik').value, bab = document.getElementById('aiBab').value, kisi = document.getElementById('aiKisi') ? document.getElementById('aiKisi').value : "", filePdf = document.getElementById('aiPdf').files[0];

    if(!topikModul) return showToast("Tunggu Dulu!", "Judul modul wajib diisi.", "error");

    formArea.classList.add('hidden'); loadArea.classList.remove('hidden'); loadArea.classList.add('flex');
    const teksVariasi = ["Membaca referensi...", "Menganalisis isi materi...", "Menyusun struktur bab...", "Menulis ringkasan rapi..."]; 
    let idx = 0; loadingInterval = setInterval(() => { idx = (idx + 1) % teksVariasi.length; teksLoading.innerText = teksVariasi[idx]; }, 2000);

    try {
        let partsData = [{ text: `Kamu adalah sistem KhodamBelajar. Buatkan tepat ${bab} bab materi belajar untuk judul modul "${topikModul}". ${kisi ? `Fokus kisi: \${kisi}` : ''} WAJIB balas HANYA dengan JSON MURNI: [{"bab": 1, "judul": "Judul Bab", "ringkasan": "Isi 3 paragraf"}]` }];
        if (filePdf) { const base64Data = await new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(filePdf); }); partsData.push({ inline_data: { mime_type: "application/pdf", data: base64Data } }); }
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY.trim()}`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                contents: [{ parts: partsData }], 
                generationConfig: { responseMimeType: "application/json" } 
            }) 
        });
        
        if (!response.ok) throw new Error("Gagal terhubung ke Google AI.");
        
        const hasilApi = await response.json(); 
        const parsedData = JSON.parse(hasilApi.candidates[0].content.parts[0].text);

        await push(ref(db, `target_belajar/${activeTargetId}/modul_list`), { judul_modul: topikModul, materi: parsedData, tanggal_dibuat: new Date().toLocaleDateString('id-ID') });
        showToast("Berhasil!", "Modul sukses disatukan ke Folder Target."); tutupModalKhodam();
    } catch (error) { 
        showToast("Gagal", "Koneksi AI error.", "error"); 
        formArea.classList.remove('hidden'); 
        loadArea.classList.add('hidden'); 
        loadArea.classList.remove('flex'); 
    } finally { clearInterval(loadingInterval); }
};

window.bukaModal = () => { document.getElementById('inputId').value = ""; document.getElementById('inputJudul').value = ""; document.getElementById('modalForm').classList.remove('hidden'); document.getElementById('modalForm').classList.add('flex'); };
window.tutupModal = () => { document.getElementById('modalForm').classList.add('hidden'); document.getElementById('modalForm').classList.remove('flex'); };
window.simpanData = () => { const id = document.getElementById('inputId').value, judul = document.getElementById('inputJudul').value, deskripsi = document.getElementById('inputDeskripsi').value, tanggal = document.getElementById('inputTanggal').value; if(judul === "" || tanggal === "") return showToast("Gagal", "Isi form!", "error"); if (id === "") push(targetRef, { judul, deskripsi, tanggal, dibuat: Date.now() }); else update(ref(db, 'target_belajar/' + id), { judul, deskripsi, tanggal }); tutupModal(); };
window.editTarget = (id, judul, deskripsi, tanggal) => { document.getElementById('inputId').value = id; document.getElementById('inputJudul').value = judul; document.getElementById('inputDeskripsi').value = deskripsi; document.getElementById('inputTanggal').value = tanggal; document.getElementById('modalForm').classList.remove('hidden'); document.getElementById('modalForm').classList.add('flex'); };
window.hapusTarget = (id) => { if(confirm("Hapus target ini beserta isinya?")) remove(ref(db, 'target_belajar/' + id)); };