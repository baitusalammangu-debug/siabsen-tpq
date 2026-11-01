// =====================================================================
//  SiAbsen TPQ Bahrul Ulum — server (Cloudflare Pages Functions + D1)
//  Logika aplikasi dipindah dari Google Apps Script (Kode.gs versi 5.3).
// =====================================================================
import { TABEL } from './tabel.js';
import {
  baca_, cari_, tambah_, ubah_, hapusBaris_, simpanFotoData_, hapusFotoData_, fotoDataUrl_, fotoBanyak_,
  CacheService, PropertiesService, LockService, Logger, Utilities, aturNormalisasi_, bersihkanKv_
} from './lapisan.js';

const NAMA_APLIKASI = 'SiAbsen TPQ Bahrul Ulum';
const VERSI = '6.0';
const TZ = 'Asia/Jakarta';

// Susunan kolom tiap lembar. Kolom dibaca berdasarkan JUDUL kolom (baris 1),
// jadi urutan kolom di Google Sheets boleh diubah. Kolom yang belum ada
// akan ditambahkan otomatis di sebelah kanan.
const LABEL = {
  username: 'Username', password: 'Password', nama: 'Nama', peran: 'Peran', kelas: 'Jilid',
  hp: 'No. HP', aktif: 'Aktif (Y/N)', nis: 'NIS', jk: 'Jenis Kelamin', nama_wali: 'Nama Wali', hp_wali: 'HP Wali',
  tanggal: 'Tanggal', status: 'Status', jam: 'Jam', keterangan: 'Keterangan', dicatat: 'Dicatat Pada',
  guru: 'Guru', id: 'ID', nama_guru: 'Nama Guru', materi: 'Materi', kegiatan: 'Kegiatan', catatan: 'Catatan',
  jenis: 'Jenis', posisi: 'Capaian (Jilid/Surat/Hal.)', nilai: 'Nilai', judul: 'Judul', isi: 'Isi', oleh: 'Oleh',
  kunci: 'Kunci', tanggal_masuk: 'Tanggal Masuk', kewarganegaraan: 'Kewarganegaraan', tanggal_lahir: 'Tanggal Lahir',
  nik: 'NIK', tempat_lahir: 'Tempat Lahir', agama: 'Agama', nama_ayah: 'Nama Ayah Kandung',
  status_ayah: 'Status Ayah Kandung', nama_ibu: 'Nama Ibu Kandung', status_ibu: 'Status Ibu Kandung',
  status_wali: 'Status Wali', alamat: 'Alamat', syahriyah: 'Syahriyah per Bulan (Rp)', foto: 'Foto (ID Google Drive)',
  pendidikan: 'Pendidikan Terakhir', mulai_mengajar: 'Mulai Mengajar', jabatan: 'Jabatan',
  sertifikasi: 'Sertifikat Tilawati', kategori: 'Kategori', bulan: 'Bulan', nominal: 'Nominal (Rp)', metode: 'Metode Bayar', penerima: 'Penerima'
};

// Nama lain judul kolom yang tetap dikenali (versi lama / ketikan manual)
const ALIAS = {
  kelas: ['kelas', 'jilid', 'tingkat', 'jilid diampu'],
  nama: ['nama', 'nama lengkap'],
  hp: ['no. hp', 'no hp', 'no handphone', 'hp'],
  jk: ['l/p', 'jenis kelamin', 'jk'],
  hp_wali: ['hp wali', 'no hp wali', 'no. hp wali'],
  peran: ['peran', 'peran (admin/guru)', 'peran (admin/guru/bendahara)']
};

// Tingkatan santri metode Tilawati (urutan = urutan kenaikan).
// Daftar ini disimpan di lembar Pengaturan (kunci: daftar_jilid) dan
// otomatis bertambah "Jilid Al-Qur'an 4, 5, ..." saat ada kenaikan.
const JILID_AWAL = ['Jilid PAUD', 'Jilid 1', 'Jilid 2', 'Jilid 3', 'Jilid 4', 'Jilid 5', 'Jilid 6',
                    "Jilid Al-Qur'an 1", "Jilid Al-Qur'an 2", "Jilid Al-Qur'an 3"];

// DRAF target materi per jilid (metode Tilawati + materi penunjang TPQ).
// Silakan disesuaikan dengan buku panduan Tilawati & kurikulum TPQ lewat
// menu "Target Materi" (admin) atau langsung di lembar "Target Jilid".
const TARGET_AWAL = {
  'Jilid PAUD': [
    ['Bacaan', 'Mengenal huruf hijaiyah alif–ya', 'Menyebut dan menunjuk huruf hijaiyah tunggal dengan peraga/lagu'],
    ['Bacaan', 'Menirukan pelafalan huruf', 'Melafalkan huruf hijaiyah sesuai contoh ustadz/ustadzah'],
    ['Hafalan Surat', 'Al-Fatihah, An-Nas, Al-Falaq, Al-Ikhlas', 'Hafal dengan bacaan benar'],
    ['Doa Harian', 'Doa sebelum & sesudah makan, sebelum & bangun tidur', 'Hafal dan terbiasa membaca'],
    ['Praktik Ibadah', 'Adab sehari-hari & wudhu sederhana', 'Mengucap salam, berdoa, menirukan gerakan wudhu']
  ],
  'Jilid 1': [
    ['Bacaan', 'Huruf hijaiyah tunggal berharakat fathah', 'Membaca alif–ya lancar dan tartil tanpa mengeja'],
    ['Bacaan', 'Membedakan huruf yang mirip', 'Tepat membedakan bentuk & bunyi (ba-ta-tsa, ha-kho-jim, dal-dzal, dll.)'],
    ['Bacaan', 'Huruf sambung berharakat fathah', 'Membaca rangkaian 2–3 huruf sambung dengan lancar'],
    ['Hafalan Surat', 'Al-Lahab, An-Nashr, Al-Kafirun', 'Hafal dengan bacaan benar'],
    ['Doa Harian', 'Doa masuk/keluar kamar mandi & keluar rumah', 'Hafal dan terbiasa membaca'],
    ['Praktik Ibadah', 'Tata cara wudhu', 'Urutan wudhu dan doa setelah wudhu benar']
  ],
  'Jilid 2': [
    ['Bacaan', 'Huruf sambung awal, tengah, akhir', 'Membaca bentuk sambung dengan lancar'],
    ['Bacaan', 'Harakat kasrah dan dhammah', 'Membaca huruf berharakat kasrah & dhammah dengan benar'],
    ['Bacaan', 'Tanwin: fathatain, kasratain, dhammatain', 'Membaca bacaan bertanwin dengan benar'],
    ['Bacaan', 'Angka Arab', 'Mengenal dan membaca angka Arab'],
    ['Hafalan Surat', "Al-Kautsar, Al-Ma'un, Quraisy", 'Hafal dengan bacaan benar'],
    ['Doa Harian', 'Doa masuk & keluar masjid, naik kendaraan', 'Hafal dan terbiasa membaca'],
    ['Praktik Ibadah', 'Gerakan & bacaan sholat dasar', 'Takbiratul ihram sampai Al-Fatihah benar']
  ],
  'Jilid 3': [
    ['Bacaan', "Bacaan panjang (mad thabi'i)", 'Fathah berdiri, kasrah berdiri, dhammah terbalik dibaca 2 harakat'],
    ['Bacaan', 'Mad dengan alif, ya sukun, wawu sukun', 'Panjang-pendek bacaan tepat'],
    ['Bacaan', 'Huruf sukun (mati) dasar', 'Membaca huruf sukun dengan jelas'],
    ['Hafalan Surat', "Al-Fil, Al-Humazah, Al-'Ashr", 'Hafal dengan bacaan benar'],
    ['Doa Harian', 'Doa sebelum & sesudah belajar', 'Hafal dan terbiasa membaca'],
    ['Praktik Ibadah', 'Bacaan sholat lengkap', 'Hafal bacaan sholat dari takbir sampai salam']
  ],
  'Jilid 4': [
    ['Bacaan', 'Huruf sukun & qalqalah', 'Membaca qalqalah (ba, jim, dal, tho, qof) dengan pantulan tepat'],
    ['Bacaan', 'Tasydid', 'Membaca huruf bertasydid dengan tekanan tepat'],
    ['Bacaan', 'Ghunnah: nun & mim bertasydid', 'Dengung 2–3 harakat dengan tepat'],
    ['Bacaan', 'Lafadz Allah (tafkhim & tarqiq)', 'Membedakan bacaan tebal dan tipis'],
    ['Hafalan Surat', "At-Takatsur, Al-Qari'ah, Al-'Adiyat", 'Hafal dengan bacaan benar'],
    ['Doa Harian', 'Doa setelah adzan & doa ketika turun hujan', 'Hafal dan terbiasa membaca'],
    ['Praktik Ibadah', 'Adzan & iqamah, sholat berjamaah', 'Lafal adzan/iqamah benar, tertib makmum']
  ],
  'Jilid 5': [
    ['Bacaan', 'Alif lam syamsiyah & qamariyah', 'Membedakan dan membaca dengan benar'],
    ['Bacaan', 'Hukum nun sukun & tanwin', 'Izhar, idgham, iqlab, ikhfa dibaca tepat'],
    ['Bacaan', 'Hukum mim sukun', 'Ikhfa syafawi, idgham mimi, izhar syafawi tepat'],
    ['Bacaan', 'Mad wajib muttashil & mad jaiz munfashil', 'Panjang bacaan sesuai ketentuan'],
    ['Bacaan', 'Waqaf di akhir kalimat', 'Berhenti dengan benar (sukun / mad ’iwadh)'],
    ['Hafalan Surat', 'Az-Zalzalah, Al-Bayyinah, Al-Qadr', 'Hafal dengan bacaan benar'],
    ['Doa Harian', 'Doa bercermin & berpakaian', 'Hafal dan terbiasa membaca'],
    ['Praktik Ibadah', 'Sholat sunnah dhuha & rawatib', 'Niat dan tata cara benar']
  ],
  'Jilid 6': [
    ['Bacaan', 'Tanda-tanda waqaf', 'Memahami dan menerapkan tanda waqaf dalam Al-Qur’an'],
    ['Bacaan', 'Huruf muqatta’ah (fawatihus suwar)', 'Membaca huruf pembuka surat dengan benar'],
    ['Bacaan', 'Bacaan gharib dasar', 'Mengenal bacaan yang tidak biasa (musykilat) dasar'],
    ['Bacaan', 'Tartil dengan lagu Rost', 'Membaca ayat pilihan dengan tartil dan lagu Rost'],
    ['Bacaan', 'Siap tes kenaikan ke Al-Qur’an', 'Lulus munaqosyah/tes kenaikan jilid'],
    ['Hafalan Surat', "Al-'Alaq, At-Tin, Asy-Syarh, Adh-Dhuha", 'Hafal dengan bacaan benar'],
    ['Doa Harian', 'Doa setelah sholat & doa sapu jagad', 'Hafal dan terbiasa membaca'],
    ['Praktik Ibadah', 'Tayammum', 'Tata cara tayammum benar']
  ],
  "Jilid Al-Qur'an 1": [
    ['Tadarus', 'Juz 1–10', 'Membaca tartil dengan tajwid benar'],
    ['Tajwid', 'Penerapan hukum nun/mim sukun & mad', 'Diterapkan konsisten saat tadarus'],
    ['Hafalan Surat', "Al-Lail s.d. Al-A'la", 'Hafal dengan bacaan benar'],
    ['Doa Harian', 'Doa-doa harian lanjutan', 'Hafal dan terbiasa membaca']
  ],
  "Jilid Al-Qur'an 2": [
    ['Tadarus', 'Juz 11–20', 'Membaca tartil dengan tajwid benar'],
    ['Ghorib', 'Imalah, isymam, saktah, naql, tashil', 'Membaca bacaan gharib dengan benar'],
    ['Tajwid', "Mad far'i lanjutan", 'Panjang bacaan sesuai ketentuan'],
    ['Hafalan Surat', 'Al-Ghasyiyah s.d. Al-Muthaffifin', 'Hafal dengan bacaan benar']
  ],
  "Jilid Al-Qur'an 3": [
    ['Tadarus', 'Juz 21–30 hingga khatam', 'Khatam Al-Qur’an dengan tartil'],
    ['Tajwid', 'Persiapan munaqosyah', 'Lulus munaqosyah / tes akhir'],
    ['Hafalan Surat', "Al-Infithar s.d. An-Naba'", 'Hafal dengan bacaan benar'],
    ['Doa Harian', 'Doa khatam Al-Qur’an', 'Hafal dan fasih membaca']
  ]
};

