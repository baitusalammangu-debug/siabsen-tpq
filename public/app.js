/* SiAbsen TPQ Bahrul Ulum — kode tampilan (versi 6.0, Cloudflare). */
/* ===================== STATE & UTIL ===================== */
const S = { token:null, user:null, info:{}, hariIni:'', kelas:[], jumlah:{}, santri:[], pengumuman:[], absenSaya:null, tab:'beranda', foto:{} };
const VERSI = '6.0';
const $ = q => document.querySelector(q);
const STATUS = ['Hadir','Izin','Sakit','Alpa'];
const JENIS = ["Tilawati","Al-Qur'an / Tadarus","Ghorib","Tajwid","Hafalan Surat","Doa Harian","Praktik Sholat","Menulis Arab","Catatan Umum"];
const LOGO_TPQ = '/logo-tpq.webp';
const LOGO_TILAWATI = '/logo-tilawati.webp';
document.querySelectorAll('img[data-logo]').forEach(i => i.src = LOGO_TPQ);
document.querySelectorAll('img[data-tilawati]').forEach(i => i.src = LOGO_TILAWATI);
const NILAI = ['Lancar','Cukup','Perlu Mengulang'];

function esc(v){ return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
const CEPAT = {};
const UBAH_DATA = /^(simpan|hapus|set|naik|tambah|bayar|absenGuru|ganti)/;
function lupaCepat(){ Object.keys(CEPAT).forEach(k => delete CEPAT[k]); }
function api(fn, ...args){
  return new Promise((res, rej) => {
    google.script.run
      .withSuccessHandler(r => { if (UBAH_DATA.test(fn)) lupaCepat(); res(r); })
      .withFailureHandler(err => {
        const m = String((err && err.message) || err).replace(/^Error:\s*/,'').replace(/^Exception:\s*/,'');
        if (m.indexOf('SESI_HABIS') >= 0){ keluar(true); rej(new Error('Sesi berakhir, silakan masuk lagi.')); }
        else rej(new Error(m));
      })[fn](...args);
  });
}
function simpanToken(t){ try{ t ? localStorage.setItem('tpqbu_token', t) : localStorage.removeItem('tpqbu_token'); }catch(e){} }
function ambilToken(){ try{ return localStorage.getItem('tpqbu_token'); }catch(e){ return null; } }

let toastTimer;
function toast(msg, err){
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (err ? ' err' : '');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = '', 3200);
}
function isi(html){ $('#isi').innerHTML = html; }
// Tampilkan data terakhir seketika (bila ada), lalu perbarui dari server di belakang layar
function cepat(kunci, fn, args, el, tampil){
  const wadah = $(el); if (!wadah) return;
  wadah.dataset.kunci = kunci;
  const ada = CEPAT[kunci];
  if (ada !== undefined) tampil(ada); else memuat(el);
  return api(fn, S.token, ...args).then(r => {
    const s = JSON.stringify(r), w = $(el);
    const berubah = CEPAT[kunci + '#'] !== s;
    CEPAT[kunci] = r; CEPAT[kunci + '#'] = s;
    if (berubah && w && w.dataset.kunci === kunci) tampil(r);
  }).catch(e => { const w = $(el); if (w && w.dataset.kunci === kunci){ if (ada === undefined) gagal(el, e); else toast(e.message, 1); } });
}
// Ambil data di belakang layar (tanpa menampilkan apa pun)
function ambilDulu(kunci, fn, args){
  if (CEPAT[kunci] !== undefined) return;
  api(fn, S.token, ...args).then(r => { CEPAT[kunci] = r; CEPAT[kunci + '#'] = JSON.stringify(r); }).catch(() => {});
}
function memuat(sel){ const el = typeof sel === 'string' ? $(sel) : sel; if (el) el.innerHTML = `<div class="kerangka"><i></i><i></i><i class="pendek"></i><i></i><i class="pendek"></i></div>`; }
function gagal(sel, e){ const el = $(sel); if (el) el.innerHTML = `<div class="err">${esc(e.message||e)}</div>`; }
function sibuk(btn, on, teks){ if(!btn) return; if(on){ btn.dataset.t = btn.innerHTML; btn.disabled = true; btn.innerHTML = teks || 'Menyimpan…'; } else { btn.disabled = false; btn.innerHTML = btn.dataset.t || btn.innerHTML; } }

