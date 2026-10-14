import { ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './firebase-config.js';
import { GEMINI_API_KEY } from './js/env.js';

const targetRef = ref(db, 'target_belajar');
const nilaiRef = ref(db, 'riwayat_nilai');

let kuisSoalData = [];
let kuisModulAktif = { idTarget: null, idModul: null, judul: "" };
let loadingInterval;
let isGeneratingKuis = false;
let allRiwayatData = {}; 

window.showToast = (title, message, type = "success") => {
    const toast = document.getElementById('customToast');
    document.getElementById('toastTitle').innerText = title; document.getElementById('toastMessage').innerText = message;
    toast.className = `fixed top-8 right-8 z-[100] transform transition-transform duration-500 bg-white border-l-4 shadow-2xl rounded-2xl p-5 flex items-start gap-4 w-80 translate-x-0 ${type === 'success' ? 'border-green-500' : 'border-red-500'}`;
    document.getElementById('toastIcon').innerHTML = type === 'success' ? `<div class="bg-green-100 text-green-500 p-2 rounded-full"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>` : `<div class="bg-red-100 text-red-500 p-2 rounded-full"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></div>`;
    setTimeout(() => { toast.classList.remove('translate-x-0'); toast.classList.add('translate-x-[150%]'); }, 4000);
};

onValue(targetRef, (snapshot) => {
    const container = document.getElementById('containerModulKuis');
    container.innerHTML = '';
    let hasModul = false;

    if (snapshot.exists()) {
        snapshot.forEach((child) => {
            const targetId = child.key;
            const data = child.val();
            const modulList = data.modul_list || {};
            if (data.materi && !modulList['legacy']) modulList['legacy'] = { judul_modul: "Modul Utama", materi: data.materi };

            Object.entries(modulList).forEach(([modulId, modulData]) => {
                hasModul = true;
                let tBab = 0, sBab = 0;
                if(modulData.materi) {
                    tBab = modulData.materi.length;
                    modulData.materi.forEach(b => { if(b.selesai) sBab++; });
                }
                const isSelesai = (tBab > 0 && sBab === tBab);

                const buttonHTML = isSelesai
                    ? `<button onclick="mulaiKuisAi('${targetId}', '${modulId}', '${modulData.judul_modul.replace(/'/g, "\\'")}')" class="bg-primaryLight text-primary font-bold px-4 py-2 rounded-xl hover:bg-primary hover:text-white transition whitespace-nowrap shadow-sm">✨ Generate Kuis</button>`
                    : `<button disabled class="bg-gray-100 text-gray-400 font-bold px-4 py-2 rounded-xl cursor-not-allowed whitespace-nowrap" title="Baca materi sampai beres dulu ya!">🔒 Selesaikan Modul</button>`;

                const div = document.createElement('div');
                div.className = `bg-white p-5 rounded-2xl border ${isSelesai ? 'border-primaryLight hover:border-primary' : 'border-gray-100 opacity-75'} shadow-sm flex justify-between items-center transition group`;
                div.innerHTML = `
                    <div>
                        <div class="text-xs font-bold text-gray-400 mb-1 tracking-wider uppercase">${data.judul}</div>
                        <h4 class="font-extrabold text-gray-900 ${isSelesai ? 'group-hover:text-primary transition' : ''}">${modulData.judul_modul}</h4>
                        ${!isSelesai ? `<div class="text-xs text-red-400 font-bold mt-1">Selesai: ${sBab}/${tBab} Bab</div>` : `<div class="text-xs text-green-500 font-bold mt-1">Siap Diuji!</div>`}
                    </div>
                    ${buttonHTML}
                `;
                container.appendChild(div);
            });
        });
    }

    if (!hasModul) container.innerHTML = `<div class="text-gray-400 text-center py-6 border-2 border-dashed rounded-2xl">Belum ada modul untuk diuji.</div>`;
});

window.mulaiKuisAi = async (tId, mId, judulModul) => {
    if (isGeneratingKuis) {
        showToast("Tunggu Sebentar ✋", "Khodam sedang menyusun soal, jangan diklik berkali-kali ya!", "error");
        return;
    }

    isGeneratingKuis = true;
    kuisModulAktif = { idTarget: tId, idModul: mId, judul: judulModul };
    
    document.getElementById('viewDaftarKuis').classList.add('hidden');
    document.getElementById('viewLoadingKuis').classList.remove('hidden');
    document.getElementById('viewLoadingKuis').classList.add('flex');

    const teksVariasi = ["Membaca rangkuman bab...", "Merumuskan 10 soal mengecoh...", "Menyiapkan pilihan ganda...", "Sebentar lagi..."];
    let idx = 0; 
    loadingInterval = setInterval(() => { idx = (idx + 1) % teksVariasi.length; document.getElementById('loadingKuisText').innerText = teksVariasi[idx]; }, 2000);

    try {
        const prompt = `Buatkan 10 soal pilihan ganda tentang topik "${judulModul}". Kembalikan HANYA dalam format JSON Array tanpa teks pengantar. Gunakan key: "soal" (string), "pilihan" (array 4 opsi A/B/C/D), dan "jawaban_benar" (string sesuai opsi).`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                contents: [{ parts: [{text: prompt}] }],
                generationConfig: { responseMimeType: "application/json" }
            }) 
        });
        
        if (!response.ok) throw new Error("Gagal mengambil data dari Google AI");
        
        const hasilApi = await response.json(); 
        kuisSoalData = JSON.parse(hasilApi.candidates[0].content.parts[0].text);
        renderSoalKeLayar();
        
    } catch (error) {
        console.error("Detail Error Kuis:", error);
        showToast("Gagal", "Server AI sedang sibuk. Coba tekan tombol Generate lagi.", "error");
        batalKuis();
    } finally { 
        clearInterval(loadingInterval); 
        isGeneratingKuis = false;
    }
};

