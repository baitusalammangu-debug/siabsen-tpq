// POST /impor — dipakai SEKALI oleh skrip "PindahKeCloudflare.gs" di Google Apps Script
// untuk memindahkan semua data dari Google Sheets ke database D1.
import { TABEL } from '../server/tabel.js';
import { siapkanSkema_, lit, nt, kol } from '../server/lapisan.js';
import { sha256 } from '../server/sha256.js';

const MAKS_SQL = 90000;
const jawab = o => new Response(JSON.stringify(o), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const hex = b => b.map(x => ('0' + x.toString(16)).slice(-2)).join('');

async function cekAdmin(db, username, password) {
  username = String(username || '').trim().toLowerCase();
  password = String(password || '');
  const g = (await db.prepare('SELECT username, peran, password, aktif FROM "t_guru"').all()).results || [];
  const r = g.find(x => String(x.username).toLowerCase() === username && String(x.aktif || 'Y').toUpperCase() !== 'N');
  if (!r || String(r.peran).toLowerCase() !== 'admin' || !password) return false;
  const pw = String(r.password || '');
  if (pw.indexOf('sha256:') === 0) {
    const gr = await db.prepare("SELECT v FROM _kv WHERE k = 'prop_GARAM'").first();
    return !!gr && pw === 'sha256:' + hex(sha256(gr.v + '|' + password));
  }
  return pw === password;
}

async function cekToken(db, token) {
  if (!token) return false;
  const r = await db.prepare('SELECT exp FROM _kv WHERE k = ?').bind('impor_' + token).first();
  return !!r && Number(r.exp) > Date.now();
}

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  if (!db) return jawab({ ok: false, galat: 'Database D1 belum dihubungkan (binding DB).' });
  let d;
  try { d = await request.json(); } catch (e) { return jawab({ ok: false, galat: 'Data tidak terbaca.' }); }
  try {
    await siapkanSkema_(db);
    if (d.aksi === 'masuk') {
      const guru = await db.prepare('SELECT COUNT(*) AS n FROM "t_guru"').first();
      // database baru (belum ada akun) boleh langsung diisi; selain itu wajib akun admin yang berlaku di Cloudflare
      if (Number(guru.n) > 0 && !(await cekAdmin(db, d.username, d.password)))
        return jawab({ ok: false, galat: 'Username/password admin aplikasi Cloudflare salah. Untuk database baru gunakan admin / admin123.' });
      const token = crypto.randomUUID() + crypto.randomUUID();
      await db.prepare('INSERT OR REPLACE INTO _kv (k, v, exp) VALUES (?, ?, ?)').bind('impor_' + token, '1', Date.now() + 3 * 3600000).run();
      return jawab({ ok: true, token: token });
    }
    if (!(await cekToken(db, d.token))) return jawab({ ok: false, galat: 'Sesi impor habis. Jalankan ulang skrip.' });

    if (d.aksi === 'garam') {
      if (d.garam) await db.prepare("INSERT OR REPLACE INTO _kv (k, v, exp) VALUES ('prop_GARAM', ?, NULL)").bind(String(d.garam)).run();
      return jawab({ ok: true });
    }
    if (d.aksi === 'tabel') {
      const k = d.tabel;
      if (!TABEL[k]) return jawab({ ok: false, galat: 'Tabel tidak dikenal: ' + k });
      const cols = TABEL[k].kolom, st = [];
      if (d.awal) st.push(db.prepare('DELETE FROM ' + nt(k)));
      const kepala = 'INSERT OR REPLACE INTO ' + nt(k) + ' (_r, ' + cols.map(kol).join(', ') + ') VALUES ';
      let buf = [], pj = kepala.length;
      const lepas = () => { if (buf.length) st.push(db.prepare(kepala + buf.join(', '))); buf = []; pj = kepala.length; };
      const mulai = Number(d.mulai) || 0;
      (d.baris || []).forEach((o, i) => {
        const v = '(' + (mulai + i + 1) + ', ' + cols.map(c => lit(o && o[c] !== undefined && o[c] !== null ? String(o[c]) : '')).join(', ') + ')';
        if (pj + v.length > MAKS_SQL) lepas();
        buf.push(v); pj += v.length + 2;
      });
      lepas();
      if (st.length > 45) return jawab({ ok: false, galat: 'Potongan data terlalu besar, kecilkan ukuran kiriman.' });
      if (st.length) await db.batch(st);
      return jawab({ ok: true, jumlah: (d.baris || []).length });
    }
    if (d.aksi === 'foto') {
      const st = (d.foto || []).filter(f => f && f.id && f.data && /^image\//.test(f.mime || ''))
        .map(f => db.prepare('INSERT OR REPLACE INTO _foto (id, mime, data, dibuat) VALUES (?, ?, ?, ?)')
          .bind(String(f.id), String(f.mime), String(f.data), new Date().toISOString()));
      if (st.length) await db.batch(st);
      return jawab({ ok: true, jumlah: st.length });
    }
    if (d.aksi === 'selesai') {
      await db.batch([
        db.prepare('UPDATE _versi SET v = v + 1000'),
        db.prepare("DELETE FROM _kv WHERE k LIKE 'sesi\\_%' ESCAPE '\\' OR k LIKE 'gagal\\_%' ESCAPE '\\' OR k LIKE 'impor\\_%' ESCAPE '\\'")
      ]);
      const n = {};
      const hasil = await db.batch(Object.keys(TABEL).map(k => db.prepare('SELECT COUNT(*) AS n FROM ' + nt(k))));
      Object.keys(TABEL).forEach((k, i) => { n[k] = hasil[i].results[0].n; });
      const f = await db.prepare('SELECT COUNT(*) AS n FROM _foto').first();
      n.foto = f.n;
      return jawab({ ok: true, jumlah: n });
    }
    return jawab({ ok: false, galat: 'Aksi tidak dikenal.' });
  } catch (e) {
    return jawab({ ok: false, galat: String(e && e.message || e) });
  }
}