const KATEGORI_BERITA = ['Berita', 'Pengumuman', 'Agenda', 'Prestasi', 'Info'];

const STATUS_GURU = ['Hadir', 'Izin', 'Sakit'];
const STATUS_SANTRI = ['Hadir', 'Izin', 'Sakit', 'Alpa'];

// ===================== SETUP =====================

function isiContoh_(k) {
  const contoh = {
    guru: [
      { username: 'admin', password: 'admin123', nama: 'Kepala TPQ', peran: 'admin', jabatan: 'Kepala TPQ', aktif: 'Y' },
      { username: 'ustadzah.contoh', password: 'guru123', nama: 'Ustadzah Contoh', peran: 'guru', kelas: 'Jilid 1',
        jk: 'P', jabatan: 'Ustadzah', sertifikasi: 'Sudah', aktif: 'Y' }
    ],
    santri: [
      { nis: '0001', password: 'santri0001', nama: 'Ahmad Contoh', kelas: 'Jilid 1', jk: 'L', tanggal_masuk: hariIni_(),
        kewarganegaraan: 'WNI', agama: 'Islam', tempat_lahir: 'Kediri', nama_ayah: 'Bapak Contoh', status_ayah: 'Masih Hidup',
        nama_ibu: 'Ibu Contoh', status_ibu: 'Masih Hidup', status_wali: 'Ayah Kandung', nama_wali: 'Bapak Contoh', aktif: 'Y' },
      { nis: '0002', password: 'santri0002', nama: 'Aisyah Contoh', kelas: 'Jilid 1', jk: 'P', tanggal_masuk: hariIni_(),
        kewarganegaraan: 'WNI', agama: 'Islam', tempat_lahir: 'Kediri', nama_ayah: 'Bapak Contoh 2', status_ayah: 'Masih Hidup',
        nama_ibu: 'Ibu Contoh 2', status_ibu: 'Masih Hidup', status_wali: 'Ibu Kandung', nama_wali: 'Ibu Contoh 2', aktif: 'Y' }
    ],
    pengaturan: [
      { kunci: 'nama_tpq', nilai: 'TPQ Bahrul Ulum' },
      { kunci: 'alamat', nilai: 'Kapi, Kunjang, Kediri' },
      { kunci: 'metode', nilai: 'Tilawati' },
      { kunci: 'daftar_jilid', nilai: JILID_AWAL.join(', ') },
      { kunci: 'syahriyah_default', nilai: '' },
      { kunci: 'syahriyah_mulai', nilai: hariIni_().slice(0, 7) }
    ],
    pengumuman: [
      { id: idBaru_(), tanggal: hariIni_(), kategori: 'Info', judul: 'Selamat datang di SiAbsen TPQ Bahrul Ulum',
        isi: 'Aplikasi absensi, jurnal mengajar, perkembangan santri, dan syahriyah TPQ Bahrul Ulum sudah bisa digunakan.',
        sematkan: 'Y', oleh: 'Kepala TPQ', aktif: 'Y' }
    ]
  };
  if (k === 'target') {
    const rows = [];
    Object.keys(TARGET_AWAL).forEach(function (j) {
      TARGET_AWAL[j].forEach(function (t, i) {
        rows.push({ id: idBaru_(), jilid: j, urutan: String(i + 1), kategori: t[0], materi: t[1], indikator: t[2], aktif: 'Y' });
      });
    });
    tambah_('target', rows);
  }
  if (contoh[k]) tambah_(k, contoh[k]);
}

// ===================== UTILITAS =====================

function hariIni_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function sekarang_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss'); }
function jam_() { return Utilities.formatDate(new Date(), TZ, 'HH:mm'); }
function idBaru_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function aktif_(r) { return String(r.aktif || 'Y').toUpperCase() !== 'N'; }

function str_(v, kolom) {
  if (v instanceof Date) {
    if (kolom === 'jam') return Utilities.formatDate(v, TZ, 'HH:mm');
    if (kolom === 'dicatat') return Utilities.formatDate(v, TZ, 'yyyy-MM-dd HH:mm:ss');
    return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  }
  let t = v === null || v === undefined ? '' : String(v).trim();
  if (/^tanggal|mulai_mengajar/.test(kolom || '')) {
    const m = /^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/.exec(t);
    if (m) t = m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  }
  return t;
}

function bersih_(v, max) {
  return String(v === undefined || v === null ? '' : v).trim().slice(0, max || 500);
}

function aman_(v) { return v === undefined || v === null ? '' : String(v); }

function labelKolom_(k, c) {
  return (TABEL[k].label && TABEL[k].label[c]) || LABEL[c] || c;
}

function kandidat_(k, c) {
  return [labelKolom_(k, c), LABEL[c] || '', c].concat(ALIAS[c] || [])
    .map(function (x) { return String(x).trim().toLowerCase(); });
}

// ===================== PENYIMPANAN =====================
// Data disimpan di Cloudflare D1 (lihat lapisan.js).

// samakan penulisan jilid ("JILID PAUD", "Jilid Al Quran 1", ...) dengan daftar resmi
function normalJilid_(k, rows) {
  if (k === 'santri' || k === 'absensi_santri') rows.forEach(function (r) { r.kelas = kanonJilid_(r.kelas); });
  else if (k === 'target' || k === 'ketuntasan') rows.forEach(function (r) { r.jilid = kanonJilid_(r.jilid); });
  else if (k === 'guru') rows.forEach(function (r) { r.kelas = jilidGuru_(r.kelas).map(kanonJilid_).join(', '); });
  return rows;
}

function kunciJilid_(j) { return String(j || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
let PETA_JILID_ = null;
function kanonJilid_(j) {
  if (!j) return j;
  if (!PETA_JILID_) {
    PETA_JILID_ = {};
    daftarJilid_().forEach(function (x) { PETA_JILID_[kunciJilid_(x)] = x; });
  }
  return PETA_JILID_[kunciJilid_(j)] || String(j).trim();
}

function kunci_(fn) { return fn(); }

function cekTanggal_(t) {
  t = String(t || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error('Tanggal tidak valid.');
  if (t > hariIni_()) throw new Error('Tidak bisa mengisi untuk tanggal yang akan datang.');
  return t;
}
function cekBulan_(b) {
  b = String(b || '');
  if (!/^\d{4}-\d{2}$/.test(b)) throw new Error('Bulan tidak valid.');
  return b;
}
function urutBaru_(a, b) { return (b.tanggal + b.dicatat).localeCompare(a.tanggal + a.dicatat); }

// ===================== KEAMANAN =====================

function garam_() {
  const p = PropertiesService.getScriptProperties();
  let g = p.getProperty('GARAM');
  if (!g) { g = Utilities.getUuid(); p.setProperty('GARAM', g); }
  return g;
}

function hash_(pw) {
  const b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, garam_() + '|' + pw, Utilities.Charset.UTF_8);
  return 'sha256:' + b.map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); }).join('');
}

// Password boleh diketik biasa di Google Sheets; saat pertama dipakai login
// akan otomatis diubah menjadi kode acak (hash) agar tidak terbaca.
function cocokPw_(k, r, input) {
  const tersimpan = String(r.password || '');
  if (!tersimpan || !input) return false;
  if (tersimpan.indexOf('sha256:') === 0) return tersimpan === hash_(input);
  if (tersimpan === input) {
    r.password = hash_(input);
    ubah_(k, r);
    return true;
  }
  return false;
}

// Bendahara memiliki semua akses guru ditambah syahriyah
function punyaPeran_(u, boleh) {
  if (!boleh) return true;
  if (boleh.indexOf(u.peran) >= 0) return true;
  return u.peran === 'bendahara' && boleh.indexOf('guru') >= 0;
}

function normalPeran_(p) {
  p = String(p || '').toLowerCase();
  return p === 'admin' || p === 'bendahara' ? p : 'guru';
}

function buatSesi_(user) {
  const t = Utilities.getUuid() + Utilities.getUuid();
  user.t = Date.now();
  CacheService.getScriptCache().put('sesi_' + t, JSON.stringify(user), 21600);
  return t;
}

function sesi_(token, peranBoleh) {
  const cache = CacheService.getScriptCache();
  const raw = token ? cache.get('sesi_' + token) : null;
  if (!raw) throw new Error('SESI_HABIS');
  const u = JSON.parse(raw);
  if (!punyaPeran_(u, peranBoleh)) throw new Error('Anda tidak punya akses ke fitur ini.');
  if (!u.t || Date.now() - u.t > 3600000) { u.t = Date.now(); cache.put('sesi_' + token, JSON.stringify(u), 21600); }
  return u;
}

// ===================== AKUN =====================