window.batalKuis = () => {
    document.getElementById('viewLoadingKuis').classList.add('hidden');
    document.getElementById('viewLoadingKuis').classList.remove('flex');
    document.getElementById('viewKerjakanKuis').classList.add('hidden');
    document.getElementById('viewDaftarKuis').classList.remove('hidden');
    kuisSoalData = [];
};

function renderSoalKeLayar() {
    document.getElementById('viewLoadingKuis').classList.add('hidden');
    document.getElementById('viewLoadingKuis').classList.remove('flex');
    document.getElementById('viewKerjakanKuis').classList.remove('hidden');
    
    document.getElementById('judulKuisAktif').innerText = "Kuis: " + kuisModulAktif.judul;
    const formKuis = document.getElementById('formKuis');
    formKuis.innerHTML = '';

    kuisSoalData.forEach((item, i) => {
        let opsiHTML = '';
        item.pilihan.forEach((opsi, j) => {
            opsiHTML += `
                <label class="flex items-center gap-3 p-4 border-2 border-gray-100 rounded-xl cursor-pointer hover:border-primaryLight transition bg-gray-50/50 hover:bg-primaryLight/50">
                    <input type="radio" name="soal_${i}" value="${opsi}" class="w-5 h-5 text-primary focus:ring-primary">
                    <span class="font-medium text-gray-700">${opsi}</span>
                </label>
            `;
        });

        formKuis.innerHTML += `
            <div class="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                <h4 class="text-xl font-bold text-gray-900 mb-5"><span class="text-primary mr-2">${i+1}.</span> ${item.soal}</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">${opsiHTML}</div>
            </div>
        `;
    });
}

// logic popup kuis
window.submitKuis = () => {
    document.getElementById('modalKonfirmasiSubmit').classList.remove('hidden');
    document.getElementById('modalKonfirmasiSubmit').classList.add('flex');
};

window.batalSubmit = () => {
    document.getElementById('modalKonfirmasiSubmit').classList.add('hidden');
    document.getElementById('modalKonfirmasiSubmit').classList.remove('flex');
};

