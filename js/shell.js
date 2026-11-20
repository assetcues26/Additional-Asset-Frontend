(function (AA) {
  'use strict';

  var healthTimer = null;
  var settingsOpen = false;

  function setHealthUI(state, label) {
    AA.state.health = state;
    var pill = AA.$('#health-pill');
    if (!pill) return;
    pill.className = 'health health--' + state + (AA.state.mock ? ' health--mock' : '');
    var text = label;
    if (!text) {
      if (AA.state.mock) text = 'Service online (mock)';
      else if (state === 'online') text = 'Service online';
      else if (state === 'offline') text = 'Service offline';
      else text = 'Checking…';
    }
    var lab = AA.$('.health__label', pill);
    if (lab) lab.textContent = text;
    pill.setAttribute('aria-label', text);
  }

  function checkHealth() {
    setHealthUI('checking');
    AA.api.health().then(function (res) {
      setHealthUI(res.ok ? 'online' : 'offline');
    });
  }

  function scheduleHealth() {
    if (healthTimer) window.clearInterval(healthTimer);
    healthTimer = window.setInterval(function () {
      if (AA.state.view === 'idle') checkHealth();
    }, 60000);
  }

  function closeSettings() {
    var pop = AA.$('#settings-popover');
    if (pop) pop.hidden = true;
    settingsOpen = false;
    var btn = AA.$('#btn-settings');
    if (btn) {
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  }

  function openSettings() {
    var pop = AA.$('#settings-popover');
    if (!pop) return;
    pop.hidden = false;
    settingsOpen = true;
    var btn = AA.$('#btn-settings');
    if (btn) btn.setAttribute('aria-expanded', 'true');
    var input = AA.$('#settings-api');
    if (input) {
      input.value = AA.state.apiBase;
      input.focus();
      input.select();
    }
  }

  function saveApiBase(url) {
    url = AA.stripTrailingSlash(url.trim());
    if (!/^https?:\/\//i.test(url)) {
      AA.toast('API URL must start with http:// or https://', { type: 'error' });
      return false;
    }
    AA.state.apiBase = url;
    try { localStorage.setItem(AA.config.STORAGE.apiBase, url); } catch (e) { /* ignore */ }
    checkHealth();
    AA.toast('API address saved', { type: 'success' });
    return true;
  }

  AA.shell = {
    init: function () {
      var header = AA.$('.app-header');
      window.addEventListener('scroll', function () {
        if (!header) return;
        header.classList.toggle('is-scrolled', window.scrollY > 4);
      }, { passive: true });

      // Logo home
      var brand = AA.$('#brand-home');
      if (brand) {
        brand.addEventListener('click', function (e) {
          e.preventDefault();
          if (AA.state.view === 'processing') {
            if (!window.confirm('Analysis is in progress. Cancel and return home?')) return;
            if (AA.processing && AA.processing.cancel) AA.processing.cancel(true);
          }
          AA.setView('idle');
        });
      }

      // Settings
      var btn = AA.$('#btn-settings');
      if (btn) {
        btn.addEventListener('click', function () {
          if (settingsOpen) closeSettings();
          else openSettings();
        });
      }

      var save = AA.$('#settings-save');
      var reset = AA.$('#settings-reset');
      var test = AA.$('#settings-test');
      var input = AA.$('#settings-api');

      if (save) {
        save.addEventListener('click', function () {
          if (input && saveApiBase(input.value)) closeSettings();
        });
      }
      if (reset) {
        reset.addEventListener('click', function () {
          if (input) input.value = AA.config.DEFAULT_API_BASE;
          saveApiBase(AA.config.DEFAULT_API_BASE);
        });
      }
      if (test) {
        test.addEventListener('click', function () {
          var status = AA.$('#settings-status');
          var url = input ? AA.stripTrailingSlash(input.value.trim()) : AA.state.apiBase;
          if (!/^https?:\/\//i.test(url)) {
            if (status) {
              status.className = 'popover__status is-bad';
              status.textContent = 'URL must start with http:// or https://';
            }
            return;
          }
          var prev = AA.state.apiBase;
          AA.state.apiBase = url;
          if (status) {
            status.className = 'popover__status';
            status.textContent = 'Testing…';
          }
          test.disabled = true;
          AA.api.health().then(function (res) {
            test.disabled = false;
            AA.state.apiBase = prev;
            if (!status) return;
            if (res.ok) {
              status.className = 'popover__status is-ok';
              status.textContent = '✓ Connected';
            } else {
              status.className = 'popover__status is-bad';
              status.textContent = '✗ Could not connect';
            }
          });
        });
      }

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && settingsOpen) {
          e.preventDefault();
          closeSettings();
        }
      });
      document.addEventListener('click', function (e) {
        if (!settingsOpen) return;
        var wrap = AA.$('.settings-wrap');
        if (wrap && !wrap.contains(e.target)) closeSettings();
      });

      window.addEventListener('focus', function () {
        if (AA.state.view === 'idle') checkHealth();
      });

      checkHealth();
      scheduleHealth();
    },

    checkHealth: checkHealth,
    openSettings: openSettings,
    setHealthUI: setHealthUI
  };
})(window.AA = window.AA || {});