async function login(username, password) {
  username = bersih_(username, 60).toLowerCase();
  password = String(password || '');
  if (!username || !password) throw new Error('Isi username/NIS dan password.');
  const cache = CacheService.getScriptCache();
  const kGagal = 'gagal_' + username;
  const gagal = Number(cache.get(kGagal) || 0);
  if (gagal >= 5) throw new Error('Terlalu banyak percobaan salah. Coba lagi 10 menit lagi.');

  let user = null;
  const g = baca_('guru').filter(aktif_).find(function (r) { return r.username.toLowerCase() === username; });
  if (g) {
    if (cocokPw_('guru', g, password)) {
      user = { id: g.username, nama: g.nama, peran: normalPeran_(g.peran), kelas: g.kelas };
    }
  } else {
    const s = baca_('santri').filter(aktif_).find(function (r) { return r.nis.toLowerCase() === username; });
    if (s && cocokPw_('santri', s, password)) {
      user = { id: s.nis, nama: s.nama, peran: 'santri', kelas: s.kelas };
    }
  }
  if (!user) {
    cache.put(kGagal, String(gagal + 1), 600);
    throw new Error('Username/NIS atau password salah.');
  }
  cache.remove(kGagal);
  const token = buatSesi_(user);
  bersihkanKv_();
  return { token: token, user: user, awal: await getAwal(token) };
}

function logout(token) {
  if (token) CacheService.getScriptCache().remove('sesi_' + token);
  return true;
}

function gantiPassword(token, lama, baru) {
  const u = sesi_(token);
  baru = String(baru || '');
  if (baru.length < 6) throw new Error('Password baru minimal 6 karakter.');
  return kunci_(function () {
    const k = u.peran === 'santri' ? 'santri' : 'guru';
    const kolomId = k === 'santri' ? 'nis' : 'username';
    const r = baca_(k).find(function (x) { return x[kolomId] === u.id; });
    if (!r || !cocokPw_(k, r, String(lama || ''))) throw new Error('Password lama salah.');
    r.password = hash_(baru);
    ubah_(k, r);
    return 'Password berhasil diganti.';
  });
}

// ===================== DATA AWAL =====================

function pengaturan_() {
  const o = { nama_tpq: 'TPQ Bahrul Ulum', alamat: 'Kapi, Kunjang, Kediri' };
  try { baca_('pengaturan').forEach(function (r) { if (r.kunci) o[r.kunci] = r.nilai; }); } catch (e) {}
  return o;
}

function pastikanPengaturan_(kunci, nilai) {
  const ada = baca_('pengaturan').some(function (r) { return r.kunci === kunci; });
  if (!ada) tambah_('pengaturan', [{ kunci: kunci, nilai: nilai }]);
}

// Daftar jilid resmi sesuai urutan kenaikan
function daftarJilid_() {
  const r = baca_('pengaturan').find(function (x) { return x.kunci === 'daftar_jilid'; });
  const list = r ? r.nilai.split(',').map(function (x) { return x.trim(); }).filter(String) : [];
  return list.length ? list : JILID_AWAL.slice();
}

function simpanDaftarJilid_(list) {
  PETA_JILID_ = null;
  const r = baca_('pengaturan').find(function (x) { return x.kunci === 'daftar_jilid'; });
  if (r) { r.nilai = list.join(', '); ubah_('pengaturan', r); }
  else tambah_('pengaturan', [{ kunci: 'daftar_jilid', nilai: list.join(', ') }]);
}

function jilidQuranBerikutnya_(list) {
  let maks = 0;
  list.forEach(function (k) {
    const m = /al-qur'?an\s*(\d+)/i.exec(k);
    if (m) maks = Math.max(maks, Number(m[1]));
  });
  return "Jilid Al-Qur'an " + (maks + 1);
}

// Semua jilid berurutan + kelas lain yang terlanjur ditulis di lembar Santri
function daftarKelas_() {
  const list = daftarJilid_();
  baca_('santri').forEach(function (s) {
    if (aktif_(s) && s.kelas && list.indexOf(s.kelas) < 0) list.push(s.kelas);
  });
  return list;
}

function urutan_() {
  const u = {};
  daftarKelas_().forEach(function (k, i) { u[k] = i; });
  return function (a, b) {
    const ia = u[a.kelas] === undefined ? 999 : u[a.kelas], ib = u[b.kelas] === undefined ? 999 : u[b.kelas];
    return ia - ib || a.nama.localeCompare(b.nama);
  };
}

// "Jilid 1, Jilid 3" -> ['Jilid 1', 'Jilid 3']
function jilidGuru_(v) {
  return String(v || '').split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(String);
}

// jilid -> daftar nama guru pengampu
function pengampu_() {
  const m = {};
  baca_('guru').filter(aktif_).forEach(function (g) {
    jilidGuru_(g.kelas).forEach(function (k) { (m[k] = m[k] || []).push(g.nama); });
  });
  return m;
}

function jumlahPerKelas_() {
  const n = {};
  baca_('santri').forEach(function (s) { if (aktif_(s) && s.kelas) n[s.kelas] = (n[s.kelas] || 0) + 1; });
  return n;
}

function pengumuman_() {
  return baca_('pengumuman').filter(aktif_)
    .sort(function (a, b) {
      const pa = a.sematkan === 'Y' ? 1 : 0, pb = b.sematkan === 'Y' ? 1 : 0;
      return pb - pa || b.tanggal.localeCompare(a.tanggal) || b._baris - a._baris;
    })
    .slice(0, 30)
    .map(function (p) {
      return { id: p.id, tanggal: p.tanggal, kategori: p.kategori || 'Info', judul: p.judul, isi: p.isi, oleh: p.oleh,
               sematkan: p.sematkan === 'Y', adaGambar: !!p.gambar };
    });
}

async function getAwal(token) {
  const u = sesi_(token);
  const hari = hariIni_();
  const res = { versi: VERSI, user: u, info: pengaturan_(), hariIni: hari, pengumuman: pengumuman_() };
  if (u.peran === 'santri') {
    res.santriData = await dataSantri_(u, hari.slice(0, 7));
    return res;
  }
  res.kelas = daftarKelas_();
  res.jumlah = jumlahPerKelas_();
  const guru = baca_('guru');
  const g = guru.find(function (x) { return x.username === u.id; });
  res.jilidSaya = jilidGuru_(g ? g.kelas : u.kelas);
  res.pengampu = pengampu_();
  const targets = targetAktif_(), tuntas = petaTuntas_();
  const aktif = baca_('santri').filter(aktif_);
  res.santri = aktif.map(function (s) { return { nis: s.nis, nama: s.nama, kelas: s.kelas, persen: persenSantri_(s, targets, tuntas) }; })
    .sort(function (a, b) { return a.nama.localeCompare(b.nama); });
  const absGuru = await cari_('absensi_guru', 'tanggal = ?', [hari]);
  const a = absGuru.find(function (r) { return r.username === u.id; });
  res.absenSaya = a ? { status: a.status, jam: a.jam, keterangan: a.keterangan } : null;
  const absSantri = await cari_('absensi_santri', 'tanggal = ?', [hari]);
  const jilidTerabsen = {};
  absSantri.forEach(function (r) { jilidTerabsen[r.kelas] = 1; });
  const guruAktif = guru.filter(aktif_);
  res.ringkas = {
    santri: aktif.length,
    guru: guruAktif.length,
    guruHadir: absGuru.filter(function (r) { return r.status === 'Hadir'; }).length,
    santriHadir: absSantri.filter(function (r) { return r.status === 'Hadir'; }).length,
    santriTercatat: absSantri.length,
    jilidTerabsen: Object.keys(jilidTerabsen)
  };
  if (u.peran === 'admin') {
    const sudah = {};
    absGuru.forEach(function (r) { sudah[r.username] = r; });
    res.ringkas.guruHariIni = absGuru.map(function (r) { return { nama: r.nama, status: r.status, jam: r.jam, keterangan: r.keterangan }; });
    res.ringkas.guruBelum = guruAktif.filter(function (x) { return !sudah[x.username]; }).map(function (x) { return x.nama; });
  }
  if (u.peran === 'admin' || u.peran === 'bendahara') {
    const sy = hitungSyahriyah_(hari.slice(0, 7), '');
    res.ringkas.syahriyah = { target: sy.ringkas.target, diterima: sy.ringkas.diterima, lunas: sy.ringkas.lunas, belum: sy.ringkas.belum };
  }
  return res;
}

// ===================== ABSENSI GURU =====================

async function absenGuru(token, status, keterangan) {
  const u = sesi_(token, ['guru', 'admin']);
  if (STATUS_GURU.indexOf(status) < 0) throw new Error('Status tidak valid.');
  keterangan = bersih_(keterangan, 200);
  if (status !== 'Hadir' && !keterangan) throw new Error('Keterangan wajib diisi untuk ' + status + '.');
  return kunci_(async function () {
    const t = hariIni_();
    const ada = (await cari_('absensi_guru', 'tanggal = ? AND username = ?', [t, u.id]))[0];
    const o = {
      tanggal: t, username: u.id, nama: u.nama, status: status,
      jam: (ada && ada.status === 'Hadir' && status === 'Hadir') ? ada.jam : jam_(),
      keterangan: keterangan, dicatat: sekarang_()
    };
    if (ada) { o._baris = ada._baris; ubah_('absensi_guru', o); } else { tambah_('absensi_guru', [o]); }
    return { status: o.status, jam: o.jam, keterangan: o.keterangan };
  });
}

// ===================== ABSENSI SANTRI =====================

// absensi untuk 1 tanggal
function absensiTanggal_(tanggal) {
  return cari_('absensi_santri', 'tanggal = ?', [tanggal]);
}

async function getAbsensiKelas(token, kelas, tanggal) {
  sesi_(token, ['guru', 'admin']);
  kelas = kanonJilid_(kelas);
  tanggal = cekTanggal_(tanggal);
  const santri = baca_('santri').filter(function (s) { return aktif_(s) && s.kelas === kelas; })
    .sort(function (a, b) { return a.nama.localeCompare(b.nama); });
  const abs = {};
  (await absensiTanggal_(tanggal)).forEach(function (r) { abs[r.nis] = r; });
  return santri.map(function (s) {
    const a = abs[s.nis];
    return { nis: s.nis, nama: s.nama, jk: s.jk, status: a ? a.status : '', keterangan: a ? a.keterangan : '' };
  });
}