window.prosesSubmitKuis = async () => {
    document.getElementById('modalKonfirmasiSubmit').classList.add('hidden');
    document.getElementById('modalKonfirmasiSubmit').classList.remove('flex');

    let benar = 0;
    let detailJawabanUser = []; 

    kuisSoalData.forEach((item, i) => {
        const jawabanUser = document.querySelector(`input[name="soal_${i}"]:checked`);
        const valueUser = jawabanUser ? jawabanUser.value.trim() : "";
        
        if (valueUser === item.jawaban_benar.trim()) benar++;

        detailJawabanUser.push({
            soal: item.soal,
            pilihan: item.pilihan,
            jawaban_benar: item.jawaban_benar,
            jawaban_user: valueUser
        });
    });

    const skorAkhir = Math.round((benar / kuisSoalData.length) * 100);
    
    try {
        await push(nilaiRef, {
            judul_modul: kuisModulAktif.judul,
            skor: skorAkhir,
            tanggal: new Date().toLocaleDateString('id-ID'),
            catatan: "",
            detail_soal: detailJawabanUser 
        });
        
        showToast("Kuis Selesai!", `Kamu menjawab benar ${benar} dari ${kuisSoalData.length} soal. Nilai ${skorAkhir} berhasil disimpan.`);
        batalKuis(); 
    } catch (error) { showToast("Gagal", "Skor gagal disimpan ke database.", "error"); }
};


// riwayat&review
onValue(nilaiRef, (snapshot) => {
    const container = document.getElementById('containerRiwayat');
    container.innerHTML = '';
    allRiwayatData = {}; 
    
    if (snapshot.exists()) {
        const dataArray = [];
        snapshot.forEach((child) => { 
            const d = { id: child.key, ...child.val() };
            dataArray.push(d); 
            allRiwayatData[child.key] = d; 
        });
        dataArray.reverse();

        dataArray.forEach(data => {
            let warnaSkor = data.skor >= 80 ? 'text-green-500 bg-green-50' : (data.skor >= 60 ? 'text-yellow-600 bg-yellow-50' : 'text-red-500 bg-red-50');
            
            container.innerHTML += `
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative group transition hover:border-gray-300">
                    <div class="flex justify-between items-start mb-2">
                        <div class="pr-10">
                            <h4 class="font-extrabold text-gray-900">${data.judul_modul}</h4>
                            <p class="text-xs text-gray-400 mt-1">${data.tanggal}</p>
                        </div>
                        <div class="text-2xl font-black px-3 py-1 rounded-xl ${warnaSkor}">${data.skor}</div>
                    </div>
                    
                    <div class="mt-3 bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200 text-sm font-medium ${data.catatan ? 'text-gray-700' : 'text-gray-400 italic'}">
                        ${data.catatan ? '📝 ' + data.catatan : 'Belum ada catatan refleksi.'}
                    </div>

                    <div class="absolute top-4 right-20 flex gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                        <button onclick="bukaReview('${data.id}')" class="p-2 bg-white border shadow-sm rounded-full text-gray-500 hover:text-green-500 transition" title="Review Kuis"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg></button>
                        <button onclick="bukaModalCatatan('${data.id}', '${data.catatan}')" class="p-2 bg-white border shadow-sm rounded-full text-gray-500 hover:text-blue-500 transition" title="Tambah/Edit Catatan"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                        <button onclick="hapusNilai('${data.id}')" class="p-2 bg-white border shadow-sm rounded-full text-gray-500 hover:text-red-500 transition" title="Hapus Riwayat"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                </div>
            `;
        });
    } else {
        container.innerHTML = `<div class="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center text-gray-400 font-medium border-dashed">Belum ada nilai. Selesaikan modul dan kerjakan kuis!</div>`;
    }
});


