/**
 * =====================================================================
 *  PINDAH DATA SiAbsen dari Google Sheets ke Cloudflare (sekali jalan)
 * =====================================================================
 *  CARA PAKAI:
 *  1. Di editor Apps Script SiAbsen yang lama, klik (+) > Skrip, beri nama
 *     PindahKeCloudflare, lalu tempel SELURUH isi file ini.
 *  2. Ubah ALAMAT_CLOUDFLARE di bawah menjadi alamat aplikasi baru Anda
 *     (contoh: https://siabsen-tpq.pages.dev).
 *  3. Pilih fungsi pindahKeCloudflare di atas, klik Jalankan, lalu izinkan
 *     akses bila diminta (untuk membaca foto di Google Drive dan mengirim data).
 *  4. Tunggu sampai log "SELESAI" muncul (Ctrl+Enter untuk melihat log).
 *
 *  Data yang dipindahkan: semua lembar (guru, santri, absensi, jurnal,
 *  perkembangan, syahriyah, berita, target, ketuntasan, program pembelajaran,
 *  pengaturan), kunci password (agar password lama tetap berlaku), semua foto
 *  santri/guru, gambar berita, serta tanda tangan & stempel kepala TPQ.
 *
 *  Aman dijalankan ulang: data di Cloudflare akan DIGANTI dengan isi
 *  Google Sheets terbaru. Bila Cloudflare sudah pernah diisi, isikan
 *  username & password ADMIN yang berlaku di aplikasi Cloudflare.
 * =====================================================================
 */

const ALAMAT_CLOUDFLARE = 'https://siabsen-tpq.pages.dev';   // <-- GANTI dengan alamat aplikasi baru
const ADMIN_CLOUDFLARE = 'admin';        // untuk database baru biarkan: admin
const PASSWORD_CLOUDFLARE = 'admin123';  // untuk database baru biarkan: admin123

function pindahKeCloudflare() {
  const url = ALAMAT_CLOUDFLARE.replace(/\/+$/, '') + '/impor';
  if (/GANTI|contoh/i.test(url)) throw new Error('Isi dulu ALAMAT_CLOUDFLARE di bagian atas file ini.');
  const kirim = function (data) {
    const r = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(data), muteHttpExceptions: true });
    let j;
    try { j = JSON.parse(r.getContentText()); }
    catch (e) { throw new Error('Alamat Cloudflare tidak menjawab dengan benar (kode ' + r.getResponseCode() + '). Periksa ALAMAT_CLOUDFLARE.'); }
    if (!j.ok) throw new Error(j.galat);
    return j;
  };

  Logger.log('Menghubungi ' + ALAMAT_CLOUDFLARE + ' ...');
  const token = kirim({ aksi: 'masuk', username: ADMIN_CLOUDFLARE, password: PASSWORD_CLOUDFLARE }).token;
  kirim({ aksi: 'garam', token: token, garam: garam_() });

  const fotoIds = {};
  const ringkas = [];
  Object.keys(TABEL).forEach(function (k) {
    let rows = [];
    try { rows = bacaLangsung_(k); } catch (e) { Logger.log('Lembar ' + TABEL[k].nama + ' dilewati: ' + e.message); }
    rows.forEach(function (r) {
      if ((k === 'santri' || k === 'guru') && r.foto) fotoIds[r.foto] = 1;
      if (k === 'pengumuman' && r.gambar) fotoIds[r.gambar] = 1;
      if (k === 'pengaturan' && r.kunci === 'ttd_kepala' && r.nilai) fotoIds[r.nilai] = 1;
    });
    // kirim bertahap (maks. ~1 MB per kiriman)
    let buf = [], ukuran = 0, awal = true, mulai = 0;
    const lepas = function () {
      kirim({ aksi: 'tabel', token: token, tabel: k, awal: awal, mulai: mulai, baris: buf });
      mulai += buf.length; awal = false; buf = []; ukuran = 0;
    };
    rows.forEach(function (r) {
      const o = {};
      TABEL[k].kolom.forEach(function (c) { o[c] = r[c] === undefined || r[c] === null ? '' : String(r[c]); });
      const n = JSON.stringify(o).length;
      if (buf.length && ukuran + n > 1000000) lepas();
      buf.push(o); ukuran += n;
    });
    lepas();
    ringkas.push(TABEL[k].nama + ': ' + rows.length + ' baris');
    Logger.log('✓ ' + TABEL[k].nama + ' — ' + rows.length + ' baris');
  });

  // foto & gambar dari Google Drive
  const ids = Object.keys(fotoIds);
  let paket = [], ukuranPaket = 0, nFoto = 0, gagal = 0;
  const kirimFoto = function () { if (paket.length) { kirim({ aksi: 'foto', token: token, foto: paket }); nFoto += paket.length; } paket = []; ukuranPaket = 0; };
  ids.forEach(function (id) {
    try {
      const b = DriveApp.getFileById(id).getBlob();
      const bytes = b.getBytes();
      if (bytes.length > 1400 * 1024) { gagal++; Logger.log('Foto terlalu besar, dilewati: ' + id); return; }
      const data = Utilities.base64Encode(bytes);
      if (ukuranPaket + data.length > 3000000) kirimFoto();
      paket.push({ id: id, mime: b.getContentType() || 'image/jpeg', data: data });
      ukuranPaket += data.length;
    } catch (e) { gagal++; Logger.log('Foto tidak ditemukan di Drive: ' + id); }
  });
  kirimFoto();
  Logger.log('✓ Foto & gambar: ' + nFoto + (gagal ? ' (dilewati ' + gagal + ')' : ''));

  const hasil = kirim({ aksi: 'selesai', token: token });
  Logger.log('SELESAI. Isi database Cloudflare sekarang: ' + JSON.stringify(hasil.jumlah));
  Logger.log('Silakan login di ' + ALAMAT_CLOUDFLARE + ' dengan username & password yang sama seperti sebelumnya.');
  return ringkas.join('\n');
}
