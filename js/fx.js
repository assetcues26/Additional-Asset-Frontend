(function (AA) {
  'use strict';

  AA.fx = {
    /**
     * @param {HTMLElement} el
     * @param {number} from
     * @param {number} to
     * @param {number} ms
     */
    countUp: function (el, from, to, ms) {
      if (!el) return;
      if (AA.prefersReducedMotion()) {
        el.textContent = String(Math.round(to));
        return;
      }
      var start = performance.now();
      function frame(now) {
        var t = Math.min(1, (now - start) / ms);
        var v = from + (to - from) * AA.easeOut(t);
        el.textContent = String(Math.round(v));
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    },

    /**
     * @param {SVGPathElement} pathEl
     * @param {number} value 0-100
     * @param {SVGCircleElement} [dotEl]
     * @param {number} [ms]
     */
    gauge: function (pathEl, value, dotEl, ms) {
      ms = ms || 1100;
      if (!pathEl) return;
      var L = pathEl.getTotalLength();
      pathEl.style.strokeDasharray = String(L);
      var target = L * (1 - Math.max(0, Math.min(100, value)) / 100);

      if (AA.prefersReducedMotion()) {
        pathEl.style.strokeDashoffset = String(target);
        if (dotEl) {
          try {
            var pt = pathEl.getPointAtLength(L - target);
            dotEl.setAttribute('cx', String(pt.x));
            dotEl.setAttribute('cy', String(pt.y));
            dotEl.style.opacity = '1';
          } catch (e) { dotEl.style.opacity = '0'; }
        }
        return;
      }

      pathEl.style.transition = 'none';
      pathEl.style.strokeDashoffset = String(L);
      // force reflow
      pathEl.getBoundingClientRect();
      pathEl.style.transition = 'stroke-dashoffset ' + ms + 'ms var(--ease-out)';
      pathEl.style.strokeDashoffset = String(target);

      if (!dotEl) return;
      var start = performance.now();
      function frame(now) {
        var t = Math.min(1, (now - start) / ms);
        var eased = AA.easeOut(t);
        var offset = L - (L - target) * eased;
        try {
          var p = pathEl.getPointAtLength(L - offset);
          // getPointAtLength uses distance along path from start
          var dist = L * eased * (value / 100);
          // Actually: start at offset L (empty), end at target.
          // Visible arc length = L - offset = (L - target) * eased
          var along = (L - target) * eased;
          p = pathEl.getPointAtLength(along);
          dotEl.setAttribute('cx', String(p.x));
          dotEl.setAttribute('cy', String(p.y));
          dotEl.style.opacity = '1';
        } catch (e) {
          dotEl.style.opacity = '0';
        }
        if (t < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    },

    /**
     * Odometer roll for a string into container.
     * @param {HTMLElement} el
     * @param {string} str
     */
    odometer: function (el, str) {
      if (!el) return;
      while (el.firstChild) el.removeChild(el.firstChild);
      var sr = AA.el('span', { className: 'sr-only', text: str });
      el.appendChild(sr);
      var reduced = AA.prefersReducedMotion();

      String(str).split('').forEach(function (ch, i) {
        if (/\d/.test(ch) && !reduced) {
          var col = AA.el('span', {
            className: 'tag-number__col',
            style: { '--i': String(i) }
          });
          var inner = AA.el('span', { className: 'tag-number__col-inner' });
          for (var d = 0; d <= 9; d++) {
            inner.appendChild(AA.el('span', { text: String(d) }));
          }
          col.appendChild(inner);
          el.appendChild(col);
          // kick transition
          (function (node, digit, idx) {
            requestAnimationFrame(function () {
              requestAnimationFrame(function () {
                node.style.transform = 'translateY(-' + (digit * 1.25) + 'em)';
                node.style.setProperty('--i', String(idx));
              });
            });
          })(inner, Number(ch), i);
        } else {
          el.appendChild(AA.el('span', { text: ch }));
        }
      });
    },

    /**
     * FLIP animate an image from a source rect into destEl.
     * @param {HTMLElement} destEl
     * @param {DOMRect} fromRect
     * @param {number} [ms]
     */
    flip: function (destEl, fromRect, ms) {
      if (!destEl || !fromRect || AA.prefersReducedMotion()) return;
      ms = ms || 520;
      var to = destEl.getBoundingClientRect();
      if (!to.width || !fromRect.width) return;
      var dx = fromRect.left - to.left;
      var dy = fromRect.top - to.top;
      var sx = fromRect.width / to.width;
      var sy = fromRect.height / to.height;
      destEl.style.transformOrigin = 'top left';
      destEl.style.transition = 'none';
      destEl.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')';
      destEl.getBoundingClientRect();
      destEl.style.transition = 'transform ' + ms + 'ms var(--ease-out)';
      destEl.style.transform = 'translate(0,0) scale(1,1)';
      window.setTimeout(function () {
        destEl.style.transition = '';
        destEl.style.transform = '';
        destEl.style.transformOrigin = '';
      }, ms + 40);
    },

    /**
     * @param {HTMLElement} originEl
     * @param {string} [color]
     */
    sparkle: function (originEl, color) {
      if (!originEl || AA.prefersReducedMotion()) return;
      var layer = AA.el('div', { className: 'sparkle-layer', attrs: { 'aria-hidden': 'true' } });
      originEl.style.position = originEl.style.position || 'relative';
      originEl.appendChild(layer);
      var rect = originEl.getBoundingClientRect();
      var cx = rect.width * 0.72;
      var cy = rect.height * 0.28;
      for (var i = 0; i < 7; i++) {
        var ang = (Math.PI * 2 * i) / 7;
        var dist = 28 + Math.random() * 24;
        var dot = AA.el('div', {
          className: 'sparkle-dot',
          style: {
            left: cx + 'px',
            top: cy + 'px',
            background: i % 2 ? 'var(--scan)' : 'var(--brand)',
            '--sx': Math.cos(ang) * dist + 'px',
            '--sy': Math.sin(ang) * dist + 'px'
          }
        });
        layer.appendChild(dot);
      }
      window.setTimeout(function () {
        if (layer.parentNode) layer.parentNode.removeChild(layer);
      }, 800);
    },

    /**
     * Wrap text into word spans for reveal.
     * @param {HTMLElement} el
     * @param {string} text
     */
    wordReveal: function (el, text) {
      if (!el) return;
      while (el.firstChild) el.removeChild(el.firstChild);
      var words = String(text || '').split(/\s+/).filter(Boolean);
      words.forEach(function (w, i) {
        var wrap = AA.el('span', { className: 'w', style: { '--i': String(i) } });
        wrap.appendChild(AA.el('span', { text: w }));
        el.appendChild(wrap);
        if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
      });
    },

    /** @param {HTMLElement} el */
    shake: function (el) {
      if (!el) return;
      el.classList.remove('is-shaking');
      void el.offsetWidth;
      el.classList.add('is-shaking');
      window.setTimeout(function () { el.classList.remove('is-shaking'); }, 300);
    }
  };
})(window.AA = window.AA || {});