async function simpanAbsensiSantri(token, tanggal, daftar) {
  const u = sesi_(token, ['guru', 'admin']);
  tanggal = cekTanggal_(tanggal);
  return kunci_(async function () {
    const santri = {};
    baca_('santri').forEach(function (s) { santri[s.nis] = s; });
    const ada = {};
    (await absensiTanggal_(tanggal)).forEach(function (r) { ada[r.nis] = r; });
    const baru = [];
    let n = 0;
    (daftar || []).forEach(function (d) {
      const s = santri[d.nis];
      if (!s || STATUS_SANTRI.indexOf(d.status) < 0) return;
      const o = {
        tanggal: tanggal, nis: s.nis, nama: s.nama, kelas: s.kelas, status: d.status,
        keterangan: bersih_(d.keterangan, 200), guru: u.nama, dicatat: sekarang_()
      };
      if (ada[s.nis]) { o._baris = ada[s.nis]._baris; ubah_('absensi_santri', o); }
      else baru.push(o);
      n++;
    });
    tambah_('absensi_santri', baru);
    return n + ' santri tersimpan.';
  });
}

// ===================== JURNAL MENGAJAR =====================

function simpanJurnal(token, d) {
  const u = sesi_(token, ['guru', 'admin']);
  d = d || {};
  const tanggal = cekTanggal_(d.tanggal);
  if (!bersih_(d.materi)) throw new Error('Materi wajib diisi.');
  return kunci_(function () {
    tambah_('jurnal', [{
      id: idBaru_(), tanggal: tanggal, username: u.id, nama_guru: u.nama,
      kelas: bersih_(d.kelas, 60), materi: bersih_(d.materi, 300),
      kegiatan: bersih_(d.kegiatan, 1500), catatan: bersih_(d.catatan, 800), dicatat: sekarang_()
    }]);
    return 'Jurnal tersimpan.';
  });
}

async function getJurnal(token, bulan, semuaGuru) {
  const u = sesi_(token, ['guru', 'admin']);
  bulan = cekBulan_(bulan);
  const semua = u.peran === 'admin' && semuaGuru;
  const rows = semua ? await cari_('jurnal', 'tanggal LIKE ?', [bulan + '%'])
                     : await cari_('jurnal', 'tanggal LIKE ? AND username = ?', [bulan + '%', u.id]);
  return rows
    .sort(urutBaru_)
    .map(function (r) {
      return { id: r.id, tanggal: r.tanggal, guru: r.nama_guru, kelas: r.kelas, materi: r.materi,
               kegiatan: r.kegiatan, catatan: r.catatan, bisaHapus: r.username === u.id || u.peran === 'admin' };
    });
}

async function hapusJurnal(token, id) {
  const u = sesi_(token, ['guru', 'admin']);
  return kunci_(async function () {
    const r = (await cari_('jurnal', 'id = ?', [String(id)]))[0];
    if (!r) throw new Error('Data tidak ditemukan.');
    if (r.username !== u.id && u.peran !== 'admin') throw new Error('Hanya bisa menghapus jurnal sendiri.');
    hapusBaris_('jurnal', r._baris);
    return 'Jurnal dihapus.';
  });
}

// ===================== PERKEMBANGAN SANTRI =====================

function simpanPerkembangan(token, d) {
  const u = sesi_(token, ['guru', 'admin']);
  d = d || {};
  const tanggal = cekTanggal_(d.tanggal);
  if (!bersih_(d.posisi) && !bersih_(d.catatan)) throw new Error('Isi capaian atau catatan.');
  return kunci_(function () {
    const s = baca_('santri').find(function (x) { return x.nis === d.nis; });
    if (!s) throw new Error('Santri tidak ditemukan.');
    tambah_('perkembangan', [{
      id: idBaru_(), tanggal: tanggal, nis: s.nis, nama: s.nama, kelas: s.kelas,
      jenis: bersih_(d.jenis, 60), posisi: bersih_(d.posisi, 150), nilai: bersih_(d.nilai, 40),
      catatan: bersih_(d.catatan, 800), guru: u.nama, username: u.id, dicatat: sekarang_()
    }]);
    return 'Perkembangan tersimpan.';
  });
}

function getPerkembangan(token, filter) { return perkembangan_(sesi_(token), filter); }

async function perkembangan_(u, filter) {
  filter = filter || {};
  let syarat = '', p = [];
  if (u.peran === 'santri') { syarat = 'nis = ?'; p = [u.id]; }
  else if (filter.nis) { syarat = 'nis = ?'; p = [String(filter.nis)]; }
  else if (filter.kelas) { syarat = 'kelas = ?'; p = [String(filter.kelas)]; }
  const rows = await cari_('perkembangan', syarat, p, ' ORDER BY tanggal DESC, dicatat DESC LIMIT 100');
  return rows.map(function (r) {
    return { id: r.id, tanggal: r.tanggal, nis: r.nis, nama: r.nama, kelas: r.kelas, jenis: r.jenis,
             posisi: r.posisi, nilai: r.nilai, catatan: r.catatan, guru: r.guru,
             bisaHapus: u.peran === 'admin' || (u.peran === 'guru' && r.username === u.id) };
  });
}

async function hapusPerkembangan(token, id) {
  const u = sesi_(token, ['guru', 'admin']);
  return kunci_(async function () {
    const r = (await cari_('perkembangan', 'id = ?', [String(id)]))[0];
    if (!r) throw new Error('Data tidak ditemukan.');
    if (r.username !== u.id && u.peran !== 'admin') throw new Error('Hanya bisa menghapus catatan sendiri.');
    hapusBaris_('perkembangan', r._baris);
    return 'Dihapus.';
  });
}

// ===================== HALAMAN SANTRI / WALI =====================

function getDataSantri(token, bulan) { return dataSantri_(sesi_(token, ['santri']), bulan); }

async function dataSantri_(u, bulan) {
  bulan = cekBulan_(bulan);
  const abs = (await cari_('absensi_santri', 'nis = ? AND tanggal LIKE ?', [u.id, bulan + '%']))
    .sort(function (a, b) { return b.tanggal.localeCompare(a.tanggal); });
  const rekap = { Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0 };
  abs.forEach(function (r) { if (rekap[r.status] !== undefined) rekap[r.status]++; });
  const s = baca_('santri').find(function (x) { return x.nis === u.id; }) || {};
  return {
    profil: { nis: s.nis, nama: s.nama, kelas: s.kelas, wali: s.nama_wali },
    rekap: rekap,
    absensi: abs.map(function (r) { return { tanggal: r.tanggal, status: r.status, keterangan: r.keterangan, guru: r.guru }; }),
    perkembangan: (await perkembangan_(u)).slice(0, 50),
    syahriyah: ringkasSyahriyahSantri_(s),
    target: s.nis ? ketuntasan_(s) : null
  };
}

// ===================== REKAP =====================

async function rekapSantri(token, bulan, kelas) {
  sesi_(token, ['guru', 'admin']);
  kelas = kanonJilid_(kelas);
  bulan = cekBulan_(bulan);
  const santri = baca_('santri').filter(function (s) { return aktif_(s) && (!kelas || s.kelas === kelas); })
    .sort(urutan_());
  const m = {}, tanggal = {}, perKelas = {};
  santri.forEach(function (s) { m[s.nis] = { nis: s.nis, nama: s.nama, kelas: s.kelas, Hadir: 0, Izin: 0, Sakit: 0, Alpa: 0, pertemuan: 0 }; });
  (await cari_('absensi_santri', 'tanggal LIKE ?', [bulan + '%'])).forEach(function (r) {
    if (r.tanggal.indexOf(bulan) !== 0 || !m[r.nis]) return;
    if (m[r.nis][r.status] !== undefined) m[r.nis][r.status]++;
    tanggal[r.tanggal] = 1;
    const k = m[r.nis].kelas;
    perKelas[k] = perKelas[k] || {};
    perKelas[k][r.tanggal] = 1;
  });
  santri.forEach(function (s) { m[s.nis].pertemuan = Object.keys(perKelas[s.kelas] || {}).length; });
  return { pertemuan: Object.keys(tanggal).length, data: santri.map(function (s) { return m[s.nis]; }) };
}

async function rekapGuru(token, bulan) {
  sesi_(token, ['admin']);
  bulan = cekBulan_(bulan);
  const hari = hariIni_();
  const m = {};
  baca_('guru').filter(aktif_).forEach(function (g) {
    m[g.username] = { username: g.username, nama: g.nama, Hadir: 0, Izin: 0, Sakit: 0, jurnal: 0 };
  });
  const hariIni = [];
  (await cari_('absensi_guru', 'tanggal LIKE ? OR tanggal = ?', [bulan + '%', hari])).forEach(function (r) {
    if (r.tanggal === hari) hariIni.push({ username: r.username, nama: r.nama, status: r.status, jam: r.jam, keterangan: r.keterangan });
    if (r.tanggal.indexOf(bulan) === 0 && m[r.username] && m[r.username][r.status] !== undefined) m[r.username][r.status]++;
  });
  (await cari_('jurnal', 'tanggal LIKE ?', [bulan + '%'])).forEach(function (r) {
    if (r.tanggal.indexOf(bulan) === 0 && m[r.username]) m[r.username].jurnal++;
  });
  return { rekap: Object.keys(m).map(function (k) { return m[k]; }), hariIni: hariIni };
}

// ===================== PENGUMUMAN =====================

function simpanPengumuman(token, d, gambar) {
  const u = sesi_(token, ['admin']);
  d = d || {};
  if (!bersih_(d.judul)) throw new Error('Judul wajib diisi.');
  return kunci_(function () {
    const kategori = KATEGORI_BERITA.indexOf(d.kategori) >= 0 ? d.kategori : 'Info';
    let p = d.id ? baca_('pengumuman').find(function (x) { return x.id === d.id; }) : null;
    const baru = !p;
    if (baru) p = { id: idBaru_(), tanggal: hariIni_(), oleh: u.nama, aktif: 'Y' };
    p.kategori = kategori;
    p.judul = bersih_(d.judul, 150);
    p.isi = bersih_(d.isi, 4000);
    p.sematkan = d.sematkan === 'Y' || d.sematkan === true ? 'Y' : 'N';
    if (gambar) { const lama = p.gambar; p.gambar = simpanFoto_('berita', p.id, gambar); hapusFoto_(lama); }
    if (d.hapusGambar && !gambar) { hapusFoto_(p.gambar); p.gambar = ''; }
    if (baru) tambah_('pengumuman', [p]); else ubah_('pengumuman', p);
    return pengumuman_();
  });
}

function hapusPengumuman(token, id) {
  sesi_(token, ['admin']);
  return kunci_(function () {
    const r = baca_('pengumuman').find(function (x) { return x.id === id; });
    if (r) { r.aktif = 'N'; ubah_('pengumuman', r); }
    return pengumuman_();
  });
}

// ===================== KENAIKAN JILID (ADMIN) =====================

