(function (AA) {
  'use strict';

  /** @param {string} sel @param {ParentNode} [root] */
  AA.$ = function (sel, root) {
    return (root || document).querySelector(sel);
  };

  /** @param {string} sel @param {ParentNode} [root] */
  AA.$$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /**
   * Create an element with optional props/children.
   * @param {string} tag
   * @param {Object} [props]
   * @param {...(Node|string|null|undefined)} children
   */
  AA.el = function (tag, props) {
    var el = document.createElement(tag);
    var children = Array.prototype.slice.call(arguments, 2);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v == null) return;
        if (k === 'className') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v; // static literals only
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k === 'dataset' && typeof v === 'object') {
          Object.keys(v).forEach(function (d) { el.dataset[d] = v[d]; });
        } else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
          el.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === 'attrs' && typeof v === 'object') {
          Object.keys(v).forEach(function (a) {
            if (v[a] != null) el.setAttribute(a, v[a]);
          });
        } else if (typeof v === 'boolean') {
          if (v) el.setAttribute(k, '');
          else el.removeAttribute(k);
        } else {
          el.setAttribute(k, v);
        }
      });
    }
    children.forEach(function (c) {
      if (c == null || c === false) return;
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  };

  var NS = 'http://www.w3.org/2000/svg';
  var ICONS = {
    camera: 'M4 8h3l2-2h6l2 2h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm8 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    barcode: 'M3 5v14M6 5v14M8 5v14M12 5v14M14 5v14M18 5v14M21 5v14',
    check: 'M4 12l5 5L20 6',
    x: 'M6 6l12 12M18 6L6 18',
    copy: 'M8 8h10v12H8zM6 16H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
    refresh: 'M4 12a8 8 0 0 1 14-5M20 12a8 8 0 0 1-14 5M20 4v5h-5M4 20v-5h5',
    edit: 'M4 16.5V20h3.5L18 9.5 14.5 6 4 16.5zM13 7.5l3.5 3.5',
    settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    alert: 'M12 4l9 16H3L12 4zm0 6v4m0 3h.01',
    shield: 'M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6l8-3z',
    layers: 'M12 3l9 5-9 5-9-5 9-5zm0 10l9 5-9 5-9-5 9-5z',
    tag: 'M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9zM7.5 7.5h.01',
    bolt: 'M13 2L4 14h7l-1 8 10-14h-7l0-6z',
    sparkle: 'M12 3v4M12 17v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M3 12h4M17 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8',
    image: 'M4 5h16v14H4V5zm3 9l3-3 3 3 4-4',
    trash: 'M5 7h14M9 7V5h6v2m-8 0l1 12h8l1-12',
    upload: 'M12 16V5m0 0l-4 4m4-4l4 4M5 19h14',
    info: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 7v5m0-8h.01',
    chevron: 'M9 6l6 6-6 6',
    building: 'M4 20h16M6 20V6l6-3 6 3v14M10 10h.01M14 10h.01M10 14h.01M14 14h.01',
    grid: 'M4 4h6v6H4V4zm10 0h6v6h-6V4zM4 14h6v6H4v-6zm10 0h6v6h-6v-6z'
  };

  /**
   * Build an inline SVG icon.
   * @param {string} name
   * @param {{size?:number, className?:string}} [opts]
   */
  AA.icon = function (name, opts) {
    opts = opts || {};
    var size = opts.size || 20;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');
    if (opts.className) svg.setAttribute('class', opts.className);
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', ICONS[name] || ICONS.info);
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.75');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);
    return svg;
  };

  AA.format = {
    bytes: function (n) {
      if (n < 1024) return n + ' B';
      if (n < 1024 * 1024) return (n / 1024).toFixed(1).replace(/\.0$/, '') + ' KB';
      return (n / (1024 * 1024)).toFixed(1).replace(/\.0$/, '') + ' MB';
    },
    mmss: function (ms) {
      var s = Math.max(0, Math.floor(ms / 1000));
      var m = Math.floor(s / 60);
      var r = s % 60;
      return String(m).padStart(2, '0') + ':' + String(r).padStart(2, '0');
    }
  };

  /** @param {string} text */
  AA.copy = function (text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(ta);
      }
    });
  };

  AA.prefersReducedMotion = function () {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  AA.announce = function (msg) {
    var live = AA.$('#live');
    if (!live) return;
    live.textContent = '';
    window.setTimeout(function () { live.textContent = msg; }, 30);
  };

  AA.revoke = function (url) {
    if (url) {
      try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
    }
  };

  AA.easeOut = function (t) {
    return 1 - Math.pow(1 - t, 2);
  };

  AA.stripTrailingSlash = function (s) {
    return String(s || '').replace(/\/+$/, '');
  };

  AA.isPositiveInt = function (s) {
    if (!s || !/^\d+$/.test(s)) return false;
    var n = Number(s);
    return n > 0 && Number.isFinite(n);
  };

  AA.digitsOnly = function (s, max) {
    return String(s || '').replace(/\D/g, '').slice(0, max || AA.config.MAX_ID_DIGITS);
  };
})(window.AA = window.AA || {});
