(function (AA) {
  'use strict';

  var APP = AA.config.APP_NAME || 'Additional Asset';
  var TITLES = {
    idle: APP,
    processing: 'Analyzing… · ' + APP,
    result: 'Analysis complete · ' + APP,
    error: 'Something went wrong · ' + APP
  };

  var VIEWS = ['idle', 'processing', 'result', 'error'];

  function showOnly(name) {
    VIEWS.forEach(function (v) {
      var el = AA.$('#view-' + v);
      if (!el) return;
      var on = v === name;
      el.hidden = !on;
      el.setAttribute('aria-hidden', on ? 'false' : 'true');
    });

    // Sticky actions
    var stickyIdle = AA.$('#sticky-idle');
    var stickyResult = AA.$('#sticky-result');
    if (stickyIdle) stickyIdle.hidden = name !== 'idle';
    if (stickyResult) stickyResult.hidden = name !== 'result';
  }

  function focusHeading(name) {
    var sel = name === 'idle' ? '#view-idle .display' : '#view-' + name + ' h2';
    var h = AA.$(sel);
    if (h) {
      if (!h.hasAttribute('tabindex')) h.setAttribute('tabindex', '-1');
      try { h.focus({ preventScroll: false }); } catch (e) { h.focus(); }
    }
  }

  function announceView(name) {
    if (name === 'idle') AA.announce('Capture form');
    else if (name === 'processing') AA.announce('Analyzing your asset');
    else if (name === 'result') { /* resultView announces richer text */ }
    else if (name === 'error' && AA.state.error) AA.announce(AA.state.error.title);
  }

  /**
   * Only way to change views.
   * @param {'idle'|'processing'|'result'|'error'} name
   */
  AA.setView = function (name) {
    if (VIEWS.indexOf(name) === -1) return;
    var prev = AA.state.view;
    var nextEl = AA.$('#view-' + name);
    var prevEl = AA.$('#view-' + prev);

    function swap() {
      AA.state.view = name;
      showOnly(name);
      document.title = TITLES[name] || TITLES.idle;
      focusHeading(name);
      announceView(name);
      if (name === 'idle' && AA.shell) AA.shell.checkHealth();
    }

    if (prev === name) {
      swap();
      return;
    }

    if (document.startViewTransition && !AA.prefersReducedMotion()) {
      document.startViewTransition(function () { swap(); });
      return;
    }

    // Manual crossfade
    if (prevEl && !AA.prefersReducedMotion()) {
      prevEl.classList.add('leaving');
      window.setTimeout(function () {
        prevEl.classList.remove('leaving');
        swap();
        if (nextEl) {
          nextEl.classList.add('entering');
          window.setTimeout(function () { nextEl.classList.remove('entering'); }, 340);
        }
      }, 180);
    } else {
      swap();
      if (nextEl && !AA.prefersReducedMotion()) {
        nextEl.classList.add('entering');
        window.setTimeout(function () { nextEl.classList.remove('entering'); }, 340);
      }
    }
  };
})(window.AA = window.AA || {});
