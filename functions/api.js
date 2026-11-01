// POST /api  { fn: 'namaFungsi', args: [...] }  ->  { ok: true, hasil } | { ok: false, galat }
import { API, siapkanDataAwal_, awalPermintaan_ } from '../server/inti.js';
import { mulai_, simpanSemua_, batal_ } from '../server/lapisan.js';

// Permintaan di satu server diproses bergantian agar data tidak saling menimpa.
let antrian = Promise.resolve();

async function jalankan(env, body) {
  if (!env.DB) return { ok: false, galat: 'Database belum terhubung. Di Cloudflare: Settings › Bindings › tambah D1 database dengan nama variabel DB, lalu deploy ulang.' };
  const fn = body && typeof body.fn === 'string' ? body.fn : '';
  if (!fn || !Object.prototype.hasOwnProperty.call(API, fn)) return { ok: false, galat: 'Fungsi tidak dikenal: ' + fn };
  const args = Array.isArray(body.args) ? body.args : [];
  const kunci = [];
  if (fn === 'login') kunci.push('gagal_' + String(args[0] || '').trim().toLowerCase().slice(0, 60));
  else if (typeof args[0] === 'string' && args[0]) kunci.push('sesi_' + args[0]);
  try {
    await mulai_(env.DB, kunci);
  } catch (e) {
    batal_();
    return { ok: false, galat: 'Gagal membuka database: ' + (e && e.message || e) };
  }
  awalPermintaan_();
  try {
    siapkanDataAwal_();
    const hasil = await API[fn](...args);
    await simpanSemua_();
    return { ok: true, hasil: hasil === undefined ? null : hasil };
  } catch (e) {
    try { await simpanSemua_(true); } catch (x) {}
    const pesan = String(e && e.message || e).replace(/^Error:\s*/, '');
    if (!/SESI_HABIS/.test(pesan) && !(e instanceof Error && e.constructor === Error)) console.error(e);
    return { ok: false, galat: pesan };
  } finally {
    batal_();
  }
}

export async function onRequestPost({ request, env }) {
  let body = null;
  try { body = await request.json(); } catch (e) { body = null; }
  const kerja = antrian.then(() => jalankan(env, body));
  antrian = kerja.catch(() => {});
  const hasil = await kerja;
  return new Response(JSON.stringify(hasil), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, aplikasi: 'SiAbsen TPQ Bahrul Ulum' }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}
