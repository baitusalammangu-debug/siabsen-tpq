/* SiAbsen TPQ — tawaran pasang aplikasi ke layar utama (PWA).
   Aplikasi mengirim pesan 'halo' / 'login' / 'pasang'; berkas ini menampilkan popup yang sesuai
   (tombol Instal asli di Android/laptop, petunjuk Safari di iPhone, petunjuk khusus browser WhatsApp/Instagram). */
var CSS_PASANG = '/* ---------- popup pasang aplikasi ---------- */   #latar { position: fixed; inset: 0; background: rgba(8, 30, 18, .45); z-index: 90; opacity: 0; pointer-events: none; transition: opacity .3s; }   #latar.tampil { opacity: 1; pointer-events: auto; }   #pasang { position: fixed; left: 12px; right: 12px; top: calc(12px + env(safe-area-inset-top)); z-index: 91; max-width: 480px; margin: 0 auto;             background: #fff; color: #1d2a23; border-radius: 20px; padding: 18px; box-shadow: 0 18px 50px rgba(0,0,0,.3);             transform: translateY(calc(-100% - 60px)); transition: transform .4s cubic-bezier(.2,.9,.3,1.2); }   #pasang.tampil { transform: none; }   .p-atas { display: flex; gap: 14px; align-items: center; }   .p-atas img { width: 58px; height: 58px; border-radius: 16px; box-shadow: 0 0 0 2px #c9a227; flex: none; }   .p-atas b { display: block; font-size: 17px; }   .p-atas span { font-size: 13.5px; color: #5d6b63; }   .p-tutup { position: absolute; top: 8px; right: 8px; width: 34px; height: 34px; border: 0; background: none; font-size: 22px; color: #8a958e; cursor: pointer; border-radius: 50%; }   .p-untung { list-style: none; padding: 0; margin: 14px 0 0; display: grid; gap: 6px; font-size: 13.5px; color: #3c4a42; }   .p-untung li::before { content: "✓"; color: #198754; font-weight: 800; margin-right: 8px; }   .p-aksi { display: flex; gap: 8px; margin-top: 16px; }   .p-aksi button { flex: 1; border: 0; border-radius: 12px; padding: 13px 10px; font: inherit; font-weight: 700; font-size: 15px; cursor: pointer; }   .p-ya { background: #0f5132; color: #fff; }   .p-nanti { background: #eef4f0; color: #0f5132; flex: .6 !important; }   .p-langkah { margin: 14px 0 0; padding: 12px 12px 12px 34px; background: #f6f3ea; border-radius: 12px; font-size: 14px; line-height: 1.6; }   .p-langkah li { margin: 2px 0; }   .p-ikon { display: inline-flex; vertical-align: middle; width: 22px; height: 22px; align-items: center; justify-content: center;             background: #fff; border: 1px solid #ddd; border-radius: 6px; margin: 0 2px; }   .p-ikon svg { width: 15px; height: 15px; }   #pesanKecil { position: fixed; left: 50%; bottom: calc(90px + env(safe-area-inset-bottom)); transform: translateX(-50%) translateY(30px); z-index: 92;                 background: #12301f; color: #fff; padding: 11px 18px; border-radius: 12px; font-size: 14px; font-weight: 600; opacity: 0;                 transition: all .3s; pointer-events: none; max-width: calc(100% - 32px); text-align: center; }   #pesanKecil.tampil { opacity: 1; transform: translateX(-50%); }';

