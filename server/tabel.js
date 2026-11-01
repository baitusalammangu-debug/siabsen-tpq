// Susunan kolom setiap tabel (sama dengan lembar Google Sheets versi sebelumnya)
export const TABEL = {
  guru: {
    nama: 'Guru',
    kolom: ['username', 'nama', 'peran', 'kelas', 'jk', 'nik', 'tempat_lahir', 'tanggal_lahir', 'alamat', 'hp',
            'pendidikan', 'mulai_mengajar', 'jabatan', 'sertifikasi', 'foto', 'password', 'aktif'],
    label: { nama: 'Nama Lengkap', peran: 'Peran (admin/guru/bendahara)', kelas: 'Jilid Diampu', hp: 'No Handphone' }
  },
  santri: {
    nama: 'Santri',
    kolom: ['nis', 'tanggal_masuk', 'nama', 'kelas', 'kewarganegaraan', 'tanggal_lahir', 'nik', 'jk', 'tempat_lahir',
            'agama', 'hp', 'nama_ayah', 'status_ayah', 'nama_ibu', 'status_ibu', 'status_wali', 'nama_wali', 'hp_wali',
            'alamat', 'syahriyah', 'foto', 'password', 'aktif'],
    label: { nama: 'Nama Lengkap', kelas: 'Tingkat', hp: 'No Handphone', hp_wali: 'No HP Wali' }
  },
  absensi_guru:   { nama: 'Absensi Guru',        kolom: ['tanggal', 'username', 'nama', 'status', 'jam', 'keterangan', 'dicatat'] },
  absensi_santri: { nama: 'Absensi Santri',      kolom: ['tanggal', 'nis', 'nama', 'kelas', 'status', 'keterangan', 'guru', 'dicatat'] },
  jurnal:         { nama: 'Jurnal Mengajar',     kolom: ['id', 'tanggal', 'username', 'nama_guru', 'kelas', 'materi', 'kegiatan', 'catatan', 'dicatat'] },
  perkembangan:   { nama: 'Perkembangan Santri', kolom: ['id', 'tanggal', 'nis', 'nama', 'kelas', 'jenis', 'posisi', 'nilai', 'catatan', 'guru', 'username', 'dicatat'] },
  syahriyah: {
    nama: 'Syahriyah',
    kolom: ['id', 'tanggal', 'nis', 'nama', 'kelas', 'bulan', 'nominal', 'metode', 'penerima', 'keterangan', 'dicatat'],
    label: { tanggal: 'Tanggal Bayar', kelas: 'Tingkat', bulan: 'Untuk Bulan (yyyy-mm)', penerima: 'Diterima Oleh' }
  },
  pengumuman: {
    nama: 'Pengumuman',
    kolom: ['id', 'tanggal', 'kategori', 'judul', 'isi', 'gambar', 'sematkan', 'oleh', 'aktif'],
    label: { gambar: 'Gambar (ID Google Drive)', sematkan: 'Sematkan (Y/N)' }
  },
  target: {
    nama: 'Target Jilid',
    kolom: ['id', 'jilid', 'urutan', 'kategori', 'materi', 'indikator', 'aktif'],
    label: { jilid: 'Jilid', urutan: 'Urutan', materi: 'Materi Target', indikator: 'Indikator / Keterangan' }
  },
  ketuntasan: {
    nama: 'Ketuntasan Target',
    kolom: ['id', 'tanggal', 'nis', 'nama', 'jilid', 'target_id', 'materi', 'guru', 'username', 'dicatat'],
    label: { jilid: 'Jilid', target_id: 'ID Target', materi: 'Materi Target' }
  },
  program: {
    nama: 'Program Pembelajaran',
    kolom: ['id', 'jilid', 'username', 'nama_ustadz', 'kelompok', 'periode', 'waktu_peraga', 'teknik_peraga',
            'waktu_simak', 'teknik_simak', 'aktif', 'dibuat'],
    label: { jilid: 'Jilid / Al-Qur\'an', username: 'Username Ustadz', nama_ustadz: 'Nama Ustadz', kelompok: 'Kelompok',
             periode: 'Periode / Tahun Ajaran', waktu_peraga: 'Waktu Klassikal Peraga', teknik_peraga: 'Teknik Klassikal Peraga',
             waktu_simak: 'Waktu Baca Simak', teknik_simak: 'Teknik Baca Simak', dibuat: 'Dibuat Pada' }
  },
  program_isi: {
    nama: 'Isi Program Pembelajaran',
    kolom: ['program_id', 'pertemuan', 'peraga', 'simak', 'kelancaran', 'munaqosyah', 'username', 'diubah'],
    label: { program_id: 'ID Program', pertemuan: 'Pertemuan Ke', peraga: 'Klassikal Peraga/hal',
             simak: 'Baca Simak Buku Tilawati/hal', kelancaran: 'Prosentase Kelancaran (%)',
             munaqosyah: 'Pemantapan Persiapan Munaqosyah', username: 'Diisi Oleh', diubah: 'Diubah Pada' }
  },
  pengaturan:     { nama: 'Pengaturan',          kolom: ['kunci', 'nilai'] }
};
