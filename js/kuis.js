import { ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { db } from './firebase-config.js';

import { GEMINI_API_KEY } from './env.js';

const targetRef = ref(db, 'target_belajar');
const nilaiRef = ref(db, 'riwayat_nilai');

let kuisSoalData = [];
let kuisModulAktif = { idTarget: null, idModul: null, judul: "" };
let loadingInterval;
let isGeneratingKuis = false;
let allRiwayatData = {}; 
let cacheTargetKuis = {};
let listModulKuis = [];
let listRiwayatArray = [];

window.showToast = (title, message, type = "success") => {
    const toast = document.getElementById('customToast');
    document.getElementById('toastTitle').innerText = title; document.getElementById('toastMessage').innerText = message;
    toast.className = `fixed top-8 right-8 z-[100] transform transition-transform duration-500 bg-white border-l-4 shadow-2xl rounded-2xl p-5 flex items-start gap-4 w-80 translate-x-0 ${type === 'success' ? 'border-green-500' : 'border-red-500'}`;
    document.getElementById('toastIcon').innerHTML = type === 'success' ? `<div class="bg-green-100 text-green-500 p-2 rounded-full"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg></div>` : `<div class="bg-red-100 text-red-500 p-2 rounded-full"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></div>`;
    setTimeout(() => { toast.classList.remove('translate-x-0'); toast.classList.add('translate-x-[150%]'); }, 4000);
};

onValue(targetRef, (snapshot) => {
    cacheTargetKuis = {};
    listModulKuis = [];

    if (snapshot.exists()) {
        snapshot.forEach((child) => {
            const targetId = child.key;
            const data = child.val();
            cacheTargetKuis[targetId] = data; 
            const modulList = data.modul_list || {};
            if (data.materi && !modulList['legacy']) modulList['legacy'] = { judul_modul: "Modul Utama", materi: data.materi };

            Object.entries(modulList).forEach(([modulId, modulData]) => {
                let tBab = 0, sBab = 0;
                if(modulData.materi && Array.isArray(modulData.materi)) {
                    tBab = modulData.materi.length;
                    modulData.materi.forEach(b => { if(b.selesai) sBab++; });
                }
                const isSelesai = (tBab > 0 && sBab === tBab);

                listModulKuis.push({
                    targetId,
                    modulId,
                    judulTarget: data.judul || "Tanpa Target",
                    judulModul: modulData.judul_modul || "Modul Tanpa Judul",
                    tBab,
                    sBab,
                    isSelesai
                });
            });
        });
    }
    renderKuisTersedia();
});

window.filterKuisTersedia = () => {
    renderKuisTersedia();
};

function renderKuisTersedia() {
    const container = document.getElementById('containerModulKuis');
    if (!container) return;
    container.innerHTML = '';

    const keyword = (document.getElementById('searchKuisTersedia')?.value || '').toLowerCase();
    const statusFilter = document.getElementById('filterStatusKuis')?.value || 'all';

    const filtered = listModulKuis.filter(item => {
        const matchKeyword = item.judulModul.toLowerCase().includes(keyword) || item.judulTarget.toLowerCase().includes(keyword);
        const matchStatus = statusFilter === 'all' ? true : (statusFilter === 'ready' ? item.isSelesai : !item.isSelesai);
        return matchKeyword && matchStatus;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-gray-400 text-center py-8 border-2 border-dashed rounded-2xl bg-white">Tidak ada modul kuis yang sesuai pencarian.</div>`;
        return;
    }

    filtered.forEach(item => {
        const safeJudul = item.judulModul.replace(/'/g, "\\'");
        const buttonHTML = item.isSelesai
            ? `<button onclick="mulaiKuisAi('${item.targetId}', '${item.modulId}', '${safeJudul}')" class="bg-primaryLight text-primary font-bold px-4 py-2 rounded-xl hover:bg-primary hover:text-white transition whitespace-nowrap shadow-sm">✨ Generate Kuis</button>`
            : `<button disabled class="bg-gray-100 text-gray-400 font-bold px-4 py-2 rounded-xl cursor-not-allowed whitespace-nowrap" title="Baca materi sampai beres dulu ya!">🔒 Selesaikan Modul</button>`;

        const div = document.createElement('div');
        div.className = `bg-white p-5 rounded-2xl border ${item.isSelesai ? 'border-primaryLight hover:border-primary' : 'border-gray-100 opacity-75'} shadow-sm flex justify-between items-center transition group`;
        div.innerHTML = `
            <div class="pr-4">
                <div class="text-xs font-bold text-gray-400 mb-1 tracking-wider uppercase line-clamp-1">${item.judulTarget}</div>
                <h4 class="font-extrabold text-gray-900 line-clamp-1 ${item.isSelesai ? 'group-hover:text-primary transition' : ''}">${item.judulModul}</h4>
                ${!item.isSelesai ? `<div class="text-xs text-red-400 font-bold mt-1">Selesai: ${item.sBab}/${item.tBab} Bab</div>` : `<div class="text-xs text-green-500 font-bold mt-1">Siap Diuji!</div>`}
            </div>
            ${buttonHTML}
        `;
        container.appendChild(div);
    });
}

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
        let konteksMateri = "";
        const dataT = cacheTargetKuis[tId];
        if (dataT) {
            const listM = dataT.modul_list || {};
            const dataM = listM[mId] || (mId === 'legacy' ? { materi: dataT.materi } : null);
            if (dataM && Array.isArray(dataM.materi)) {
                konteksMateri = dataM.materi.map(m => `Bab ${m.bab} (${m.judul}): ${m.ringkasan}`).join(" | ");
            }
        }

        const infoKonteks = konteksMateri ? ` WAJIB buat soal yang 100% mengacu pada isi materi bacaan berikut: [${konteksMateri.substring(0, 14000)}].` : "";
        const prompt = `Kamu adalah penguji akademis profesional. Buatkan tepat 10 soal pilihan ganda yang menguji pemahaman mendalam tentang modul "${judulModul}".${infoKonteks} ATURAN: 1. Setiap soal wajib memiliki 4 opsi jawaban tanpa awalan huruf A/B/C/D. 2. Nilai pada "jawaban_benar" HARUS SAMA PERSIS (identik karakter demi karakter) dengan salah satu teks di dalam array "pilihan". 3. Kembalikan HANYA dalam format JSON Array murni: [{"soal": "Pertanyaan...", "pilihan": ["Opsi 1", "Opsi 2", "Opsi 3", "Opsi 4"], "jawaban_benar": "Opsi 1"}]`;
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY.trim()}`, {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ 
                contents: [{ parts: [{text: prompt}] }],
                generationConfig: { responseMimeType: "application/json" }
            }) 
        });
        
        if (!response.ok) throw new Error("Gagal mengambil data dari Google AI");
        
        const hasilApi = await response.json(); 
        let rawText = hasilApi.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
        kuisSoalData = JSON.parse(rawText);
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
        item.pilihan.forEach((opsi) => {
            opsiHTML += `
                <label class="flex items-center gap-3 p-4 border-2 border-gray-100 rounded-xl cursor-pointer hover:border-primaryLight transition bg-gray-50/50 hover:bg-primaryLight/50">
                    <input type="radio" name="soal_${i}" value="${opsi.replace(/"/g, '&quot;')}" class="w-5 h-5 text-primary focus:ring-primary">
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