// review&feedback
window.bukaReview = async (id) => {
    const data = allRiwayatData[id];
    
    if(!data || !data.detail_soal) {
        showToast("Maaf", "Riwayat kuis lama ini belum memiliki data detail jawaban.", "error");
        return;
    }

    document.getElementById('reviewJudulModul').innerText = data.judul_modul;
    const reviewSkor = document.getElementById('reviewSkor');
    reviewSkor.innerText = data.skor;
    reviewSkor.className = `text-3xl font-black px-4 py-2 rounded-xl ${data.skor >= 80 ? 'text-green-600 bg-green-100' : (data.skor >= 60 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100')}`;

    const containerSoal = document.getElementById('containerReviewSoal');
    containerSoal.innerHTML = '';
    
    let daftarSalah = []; 

    data.detail_soal.forEach((item, i) => {
        const isBenar = item.jawaban_user === item.jawaban_benar;
        if(!isBenar) daftarSalah.push(`Soal: ${item.soal} (User menjawab: ${item.jawaban_user || 'Kosong'}, Seharusnya: ${item.jawaban_benar})`);

        let opsiHTML = '';
        item.pilihan.forEach(opsi => {
            let bgColor = 'bg-white';
            let border = 'border-gray-200';
            let icon = '';

            if (opsi === item.jawaban_benar) {
                bgColor = 'bg-green-50'; border = 'border-green-400'; icon = '✅';
            } 
            else if (opsi === item.jawaban_user && !isBenar) {
                bgColor = 'bg-red-50'; border = 'border-red-400'; icon = '❌';
            }

            opsiHTML += `
                <div class="p-3 border ${border} ${bgColor} rounded-xl text-sm font-medium text-gray-700 flex justify-between">
                    <span>${opsi}</span>
                    <span>${icon}</span>
                </div>
            `;
        });

        containerSoal.innerHTML += `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                <h5 class="font-bold text-gray-800 mb-3"><span class="${isBenar ? 'text-green-500' : 'text-red-500'} mr-1">${i+1}.</span> ${item.soal}</h5>
                <div class="space-y-2">${opsiHTML}</div>
                ${!item.jawaban_user ? '<p class="text-xs text-red-500 mt-2 font-bold">*Kamu tidak memilih jawaban untuk soal ini.</p>' : ''}
            </div>
        `;
    });

    document.getElementById('modalReviewKuis').classList.remove('hidden');
    document.getElementById('modalReviewKuis').classList.add('flex');

    const feedbackBox = document.getElementById('reviewFeedbackAI');
    const teksFeedback = document.getElementById('teksFeedbackAI');
    
    if (daftarSalah.length > 0) {
        feedbackBox.classList.remove('hidden');
        teksFeedback.innerHTML = `<span class="animate-pulse">Khodam sedang merumuskan masukan evaluasi belajarmu...</span>`;
        
        try {
            const prompt = `Sebagai mentor bernama Khodam, berikan masukan singkat (maksimal 2 paragraf pendek) untuk murid yang baru saja mengerjakan kuis materi "${data.judul_modul}". Murid ini salah menjawab beberapa pertanyaan berikut:\n\n${daftarSalah.join('\n')}\n\nBeritahu dia topik atau teori spesifik apa yang harus dia pelajari lagi berdasarkan kesalahannya tersebut. Gunakan bahasa Indonesia kasual yang memotivasi.`;
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ contents: [{ parts: [{text: prompt}] }] }) 
            });
            
            if (!response.ok) throw new Error();
            const hasilApi = await response.json();
            teksFeedback.innerHTML = hasilApi.candidates[0].content.parts[0].text.replace(/\n/g, '<br>');
        } catch(e) {
            teksFeedback.innerText = "Gagal mengambil masukan AI saat ini. Tapi jangan menyerah, pelajari lagi materi yang masih salah di bawah ya!";
        }
    } else {
        feedbackBox.classList.remove('hidden');
        teksFeedback.innerText = "Wow, sempurna! Tidak ada masukan perbaikan dari Khodam karena kamu berhasil menjawab semua soal dengan benar. Pertahankan!";
    }
};

window.tutupReview = () => {
    document.getElementById('modalReviewKuis').classList.add('hidden');
    document.getElementById('modalReviewKuis').classList.remove('flex');
};

window.bukaModalCatatan = (id, oldCatatan) => {
    document.getElementById('editNilaiId').value = id;
    document.getElementById('inputCatatan').value = oldCatatan;
    document.getElementById('modalCatatan').classList.remove('hidden'); document.getElementById('modalCatatan').classList.add('flex');
};
window.tutupModalCatatan = () => { document.getElementById('modalCatatan').classList.add('hidden'); document.getElementById('modalCatatan').classList.remove('flex'); };

window.simpanCatatan = async () => {
    const id = document.getElementById('editNilaiId').value, catatan = document.getElementById('inputCatatan').value;
    try { await update(ref(db, `riwayat_nilai/${id}`), { catatan: catatan }); showToast("Tersimpan", "Catatan refleksi diupdate."); tutupModalCatatan(); } 
    catch (err) { showToast("Gagal", "Gagal menyimpan catatan.", "error"); }
};

window.hapusNilai = async (id) => {
    if(confirm("Hapus riwayat nilai ini?")) {
        try { await remove(ref(db, `riwayat_nilai/${id}`)); showToast("Terhapus", "Riwayat nilai dibuang."); } 
        catch(err) { showToast("Gagal", "Gagal menghapus data.", "error"); }
    }
};