(function (AA) {
  'use strict';

  var submitting = false;

  function fieldValid(id, required) {
    var val = AA.state.inputs[id] || '';
    if (!val) return !required;
    return AA.isPositiveInt(val);
  }

  function updateFieldUI(name, required) {
    var wrap = AA.$('#field-' + name);
    var input = AA.$('#input-' + name);
    if (!wrap || !input) return;
    var val = input.value;
    AA.state.inputs[name === 'customer' ? 'customerId' : name === 'assetclass' ? 'assetClassId' : 'categoryId'] = val;

    var map = { customer: 'customerId', assetclass: 'assetClassId', category: 'categoryId' };
    var key = map[name];
    AA.state.inputs[key] = val;

    var ok = fieldValid(key, !!required);
    var empty = !val;
    wrap.classList.toggle('is-valid', ok && !empty);
    if (input.getAttribute('aria-invalid') === 'true' && (ok || empty)) {
      input.setAttribute('aria-invalid', 'false');
      var err = AA.$('.field__error', wrap);
      if (err) err.textContent = '';
    }
  }

  function validateAll(show) {
    var photosOk = !!(AA.state.files.asset && AA.state.files.tag);
    var custOk = AA.isPositiveInt(AA.state.inputs.customerId);
    var classOk = !AA.state.inputs.assetClassId || AA.isPositiveInt(AA.state.inputs.assetClassId);
    var catOk = !AA.state.inputs.categoryId || AA.isPositiveInt(AA.state.inputs.categoryId);
    var ok = photosOk && custOk && classOk && catOk;

    if (show) {
      if (!custOk) {
        var ci = AA.$('#input-customer');
        var cw = AA.$('#field-customer');
        if (ci) {
          ci.setAttribute('aria-invalid', 'true');
          var err = AA.$('.field__error', cw);
          if (err) err.textContent = 'Enter a Customer ID (a positive whole number).';
        }
      }
      ['assetclass', 'category'].forEach(function (name) {
        var key = name === 'assetclass' ? 'assetClassId' : 'categoryId';
        if (AA.state.inputs[key] && !AA.isPositiveInt(AA.state.inputs[key])) {
          var input = AA.$('#input-' + name);
          var wrap = AA.$('#field-' + name);
          if (input) input.setAttribute('aria-invalid', 'true');
          var err2 = AA.$('.field__error', wrap);
          if (err2) err2.textContent = 'Enter a positive whole number, or leave blank.';
        }
      });
    }

    return { ok: ok, photosOk: photosOk, custOk: custOk, firstInvalid: !photosOk ? 'dz-asset' : (!custOk ? 'input-customer' : null) };
  }

  function updateSubmitState() {
    var v = validateAll(false);
    var btns = AA.$$('[data-action="analyze"]');
    btns.forEach(function (btn) {
      btn.setAttribute('aria-disabled', v.ok ? 'false' : 'true');
    });

    // Step badges
    var s1 = AA.$('#step-photos-badge');
    var s2 = AA.$('#step-details-badge');
    if (s1) {
      s1.classList.toggle('is-done', v.photosOk);
      while (s1.firstChild) s1.removeChild(s1.firstChild);
      if (v.photosOk) s1.appendChild(AA.icon('check', { size: 14 }));
      else s1.textContent = '1';
    }
    if (s2) {
      var detailsOk = v.custOk;
      s2.classList.toggle('is-done', detailsOk);
      while (s2.firstChild) s2.removeChild(s2.firstChild);
      if (detailsOk) s2.appendChild(AA.icon('check', { size: 14 }));
      else s2.textContent = '2';
    }
  }

  function persistCustomer() {
    try {
      if (AA.state.inputs.customerId) {
        localStorage.setItem(AA.config.STORAGE.customerId, AA.state.inputs.customerId);
      }
    } catch (e) { /* ignore */ }
  }

  function wireField(name, key, required) {
    var input = AA.$('#input-' + name);
    if (!input) return;
    input.addEventListener('input', function () {
      input.value = AA.digitsOnly(input.value);
      AA.state.inputs[key] = input.value;
      updateFieldUI(name, required);
      updateSubmitState();
      if (key === 'customerId') persistCustomer();
    });
    input.addEventListener('blur', function () {
      if (required && !AA.isPositiveInt(input.value)) {
        input.setAttribute('aria-invalid', 'true');
        var wrap = AA.$('#field-' + name);
        var err = AA.$('.field__error', wrap);
        if (err) err.textContent = 'Enter a Customer ID (a positive whole number).';
      } else if (!required && input.value && !AA.isPositiveInt(input.value)) {
        input.setAttribute('aria-invalid', 'true');
        var wrap2 = AA.$('#field-' + name);
        var err2 = AA.$('.field__error', wrap2);
        if (err2) err2.textContent = 'Enter a positive whole number, or leave blank.';
      }
    });
  }

  function doSubmit() {
    if (submitting) return;
    var v = validateAll(true);
    var summary = AA.$('#validation-summary');
    if (!v.ok) {
      if (summary) {
        summary.textContent = 'Add both photos and a Customer ID to continue.';
        summary.setAttribute('role', 'alert');
      }
      AA.$$('[data-action="analyze"]').forEach(function (b) { AA.fx.shake(b); });
      var first = AA.$('#' + (v.firstInvalid || 'input-customer'));
      if (first) {
        if (first.classList.contains('dz')) {
          var btn = AA.$('.dz__btn', first);
          if (btn) btn.focus();
        } else first.focus();
        AA.fx.shake(first);
      }
      return;
    }
    if (summary) summary.textContent = '';

    submitting = true;
    persistCustomer();
    AA.$$('[data-action="analyze"]').forEach(function (b) {
      b.setAttribute('aria-disabled', 'true');
      var label = AA.$('.btn-label', b);
      if (label) label.textContent = 'Starting…';
    });

    window.setTimeout(function () {
      submitting = false;
      AA.$$('[data-action="analyze"]').forEach(function (b) {
        var label = AA.$('.btn-label', b);
        if (label) label.textContent = 'Analyze asset';
      });
      updateSubmitState();
      if (AA.processing) AA.processing.start();
    }, 180);
  }

  function resetForm(keepCustomer) {
    AA.upload.clearPhotos();
    AA.state.inputs.assetClassId = '';
    AA.state.inputs.categoryId = '';
    var ac = AA.$('#input-assetclass');
    var cat = AA.$('#input-category');
    if (ac) ac.value = '';
    if (cat) cat.value = '';
    if (!keepCustomer) {
      // Reset keeps customer per plan
    }
    updateSubmitState();
  }

  AA.form = {
    init: function () {
      // Restore customer
      try {
        var saved = localStorage.getItem(AA.config.STORAGE.customerId);
        if (saved) {
          AA.state.inputs.customerId = AA.digitsOnly(saved);
          var ci = AA.$('#input-customer');
          if (ci) ci.value = AA.state.inputs.customerId;
        }
      } catch (e) { /* ignore */ }

      wireField('customer', 'customerId', true);
      wireField('assetclass', 'assetClassId', false);
      wireField('category', 'categoryId', false);

      document.addEventListener('aa:files-changed', updateSubmitState);
      updateSubmitState();

      AA.$$('[data-action="analyze"]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (btn.getAttribute('aria-disabled') === 'true') {
            doSubmit(); // still runs validation feedback
            return;
          }
          doSubmit();
        });
      });

      AA.$$('[data-action="reset"]').forEach(function (btn) {
        btn.addEventListener('click', function () { resetForm(true); });
      });

      document.addEventListener('keydown', function (e) {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && AA.state.view === 'idle') {
          e.preventDefault();
          doSubmit();
        }
      });
    },

    validateAll: validateAll,
    updateSubmitState: updateSubmitState,
    resetForm: resetForm,
    submit: doSubmit
  };
})(window.AA = window.AA || {});