onValue(nilaiRef, (snapshot) => {
    allRiwayatData = {}; 
    listRiwayatArray = [];
    
    let totalSkor = 0;
    let skorTertinggi = 0;
    let judulTertinggi = "-";
    let totalKuis = 0;

    if (snapshot.exists()) {
        snapshot.forEach((child) => { 
            const val = child.val();
            const catatanBersih = (val.catatan && val.catatan !== '\${data.catatan}') ? val.catatan : '';
            const d = { id: child.key, ...val, catatan: catatanBersih };
            
            listRiwayatArray.push(d); 
            allRiwayatData[child.key] = d; 
            
            totalKuis++;
            totalSkor += Number(d.skor || 0);
            if (Number(d.skor || 0) > skorTertinggi) {
                skorTertinggi = d.skor;
                judulTertinggi = d.judul_modul;
            }
        });
        
        document.getElementById('rekapRata').innerText = (totalSkor / totalKuis).toFixed(1);
        document.getElementById('rekapTotal').innerText = totalKuis;
        document.getElementById('rekapTinggi').innerText = skorTertinggi;
        document.getElementById('rekapTinggiJudul').innerText = judulTertinggi;

        listRiwayatArray.reverse();
    } else {
        document.getElementById('rekapRata').innerText = "0";
        document.getElementById('rekapTotal').innerText = "0";
        document.getElementById('rekapTinggi').innerText = "0";
        document.getElementById('rekapTinggiJudul').innerText = "-";
    }
    renderRiwayatNilai();
});