function tglIndo(t, pendek){
  if(!t) return '';
  const d = new Date(t + 'T00:00:00');
  return d.toLocaleDateString('id-ID', pendek ? {weekday:'short', day:'numeric', month:'short'} : {weekday:'long', day:'numeric', month:'long', year:'numeric'});
}
function namaBulan(b){ const d = new Date(b + '-01T00:00:00'); return d.toLocaleDateString('id-ID', {month:'long', year:'numeric'}); }
function bulanIni(){ return S.hariIni.slice(0,7); }
function chip(st){ return `<span class="chip st-${esc(st)}">${esc(st)}</span>`; }
function inisial(n){ return String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function jilidSaya(){ return (S.jilidSaya || []).filter(k => S.kelas.indexOf(k) >= 0); }
function kelasDefault(){
  const saya = jilidSaya();
  return saya.find(k => S.jumlah[k]) || saya[0] || S.kelas.find(k => S.jumlah[k]) || S.kelas[0] || '';
}
function opsiKelas(sel, denganSemua){
  let h = denganSemua ? `<option value="">Semua jilid</option>` : '';
  if (!S.kelas.length && !denganSemua) return '<option value="">Belum ada jilid</option>';
  const opt = k => `<option value="${esc(k)}" ${k===sel?'selected':''}>${esc(k)}${S.jumlah[k] ? ' (' + S.jumlah[k] + ')' : ''}</option>`;
  const saya = S.user.peran === 'santri' ? [] : jilidSaya();
  if (!saya.length) return h + S.kelas.map(opt).join('');
  return h + `<optgroup label="Jilid yang saya ampu">${saya.map(opt).join('')}</optgroup>
    <optgroup label="Jilid lain">${S.kelas.filter(k => saya.indexOf(k) < 0).map(opt).join('')}</optgroup>`;
}
function kosong(teks){ return `<div class="kosong">${esc(teks)}</div>`; }

const IKON = {
  cek:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  beranda:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 12 3.5l8.5 7"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-5.5h4V20"/></svg>',
  absen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3.5" width="16" height="18" rx="2.5"/><path d="M9 3.5h6v3H9zM8.5 13l2.5 2.5 4.5-5"/></svg>',
  jurnal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v16H6.5A1.5 1.5 0 0 0 5 20.5z"/><path d="M5 20.5A1.5 1.5 0 0 0 6.5 22H19M9 8h6M9 12h4"/></svg>',
  grafik:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  orang:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5M16 4.8a3.3 3.3 0 0 1 0 6.4M18.5 14.8c1.6.7 2.6 2.4 3 5.2"/></svg>',
  guru:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5c.9-4 3.7-6 7-6s6.1 2 7 6"/><path d="M12 14.5l1.2 2.3-1.2 3.2-1.2-3.2z"/></svg>',
  uang:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>',
  bintang:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/><path d="M12 3.5V1.5M20.5 12h2"/></svg>',
  naik:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 20h5v-5h5v-5h5V5h3"/><path d="M15 3l3-1 1 3"/></svg>',
  berita:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h13v13a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M17 9h3v9.5a2 2 0 0 1-2 2M7.5 9h6M7.5 12.5h6M7.5 16h4"/></svg>',
  profil:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="15" rx="2.5"/><circle cx="9" cy="11" r="2.3"/><path d="M5.8 16.5c.6-1.7 1.8-2.6 3.2-2.6s2.6.9 3.2 2.6M14.5 10h4M14.5 13.5h3"/></svg>',
  kehadiran:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17M9 15l2 2 4-4"/></svg>',
  kartu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="2.5"/><circle cx="12" cy="9" r="2.6"/><path d="M8.5 15c.6-1.4 1.9-2.2 3.5-2.2s2.9.8 3.5 2.2M9 18.5h6"/></svg>',
  akun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.2 4.1-6.5 8-6.5s7 2.3 8 6.5"/></svg>',
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/></svg>',
  program:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16.5" rx="2.5"/><path d="M3 9h18M8.5 9v11.5M14 9v11.5M7.5 2.5v3M16.5 2.5v3"/></svg>',
  pin:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15 3l6 6-3 1-4 4 .5 4.5-2 2-4-4L4 21l-1-1 4.5-4.5-4-4 2-2L10 10l4-4z"/></svg>'
};
// warna khas tiap menu
const WARNA = { beranda:'#0f5132', absen:'#198754', jurnal:'#2f6fd6', perkembangan:'#c9a227', target:'#d9480f', rekap:'#7048e8',
  santri:'#0c8599', guru:'#5c940d', syahriyah:'#e8590c', kenaikan:'#ae3ec9', berita:'#1971c2', profil:'#0c8599',
  kehadiran:'#198754', akun:'#495057', kartu:'#0b7285', program:'#5f3dc4' };

/* ===================== CACHE (agar terbuka instan) ===================== */
function simpanCache(r){ try{ localStorage.setItem('tpqbu_cache', JSON.stringify({ token:S.token, r:r, t:Date.now() })); }catch(e){} }
function ambilCache(){ try{ const c = JSON.parse(localStorage.getItem('tpqbu_cache') || 'null'); return c && c.token === S.token ? c : null; }catch(e){ return null; } }
function hapusCache(){ try{ localStorage.removeItem('tpqbu_cache'); }catch(e){} }

/* ===================== LOGIN ===================== */
function tampilLogin(){
  $('#app').classList.add('hidden'); $('#login').classList.remove('hidden');
  setTimeout(() => $('#lgUser').focus(), 50);
}
/* ===================== PASANG APLIKASI (PWA) ===================== */
/* Tombol "Instal" asli browser hanya ada di halaman pembungkus (alamat .pages.dev).
   Aplikasi memberi tahu pembungkus lewat postMessage; pembungkus yang menampilkan popup. */
S.wadah = null;
function kirimKeWadah(pesan){ try { window.top.postMessage(Object.assign({ tpqbu: 1 }, pesan), '*'); } catch (e) {} }
window.addEventListener('message', e => {
  const d = e.data || {};
  if (d.tpqbu && d.jenis === 'wadah') {
    S.wadah = d;
    /* admin: simpan alamat resmi otomatis agar bisa ditawarkan saat aplikasi dibuka lewat script.google.com */
    if (S.user && S.user.peran === 'admin' && d.url && (S.info || {}).alamat_aplikasi !== d.url)
      api('simpanAlamatAplikasi', S.token, d.url).then(() => { S.info.alamat_aplikasi = d.url; }).catch(() => {});
    if (S.tab === 'akun') viewAkun();
  }
});
kirimKeWadah({ jenis: 'halo' });
function bacaLS(k){ try { return localStorage.getItem(k); } catch (e) { return null; } }
function tulisLS(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }
// dipanggil setelah login berhasil
function tawarkanPasang(){
  kirimKeWadah({ jenis: 'login', admin: !!(S.user && S.user.peran === 'admin') });
  setTimeout(() => {
    if (S.wadah) return;                                   /* pembungkus yang menangani */
    const url = (S.info || {}).alamat_aplikasi;
    const tutup = Number(bacaLS('tpqbu_pasang_tutup') || 0);
    if (!url || Date.now() - tutup < 7 * 86400000 || $('#popPasang')) return;
    const d = document.createElement('div'); d.id = 'popPasang'; d.className = 'pop-pasang';
    d.innerHTML = `<img src="${LOGO_TPQ}" alt=""><div class="pp-isi"><b>Pasang SiAbsen di HP Anda</b>
      <span>Buka lewat alamat resmi agar bisa dipasang sebagai aplikasi di layar utama.</span>
      <div class="pp-aksi"><a class="btn primer kecil" href="${esc(url)}" target="_top">Buka alamat resmi</a>
      <button class="btn kecil garis" onclick="tutupPopPasang()">Nanti saja</button></div></div>`;
    document.body.appendChild(d);
    requestAnimationFrame(() => d.classList.add('tampil'));
  }, 1800);
}
function tutupPopPasang(){ tulisLS('tpqbu_pasang_tutup', String(Date.now())); const d = $('#popPasang'); if (d) d.remove(); }
function mintaPasang(){
  if (S.wadah) { kirimKeWadah({ jenis: 'pasang' }); return; }
  const url = (S.info || {}).alamat_aplikasi;
  if (url) { window.open(url, '_top'); return; }
  toast('Buka aplikasi lewat alamat resmi TPQ (bukan script.google.com) untuk memasangnya.', 1);
}

function masukAkun(){
  const btn = $('#lgBtn'); sibuk(btn, true, 'Memeriksa…');
  api('login', $('#lgUser').value, $('#lgPass').value)
    .then(r => { S.token = r.token; simpanToken(r.token); $('#lgPass').value=''; return r.awal || api('getAwal', r.token); })
    .then(r => { mulai(r); tawarkanPasang(); })
    .catch(e => toast(e.message, 1))
    .finally(() => sibuk(btn, false));
}
function keluar(diam){
  if (S.token && !diam) api('logout', S.token).catch(()=>{});
  S.token = null; S.user = null; S.foto = {}; simpanToken(null); hapusCache();
  $('#toast').className = '';
  tampilLogin();
}
// r = hasil getAwal. dariCache = tampilan instan sebelum data terbaru tiba.
function mulai(r, dariCache){
  const pertama = !S.user || S.user.id !== r.user.id;
  Object.assign(S, { user:r.user, info:r.info||{}, hariIni:r.hariIni, pengumuman:r.pengumuman||[], kelas:r.kelas||[], jumlah:r.jumlah||{},
    santri:r.santri||[], jilidSaya:r.jilidSaya||[], pengampu:r.pengampu||{}, absenSaya:r.absenSaya||null,
    ringkas:r.ringkas||{}, santriData:r.santriData||null, segar:!dariCache });
  if (!dariCache) simpanCache(r);
  if (!dariCache && S.user.peran !== 'santri') setTimeout(() => {
    ambilDulu('santri', 'getDaftarSantri', []);
    const j = kelasDefault(); if (j) ambilDulu('target|' + j, 'getTarget', [j]);
  }, 1500);
  if (!dariCache && r.versi && r.versi !== VERSI) perbaruiKodeKlien(r.versi);
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  $('#hdNama').textContent = S.user.nama;
  $('#hdTpq').textContent = (S.info.nama_tpq || 'TPQ Bahrul Ulum') + (S.user.peran==='santri' && S.user.kelas ? ' · ' + S.user.kelas : '');
  $('#hdPeran').textContent = NAMA_PERAN[S.user.peran];
  $('#sinkron').classList.toggle('on', !!dariCache);
  $('#navBawah').innerHTML = navUtama().map(t => `<button data-t="${t}" onclick="buka('${t}')" style="--w:${WARNA[t] || 'var(--hijau)'}">
      <span class="ni">${IKON[ikonTab(t)]}</span><span class="nl">${NAMA_NAV[t] || NAMA_TAB[t]}</span></button>`).join('');
  renderNavSamping();
  if (pertama || dariCache) buka('beranda');
  else if (S.tab === 'beranda') VIEW.beranda();
  else tandaiNav(S.tab);
}

/* ===================== NAVIGASI ===================== */
const NAMA_TAB = { beranda:'Beranda', absen:'Absen Santri', jurnal:'Jurnal Mengajar', perkembangan:'Perkembangan', target:'Target Materi',
  rekap:'Rekap', santri:'Data Santri', guru:'Data Guru', syahriyah:'Syahriyah', berita:'Berita & Info', kenaikan:'Kenaikan Jilid',
  profil:'Biodata', kehadiran:'Kehadiran', akun:'Akun', menu:'Menu', kartu:'Kartu Santri', program:'Program Pembelajaran' };
const NAMA_NAV = { absen:'Absen', berita:'Berita', target:'Target', jurnal:'Jurnal', kehadiran:'Hadir', kartu:'Kartu' };
const NAMA_PERAN = { admin:'Admin', guru:'Guru', bendahara:'Bendahara', santri:'Santri' };
function ikonTab(t){ return { perkembangan:'bintang', rekap:'grafik', santri:'orang', syahriyah:'uang', kenaikan:'naik' }[t] || t; }
function daftarTab(){
  const p = S.user.peran;
  if (p === 'santri') return ['beranda','profil','kartu','kehadiran','target','perkembangan','syahriyah','berita','akun'];
  const t = ['beranda','absen','jurnal','program','perkembangan','target','rekap','santri','kartu'];
  if (p === 'admin') t.push('guru');
  if (p === 'admin' || p === 'bendahara') t.push('syahriyah');
  if (p === 'admin') t.push('kenaikan');
  t.push('berita', 'akun'); return t;
}
function navUtama(){ return S.user.peran === 'santri' ? ['beranda','kehadiran','target','berita','menu'] : ['beranda','absen','jurnal','berita','menu']; }
function tandaiNav(tab){
  const utama = navUtama(), aktif = utama.indexOf(tab) >= 0 ? tab : 'menu';
  document.querySelectorAll('#navBawah button').forEach(b => b.classList.toggle('on', b.dataset.t === aktif));
  document.querySelectorAll('#navSamping [data-t]').forEach(b => b.classList.toggle('on', b.dataset.t === tab));
}
function renderNavSamping(){
  const el = $('#navSamping'); if (!el || !S.user) return;
  el.innerHTML = `<div class="ns-kop"><img src="${LOGO_TPQ}" alt=""><div><b>${esc(S.info.nama_tpq || 'TPQ Bahrul Ulum')}</b><small>SiAbsen · Metode Tilawati</small></div></div>
    <div class="ns-daftar">${daftarTab().map(t => `<button data-t="${t}" onclick="buka('${t}')" style="--w:${WARNA[t] || 'var(--hijau)'}">
      <span class="ns-ikon">${IKON[ikonTab(t)]}</span><span>${NAMA_TAB[t]}</span></button>`).join('')}</div>
    <button class="ns-keluar" onclick="if(confirm('Keluar dari akun?'))keluar()"><span class="ns-ikon">${IKON.akun}</span><span>Keluar</span></button>
    <div class="ns-kaki">Versi ${VERSI}</div>`;
  tandaiNav(S.tab);
}
function buka(tab){
  S.tab = tab;
  tandaiNav(tab);
  window.scrollTo(0, 0);
  VIEW[tab]();
}
const VIEW = {
  beranda: () => S.user.peran === 'santri' ? berandaSantri() : berandaGuru(),
  absen: viewAbsen, jurnal: viewJurnal,
  perkembangan: () => S.user.peran === 'santri' ? perkembanganSantri() : viewPerkembangan(),
  rekap: viewRekap, berita: viewBerita, kenaikan: viewKenaikan, target: viewTarget, menu: viewMenu,
  program: () => { S.ppId = null; viewProgram(); }, kartu: viewKartu, santri: viewSantri, guru: viewGuru, syahriyah: viewSyahriyah, profil: profilSaya, kehadiran: viewKehadiran, akun: viewAkun
};
function viewMenu(){
  const list = daftarTab().filter(t => t !== 'beranda');
  isi(`<div class="judul-hal"><h2>Semua Menu</h2><p class="muted">${esc(S.info.nama_tpq || 'TPQ Bahrul Ulum')} · Metode Tilawati</p></div>
    <div class="menu-grid">${list.map(t => `<button onclick="buka('${t}')" style="--w:${WARNA[t] || 'var(--hijau)'}">
      <span class="mi">${IKON[ikonTab(t)]}</span><span>${NAMA_TAB[t]}</span></button>`).join('')}</div>`);
}

/* ===================== KOMPONEN DASHBOARD ===================== */
function salam(){ const h = new Date().getHours(); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; }
function tglHijriah(t){
  try { return new Intl.DateTimeFormat('id-ID-u-ca-islamic-umalqura', { day:'numeric', month:'long', year:'numeric' })
          .format(new Date(t + 'T12:00:00')).replace(/\s?(H|AH)$/, '') + ' H'; } catch (e) { return ''; }
}
function heroTanggal(){ const h = tglHijriah(S.hariIni); return `${tglIndo(S.hariIni)}${h ? ' · ' + esc(h) : ''}`; }
function cincin(persen, ukuran, isiTeks){
  const p = Math.max(0, Math.min(100, persen || 0));
  return `<div class="cincin" style="--p:${p};--u:${ukuran || 64}px"><span>${isiTeks !== undefined ? isiTeks : p + '%'}</span></div>`;
}
const IKON_KAT = { Berita:'berita', Pengumuman:'berita', Agenda:'kehadiran', Prestasi:'bintang', Info:'beranda' };
const WARNA_KAT = { Berita:'#1971c2', Pengumuman:'#e8590c', Agenda:'#7048e8', Prestasi:'#c9a227', Info:'#0f5132' };
function feedBerita(){
  const L = (S.pengumuman || []).slice(0, 6);
  if (!L.length) return '';
  return `<section class="seksi"><div class="seksi-kepala"><h3>Berita & Informasi</h3><button class="link-hijau" onclick="buka('berita')">Lihat semua ›</button></div>
    <div class="geser">${L.map(b => `<button class="kartu-berita" onclick="bacaBerita('${esc(b.id)}')" style="--k:${WARNA_KAT[b.kategori] || '#0f5132'}">
      <div class="kb-gambar" ${b.adaGambar ? `data-gbr="${esc(b.id)}"` : ''}>${b.adaGambar ? '' : `<span class="kb-ikon">${IKON[IKON_KAT[b.kategori] || 'berita']}</span>`}
        ${b.sematkan ? `<span class="kb-pin">${IKON.pin}</span>` : ''}</div>
      <div class="kb-isi"><span class="kb-kat">${esc(b.kategori)}</span><b>${esc(b.judul)}</b><small>${tglIndo(b.tanggal,1)}</small></div></button>`).join('')}</div></section>`;
}
function muatGambarBerita(){
  document.querySelectorAll('[data-gbr]').forEach(el => muatFoto('berita', el.dataset.gbr, el));
}
function menuCepat(list){
  return `<section class="seksi"><div class="menu-cepat">${list.map(t => `<button onclick="buka('${t}')" style="--w:${WARNA[t]}">
    <span class="mi">${IKON[ikonTab(t)]}</span><span>${NAMA_NAV[t] || NAMA_TAB[t]}</span></button>`).join('')}</div></section>`;
}

/* ===================== BERANDA GURU / ADMIN ===================== */
function berandaGuru(){
  const a = S.absenSaya, R = S.ringkas || {}, admin = S.user.peran === 'admin';
  const statusHero = a
    ? `<div class="hero-status st-${esc(a.status)}"><span class="titik"></span>${a.status === 'Hadir' ? 'Hadir · pukul ' + esc(a.jam) : esc(a.status)} <button onclick="ubahAbsenSaya()">ubah</button></div>`
    : `<div class="hero-aksi"><button class="hadir" onclick="absenSaya('Hadir',this)">${IKON.cek} Saya Hadir</button>
        <button onclick="ubahAbsenSaya()">Izin / Sakit</button></div>`;
  const stat = [
    { l:'Santri aktif', v:R.santri || 0, w:'#0c8599', t:'santri' },
    { l:'Santri hadir hari ini', v:R.santriHadir || 0, s: R.santriTercatat ? 'dari ' + R.santriTercatat + ' tercatat' : 'belum ada absen', w:'#198754', t:'rekap' },
    { l:'Guru hadir', v:(R.guruHadir || 0) + '/' + (R.guru || 0), w:'#2f6fd6', t:'rekap' }
  ];
  if (R.syahriyah) {
    const p = R.syahriyah.target ? Math.round(R.syahriyah.diterima / R.syahriyah.target * 100) : 0;
    stat.push({ l:'Syahriyah ' + namaBulan(bulanIni()).split(' ')[0], v:p + '%', s:rupiah(R.syahriyah.diterima), w:'#e8590c', t:'syahriyah' });
  }
  const saya = jilidSaya(), terabsen = R.jilidTerabsen || [];
  const cepat = ['absen','jurnal','perkembangan','target','santri','rekap'].concat(bisaSyahriyah() ? ['syahriyah'] : []).concat(admin ? ['kenaikan'] : []);
  isi(`
    <section class="hero">
      <div class="hero-pola"></div>
      <div class="hero-atas"><div><div class="hero-tgl">${heroTanggal()}</div>
        <h2>${salam()},<br>${esc(S.user.nama)}</h2></div>
        <div class="hero-avatar" id="heroFoto">${esc(inisial(S.user.nama))}</div></div>
      ${statusHero}
      <div id="formIzin"></div>
    </section>
    <section class="stat-geser">${stat.map(x => `<button class="stat-kartu" onclick="buka('${x.t}')" style="--w:${x.w}">
      <b>${esc(x.v)}</b><span>${esc(x.l)}</span>${x.s ? `<small>${esc(x.s)}</small>` : ''}</button>`).join('')}</section>
    ${saya.length ? `<section class="seksi"><div class="seksi-kepala"><h3>Jilid yang Saya Ampu</h3></div>
      <div class="geser">${saya.map((k, i) => { const ps = S.santri.filter(s => s.kelas === k && s.persen != null);
          const rata = ps.length ? Math.round(ps.reduce((n, s) => n + s.persen, 0) / ps.length) : 0; const sudah = terabsen.indexOf(k) >= 0;
          return `<div class="kartu-jilid">${cincin(rata, 54)}<div class="kj-info"><b>${esc(k)}</b><small>${S.jumlah[k] || 0} santri · target ${rata}%</small>
            <button class="btn kecil ${sudah ? '' : 'primer'}" onclick="absenJilid(${i})">${sudah ? '✓ Sudah diabsen' : 'Absen sekarang'}</button></div></div>`; }).join('')}</div></section>` : ''}
    ${menuCepat(cepat)}
    ${feedBerita()}
    ${admin ? `<section class="seksi"><div class="card"><div class="bar"><h3>Kehadiran Guru Hari Ini</h3><span class="chip">${R.guruHadir || 0}/${R.guru || 0}</span></div>
      ${(R.guruHariIni || []).length ? R.guruHariIni.map(x => `<div class="baris-guru"><div><b>${esc(x.nama)}</b><small>${x.status==='Hadir' ? 'Pukul ' + esc(x.jam) : esc(x.keterangan)}</small></div>${chip(x.status)}</div>`).join('') : kosong('Belum ada guru yang mengisi.')}
      ${(R.guruBelum || []).length ? `<p class="belum-isi"><b>Belum mengisi:</b> ${R.guruBelum.map(esc).join(', ')}</p>` : ''}</div></section>` : ''}
    ${S.segar ? '' : '<p class="sinkron-info">Menampilkan data terakhir · sedang memperbarui…</p>'}`);
  muatFoto('guru', S.user.id, '#heroFoto');
  muatGambarBerita();
}
function ubahAbsenSaya(){
  $('#formIzin').innerHTML = `<div class="form-izin">${formAbsenSaya()}</div>`;
}
function absenJilid(i){ S.abKelas = jilidSaya()[i]; S.abTgl = S.hariIni; buka('absen'); }
function formAbsenSaya(){
  return `<div class="absen-btns">
      <button class="btn st-Hadir" onclick="absenSaya('Hadir',this)">Hadir</button>
      <button class="btn st-Izin" onclick="absenSaya('Izin',this)">Izin</button>
      <button class="btn st-Sakit" onclick="absenSaya('Sakit',this)">Sakit</button>
    </div>
    <input id="ketAbsen" class="inp" placeholder="Keterangan (wajib jika izin/sakit)">`;
}
function absenSaya(st, btn){
  const k = $('#ketAbsen'), ket = k ? k.value.trim() : '';
  if (st !== 'Hadir' && !ket){ toast('Tulis keterangan untuk ' + st.toLowerCase() + '.', 1); if (k) k.focus(); return; }
  sibuk(btn, true, '…');
  api('absenGuru', S.token, st, ket)
    .then(r => {
      const sebelum = S.absenSaya; S.absenSaya = r;
      if (S.ringkas && r.status === 'Hadir' && (!sebelum || sebelum.status !== 'Hadir')) S.ringkas.guruHadir = (S.ringkas.guruHadir || 0) + 1;
      toast('Kehadiran tercatat. Jazakumullah khairan.'); berandaGuru();
    })
    .catch(e => { toast(e.message, 1); sibuk(btn, false); });
}

/* ===================== ABSEN SANTRI ===================== */
function viewAbsen(){
  isi(`<div class="card"><h3>Absensi Santri</h3>
      <div class="row">
        <label>Tanggal<input type="date" id="abTgl" class="inp" max="${S.hariIni}" value="${S.abTgl || S.hariIni}" onchange="muatAbsen()"></label>
        <label>Jilid<select id="abKelas" class="inp" onchange="muatAbsen()">${opsiKelas(S.abKelas || kelasDefault())}</select></label>
      </div><div id="abPengampu" class="muted" style="font-size:13px"></div></div>
    <div id="abList"></div>`);
  if (S.kelas.length) muatAbsen(); else $('#abList').innerHTML = `<div class="card">${kosong('Belum ada data santri. Admin perlu mengisi lembar "Santri" di Google Sheets.')}</div>`;
}
function muatAbsen(){
  S.abTgl = $('#abTgl').value || S.hariIni; S.abKelas = $('#abKelas').value;
  if (!S.abKelas) return;
  const pg = (S.pengampu || {})[S.abKelas];
  $('#abPengampu').innerHTML = pg ? 'Pengampu: <b>' + esc(pg.join(', ')) + '</b>' : '';
  S.abDiubah = false;
  cepat('absen|' + S.abKelas + '|' + S.abTgl, 'getAbsensiKelas', [S.abKelas, S.abTgl], '#abList', list => {
    if (S.abDiubah) return;                       /* jangan timpa isian yang sedang diubah guru */
    S.abData = JSON.parse(JSON.stringify(list)); S.abSudah = list.some(x => x.status); renderAbsen();
  });
}
function renderAbsen(){
  const L = S.abData;
  if (!L.length){ $('#abList').innerHTML = `<div class="card">${kosong('Tidak ada santri aktif di jilid ini.')}</div>`; return; }
  $('#abList').innerHTML = `<div class="card">
    <div class="bar"><div class="ringkas" id="abRingkas"></div><button class="btn kecil" onclick="semuaHadir()">Semua Hadir</button></div>
    ${S.abSudah ? '<p class="info">Absensi tanggal ini sudah pernah diisi. Menyimpan lagi akan memperbarui data.</p>' : ''}
    <div>${L.map((s,i) => `
      <div class="srow"><div class="atas">
        <div class="snama"><span class="no">${i+1}</span><div style="min-width:0"><b>${esc(s.nama)}</b><small>NIS ${esc(s.nis)}</small></div></div>
        <div class="seg">${STATUS.map(st => `<button class="st-${st} ${s.status===st?'on':''}" title="${st}" onclick="setSt(${i},'${st}')">${st[0]}</button>`).join('')}</div>
      </div>${(s.status==='Izin'||s.status==='Sakit') ? `<input class="inp kecil" placeholder="Keterangan ${s.status.toLowerCase()}" value="${esc(s.keterangan)}" oninput="S.abData[${i}].keterangan=this.value">` : ''}</div>`).join('')}
    </div>
    <p class="muted" style="font-size:12.5px;margin:10px 0">H = Hadir · I = Izin · S = Sakit · A = Alpa</p>
    <button class="btn primer lebar" onclick="simpanAbsen(this)">Simpan Absensi</button></div>`;
  ringkasAbsen();
}
function setSt(i, st){ S.abDiubah = true; S.abData[i].status = st; renderAbsen(); }
function semuaHadir(){ S.abDiubah = true; S.abData.forEach(s => { if (!s.status) s.status = 'Hadir'; }); renderAbsen(); toast('Santri yang belum diisi ditandai Hadir.'); }
function ringkasAbsen(){
  const c = {Hadir:0,Izin:0,Sakit:0,Alpa:0}; let belum = 0;
  S.abData.forEach(s => s.status ? c[s.status]++ : belum++);
  $('#abRingkas').innerHTML = STATUS.map(st => `<span class="chip st-${st}">${st[0]} ${c[st]}</span>`).join('') + (belum ? `<span class="chip" style="--c:#66756c">Belum ${belum}</span>` : '');
}
function simpanAbsen(btn){
  const terisi = S.abData.filter(s => s.status);
  if (!terisi.length){ toast('Belum ada santri yang ditandai.', 1); return; }
  const belum = S.abData.length - terisi.length;
  if (belum && !confirm(belum + ' santri belum diisi. Simpan yang sudah diisi saja?')) return;
  sibuk(btn, true);
  api('simpanAbsensiSantri', S.token, S.abTgl, terisi.map(s => ({nis:s.nis, status:s.status, keterangan:s.keterangan||''})))
    .then(m => { toast(m); S.abSudah = true; renderAbsen(); segarkan().catch(()=>{}); })
    .catch(e => { toast(e.message, 1); sibuk(btn, false); });
}

/* ===================== JURNAL ===================== */
function viewJurnal(){
  const admin = S.user.peran === 'admin';
  isi(`<div class="card"><h3>Tulis Jurnal Mengajar</h3>
      <div class="row">
        <label>Tanggal<input type="date" id="jTgl" class="inp" max="${S.hariIni}" value="${S.hariIni}"></label>
        <label>Jilid<select id="jKelas" class="inp">${opsiKelas(kelasDefault())}<option>Gabungan</option></select></label>
      </div>
      <label>Materi yang diajarkan<input id="jMateri" class="inp" maxlength="300" placeholder="Contoh: Tilawati jilid 2 hal. 10–12"></label>
      <label>Kegiatan pembelajaran<textarea id="jKeg" class="inp" rows="3" placeholder="Pembukaan & doa, klasikal peraga, klasikal baca buku, individual/baca simak, penutup…"></textarea></label>
      <label>Catatan / kendala<textarea id="jCat" class="inp" rows="2" placeholder="Opsional"></textarea></label>
      <button class="btn primer lebar" onclick="simpanJurnal(this)">Simpan Jurnal</button></div>
    <div class="card"><div class="bar"><h3>Riwayat Jurnal</h3><input type="month" id="jBulan" class="inp auto" value="${bulanIni()}" max="${bulanIni()}" onchange="muatJurnal()"></div>
      ${admin ? '<label class="cek"><input type="checkbox" id="jSemua" checked onchange="muatJurnal()"> Tampilkan jurnal semua guru</label>' : ''}
      <div id="jList"></div></div>`);
  muatJurnal();
}
function simpanJurnal(btn){
  const d = { tanggal:$('#jTgl').value, kelas:$('#jKelas').value, materi:$('#jMateri').value.trim(), kegiatan:$('#jKeg').value.trim(), catatan:$('#jCat').value.trim() };
  if (!d.materi){ toast('Materi wajib diisi.', 1); $('#jMateri').focus(); return; }
  sibuk(btn, true);
  api('simpanJurnal', S.token, d).then(m => {
    toast(m); ['#jMateri','#jKeg','#jCat'].forEach(q => $(q).value = ''); sibuk(btn, false); muatJurnal();
  }).catch(e => { toast(e.message, 1); sibuk(btn, false); });
}
function muatJurnal(){
  const semua = $('#jSemua') ? $('#jSemua').checked : false, bln = $('#jBulan').value || bulanIni();
  cepat('jurnal|' + bln + '|' + semua, 'getJurnal', [bln, semua], '#jList', list => {
    $('#jList').innerHTML = list.length ? list.map(j => `
      <div class="item"><div class="meta">${tglIndo(j.tanggal,1)}${j.kelas ? ' · <span class="chip">' + esc(j.kelas) + '</span>' : ''}${semua ? ' · ' + esc(j.guru) : ''}</div>
        <div class="judul">${esc(j.materi)}</div>${j.kegiatan ? `<p>${esc(j.kegiatan)}</p>` : ''}${j.catatan ? `<p class="muted"><i>Catatan: ${esc(j.catatan)}</i></p>` : ''}
        ${j.bisaHapus ? `<div class="aksi"><button class="link" onclick="hapusJurnal('${esc(j.id)}')">Hapus</button></div>` : ''}</div>`).join('')
      : kosong('Belum ada jurnal di bulan ini.');
  });
}
function hapusJurnal(id){
  if (!confirm('Hapus jurnal ini?')) return;
  api('hapusJurnal', S.token, id).then(m => { toast(m); muatJurnal(); }).catch(e => toast(e.message, 1));
}

/* ===================== PERKEMBANGAN (GURU) ===================== */
function viewPerkembangan(){
  const k = S.pkKelas !== undefined ? S.pkKelas : kelasDefault();
  isi(`<div class="card"><h3>Catat Perkembangan Santri</h3>
      <div class="row">
        <label>Jilid<select id="pkKelas" class="inp" onchange="S.pkKelas=this.value;isiSantriPk();muatPk()">${opsiKelas(k, true)}</select></label>
        <label>Santri<select id="pkNis" class="inp" onchange="muatPk()"></select></label>
      </div>
      <div class="row">
        <label>Tanggal<input type="date" id="pkTgl" class="inp" max="${S.hariIni}" value="${S.hariIni}"></label>
        <label>Jenis<select id="pkJenis" class="inp">${JENIS.map(j => `<option>${esc(j)}</option>`).join('')}</select></label>
      </div>
      <div class="row">
        <label>Capaian<input id="pkPosisi" class="inp" maxlength="150" placeholder="Jilid 3 hal. 15 / QS. An-Naba' 1–10"></label>
        <label>Penilaian<select id="pkNilai" class="inp"><option value="">—</option>${NILAI.map(n => `<option>${n}</option>`).join('')}</select></label>
      </div>
      <label>Catatan untuk wali santri<textarea id="pkCat" class="inp" rows="2" placeholder="Opsional, akan terlihat oleh santri & orang tua"></textarea></label>
      <button class="btn primer lebar" onclick="simpanPk(this)">Simpan</button></div>
    <div class="card"><h3 id="pkJudul">Riwayat</h3><div id="pkList"></div></div>`);
  isiSantriPk(); muatPk();
}
function isiSantriPk(){
  const k = $('#pkKelas').value;
  const list = S.santri.filter(s => !k || s.kelas === k);
  $('#pkNis').innerHTML = `<option value="">Semua santri</option>` + list.map(s => `<option value="${esc(s.nis)}">${esc(s.nama)}</option>`).join('');
}
function muatPk(){
  const nis = $('#pkNis').value, kelas = $('#pkKelas').value;
  const s = S.santri.find(x => x.nis === nis);
  $('#pkJudul').textContent = s ? 'Riwayat: ' + s.nama : 'Riwayat terbaru' + (kelas ? ' · ' + kelas : '');
  cepat('pk|' + nis + '|' + kelas, 'getPerkembangan', [nis ? {nis} : {kelas}], '#pkList', list => {
    $('#pkList').innerHTML = list.length ? list.map(p => itemPk(p, !nis)).join('') : kosong('Belum ada catatan perkembangan.');
  });
}
function itemPk(p, tampilNama){
  const warna = {Lancar:'var(--hadir)', Cukup:'var(--sakit)', 'Perlu Mengulang':'var(--alpa)'}[p.nilai] || 'var(--hijau)';
  const jenisChip = p.jenis === 'Kenaikan Jilid' ? `<span class="chip" style="--c:#a07c0c">🎉 ${esc(p.jenis)}</span>` : `<span class="chip">${esc(p.jenis)}</span>`;
  return `<div class="item"><div class="meta">${tglIndo(p.tanggal,1)} · ${jenisChip}${p.nilai ? ` <span class="chip" style="--c:${warna}">${esc(p.nilai)}</span>` : ''}</div>
    ${tampilNama ? `<div class="judul">${esc(p.nama)} <span class="muted" style="font-weight:500">· ${esc(p.kelas)}</span></div>` : ''}
    ${p.posisi ? `<div ${tampilNama ? '' : 'class="judul"'}>${esc(p.posisi)}</div>` : ''}
    ${p.catatan ? `<p>${esc(p.catatan)}</p>` : ''}
    <div class="meta" style="margin:4px 0 0;justify-content:space-between"><span>oleh ${esc(p.guru)}</span>${p.bisaHapus ? `<button class="link" onclick="hapusPk('${esc(p.id)}')">Hapus</button>` : ''}</div></div>`;
}
function simpanPk(btn){
  const d = { nis:$('#pkNis').value, tanggal:$('#pkTgl').value, jenis:$('#pkJenis').value, posisi:$('#pkPosisi').value.trim(), nilai:$('#pkNilai').value, catatan:$('#pkCat').value.trim() };
  if (!d.nis){ toast('Pilih santri terlebih dahulu.', 1); $('#pkNis').focus(); return; }
  if (!d.posisi && !d.catatan){ toast('Isi capaian atau catatan.', 1); return; }
  sibuk(btn, true);
  api('simpanPerkembangan', S.token, d).then(m => {
    toast(m); $('#pkPosisi').value=''; $('#pkCat').value=''; $('#pkNilai').value=''; sibuk(btn, false); muatPk();
  }).catch(e => { toast(e.message, 1); sibuk(btn, false); });
}
function hapusPk(id){
  if (!confirm('Hapus catatan ini?')) return;
  api('hapusPerkembangan', S.token, id).then(m => { toast(m); muatPk(); }).catch(e => toast(e.message, 1));
}

/* ===================== REKAP ===================== */
function viewRekap(){
  const admin = S.user.peran === 'admin';
  isi(`<div class="card no-print"><div class="row">
        <label>Bulan<input type="month" id="rkBulan" class="inp" value="${S.rkBulan || bulanIni()}" max="${bulanIni()}" onchange="muatRekap()"></label>
        <label>Jilid<select id="rkKelas" class="inp" onchange="muatRekap()">${opsiKelas(S.rkKelas !== undefined ? S.rkKelas : kelasDefault(), true)}</select></label>
      </div><button class="btn garis lebar" onclick="window.print()">Cetak / Simpan PDF</button></div>
    <div class="card"><h3 id="rkJudulS">Rekap Kehadiran Santri</h3><div id="rkSantri"></div></div>
    ${admin ? '<div class="card"><h3 id="rkJudulG">Rekap Guru</h3><div id="rkGuru"></div></div>' : ''}`);
  muatRekap();
}
function muatRekap(){
  const b = S.rkBulan = $('#rkBulan').value || bulanIni(); const k = S.rkKelas = $('#rkKelas').value;
  $('#rkJudulS').textContent = 'Kehadiran Santri · ' + namaBulan(b) + (k ? ' · ' + k : '');
  cepat('rekapS|' + b + '|' + k, 'rekapSantri', [b, k], '#rkSantri', r => {
    if (!r.data.length){ $('#rkSantri').innerHTML = kosong('Tidak ada santri.'); return; }
    $('#rkSantri').innerHTML = `<p class="muted" style="margin:-6px 0 10px;font-size:13px">${r.pertemuan} hari pertemuan tercatat${k ? '' : ' (persentase dihitung per jilid)'}</p>
      <div class="tabel-wrap"><table><thead><tr><th>Nama</th>${k ? '' : '<th>Jilid</th>'}<th>H</th><th>I</th><th>S</th><th>A</th><th>%</th></tr></thead><tbody>
      ${r.data.map(s => { const p = s.pertemuan ? Math.round(s.Hadir / s.pertemuan * 100) : 0;
        return `<tr><td>${esc(s.nama)}</td>${k ? '' : `<td>${esc(s.kelas)}</td>`}<td>${s.Hadir}</td><td>${s.Izin}</td><td>${s.Sakit}</td><td style="color:${s.Alpa?'var(--alpa)':'inherit'}">${s.Alpa}</td>
        <td class="pct" style="color:${!s.pertemuan?'var(--redup)':p>=80?'var(--hadir)':p>=60?'var(--sakit)':'var(--alpa)'}">${s.pertemuan ? p + '%' : '–'}</td></tr>`; }).join('')}
      </tbody></table></div>`;
  });
  if ($('#rkGuru')){
    $('#rkJudulG').textContent = 'Rekap Guru · ' + namaBulan(b);
    cepat('rekapG|' + b, 'rekapGuru', [b], '#rkGuru', r => {
      $('#rkGuru').innerHTML = r.rekap.length ? `<div class="tabel-wrap"><table><thead><tr><th>Nama Guru</th><th>Hadir</th><th>Izin</th><th>Sakit</th><th>Jurnal</th></tr></thead><tbody>
        ${r.rekap.map(g => `<tr><td>${esc(g.nama)}</td><td>${g.Hadir}</td><td>${g.Izin}</td><td>${g.Sakit}</td><td>${g.jurnal}</td></tr>`).join('')}</tbody></table></div>` : kosong('Belum ada data guru.');
    });
  }
}

/* ===================== KENAIKAN JILID (ADMIN) ===================== */
function viewKenaikan(){
  const dari = S.nkDari !== undefined ? S.nkDari : (S.kelas.find(k => S.jumlah[k]) || '');
  isi(`<div class="card"><h3>Kenaikan Jilid</h3>
      <div class="row">
        <label>Dari jilid<select id="nkDari" class="inp" onchange="S.nkDari=this.value;renderKenaikan()">${opsiKelas(dari)}</select></label>
        <label>Tanggal kenaikan<input type="date" id="nkTgl" class="inp" max="${S.hariIni}" value="${S.hariIni}"></label>
      </div>
      <div id="nkTujuan"></div><div id="nkList"></div></div>
    <div class="card"><div class="bar"><h3>Urutan Tingkatan</h3><button class="btn kecil" onclick="tambahJilid(this)">+ Jilid Al-Qur'an</button></div>
      <p class="muted" style="margin:-4px 0 12px;font-size:13px">Jilid Al-Qur'an berikutnya otomatis ditambahkan saat santri naik dari jilid tertinggi.</p>
      <div class="jilid-list">${S.kelas.map((k,i) => `<div><span class="jl-nama">${i+1}. ${esc(k)}${(S.pengampu||{})[k] ? `<small>${esc(S.pengampu[k].join(', '))}</small>` : ''}</span><span>${S.jumlah[k] || 0} santri</span></div>`).join('')}</div></div>`);
  renderKenaikan();
}
function renderKenaikan(){
  const dari = $('#nkDari').value, i = S.kelas.indexOf(dari);
  const list = S.santri.filter(s => s.kelas === dari);
  S.nkList = list;
  let ke = S.kelas[i + 1];
  if (!ke){ const n = Math.max(0, ...S.kelas.map(k => { const m = /al-qur'?an\s*(\d+)/i.exec(k); return m ? +m[1] : 0; })); ke = "Jilid Al-Qur'an " + (n + 1) + ' (baru)'; }
  $('#nkTujuan').innerHTML = dari ? `<div class="tujuan">Naik ke: <b>${esc(ke)}</b></div>` : '';
  $('#nkList').innerHTML = list.length ? `
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px"><label class="pilih" style="font-weight:700;border:0;flex:1"><input type="checkbox" onchange="document.querySelectorAll('.nkCek').forEach(c=>c.checked=this.checked)">Pilih semua (${list.length})</label>
      <button class="btn kecil" onclick="document.querySelectorAll('.nkCek').forEach(c=>c.checked=S.nkList[+c.value].persen===100)">Pilih yang target 100%</button></div>
    ${list.map((s,j) => `<label class="pilih"><input type="checkbox" class="nkCek" value="${j}"><span style="flex:1">${esc(s.nama)} <small class="muted">· NIS ${esc(s.nis)}</small></span>
      <span class="chip" style="--c:${s.persen === 100 ? 'var(--hadir)' : s.persen ? 'var(--sakit)' : 'var(--redup)'}">${s.persen == null ? '–' : s.persen + '%'}</span></label>`).join('')}
    <button class="btn primer lebar" style="margin-top:12px" onclick="prosesNaik(this)">Naikkan Santri Terpilih</button>`
    : kosong('Tidak ada santri di jilid ini.');
}
function prosesNaik(btn){
  const pilih = [...document.querySelectorAll('.nkCek:checked')].map(c => S.nkList[+c.value].nis);
  if (!pilih.length){ toast('Centang santri yang naik jilid.', 1); return; }
  if (!confirm(pilih.length + ' santri akan naik jilid. Lanjutkan?')) return;
  sibuk(btn, true, 'Memproses…');
  api('naikJilid', S.token, $('#nkTgl').value, pilih)
    .then(r => { toast(r.pesan); return api('getAwal', S.token); })
    .then(r => { mulai(r); buka('kenaikan'); })
    .catch(e => { toast(e.message, 1); sibuk(btn, false); });
}
function tambahJilid(btn){
  if (!confirm('Tambah satu tingkat Jilid Al-Qur\'an berikutnya?')) return;
  sibuk(btn, true, '…');
  api('tambahJilidQuran', S.token)
    .then(m => { toast(m); return api('getAwal', S.token); })
    .then(r => { Object.assign(S, { kelas:r.kelas||[], jumlah:r.jumlah||{} }); viewKenaikan(); })
    .catch(e => { toast(e.message, 1); sibuk(btn, false); });
}

/* ===================== BERITA & INFORMASI ===================== */
const KAT_BERITA = ['Berita','Pengumuman','Agenda','Prestasi','Info'];
function viewBerita(){
  const admin = S.user.peran === 'admin', f = S.brFilter || '';
  const L = (S.pengumuman || []).filter(b => !f || b.kategori === f);
  isi(`<div class="judul-hal"><div class="bar"><h2>Berita & Informasi</h2>${admin ? '<button class="btn kecil primer" onclick="formBerita()">+ Tulis</button>' : ''}</div></div>
    <div class="filter-chip">${['', ...KAT_BERITA].map(k => `<button class="${k === f ? 'on' : ''}" onclick="S.brFilter='${k}';viewBerita()">${k || 'Semua'}</button>`).join('')}</div>
    <div class="daftar-berita">${L.length ? L.map(b => `
      <button class="baris-berita" onclick="bacaBerita('${esc(b.id)}')" style="--k:${WARNA_KAT[b.kategori] || '#0f5132'}">
        <div class="bb-gambar" ${b.adaGambar ? `data-gbr="${esc(b.id)}"` : ''}>${b.adaGambar ? '' : IKON[IKON_KAT[b.kategori] || 'berita']}</div>
        <div class="bb-isi"><div class="bb-meta"><span class="kb-kat">${esc(b.kategori)}</span>${b.sematkan ? '<span class="sematan">Disematkan</span>' : ''}</div>
          <b>${esc(b.judul)}</b><p>${esc((b.isi || '').slice(0, 110))}${(b.isi || '').length > 110 ? '…' : ''}</p><small>${tglIndo(b.tanggal, 1)} · ${esc(b.oleh)}</small></div>
      </button>`).join('') : `<div class="card">${kosong('Belum ada berita di kategori ini.')}</div>`}</div>`);
  muatGambarBerita();
}
function bacaBerita(id){
  const b = (S.pengumuman || []).find(x => x.id === id);
  if (!b) return buka('berita');
  const admin = S.user.peran === 'admin';
  S.tab = 'berita'; tandaiNav('berita'); window.scrollTo(0, 0);
  isi(`<button class="btn garis kecil" onclick="buka('berita')">‹ Semua berita</button>
    <article class="card artikel" style="margin-top:12px;--k:${WARNA_KAT[b.kategori] || '#0f5132'}">
      ${b.adaGambar ? `<div class="art-gambar" data-gbr="${esc(b.id)}"></div>` : ''}
      <div class="bb-meta"><span class="kb-kat">${esc(b.kategori)}</span>${b.sematkan ? '<span class="sematan">Disematkan</span>' : ''}</div>
      <h2>${esc(b.judul)}</h2>
      <div class="muted" style="font-size:13px">${tglPanjang(b.tanggal)} · ${esc(b.oleh)}</div>
      <div class="art-isi">${esc(b.isi || '')}</div>
      ${admin ? `<div class="aksi-bawah"><button class="btn" onclick="formBerita('${esc(b.id)}')">Edit</button>
        <button class="btn bahaya" onclick="hapusBerita('${esc(b.id)}')">Hapus</button></div>` : ''}
    </article>`);
  muatGambarBerita();
}
function formBerita(id){
  const b = id ? (S.pengumuman || []).find(x => x.id === id) : { kategori:'Berita', judul:'', isi:'', sematkan:false };
  S.fotoBaru = ''; S.hapusGbr = false;
  isi(`<button class="btn garis kecil" onclick="${id ? `bacaBerita('${esc(id)}')` : "buka('berita')"}">‹ Batal</button>
    <div class="card" style="margin-top:12px"><h3>${id ? 'Edit Berita' : 'Tulis Berita & Informasi'}</h3>
      <div class="pratinjau-gambar" id="brGbr" ${b.adaGambar ? `data-gbr="${esc(b.id)}"` : ''}><span class="muted">Gambar sampul (opsional)</span></div>
      <div style="display:flex;gap:8px;margin:-4px 0 14px">
        <label class="btn kecil" style="margin:0">Pilih Gambar<input type="file" accept="image/*" hidden onchange="pilihGambarBerita(this)"></label>
        ${b.adaGambar ? `<button class="btn kecil garis" onclick="S.hapusGbr=true;S.fotoBaru='';$('#brGbr').innerHTML='<span class=muted>Gambar dihapus</span>'">Hapus gambar</button>` : ''}
      </div>
      <div class="row"><label>Kategori<select id="brKat" class="inp">${KAT_BERITA.map(k => `<option ${k === b.kategori ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <label class="cek" style="align-self:end;margin-bottom:14px"><input type="checkbox" id="brPin" ${b.sematkan ? 'checked' : ''}> Sematkan di atas</label></div>
      <label>Judul<input id="brJudul" class="inp" maxlength="150" value="${esc(b.judul)}" placeholder="Contoh: Wisuda Tilawati Angkatan 2026"></label>
      <label>Isi<textarea id="brIsi" class="inp" rows="7" placeholder="Tulis isi berita / informasi…">${esc(b.isi || '')}</textarea></label>
      <button class="btn primer lebar" onclick="simpanBerita(this, ${id ? `'${esc(id)}'` : 'null'})">${id ? 'Simpan Perubahan' : 'Terbitkan'}</button></div>`);
  muatGambarBerita();
}
function pilihGambarBerita(input){
  bacaFoto(input.files[0], 1000).then(u => { S.fotoBaru = u; S.hapusGbr = false; $('#brGbr').innerHTML = `<img src="${u}" alt="">`; })
    .catch(e => toast(e.message, 1));
}
function simpanBerita(btn, id){
  const d = { id:id || '', kategori:$('#brKat').value, judul:$('#brJudul').value.trim(), isi:$('#brIsi').value.trim(),
              sematkan:$('#brPin').checked ? 'Y' : 'N', hapusGambar:S.hapusGbr };
  if (!d.judul){ toast('Judul wajib diisi.', 1); return; }
  sibuk(btn, true);
  api('simpanPengumuman', S.token, d, S.fotoBaru || null).then(list => {
    S.pengumuman = list; S.brFilter = '';
    Object.keys(S.foto).forEach(k => { if (k.indexOf('berita|') === 0) delete S.foto[k]; });
    toast('Berita tersimpan.');
    const baru = id || (list.find(b => b.judul === d.judul) || {}).id;
    baru ? bacaBerita(baru) : buka('berita');
  }).catch(e => { toast(e.message, 1); sibuk(btn, false); });
}
function hapusBerita(id){
  if (!confirm('Hapus berita ini?')) return;
  api('hapusPengumuman', S.token, id).then(list => { S.pengumuman = list; toast('Berita dihapus.'); buka('berita'); }).catch(e => toast(e.message, 1));
}

/* ===================== TARGET MATERI & KETUNTASAN ===================== */
function kelompokKategori(list){
  const g = {}; list.forEach(t => (g[t.kategori || 'Lainnya'] = g[t.kategori || 'Lainnya'] || []).push(t)); return g;
}
function viewTarget(){
  if (S.user.peran === 'santri') return targetSaya();
  const j = S.tgJilid || kelasDefault();
  isi(`<div class="judul-hal"><h2>Target Materi</h2><p class="muted">Target pencapaian tiap jilid metode Tilawati & materi penunjang</p></div>
    <div class="card"><label style="margin:0">Jilid<select id="tgJilid" class="inp" onchange="S.tgJilid=this.value;S.tgNis='';muatTarget()">${opsiKelas(j)}</select></label></div>
    <div id="tgCek"></div><div id="tgIsi"></div>`);
  muatTarget();
}
function muatTarget(){
  const j = $('#tgJilid').value; S.tgJilid = j;
  cepat('target|' + j, 'getTarget', [j], '#tgIsi', r => {
    S.tgData = r;
    const admin = S.user.peran === 'admin', g = kelompokKategori(r.target);
    $('#tgIsi').innerHTML = `
      <div class="card"><div class="bar"><h3>Ketuntasan Santri · ${esc(j)}</h3></div>
        ${r.santri.length ? r.santri.map(s => `<button class="baris-progres" onclick="bukaCeklis('${esc(s.nis)}')">
          <span class="bp-nama">${esc(s.nama)}</span><span class="bp-bar"><i style="width:${s.persen || 0}%"></i></span><b>${s.persen == null ? '–' : s.persen + '%'}</b></button>`).join('')
          : kosong('Belum ada santri di jilid ini.')}
        ${r.santri.length ? '<p class="muted" style="font-size:12.5px;margin:10px 0 0">Ketuk nama santri untuk mencentang target yang sudah tuntas.</p>' : ''}</div>
      <div class="card"><div class="bar"><h3>Daftar Target · ${r.target.length} materi</h3>${admin ? '<button class="btn kecil primer" onclick="bukaFormTarget()">+ Target</button>' : ''}</div>
        <div id="tgForm"></div>
        ${r.target.length ? Object.keys(g).map(k => `<div class="kat-target"><h4>${esc(k)}</h4>${g[k].map(t => `
          <div class="item-target"><span class="no-target">${esc(t.urutan)}</span><div style="flex:1"><b>${esc(t.materi)}</b>${t.indikator ? `<small>${esc(t.indikator)}</small>` : ''}</div>
          ${admin ? `<button class="link-hijau" onclick="bukaFormTarget('${esc(t.id)}')">Edit</button>` : ''}</div>`).join('')}</div>`).join('')
          : kosong('Belum ada target untuk jilid ini.')}</div>`;
    if (S.tgNis && !$('#tgCek').innerHTML) bukaCeklis(S.tgNis);
  });
}
function bukaCeklis(nis){
  S.tgNis = nis;
  memuat('#tgCek'); window.scrollTo(0, 0);
  api('getKetuntasan', S.token, nis).then(renderCeklis).catch(e => gagal('#tgCek', e));
}
function renderCeklis(k){
  S.tgKet = k;
  const g = kelompokKategori(k.target);
  $('#tgCek').innerHTML = `<div class="card sorot">
    <div class="ceklis-kepala">${cincin(k.persen || 0, 64)}<div style="flex:1;min-width:0"><div class="label-kecil">Ketuntasan ${esc(k.jilid)}</div>
      <h3 style="margin:2px 0">${esc(k.nama)}</h3><small class="muted">${k.tuntas} dari ${k.jumlah} target tuntas</small></div>
      <button class="link-hijau" onclick="S.tgNis='';$('#tgCek').innerHTML=''">Tutup</button></div>
    ${Object.keys(g).map(kat => `<div class="kat-target"><h4>${esc(kat)}</h4>${g[kat].map(t => `
      <label class="ceklis ${t.tuntas ? 'on' : ''}"><input type="checkbox" ${t.tuntas ? 'checked' : ''} onchange="centang('${esc(t.id)}', this)">
        <span class="kotak">${IKON.cek}</span><span style="flex:1"><b>${esc(t.materi)}</b>${t.tuntas ? `<small>Tuntas ${tglIndo(t.tanggal, 1)} · ${esc(t.guru)}</small>` : (t.indikator ? `<small>${esc(t.indikator)}</small>` : '')}</span></label>`).join('')}</div>`).join('')}
    ${k.persen === 100 ? '<div class="tujuan">Semua target tuntas — santri siap mengikuti tes kenaikan jilid.</div>' : ''}</div>`;
}
function centang(id, el){
  const K = S.tgKet, t = K.target.find(x => x.id === id), nilai = el.checked;
  const terapkan = v => {
    t.tuntas = v; t.tanggal = v ? S.hariIni : ''; t.guru = v ? S.user.nama : '';
    K.tuntas = K.target.filter(x => x.tuntas).length;
    K.persen = K.jumlah ? Math.round(K.tuntas / K.jumlah * 100) : null;
    renderCeklis(K);
    const s = S.santri.find(x => x.nis === K.nis); if (s) s.persen = K.persen;
    const row = S.tgData && S.tgData.santri.find(x => x.nis === K.nis);
    if (row){ row.persen = K.persen;
      const btn = [...document.querySelectorAll('.baris-progres')].find(b => b.getAttribute('onclick').indexOf("'" + K.nis + "'") > 0);
      if (btn){ btn.querySelector('i').style.width = (K.persen || 0) + '%'; btn.querySelector('b').textContent = (K.persen || 0) + '%'; } }
  };
  terapkan(nilai);                                  /* tampil seketika */
  api('setKetuntasan', S.token, K.nis, id, nilai)   /* simpan di belakang layar */
    .catch(e => { toast('Gagal menyimpan: ' + e.message, 1); terapkan(!nilai); });
}
function bukaFormTarget(id){
  const t = id ? S.tgData.target.find(x => x.id === id) : { kategori:'Bacaan', materi:'', indikator:'', urutan:'' };
  const kat = ['Bacaan','Tadarus','Tajwid','Ghorib','Hafalan Surat','Doa Harian','Praktik Ibadah','Menulis'];
  $('#tgForm').innerHTML = `<div class="form-target">
    <div class="row"><label>Kategori<input id="tfKat" class="inp" list="tfKatList" value="${esc(t.kategori)}"><datalist id="tfKatList">${kat.map(k => `<option>${k}</option>`).join('')}</datalist></label>
      <label>Urutan<input id="tfUrut" class="inp" inputmode="numeric" value="${esc(t.urutan)}" placeholder="otomatis"></label></div>
    <label>Materi target<input id="tfMateri" class="inp" value="${esc(t.materi)}" placeholder="Contoh: Bacaan panjang (mad thabi'i)"></label>
    <label>Indikator / keterangan<input id="tfInd" class="inp" value="${esc(t.indikator)}" placeholder="Contoh: Dibaca 2 harakat dengan tepat"></label>
    <div style="display:flex;gap:8px">${id ? `<button class="btn bahaya" onclick="hapusTargetUI('${esc(id)}')">Hapus</button>` : ''}
      <button class="btn garis" onclick="$('#tgForm').innerHTML=''">Batal</button>
      <button class="btn primer" style="flex:1" onclick="simpanTargetUI(this, ${id ? `'${esc(id)}'` : 'null'})">Simpan</button></div></div>`;
  $('#tfMateri').focus();
}
function simpanTargetUI(btn, id){
  const d = { id:id || '', jilid:S.tgJilid, kategori:$('#tfKat').value.trim(), urutan:$('#tfUrut').value.trim(), materi:$('#tfMateri').value.trim(), indikator:$('#tfInd').value.trim() };
  if (!d.materi){ toast('Materi target wajib diisi.', 1); return; }
  sibuk(btn, true);
  api('simpanTarget', S.token, d).then(m => { toast(m); muatTarget(); }).catch(e => { toast(e.message, 1); sibuk(btn, false); });
}
function hapusTargetUI(id){
  if (!confirm('Hapus target ini? Catatan ketuntasan lama tetap tersimpan.')) return;
  api('hapusTarget', S.token, id).then(m => { toast(m); muatTarget(); }).catch(e => toast(e.message, 1));
}
function targetSaya(){
  const k = S.santriData && S.santriData.target;
  if (!k){ isi(`<div class="card">${kosong('Data target belum tersedia.')}</div>`); return; }
  const g = kelompokKategori(k.target);
  isi(`<div class="card"><div class="ceklis-kepala">${cincin(k.persen || 0, 72)}<div><div class="label-kecil">Target ${esc(k.jilid)}</div>
      <h3 style="margin:2px 0">${k.tuntas} dari ${k.jumlah} tuntas</h3><small class="muted">Dicentang oleh ustadz/ustadzah saat target tercapai</small></div></div></div>
    <div class="card">${k.target.length ? Object.keys(g).map(kat => `<div class="kat-target"><h4>${esc(kat)}</h4>${g[kat].map(t => `
      <div class="ceklis ${t.tuntas ? 'on' : ''}"><span class="kotak">${IKON.cek}</span><span style="flex:1"><b>${esc(t.materi)}</b>
        <small>${t.tuntas ? 'Tuntas ' + tglIndo(t.tanggal, 1) + ' · ' + esc(t.guru) : esc(t.indikator || 'Belum tuntas')}</small></span></div>`).join('')}</div>`).join('')
      : kosong('Belum ada target untuk jilid ini.')}</div>`);
}

/* ===================== SANTRI / WALI ===================== */
function muatDataSantri(bulan){ return api('getDataSantri', S.token, bulan || bulanIni()).then(d => (S.dataSantri = d)); }
function berandaSantri(){
  const d = S.santriData;
  if (!d){ isi(''); memuat('#isi'); return; }
  const r = d.rekap, total = r.Hadir + r.Izin + r.Sakit + r.Alpa, pct = total ? Math.round(r.Hadir / total * 100) : 0;
  const k = d.target, sy = d.syahriyah;
  const syIni = sy && sy.nominal ? sy.bulan.find(b => b.bulan === sy.bulanIni) : null;
  const berikut = k ? k.target.filter(t => !t.tuntas).slice(0, 3) : [];
  const capaian = d.perkembangan.filter(p => p.posisi).slice(0, 3);
  const catatan = d.perkembangan.filter(p => p.catatan).slice(0, 2);
  isi(`
    <section class="hero">
      <div class="hero-pola"></div>
      <div class="hero-atas"><div><div class="hero-tgl">${heroTanggal()}</div>
        <h2>Assalamu'alaikum,<br>${esc(d.profil.nama)}</h2><span class="hero-chip">${esc(d.profil.kelas)} · NIS ${esc(d.profil.nis)}</span></div>
        <div class="hero-avatar besar" id="heroFoto">${esc(inisial(d.profil.nama))}</div></div>
    </section>
    <section class="stat-geser tiga">
      <button class="stat-kartu cincin-kartu" onclick="buka('target')" style="--w:#d9480f">${cincin(k ? k.persen || 0 : 0, 56)}<span>Target ${esc(d.profil.kelas)}</span></button>
      <button class="stat-kartu cincin-kartu" onclick="buka('kehadiran')" style="--w:#198754">${cincin(pct, 56, total ? pct + '%' : '–')}<span>Kehadiran ${namaBulan(bulanIni()).split(' ')[0]}</span></button>
      ${sy ? `<button class="stat-kartu" onclick="buka('syahriyah')" style="--w:${!sy.nominal || (syIni && syIni.lunas) ? '#198754' : '#c9372c'}">
        <b>${!sy.nominal ? 'Bebas' : syIni && syIni.lunas ? 'Lunas' : 'Belum'}</b><span>Syahriyah</span><small>${sy.tunggakan ? 'tunggakan ' + rupiah(sy.tunggakan) : 'tidak ada tunggakan'}</small></button>` : ''}
    </section>
    ${berikut.length ? `<section class="seksi"><div class="card"><div class="bar"><h3>Target Berikutnya</h3><button class="link-hijau" onclick="buka('target')">Semua ›</button></div>
      ${berikut.map(t => `<div class="ceklis"><span class="kotak"></span><span style="flex:1"><b>${esc(t.materi)}</b><small>${esc(t.kategori)}${t.indikator ? ' · ' + esc(t.indikator) : ''}</small></span></div>`).join('')}</div></section>` : ''}
    ${menuCepat(['profil','kartu','kehadiran','syahriyah'])}
    ${feedBerita()}
    ${capaian.length || catatan.length ? `<section class="seksi"><div class="card"><div class="bar"><h3>Dari Ustadz/Ustadzah</h3><button class="link-hijau" onclick="buka('perkembangan')">Semua ›</button></div>
      ${capaian.map(p => `<div class="item"><div class="meta">${tglIndo(p.tanggal,1)} · <span class="chip">${esc(p.jenis)}</span>${p.nilai ? ' · ' + esc(p.nilai) : ''}</div><div class="judul">${esc(p.posisi)}</div></div>`).join('')}
      ${catatan.map(p => `<div class="item"><div class="meta">${tglIndo(p.tanggal,1)} · ${esc(p.guru)}</div><p style="margin:0">${esc(p.catatan)}</p></div>`).join('')}</div></section>` : ''}
    ${S.segar ? '' : '<p class="sinkron-info">Menampilkan data terakhir · sedang memperbarui…</p>'}`);
  muatFoto('santri', S.user.id, '#heroFoto');
  muatGambarBerita();
}
function viewKehadiran(){
  isi(`<div class="card"><div class="bar"><h3>Riwayat Kehadiran</h3><input type="month" id="khBulan" class="inp auto" value="${bulanIni()}" max="${bulanIni()}" onchange="muatKehadiran()"></div><div id="khIsi"></div></div>`);
  muatKehadiran();
}
function muatKehadiran(){
  const b = $('#khBulan').value;
  const tampil = d => {
    const r = d.rekap;
    $('#khIsi').innerHTML = `<div class="stats">${STATUS.map(st => `<div class="stat st-${st}"><b>${r[st]}</b><span>${st}</span></div>`).join('')}</div>` +
      (d.absensi.length ? d.absensi.map(a => `<div class="item" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div><b>${tglIndo(a.tanggal)}</b>${a.keterangan ? `<div class="muted" style="font-size:13px">${esc(a.keterangan)}</div>` : ''}</div>${chip(a.status)}</div>`).join('') : kosong('Belum ada catatan kehadiran di bulan ini.'));
  };
  if (b === bulanIni() && S.santriData) return tampil(S.santriData);
  memuat('#khIsi');
  muatDataSantri(b).then(tampil).catch(e => gagal('#khIsi', e));
}
function perkembanganSantri(){
  isi(`<div class="card"><h3>Perkembangan Belajar</h3><div id="psIsi"></div></div>`);
  memuat('#psIsi');
  api('getPerkembangan', S.token, {}).then(list => {
    $('#psIsi').innerHTML = list.length ? list.map(p => itemPk(p, false)).join('') : kosong('Belum ada catatan perkembangan dari guru.');
  }).catch(e => gagal('#psIsi', e));
}

/* ===================== HELPER DATA INDUK ===================== */
const STATUS_ORTU = ['Masih Hidup', 'Meninggal Dunia'];
const STATUS_WALI = ['Ayah Kandung', 'Ibu Kandung', 'Kakek/Nenek', 'Paman/Bibi', 'Saudara Kandung', 'Lainnya'];
const PENDIDIKAN = ['SD/MI', 'SMP/MTs', 'SMA/MA/SMK', 'Pondok Pesantren', 'D1/D2/D3', 'S1', 'S2', 'S3'];
const JABATAN = ['Kepala TPQ', 'Ustadz', 'Ustadzah', 'Bendahara', 'Sekretaris', 'Koordinator Jilid'];

function rupiah(n){ return 'Rp ' + Number(n || 0).toLocaleString('id-ID'); }
function tglPanjang(t){ if(!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return t || ''; return new Date(t + 'T00:00:00').toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'}); }
function bulanPendek(b){ return new Date(b + '-01T00:00:00').toLocaleDateString('id-ID', {month:'short', year:'2-digit'}); }
function jkTeks(j){ j = String(j||'').toUpperCase(); return j[0] === 'L' ? 'Laki-laki' : j[0] === 'P' ? 'Perempuan' : j; }
function umur(t){
  if(!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return '';
  const [y,m,d] = t.split('-').map(Number), [Y,M,D] = S.hariIni.split('-').map(Number);
  let th = Y - y, bl = M - m; if (D < d) bl--; if (bl < 0){ th--; bl += 12; }
  return th < 0 ? '' : th + ' th' + (bl ? ' ' + bl + ' bln' : '');
}
function lamaWaktu(t){ const u = umur(t); return u ? u.replace('th','tahun').replace('bln','bulan') : ''; }
function telp(hp){
  const n = String(hp||'').replace(/[^\d]/g,''); if(!n) return '';
  const wa = n[0] === '0' ? '62' + n.slice(1) : n;
  const url = 'https:' + '/' + '/wa.me/' + wa;
  return '<a href="' + url + '" target="_blank" rel="noopener">' + esc(hp) + ' · WhatsApp</a>';
}
function terbilang(n){
  const s = ['','satu','dua','tiga','empat','lima','enam','tujuh','delapan','sembilan','sepuluh','sebelas'];
  n = Math.floor(n);
  if (n < 12) return s[n];
  if (n < 20) return terbilang(n - 10) + ' belas';
  if (n < 100) return terbilang(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + terbilang(n % 10) : '');
  if (n < 200) return 'seratus' + (n - 100 ? ' ' + terbilang(n - 100) : '');
  if (n < 1000) return terbilang(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + terbilang(n % 100) : '');
  if (n < 2000) return 'seribu' + (n - 1000 ? ' ' + terbilang(n - 1000) : '');
  if (n < 1e6) return terbilang(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + terbilang(n % 1000) : '');
  if (n < 1e9) return terbilang(Math.floor(n / 1e6)) + ' juta' + (n % 1e6 ? ' ' + terbilang(n % 1e6) : '');
  return String(n);
}
function bisaSyahriyah(){ return S.user.peran === 'admin' || S.user.peran === 'bendahara'; }

// ---- form helper
function inp(id, label, val, o){
  o = o || {};
  return `<label>${esc(label)}<input id="f_${id}" class="inp" type="${o.type||'text'}" value="${esc(val||'')}"
    ${o.ph ? `placeholder="${esc(o.ph)}"` : ''} ${o.dis ? 'disabled' : ''} ${o.max ? `max="${o.max}"` : ''}
    ${o.mode ? `inputmode="${o.mode}"` : ''} ${o.len ? `maxlength="${o.len}"` : ''}></label>`;
}
function sel(id, label, opsi, val, o){
  o = o || {};
  const list = opsi.map(x => Array.isArray(x) ? x : [x, x]);
  if (val && !list.some(x => x[0] === val)) list.push([val, val]);
  return `<label>${esc(label)}<select id="f_${id}" class="inp" ${o.dis ? 'disabled' : ''} ${o.on ? `onchange="${o.on}"` : ''}>
    ${o.kosong !== undefined ? `<option value="">${esc(o.kosong)}</option>` : ''}
    ${list.map(x => `<option value="${esc(x[0])}" ${x[0]===val?'selected':''}>${esc(x[1])}</option>`).join('')}</select></label>`;
}
function ta(id, label, val, o){ o = o || {}; return `<label>${esc(label)}<textarea id="f_${id}" class="inp" rows="2" ${o.dis?'disabled':''}>${esc(val||'')}</textarea></label>`; }
function kumpulForm(){ const d = {}; document.querySelectorAll('[id^="f_"]').forEach(el => { if (!el.disabled) d[el.id.slice(2)] = el.value.trim(); }); return d; }

function bagian(judul, baris){
  return `<div class="bagian"><h4>${esc(judul)}</h4><dl class="bio">${baris.map(([k, v, html]) =>
    `<dt>${esc(k)}</dt><dd>${html ? (v || '<span class="muted">–</span>') : (v ? esc(v) : '<span class="muted">–</span>')}</dd>`).join('')}</dl></div>`;
}

// ---- foto
function bacaFoto(file, maks){
  return new Promise((res, rej) => {
    if (!file) return res('');
    if (String(file.type).indexOf('image' + '/') !== 0) return rej(new Error('File harus berupa gambar.'));
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = maks || 480, r = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
        const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => rej(new Error('Gambar tidak bisa dibaca. Coba foto lain (format JPG/PNG).'));
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
function pilihFoto(input, target){
  bacaFoto(input.files[0]).then(u => { S.fotoBaru = u; $(target).innerHTML = `<img src="${u}" alt="">`; })
    .catch(e => toast(e.message, 1));
}
function muatFoto(jenis, id, el){
  const k = jenis + '|' + id;
  const tampil = () => { const e = typeof el === 'string' ? $(el) : el; if (e && S.foto[k]) e.innerHTML = `<img src="${S.foto[k]}" alt="">`; };
  if (S.foto[k] !== undefined) return tampil();
  api('getFoto', S.token, jenis, id).then(u => { S.foto[k] = u || ''; tampil(); }).catch(() => {});
}
function fotoDaftar(list, jenis){
  let n = 0;
  document.querySelectorAll('[data-foto]').forEach(el => {
    const id = el.dataset.foto, x = list.find(s => (s.nis || s.username) === id);
    if (x && x.adaFoto && n++ < 40) muatFoto(jenis, id, el);
  });
}
function segarkan(){ return api('getAwal', S.token).then(r => { simpanCache(r); Object.assign(S, { kelas:r.kelas||[], jumlah:r.jumlah||{}, santri:r.santri||[], jilidSaya:r.jilidSaya||[], pengampu:r.pengampu||{}, ringkas:r.ringkas||{}, absenSaya:r.absenSaya||S.absenSaya, pengumuman:r.pengumuman||S.pengumuman }); if (S.tab === 'beranda') VIEW.beranda(); }); }
function kartuAkunBaru(){
  const a = S.akunBaru; S.akunBaru = null;
  if (!a) return '';
  return `<div class="akun-baru"><b>Akun siap dipakai.</b> Catat lalu berikan kepada ${esc(a.untuk)}:
    <div class="kredensial"><span>${esc(a.label)}</span><b>${esc(a.id)}</b><span>Password</span><b>${esc(a.pw)}</b></div>
    <small>Password akan tersembunyi setelah login pertama. Informasi ini hanya tampil sekali.</small></div>`;
}

/* ===================== DATA SANTRI ===================== */
function viewSantri(){
  const admin = S.user.peran === 'admin';
  isi(`<div class="card"><div class="bar"><h3>Data Induk Santri</h3>${admin ? '<button class="btn kecil primer" onclick="formSantri()">+ Tambah Santri</button>' : ''}</div>
      <div class="row">
        <label>Cari<input id="dsCari" class="inp" placeholder="Nama, NIS, atau wali" oninput="renderDs()" value="${esc(S.dsCari||'')}"></label>
        <label>Tingkat<select id="dsKelas" class="inp" onchange="renderDs()">${opsiKelas(S.dsKelas || '', true)}</select></label>
      </div>
      ${admin ? '<label class="cek"><input type="checkbox" id="dsNon" onchange="renderDs()"> Tampilkan juga santri nonaktif</label>' : ''}
      <div id="dsList"></div></div>`);
  cepat('santri', 'getDaftarSantri', [], '#dsList', l => { S.dsData = l; renderDs(); });
}
function renderDs(){
  const q = (S.dsCari = $('#dsCari').value).toLowerCase().trim(), k = S.dsKelas = $('#dsKelas').value;
  const non = $('#dsNon') && $('#dsNon').checked;
  const L = S.dsData.filter(s => (non || s.aktif === 'Y') && (!k || s.kelas === k) &&
    (!q || (s.nama + ' ' + s.nis + ' ' + s.nama_wali).toLowerCase().includes(q)));
  $('#dsList').innerHTML = `<p class="muted" style="font-size:13px;margin:4px 0 2px">${L.length} santri</p>` + (L.length ? L.map(s => `
    <button class="orang" onclick="detailSantri('${esc(s.nis)}')">
      <div class="avatar kecil" data-foto="${esc(s.nis)}">${esc(inisial(s.nama))}</div>
      <div class="o-info"><b>${esc(s.nama)}</b><small>NIS ${esc(s.nis)} · ${esc(s.kelas)}${s.aktif==='N' ? ' · <span style="color:var(--alpa)">Nonaktif</span>' : ''}</small>
      ${s.nama_wali ? `<small>Wali: ${esc(s.nama_wali)}</small>` : ''}</div><span class="panah">›</span></button>`).join('') : kosong('Tidak ada santri yang cocok.'));
  fotoDaftar(S.dsData, 'santri');
}
function detailSantri(nis){
  const admin = S.user.peran === 'admin', sendiri = S.user.peran === 'santri';
  isi(`${sendiri ? '' : `<button class="btn garis kecil no-print" onclick="buka('santri')">‹ Daftar santri</button>`}
    ${kartuAkunBaru()}<div id="dsDetail" style="margin-top:12px"></div>`);
  memuat('#dsDetail');
  api('getSantri', S.token, nis).then(s => {
    S.santriDetail = s;
    const u = umur(s.tanggal_lahir);
    const ttl = [s.tempat_lahir, tglPanjang(s.tanggal_lahir)].filter(Boolean).join(', ') + (u ? ` (${u})` : '');
    const syah = s.nominalSyahriyah ? rupiah(s.nominalSyahriyah) + ' / bulan' : (s.syahriyah === '0' ? 'Bebas syahriyah' : 'Belum diatur');
    $('#dsDetail').innerHTML = `<div class="card">
      <div class="kop"><div class="pasfoto" id="pfFoto">${esc(inisial(s.nama))}</div>
        <div style="min-width:0"><div class="label-kecil">Biodata Santri · ${esc(S.info.nama_tpq || 'TPQ Bahrul Ulum')}</div>
        <h2 style="font-size:19px;margin:3px 0">${esc(s.nama)}</h2><div class="muted" style="font-size:13.5px">NIS ${esc(s.nis)}</div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="chip">${esc(s.kelas)}</span>${s.aktif==='N' ? '<span class="chip st-Alpa">Nonaktif</span>' : ''}</div></div></div>
      ${bagian('Identitas Santri', [['Tanggal Masuk', tglPanjang(s.tanggal_masuk)], ['Tingkat', s.kelas], ['NIK', s.nik],
        ['Tempat, Tanggal Lahir', ttl], ['Jenis Kelamin', jkTeks(s.jk)], ['Agama', s.agama], ['Kewarga\u00ADnegaraan', s.kewarganegaraan],
        ['No Handphone', telp(s.hp), 1], ['Alamat', s.alamat]])}
      ${bagian('Orang Tua / Wali', [['Nama Ayah Kandung', s.nama_ayah], ['Status Ayah Kandung', s.status_ayah],
        ['Nama Ibu Kandung', s.nama_ibu], ['Status Ibu Kandung', s.status_ibu], ['Status Wali', s.status_wali],
        ['Nama Wali', s.nama_wali], ['No HP Wali', telp(s.hp_wali), 1]])}
      ${bagian('Administrasi', [['Syahriyah', syah]])}
      <div class="aksi-bawah no-print">
        ${admin ? `<button class="btn primer" onclick="formSantri('${esc(s.nis)}')">Edit Data</button>` : ''}
        ${!sendiri ? `<label class="btn" style="margin:0">Ganti Foto<input type="file" accept="image/*" hidden onchange="gantiFotoSantri(this,'${esc(s.nis)}')"></label>
          <button class="btn" onclick="S.tgJilid='${esc(s.kelas)}';S.tgNis='${esc(s.nis)}';buka('target')">Target</button>` : ''}
        ${bisaSyahriyah() ? `<button class="btn" onclick="riwayatSyahriyah('${esc(s.nis)}')">Syahriyah</button>` : ''}
        <button class="btn" onclick="kartuSantri('${esc(s.nis)}')">Kartu Santri</button>
        <button class="btn garis" onclick="window.print()">Cetak Biodata</button></div></div>`;
    if (s.adaFoto) muatFoto('santri', s.nis, '#pfFoto');
  }).catch(e => gagal('#dsDetail', e));
}
function gantiFotoSantri(input, nis){
  bacaFoto(input.files[0]).then(u => {
    $('#pfFoto').innerHTML = `<img src="${u}" alt=""><span class="unggah">Menyimpan…</span>`;
    return api('simpanFotoSantri', S.token, nis, u).then(m => { S.foto['santri|' + nis] = u; $('#pfFoto').innerHTML = `<img src="${u}" alt="">`; toast(m); });
  }).catch(e => { toast(e.message, 1); });
}
function formSantri(nis){
  const baru = !nis;
  const s = baru ? { kewarganegaraan:'WNI', agama:'Islam', tanggal_masuk:S.hariIni, status_ayah:'Masih Hidup', status_ibu:'Masih Hidup',
                     status_wali:'Ayah Kandung', aktif:'Y', kelas:S.dsKelas || kelasDefault() } : S.santriDetail;
  S.fotoBaru = '';
  isi(`<button class="btn garis kecil" onclick="${baru ? "buka('santri')" : `detailSantri('${esc(nis)}')`}">‹ Batal</button>
    <div class="card" style="margin-top:12px"><h3>${baru ? 'Tambah Santri Baru' : 'Edit Data Santri'}</h3>
      <div class="foto-edit"><div class="pasfoto" id="fsFoto">${baru ? 'Foto' : esc(inisial(s.nama))}</div>
        <div><label class="btn kecil" style="margin:0">Pilih / Ambil Foto<input type="file" accept="image/*" hidden onchange="pilihFoto(this,'#fsFoto')"></label>
        <p class="muted" style="font-size:12.5px;margin:6px 0 0">Foto otomatis diperkecil sebelum disimpan ke Google Drive TPQ.</p></div></div>
      <h4 class="sub-judul">Identitas Santri</h4>
      <div class="row">${inp('nis', 'NIS', s.nis, { dis:!baru, ph: baru ? 'Kosongkan = otomatis' : '' })}${inp('tanggal_masuk', 'Tanggal Masuk', s.tanggal_masuk, { type:'date' })}</div>
      ${inp('nama', 'Nama Lengkap *', s.nama)}
      <div class="row">${sel('kelas', 'Tingkat *', S.kelas, s.kelas)}${sel('kewarganegaraan', 'Kewarganegaraan', ['WNI','WNA'], s.kewarganegaraan)}</div>
      <div class="row">${inp('tempat_lahir', 'Tempat Lahir', s.tempat_lahir)}${inp('tanggal_lahir', 'Tanggal Lahir', s.tanggal_lahir, { type:'date', max:S.hariIni })}</div>
      <div class="row">${inp('nik', 'NIK (16 digit)', s.nik, { mode:'numeric', len:16 })}${sel('jk', 'Jenis Kelamin', [['L','Laki-laki'],['P','Perempuan']], (s.jk||'').toUpperCase().slice(0,1), { kosong:'— pilih —' })}</div>
      <div class="row">${sel('agama', 'Agama', ['Islam','Kristen','Katolik','Hindu','Buddha','Konghucu'], s.agama)}${inp('hp', 'No Handphone', s.hp, { type:'tel' })}</div>
      ${ta('alamat', 'Alamat', s.alamat)}
      <h4 class="sub-judul">Orang Tua / Wali</h4>
      <div class="row">${inp('nama_ayah', 'Nama Ayah Kandung', s.nama_ayah)}${sel('status_ayah', 'Status Ayah Kandung', STATUS_ORTU, s.status_ayah, { kosong:'— pilih —' })}</div>
      <div class="row">${inp('nama_ibu', 'Nama Ibu Kandung', s.nama_ibu)}${sel('status_ibu', 'Status Ibu Kandung', STATUS_ORTU, s.status_ibu, { kosong:'— pilih —' })}</div>
      <div class="row">${sel('status_wali', 'Status Wali', STATUS_WALI, s.status_wali, { kosong:'— pilih —', on:'waliOtomatis()' })}${inp('nama_wali', 'Nama Wali', s.nama_wali)}</div>
      ${inp('hp_wali', 'No HP Wali (WhatsApp)', s.hp_wali, { type:'tel' })}
      <h4 class="sub-judul">Administrasi</h4>
      <div class="row">${inp('syahriyah', 'Syahriyah per Bulan (Rp)', s.syahriyah, { mode:'numeric', ph:'Kosong = default · 0 = bebas' })}${sel('aktif', 'Status Santri', [['Y','Aktif'],['N','Nonaktif / Keluar']], s.aktif || 'Y')}</div>
      ${inp('password_baru', baru ? 'Password Awal' : 'Reset Password', '', { ph: baru ? 'Kosongkan = dibuat otomatis' : 'Kosongkan jika tidak diubah' })}
      <button class="btn primer lebar" onclick="simpanFormSantri(this, ${baru ? 'null' : `'${esc(nis)}'`})">Simpan Data Santri</button></div>`);
  if (!baru && s.adaFoto) muatFoto('santri', nis, '#fsFoto');
}
function waliOtomatis(){
  const st = $('#f_status_wali').value, w = $('#f_nama_wali');
  if (st === 'Ayah Kandung') w.value = $('#f_nama_ayah').value;
  else if (st === 'Ibu Kandung') w.value = $('#f_nama_ibu').value;
}
function simpanFormSantri(btn, nisLama){
  const d = kumpulForm();
  if (nisLama) d.nisLama = nisLama;
  if (!d.nama){ toast('Nama lengkap wajib diisi.', 1); $('#f_nama').focus(); return; }
  if (d.nik && !/^\d{16}$/.test(d.nik)){ toast('NIK harus 16 digit angka.', 1); $('#f_nik').focus(); return; }
  if (!d.nama_wali){ if (d.status_wali === 'Ayah Kandung') d.nama_wali = d.nama_ayah; else if (d.status_wali === 'Ibu Kandung') d.nama_wali = d.nama_ibu; }
  sibuk(btn, true);
  api('simpanSantri', S.token, d, S.fotoBaru || null).then(r => {
    if (S.fotoBaru) S.foto['santri|' + r.nis] = S.fotoBaru;
    if (r.passwordAwal) S.akunBaru = { untuk:'wali santri', label:'NIS', id:r.nis, pw:r.passwordAwal };
    toast('Data santri tersimpan.');
    return segarkan().then(() => detailSantri(r.nis));
  }).catch(e => { toast(e.message, 1); sibuk(btn, false); });
}

/* ===================== DATA GURU ===================== */
function viewGuru(){
  isi(`<div class="card"><div class="bar"><h3>Data Ustadz / Ustadzah</h3><button class="btn kecil primer" onclick="formGuru()">+ Tambah Guru</button></div><div id="dgList"></div></div>`);
  cepat('guru', 'getDaftarGuru', [], '#dgList', l => {
    S.dgData = l;
    $('#dgList').innerHTML = l.length ? l.map(g => `
      <button class="orang" onclick="detailGuru('${esc(g.username)}')">
        <div class="avatar kecil" data-foto="${esc(g.username)}">${esc(inisial(g.nama))}</div>
        <div class="o-info"><b>${esc(g.nama)}</b><small>${esc(g.jabatan || NAMA_PERAN[g.peran])}${g.kelas ? ' · ' + esc(g.kelas) : ''}${g.aktif==='N' ? ' · <span style="color:var(--alpa)">Nonaktif</span>' : ''}</small>
        <small>@${esc(g.username)} · ${esc(NAMA_PERAN[g.peran])}</small></div><span class="panah">›</span></button>`).join('') : kosong('Belum ada data guru.');
    fotoDaftar(l, 'guru');
  });
}
function detailGuru(un){
  const admin = S.user.peran === 'admin', sendiri = un === S.user.id;
  isi(`<button class="btn garis kecil no-print" onclick="buka('${admin && !sendiri ? 'guru' : 'akun'}')">‹ Kembali</button>
    ${kartuAkunBaru()}<div id="dgDetail" style="margin-top:12px"></div>`);
  memuat('#dgDetail');
  api('getGuru', S.token, un).then(g => {
    S.guruDetail = g;
    const u = umur(g.tanggal_lahir), lama = lamaWaktu(g.mulai_mengajar);
    $('#dgDetail').innerHTML = `<div class="card">
      <div class="kop"><div class="pasfoto" id="pgFoto">${esc(inisial(g.nama))}</div>
        <div style="min-width:0"><div class="label-kecil">Profil Ustadz/Ustadzah</div>
        <h2 style="font-size:19px;margin:3px 0">${esc(g.nama)}</h2><div class="muted" style="font-size:13.5px">${esc(g.jabatan || NAMA_PERAN[g.peran])}</div>
        <div style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"><span class="chip">${esc(NAMA_PERAN[g.peran])}</span>
        ${g.sertifikasi === 'Sudah' ? '<span class="chip" style="--c:#a07c0c">Bersertifikat Tilawati</span>' : ''}${g.aktif==='N' ? '<span class="chip st-Alpa">Nonaktif</span>' : ''}</div></div></div>
      ${bagian('Identitas', [['Username', g.username], ['NIK', g.nik], ['Jenis Kelamin', jkTeks(g.jk)],
        ['Tempat, Tanggal Lahir', [g.tempat_lahir, tglPanjang(g.tanggal_lahir)].filter(Boolean).join(', ') + (u ? ` (${u})` : '')],
        ['No Handphone', telp(g.hp), 1], ['Alamat', g.alamat], ['Pendidikan Terakhir', g.pendidikan]])}
      ${bagian('Tugas di TPQ', [['Jabatan', g.jabatan], ['Jilid Diampu', (g.kelas || '').split(',').map(x => x.trim()).filter(Boolean).join(' · ')], ['Mulai Mengajar', tglPanjang(g.mulai_mengajar) + (lama ? ` (${lama})` : '')],
        ['Sertifikat Tilawati', g.sertifikasi]])}
      <div class="aksi-bawah no-print">${admin || sendiri ? `<button class="btn primer" onclick="formGuru('${esc(g.username)}')">Edit ${sendiri && !admin ? 'Profil Saya' : 'Data'}</button>` : ''}
        <button class="btn garis" onclick="window.print()">Cetak</button></div></div>`;
    if (g.adaFoto) muatFoto('guru', g.username, '#pgFoto');
  }).catch(e => gagal('#dgDetail', e));
}
function formGuru(un){
  const baru = !un, admin = S.user.peran === 'admin', diriSendiri = un === S.user.id;
  const g = baru ? { peran:'guru', aktif:'Y', sertifikasi:'Belum', mulai_mengajar:S.hariIni } : S.guruDetail;
  /* guru biasa: hanya data pribadi */
  const kunci = !admin;
  S.fotoBaru = '';
  isi(`<button class="btn garis kecil" onclick="${baru ? "buka('guru')" : `detailGuru('${esc(un)}')`}">‹ Batal</button>
    <div class="card" style="margin-top:12px"><h3>${baru ? 'Tambah Ustadz/Ustadzah' : 'Edit Profil'}</h3>
      <div class="foto-edit"><div class="pasfoto" id="fgFoto">${baru ? 'Foto' : esc(inisial(g.nama))}</div>
        <div><label class="btn kecil" style="margin:0">Pilih / Ambil Foto<input type="file" accept="image/*" hidden onchange="pilihFoto(this,'#fgFoto')"></label></div></div>
      <h4 class="sub-judul">Identitas</h4>
      ${inp('username', 'Username (untuk login)', g.username, { dis:!baru, ph:'contoh: ust.fauzi' })}
      ${inp('nama', 'Nama Lengkap *', g.nama, { dis:kunci })}
      <div class="row">${inp('nik', 'NIK (16 digit)', g.nik, { mode:'numeric', len:16 })}${sel('jk', 'Jenis Kelamin', [['L','Laki-laki'],['P','Perempuan']], (g.jk||'').toUpperCase().slice(0,1), { kosong:'— pilih —' })}</div>
      <div class="row">${inp('tempat_lahir', 'Tempat Lahir', g.tempat_lahir)}${inp('tanggal_lahir', 'Tanggal Lahir', g.tanggal_lahir, { type:'date', max:S.hariIni })}</div>
      <div class="row">${inp('hp', 'No Handphone', g.hp, { type:'tel' })}${sel('pendidikan', 'Pendidikan Terakhir', PENDIDIKAN, g.pendidikan, { kosong:'— pilih —' })}</div>
      ${ta('alamat', 'Alamat', g.alamat)}
      <h4 class="sub-judul">Tugas di TPQ</h4>
      <div class="row">${sel('jabatan', 'Jabatan', JABATAN, g.jabatan, { kosong:'— pilih —', dis:kunci })}</div>
      <label>Jilid Diampu <small class="muted">— boleh lebih dari satu</small></label>
      <div class="pilih-jilid">${S.kelas.map(k => { const ada = String(g.kelas||'').split(',').map(x => x.trim()).indexOf(k) >= 0;
        return `<label class="${ada ? 'on' : ''}"><input type="checkbox" class="cbJilid" value="${esc(k)}" ${ada ? 'checked' : ''} ${kunci ? 'disabled' : ''}
          onchange="this.parentNode.classList.toggle('on', this.checked)">${esc(k)}</label>`; }).join('')}</div>
      <div class="row">${inp('mulai_mengajar', 'Mulai Mengajar', g.mulai_mengajar, { type:'date', max:S.hariIni, dis:kunci })}${sel('sertifikasi', 'Sertifikat Tilawati', ['Sudah','Belum'], g.sertifikasi, { dis:kunci })}</div>
      ${admin ? `<h4 class="sub-judul">Akun</h4>
        <div class="row">${sel('peran', 'Hak Akses', [['guru','Guru'],['bendahara','Bendahara (guru + syahriyah)'],['admin','Admin']], g.peran, { dis:diriSendiri })}${sel('aktif', 'Status', [['Y','Aktif'],['N','Nonaktif']], g.aktif || 'Y', { dis:diriSendiri })}</div>
        ${inp('password_baru', baru ? 'Password Awal' : 'Reset Password', '', { ph: baru ? 'Kosongkan = dibuat otomatis' : 'Kosongkan jika tidak diubah' })}` : ''}
      <button class="btn primer lebar" onclick="simpanFormGuru(this, ${baru ? 'null' : `'${esc(un)}'`})">Simpan</button></div>`);
  if (!baru && g.adaFoto) muatFoto('guru', un, '#fgFoto');
}
function simpanFormGuru(btn, unLama){
  const d = kumpulForm();
  if (unLama) d.usernameLama = unLama;
  if (S.user.peran === 'admin') d.kelas = [...document.querySelectorAll('.cbJilid:checked')].map(c => c.value);
  if (!unLama && !/^[a-z0-9._]{3,30}$/.test(d.username || '')){ toast('Username 3–30 karakter: huruf kecil, angka, titik atau garis bawah.', 1); return; }
  if (d.nama === '' ){ toast('Nama lengkap wajib diisi.', 1); return; }
  if (d.nik && !/^\d{16}$/.test(d.nik)){ toast('NIK harus 16 digit angka.', 1); return; }
  sibuk(btn, true);
  api('simpanGuru', S.token, d, S.fotoBaru || null).then(r => {
    if (S.fotoBaru) S.foto['guru|' + r.username] = S.fotoBaru;
    if (r.passwordAwal) S.akunBaru = { untuk:'ustadz/ustadzah tersebut', label:'Username', id:r.username, pw:r.passwordAwal };
    toast('Data tersimpan.'); detailGuru(r.username);
  }).catch(e => { toast(e.message, 1); sibuk(btn, false); });
}

/* ===================== SYAHRIYAH ===================== */
function viewSyahriyah(){
  if (S.user.peran === 'santri') return syahriyahSaya();
  const admin = S.user.peran === 'admin';
  isi(`<div id="syForm"></div>
    <div class="card no-print"><div class="row">
        <label>Bulan<input type="month" id="syBulan" class="inp" value="${S.syBulan || bulanIni()}" onchange="muatSyahriyah()"></label>
        <label>Tingkat<select id="syKelas" class="inp" onchange="muatSyahriyah()">${opsiKelas(S.syKelas || '', true)}</select></label>
      </div>
      <div style="display:flex;gap:8px"><button class="btn garis" style="flex:1" onclick="window.print()">Cetak Rekap</button>
      ${admin ? '<button class="btn garis" style="flex:1" onclick="aturSyahriyah()">Atur Nominal</button>' : ''}</div></div>
    <div id="syIsi"></div>`);
  muatSyahriyah();
}
function muatSyahriyah(){
  const b = S.syBulan = $('#syBulan').value || bulanIni(), k = S.syKelas = $('#syKelas').value;
  cepat('sy|' + b + '|' + k, 'getSyahriyahBulan', [b, k], '#syIsi', r => {
    S.syData = r;
    const g = r.ringkas, pct = g.target ? Math.round(g.diterima / g.target * 100) : 0;
    const peringatan = !r.nominalDefault ? `<p class="info">Nominal syahriyah default belum diatur. ${S.user.peran==='admin' ? 'Klik <b>Atur Nominal</b>.' : 'Hubungi admin.'}</p>` : '';
    $('#syIsi').innerHTML = `${peringatan}<div class="card"><h3>Syahriyah ${namaBulan(b)}${k ? ' · ' + esc(k) : ''}</h3>
      <div class="stats dua"><div class="stat" style="--c:var(--hijau)"><b class="uang">${rupiah(g.diterima)}</b><span>dari ${rupiah(g.target)}</span></div>
        <div class="stat" style="--c:var(--izin)"><b class="uang">${rupiah(g.masuk)}</b><span>uang masuk bulan ini</span></div></div>
      <div class="bar" style="margin:0 0 6px"><span class="muted" style="font-size:13px">Lunas ${g.lunas} · Belum ${g.belum}${g.bebas ? ' · Bebas ' + g.bebas : ''}</span><b>${pct}%</b></div>
      <div class="progress"><i style="width:${pct}%"></i></div>
      <div style="margin-top:12px">${r.data.length ? r.data.map(s => `
        <div class="sy-row">
          <button class="sy-nama" onclick="riwayatSyahriyah('${esc(s.nis)}')"><b>${esc(s.nama)}</b>
            <small>${esc(s.kelas)} · ${s.nominal ? rupiah(s.nominal) : 'bebas'}${s.bulanTunggak > 0 ? ` · <span style="color:var(--alpa)">nunggak ${s.bulanTunggak} bln (${rupiah(s.tunggakan)})</span>` : ''}</small></button>
          ${chipSy(s.status)}
          ${s.status === 'Belum' || s.status === 'Kurang' ? `<button class="btn kecil primer no-print" onclick="formBayar('${esc(s.nis)}')">Bayar</button>` : ''}
        </div>`).join('') : kosong('Tidak ada santri.')}</div></div>`;
  });
}
function chipSy(st){
  const c = { Lunas:'var(--hadir)', Belum:'var(--alpa)', Kurang:'var(--sakit)', Bebas:'var(--izin)' }[st] || 'var(--redup)';
  return `<span class="chip" style="--c:${c}">${esc(st === '-' ? 'Belum ditagih' : st)}</span>`;
}
function aturSyahriyah(){
  const r = S.syData || {};
  $('#syForm').innerHTML = `<div class="card"><h3>Pengaturan Syahriyah</h3>
    <div class="row"><label>Nominal default per bulan (Rp)<input id="syNom" class="inp" inputmode="numeric" value="${r.nominalDefault || ''}" placeholder="contoh: 20000"></label>
    <label>Mulai ditagih sejak bulan<input id="syMulai" type="month" class="inp" value="${esc(r.mulai || bulanIni())}"></label></div>
    <p class="muted" style="font-size:13px;margin:-2px 0 12px">Nominal khusus per santri (misal yatim = 0 atau keringanan) diatur di Data Santri &gt; Edit. Santri baru ditagih mulai bulan tanggal masuknya.</p>
    <div style="display:flex;gap:8px"><button class="btn garis" onclick="$('#syForm').innerHTML=''">Batal</button>
    <button class="btn primer" style="flex:1" onclick="simpanAturSy(this)">Simpan Pengaturan</button></div></div>`;
  window.scrollTo(0, 0);
}
function simpanAturSy(btn){
  sibuk(btn, true);
  api('simpanPengaturanSyahriyah', S.token, $('#syNom').value, $('#syMulai').value)
    .then(m => { toast(m); $('#syForm').innerHTML = ''; muatSyahriyah(); })
    .catch(e => { toast(e.message, 1); sibuk(btn, false); });
}
function formBayar(nis){
  const tempat = $('#syForm') ? '#syForm' : '#rwForm';
  memuat(tempat); window.scrollTo(0, 0);
  api('getRiwayatSyahriyah', S.token, nis).then(r => {
    const belum = r.bulan.find(b => !b.lunas);
    const mulai = belum ? belum.bulan : (r.bulan.length ? tambahBln(r.bulan[r.bulan.length - 1].bulan, 1) : bulanIni());
    S.bayar = { nis, nominal:r.nominal, nama:r.nama };
    $(tempat).innerHTML = `<div class="card sorot"><h3>Bayar Syahriyah · ${esc(r.nama)}</h3>
      <p class="muted" style="margin:-6px 0 12px;font-size:13.5px">${esc(r.kelas)} · ${rupiah(r.nominal)}/bulan${r.bulanTunggak ? ` · tunggakan ${r.bulanTunggak} bulan (${rupiah(r.tunggakan)})` : ' · tidak ada tunggakan'}</p>
      <div class="row"><label>Mulai bulan<input type="month" id="byMulai" class="inp" value="${mulai}" onchange="hitungBayar()"></label>
        <label>Jumlah bulan<select id="byJumlah" class="inp" onchange="hitungBayar()">${[1,2,3,4,5,6,12].map(n => `<option value="${n}" ${n === Math.max(1, Math.min(r.bulanTunggak, 12)) ? 'selected' : ''}>${n} bulan</option>`).join('')}</select></label></div>
      <div class="row"><label>Tanggal bayar<input type="date" id="byTgl" class="inp" max="${S.hariIni}" value="${S.hariIni}"></label>
        <label>Metode<select id="byMetode" class="inp"><option>Tunai</option><option>Transfer</option><option>QRIS</option></select></label></div>
      <label id="byNomWrap">Jumlah dibayar (Rp) <small class="muted">— isi jika membayar sebagian</small><input id="byNom" class="inp" inputmode="numeric" placeholder="${r.nominal}"></label>
      <label>Keterangan<input id="byKet" class="inp" placeholder="Opsional"></label>
      <div class="tujuan" id="byTotal"></div>
      <div style="display:flex;gap:8px"><button class="btn garis" onclick="$('${tempat}').innerHTML=''">Batal</button>
      <button class="btn primer" style="flex:1" onclick="simpanBayar(this)">Simpan Pembayaran</button></div></div>`;
    hitungBayar();
  }).catch(e => gagal(tempat, e));
}
function tambahBln(b, n){ const d = new Date(b + '-01T00:00:00'); d.setMonth(d.getMonth() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function hitungBayar(){
  const j = +$('#byJumlah').value, m = $('#byMulai').value;
  $('#byNomWrap').style.display = j === 1 ? '' : 'none';
  $('#byTotal').innerHTML = `${j} bulan: <b>${namaBulan(m)}${j > 1 ? ' – ' + namaBulan(tambahBln(m, j - 1)) : ''}</b><br>Perkiraan total: <b>${rupiah(S.bayar.nominal * j)}</b> <small>(bulan yang sudah lunas dilewati)</small>`;
}
function simpanBayar(btn){
  const d = { nis:S.bayar.nis, bulanMulai:$('#byMulai').value, jumlahBulan:$('#byJumlah').value, tanggal:$('#byTgl').value,
              metode:$('#byMetode').value, keterangan:$('#byKet').value, nominal:$('#byNom').value };
  sibuk(btn, true);
  api('bayarSyahriyah', S.token, d).then(r => {
    toast(r.pesan);
    const tempat = $('#syForm') ? '#syForm' : '#rwForm';
    $(tempat).innerHTML = htmlKuitansi(r.kuitansi);
    if ($('#syIsi')) muatSyahriyah(); else if ($('#rwIsi')) muatRiwayat(S.bayar.nis, true);
  }).catch(e => { toast(e.message, 1); sibuk(btn, false); });
}
function htmlKuitansi(k){
  return `<div id="kuitansi" class="card kuitansi">
    <div class="k-kop"><img src="${LOGO_TPQ}" alt=""><div><b>${esc((S.info.nama_tpq || 'TPQ Bahrul Ulum').toUpperCase())}</b><small>${esc(S.info.alamat || 'Kapi, Kunjang, Kediri')} · Metode Tilawati</small></div></div>
    <h3 class="k-judul">KUITANSI PEMBAYARAN SYAHRIYAH</h3>
    <dl class="bio"><dt>No.</dt><dd>${esc(k.no)}</dd><dt>Tanggal</dt><dd>${tglPanjang(k.tanggal)}</dd>
      <dt>Nama Santri</dt><dd>${esc(k.nama)}</dd><dt>NIS / Tingkat</dt><dd>${esc(k.nis)} · ${esc(k.kelas)}</dd></dl>
    <table style="margin-top:10px"><thead><tr><th>Syahriyah Bulan</th><th style="text-align:right">Nominal</th></tr></thead><tbody>
      ${k.rincian.map(x => `<tr><td>${namaBulan(x.bulan)}</td><td style="text-align:right" class="uang">${rupiah(x.nominal)}</td></tr>`).join('')}
      <tr><td><b>TOTAL</b></td><td style="text-align:right"><b class="uang">${rupiah(k.total)}</b></td></tr></tbody></table>
    <p class="k-terbilang">Terbilang: <i>${esc(terbilang(k.total).replace(/^./, c => c.toUpperCase()))} rupiah</i></p>
    <div class="k-ttd"><div class="muted">Dibayar ${esc(k.metode)}${k.keterangan ? ' · ' + esc(k.keterangan) : ''}</div>
      <div style="text-align:center">Penerima,<br><br><br><b>${esc(k.penerima)}</b></div></div>
    <div class="aksi-bawah no-print"><button class="btn garis" onclick="this.closest('.kuitansi').remove()">Tutup</button>
      <button class="btn primer" style="flex:1" onclick="cetakKuitansi()">Cetak Kuitansi</button></div></div>`;
}
function cetakKuitansi(){ document.body.classList.add('ck'); window.print(); setTimeout(() => document.body.classList.remove('ck'), 800); }
function riwayatSyahriyah(nis){
  const staf = S.user.peran !== 'santri';
  isi(`${staf ? `<button class="btn garis kecil no-print" onclick="buka('syahriyah')">‹ Rekap syahriyah</button>` : ''}
    <div id="rwForm" style="margin-top:12px"></div><div id="rwIsi"></div>`);
  muatRiwayat(nis);
}
function syahriyahSaya(){ isi(`<div id="rwForm"></div><div id="rwIsi"></div>`); muatRiwayat(S.user.id); }
function muatRiwayat(nis, diam){
  if (!diam) memuat('#rwIsi');
  api('getRiwayatSyahriyah', S.token, nis).then(r => {
    const staf = S.user.peran !== 'santri', admin = S.user.peran === 'admin';
    $('#rwIsi').innerHTML = `<div class="card"><div class="bar"><h3>Syahriyah · ${esc(r.nama)}</h3>
        ${staf && r.nominal ? `<button class="btn kecil primer no-print" onclick="formBayar('${esc(r.nis)}')">Bayar</button>` : ''}</div>
      <p class="muted" style="margin:-6px 0 12px;font-size:13.5px">${esc(r.kelas)} · ${r.nominal ? rupiah(r.nominal) + ' per bulan' : 'Bebas syahriyah'}</p>
      ${r.nominal ? `<div class="stats dua"><div class="stat" style="--c:${r.tunggakan ? 'var(--alpa)' : 'var(--hadir)'}"><b class="uang">${r.tunggakan ? rupiah(r.tunggakan) : 'Lunas'}</b><span>${r.tunggakan ? 'tunggakan ' + r.bulanTunggak + ' bulan' : 'tidak ada tunggakan'}</span></div>
        <div class="stat" style="--c:var(--hijau)"><b class="uang">${rupiah(r.pembayaran.reduce((a, p) => a + p.nominal, 0))}</b><span>total dibayar</span></div></div>
      <div class="bulan-grid">${r.bulan.map(b => `<div style="--c:${b.lunas ? 'var(--hadir)' : b.dibayar ? 'var(--sakit)' : 'var(--alpa)'}">${bulanPendek(b.bulan)}<span>${b.lunas ? 'Lunas' : b.dibayar ? 'Kurang' : 'Belum'}</span></div>`).join('')}</div>` : ''}
      </div>
      <div class="card"><h3>Riwayat Pembayaran</h3>${r.pembayaran.length ? r.pembayaran.map(p => `
        <div class="item" style="display:flex;justify-content:space-between;gap:10px;align-items:center">
          <div><b>${namaBulan(p.bulan)}</b><div class="muted" style="font-size:12.5px">Dibayar ${tglIndo(p.tanggal,1)} · ${esc(p.metode)} · ${esc(p.penerima)}${p.keterangan ? ' · ' + esc(p.keterangan) : ''}</div></div>
          <div style="text-align:right"><b class="uang">${rupiah(p.nominal)}</b>${admin ? `<br><button class="link no-print" onclick="hapusBayar('${esc(p.id)}','${esc(r.nis)}')">Hapus</button>` : ''}</div></div>`).join('') : kosong('Belum ada pembayaran.')}</div>`;
  }).catch(e => gagal('#rwIsi', e));
}
function hapusBayar(id, nis){
  if (!confirm('Hapus catatan pembayaran ini? Gunakan hanya untuk koreksi salah input.')) return;
  api('hapusSyahriyah', S.token, id).then(m => { toast(m); muatRiwayat(nis); }).catch(e => toast(e.message, 1));
}
function profilSaya(){ detailSantri(S.user.id); }

/* ===================== KARTU SANTRI ===================== */
/* Ukuran kartu ID-1 / CR80 (kartu ATM & kartu pelajar): 54 x 85,6 mm (potret), digambar pada 300 dpi. */
const KARTU = { dpi: 300, wmm: 54, hmm: 85.6 };
function mmPx(x){ return Math.round(x * KARTU.dpi / 25.4); }
const KW = mmPx(KARTU.wmm), KH = mmPx(KARTU.hmm);
const FONT_K = '"Plus Jakarta Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/* ---------- QR code (mode byte UTF-8, koreksi galat M/Q, versi 1–40) ---------- */
const QR_EC = {   /* [jumlah codeword ECC per blok, jumlah blok] per versi, indeks 0 tidak dipakai */
  L: { ecc: [-1,7,10,15,20,26,18,20,24,30,18,20,24,26,30,22,24,28,30,28,28,28,28,30,30,26,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
       blk: [-1,1,1,1,1,1,2,2,2,2,4,4,4,4,4,6,6,6,6,7,8,8,9,9,10,12,12,12,13,14,15,16,17,18,19,19,20,21,22,24,25], fmt: 1 },
  M: { ecc: [-1,10,16,26,18,24,16,18,22,22,26,30,22,22,24,24,28,28,26,26,26,26,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28,28],
       blk: [-1,1,1,1,2,2,4,4,4,5,5,5,8,9,9,10,10,11,13,14,16,17,17,18,20,21,23,25,26,28,29,31,33,35,37,38,40,43,45,47,49], fmt: 0 },
  Q: { ecc: [-1,13,22,18,26,18,24,18,22,20,24,28,26,24,20,30,24,28,28,26,30,28,30,30,30,30,28,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
       blk: [-1,1,1,2,2,4,4,6,6,8,8,8,10,12,16,12,17,16,18,21,20,23,23,25,27,29,34,34,35,38,40,43,45,48,51,53,56,59,62,65,68], fmt: 3 },
  H: { ecc: [-1,17,28,22,16,22,28,26,26,24,28,24,28,22,24,24,30,28,28,26,28,30,24,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30,30],
       blk: [-1,1,1,2,4,4,4,5,6,8,8,11,11,16,16,18,16,19,21,25,25,25,34,30,32,35,37,40,42,45,48,51,54,57,60,63,66,70,74,77,81], fmt: 2 }
};
function qrRawModul(v){ let r = (16 * v + 128) * v + 64; if (v >= 2) { const n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; }
function qrDataCw(v, e){ return Math.floor(qrRawModul(v) / 8) - QR_EC[e].ecc[v] * QR_EC[e].blk[v]; }
function gfKali(x, y){ let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; }
function rsPembagi(d){ const r = new Array(d).fill(0); r[d - 1] = 1; let akar = 1;
  for (let i = 0; i < d; i++) { for (let j = 0; j < d; j++) { r[j] = gfKali(r[j], akar); if (j + 1 < d) r[j] ^= r[j + 1]; } akar = gfKali(akar, 2); } return r; }
function rsSisa(data, pembagi){ const r = new Array(pembagi.length).fill(0);
  data.forEach(b => { const f = b ^ r.shift(); r.push(0); pembagi.forEach((c, i) => { r[i] ^= gfKali(c, f); }); }); return r; }
function qrBuat(teks, ecl){
  ecl = ecl || 'M';
  const byte = Array.from(new TextEncoder().encode(String(teks)));
  let v = 1;
  for (; v <= 40; v++) if (4 + (v <= 9 ? 8 : 16) + byte.length * 8 <= qrDataCw(v, ecl) * 8) break;
  if (v > 40) throw new Error('Isi QR terlalu panjang');
  const bit = [], tambah = (x, n) => { for (let i = n - 1; i >= 0; i--) bit.push((x >>> i) & 1); };
  tambah(4, 4); tambah(byte.length, v <= 9 ? 8 : 16); byte.forEach(b => tambah(b, 8));
  const kap = qrDataCw(v, ecl) * 8;
  tambah(0, Math.min(4, kap - bit.length)); tambah(0, (8 - bit.length % 8) % 8);
  for (let p = 0xEC; bit.length < kap; p ^= 0xEC ^ 0x11) tambah(p, 8);
  const data = []; for (let i = 0; i < bit.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) b = (b << 1) | bit[i + j]; data.push(b); }
  // ECC & interleave
  const nBlok = QR_EC[ecl].blk[v], eLen = QR_EC[ecl].ecc[v], raw = Math.floor(qrRawModul(v) / 8);
  const nPendek = nBlok - raw % nBlok, pLen = Math.floor(raw / nBlok), pemb = rsPembagi(eLen), blok = [];
  for (let i = 0, k = 0; i < nBlok; i++) {
    const d = data.slice(k, k + pLen - eLen + (i < nPendek ? 0 : 1)); k += d.length;
    const e = rsSisa(d, pemb); if (i < nPendek) d.push(0); blok.push(d.concat(e));
  }
  const cw = [];
  for (let i = 0; i < blok[0].length; i++) blok.forEach((b, j) => { if (i !== pLen - eLen || j >= nPendek) cw.push(b[i]); });
  // matriks
  const n = v * 4 + 17, M = [], F = [];
  for (let y = 0; y < n; y++) { M.push(new Array(n).fill(false)); F.push(new Array(n).fill(false)); }
  const set = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
  for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const finder = (x, y) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy;
    if (xx >= 0 && xx < n && yy >= 0 && yy < n) set(xx, yy, d !== 2 && d !== 4); } };
  finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
  if (v > 1) {
    const na = Math.floor(v / 7) + 2, step = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2, pos = [6];
    for (let p = n - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
    pos.forEach((a, i) => pos.forEach((b, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
  }
  const format = mask => {
    const d = QR_EC[ecl].fmt << 3 | mask; let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const b = (d << 10 | r) ^ 0x5412, g = i => ((b >>> i) & 1) === 1;
    for (let i = 0; i <= 5; i++) set(8, i, g(i)); set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
    for (let i = 0; i < 8; i++) set(n - 1 - i, 8, g(i)); for (let i = 8; i < 15; i++) set(8, n - 15 + i, g(i));
    set(8, n - 8, true);
  };
  format(0);
  if (v >= 7) { let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); const b = v << 12 | r;
    for (let i = 0; i < 18; i++) { const d = ((b >>> i) & 1) === 1, a = n - 11 + i % 3, c = Math.floor(i / 3); set(a, c, d); set(c, a, d); } }
  // tempatkan data
  let i = 0;
  for (let kanan = n - 1; kanan >= 1; kanan -= 2) {
    if (kanan === 6) kanan = 5;
    for (let t = 0; t < n; t++) for (let j = 0; j < 2; j++) {
      const x = kanan - j, naik = ((kanan + 1) & 2) === 0, y = naik ? n - 1 - t : t;
      if (!F[y][x] && i < cw.length * 8) { M[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
    }
  }
  const pola = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
    (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];
  const masker = m => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!F[y][x] && pola[m](x, y)) M[y][x] = !M[y][x]; };
  const penalti = () => {
    let p = 0, gelap = 0;
    for (let y = 0; y < n; y++) for (let a = 0; a < 2; a++) {      /* baris & kolom beruntun */
      let run = 1;
      for (let x = 1; x <= n; x++) {
        const s = x < n && (a ? M[x][y] === M[x - 1][y] : M[y][x] === M[y][x - 1]);
        if (s) run++; else { if (run >= 5) p += run - 2; run = 1; }
      }
    }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (M[y][x]) gelap++;
    p += Math.floor(Math.abs(gelap * 20 - n * n * 10) / (n * n)) * 10;
    return p;
  };
  let terbaik = 0, pMin = Infinity;
  for (let m = 0; m < 8; m++) { masker(m); format(m); const p = penalti(); if (p < pMin) { pMin = p; terbaik = m; } masker(m); }
  masker(terbaik); format(terbaik);
  return { ukuran: n, versi: v, modul: M };
}
function isiQr(s, info){
  /* QR code hanya berisi NIS agar mudah dibaca alat pemindai absensi */
  return String(s.nis || '').trim();
}

/* ---------- alat gambar ---------- */
function muatGambar(src){
  return new Promise(res => { if (!src) return res(null); const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}
function kotakBulat(c, x, y, w, h, r){ c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function pasFont(c, teks, berat, ukuran, min, lebar){ let u = ukuran; do { c.font = berat + ' ' + u + 'px ' + FONT_K; if (c.measureText(teks).width <= lebar) break; u -= 1; } while (u > min); return u; }
function bungkusTeks(c, teks, lebar){
  const kata = String(teks || '').split(/\s+/).filter(Boolean), baris = []; let b = '';
  kata.forEach(k => { const coba = b ? b + ' ' + k : k; if (c.measureText(coba).width <= lebar || !b) b = coba; else { baris.push(b); b = k; } });
  if (b) baris.push(b); return baris;
}
function polaBintang(c, x0, y0, w, h, warna, alpha, jarak){
  c.save(); c.beginPath(); c.rect(x0, y0, w, h); c.clip(); c.globalAlpha = alpha; c.strokeStyle = warna; c.lineWidth = mmPx(0.18);
  const s = jarak / 2;
  for (let y = y0 - jarak; y < y0 + h + jarak; y += jarak) for (let x = x0 - jarak; x < x0 + w + jarak; x += jarak) {
    c.beginPath(); c.moveTo(x, y - s * .8); c.lineTo(x + s * .22, y - s * .22); c.lineTo(x + s * .8, y); c.lineTo(x + s * .22, y + s * .22);
    c.lineTo(x, y + s * .8); c.lineTo(x - s * .22, y + s * .22); c.lineTo(x - s * .8, y); c.lineTo(x - s * .22, y - s * .22); c.closePath(); c.stroke();
  }
  c.restore();
}
function gambarCover(c, im, x, y, w, h){
  const r = Math.max(w / im.width, h / im.height), sw = w / r, sh = h / r;
  c.drawImage(im, (im.width - sw) / 2, (im.height - sh) / 2.6, sw, sh, x, y, w, h);
}
function kanvasKartu(){ const cv = document.createElement('canvas'); cv.width = KW; cv.height = KH; return cv; }
function kepalaKartu(c, logo, tinggi, info, kecil){
  const g = c.createLinearGradient(0, 0, KW, tinggi); g.addColorStop(0, '#0b4429'); g.addColorStop(1, '#1a7a4c');
  c.fillStyle = g; c.fillRect(0, 0, KW, tinggi);
  polaBintang(c, 0, 0, KW, tinggi, '#ffffff', .10, mmPx(7));
  c.fillStyle = '#c9a227'; c.fillRect(0, tinggi - mmPx(0.7), KW, mmPx(0.7));
  const d = kecil ? mmPx(8.5) : mmPx(12), lx = mmPx(3.2), ly = (tinggi - mmPx(0.7) - d) / 2;
  c.save(); c.beginPath(); c.arc(lx + d / 2, ly + d / 2, d / 2 + mmPx(0.5), 0, Math.PI * 2); c.fillStyle = '#c9a227'; c.fill();
  c.beginPath(); c.arc(lx + d / 2, ly + d / 2, d / 2, 0, Math.PI * 2); c.fillStyle = '#fff'; c.fill();
  if (logo) { const p = d * .1; c.drawImage(logo, lx + p, ly + p, d - 2 * p, d - 2 * p); }
  c.restore();
  const tx = lx + d + mmPx(2.4), tw = KW - tx - mmPx(2.5);
  c.textBaseline = 'alphabetic'; c.textAlign = 'left';
  if (kecil) {
    c.fillStyle = '#fff'; pasFont(c, (info.nama_tpq || 'TPQ Bahrul Ulum').toUpperCase(), '800', mmPx(3), mmPx(2), tw);
    c.fillText((info.nama_tpq || 'TPQ Bahrul Ulum').toUpperCase(), tx, ly + d * .52);
    c.fillStyle = '#f3dc8a'; pasFont(c, 'KARTU SANTRI · METODE TILAWATI', '700', mmPx(2), mmPx(1.5), tw); c.fillText('KARTU SANTRI · METODE TILAWATI', tx, ly + d * .9);
  } else {
    c.fillStyle = '#f3dc8a'; c.font = '800 ' + mmPx(2.1) + 'px ' + FONT_K; c.fillText('KARTU SANTRI', tx, ly + d * .3);
    c.fillStyle = '#fff'; pasFont(c, (info.nama_tpq || 'TPQ Bahrul Ulum').toUpperCase(), '800', mmPx(3.5), mmPx(2.2), tw);
    c.fillText((info.nama_tpq || 'TPQ Bahrul Ulum').toUpperCase(), tx, ly + d * .66);
    c.fillStyle = '#cfe8d9'; pasFont(c, info.alamat || 'Kapi, Kunjang, Kediri', '600', mmPx(2), mmPx(1.6), tw);
    c.fillText(info.alamat || 'Kapi, Kunjang, Kediri', tx, ly + d * .95);
  }
}
function kakiKartu(c, teks){
  const h = mmPx(3.4), y = KH - h;
  c.fillStyle = '#0f5132'; c.fillRect(0, y, KW, h); c.fillStyle = '#c9a227'; c.fillRect(0, y, KW, mmPx(0.5));
  c.fillStyle = '#e3f1e9'; c.textAlign = 'center'; pasFont(c, teks, '600', mmPx(1.8), mmPx(1.4), KW - mmPx(4));
  c.fillText(teks, KW / 2, y + h * .68); c.textAlign = 'left';
}

/* ---------- sisi DEPAN ---------- */
async function gambarDepan(s, info, aset){
  const cv = kanvasKartu(), c = cv.getContext('2d');
  c.fillStyle = '#fbf8f0'; c.fillRect(0, 0, KW, KH);
  polaBintang(c, 0, 0, KW, KH, '#c9a227', .09, mmPx(9));
  const hH = mmPx(19.5);
  kepalaKartu(c, aset.logo, hH, info, false);
  /* panel bawah (mm): jilid, NIS, jenis kelamin di kiri; QR code di kanan */
  const P = { x: 3.2, y: 60.6, w: 47.6, h: 20.4 };
  const lebarNama = KW - mmPx(6), nama = String(s.nama || '').trim();
  let barisNama = [nama], uNama = pasFont(c, nama, '800', mmPx(3.9), mmPx(2.9), lebarNama);
  c.font = '800 ' + uNama + 'px ' + FONT_K;
  if (c.measureText(nama).width > lebarNama) { uNama = mmPx(2.9); c.font = '800 ' + uNama + 'px ' + FONT_K; barisNama = bungkusTeks(c, nama, lebarNama).slice(0, 2); }
  const dua = barisNama.length > 1, namaBawah = 57.8, namaAtas = dua ? 54.4 : 57.8;
  // foto 3:4
  const fy = hH + mmPx(2.6), fh = mmPx(namaAtas - 3.9) - fy, fw = Math.round(fh * .75), fx = (KW - fw) / 2, r = mmPx(2.2);
  c.save(); c.shadowColor = 'rgba(15,81,50,.25)'; c.shadowBlur = mmPx(1.6); c.shadowOffsetY = mmPx(0.5);
  kotakBulat(c, fx - mmPx(0.8), fy - mmPx(0.8), fw + mmPx(1.6), fh + mmPx(1.6), r + mmPx(0.6)); c.fillStyle = '#c9a227'; c.fill(); c.restore();
  c.save(); kotakBulat(c, fx, fy, fw, fh, r); c.clip();
  if (aset.foto) gambarCover(c, aset.foto, fx, fy, fw, fh);
  else {
    c.fillStyle = '#e7f3ec'; c.fillRect(fx, fy, fw, fh); c.fillStyle = '#9cc9b0';
    c.beginPath(); c.arc(fx + fw / 2, fy + fh * .38, fw * .2, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.ellipse(fx + fw / 2, fy + fh * .95, fw * .38, fh * .3, 0, Math.PI, 0); c.fill();
  }
  c.restore();
  c.fillStyle = '#12301f'; c.textAlign = 'center'; c.font = '800 ' + uNama + 'px ' + FONT_K;
  barisNama.forEach((t, i) => c.fillText(t, KW / 2, mmPx(dua ? namaAtas + i * 3.4 : namaBawah)));
  c.textAlign = 'left';
  // panel putih
  c.save(); c.shadowColor = 'rgba(15,81,50,.12)'; c.shadowBlur = mmPx(1); c.shadowOffsetY = mmPx(0.3);
  kotakBulat(c, mmPx(P.x), mmPx(P.y), mmPx(P.w), mmPx(P.h), mmPx(1.8)); c.fillStyle = '#fff'; c.fill(); c.restore();
  c.strokeStyle = '#e8dfc4'; c.lineWidth = mmPx(0.2); kotakBulat(c, mmPx(P.x), mmPx(P.y), mmPx(P.w), mmPx(P.h), mmPx(1.8)); c.stroke();
  // QR code: modul bilangan bulat piksel agar tajam; tepi putih panel menjadi zona tenang
  const qr = qrBuat(isiQr(s, info) || '-', 'Q'), ruang = mmPx(P.h - 2.6);
  const m = Math.max(2, Math.floor(ruang / qr.ukuran)), qs = m * qr.ukuran;
  const qx = mmPx(P.x + P.w) - mmPx(1.5) - qs, qy = mmPx(P.y) + Math.round((mmPx(P.h) - qs) / 2);
  c.fillStyle = '#0b2e1c';
  for (let y = 0; y < qr.ukuran; y++) for (let x = 0; x < qr.ukuran; x++) if (qr.modul[y][x]) c.fillRect(qx + x * m, qy + y * m, m, m);
  // kolom kiri
  const lx = mmPx(P.x + 2), lw = qx - lx - mmPx(1.8);
  const jl = s.kelas || '-';
  const uj = pasFont(c, jl, '800', mmPx(2.4), mmPx(1.7), lw - mmPx(3.6)), cw = c.measureText(jl).width + mmPx(3.6), ch = mmPx(4);
  const cy = mmPx(P.y + 2.1);
  kotakBulat(c, lx, cy, cw, ch, ch / 2); c.fillStyle = '#e1f0e6'; c.fill();
  c.strokeStyle = '#198754'; c.lineWidth = mmPx(0.25); c.stroke();
  c.fillStyle = '#0f5132'; c.font = '800 ' + uj + 'px ' + FONT_K; c.fillText(jl, lx + mmPx(1.8), cy + ch * .71);
  const baris = (label, nilai, y) => {
    c.fillStyle = '#7b867f'; c.font = '700 ' + mmPx(1.75) + 'px ' + FONT_K; c.fillText(label, lx, mmPx(y));
    c.fillStyle = '#12301f'; pasFont(c, nilai, '800', mmPx(2.55), mmPx(1.8), lw); c.fillText(nilai, lx, mmPx(y + 2.8));
  };
  baris('NIS', s.nis || '-', P.y + 9.0);
  baris('Jenis Kelamin', jkTeks(s.jk) || '-', P.y + 14.6);
  kakiKartu(c, 'Metode Tilawati · Berlaku selama menjadi santri');
  return cv;
}

/* ---------- sisi BELAKANG ---------- */
async function gambarBelakang(s, info, aset){
  // dicoba dengan skala huruf 1; bila isi terlalu panjang, diperkecil sampai muat
  for (const f of [1, .93, .86, .8]) { const cv = await gambarBelakangSkala(s, info, aset, f); if (cv) return cv; }
  return gambarBelakangSkala(s, info, aset, .8, true);
}
async function gambarBelakangSkala(s, info, aset, f, paksa){
  const cv = kanvasKartu(), c = cv.getContext('2d');
  c.fillStyle = '#fbf8f0'; c.fillRect(0, 0, KW, KH);
  polaBintang(c, 0, 0, KW, KH, '#c9a227', .07, mmPx(9));
  const hH = mmPx(13);
  kepalaKartu(c, aset.logo, hH, info, true);
  const x = mmPx(3.6), lw = mmPx(11.5), vx = x + lw, vw = KW - vx - mmPx(3.2), lh = mmPx(3.25 * f), lb = mmPx(2.65 * f);
  let y = hH + mmPx(4.4);
  const ttl = [s.tempat_lahir, tglPanjang(s.tanggal_lahir)].filter(Boolean).join(', ');
  const baris = [['Nama', s.nama, 2], ['NIS', s.nis, 1], ['TTL', ttl || '-', 2], ['Jilid', s.kelas, 1],
                 ['Wali', s.nama_wali || '-', 2], ['Alamat', s.alamat || '-', 2], ['Masuk', tglPanjang(s.tanggal_masuk) || '-', 1]];
  baris.forEach(([l, v, maks]) => {
    c.fillStyle = '#6b7a71'; c.font = '600 ' + mmPx(2 * f) + 'px ' + FONT_K; c.fillText(l, x, y);
    c.fillStyle = '#12301f'; c.font = '700 ' + mmPx(2.15 * f) + 'px ' + FONT_K;
    const semua = bungkusTeks(c, String(v || '-'), vw), b = semua.slice(0, maks);
    if (semua.length > maks) { let t = b[maks - 1]; while (t && c.measureText(t + '…').width > vw) t = t.slice(0, -1); b[maks - 1] = t.replace(/[\s,]+$/, '') + '…'; }
    b.forEach((t, i) => c.fillText(t, vx, y + i * lb));
    y += lh + (b.length - 1) * lb;
  });
  y += mmPx(0.2); c.fillStyle = '#e4dcc4'; c.fillRect(x, y, KW - 2 * x, mmPx(0.25)); y += mmPx(3.3 * f);
  c.fillStyle = '#0f5132'; c.font = '800 ' + mmPx(2.2 * f) + 'px ' + FONT_K; c.fillText('KETENTUAN', x, y); y += mmPx(2.9 * f);
  const aturan = ['Tanda pengenal resmi santri ' + (info.nama_tpq || 'TPQ Bahrul Ulum') + '.',
                  'Wajib dibawa saat kegiatan TPQ dan tidak dapat dipindahtangankan.',
                  'Jika menemukan kartu ini, mohon dikembalikan ke TPQ.'];
  c.font = '500 ' + mmPx(1.9 * f) + 'px ' + FONT_K; c.fillStyle = '#3c4a42';
  const la = mmPx(2.45 * f);
  aturan.forEach((t, i) => {
    const b = bungkusTeks(c, t, KW - 2 * x - mmPx(3));
    c.fillText((i + 1) + '.', x, y);
    b.forEach((tt, j) => c.fillText(tt, x + mmPx(3), y + j * la));
    y += b.length * la + mmPx(0.4);
  });
  // blok tanda tangan (dari bawah): nama, jabatan, tempat & tanggal
  const namaY = KH - mmPx(3.4) - mmPx(1.9), jabY = namaY - mmPx(aset.ttd ? 13.6 : 8.2), tglY = jabY - mmPx(2.6);
  if (!paksa && y - mmPx(1.6) > tglY - mmPx(2.2)) return null;          /* tidak muat: coba huruf lebih kecil */
  const kx = KW - mmPx(3.6);
  c.textAlign = 'right'; c.fillStyle = '#3c4a42'; c.font = '500 ' + mmPx(1.9) + 'px ' + FONT_K;
  const kota = String(info.alamat || 'Kapi').split(',')[0].trim();
  c.fillText(kota + ', ' + tglPanjang(info.hariIni || S.hariIni), kx, tglY);
  c.fillText('Kepala TPQ', kx, jabY);
  if (aset.ttd) {
    /* tanda tangan + stempel di antara jabatan dan nama; nama digambar sesudahnya agar tetap terbaca */
    const tinggi = mmPx(12.4), lebarMaks = mmPx(33);
    let th = tinggi, tw = th * aset.ttd.width / aset.ttd.height;
    if (tw > lebarMaks) { tw = lebarMaks; th = tw * aset.ttd.height / aset.ttd.width; }
    c.drawImage(aset.ttd, kx + mmPx(1.2) - tw, namaY - mmPx(1.6) - th, tw, th);
  }
  c.fillStyle = '#12301f'; c.font = '800 ' + mmPx(2.15) + 'px ' + FONT_K;
  const kp = info.kepala || '............................';
  pasFont(c, kp, '800', mmPx(2.15), mmPx(1.6), KW / 2 + mmPx(6));
  c.save(); c.shadowColor = '#fbf8f0'; c.shadowBlur = mmPx(0.8);
  c.fillText(kp, kx, namaY); c.restore(); const kw = c.measureText(kp).width;
  c.fillRect(kx - kw, namaY + mmPx(0.7), kw, mmPx(0.22));
  if (!aset.ttd) {
    // tempat cap (kiri bawah) bila gambar tanda tangan & stempel belum diunggah
    c.textAlign = 'center';
    c.save(); c.strokeStyle = '#d6cba8'; c.setLineDash([mmPx(0.8), mmPx(0.6)]); c.lineWidth = mmPx(0.25);
    const ck = mmPx(10), cx = x + ck / 2 + mmPx(1), cyy = namaY - mmPx(4.6);
    c.beginPath(); c.arc(cx, cyy, ck / 2, 0, Math.PI * 2); c.stroke(); c.restore();
    c.fillStyle = '#b9ad88'; c.font = '600 ' + mmPx(1.6) + 'px ' + FONT_K; c.fillText('cap', cx, cyy + mmPx(0.6));
  }
  c.textAlign = 'left';
  kakiKartu(c, (info.nama_tpq || 'TPQ Bahrul Ulum') + ' · ' + (info.alamat || 'Kapi, Kunjang, Kediri'));
  return cv;
}

/* ---------- persiapan: font, logo, foto ---------- */
let LOGO_IMG = null;
async function siapkanAset(){
  try { await Promise.race([Promise.all(['500', '600', '700', '800'].map(b => document.fonts.load(b + ' 40px "Plus Jakarta Sans"'))), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
  if (!LOGO_IMG) LOGO_IMG = await muatGambar(LOGO_TPQ);
  return LOGO_IMG;
}
async function fotoSantriBanyak(list, progres){
  const perlu = list.filter(s => s.adaFoto && S.foto['santri|' + s.nis] === undefined).map(s => s.nis);
  for (let i = 0; i < perlu.length; i += 15) {
    const bag = perlu.slice(i, i + 15);
    if (progres) progres('Mengambil foto ' + Math.min(i + 15, perlu.length) + ' dari ' + perlu.length + '…');
    try { const r = await api('getFotoBanyak', S.token, bag); bag.forEach(n => { S.foto['santri|' + n] = r[n] || ''; }); }
    catch (e) { bag.forEach(n => { S.foto['santri|' + n] = ''; }); }
  }
}
let TTD_IMG = { src: null, img: null };
async function gambarKartuSantri(s, info){
  const logo = await siapkanAset(), foto = await muatGambar(S.foto['santri|' + s.nis]);
  if (TTD_IMG.src !== (info.ttd || '')) TTD_IMG = { src: info.ttd || '', img: await muatGambar(info.ttd) };
  const aset = { logo, foto, ttd: TTD_IMG.img };
  return { depan: await gambarDepan(s, info, aset), belakang: await gambarBelakang(s, info, aset) };
}
function keBlobUrl(cv, jenis, mutu){ return new Promise(res => cv.toBlob(b => res(URL.createObjectURL(b)), jenis || 'image/jpeg', mutu || .95)); }

/* ---------- lembar cetak A4 (9 kartu per lembar, ukuran asli) ---------- */
const A4 = { w: 210, h: 297, kol: 3, bar: 3, jarak: 3 };
A4.mx = (A4.w - A4.kol * KARTU.wmm - (A4.kol - 1) * A4.jarak) / 2;
A4.my = (A4.h - A4.bar * KARTU.hmm - (A4.bar - 1) * A4.jarak) / 2;
function posisiA4(i){ const c = i % A4.kol, r = Math.floor(i / A4.kol); return { x: A4.mx + c * (KARTU.wmm + A4.jarak), y: A4.my + r * (KARTU.hmm + A4.jarak) }; }
function htmlHalaman(isiKartu, label){
  return `<div class="hal-a4">${isiKartu.map(k => { const p = posisiA4(k.pos);
    return `<div class="kk" style="left:${p.x}mm;top:${p.y}mm"><img src="${k.src}" alt=""></div>`; }).join('')}
    <div class="hal-label">${esc(label)}</div></div>`;
}
// kartu: [{depan, belakang}] (URL gambar). bolak = sisi belakang di halaman berikutnya, dicerminkan untuk cetak bolak-balik
function susunA4(kartu, bolak, judul){
  const per = A4.kol * A4.bar, hal = [], nHal = Math.ceil(kartu.length / per);
  for (let h = 0; h < nHal; h++) {
    const bag = kartu.slice(h * per, (h + 1) * per);
    hal.push(htmlHalaman(bag.map((k, i) => ({ pos: i, src: k.depan })), judul + ' · lembar ' + (h + 1) + (bolak ? ' (DEPAN)' : '') + ' dari ' + nHal));
    if (bolak) hal.push(htmlHalaman(bag.map((k, i) => ({ pos: Math.floor(i / A4.kol) * A4.kol + (A4.kol - 1 - i % A4.kol), src: k.belakang })),
      judul + ' · lembar ' + (h + 1) + ' (BELAKANG) — cetak bolak-balik, balik pada sisi panjang'));
  }
  return hal;
}
function pasangGayaCetak(){
  if ($('#gayaKartu')) return;
  const st = document.createElement('style'); st.id = 'gayaKartu';
  st.textContent = `
    #lembarCetak{display:none}
    .hal-a4{position:relative;width:210mm;height:297mm;background:#fff;overflow:hidden;box-sizing:border-box}
    .hal-a4 .kk{position:absolute;width:${KARTU.wmm}mm;height:${KARTU.hmm}mm;outline:0.1mm dashed #b5b5b5;outline-offset:0.6mm}
    .hal-a4 .kk img{width:100%;height:100%;display:block}
    .hal-label{position:absolute;left:${A4.mx}mm;bottom:5mm;font:7.5pt system-ui,sans-serif;color:#9a9a9a}
    .pratinjau-a4{display:flex;flex-direction:column;align-items:center;gap:14px;margin-top:6px}
    .pratinjau-a4 .bingkai{box-shadow:0 4px 18px rgba(0,0,0,.15);background:#fff;overflow:hidden}
    .pratinjau-a4 .bingkai .hal-a4{transform-origin:0 0}
    .pratinjau-kartu{display:flex;gap:12px;justify-content:center;margin:6px 0 4px}
    .pratinjau-kartu figure{margin:0;width:min(46%,210px);text-align:center;font-size:12px;color:var(--redup);font-weight:600}
    .pratinjau-kartu figure img{display:block;width:100%;height:auto;border-radius:10px;box-shadow:0 6px 20px rgba(15,81,50,.22);margin-bottom:6px}
    .progres-kartu{height:8px;border-radius:99px;background:#eee8da;overflow:hidden;margin:10px 0 4px}
    .progres-kartu i{display:block;height:100%;width:0;background:linear-gradient(90deg,#198754,#34b37a);transition:width .2s}
    .daftar-kartu{max-height:52vh;overflow:auto;margin:6px -4px 0;padding:0 4px}
    .kotak-ttd{display:flex;gap:12px;align-items:center;background:#faf8f1;border:1px solid #efeadf;border-radius:12px;padding:10px;margin:2px 0 14px}
    .ttd-pratinjau{width:120px;height:62px;flex:none;display:grid;place-items:center;background:#fff;border:1px dashed #d6cba8;border-radius:8px;overflow:hidden}
    .ttd-pratinjau img{max-width:100%;max-height:100%}
    @media print{
      body.cetak-kartu > *:not(#lembarCetak){display:none!important}
      body.cetak-kartu{background:#fff!important;margin:0}
      body.cetak-kartu #lembarCetak{display:block}
      body.cetak-kartu .hal-a4{page-break-after:always;break-after:page}
      body.cetak-kartu .hal-a4:last-child{page-break-after:auto;break-after:auto}
    }`;
  document.head.appendChild(st);
}
function cetakLembar(htmlHal){
  pasangGayaCetak();
  let wadah = $('#lembarCetak'); if (!wadah) { wadah = document.createElement('div'); wadah.id = 'lembarCetak'; document.body.appendChild(wadah); }
  wadah.innerHTML = htmlHal.join('');
  let hal = $('#gayaHalaman'); if (!hal) { hal = document.createElement('style'); hal.id = 'gayaHalaman'; document.head.appendChild(hal); }
  hal.textContent = '@page{size:A4 portrait;margin:0}';
  document.body.classList.add('cetak-kartu');
  const selesai = () => { document.body.classList.remove('cetak-kartu'); hal.textContent = ''; window.removeEventListener('afterprint', selesai); };
  window.addEventListener('afterprint', selesai);
  const imgs = [...wadah.querySelectorAll('img')];
  Promise.all(imgs.map(im => im.complete ? 1 : new Promise(r => { im.onload = im.onerror = r; }))).then(() => {
    setTimeout(() => { window.print(); setTimeout(selesai, 1500); }, 150);
  });
}
function pratinjauA4(el, htmlHal){
  pasangGayaCetak();
  const lebar = Math.min(el.clientWidth || 340, 520), skala = lebar / (210 * 96 / 25.4);
  el.innerHTML = `<div class="pratinjau-a4">${htmlHal.map(h => `<div class="bingkai" style="width:${lebar}px;height:${Math.round(lebar * 297 / 210)}px">
    ${h.replace('class="hal-a4"', `class="hal-a4" style="transform:scale(${skala})"`)}</div>`).join('')}</div>`;
}

/* ---------- halaman kartu satu santri (santri/wali, guru, admin) ---------- */
async function kartuSantri(nis){
  pasangGayaCetak();
  const santriSendiri = S.user.peran === 'santri';
  S.tab = santriSendiri ? 'kartu' : S.tab; tandaiNav(S.tab);
  isi(`${santriSendiri ? '' : `<button class="btn garis kecil" onclick="buka('kartu')">‹ Kartu santri</button>`}
    <div class="card" style="margin-top:${santriSendiri ? 0 : 12}px"><h3>Kartu Santri</h3><div id="ksIsi"></div></div>`);
  memuat('#ksIsi');
  try {
    const r = await api('getKartu', S.token, santriSendiri ? [] : [nis]);
    const s = r.santri[0]; if (!s) throw new Error('Data santri tidak ditemukan.');
    await fotoSantriBanyak([s]);
    const k = await gambarKartuSantri(s, r.info);
    const depan = await keBlobUrl(k.depan, 'image/png'), belakang = await keBlobUrl(k.belakang, 'image/png');
    // gabungan depan + belakang untuk diunduh sebagai satu gambar
    const g = document.createElement('canvas'), pad = mmPx(4);
    g.width = KW * 2 + pad * 3; g.height = KH + pad * 2;
    const c = g.getContext('2d'); c.fillStyle = '#ffffff'; c.fillRect(0, 0, g.width, g.height);
    [k.depan, k.belakang].forEach((cv, i) => { c.save(); kotakBulat(c, pad + i * (KW + pad), pad, KW, KH, mmPx(3)); c.clip(); c.drawImage(cv, pad + i * (KW + pad), pad); c.restore(); });
    const gabung = await keBlobUrl(g, 'image/png');
    S.kartuSiap = { s, depan, belakang, gabung };
    const namaFile = 'Kartu-Santri-' + s.nis + '-' + String(s.nama || '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.png';
    $('#ksIsi').innerHTML = `
      <div class="pratinjau-kartu"><figure><img src="${depan}" alt="Kartu depan">Depan</figure><figure><img src="${belakang}" alt="Kartu belakang">Belakang</figure></div>
      <div class="aksi-bawah"><button class="btn primer" onclick="cetakKartuSatu()">Cetak / Simpan PDF</button>
        <a class="btn" style="text-decoration:none" href="${gabung}" download="${esc(namaFile)}">Unduh Gambar</a></div>
      <p class="muted" style="font-size:12.5px;margin:10px 0 0">Ukuran asli kartu ATM/pelajar (54 × 85,6 mm). Saat mencetak pilih kertas <b>A4</b> dan skala <b>100% / Ukuran sebenarnya</b>. Di HP, gambar kartu juga bisa disimpan dengan menekan lama gambarnya.</p>`;
  } catch (e) { gagal('#ksIsi', e); }
}
function cetakKartuSatu(){
  const k = S.kartuSiap; if (!k) return;
  cetakLembar([htmlHalaman([{ pos: 0, src: k.depan }, { pos: 1, src: k.belakang }], 'Kartu santri ' + k.s.nama + ' · depan & belakang · potong mengikuti garis')]);
}

/* ---------- menu Kartu Santri (guru & admin) ---------- */
function viewKartu(){
  pasangGayaCetak();
  if (S.user.peran === 'santri') return kartuSantri(S.user.id);
  const admin = S.user.peran === 'admin';
  isi(`<div class="judul-hal"><h2>Kartu Santri</h2><p class="muted">Ukuran kartu ATM/pelajar · QR code berisi NIS santri</p></div>
    ${admin ? `<div class="card"><h3>Cetak Kolektif (A4)</h3>
      <p class="muted" style="margin:-6px 0 12px;font-size:13px">9 kartu per lembar A4 dengan ukuran asli dan garis potong, siap dibawa ke percetakan.</p>
      <div class="row"><label>Jilid<select id="kkJilid" class="inp" onchange="renderKk()">${opsiKelas(S.kkJilid || '', true)}</select></label>
        <label>Sisi kartu<select id="kkSisi" class="inp"><option value="2">Depan & belakang (bolak-balik)</option><option value="1">Depan saja</option><option value="0">Belakang saja</option></select></label></div>
      <label>Nama Kepala TPQ (tanda tangan di kartu)<div style="display:flex;gap:8px"><input id="kkKepala" class="inp" placeholder="memuat…" style="flex:1">
        <button class="btn kecil" style="margin-top:5px" onclick="simpanKepala(this)">Simpan</button></div></label>
      <div class="kotak-ttd"><div id="kkTtd" class="ttd-pratinjau"><span class="muted">memuat…</span></div>
        <div style="flex:1"><b style="font-size:14px">Tanda tangan & stempel</b>
          <p class="muted" style="font-size:12.5px;margin:2px 0 8px">Gambar PNG/JPG. Latar putih dihapus otomatis.</p>
          <div style="display:flex;gap:6px;flex-wrap:wrap"><label class="btn kecil" style="margin:0">Unggah<input type="file" accept="image/*" hidden onchange="unggahTtd(this)"></label>
          <button class="btn kecil garis" onclick="hapusTtd(this)">Hapus</button></div></div></div>
      <div id="kkProgres"></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primer" style="flex:1" onclick="siapkanA4(false,this)">Siapkan Semua di Daftar</button>
        <button class="btn" style="flex:1" onclick="siapkanA4(true,this)">Siapkan yang Dicentang</button></div>
      <div id="kkA4"></div></div>` : ''}
    <div class="card"><div class="bar"><h3>Daftar Santri</h3>${admin ? '<label class="cek" style="margin:0"><input type="checkbox" id="kkSemua" onchange="document.querySelectorAll(\'.kkCek\').forEach(c=>c.checked=this.checked)"> Centang semua</label>' : ''}</div>
      ${admin ? '' : `<label>Jilid<select id="kkJilid" class="inp" onchange="renderKk()">${opsiKelas(S.kkJilid || kelasDefault(), true)}</select></label>`}
      <input id="kkCari" class="inp" placeholder="Cari nama atau NIS" oninput="renderKk()" style="margin-bottom:6px">
      <div id="kkList" class="daftar-kartu"></div></div>`);
  if (admin) api('getKartu', S.token, ['__']).then(r => {
    const el = $('#kkKepala'); if (el) { el.value = r.info.kepala || ''; el.placeholder = 'Nama lengkap Kepala TPQ'; }
    tampilTtd(r.info.ttd);
  }).catch(() => {});
  renderKk();
}
function renderKk(){
  const j = S.kkJilid = $('#kkJilid').value, q = ($('#kkCari').value || '').toLowerCase().trim(), admin = S.user.peran === 'admin';
  const L = S.santri.filter(s => (!j || s.kelas === j) && (!q || (s.nama + ' ' + s.nis).toLowerCase().includes(q)));
  S.kkList = L;
  $('#kkList').innerHTML = `<p class="muted" style="font-size:13px;margin:0 0 4px">${L.length} santri</p>` + (L.length ? L.map(s => `
    <div class="baris-guru">${admin ? `<label class="cek" style="margin:0;flex:1;font-weight:600"><input type="checkbox" class="kkCek" value="${esc(s.nis)}">` : '<div style="flex:1">'}
      <span><b>${esc(s.nama)}</b><small>NIS ${esc(s.nis)} · ${esc(s.kelas)}</small></span>${admin ? '</label>' : '</div>'}
      <button class="btn kecil" onclick="kartuSantri('${esc(s.nis)}')">Kartu</button></div>`).join('') : kosong('Tidak ada santri.'));
}
function tampilTtd(src){
  const el = $('#kkTtd'); if (!el) return;
  el.innerHTML = src ? `<img src="${src}" alt="Tanda tangan & stempel">` : '<span class="muted" style="font-size:12px;text-align:center">belum ada</span>';
}
/* baca gambar, perkecil, dan hapus latar putih (bila gambar belum transparan) */
function olahTtd(file){
  return new Promise((res, rej) => {
    if (!file || !/^image\//.test(file.type)) return rej(new Error('Pilih file gambar (PNG/JPG).'));
    const fr = new FileReader();
    fr.onload = () => { const im = new Image(); im.onload = () => {
      const skala = Math.min(1, 900 / Math.max(im.width, im.height));
      const cv = document.createElement('canvas'); cv.width = Math.round(im.width * skala); cv.height = Math.round(im.height * skala);
      const c = cv.getContext('2d'); c.drawImage(im, 0, 0, cv.width, cv.height);
      const d = c.getImageData(0, 0, cv.width, cv.height), p = d.data;
      let tembus = 0; for (let i = 3; i < p.length; i += 4) if (p[i] < 240) tembus++;
      if (tembus / (p.length / 4) < 0.05) {
        for (let i = 0; i < p.length; i += 4) {
          const terang = Math.min(p[i], p[i + 1], p[i + 2]);           /* putih/abu terang -> transparan */
          p[i + 3] = Math.round(p[i + 3] * Math.max(0, Math.min(1, (238 - terang) / 88)));
        }
        c.putImageData(d, 0, 0);
      }
      let url = cv.toDataURL('image/png');
      if (url.length > 900000) { const k2 = document.createElement('canvas'); k2.width = Math.round(cv.width * .7); k2.height = Math.round(cv.height * .7);
        k2.getContext('2d').drawImage(cv, 0, 0, k2.width, k2.height); url = k2.toDataURL('image/png'); }
      res(url);
    }; im.onerror = () => rej(new Error('Gambar tidak bisa dibaca.')); im.src = fr.result; };
    fr.readAsDataURL(file);
  });
}
function unggahTtd(input){
  olahTtd(input.files[0]).then(url => {
    tampilTtd(url); toast('Menyimpan tanda tangan & stempel…');
    return api('simpanTtdKepala', S.token, url).then(m => { toast(m); TTD_IMG = { src: null, img: null }; });
  }).catch(e => toast(e.message, 1));
}
function hapusTtd(btn){
  if (!confirm('Hapus gambar tanda tangan & stempel dari kartu?')) return;
  sibuk(btn, true, '…');
  api('simpanTtdKepala', S.token, null).then(m => { toast(m); tampilTtd(''); sibuk(btn, false); }).catch(e => { toast(e.message, 1); sibuk(btn, false); });
}
function simpanKepala(btn){
  sibuk(btn, true, '…');
  api('simpanPengaturanKartu', S.token, { nama_kepala: $('#kkKepala').value.trim() })
    .then(m => { toast(m); sibuk(btn, false); }).catch(e => { toast(e.message, 1); sibuk(btn, false); });
}
async function siapkanA4(dicentang, btn){
  let nis = dicentang ? [...document.querySelectorAll('.kkCek:checked')].map(c => c.value) : S.kkList.map(s => s.nis);
  if (!nis.length) { toast(dicentang ? 'Centang santri yang akan dicetak.' : 'Tidak ada santri di daftar.', 1); return; }
  const sisi = $('#kkSisi').value, prog = $('#kkProgres');
  const tulis = (t, p) => { prog.innerHTML = `<div class="progres-kartu"><i style="width:${p || 0}%"></i></div><p class="muted" style="font-size:12.5px;margin:0 0 10px">${esc(t)}</p>`; };
  sibuk(btn, true, 'Menyiapkan…'); $('#kkA4').innerHTML = '';
  try {
    tulis('Mengambil data santri…', 3);
    const r = await api('getKartu', S.token, nis);
    await fotoSantriBanyak(r.santri, t => tulis(t, 15));
    const kartu = [];
    for (let i = 0; i < r.santri.length; i++) {
      tulis('Menggambar kartu ' + (i + 1) + ' dari ' + r.santri.length + '…', 20 + Math.round(75 * i / r.santri.length));
      const k = await gambarKartuSantri(r.santri[i], r.info);
      kartu.push({ depan: sisi !== '0' ? await keBlobUrl(k.depan) : '', belakang: sisi !== '1' ? await keBlobUrl(k.belakang) : '' });
    }
    const judul = 'Kartu Santri ' + (r.info.nama_tpq || 'TPQ Bahrul Ulum') + (S.kkJilid && !dicentang ? ' · ' + S.kkJilid : '');
    let hal;
    if (sisi === '2') hal = susunA4(kartu, true, judul);
    else hal = susunA4(kartu.map(k => ({ depan: sisi === '1' ? k.depan : k.belakang })), false, judul + (sisi === '0' ? ' (belakang)' : ''));
    S.halA4 = hal;
    const nLembar = hal.length;
    tulis('Siap: ' + r.santri.length + ' kartu, ' + nLembar + ' lembar A4.', 100);
    $('#kkA4').innerHTML = `<div class="aksi-bawah" style="margin-top:6px"><button class="btn primer" onclick="cetakLembar(S.halA4)">Cetak / Simpan PDF (${nLembar} lembar)</button></div>
      <p class="muted" style="font-size:12.5px;margin:8px 0 0">Saat mencetak: kertas <b>A4</b>, margin <b>Tidak ada/None</b>, skala <b>100%</b>.${sisi === '2' ? ' Untuk bolak-balik pilih <b>Cetak dua sisi · balik pada sisi panjang</b>.' : ''}</p>
      <div id="kkPratinjau"></div>`;
    pratinjauA4($('#kkPratinjau'), hal.slice(0, 2));
  } catch (e) { toast(e.message, 1); tulis('Gagal: ' + e.message, 0); }
  sibuk(btn, false);
}

/* ===================== AKUN ===================== */
function viewAkun(){
  const u = S.user;
  isi(`<div class="card"><div class="profil"><div class="avatar" id="akFoto">${esc(inisial(u.nama))}</div>
      <div style="flex:1"><b style="font-size:17px">${esc(u.nama)}</b><div class="muted" style="font-size:13px">${u.peran==='santri' ? 'NIS ' : 'Username: '}${esc(u.id)}${u.kelas ? ' · ' + esc(u.kelas) : ''}</div></div></div>
      <button class="btn lebar" style="margin-top:14px" onclick="${u.peran==='santri' ? "buka('profil')" : `detailGuru('${esc(u.id)}')`}">Lihat ${u.peran==='santri' ? 'Biodata Santri' : 'Profil Saya'}</button></div>
    <div class="card"><h3>Ganti Password</h3>
      <label>Password lama<input id="pwLama" type="password" class="inp" autocomplete="current-password"></label>
      <label>Password baru (min. 6 karakter)<input id="pwBaru" type="password" class="inp" autocomplete="new-password"></label>
      <label>Ulangi password baru<input id="pwBaru2" type="password" class="inp" autocomplete="new-password"></label>
      <button class="btn primer lebar" onclick="gantiPw(this)">Simpan Password</button></div>
    <div class="card kartu-pasang"><img src="${LOGO_TPQ}" alt=""><div style="flex:1">
      <h3 style="margin:0 0 4px">${S.wadah && S.wadah.terpasang ? 'Aplikasi sudah terpasang' : 'Pasang Aplikasi di HP'}</h3>
      <p class="muted" style="margin:0 0 10px;font-size:13.5px">${S.wadah && S.wadah.terpasang
        ? 'Anda sedang membuka SiAbsen dari ikon di layar utama.'
        : 'Buat ikon SiAbsen di layar utama HP, lalu buka langsung tanpa browser.'}</p>
      ${S.wadah && S.wadah.terpasang ? '' : '<button class="btn primer kecil" onclick="mintaPasang()">Pasang Sekarang</button>'}</div></div>
    <button class="btn bahaya lebar" onclick="if(confirm('Keluar dari akun?'))keluar()">Keluar</button>`);
  muatFoto(u.peran === 'santri' ? 'santri' : 'guru', u.id, '#akFoto');
}
function gantiPw(btn){
  const a = $('#pwLama').value, b = $('#pwBaru').value;
  if (b.length < 6){ toast('Password baru minimal 6 karakter.', 1); return; }
  if (b !== $('#pwBaru2').value){ toast('Ulangan password baru tidak sama.', 1); return; }
  sibuk(btn, true);
  api('gantiPassword', S.token, a, b).then(m => { toast(m); ['#pwLama','#pwBaru','#pwBaru2'].forEach(q => $(q).value=''); sibuk(btn, false); })
    .catch(e => { toast(e.message, 1); sibuk(btn, false); });
}

/* ===================== PROGRAM PEMBELAJARAN (format Excel Tilawati) ===================== */
const PP_N = 60, PP_BLOK = 15;
const PP_BARIS = [
  { f:'peraga', no:1, materi:'Klassikal Peraga/hal', w:'waktu_peraga', t:'teknik_peraga' },
  { f:'simak', no:2, materi:'Baca simak Buku Tilawati/hal', w:'waktu_simak', t:'teknik_simak' },
  { f:'kelancaran', no:3, materi:'Prosentase Kelancaran Dalam Kelas' },
  { f:'munaqosyah', no:4, materi:'Pemantapan persiapan Munaqosyah', akhir:true }
];
function ppMunaq(p){ const m = (S.pp && S.pp.munaqosyah) || [46, 51]; return p >= m[0] && p <= m[1]; }
function ppTerisi(x){ return !!(x && (String(x.simak).trim() || String(x.kelancaran).trim() || x.munaqosyah === 'Y')); }
function ppJudul(pr){ return pr.quran ? "PROGRAM PEMBELAJARAN HARIAN MEMBACA AL-QUR'AN" : 'PROGRAM PEMBELAJARAN HARIAN MEMBACA JILID'; }
function ppLabelJilid(pr){ return pr.quran ? "Al-Qur'an" : 'Jilid'; }

function pasangGayaProgram(){
  if ($('#gayaProgram')) return;
  const st = document.createElement('style'); st.id = 'gayaProgram';
  st.textContent = `
    .pp-item{display:block;width:100%;text-align:left;background:#fff;border:1px solid var(--garis);border-radius:12px;padding:12px 14px;margin-top:10px;cursor:pointer;font:inherit;color:inherit}
    .pp-item:active{transform:scale(.99)}
    .pp-item b{font-size:15.5px}
    .pp-item small{display:block;color:var(--redup);font-size:12.5px;margin-top:2px}
    .pp-bar{height:7px;border-radius:99px;background:#eee8da;overflow:hidden;margin:9px 0 4px}
    .pp-bar i{display:block;height:100%;background:linear-gradient(90deg,#5f3dc4,#8c6cf0);border-radius:99px}
    .pp-kop{text-align:center;margin:-2px 0 10px}
    .pp-kop b{display:block;font-size:14.5px;letter-spacing:.2px}
    .pp-kop span{font-size:12.5px;color:var(--redup);font-weight:700;letter-spacing:.6px}
    .pp-info{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;font-size:14px;margin:0 0 4px}
    .pp-info dt{color:var(--redup)} .pp-info dd{margin:0;font-weight:700}
    .pp-chips{display:grid;grid-template-columns:repeat(10,1fr);gap:5px;margin:4px 0 12px}
    .pp-chips button{height:34px;border-radius:8px;border:1.5px solid var(--garis);background:#fff;font:700 12.5px/1 inherit;color:var(--redup);cursor:pointer;padding:0}
    .pp-chips button.isi{background:#e9e3fb;border-color:#c4b5f3;color:#4b2fa8}
    .pp-chips button.cad{border-style:dashed}
    .pp-chips button.on{background:#5f3dc4;border-color:#5f3dc4;color:#fff;box-shadow:0 3px 10px rgba(95,61,196,.35)}
    .pp-form{background:#f7f5fd;border:1px solid #e3dcf8;border-radius:12px;padding:12px}
    .pp-form h4{margin:0 0 8px;font-size:15px}
    .pp-cepat{display:flex;flex-wrap:wrap;gap:5px;margin:-4px 0 10px}
    .pp-cepat button{border:1px solid var(--garis);background:#fff;border-radius:99px;padding:4px 10px;font:700 12.5px inherit;color:var(--teks);cursor:pointer}
    .pp-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -4px 14px;padding:0 4px;scroll-padding-left:160px}
    table.pp-tabel{border-collapse:collapse;font-size:12px;min-width:860px;width:100%;background:#fff}
    .pp-tabel th,.pp-tabel td{border:1px solid #bdb6a3;padding:0;height:28px;text-align:center;white-space:nowrap}
    .pp-tabel th{background:#f3efe2;font-weight:800;font-size:11.5px;padding:2px 4px}
    .pp-tabel td.no{width:28px;min-width:28px} .pp-tabel td.mat{text-align:left;padding:2px 6px;min-width:190px;font-weight:600}
    @media (max-width:640px){ .pp-tabel td.mat{min-width:118px;max-width:118px;white-space:normal;line-height:1.2;font-size:11.5px} }
    .pp-tabel td.wk{padding:0 5px;min-width:62px}
    .pp-tabel .sticky{position:sticky;left:0;z-index:1;background:#fff}
    .pp-tabel th.sticky{background:#f3efe2}
    .pp-tabel td.hitam{background:#1b241f}
    .pp-tabel td.mati{background:#f4f1e8}
    .pp-tabel input{width:100%;min-width:44px;height:27px;border:0;background:transparent;text-align:center;font:600 12px inherit;color:var(--teks);padding:0 2px}
    .pp-tabel input:focus{outline:2px solid #8c6cf0;background:#f7f5fd}
    .pp-tabel input.ubah{background:#fff4c2}
    .pp-tabel input[type=checkbox]{width:17px;height:17px;min-width:0;accent-color:#5f3dc4}
    .pp-tabel tr.lancar input{color:#4b2fa8}
    .pp-simpan{position:sticky;bottom:78px;z-index:5;display:none;margin-top:8px}
    .pp-simpan.on{display:block}
    .pp-legenda{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;color:var(--redup);margin:2px 0 10px}
    .pp-legenda i{display:inline-block;width:12px;height:12px;border-radius:3px;vertical-align:-2px;margin-right:4px;border:1px solid #c4b5f3;background:#e9e3fb}
    .hal-pp{width:297mm;min-height:210mm;padding:9mm 10mm;box-sizing:border-box;background:#fff;color:#000;font:8.2pt Calibri,Arial,sans-serif}
    .hal-pp h1{font-size:11pt;text-align:center;margin:0;font-weight:700}
    .hal-pp h2{font-size:10pt;text-align:center;margin:0 0 3mm;font-weight:700}
    .hal-pp table{width:auto}
    .hal-pp .pp-head{border-collapse:collapse;margin:0 0 3mm 8mm;font-size:9pt;width:auto!important}
    .hal-pp .pp-head td{padding:.3mm 2mm .3mm 0;border:0!important;text-align:left;background:none;color:#000;font-size:9pt}
    .hal-pp table.pc th{color:#000!important;background:#fff!important;text-transform:none;letter-spacing:0}
    .hal-pp table.pc{border-collapse:collapse;width:100%!important;margin-bottom:3.2mm;table-layout:fixed}
    .hal-pp table.pc th,.hal-pp table.pc td{border:.25mm solid #000;text-align:center;padding:.5mm .4mm;height:4.6mm;font-size:8pt;overflow:hidden;white-space:nowrap}
    .hal-pp table.pc th{font-weight:700}
    .hal-pp table.pc td.mat{text-align:left;padding-left:1mm}
    .hal-pp table.pc td.wk{text-align:left;padding-left:1mm}
    .hal-pp table.pc td.hitam{background:#000!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  `;
  document.head.appendChild(st);
}

function viewProgram(){
  pasangGayaProgram();
  if (S.ppId) return bukaProgram(S.ppId);
  isi(`<div class="judul-hal"><h2>Program Pembelajaran</h2><p class="muted">Program harian membaca Jilid & Al-Qur'an · Metode Tilawati (60 pertemuan)</p></div>
    <div class="card"><div class="bar"><h3>Daftar Program</h3><button class="btn kecil primer" onclick="formProgram()">+ Program Baru</button></div>
      <div id="ppForm"></div><div id="ppFilter"></div><div id="ppList"></div></div>`);
  cepat('pp-daftar', 'getDaftarProgram', [], '#ppList', r => { S.ppDaftar = r; renderDaftarProgram(); });
}
function renderDaftarProgram(){
  const r = S.ppDaftar; if (!r || !$('#ppList')) return;
  const admin = S.user.peran === 'admin';
  if (admin && $('#ppFilter') && !$('#ppUst')) {
    const ust = [...new Set(r.program.map(p => p.nama_ustadz).filter(Boolean))].sort();
    if (ust.length > 1) $('#ppFilter').innerHTML = `<select id="ppUst" class="inp" style="margin:6px 0 0" onchange="renderDaftarProgram()">
      <option value="">Semua ustadz/ustadzah</option>${ust.map(u => `<option>${esc(u)}</option>`).join('')}</select>`;
  }
  const f = $('#ppUst') ? $('#ppUst').value : '';
  const list = r.program.filter(p => !f || p.nama_ustadz === f);
  $('#ppList').innerHTML = list.length ? list.map(p => {
    const persen = Math.min(100, Math.round((p.terakhir || 0) / 51 * 100));
    return `<button class="pp-item" onclick="bukaProgram('${esc(p.id)}')">
      <b>${esc(p.jilid)}${p.kelompok ? ' · Kelompok ' + esc(p.kelompok) : ''}</b>
      <small>${esc(p.nama_ustadz || '-')}${p.periode ? ' · ' + esc(p.periode) : ''}</small>
      <div class="pp-bar"><i style="width:${persen}%"></i></div>
      <small>${p.terakhir ? `Sampai pertemuan ke-${p.terakhir} · ${p.terisi} pertemuan terisi` : p.terisi ? p.terisi + ' pertemuan terisi' : 'Belum ada pertemuan yang diisi'}${p.rata != null ? ' · rata-rata kelancaran ' + p.rata + '%' : ''}</small></button>`;
  }).join('') : kosong(S.user.peran === 'admin' ? 'Belum ada program pembelajaran.' : 'Belum ada program pembelajaran. Ketuk "+ Program Baru" untuk membuat.');
}

function formProgram(id){
  const pr = id && S.pp && S.pp.program.id === id ? S.pp.program : null;
  const wadah = pr ? $('#ppDetailForm') : $('#ppForm');
  if (!wadah) return;
  if (wadah.innerHTML) { wadah.innerHTML = ''; return; }
  const admin = S.user.peran === 'admin';
  const guru = (S.ppDaftar && S.ppDaftar.guru) || [];
  const jilid = pr ? pr.jilid : kelasDefault();
  wadah.innerHTML = `<div class="pp-form" style="margin:10px 0 4px"><h4>${pr ? 'Ubah Data Program' : 'Program Pembelajaran Baru'}</h4>
    <div class="row"><label>Jilid / Al-Qur'an<select id="pfJilid" class="inp" onchange="pfCekPola()">${opsiKelas(jilid)}</select></label>
      <label>Kelompok<input id="pfKelompok" class="inp" maxlength="60" placeholder="Contoh: A" value="${esc(pr ? pr.kelompok : '')}"></label></div>
    ${admin && guru.length ? `<label>Nama Ustadz/Ustadzah<select id="pfUst" class="inp">${guru.map(g => `<option value="${esc(g.username)}" ${(pr ? pr.username : S.user.id) === g.username ? 'selected' : ''}>${esc(g.nama)}</option>`).join('')}</select></label>`
      : `<label>Nama Ustadz/Ustadzah<input class="inp" value="${esc(pr ? pr.nama_ustadz : S.user.nama)}" disabled></label>`}
    <label>Periode / Tahun Ajaran <span class="muted">(opsional)</span><input id="pfPeriode" class="inp" maxlength="60" placeholder="Contoh: 2026/2027 Semester 1" value="${esc(pr ? pr.periode : '')}"></label>
    <details style="margin:2px 0 10px"><summary class="muted" style="cursor:pointer;font-size:13.5px">Waktu & teknik (bawaan: 15 menit Klassikal, 30 menit Baca Simak)</summary>
      <div class="row" style="margin-top:8px"><label>Waktu Klassikal Peraga<input id="pfWp" class="inp" value="${esc(pr ? pr.waktu_peraga : '15 Menit')}"></label>
        <label>Teknik<input id="pfTp" class="inp" value="${esc(pr ? pr.teknik_peraga : 'Klassikal')}"></label></div>
      <div class="row"><label>Waktu Baca Simak<input id="pfWs" class="inp" value="${esc(pr ? pr.waktu_simak : '30 Menit')}"></label>
        <label>Teknik<input id="pfTs" class="inp" value="${esc(pr ? pr.teknik_simak : 'Baca Simak')}"></label></div></details>
    ${pr ? '' : `<label class="cek" id="pfPolaBox"><input type="checkbox" id="pfPola" checked> Isi halaman Klassikal Peraga dengan pola bawaan Tilawati (1-4, 5-8 … lalu 1-10, 11-20)</label>`}
    <div style="display:flex;gap:8px"><button class="btn primer" style="flex:1" onclick="simpanProgramForm(this, ${pr ? `'${esc(pr.id)}'` : 'null'})">${pr ? 'Simpan' : 'Buat Program'}</button>
      <button class="btn garis" onclick="formProgram(${pr ? `'${esc(pr.id)}'` : ''})">Batal</button></div></div>`;
  pfCekPola();
}
function pfCekPola(){
  const box = $('#pfPolaBox'); if (!box) return;
  const q = /qur/i.test($('#pfJilid').value);
  box.style.display = q ? 'none' : '';
}
function simpanProgramForm(btn, id){
  const d = { id: id || '', jilid: $('#pfJilid').value, kelompok: $('#pfKelompok').value.trim(), periode: $('#pfPeriode').value.trim(),
    waktu_peraga: $('#pfWp').value.trim(), teknik_peraga: $('#pfTp').value.trim(), waktu_simak: $('#pfWs').value.trim(), teknik_simak: $('#pfTs').value.trim() };
  if ($('#pfUst')) d.username = $('#pfUst').value;
  if ($('#pfPola')) d.polaBawaan = $('#pfPola').checked;
  if (!d.jilid) { toast("Pilih jilid / Al-Qur'an.", 1); return; }
  sibuk(btn, true);
  api('simpanProgram', S.token, d).then(r => { toast(r.pesan); bukaProgram(r.id); })
    .catch(e => { toast(e.message, 1); sibuk(btn, false); });
}

function bukaProgram(id){
  pasangGayaProgram();
  S.ppId = id; S.ppUbah = {};
  window.scrollTo(0, 0);
  isi(`<div class="judul-hal" style="display:flex;align-items:center;gap:10px"><button class="btn kecil garis" onclick="S.ppId=null;viewProgram()">‹ Kembali</button>
      <div><h2 style="margin:0">Program Pembelajaran</h2></div></div><div id="ppDetail"></div>`);
  cepat('pp|' + id, 'getProgram', [id], '#ppDetail', r => {
    if (Object.keys(S.ppUbah || {}).length) return;   // jangan timpa isian yang belum disimpan
    S.pp = r; renderProgram();
  });
}
function renderProgram(){
  const r = S.pp, pr = r.program, el = $('#ppDetail'); if (!el) return;
  const pilih = S.ppPilih && S.ppPilih.id === pr.id ? S.ppPilih.ke : ((r.isi.find(x => x.ke <= 51 && !ppTerisi(x)) || {}).ke || 1);
  el.innerHTML = `
    <div class="card"><div class="pp-kop"><b>${ppJudul(pr)}</b><span>METODE TILAWATI</span></div>
      <dl class="pp-info"><dt>${ppLabelJilid(pr)}</dt><dd>${esc(pr.jilid)}</dd><dt>Nama Ustadz</dt><dd>${esc(pr.nama_ustadz || '-')}</dd>
        <dt>Kelompok</dt><dd>${esc(pr.kelompok || '-')}</dd>${pr.periode ? `<dt>Periode</dt><dd>${esc(pr.periode)}</dd>` : ''}</dl>
      <div id="ppDetailForm"></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
        <button class="btn kecil primer" onclick="cetakProgram()">Cetak / PDF</button>
        <button class="btn kecil" onclick="unduhProgramExcel()">Unduh Excel</button>
        <button class="btn kecil garis" onclick="formProgram('${esc(pr.id)}')">Ubah Data</button>
        <button class="btn kecil garis" style="color:var(--alpa)" onclick="hapusProgramIni()">Hapus</button></div></div>
    <div class="card"><h3>Isi Pertemuan</h3>
      <p class="muted" style="font-size:12.5px;margin:-6px 0 8px">Pilih nomor pertemuan, lalu isi halaman baca simak dan prosentase kelancaran kelas.</p>
      <div class="pp-chips">${r.isi.map(x => `<button class="${ppTerisi(x) ? 'isi' : ''} ${x.ke > 51 ? 'cad' : ''} ${x.ke === pilih ? 'on' : ''}" onclick="pilihPertemuan(${x.ke})">${x.ke}</button>`).join('')}</div>
      <div class="pp-legenda"><span><i></i>Sudah diisi</span><span><i style="background:#fff;border:1.5px dashed var(--garis)"></i>Pertemuan 52–60 (cadangan)</span></div>
      <div id="ppPertemuan"></div></div>
    <div class="card"><div class="bar"><h3>Tabel Program</h3></div>
      <p class="muted" style="font-size:12.5px;margin:-6px 0 10px">Seperti lembar Excel: ketuk sel untuk mengisi atau mengubah, lalu tekan <b>Simpan Perubahan</b>. Geser tabel ke samping untuk melihat semua pertemuan.</p>
      ${ppTabelEdit()}
      <div class="pp-simpan" id="ppSimpanBar"><button class="btn primer lebar" onclick="simpanTabelProgram(this)">Simpan Perubahan</button></div></div>`;
  pilihPertemuan(pilih, true);
}
function pilihPertemuan(ke, diam){
  const r = S.pp; if (!r) return;
  S.ppPilih = { id: r.program.id, ke: ke };
  document.querySelectorAll('.pp-chips button').forEach(b => b.classList.toggle('on', Number(b.textContent) === ke));
  const x = r.isi[ke - 1], pr = r.program;
  $('#ppPertemuan').innerHTML = `<div class="pp-form"><h4>Pertemuan ke-${ke}${ke > 51 ? ' <span class="muted" style="font-weight:600">(cadangan)</span>' : ''}</h4>
    <div class="row"><label>Klassikal Peraga/hal <span class="muted">(${esc(pr.waktu_peraga)})</span><input id="pqPeraga" class="inp" maxlength="40" value="${esc(x.peraga)}" placeholder="Contoh: 1-4"></label>
      <label>Baca Simak Buku Tilawati/hal <span class="muted">(${esc(pr.waktu_simak)})</span><input id="pqSimak" class="inp" maxlength="40" value="${esc(x.simak)}" placeholder="Contoh: 1-3"></label></div>
    <label>Prosentase Kelancaran Dalam Kelas (%)<input id="pqLancar" class="inp" inputmode="decimal" maxlength="5" value="${esc(x.kelancaran)}" placeholder="0–100"></label>
    <div class="pp-cepat">${[60, 70, 75, 80, 85, 90, 95, 100].map(n => `<button onclick="$('#pqLancar').value=${n}">${n}%</button>`).join('')}</div>
    ${ppMunaq(ke) ? `<label class="cek"><input type="checkbox" id="pqMunaq" ${x.munaqosyah === 'Y' ? 'checked' : ''}> Pemantapan persiapan Munaqosyah sudah dilaksanakan</label>` : ''}
    <button class="btn primer lebar" onclick="simpanPertemuan(this, ${ke})">Simpan Pertemuan ${ke}</button>
    ${x.diubah ? `<p class="muted" style="font-size:12px;margin:8px 0 0">Terakhir diubah: ${esc(x.diubah)}</p>` : ''}</div>`;
  if (!diam) $('#ppPertemuan').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
function cekLancar(v){
  v = String(v || '').replace('%', '').replace(',', '.').trim();
  if (v === '') return '';
  const n = Number(v);
  return isNaN(n) || n < 0 || n > 100 ? null : String(n);
}
function simpanPertemuan(btn, ke){
  const l = cekLancar($('#pqLancar').value);
  if (l === null) { toast('Prosentase kelancaran harus angka 0–100.', 1); $('#pqLancar').focus(); return; }
  const d = { ke: ke, peraga: $('#pqPeraga').value.trim(), simak: $('#pqSimak').value.trim(), kelancaran: l };
  if ($('#pqMunaq')) d.munaqosyah = $('#pqMunaq').checked ? 'Y' : '';
  sibuk(btn, true);
  api('simpanIsiProgram', S.token, S.pp.program.id, [d]).then(m => {
    toast(m);
    Object.assign(S.pp.isi[ke - 1], d, { munaqosyah: d.munaqosyah !== undefined ? d.munaqosyah : S.pp.isi[ke - 1].munaqosyah });
    S.ppPilih = { id: S.pp.program.id, ke: Math.min(PP_N, ke + 1) };
    S.ppUbah = {}; renderProgram();
  }).catch(e => { toast(e.message, 1); sibuk(btn, false); });
}

function ppTabelEdit(){
  const r = S.pp, pr = r.program; let h = '';
  for (let b = 0; b < PP_N / PP_BLOK; b++) {
    const a = b * PP_BLOK + 1, nomor = []; for (let p = a; p < a + PP_BLOK; p++) nomor.push(p);
    const akhir = b === PP_N / PP_BLOK - 1;
    h += `<div class="pp-wrap"><table class="pp-tabel"><thead>
      <tr><th rowspan="2" class="sticky">NO</th><th rowspan="2" class="sticky" style="left:28px">MATERI</th><th rowspan="2">WAKTU</th><th rowspan="2">TEKNIK</th><th colspan="${PP_BLOK}" style="text-align:left;padding-left:10px">PERTEMUAN KE ${a}–${a + PP_BLOK - 1}</th></tr>
      <tr>${nomor.map(p => `<th>${p}</th>`).join('')}</tr></thead><tbody>
      ${PP_BARIS.filter(z => !z.akhir || akhir).map(z => `<tr class="${z.f === 'kelancaran' ? 'lancar' : ''}">
        <td class="no sticky">${z.no}</td><td class="mat sticky" style="left:28px">${esc(z.materi)}</td>
        <td class="wk">${z.w ? esc(pr[z.w]) : ''}</td><td class="wk">${z.t ? esc(pr[z.t]) : ''}</td>
        ${nomor.map(p => {
          const x = r.isi[p - 1];
          if (z.f === 'munaqosyah') return ppMunaq(p) ? `<td><input type="checkbox" data-ke="${p}" data-f="munaqosyah" ${x.munaqosyah === 'Y' ? 'checked' : ''} onchange="ppSel(this)"></td>` : (p > r.munaqosyah[1] ? '<td class="hitam"></td>' : '<td class="mati"></td>');
          return `<td><input data-ke="${p}" data-f="${z.f}" value="${esc(x[z.f])}" maxlength="${z.f === 'kelancaran' ? 5 : 40}" ${z.f === 'kelancaran' ? 'inputmode="decimal" placeholder="%"' : ''} oninput="ppSel(this)"></td>`;
        }).join('')}</tr>`).join('')}
      </tbody></table></div>`;
  }
  return h;
}
function ppSel(el){
  const ke = Number(el.dataset.ke), f = el.dataset.f, x = S.pp.isi[ke - 1];
  const v = el.type === 'checkbox' ? (el.checked ? 'Y' : '') : el.value.trim();
  S.ppUbah[ke] = S.ppUbah[ke] || {};
  if (v === String(x[f] || '')) delete S.ppUbah[ke][f]; else S.ppUbah[ke][f] = v;
  if (!Object.keys(S.ppUbah[ke]).length) delete S.ppUbah[ke];
  el.classList.toggle('ubah', S.ppUbah[ke] && S.ppUbah[ke][f] !== undefined);
  const n = Object.keys(S.ppUbah).reduce((s, k) => s + Object.keys(S.ppUbah[k]).length, 0);
  const bar = $('#ppSimpanBar'); bar.classList.toggle('on', n > 0);
  bar.querySelector('button').textContent = 'Simpan Perubahan (' + n + ' sel)';
}
function simpanTabelProgram(btn){
  const daftar = [];
  for (const ke in S.ppUbah) {
    const d = Object.assign({ ke: Number(ke) }, S.ppUbah[ke]);
    if (d.kelancaran !== undefined) {
      const l = cekLancar(d.kelancaran);
      if (l === null) { toast('Prosentase kelancaran pertemuan ' + ke + ' harus angka 0–100.', 1); return; }
      d.kelancaran = l;
    }
    daftar.push(d);
  }
  if (!daftar.length) return;
  sibuk(btn, true);
  api('simpanIsiProgram', S.token, S.pp.program.id, daftar).then(m => {
    toast(m);
    daftar.forEach(d => { const x = S.pp.isi[d.ke - 1]; Object.keys(d).forEach(k => { if (k !== 'ke') x[k] = d[k]; }); });
    S.ppUbah = {}; renderProgram();
  }).catch(e => { toast(e.message, 1); sibuk(btn, false); });
}
function hapusProgramIni(){
  if (Object.keys(S.ppUbah || {}).length && !confirm('Ada perubahan yang belum disimpan. Tetap lanjutkan?')) return;
  if (!confirm('Hapus program pembelajaran ' + S.pp.program.jilid + '? Data yang sudah diisi tidak akan tampil lagi.')) return;
  api('hapusProgram', S.token, S.pp.program.id).then(m => { toast(m); S.ppId = null; S.pp = null; viewProgram(); }).catch(e => toast(e.message, 1));
}

// ---- lembar cetak & Excel (tata letak sama dengan file Excel)
function ppTabelCetak(denganLebar){
  const r = S.pp, pr = r.program; let h = '';
  const lebar = denganLebar ? `<colgroup><col style="width:6mm"><col style="width:46mm"><col style="width:15mm"><col style="width:16mm">${'<col>'.repeat(PP_BLOK)}</colgroup>` : '';
  for (let b = 0; b < PP_N / PP_BLOK; b++) {
    const a = b * PP_BLOK + 1, nomor = []; for (let p = a; p < a + PP_BLOK; p++) nomor.push(p);
    const akhir = b === PP_N / PP_BLOK - 1;
    h += `<table class="pc" border="1">${lebar}<tr><th rowspan="2">NO</th><th rowspan="2">MATERI</th><th rowspan="2">WAKTU</th><th rowspan="2">TEKNIK</th><th colspan="${PP_BLOK}">PERTEMUAN KE</th></tr>
      <tr>${nomor.map(p => `<th>${p}</th>`).join('')}</tr>
      ${PP_BARIS.filter(z => !z.akhir || akhir).map(z => `<tr><td>${z.no}</td><td class="mat">${esc(z.materi)}</td>
        <td class="wk">${z.w ? esc(pr[z.w]) : ''}</td><td class="wk">${z.t ? esc(pr[z.t]) : ''}</td>
        ${nomor.map(p => {
          const x = r.isi[p - 1];
          if (z.f === 'munaqosyah') return p > r.munaqosyah[1] ? '<td class="hitam" bgcolor="#000000"></td>' : `<td>${ppMunaq(p) && x.munaqosyah === 'Y' ? '&#10003;' : ''}</td>`;
          const v = x[z.f];
          return `<td>${v === '' || v == null ? '' : esc(z.f === 'kelancaran' ? v + '%' : v)}</td>`;
        }).join('')}</tr>`).join('')}</table>`;
  }
  return h;
}
function ppKepala(){
  const pr = S.pp.program;
  return `<h1>${ppJudul(pr)}</h1><h2>METODE TILAWATI</h2>
    <table class="pp-head"><tr><td>${pr.quran ? "AL-QUR'AN" : 'Jilid'}</td><td>: ${esc(pr.jilid)}</td></tr>
      <tr><td>Nama Ustadz</td><td>: ${esc(pr.nama_ustadz || '')}</td></tr>
      <tr><td>Kelompok</td><td>: ${esc(pr.kelompok || '')}</td></tr>${pr.periode ? `<tr><td>Periode</td><td>: ${esc(pr.periode)}</td></tr>` : ''}</table>`;
}
function cetakProgram(){
  if (!S.pp) return;
  pasangGayaCetak(); pasangGayaProgram();
  let wadah = $('#lembarCetak'); if (!wadah) { wadah = document.createElement('div'); wadah.id = 'lembarCetak'; document.body.appendChild(wadah); }
  wadah.innerHTML = `<div class="hal-pp">${ppKepala()}${ppTabelCetak(true)}</div>`;
  let hal = $('#gayaHalaman'); if (!hal) { hal = document.createElement('style'); hal.id = 'gayaHalaman'; document.head.appendChild(hal); }
  hal.textContent = '@page{size:A4 landscape;margin:0}';
  document.body.classList.add('cetak-kartu');
  const selesai = () => { document.body.classList.remove('cetak-kartu'); hal.textContent = ''; window.removeEventListener('afterprint', selesai); };
  window.addEventListener('afterprint', selesai);
  setTimeout(() => { window.print(); setTimeout(selesai, 1500); }, 150);
}
function namaFileProgram(ext){
  const pr = S.pp.program;
  return ('Program-Pembelajaran-' + pr.jilid + (pr.kelompok ? '-Kelompok-' + pr.kelompok : '')).replace(/[^A-Za-z0-9]+/g, '-').replace(/-+$/, '') + '.' + ext;
}
// ---- pembuat file .xlsx sederhana (tanpa pustaka luar)
function crc32(b){
  let t = crc32.t;
  if (!t) { t = crc32.t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } }
  let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = t[(c ^ b[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function zipSimpan(files){
  const enc = new TextEncoder(), lok = [], pusat = []; let off = 0;
  const u16 = n => [n & 255, (n >>> 8) & 255], u32 = n => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
  files.forEach(f => {
    const nama = enc.encode(f.nama), data = enc.encode(f.isi), crc = crc32(data);
    const h = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(nama.length), u16(0));
    lok.push(new Uint8Array(h), nama, data);
    pusat.push(new Uint8Array([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length),
      u16(nama.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off))), nama);
    off += h.length + nama.length + data.length;
  });
  const besarPusat = pusat.reduce((s, x) => s + x.length, 0);
  const akhir = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(besarPusat), u32(off), u16(0)));
  const semua = lok.concat(pusat, [akhir]), total = semua.reduce((s, x) => s + x.length, 0), out = new Uint8Array(total);
  let p = 0; semua.forEach(x => { out.set(x, p); p += x.length; });
  return out;
}
function xmlEsc(v){ return String(v == null ? '' : v).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c])); }
function kolomHuruf(i){ let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
/* lembar = { nama, lebar:[...], baris:[[{v, s}...]...], gabung:['A1:S1'], landscape } ; gaya s = indeks cellXfs */
function buatXlsx(lembar){
  const baris = lembar.baris.map((r, ri) => `<row r="${ri + 1}"${r.tinggi ? ` ht="${r.tinggi}" customHeight="1"` : ''}>${(r.sel || r).map((c, ci) => {
    if (!c) return '';
    const ref = kolomHuruf(ci) + (ri + 1), s = c.s ? ` s="${c.s}"` : '';
    if (c.v === '' || c.v == null) return `<c r="${ref}"${s}/>`;
    if (typeof c.v === 'number') return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
    return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEsc(c.v)}</t></is></c>`;
  }).join('')}</row>`).join('');
  const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><sheetViews><sheetView workbookViewId="0" showGridLines="0"/></sheetViews>
<cols>${lembar.lebar.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>
<sheetData>${baris}</sheetData>
${lembar.gabung.length ? `<mergeCells count="${lembar.gabung.length}">${lembar.gabung.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="${lembar.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="1"/>
</worksheet>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="3"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="12"/><name val="Calibri"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF000000"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  return zipSimpan([
    { nama: '[Content_Types].xml', isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>` },
    { nama: '_rels/.rels', isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { nama: 'xl/workbook.xml', isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${xmlEsc(lembar.nama)}" sheetId="1" r:id="rId1"/></sheets></workbook>` },
    { nama: 'xl/_rels/workbook.xml.rels', isi: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { nama: 'xl/styles.xml', isi: styles },
    { nama: 'xl/worksheets/sheet1.xml', isi: sheet }
  ]);
}
function keBase64(u8){ let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

function unduhProgramExcel(){
  if (!S.pp) return;
  const r = S.pp, pr = r.program, baris = [], gabung = [];
  const N = 4 + PP_BLOK, akhirKol = kolomHuruf(N - 1);
  const kosongBaris = () => { const a = []; for (let i = 0; i < N; i++) a.push(null); return a; };
  let b0 = kosongBaris(); b0[0] = { v: ppJudul(pr), s: 1 }; baris.push({ sel: b0, tinggi: 20 }); gabung.push('A1:' + akhirKol + '1');
  b0 = kosongBaris(); b0[0] = { v: 'METODE TILAWATI', s: 1 }; baris.push({ sel: b0, tinggi: 18 }); gabung.push('A2:' + akhirKol + '2');
  [[pr.quran ? "AL-QUR'AN" : 'Jilid', pr.jilid], ['Nama Ustadz', pr.nama_ustadz], ['Kelompok', pr.kelompok]].concat(pr.periode ? [['Periode', pr.periode]] : [])
    .forEach(([k, v]) => { const a = kosongBaris(); a[1] = { v: k, s: 6 }; a[2] = { v: ': ' + (v || ''), s: 6 }; baris.push(a); });
  baris.push(kosongBaris());
  for (let b = 0; b < PP_N / PP_BLOK; b++) {
    const a0 = b * PP_BLOK + 1, akhir = b === PP_N / PP_BLOK - 1, r1 = baris.length + 1;
    const h1 = kosongBaris(), h2 = kosongBaris();
    ['NO', 'MATERI', 'WAKTU', 'TEKNIK'].forEach((t, i) => { h1[i] = { v: t, s: 4 }; h2[i] = { v: '', s: 4 }; gabung.push(kolomHuruf(i) + r1 + ':' + kolomHuruf(i) + (r1 + 1)); });
    for (let i = 0; i < PP_BLOK; i++) { h1[4 + i] = { v: i ? '' : 'PERTEMUAN KE', s: 4 }; h2[4 + i] = { v: a0 + i, s: 4 }; }
    gabung.push('E' + r1 + ':' + akhirKol + r1);
    baris.push(h1, h2);
    PP_BARIS.filter(z => !z.akhir || akhir).forEach(z => {
      const a = kosongBaris();
      a[0] = { v: z.no, s: 2 }; a[1] = { v: z.materi, s: 3 }; a[2] = { v: z.w ? pr[z.w] : '', s: 3 }; a[3] = { v: z.t ? pr[z.t] : '', s: 3 };
      for (let i = 0; i < PP_BLOK; i++) {
        const p = a0 + i, x = r.isi[p - 1];
        if (z.f === 'munaqosyah') a[4 + i] = p > r.munaqosyah[1] ? { v: '', s: 5 } : { v: ppMunaq(p) && x.munaqosyah === 'Y' ? '✓' : '', s: 2 };
        else { const v = x[z.f]; a[4 + i] = { v: v === '' || v == null ? '' : (z.f === 'kelancaran' ? v + '%' : String(v)), s: 2 }; }
      }
      baris.push(a);
    });
    baris.push(kosongBaris());
  }
  const lebar = [4.5, 31, 9.5, 10.5].concat(new Array(PP_BLOK).fill(6.3));
  const data = buatXlsx({ nama: 'Program Pembelajaran', lebar: lebar, baris: baris, gabung: gabung, landscape: true });
  const a = document.createElement('a');
  a.href = 'data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,' + keBase64(data);
  a.download = namaFileProgram('xlsx');
  document.body.appendChild(a); a.click(); a.remove();
  toast('File Excel diunduh.');
}

/* ===================== MULAI ===================== */
try {
  $('#lgVersi').textContent = 'Versi ' + VERSI;
  (function(){
    const t = ambilToken();
    if (!t) return tampilLogin();
    S.token = t;
    const c = ambilCache();
    if (c) mulai(c.r, true); else { $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); memuat('#isi'); }
    api('getAwal', t).then(r => { mulai(r); tawarkanPasang(); }).catch(e => {
      if (String(e.message).indexOf('Sesi') >= 0 || !c) { simpanToken(null); hapusCache(); tampilLogin(); if (String(e.message).indexOf('Sesi') < 0) toast(e.message, 1); }
      else { $('#sinkron').classList.remove('on'); toast('Tidak dapat terhubung. Menampilkan data terakhir.', 1); }
    });
  })();
  window.__siap = true;
  const sp = document.getElementById('splash'); if (sp) sp.remove();
} catch (e) { tampilGalat(e.message); }

/* Versi server berbeda dengan tampilan yang sedang terbuka: muat ulang sekali agar berkas terbaru dipakai. */
function perbaruiKodeKlien(versiServer){
  let sudah = '';
  try { sudah = sessionStorage.getItem('tpqbu_segar') || ''; } catch (e) {}
  if (sudah === versiServer) return;
  try { sessionStorage.setItem('tpqbu_segar', versiServer); localStorage.removeItem('tpqbu_cache'); } catch (e) {}
  toast('Memperbarui aplikasi ke versi ' + versiServer + '…');
  const muatUlang = () => location.reload();
  if ('caches' in window) caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).then(muatUlang, muatUlang);
  else setTimeout(muatUlang, 300);
}
