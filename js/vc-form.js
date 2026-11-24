/* Validation & Catalogue — optional "registered record" fields (name, description, tag). */
(function (AA) {
  'use strict';

  var FIELDS = [
    { name: 'assetname', key: 'assetName' },
    { name: 'description', key: 'description' },
    { name: 'tagnumber', key: 'tagNumber' }
  ];

  function updateCounter() {
    var counter = AA.$('#counter-description');
    var input = AA.$('#input-description');
    if (!counter || !input) return;
    var max = (AA.config.TEXT_LIMITS && AA.config.TEXT_LIMITS.description) || 2000;
    counter.textContent = input.value.length + ' / ' + max;
  }

  function updateBadge() {
    var badge = AA.$('#step-record-badge');
    if (!badge) return;
    var any = FIELDS.some(function (f) {
      return String(AA.state.inputs[f.key] || '').trim() !== '';
    });
    badge.classList.toggle('is-done', any);
    while (badge.firstChild) badge.removeChild(badge.firstChild);
    if (any) badge.appendChild(AA.icon('check', { size: 14 }));
    else badge.textContent = '3';
  }

  function sync(f) {
    var input = AA.$('#input-' + f.name);
    var wrap = AA.$('#field-' + f.name);
    if (!input) return;
    AA.state.inputs[f.key] = input.value;
    if (wrap) wrap.classList.toggle('is-valid', input.value.trim() !== '');
  }

  function syncAll() {
    FIELDS.forEach(sync);
    updateCounter();
    updateBadge();
  }

  function clearRecord() {
    FIELDS.forEach(function (f) {
      var input = AA.$('#input-' + f.name);
      if (input) input.value = '';
    });
    syncAll();
  }

  function init() {
    FIELDS.forEach(function (f) {
      var input = AA.$('#input-' + f.name);
      if (!input) return;
      var max = AA.config.TEXT_LIMITS && AA.config.TEXT_LIMITS[f.key];
      if (max) input.setAttribute('maxlength', String(max));
      input.addEventListener('input', function () {
        sync(f);
        if (f.key === 'description') updateCounter();
        updateBadge();
      });
    });

    AA.$$('[data-action="reset"]').forEach(function (btn) {
      btn.addEventListener('click', clearRecord);
    });

    syncAll();
  }

  AA.vcForm = {
    init: init,
    clearRecord: clearRecord
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window.AA = window.AA || {});