(function () {
  /* gaya & elemen popup */
  var gaya = document.createElement('style');
  gaya.textContent = CSS_PASANG;
  document.head.appendChild(gaya);
  ['latar', 'pasang', 'pesanKecil'].forEach(function (id) {
    var el = document.createElement('div'); el.id = id;
    if (id === 'pasang') { el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'pJudul'); }
    document.body.appendChild(el);
  });

  /* ---------- keadaan perangkat ---------- */
  var ua = navigator.userAgent || '';
  var iOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var dalamApp = /FBAN|FBAV|Instagram|Line\/|WhatsApp|; wv\)|MicroMessenger|TikTok/i.test(ua);   /* browser bawaan aplikasi lain */
  var safariIOS = iOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  function terpasang() {
    return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true ||
           ls('tpqbu_terpasang') === '1' && location.search.indexOf('sumber=ikon') >= 0;
  }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- tombol "Instal" asli browser (Android Chrome, Edge, laptop) ---------- */
  var promptInstal = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); promptInstal = e; balasWadah(); });
  window.addEventListener('appinstalled', function () {
    ls('tpqbu_terpasang', '1'); promptInstal = null; tutup(true);
    pesan('Alhamdulillah, SiAbsen sudah terpasang di layar utama.');
    balasWadah();
  });

  /* ---------- komunikasi dengan aplikasi (halaman yang sama) ---------- */
  var sumber = null;
  function dariAplikasi(w) { return w === window; }
  function balasWadah() {
    if (!sumber) return;
    try { sumber.postMessage({ tpqbu: 1, jenis: 'wadah', url: location.origin + location.pathname,
                               terpasang: terpasang(), bisaPrompt: !!promptInstal }, '*'); } catch (e) {}
  }
  window.addEventListener('message', function (e) {
    var d = e.data || {};
    if (!d.tpqbu || d.jenis === 'wadah' || !dariAplikasi(e.source)) return;
    sumber = e.source;
    if (d.jenis === 'halo') balasWadah();
    if (d.jenis === 'login') { balasWadah(); setTimeout(function () { tawarkan(false); }, 1200); }
    if (d.jenis === 'pasang') tawarkan(true);
  });

  /* ---------- popup ---------- */
  var kotak = document.getElementById('pasang'), latar = document.getElementById('latar');
  var IKON_BAGIKAN = '<span class="p-ikon"><svg viewBox="0 0 24 24" fill="none" stroke="#1a73e8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1"/></svg></span>';
  var IKON_TITIK = '<span class="p-ikon"><svg viewBox="0 0 24 24" fill="#444"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg></span>';
  var IKON_TAMBAH = '<span class="p-ikon"><svg viewBox="0 0 24 24" fill="none" stroke="#444" stroke-width="2" stroke-linecap="round"><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/></svg></span>';

  function kepala(judul, sub) {
    return '<button class="p-tutup" aria-label="Tutup" data-aksi="nanti">×</button>' +
      '<div class="p-atas"><img src="/ikon-192.png" alt=""><div><b id="pJudul">' + judul + '</b><span>' + sub + '</span></div></div>';
  }
  function tampil(html) {
    kotak.innerHTML = html; latar.className = 'tampil';
    requestAnimationFrame(function () { kotak.className = 'tampil'; });
  }
  function tutup(diam) {
    kotak.className = ''; latar.className = '';
    if (!diam) ls('tpqbu_pasang_tutup', String(Date.now()));
  }
  function pesan(t) {
    var p = document.getElementById('pesanKecil'); p.textContent = t; p.className = 'tampil';
    clearTimeout(pesan._t); pesan._t = setTimeout(function () { p.className = ''; }, 3500);
  }

  // paksa = dibuka dari tombol "Pasang Sekarang" di menu Akun
  function tawarkan(paksa) {
    if (terpasang()) { if (paksa) pesan('SiAbsen sudah terpasang dan sedang dibuka dari layar utama.'); return; }
    if (!paksa) {
      var t = Number(ls('tpqbu_pasang_tutup') || 0);
      if (Date.now() - t < 3 * 86400000) return;      /* sudah ditolak: tawarkan lagi 3 hari kemudian */
    }
    var judul = 'Pasang SiAbsen di HP Anda', sub = 'TPQ Bahrul Ulum · gratis, tanpa Play Store';
    var untung = '<ul class="p-untung"><li>Ikon logo TPQ di layar utama</li><li>Langsung terbuka tanpa browser</li><li>Lebih cepat dan tidak perlu mengetik alamat</li></ul>';

    if (dalamApp) {
      tampil(kepala(judul, 'Buka di browser terlebih dahulu') +
        '<ol class="p-langkah"><li>Ketuk ' + IKON_TITIK + ' di pojok kanan atas.</li>' +
        '<li>Pilih <b>' + (iOS ? 'Buka di Safari' : 'Buka di Chrome') + '</b>.</li>' +
        '<li>Login, lalu ketuk <b>Pasang</b> saat tawaran ini muncul lagi.</li></ol>' +
        '<div class="p-aksi"><button class="p-ya" data-aksi="salin">Salin Alamat</button><button class="p-nanti" data-aksi="nanti">Nanti</button></div>');
    } else if (promptInstal) {
      tampil(kepala(judul, sub) + untung +
        '<div class="p-aksi"><button class="p-ya" data-aksi="instal">Pasang Sekarang</button><button class="p-nanti" data-aksi="nanti">Nanti</button></div>');
    } else if (iOS) {
      tampil(kepala(judul, sub) + untung +
        (safariIOS
          ? '<ol class="p-langkah"><li>Ketuk tombol <b>Bagikan</b> ' + IKON_BAGIKAN + ' di bawah layar.</li>' +
            '<li>Gulir lalu pilih <b>Tambah ke Layar Utama</b> ' + IKON_TAMBAH + '.</li><li>Ketuk <b>Tambah</b> di pojok kanan atas.</li></ol>'
          : '<ol class="p-langkah"><li>Di iPhone, pemasangan harus lewat <b>Safari</b>.</li><li>Salin alamat ini, buka di Safari, lalu ikuti petunjuknya.</li></ol>') +
        '<div class="p-aksi">' + (safariIOS ? '<button class="p-ya" data-aksi="paham">Mengerti</button>' : '<button class="p-ya" data-aksi="salin">Salin Alamat</button>') +
        '<button class="p-nanti" data-aksi="nanti">Nanti</button></div>');
    } else {
      /* Android/laptop tanpa tombol instal otomatis: petunjuk manual */
      tampil(kepala(judul, sub) + untung +
        '<ol class="p-langkah"><li>Ketuk ' + IKON_TITIK + ' (menu) di pojok kanan atas browser.</li>' +
        '<li>Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</li><li>Ketuk <b>Instal</b> / <b>Tambahkan</b>.</li></ol>' +
        '<div class="p-aksi"><button class="p-ya" data-aksi="paham">Mengerti</button><button class="p-nanti" data-aksi="nanti">Nanti</button></div>');
    }
  }

  kotak.addEventListener('click', function (e) {
    var b = e.target.closest('[data-aksi]'); if (!b) return;
    var a = b.getAttribute('data-aksi');
    if (a === 'nanti') tutup(false);
    if (a === 'paham') tutup(true);
    if (a === 'salin') {
      var url = location.origin + location.pathname;
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () {
        pesan('Alamat disalin. Tempel di ' + (iOS ? 'Safari' : 'Chrome') + '.');
      }, function () { prompt('Salin alamat ini:', url); });
      tutup(true);
    }
    if (a === 'instal' && promptInstal) {
      promptInstal.prompt();
      Promise.resolve(promptInstal.userChoice).then(function (hasil) {
        if (hasil && hasil.outcome === 'accepted') { ls('tpqbu_terpasang', '1'); tutup(true); }
        else tutup(false);
        promptInstal = null; balasWadah();
      });
    }
  });
  latar.addEventListener('click', function () { tutup(false); });
})();
