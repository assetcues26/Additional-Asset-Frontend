(function (AA) {
  'use strict';

  var readyCallback = null;
  var wired = false;

  /**
   * SHA-256 hex digest. Uses Web Crypto when available; pure-JS fallback for file://.
   * @param {string} text
   * @returns {Promise<string>}
   */
  function sha256Hex(text) {
    if (window.crypto && window.crypto.subtle) {
      try {
        var data = new TextEncoder().encode(text);
        return window.crypto.subtle.digest('SHA-256', data).then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (b) {
            return ('0' + b.toString(16)).slice(-2);
          }).join('');
        }).catch(function () {
          return Promise.resolve(sha256HexSync(text));
        });
      } catch (e) {
        return Promise.resolve(sha256HexSync(text));
      }
    }
    return Promise.resolve(sha256HexSync(text));
  }

  /** Compact pure-JS SHA-256 (UTF-8 string → hex). */
  function sha256HexSync(str) {
    function rotr(n, x) { return (x >>> n) | (x << (32 - n)); }
    function ch(x, y, z) { return (x & y) ^ (~x & z); }
    function maj(x, y, z) { return (x & y) ^ (x & z) ^ (y & z); }
    function bsig0(x) { return rotr(2, x) ^ rotr(13, x) ^ rotr(22, x); }
    function bsig1(x) { return rotr(6, x) ^ rotr(11, x) ^ rotr(25, x); }
    function ssig0(x) { return rotr(7, x) ^ rotr(18, x) ^ (x >>> 3); }
    function ssig1(x) { return rotr(17, x) ^ rotr(19, x) ^ (x >>> 10); }

    var K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];

    var utf8 = unescape(encodeURIComponent(str));
    var bytes = [];
    for (var i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i) & 0xff);
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while ((bytes.length % 64) !== 56) bytes.push(0);
    for (var hi = Math.floor(bitLen / 0x100000000), lo = bitLen >>> 0, s = 24; s >= 0; s -= 8) {
      bytes.push((hi >>> s) & 0xff);
    }
    for (s = 24; s >= 0; s -= 8) bytes.push((lo >>> s) & 0xff);

    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];

    for (var off = 0; off < bytes.length; off += 64) {
      var w = new Array(64);
      for (i = 0; i < 16; i++) {
        var j = off + i * 4;
        w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
      }
      for (i = 16; i < 64; i++) {
        w[i] = (ssig1(w[i - 2]) + w[i - 7] + ssig0(w[i - 15]) + w[i - 16]) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var t1 = (h + bsig1(e) + ch(e, f, g) + K[i] + w[i]) >>> 0;
        var t2 = (bsig0(a) + maj(a, b, c)) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0;
        d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
      H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
      H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }

    return H.map(function (x) {
      return ('00000000' + x.toString(16)).slice(-8);
    }).join('');
  }

  function isUnlocked() {
    try {
      return sessionStorage.getItem(AA.config.STORAGE.unlocked) === '1';
    } catch (e) {
      return false;
    }
  }

  function setUnlocked(on) {
    try {
      if (on) sessionStorage.setItem(AA.config.STORAGE.unlocked, '1');
      else sessionStorage.removeItem(AA.config.STORAGE.unlocked);
    } catch (e) { /* ignore */ }
  }

  function showOverlay() {
    var el = AA.$('#lock-overlay');
    if (!el) return;
    el.hidden = false;
    el.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    var input = AA.$('#lock-password');
    var err = AA.$('#lock-error');
    if (err) err.textContent = '';
    if (input) {
      input.value = '';
      window.setTimeout(function () { try { input.focus(); } catch (e) { /* ignore */ } }, 40);
    }
  }

  function hideOverlay() {
    var el = AA.$('#lock-overlay');
    if (!el) return;
    el.hidden = true;
    el.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
  }

  function verify(password) {
    var salt = AA.config.LOCK_SALT || '';
    var expected = String(AA.config.LOCK_HASH || '').toLowerCase();
    return sha256Hex(String(password || '') + salt).then(function (hex) {
      return hex.toLowerCase() === expected;
    });
  }

  function finishUnlock() {
    setUnlocked(true);
    hideOverlay();
    AA.toast('Unlocked', { type: 'success', ms: 1800 });
    var cb = readyCallback;
    readyCallback = null;
    if (cb) cb();
  }

  function attemptUnlock() {
    var input = AA.$('#lock-password');
    var err = AA.$('#lock-error');
    var btn = AA.$('#lock-submit');
    var card = AA.$('.lock-card');
    var pw = input ? input.value : '';

    if (!pw) {
      if (err) err.textContent = 'Enter the access password.';
      if (card && AA.fx) AA.fx.shake(card);
      if (input) input.focus();
      return;
    }

    if (btn) {
      btn.setAttribute('aria-disabled', 'true');
      var label = AA.$('.btn-label', btn);
      if (label) label.textContent = 'Checking…';
    }

    verify(pw).then(function (ok) {
      if (btn) {
        btn.setAttribute('aria-disabled', 'false');
        var lab = AA.$('.btn-label', btn);
        if (lab) lab.textContent = 'Unlock';
      }
      if (!ok) {
        if (err) err.textContent = 'Incorrect password.';
        if (card && AA.fx) AA.fx.shake(card);
        if (input) { input.select(); input.focus(); }
        return;
      }
      finishUnlock();
    });
  }

  function wireOnce() {
    if (wired) return;
    wired = true;

    var form = AA.$('#lock-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        attemptUnlock();
      });
    }

    var lockBtn = AA.$('#btn-lock');
    if (lockBtn) {
      if (!AA.config.LOCK_ENABLED) {
        lockBtn.hidden = true;
      } else {
        lockBtn.addEventListener('click', function () {
          setUnlocked(false);
          readyCallback = null; // already booted; unlock only hides overlay
          showOverlay();
        });
      }
    }
  }

  /**
   * Gate app boot behind the soft lock when enabled.
   * @param {Function} onReady called once when unlocked (or lock disabled)
   */
  AA.lock = {
    require: function (onReady) {
      wireOnce();

      if (!AA.config.LOCK_ENABLED) {
        hideOverlay();
        var lockBtnOff = AA.$('#btn-lock');
        if (lockBtnOff) lockBtnOff.hidden = true;
        if (onReady) onReady();
        return;
      }

      if (isUnlocked()) {
        hideOverlay();
        if (onReady) onReady();
        return;
      }

      readyCallback = onReady;
      showOverlay();
    },

    isUnlocked: isUnlocked,
    verify: verify,
    sha256Hex: sha256Hex
  };
})(window.AA = window.AA || {});
