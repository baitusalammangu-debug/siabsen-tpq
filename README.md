# SiAbsen TPQ Bahrul Ulum — versi Cloudflare

Aplikasi absensi, jurnal mengajar, program pembelajaran, perkembangan santri, kartu santri dan
syahriyah TPQ Bahrul Ulum Kapi Kunjang (metode Tilawati).

| Bagian | Tempat |
|---|---|
| Kode aplikasi | GitHub (repository ini) |
| Aplikasi web | Cloudflare Pages (`public/` + `functions/`) |
| Database | Cloudflare D1 (termasuk foto, gambar berita, tanda tangan) |

Setiap kali isi repository ini diubah, Cloudflare otomatis menerbitkan versi terbaru
dalam ±1 menit. Tidak perlu lagi menempel kode atau membuat "Versi baru" seperti di Apps Script.

---

## A. Unggah kode ke GitHub (sekali)

1. Ekstrak file ZIP **SiAbsen-TPQ-Cloudflare.zip** di komputer.
2. Buka `https://github.com/baitusalammangu-debug/siabsen-tpq/upload`.
3. Buka folder hasil ekstrak, **pilih semua isinya** (folder `public`, `functions`, `server`,
   `apps-script`, `pengalih-alamat-lama`, dan file `README.md`), lalu seret ke halaman GitHub tadi.
   Seret isinya, bukan folder induknya.
4. Tunggu semua file selesai terunggah, lalu klik **Commit changes**.

## B. Buat database D1 (sekali)

1. Masuk ke **dash.cloudflare.com**.
2. Menu kiri **Storage & databases → D1 SQL database → Create database**.
3. Nama: `siabsen-tpq`, lalu **Create**.

## C. Hubungkan GitHub ke Cloudflare Pages (sekali)

1. Menu **Compute (Workers & Pages) → Create**. Pilih tab **Pages** (atau tautan
   *"Looking to deploy Pages? Get started"*) → **Import an existing Git repository**.
2. Hubungkan akun GitHub, pilih repository **siabsen-tpq** → **Begin setup**.
3. Isi pengaturan build:
   - Project name: `siabsen-tpq` (alamatnya nanti `https://siabsen-tpq.pages.dev`)
   - Framework preset: **None**
   - Build command: *(kosongkan)*
   - Build output directory: `public`
4. Klik **Save and Deploy**, tunggu sampai selesai.
5. Buka project **siabsen-tpq → Settings → Bindings → Add → D1 database**:
   - Variable name: `DB` (huruf besar)
   - D1 database: `siabsen-tpq`
   - **Save**.
6. Buka tab **Deployments**, pada deployment teratas klik **⋯ → Retry deployment**
   agar database tersambung.
7. Buka `https://siabsen-tpq.pages.dev`. Bila halaman login tampil dan bisa masuk dengan
   `admin` / `admin123`, aplikasi sudah berjalan (database baru berisi data contoh).
   **Jangan mengisi data dulu** — langkah berikutnya memindahkan data lama.

## D. Pindahkan data dari Google Sheets (sekali)

1. Buka spreadsheet SiAbsen lama → **Ekstensi → Apps Script**.
2. Klik **(+) → Skrip**, beri nama `PindahKeCloudflare`, tempel seluruh isi
   `apps-script/PindahKeCloudflare.gs`.
3. Di baris atas, pastikan `ALAMAT_CLOUDFLARE` berisi alamat aplikasi baru
   (mis. `https://siabsen-tpq.pages.dev`). Simpan (Ctrl+S).
4. Pilih fungsi **pindahKeCloudflare** → **Jalankan** → izinkan akses bila diminta.
5. Tunggu sampai log menampilkan **SELESAI** (biasanya kurang dari 1–2 menit).
6. Buka aplikasi baru, login dengan **username & password lama** (password tetap sama).

Yang ikut pindah: semua data guru, santri, absensi, jurnal, program pembelajaran,
perkembangan, target & ketuntasan, syahriyah, berita, pengaturan, **semua foto**,
gambar berita, serta tanda tangan & stempel kepala TPQ.
Semua pengguna perlu login ulang satu kali.

Skrip boleh dijalankan ulang (mis. bila setelah pemindahan masih ada data baru yang
diisi di aplikasi lama). Data di Cloudflare akan diganti dengan isi Google Sheets terbaru.
Bila diminta, isi `ADMIN_CLOUDFLARE` dan `PASSWORD_CLOUDFLARE` dengan akun admin yang
berlaku di aplikasi baru.

## E. Alamat lama (opsional)

Agar yang membuka alamat pembungkus lama (mis. `https://siabsen-web.pages.dev`) langsung
diarahkan ke aplikasi baru: buka project Pages lama → **Create deployment / Upload assets** →
unggah file `pengalih-alamat-lama/index.html` (ubah alamatnya dulu bila berbeda).
Pengguna yang sudah memasang ikon lama sebaiknya menghapusnya lalu memasang ikon baru
dari alamat baru (popup pasang muncul otomatis setelah login).

---

## Batas paket gratis Cloudflare (lebih dari cukup untuk TPQ)

- D1: 5 GB penyimpanan, 5 juta baris dibaca & 100 ribu baris ditulis per hari.
- Pages Functions: 100 ribu permintaan per hari.

## Struktur folder

```
public/            tampilan aplikasi (HTML, JavaScript, ikon, PWA)
functions/api.js   pintu data aplikasi  (POST /api)
functions/impor.js pintu pemindahan data dari Google Sheets (POST /impor)
server/            logika aplikasi & penyimpanan D1
apps-script/       skrip pemindahan data untuk Google Apps Script
```

Tabel database dibuat otomatis saat aplikasi pertama kali dibuka; kolom baru di versi
berikutnya juga ditambahkan otomatis. Data bisa dilihat di Cloudflare:
**D1 → siabsen-tpq → Explore data** (nama tabel diawali `t_`, mis. `t_santri`).