function naikJilid(token, tanggal, daftarNis) {
  const u = sesi_(token, ['admin']);
  tanggal = cekTanggal_(tanggal);
  if (!daftarNis || !daftarNis.length) throw new Error('Pilih santri yang naik jilid.');
  return kunci_(function () {
    const jilid = daftarJilid_();
    const santri = baca_('santri');
    const catatan = [];
    let n = 0, jilidBaru = '';
    daftarNis.forEach(function (nis) {
      const s = santri.find(function (x) { return x.nis === nis; });
      if (!s) return;
      const i = jilid.indexOf(s.kelas);
      if (i < 0) throw new Error('Kelas "' + s.kelas + '" milik ' + s.nama + ' tidak ada di daftar jilid.');
      if (i === jilid.length - 1) {
        jilidBaru = jilidQuranBerikutnya_(jilid);
        jilid.push(jilidBaru);
        simpanDaftarJilid_(jilid);
      }
      const dari = s.kelas, ke = jilid[i + 1];
      s.kelas = ke;
      ubah_('santri', s);
      catatan.push({
        id: idBaru_(), tanggal: tanggal, nis: s.nis, nama: s.nama, kelas: ke,
        jenis: 'Kenaikan Jilid', posisi: dari + ' → ' + ke, nilai: '',
        catatan: 'Alhamdulillah, naik ke ' + ke + '.', guru: u.nama, username: u.id, dicatat: sekarang_()
      });
      n++;
    });
    tambah_('perkembangan', catatan);
    return { pesan: n + ' santri naik jilid.' + (jilidBaru ? ' ' + jilidBaru + ' otomatis ditambahkan.' : '') };
  });
}

function tambahJilidQuran(token) {
  sesi_(token, ['admin']);
  return kunci_(function () {
    const jilid = daftarJilid_();
    const baru = jilidQuranBerikutnya_(jilid);
    jilid.push(baru);
    simpanDaftarJilid_(jilid);
    return baru + ' ditambahkan.';
  });
}

// ===================== DATA INDUK SANTRI =====================

const FIELD_SANTRI = ['tanggal_masuk', 'nama', 'kelas', 'kewarganegaraan', 'tanggal_lahir', 'nik', 'jk', 'tempat_lahir',
  'agama', 'hp', 'nama_ayah', 'status_ayah', 'nama_ibu', 'status_ibu', 'status_wali', 'nama_wali', 'hp_wali',
  'alamat', 'syahriyah', 'aktif'];

function acak_() { return String(Math.floor(100000 + Math.random() * 900000)); }

