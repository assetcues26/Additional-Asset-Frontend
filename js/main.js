(function (AA) {
  'use strict';

  function readParams() {
    var params = new URLSearchParams(window.location.search);

    // API override
    var api = params.get('api');
    if (api) {
      AA.state.apiBase = AA.stripTrailingSlash(api);
    } else {
      try {
        var stored = localStorage.getItem(AA.config.STORAGE.apiBase);
        if (stored) AA.state.apiBase = AA.stripTrailingSlash(stored);
      } catch (e) { /* ignore */ }
    }

    // Mock mode
    var mock = params.get('mock');
    if (mock != null && mock !== '') {
      AA.state.mock = mock === '' ? '1' : mock;
      var mockPill = AA.$('#mock-pill');
      if (mockPill) mockPill.hidden = false;
    }

    if (params.get('selftest') === '1') {
      window.setTimeout(function () { AA.selftest(); }, 100);
    }
  }

  function buildTimeline() {
    var list = AA.$('#timeline');
    if (!list) return;
    while (list.firstChild) list.removeChild(list.firstChild);

    var fill = AA.el('div', { id: 'timeline-fill', className: 'timeline__fill', attrs: { 'aria-hidden': 'true' } });
    list.appendChild(fill);

    AA.config.STAGES.forEach(function (s, i) {
      var li = AA.el('li', {
        id: 'stage-' + i,
        className: 'timeline__item',
        dataset: { state: 'pending' }
      });
      li.appendChild(AA.el('div', { className: 'timeline__node' }));
      var body = AA.el('div', { className: 'timeline__body' });
      body.appendChild(AA.el('div', { className: 'timeline__label', text: s.label }));
      body.appendChild(AA.el('div', { className: 'timeline__sub' }));
      body.appendChild(AA.el('div', { className: 'timeline__shimmer', attrs: { 'aria-hidden': 'true' } }));
      li.appendChild(body);
      list.appendChild(li);
    });
  }

  function setupHeroWords() {
    var h1 = AA.$('#hero-title');
    if (!h1) return;
    var text = h1.textContent;
    h1.textContent = '';
    text.split(/(\s+)/).forEach(function (part, i) {
      if (/^\s+$/.test(part)) {
        h1.appendChild(document.createTextNode(part));
        return;
      }
      var span = AA.el('span', { className: 'word', style: { '--i': String(i) }, text: part });
      h1.appendChild(span);
    });
  }

  function setupVideo() {
    var wrap = AA.$('#showcase-video-wrap');
    var art = AA.$('#showcase-art');
    var video = AA.$('#hero-video');
    if (!video || !wrap) return;

    // Role B — ambient hero
    if (AA.prefersReducedMotion()) {
      video.removeAttribute('autoplay');
      video.preload = 'metadata';
      video.addEventListener('loadeddata', function () {
        try { video.currentTime = 0.1; } catch (e) { /* ignore */ }
        video.pause();
      });
    }

    video.addEventListener('error', function () {
      wrap.hidden = true;
      if (art) art.hidden = false;
    });

    // Pause when off-screen / hidden tab
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) video.pause();
          else if (!AA.prefersReducedMotion() && !document.hidden) {
            var p = video.play();
            if (p && p.catch) p.catch(function () { /* autoplay blocked */ });
          }
        });
      }, { threshold: 0.25 });
      io.observe(video);
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) video.pause();
      else if (!AA.prefersReducedMotion() && AA.state.view === 'idle') {
        var p = video.play();
        if (p && p.catch) p.catch(function () {});
      }
    });
  }

  function entrance() {
    document.documentElement.classList.add('is-entered');
    document.body.classList.add('is-entered');
  }

  function startApp() {
    buildTimeline();
    setupHeroWords();
    setupVideo();

    AA.shell.init();
    AA.upload.init();
    AA.form.init();

    AA.setView('idle');
    entrance();
  }

  function boot() {
    readParams();
    // Soft lock gate — analysis / views only start after unlock (or if lock disabled)
    if (AA.lock && AA.lock.require) {
      AA.lock.require(startApp);
    } else {
      startApp();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.AA = window.AA || {});