window.filterRiwayatNilai = () => {
    renderRiwayatNilai();
};

function renderRiwayatNilai() {
    const container = document.getElementById('containerRiwayat');
    if (!container) return;
    container.innerHTML = '';

    if (listRiwayatArray.length === 0) {
        container.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-400">Belum ada riwayat kuis.</td></tr>`;
        return;
    }

    const keyword = (document.getElementById('searchRiwayatNilai')?.value || '').toLowerCase();
    const filterSkor = document.getElementById('filterSkorRiwayat')?.value || 'all';

    const filtered = listRiwayatArray.filter(data => {
        const matchKey = (data.judul_modul || '').toLowerCase().includes(keyword) || (data.catatan || '').toLowerCase().includes(keyword) || (data.tanggal || '').toLowerCase().includes(keyword);
        let matchSkor = true;
        if (filterSkor === 'high') matchSkor = data.skor >= 80;
        else if (filterSkor === 'medium') matchSkor = data.skor >= 60 && data.skor < 80;
        else if (filterSkor === 'low') matchSkor = data.skor < 60;
        return matchKey && matchSkor;
    });

    if (filtered.length === 0) {
        container.innerHTML = `<tr><td colspan="5" class="p-8 text-center text-gray-400">Tidak ada riwayat nilai yang sesuai filter.</td></tr>`;
        return;
    }

    filtered.forEach(data => {
        let warnaSkor = data.skor >= 80 ? 'text-green-600 bg-green-50 font-black' : (data.skor >= 60 ? 'text-yellow-600 bg-yellow-50 font-bold' : 'text-red-500 bg-red-50 font-bold');
        let jumlahSoal = data.detail_soal ? data.detail_soal.length : 10;
        const safeCatatan = (data.catatan || '').replace(/'/g, "\\'");
        
        container.innerHTML += `
            <tr class="hover:bg-gray-50 transition group border-b border-gray-100">
                <td class="p-5 text-sm text-gray-500 whitespace-nowrap">${data.tanggal}</td>
                <td class="p-5 text-sm">
                    <p class="font-bold text-gray-800">${data.judul_modul}</p>
                    ${data.catatan ? `<div class="text-xs text-gray-500 mt-1.5 flex items-center gap-1"><span class="bg-gray-100 px-2.5 py-1 rounded-lg">📝 ${data.catatan}</span></div>` : ''}
                </td>
                <td class="p-5 text-center"><span class="px-3 py-1 rounded-xl text-base ${warnaSkor}">${data.skor}</span></td>
                <td class="p-5 text-center text-sm text-gray-500">${jumlahSoal} soal</td>
                <td class="p-5 text-center">
                    <div class="flex justify-center gap-3 opacity-80 group-hover:opacity-100 transition">
                        <button onclick="bukaReview('${data.id}')" class="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition" title="Review Kuis"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>
                        <button onclick="bukaModalCatatan('${data.id}', '${safeCatatan}')" class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Catatan"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                        <button onclick="hapusNilai('${data.id}')" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Hapus"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg></button>
                    </div>
                </td>
            </tr>
        `;
    });
}

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
            
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${GEMINI_API_KEY.trim()}`, {
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
    document.getElementById('inputCatatan').value = (oldCatatan && oldCatatan !== '\${data.catatan}') ? oldCatatan : '';
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