function cekTglOpsional_(t, label) {
  if (t && !/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error(label + ' tidak valid.');
}

function getDaftarSantri(token) {
  sesi_(token, ['guru', 'admin']);
  return baca_('santri').sort(urutan_()).map(function (s) {
    return { nis: s.nis, nama: s.nama, kelas: s.kelas, jk: s.jk, nama_wali: s.nama_wali, hp_wali: s.hp_wali,
             hp: s.hp, aktif: aktif_(s) ? 'Y' : 'N', adaFoto: !!s.foto };
  });
}

function getSantri(token, nis) {
  const u = sesi_(token);
  if (u.peran === 'santri' && u.id !== nis) throw new Error('Anda tidak punya akses ke data ini.');
  const s = baca_('santri').find(function (x) { return x.nis === nis; });
  if (!s) throw new Error('Santri tidak ditemukan.');
  const o = { nis: s.nis, adaFoto: !!s.foto };
  FIELD_SANTRI.forEach(function (f) { o[f] = s[f]; });
  if (u.peran !== 'admin' && u.peran !== 'santri') o.nik = s.nik ? '••••••••••••' + s.nik.slice(-4) : '';
  o.nominalSyahriyah = nominalSantri_(s, pengaturan_());
  return o;
}

function simpanSantri(token, d, foto) {
  sesi_(token, ['admin']);
  d = d || {};
  return kunci_(function () {
    const semua = baca_('santri');
    const baru = !d.nisLama;
    let s, pwAwal = '';
    if (baru) {
      let nis = bersih_(d.nis, 20);
      if (!nis) {
        let maks = 0;
        semua.forEach(function (x) { if (/^\d+$/.test(x.nis)) maks = Math.max(maks, Number(x.nis)); });
        nis = ('000' + (maks + 1)).slice(-4);
      }
      if (!/^[A-Za-z0-9.\-]+$/.test(nis)) throw new Error('NIS hanya boleh berisi huruf, angka, titik atau tanda minus.');
      const lower = nis.toLowerCase();
      if (semua.some(function (x) { return x.nis.toLowerCase() === lower; }) ||
          baca_('guru').some(function (g) { return g.username.toLowerCase() === lower; }))
        throw new Error('NIS ' + nis + ' sudah dipakai.');
      pwAwal = bersih_(d.password_baru, 40) || acak_();
      s = { nis: nis, password: pwAwal, aktif: 'Y' };
    } else {
      s = semua.find(function (x) { return x.nis === d.nisLama; });
      if (!s) throw new Error('Santri tidak ditemukan.');
      if (d.password_baru) { pwAwal = bersih_(d.password_baru, 40); s.password = pwAwal; }
    }
    if (pwAwal && pwAwal.length < 6) throw new Error('Password minimal 6 karakter.');
    FIELD_SANTRI.forEach(function (f) { if (d[f] !== undefined) s[f] = bersih_(d[f], f === 'alamat' ? 300 : 120); });
    if (!s.nama) throw new Error('Nama lengkap wajib diisi.');
    if (!s.kelas) throw new Error('Tingkat wajib dipilih.');
    s.kelas = kanonJilid_(s.kelas);
    if (daftarKelas_().indexOf(s.kelas) < 0) throw new Error('Tingkat "' + s.kelas + '" tidak ada di daftar jilid.');
    if (s.nik && !/^\d{16}$/.test(s.nik)) throw new Error('NIK harus 16 digit angka.');
    cekTglOpsional_(s.tanggal_lahir, 'Tanggal lahir');
    cekTglOpsional_(s.tanggal_masuk, 'Tanggal masuk');
    if (s.syahriyah !== undefined && s.syahriyah !== '') s.syahriyah = String(s.syahriyah).replace(/[^\d]/g, '');
    s.aktif = String(s.aktif || 'Y').toUpperCase() === 'N' ? 'N' : 'Y';
    if (foto) { const lama = s.foto; s.foto = simpanFoto_('santri', s.nis, foto); hapusFoto_(lama); }
    if (baru) tambah_('santri', [s]); else ubah_('santri', s);
    return { nis: s.nis, passwordAwal: pwAwal };
  });
}

// ===================== DATA GURU / USTADZ-USTADZAH =====================

const FIELD_GURU = ['nama', 'peran', 'kelas', 'jk', 'nik', 'tempat_lahir', 'tanggal_lahir', 'alamat', 'hp',
  'pendidikan', 'mulai_mengajar', 'jabatan', 'sertifikasi', 'aktif'];
const FIELD_GURU_SENDIRI = ['jk', 'nik', 'tempat_lahir', 'tanggal_lahir', 'alamat', 'hp', 'pendidikan'];

function getDaftarGuru(token) {
  sesi_(token, ['admin']);
  return baca_('guru').map(function (g) {
    return { username: g.username, nama: g.nama, peran: normalPeran_(g.peran), jabatan: g.jabatan, kelas: g.kelas,
             hp: g.hp, aktif: aktif_(g) ? 'Y' : 'N', adaFoto: !!g.foto };
  }).sort(function (a, b) { return a.aktif === b.aktif ? a.nama.localeCompare(b.nama) : (a.aktif === 'Y' ? -1 : 1); });
}

function getGuru(token, username) {
  const u = sesi_(token, ['guru', 'admin']);
  if (u.peran !== 'admin' && u.id !== username) throw new Error('Anda tidak punya akses ke data ini.');
  const g = baca_('guru').find(function (x) { return x.username === username; });
  if (!g) throw new Error('Data guru tidak ditemukan.');
  const o = { username: g.username, adaFoto: !!g.foto };
  FIELD_GURU.forEach(function (f) { o[f] = g[f]; });
  o.peran = normalPeran_(g.peran);
  return o;
}

function simpanGuru(token, d, foto) {
  const u = sesi_(token, ['guru', 'admin']);
  d = d || {};
  const admin = u.peran === 'admin';
  return kunci_(function () {
    const semua = baca_('guru');
    const baru = !d.usernameLama;
    let g, pwAwal = '';
    if (baru) {
      if (!admin) throw new Error('Hanya admin yang bisa menambah guru.');
      const un = bersih_(d.username, 30).toLowerCase();
      if (!/^[a-z0-9._]{3,30}$/.test(un)) throw new Error('Username 3–30 karakter: huruf kecil, angka, titik atau garis bawah.');
      if (semua.some(function (x) { return x.username.toLowerCase() === un; }) ||
          baca_('santri').some(function (x) { return x.nis.toLowerCase() === un; }))
        throw new Error('Username ' + un + ' sudah dipakai.');
      pwAwal = bersih_(d.password_baru, 40) || acak_();
      g = { username: un, password: pwAwal, aktif: 'Y' };
    } else {
      if (!admin && d.usernameLama !== u.id) throw new Error('Anda hanya bisa mengubah profil sendiri.');
      g = semua.find(function (x) { return x.username === d.usernameLama; });
      if (!g) throw new Error('Data guru tidak ditemukan.');
      if (admin && d.password_baru) { pwAwal = bersih_(d.password_baru, 40); g.password = pwAwal; }
    }
    if (pwAwal && pwAwal.length < 6) throw new Error('Password minimal 6 karakter.');
    (admin ? FIELD_GURU : FIELD_GURU_SENDIRI).forEach(function (f) {
      if (f !== 'kelas' && d[f] !== undefined) g[f] = bersih_(d[f], f === 'alamat' ? 300 : 120);
    });
    if (!g.nama) throw new Error('Nama lengkap wajib diisi.');
    if (admin && d.kelas !== undefined) {
      const daftar = Array.isArray(d.kelas) ? d.kelas.map(String) : jilidGuru_(d.kelas);
      const resmi = daftarKelas_();
      daftar.forEach(function (k) { if (resmi.indexOf(k) < 0) throw new Error('Jilid "' + k + '" tidak ada di daftar jilid.'); });
      g.kelas = resmi.filter(function (k) { return daftar.indexOf(k) >= 0; }).join(', ');
    }
    g.peran = normalPeran_(g.peran);
    g.aktif = String(g.aktif || 'Y').toUpperCase() === 'N' ? 'N' : 'Y';
    if (!baru && g.username === u.id && (g.peran !== u.peran || g.aktif === 'N'))
      throw new Error('Anda tidak bisa mengubah peran atau menonaktifkan akun sendiri.');
    if (g.nik && !/^\d{16}$/.test(g.nik)) throw new Error('NIK harus 16 digit angka.');
    cekTglOpsional_(g.tanggal_lahir, 'Tanggal lahir');
    cekTglOpsional_(g.mulai_mengajar, 'Tanggal mulai mengajar');
    if (foto) { const lama = g.foto; g.foto = simpanFoto_('guru', g.username, foto); hapusFoto_(lama); }
    if (baru) tambah_('guru', [g]); else ubah_('guru', g);
    return { username: g.username, passwordAwal: pwAwal };
  });
}

// ===================== FOTO (database D1) =====================

function simpanFoto_(jenis, id, dataUrl) { return simpanFotoData_(jenis, id, dataUrl); }

function hapusFoto_(fid) { hapusFotoData_(fid); }

function getFoto(token, jenis, id) {
  const u = sesi_(token);
  let fid = '';
  if (jenis === 'berita') {
    const p = baca_('pengumuman').find(function (x) { return x.id === id && aktif_(x); });
    fid = p ? p.gambar : '';
  } else if (jenis === 'santri') {
    if (u.peran === 'santri' && u.id !== id) throw new Error('Anda tidak punya akses.');
    const s = baca_('santri').find(function (x) { return x.nis === id; });
    fid = s ? s.foto : '';
  } else {
    if (u.peran !== 'admin' && u.id !== id) throw new Error('Anda tidak punya akses.');
    const g = baca_('guru').find(function (x) { return x.username === id; });
    fid = g ? g.foto : '';
  }
  return fotoDataUrl_(fid);
}

// ===================== SYAHRIYAH / SPP =====================

function bulanIni_() { return hariIni_().slice(0, 7); }
function angka_(v) { return Number(String(v === undefined || v === null ? '' : v).replace(/[^\d]/g, '')) || 0; }

function tambahBulan_(b, n) {
  const y = Number(b.slice(0, 4)), m = Number(b.slice(5, 7)) - 1 + n;
  const yy = y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12 + 1;
  return yy + '-' + ('0' + mm).slice(-2);
}

// Nominal per bulan: kolom santri (kosong = nominal default, 0 = bebas)
function nominalSantri_(s, set) {
  const v = String(s.syahriyah === undefined || s.syahriyah === null ? '' : s.syahriyah).replace(/[^\d]/g, '');
  if (v !== '') return Number(v);
  return angka_(set.syahriyah_default);
}

function mulaiTagih_(s, set) {
  let a = String(set.syahriyah_mulai || '');
  if (!/^\d{4}-\d{2}$/.test(a)) a = bulanIni_();
  const b = String(s.tanggal_masuk || '').slice(0, 7);
  return /^\d{4}-\d{2}$/.test(b) && b > a ? b : a;
}

function petaBayar_() {
  const m = {};
  baca_('syahriyah').forEach(function (r) {
    const k = r.nis + '|' + r.bulan;
    m[k] = (m[k] || 0) + angka_(r.nominal);
  });
  return m;
}

function statusSyahriyah_(s, set, bayar, sampai) {
  const nom = nominalSantri_(s, set), mulai = mulaiTagih_(s, set);
  const bulan = [];
  let tunggakan = 0, bulanTunggak = 0;
  for (let b = mulai; b <= sampai && bulan.length < 120; b = tambahBulan_(b, 1)) {
    const d = bayar[s.nis + '|' + b] || 0;
    const lunas = nom === 0 || d >= nom;
    bulan.push({ bulan: b, dibayar: d, lunas: lunas });
    if (!lunas) { tunggakan += nom - d; bulanTunggak++; }
  }
  return { nominal: nom, mulai: mulai, bulan: bulan, tunggakan: tunggakan, bulanTunggak: bulanTunggak };
}

function ringkasSyahriyahSantri_(s) {
  if (!s || !s.nis) return null;
  const set = pengaturan_(), bayar = petaBayar_();
  const bi = bulanIni_();
  // tampilkan juga bulan yang sudah dibayar di muka
  let sampai = bi;
  for (let b = tambahBulan_(bi, 1), i = 0; i < 12; b = tambahBulan_(b, 1), i++) if (bayar[s.nis + '|' + b]) sampai = b;
  const st = statusSyahriyah_(s, set, bayar, sampai);
  st.bulan = st.bulan.slice(-15);
  st.bulanIni = bi;
  return st;
}

function getSyahriyahBulan(token, bulan, kelas) {
  sesi_(token, ['admin', 'bendahara']);
  return hitungSyahriyah_(cekBulan_(bulan), kanonJilid_(kelas));
}

function hitungSyahriyah_(bulan, kelas) {
  const set = pengaturan_(), bayar = petaBayar_();
  const santri = baca_('santri').filter(function (s) { return aktif_(s) && (!kelas || s.kelas === kelas); }).sort(urutan_());
  const r = { target: 0, diterima: 0, lunas: 0, belum: 0, bebas: 0, masuk: 0 };
  const data = santri.map(function (s) {
    const st = statusSyahriyah_(s, set, bayar, bulan);
    const d = bayar[s.nis + '|' + bulan] || 0;
    let status;
    if (st.nominal === 0) { status = 'Bebas'; r.bebas++; }
    else if (bulan < st.mulai) status = '-';
    else {
      r.target += st.nominal; r.diterima += Math.min(d, st.nominal);
      if (d >= st.nominal) { status = 'Lunas'; r.lunas++; } else { status = d > 0 ? 'Kurang' : 'Belum'; r.belum++; }
    }
    return { nis: s.nis, nama: s.nama, kelas: s.kelas, nominal: st.nominal, dibayar: d, status: status,
             tunggakan: st.tunggakan, bulanTunggak: st.bulanTunggak, mulai: st.mulai };
  });
  baca_('syahriyah').forEach(function (x) { if (x.tanggal.indexOf(bulan) === 0) r.masuk += angka_(x.nominal); });
  return { bulan: bulan, nominalDefault: angka_(set.syahriyah_default), mulai: set.syahriyah_mulai, ringkas: r, data: data };
}

function getRiwayatSyahriyah(token, nis) {
  const u = sesi_(token);
  if (u.peran === 'santri') { if (u.id !== nis) throw new Error('Anda tidak punya akses.'); }
  else if (!punyaPeran_(u, ['admin', 'bendahara'])) throw new Error('Anda tidak punya akses ke fitur ini.');
  const s = baca_('santri').find(function (x) { return x.nis === nis; });
  if (!s) throw new Error('Santri tidak ditemukan.');
  const st = ringkasSyahriyahSantri_(s);
  st.nama = s.nama; st.nis = s.nis; st.kelas = s.kelas;
  st.pembayaran = baca_('syahriyah').filter(function (x) { return x.nis === nis; }).sort(urutBaru_).map(function (x) {
    return { id: x.id, tanggal: x.tanggal, bulan: x.bulan, nominal: angka_(x.nominal), metode: x.metode,
             penerima: x.penerima, keterangan: x.keterangan };
  });
  return st;
}

function bayarSyahriyah(token, d) {
  const u = sesi_(token, ['admin', 'bendahara']);
  d = d || {};
  const tanggal = cekTanggal_(d.tanggal);
  const mulai = cekBulan_(d.bulanMulai);
  const jumlah = Math.min(24, Math.max(1, parseInt(d.jumlahBulan, 10) || 1));
  return kunci_(function () {
    const s = baca_('santri').find(function (x) { return x.nis === d.nis; });
    if (!s) throw new Error('Santri tidak ditemukan.');
    const set = pengaturan_(), nom = nominalSantri_(s, set);
    if (!nom) throw new Error('Santri ini bebas syahriyah atau nominal default belum diatur.');
    const bayar = petaBayar_();
    const rows = [], lewati = [];
    for (let i = 0; i < jumlah; i++) {
      const b = tambahBulan_(mulai, i), sudah = bayar[s.nis + '|' + b] || 0;
      if (sudah >= nom) { lewati.push(b); continue; }
      let n = nom - sudah;
      if (jumlah === 1 && angka_(d.nominal)) n = Math.min(angka_(d.nominal), n);
      rows.push({ id: idBaru_(), tanggal: tanggal, nis: s.nis, nama: s.nama, kelas: s.kelas, bulan: b, nominal: String(n),
                  metode: bersih_(d.metode, 30) || 'Tunai', penerima: u.nama, keterangan: bersih_(d.keterangan, 200),
                  dicatat: sekarang_() });
    }
    if (!rows.length) throw new Error('Bulan yang dipilih sudah lunas semua.');
    tambah_('syahriyah', rows);
    const total = rows.reduce(function (a, r) { return a + Number(r.nominal); }, 0);
    return {
      pesan: rows.length + ' bulan tercatat.' + (lewati.length ? ' ' + lewati.length + ' bulan sudah lunas dan dilewati.' : ''),
      kuitansi: { no: rows[0].id.toUpperCase(), tanggal: tanggal, nis: s.nis, nama: s.nama, kelas: s.kelas,
                  rincian: rows.map(function (r) { return { bulan: r.bulan, nominal: Number(r.nominal) }; }),
                  total: total, metode: rows[0].metode, penerima: u.nama, keterangan: rows[0].keterangan }
    };
  });
}

function hapusSyahriyah(token, id) {
  sesi_(token, ['admin']);
  return kunci_(function () {
    const r = baca_('syahriyah').find(function (x) { return x.id === id; });
    if (!r) throw new Error('Data tidak ditemukan.');
    hapusBaris_('syahriyah', r._baris);
    return 'Pembayaran dihapus.';
  });
}

// Alamat resmi aplikasi (halaman pembungkus): disimpan otomatis saat admin membukanya
function simpanAlamatAplikasi(token, url) {
  sesi_(token, ['admin']);
  url = bersih_(url, 200);
  if (!/^https:\/\/[^\s"'<>]+$/.test(url))
    throw new Error('Alamat tidak valid.');
  return kunci_(function () { setPengaturan_('alamat_aplikasi', url); return 'Tersimpan.'; });
}

function setPengaturan_(kunci, nilai) {
  const r = baca_('pengaturan').find(function (x) { return x.kunci === kunci; });
  if (r) { r.nilai = nilai; ubah_('pengaturan', r); } else tambah_('pengaturan', [{ kunci: kunci, nilai: nilai }]);
}

function simpanPengaturanSyahriyah(token, nominal, mulai) {
  sesi_(token, ['admin']);
  mulai = cekBulan_(mulai);
  return kunci_(function () {
    setPengaturan_('syahriyah_default', String(angka_(nominal)));
    setPengaturan_('syahriyah_mulai', mulai);
    return 'Pengaturan syahriyah disimpan.';
  });
}

// ===================== FOTO SANTRI OLEH GURU =====================

function simpanFotoSantri(token, nis, foto) {
  sesi_(token, ['guru', 'admin']);
  if (!foto) throw new Error('Pilih foto terlebih dahulu.');
  return kunci_(function () {
    const s = baca_('santri').find(function (x) { return x.nis === nis; });
    if (!s) throw new Error('Santri tidak ditemukan.');
    const lama = s.foto;
    s.foto = simpanFoto_('santri', s.nis, foto);
    ubah_('santri', s);
    hapusFoto_(lama);
    return 'Foto santri diperbarui.';
  });
}

// ===================== TARGET MATERI & KETUNTASAN =====================

function targetAktif_(jilid) {
  return baca_('target').filter(function (t) { return aktif_(t) && (!jilid || t.jilid === jilid); })
    .sort(function (a, b) { return (Number(a.urutan) || 0) - (Number(b.urutan) || 0); });
}

function petaTuntas_() {
  const m = {};
  baca_('ketuntasan').forEach(function (r) { (m[r.nis] = m[r.nis] || {})[r.target_id] = r; });
  return m;
}

function persenSantri_(s, targets, tuntas) {
  const t = targets.filter(function (x) { return x.jilid === s.kelas; });
  if (!t.length) return null;
  const m = tuntas[s.nis] || {};
  return Math.round(t.filter(function (x) { return m[x.id]; }).length / t.length * 100);
}

function ketuntasan_(s) {
  const t = targetAktif_(s.kelas), m = petaTuntas_()[s.nis] || {};
  const list = t.map(function (x) {
    const r = m[x.id];
    return { id: x.id, kategori: x.kategori, materi: x.materi, indikator: x.indikator,
             tuntas: !!r, tanggal: r ? r.tanggal : '', guru: r ? r.guru : '' };
  });
  const n = list.filter(function (x) { return x.tuntas; }).length;
  return { nis: s.nis, nama: s.nama, jilid: s.kelas, jumlah: list.length, tuntas: n,
           persen: list.length ? Math.round(n / list.length * 100) : null, target: list };
}

function getTarget(token, jilid) {
  const u = sesi_(token);
  jilid = kanonJilid_(jilid);
  if (u.peran === 'santri') {
    const s = baca_('santri').find(function (x) { return x.nis === u.id; });
    jilid = s ? s.kelas : '';
  }
  const res = {
    jilid: jilid,
    target: targetAktif_(jilid).map(function (t) {
      return { id: t.id, urutan: t.urutan, kategori: t.kategori, materi: t.materi, indikator: t.indikator };
    })
  };
  if (u.peran !== 'santri') {
    const targets = targetAktif_(), tuntas = petaTuntas_();
    res.santri = baca_('santri').filter(function (s) { return aktif_(s) && s.kelas === jilid; })
      .sort(function (a, b) { return a.nama.localeCompare(b.nama); })
      .map(function (s) { return { nis: s.nis, nama: s.nama, persen: persenSantri_(s, targets, tuntas) }; });
  }
  return res;
}

function getKetuntasan(token, nis) {
  const u = sesi_(token);
  if (u.peran === 'santri' && u.id !== nis) throw new Error('Anda tidak punya akses.');
  const s = baca_('santri').find(function (x) { return x.nis === nis; });
  if (!s) throw new Error('Santri tidak ditemukan.');
  return ketuntasan_(s);
}

function setKetuntasan(token, nis, targetId, tuntas, tanggal) {
  const u = sesi_(token, ['guru', 'admin']);
  tanggal = tanggal ? cekTanggal_(tanggal) : hariIni_();
  return kunci_(function () {
    const s = baca_('santri').find(function (x) { return x.nis === nis; });
    if (!s) throw new Error('Santri tidak ditemukan.');
    const t = baca_('target').find(function (x) { return x.id === targetId; });
    if (!t) throw new Error('Target tidak ditemukan.');
    const ada = baca_('ketuntasan').find(function (r) { return r.nis === nis && r.target_id === targetId; });
    if (tuntas && !ada) {
      tambah_('ketuntasan', [{ id: idBaru_(), tanggal: tanggal, nis: s.nis, nama: s.nama, jilid: t.jilid, target_id: t.id,
                               materi: t.materi, guru: u.nama, username: u.id, dicatat: sekarang_() }]);
    } else if (!tuntas && ada) {
      hapusBaris_('ketuntasan', ada._baris);
    }
    return ketuntasan_(s);
  });
}

function simpanTarget(token, d) {
  sesi_(token, ['admin']);
  d = d || {};
  return kunci_(function () {
    const jilid = kanonJilid_(bersih_(d.jilid, 60));
    if (daftarKelas_().indexOf(jilid) < 0) throw new Error('Jilid tidak dikenal.');
    if (!bersih_(d.materi)) throw new Error('Materi target wajib diisi.');
    let t = d.id ? baca_('target').find(function (x) { return x.id === d.id; }) : null;
    const baru = !t;
    if (baru) {
      const maks = targetAktif_(jilid).reduce(function (m, x) { return Math.max(m, Number(x.urutan) || 0); }, 0);
      t = { id: idBaru_(), jilid: jilid, urutan: String(maks + 1), aktif: 'Y' };
    }
    t.jilid = jilid;
    if (d.urutan !== undefined && String(d.urutan).trim() !== '') t.urutan = String(angka_(d.urutan));
    t.kategori = bersih_(d.kategori, 40) || 'Bacaan';
    t.materi = bersih_(d.materi, 200);
    t.indikator = bersih_(d.indikator, 400);
    if (baru) tambah_('target', [t]); else ubah_('target', t);
    return 'Target tersimpan.';
  });
}

function hapusTarget(token, id) {
  sesi_(token, ['admin']);
  return kunci_(function () {
    const t = baca_('target').find(function (x) { return x.id === id; });
    if (t) { t.aktif = 'N'; ubah_('target', t); }
    return 'Target dihapus.';
  });
}

// ===================== PROGRAM PEMBELAJARAN (Tilawati) =====================
// Mengikuti format Excel "Program Pembelajaran Harian Membaca Jilid / Al-Qur'an":
// 60 pertemuan (4 blok x 15). Tiap pertemuan: Klassikal Peraga/hal, Baca Simak/hal,
// Prosentase Kelancaran dalam kelas. Pemantapan persiapan Munaqosyah di pertemuan 46-51.

const PP_PERTEMUAN = 60;
const PP_MUNAQOSYAH = [46, 51];
function ppQuran_(jilid) { return /qur/i.test(String(jilid || '')); }
function ppMunaqosyah_(p) { return p >= PP_MUNAQOSYAH[0] && p <= PP_MUNAQOSYAH[1]; }
// pola halaman peraga bawaan untuk buku Jilid (sesuai lembar Excel)
function polaPeraga_(p) {
  if (p >= 1 && p <= 15) return ['1-4', '5-8', '9-12', '13-16', '17-20'][(p - 1) % 5];
  if (p >= 16 && p <= 51) return (p - 16) % 2 ? '11-20' : '1-10';
  return '';
}
function bisaProgram_(u, pr) { return u.peran === 'admin' || pr.username === u.id; }
function programAktif_(u) {
  return baca_('program').filter(function (r) { return aktif_(r) && bisaProgram_(u, r); });
}
function isiProgram_(id) {
  const m = {};
  baca_('program_isi').forEach(function (r) {
    if (r.program_id !== id) return;
    const p = Number(r.pertemuan);
    if (p >= 1 && p <= PP_PERTEMUAN && !m[p]) m[p] = r;
  });
  return m;
}
function terisi_(r) { return !!(r && (String(r.simak).trim() || String(r.kelancaran).trim() || r.munaqosyah)); }
function ringkasProgram_(pr, semuaIsi) {
  const isi = semuaIsi[pr.id] || {};
  let n = 0, jml = 0, nl = 0, akhir = 0;
  Object.keys(isi).forEach(function (p) {
    const r = isi[p];
    if (!terisi_(r)) return;
    n++;
    if (String(r.simak).trim() || String(r.kelancaran).trim()) akhir = Math.max(akhir, Number(p));
    const l = parseFloat(String(r.kelancaran).replace(',', '.'));
    if (!isNaN(l)) { jml += l; nl++; }
  });
  return { id: pr.id, jilid: pr.jilid, quran: ppQuran_(pr.jilid), username: pr.username, nama_ustadz: pr.nama_ustadz,
    kelompok: pr.kelompok, periode: pr.periode, terisi: n, terakhir: akhir, rata: nl ? Math.round(jml / nl) : null, dibuat: pr.dibuat };
}

function getDaftarProgram(token) {
  const u = sesi_(token, ['guru', 'admin']);
  const semuaIsi = {};
  baca_('program_isi').forEach(function (r) { (semuaIsi[r.program_id] = semuaIsi[r.program_id] || {})[Number(r.pertemuan)] = r; });
  const list = programAktif_(u).map(function (pr) { return ringkasProgram_(pr, semuaIsi); })
    .sort(function (a, b) { return String(b.dibuat).localeCompare(String(a.dibuat)); });
  const res = { program: list };
  if (u.peran === 'admin') res.guru = baca_('guru').filter(aktif_).map(function (g) { return { username: g.username, nama: g.nama, kelas: g.kelas }; });
  return res;
}

function getProgram(token, id) {
  const u = sesi_(token, ['guru', 'admin']);
  const pr = baca_('program').find(function (r) { return r.id === id && aktif_(r); });
  if (!pr) throw new Error('Program pembelajaran tidak ditemukan.');
  if (!bisaProgram_(u, pr)) throw new Error('Anda hanya bisa membuka program pembelajaran sendiri.');
  const m = isiProgram_(id), isi = [];
  for (let p = 1; p <= PP_PERTEMUAN; p++) {
    const r = m[p] || {};
    isi.push({ ke: p, peraga: r.peraga || '', simak: r.simak || '', kelancaran: r.kelancaran || '',
      munaqosyah: String(r.munaqosyah || '').toUpperCase() === 'Y' ? 'Y' : '', diubah: r.diubah || '' });
  }
  return {
    program: { id: pr.id, jilid: pr.jilid, quran: ppQuran_(pr.jilid), username: pr.username, nama_ustadz: pr.nama_ustadz,
      kelompok: pr.kelompok, periode: pr.periode,
      waktu_peraga: pr.waktu_peraga || '15 Menit', teknik_peraga: pr.teknik_peraga || 'Klassikal',
      waktu_simak: pr.waktu_simak || '30 Menit', teknik_simak: pr.teknik_simak || 'Baca Simak' },
    isi: isi, munaqosyah: PP_MUNAQOSYAH, info: { nama_tpq: pengaturan_().nama_tpq || 'TPQ Bahrul Ulum' }
  };
}

function simpanProgram(token, d) {
  const u = sesi_(token, ['guru', 'admin']);
  d = d || {};
  return kunci_(function () {
    const jilid = kanonJilid_(bersih_(d.jilid, 60));
    if (!jilid) throw new Error('Jilid / Al-Qur\'an wajib dipilih.');
    let pr = d.id ? baca_('program').find(function (r) { return r.id === d.id && aktif_(r); }) : null;
    if (d.id && !pr) throw new Error('Program pembelajaran tidak ditemukan.');
    if (pr && !bisaProgram_(u, pr)) throw new Error('Anda hanya bisa mengubah program pembelajaran sendiri.');
    const baru = !pr;
    // ustadz: guru = dirinya sendiri; admin boleh memilih guru lain
    let username = pr ? pr.username : u.id, nama = pr ? pr.nama_ustadz : u.nama;
    if (u.peran === 'admin' && d.username) {
      const g = baca_('guru').find(function (x) { return x.username === d.username; });
      if (!g) throw new Error('Ustadz/ustadzah tidak ditemukan.');
      username = g.username; nama = g.nama;
    }
    if (bersih_(d.nama_ustadz, 80)) nama = bersih_(d.nama_ustadz, 80);
    if (baru) pr = { id: idBaru_(), aktif: 'Y', dibuat: sekarang_() };
    Object.assign(pr, {
      jilid: jilid, username: username, nama_ustadz: nama, kelompok: bersih_(d.kelompok, 60), periode: bersih_(d.periode, 60),
      waktu_peraga: bersih_(d.waktu_peraga, 30) || '15 Menit', teknik_peraga: bersih_(d.teknik_peraga, 40) || 'Klassikal',
      waktu_simak: bersih_(d.waktu_simak, 30) || '30 Menit', teknik_simak: bersih_(d.teknik_simak, 40) || 'Baca Simak'
    });
    if (baru) {
      tambah_('program', [pr]);
      const pola = d.polaBawaan !== false && !ppQuran_(jilid), waktu = sekarang_(), rows = [];
      for (let p = 1; p <= PP_PERTEMUAN; p++) {
        rows.push({ program_id: pr.id, pertemuan: String(p), peraga: pola ? polaPeraga_(p) : '', simak: '', kelancaran: '',
          munaqosyah: '', username: u.id, diubah: waktu });
      }
      tambah_('program_isi', rows);
    } else ubah_('program', pr);
    return { id: pr.id, pesan: baru ? 'Program pembelajaran dibuat.' : 'Program pembelajaran disimpan.' };
  });
}

function simpanIsiProgram(token, id, daftar) {
  const u = sesi_(token, ['guru', 'admin']);
  if (!Array.isArray(daftar) || !daftar.length) throw new Error('Tidak ada isian yang disimpan.');
  return kunci_(function () {
    const pr = baca_('program').find(function (r) { return r.id === id && aktif_(r); });
    if (!pr) throw new Error('Program pembelajaran tidak ditemukan.');
    if (!bisaProgram_(u, pr)) throw new Error('Anda hanya bisa mengisi program pembelajaran sendiri.');
    const m = isiProgram_(id), ubah = [], tambah = [], waktu = sekarang_();
    daftar.forEach(function (d) {
      const ke = Number(d && d.ke);
      if (!(ke >= 1 && ke <= PP_PERTEMUAN)) throw new Error('Nomor pertemuan tidak valid.');
      let lancar = String(d.kelancaran == null ? '' : d.kelancaran).replace('%', '').replace(',', '.').trim();
      if (lancar !== '') {
        const n = Number(lancar);
        if (isNaN(n) || n < 0 || n > 100) throw new Error('Prosentase kelancaran pertemuan ' + ke + ' harus angka 0–100.');
        lancar = String(Math.round(n * 10) / 10);
      }
      const o = m[ke] || { program_id: id, pertemuan: String(ke) };
      if (d.peraga !== undefined) o.peraga = bersih_(d.peraga, 40);
      if (d.simak !== undefined) o.simak = bersih_(d.simak, 40);
      if (d.kelancaran !== undefined) o.kelancaran = lancar;
      if (d.munaqosyah !== undefined) o.munaqosyah = ppMunaqosyah_(ke) && String(d.munaqosyah).toUpperCase() === 'Y' ? 'Y' : '';
      o.username = u.id; o.diubah = waktu;
      if (o._baris) ubah.push(o); else { tambah.push(o); m[ke] = o; }
    });
    ubah.forEach(function (o) { ubah_('program_isi', o); });
    tambah_('program_isi', tambah);
    return daftar.length === 1 ? 'Pertemuan ' + daftar[0].ke + ' tersimpan.' : daftar.length + ' isian tersimpan.';
  });
}

function hapusProgram(token, id) {
  const u = sesi_(token, ['guru', 'admin']);
  return kunci_(function () {
    const pr = baca_('program').find(function (r) { return r.id === id && aktif_(r); });
    if (!pr) throw new Error('Program pembelajaran tidak ditemukan.');
    if (!bisaProgram_(u, pr)) throw new Error('Anda hanya bisa menghapus program pembelajaran sendiri.');
    pr.aktif = 'N'; ubah_('program', pr);
    return 'Program pembelajaran dihapus.';
  });
}

// ===================== KARTU SANTRI =====================

const NAMA_KEPALA_BAWAAN = 'A. Hasyim A, S.T., M.Kom.';
function namaKepala_() {
  return pengaturan_().nama_kepala || NAMA_KEPALA_BAWAAN;
}

// daftarNis kosong = semua santri aktif (khusus guru/admin). Santri hanya kartunya sendiri.
async function getKartu(token, daftarNis) {
  const u = sesi_(token);
  let santri = baca_('santri');
  if (u.peran === 'santri') {
    santri = santri.filter(function (s) { return s.nis === u.id; });
  } else if (daftarNis && daftarNis.length) {
    const pilih = {};
    daftarNis.forEach(function (n) { pilih[n] = 1; });
    santri = santri.filter(function (s) { return pilih[s.nis]; });
  } else {
    santri = santri.filter(aktif_);
  }
  const set = pengaturan_();
  return {
    info: { nama_tpq: set.nama_tpq, alamat: set.alamat, kepala: namaKepala_(), hariIni: hariIni_(),
            ttd: await fotoDataUrl_(set.ttd_kepala) },
    santri: santri.sort(urutan_()).map(function (s) {
      return { nis: s.nis, nama: s.nama, kelas: s.kelas, jk: s.jk, tempat_lahir: s.tempat_lahir,
               tanggal_lahir: s.tanggal_lahir, nama_wali: s.nama_wali, alamat: s.alamat, tanggal_masuk: s.tanggal_masuk,
               adaFoto: !!s.foto };
    })
  };
}

// Foto banyak santri sekaligus (maks. 40 per panggilan) untuk cetak kartu kolektif
async function getFotoBanyak(token, daftarNis) {
  const u = sesi_(token);
  const ids = (daftarNis || []).slice(0, 40);
  const peta = {};
  baca_('santri').forEach(function (s) { peta[s.nis] = s.foto; });
  const boleh = ids.filter(function (n) { return !(u.peran === 'santri' && n !== u.id); });
  const data = await fotoBanyak_(boleh.map(function (n) { return peta[n]; }).filter(Boolean));
  const out = {};
  boleh.forEach(function (n) { out[n] = peta[n] ? (data[peta[n]] || '') : ''; });
  return out;
}

// Gambar tanda tangan + stempel Kepala TPQ (PNG transparan), disimpan di database.
// Hanya dikirim ke pengguna yang sudah login (lewat getKartu), tidak ditanam di kode aplikasi.
function simpanTtdKepala(token, dataUrl) {
  sesi_(token, ['admin']);
  return kunci_(function () {
    const lama = pengaturan_().ttd_kepala;
    const fid = dataUrl ? simpanFoto_('ttd', 'kepala', dataUrl) : '';
    setPengaturan_('ttd_kepala', fid);
    hapusFoto_(lama);
    return dataUrl ? 'Tanda tangan & stempel disimpan.' : 'Tanda tangan & stempel dihapus.';
  });
}

function simpanPengaturanKartu(token, d) {
  sesi_(token, ['admin']);
  d = d || {};
  return kunci_(function () {
    setPengaturan_('nama_kepala', bersih_(d.nama_kepala, 80));
    return 'Pengaturan kartu disimpan.';
  });
}

// ===================== DATA AWAL DATABASE BARU =====================
// Dijalankan otomatis sekali saat database masih kosong.
function siapkanDataAwal_() {
  if (baca_('guru').length || baca_('pengaturan').length) return false;
  Object.keys(TABEL).forEach(function (k) { if (['absensi_guru', 'absensi_santri', 'jurnal', 'perkembangan'].indexOf(k) < 0) isiContoh_(k); });
  pastikanPengaturan_('metode', 'Tilawati');
  pastikanPengaturan_('daftar_jilid', JILID_AWAL.join(', '));
  pastikanPengaturan_('syahriyah_default', '');
  pastikanPengaturan_('syahriyah_mulai', hariIni_().slice(0, 7));
  pastikanPengaturan_('alamat_aplikasi', '');
  pastikanPengaturan_('nama_kepala', NAMA_KEPALA_BAWAAN);
  pastikanPengaturan_('ttd_kepala', '');
  garam_();
  return true;
}
function awalPermintaan_() { PETA_JILID_ = null; }

aturNormalisasi_(normalJilid_);

// Fungsi yang boleh dipanggil dari aplikasi (lewat /api)
export const API = { absenGuru, bayarSyahriyah, gantiPassword, getAbsensiKelas, getAwal, getDaftarGuru, getDaftarProgram, getDaftarSantri, getDataSantri, getFoto, getFotoBanyak, getGuru, getJurnal, getKartu, getKetuntasan, getPerkembangan, getProgram, getRiwayatSyahriyah, getSantri, getSyahriyahBulan, getTarget, hapusJurnal, hapusPengumuman, hapusPerkembangan, hapusProgram, hapusSyahriyah, hapusTarget, login, logout, naikJilid, rekapGuru, rekapSantri, setKetuntasan, simpanAbsensiSantri, simpanAlamatAplikasi, simpanFotoSantri, simpanGuru, simpanIsiProgram, simpanJurnal, simpanPengaturanKartu, simpanPengaturanSyahriyah, simpanPengumuman, simpanPerkembangan, simpanProgram, simpanSantri, simpanTarget, simpanTtdKepala, tambahJilidQuran };
export { siapkanDataAwal_, awalPermintaan_, VERSI };
