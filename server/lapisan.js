// =====================================================================
//  Lapisan penyimpanan Cloudflare D1 + pengganti layanan Google
//  (SpreadsheetApp, CacheService, PropertiesService, Utilities, DriveApp)
// =====================================================================
import { sha256 } from './sha256.js';
import { TABEL } from './tabel.js';

// Tabel kecil disimpan di memori server (cepat), tabel besar dibaca seperlunya dengan SQL.
export const KECIL = ['guru', 'santri', 'pengaturan', 'pengumuman', 'target', 'ketuntasan', 'syahriyah', 'program', 'program_isi'];
export const BESAR = ['absensi_guru', 'absensi_santri', 'jurnal', 'perkembangan'];
const SKEMA = '1';
const MAKS_SQL = 90000;

const MEM = { siap: false, ver: {}, rows: {}, foto: new Map(), ukuranFoto: 0 };
let DB = null;
let R = null;           // keadaan satu permintaan

export const nt = k => '"t_' + k + '"';
export const kol = c => '"' + c + '"';
export function lit(v) {
  if (v === null || v === undefined) return "''";
  return "'" + String(v).replace(/\u0000/g, '').replace(/'/g, "''") + "'";
}

// ---------- ID baris: berurutan sesuai waktu, sehingga urutan seperti lembar Sheets ----------
let akhirId = 0;
function idBaris_() {
  let x = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  if (x <= akhirId) x = akhirId + 1;
  akhirId = x;
  return x;
}

function barisDariDb_(k, r) {
  const o = { _baris: Number(r._r) };
  TABEL[k].kolom.forEach(c => { o[c] = r[c] === null || r[c] === undefined ? '' : String(r[c]); });
  return o;
}

// ---------- skema ----------
export async function siapkanSkema_(db) {
  let ok = null;
  try { ok = await db.prepare("SELECT v FROM _kv WHERE k = 'skema'").first(); } catch (e) { ok = null; }
  if (ok && ok.v === SKEMA + ':' + skemaKolom_()) return;
  const st = [
    'CREATE TABLE IF NOT EXISTS _kv (k TEXT PRIMARY KEY, v TEXT, exp INTEGER)',
    'CREATE TABLE IF NOT EXISTS _versi (t TEXT PRIMARY KEY, v INTEGER NOT NULL DEFAULT 1)',
    'CREATE TABLE IF NOT EXISTS _foto (id TEXT PRIMARY KEY, mime TEXT, data TEXT, dibuat TEXT)'
  ];
  Object.keys(TABEL).forEach(k => {
    st.push('CREATE TABLE IF NOT EXISTS ' + nt(k) + ' (_r INTEGER PRIMARY KEY, ' +
      TABEL[k].kolom.map(c => kol(c) + " TEXT DEFAULT ''").join(', ') + ')');
  });
  st.push(
    'CREATE INDEX IF NOT EXISTS i_abs_santri_tgl ON "t_absensi_santri" ("tanggal")',
    'CREATE INDEX IF NOT EXISTS i_abs_santri_nis ON "t_absensi_santri" ("nis", "tanggal")',
    'CREATE INDEX IF NOT EXISTS i_abs_guru_tgl ON "t_absensi_guru" ("tanggal")',
    'CREATE INDEX IF NOT EXISTS i_jurnal_tgl ON "t_jurnal" ("tanggal")',
    'CREATE INDEX IF NOT EXISTS i_jurnal_id ON "t_jurnal" ("id")',
    'CREATE INDEX IF NOT EXISTS i_pk_nis ON "t_perkembangan" ("nis")',
    'CREATE INDEX IF NOT EXISTS i_pk_id ON "t_perkembangan" ("id")',
    'CREATE INDEX IF NOT EXISTS i_kv_exp ON _kv (exp)',
    'INSERT OR IGNORE INTO _versi (t, v) VALUES ' + Object.keys(TABEL).map(k => '(' + lit(k) + ', 1)').join(', ')
  );
  await db.batch(st.map(s => db.prepare(s)));
  // kolom baru (bila daftar kolom bertambah di versi berikutnya)
  const keys = Object.keys(TABEL);
  const info = await db.batch(keys.map(k => db.prepare('PRAGMA table_info(' + nt(k) + ')')));
  const alter = [];
  keys.forEach((k, i) => {
    const ada = (info[i].results || []).map(r => r.name);
    TABEL[k].kolom.forEach(c => { if (ada.indexOf(c) < 0) alter.push('ALTER TABLE ' + nt(k) + ' ADD COLUMN ' + kol(c) + " TEXT DEFAULT ''"); });
  });
  alter.push("INSERT OR REPLACE INTO _kv (k, v, exp) VALUES ('skema', " + lit(SKEMA + ':' + skemaKolom_()) + ', NULL)');
  await db.batch(alter.map(s => db.prepare(s)));
}
function skemaKolom_() {
  let h = 0; const s = JSON.stringify(Object.keys(TABEL).map(k => [k, TABEL[k].kolom]));
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}

// ---------- awal & akhir setiap permintaan ----------
export async function mulai_(db, kunciKv) {
  DB = db;
  if (!MEM.siap) { await siapkanSkema_(db); MEM.siap = true; }
  const kunci = ['prop_GARAM'].concat(kunciKv || []);
  const [vr, kvr] = await db.batch([
    db.prepare('SELECT t, v FROM _versi'),
    db.prepare('SELECT k, v, exp FROM _kv WHERE k IN (' + kunci.map(lit).join(', ') + ')')
  ]);
  const ver = {};
  (vr.results || []).forEach(r => { ver[r.t] = Number(r.v); });
  const basi = KECIL.filter(k => MEM.ver[k] !== ver[k] || !MEM.rows[k]);
  if (basi.length) {
    const hasil = await db.batch(basi.map(k => db.prepare('SELECT * FROM ' + nt(k) + ' ORDER BY _r')));
    basi.forEach((k, i) => { MEM.rows[k] = (hasil[i].results || []).map(r => barisDariDb_(k, r)); MEM.ver[k] = ver[k]; });
  }
  const kv = new Map(), now = Date.now();
  (kvr.results || []).forEach(r => { if (!r.exp || Number(r.exp) > now) kv.set(r.k, r.v); });
  R = { baca: {}, ops: [], sentuh: new Set(), kv: kv, kvTulis: new Map(), kvHapus: new Set(),
        fotoTambah: [], fotoHapus: [], ver: ver };
  return R;
}

export function batal_() { R = null; }
export function bersihkanKv_() { if (R) R.bersihKv = true; }

// Menulis semua perubahan dalam satu transaksi D1 (atomik)
export async function simpanSemua_(hanyaKv) {
  const db = DB, st = [];
  // kv (sesi, percobaan login, garam)
  R.kvTulis.forEach((x, k) => st.push(db.prepare('INSERT OR REPLACE INTO _kv (k, v, exp) VALUES (?, ?, ?)').bind(k, x.v, x.exp)));
  if (R.kvHapus.size) st.push(db.prepare('DELETE FROM _kv WHERE k IN (' + [...R.kvHapus].map(lit).join(', ') + ')'));
  if (R.bersihKv) st.push(db.prepare('DELETE FROM _kv WHERE exp IS NOT NULL AND exp < ?').bind(Date.now()));
  const sentuh = [];
  if (!hanyaKv) {
    // gabungkan operasi per baris (operasi terakhir menang)
    const per = new Map();
    R.ops.forEach(op => {
      const key = op.k + '#' + op.o._baris, lama = per.get(key);
      if (!lama) { per.set(key, op); return; }
      if (op.jenis === 'hapus') per.set(key, lama.jenis === 'tambah' ? { jenis: 'batal' } : op);
      else if (lama.jenis === 'tambah') per.set(key, { jenis: 'tambah', k: op.k, o: op.o });
      else per.set(key, op);
    });
    const tulisBaris = {}, hapus = {};
    per.forEach(op => {
      if (op.jenis === 'batal') return;
      if (op.jenis === 'hapus') (hapus[op.k] = hapus[op.k] || []).push(op.o._baris);
      else (tulisBaris[op.k] = tulisBaris[op.k] || []).push(op.o);
    });
    Object.keys(tulisBaris).forEach(k => {
      const cols = TABEL[k].kolom, kepala = 'INSERT OR REPLACE INTO ' + nt(k) + ' (_r, ' + cols.map(kol).join(', ') + ') VALUES ';
      let buf = [], pj = kepala.length;
      const lepas = () => { if (buf.length) st.push(db.prepare(kepala + buf.join(', '))); buf = []; pj = kepala.length; };
      tulisBaris[k].forEach(o => {
        const v = '(' + Number(o._baris) + ', ' + cols.map(c => lit(o[c])).join(', ') + ')';
        if (pj + v.length > MAKS_SQL) lepas();
        buf.push(v); pj += v.length + 2;
      });
      lepas();
      sentuh.push(k);
    });
    Object.keys(hapus).forEach(k => {
      st.push(db.prepare('DELETE FROM ' + nt(k) + ' WHERE _r IN (' + hapus[k].map(Number).join(', ') + ')'));
      if (sentuh.indexOf(k) < 0) sentuh.push(k);
    });
    R.fotoTambah.forEach(f => st.push(db.prepare('INSERT OR REPLACE INTO _foto (id, mime, data, dibuat) VALUES (?, ?, ?, ?)').bind(f.id, f.mime, f.data, f.dibuat)));
    if (R.fotoHapus.length) st.push(db.prepare('DELETE FROM _foto WHERE id IN (' + R.fotoHapus.map(lit).join(', ') + ')'));
    if (sentuh.length) st.push(db.prepare('UPDATE _versi SET v = v + 1 WHERE t IN (' + sentuh.map(lit).join(', ') + ')'));
  }
  if (!st.length) return;
  if (sentuh.length) st.push(db.prepare('SELECT t, v FROM _versi'));
  const hasil = await db.batch(st);
  if (!hanyaKv) {
    R.fotoTambah.forEach(f => simpanFotoMem_(f.id, 'data:' + f.mime + ';base64,' + f.data));
    R.fotoHapus.forEach(id => MEM.foto.delete(id));
  }
  if (sentuh.length) {
    const baru = {};
    (hasil[hasil.length - 1].results || []).forEach(r => { baru[r.t] = Number(r.v); });
    sentuh.forEach(k => {
      if (KECIL.indexOf(k) < 0) return;
      if (baru[k] === R.ver[k] + 1 && R.baca[k]) {
        MEM.rows[k] = R.baca[k].map(o => Object.assign({}, o));
        MEM.ver[k] = baru[k];
      } else MEM.ver[k] = -1;   // ada perubahan lain bersamaan: muat ulang nanti
    });
  }
}

// ---------- baca / tulis (dipakai kode aplikasi) ----------
export function baca_(k) {
  if (R.baca[k]) return R.baca[k];
  if (KECIL.indexOf(k) < 0) throw new Error('baca_ tidak untuk tabel ' + k);
  R.baca[k] = (MEM.rows[k] || []).map(o => Object.assign({}, o));
  if (normalisasi_) normalisasi_(k, R.baca[k]);
  return R.baca[k];
}
let normalisasi_ = null;
export function aturNormalisasi_(fn) { normalisasi_ = fn; }

// Tabel besar: dibaca dengan syarat SQL
export async function cari_(k, syarat, param, ekor) {
  let sql = 'SELECT * FROM ' + nt(k) + (syarat ? ' WHERE ' + syarat : '') + (ekor || ' ORDER BY _r');
  let p = DB.prepare(sql);
  if (param && param.length) p = p.bind(...param);
  const h = await p.all();
  const rows = (h.results || []).map(r => barisDariDb_(k, r));
  if (normalisasi_) normalisasi_(k, rows);
  return rows;
}

export function tambah_(k, list) {
  if (!list || !list.length) return;
  const kecil = KECIL.indexOf(k) >= 0;
  const arr = kecil ? baca_(k) : null;
  list.forEach(o => {
    o._baris = idBaris_();
    TABEL[k].kolom.forEach(c => { o[c] = o[c] === undefined || o[c] === null ? '' : String(o[c]); });
    if (arr) arr.push(o);
    R.ops.push({ jenis: 'tambah', k: k, o: o });
  });
}

export function ubah_(k, o) {
  if (!o || !o._baris) throw new Error('Baris tidak dikenal.');
  if (KECIL.indexOf(k) >= 0) {
    const arr = baca_(k), i = arr.findIndex(x => x._baris === o._baris);
    if (i >= 0 && arr[i] !== o) { Object.keys(o).forEach(c => { if (o[c] !== undefined) arr[i][c] = o[c]; }); o = arr[i]; }
    else if (i < 0) arr.push(o);
  }
  TABEL[k].kolom.forEach(c => { if (o[c] === undefined || o[c] === null) o[c] = ''; else o[c] = String(o[c]); });
  R.ops.push({ jenis: 'ubah', k: k, o: o });
}

export function hapusBaris_(k, baris) {
  if (KECIL.indexOf(k) >= 0) {
    const arr = baca_(k), i = arr.findIndex(x => x._baris === baris);
    if (i >= 0) arr.splice(i, 1);
  }
  R.ops.push({ jenis: 'hapus', k: k, o: { _baris: baris } });
}

// ---------- foto (pengganti Google Drive) ----------
function simpanFotoMem_(id, url) {
  if (MEM.foto.has(id)) return;
  MEM.foto.set(id, url); MEM.ukuranFoto += url.length;
  while (MEM.ukuranFoto > 24e6 && MEM.foto.size) {           // batasi ~24 MB di memori
    const [k, v] = MEM.foto.entries().next().value; MEM.foto.delete(k); MEM.ukuranFoto -= v.length;
  }
}
export function simpanFotoData_(jenis, id, dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+\/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw new Error('Format foto tidak dikenali.');
  if (m[2].length * 0.75 > 700 * 1024) throw new Error('Ukuran foto terlalu besar.');
  const fid = jenis + '_' + String(id).replace(/[^A-Za-z0-9._-]/g, '') + '_' + Date.now().toString(36);
  R.fotoTambah.push({ id: fid, mime: m[1], data: m[2], dibuat: new Date().toISOString() });
  return fid;
}
export function hapusFotoData_(fid) { if (fid) R.fotoHapus.push(String(fid)); }
export async function fotoBanyak_(ids) {
  const out = {}, cari = [];
  ids.forEach(id => { if (!id) return; if (MEM.foto.has(id)) out[id] = MEM.foto.get(id); else cari.push(id); });
  for (let i = 0; i < cari.length; i += 50) {
    const bag = cari.slice(i, i + 50);
    const h = await DB.prepare('SELECT id, mime, data FROM _foto WHERE id IN (' + bag.map(lit).join(', ') + ')').all();
    (h.results || []).forEach(r => { const url = 'data:' + r.mime + ';base64,' + r.data; out[r.id] = url; simpanFotoMem_(r.id, url); });
  }
  return out;
}
export async function fotoDataUrl_(fid) {
  if (!fid) return '';
  const h = await fotoBanyak_([fid]);
  return h[fid] || '';
}

// ---------- pengganti layanan Google ----------
const cacheObj = {
  get: k => (R.kv.has(k) ? R.kv.get(k) : null),
  put: (k, v, detik) => { R.kv.set(k, String(v)); R.kvHapus.delete(k); R.kvTulis.set(k, { v: String(v), exp: Date.now() + (detik || 600) * 1000 }); },
  remove: k => { R.kv.delete(k); R.kvTulis.delete(k); R.kvHapus.add(k); }
};
export const CacheService = { getScriptCache: () => cacheObj };
export const PropertiesService = {
  getScriptProperties: () => ({
    getProperty: k => (R.kv.has('prop_' + k) ? R.kv.get('prop_' + k) : null),
    setProperty: (k, v) => { R.kv.set('prop_' + k, String(v)); R.kvTulis.set('prop_' + k, { v: String(v), exp: null }); }
  })
};
export const LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
export const Logger = { log: x => console.log(x) };

// Waktu Indonesia Barat (UTC+7, tanpa musim panas)
function bagianWaktu_(d) {
  const w = new Date(d.getTime() + 7 * 3600000);
  const p = n => (n < 10 ? '0' : '') + n;
  return { yyyy: String(w.getUTCFullYear()), MM: p(w.getUTCMonth() + 1), dd: p(w.getUTCDate()),
           HH: p(w.getUTCHours()), mm: p(w.getUTCMinutes()), ss: p(w.getUTCSeconds()) };
}
export const Utilities = {
  formatDate: (d, tz, pola) => { const b = bagianWaktu_(d); return pola.replace(/yyyy|MM|dd|HH|mm|ss/g, x => b[x]); },
  getUuid: () => crypto.randomUUID(),
  sleep: () => {},
  computeDigest: (alg, teks) => sha256(String(teks)),
  DigestAlgorithm: { SHA_256: 'SHA_256' },
  Charset: { UTF_8: 'UTF_8' }
};

export function db_() { return DB; }
export function req_() { return R; }
