(function (AA) {
  'use strict';

  var DEMO_KEY = 'aa.demoMode';
  var HUB_HEALTH_TIMEOUT_MS = 8000;

  function readDemo() {
    try { return sessionStorage.getItem(DEMO_KEY) === '1'; } catch (e) { return false; }
  }

  function writeDemo(on) {
    try {
      if (on) sessionStorage.setItem(DEMO_KEY, '1');
      else sessionStorage.removeItem(DEMO_KEY);
    } catch (e) { /* ignore */ }
  }

  function apiBaseFor(mod) {
    try {
      var stored = localStorage.getItem(mod.storageKey);
      if (stored) return AA.stripTrailingSlash(stored);
    } catch (e) { /* ignore */ }
    return AA.stripTrailingSlash(mod.defaultApiBase);
  }

  function setPill(pill, state, text) {
    if (!pill) return;
    pill.className = 'health health--' + state;
    var lab = AA.$('.health__label', pill);
    if (lab) lab.textContent = text;
    pill.setAttribute('aria-label', text);
  }

  function pingHealth(id) {
    var mod = AA.config.MODULES[id];
    var pill = AA.$('[data-health="' + id + '"]');
    if (!mod || !pill) return;

    if (readDemo()) {
      setPill(pill, 'mock', 'Demo data');
      return;
    }

    setPill(pill, 'checking', 'Checking…');
    var xhr = new XMLHttpRequest();
    xhr.open('GET', apiBaseFor(mod) + AA.config.ENDPOINTS.health);
    xhr.timeout = HUB_HEALTH_TIMEOUT_MS;
    xhr.responseType = 'text';
    xhr.onload = function () {
      var ok = false;
      try {
        var body = JSON.parse(xhr.responseText || 'null');
        ok = xhr.status === 200 && !!body && body.status === 'healthy';
      } catch (e) { ok = false; }
      setPill(pill, ok ? 'online' : 'offline', ok ? 'Service online' : 'Service offline');
    };
    xhr.onerror = xhr.ontimeout = function () {
      setPill(pill, 'offline', 'Service offline');
    };
    xhr.send();
  }

  function updateLinks() {
    var demo = readDemo();
    Object.keys(AA.config.MODULES).forEach(function (id) {
      var card = AA.$('#module-' + id);
      if (card) card.setAttribute('href', AA.config.MODULES[id].page + (demo ? '?mock=1' : ''));
      pingHealth(id);
    });
    var pill = AA.$('#mock-pill');
    if (pill) pill.hidden = !demo;
  }

  function start() {
    var params = new URLSearchParams(window.location.search);
    var mock = params.get('mock');
    if (mock != null) writeDemo(mock !== '0');

    var toggle = AA.$('#hub-demo');
    if (toggle) {
      toggle.checked = readDemo();
      toggle.addEventListener('change', function () {
        writeDemo(toggle.checked);
        updateLinks();
        AA.toast(toggle.checked ? 'Demo mode on — sample data, no API calls' : 'Demo mode off — live APIs', {
          type: toggle.checked ? 'info' : 'success'
        });
      });
    }

    updateLinks();
    document.documentElement.classList.add('is-entered');
    document.body.classList.add('is-entered');

    window.addEventListener('focus', function () {
      Object.keys(AA.config.MODULES).forEach(pingHealth);
    });
  }

  function boot() {
    if (AA.lock && AA.lock.require) AA.lock.require(start);
    else start();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.AA = window.AA || {});
