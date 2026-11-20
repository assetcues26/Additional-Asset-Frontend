(function (AA) {
  'use strict';

  function isAccepted(file) {
    if (!file) return { ok: false, error: 'Please choose a JPG, PNG or WebP image.' };
    var mime = (file.type || '').toLowerCase();
    var name = (file.name || '').toLowerCase();
    var mimeOk = AA.config.ACCEPT_MIME.indexOf(mime) !== -1;
    var extOk = AA.config.ACCEPT_EXT.some(function (ext) { return name.endsWith(ext); });
    if (!mimeOk && !(mime === '' && extOk)) {
      return { ok: false, error: 'Please choose a JPG, PNG or WebP image.' };
    }
    if (file.size > AA.config.MAX_IMAGE_BYTES) {
      return { ok: false, error: 'That file is over 10 MB — please use a smaller one.' };
    }
    if (file.size === 0) {
      return { ok: false, error: 'Please choose a JPG, PNG or WebP image.' };
    }
    return { ok: true };
  }

  function sameFile(a, b) {
    if (!a || !b) return false;
    return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
  }

  function readDims(url, slot) {
    var img = new Image();
    img.onload = function () {
      AA.state.dims[slot] = { w: img.naturalWidth, h: img.naturalHeight };
      updateMeta(slot);
      document.dispatchEvent(new CustomEvent('aa:files-changed'));
    };
    img.onerror = function () {
      AA.state.dims[slot] = null;
      document.dispatchEvent(new CustomEvent('aa:files-changed'));
    };
    img.src = url;
  }

  function updateMeta(slot) {
    var root = AA.$('#dz-' + slot);
    if (!root) return;
    var file = AA.state.files[slot];
    var dims = AA.state.dims[slot];
    var sizeEl = AA.$('.dz__size', root);
    if (!sizeEl || !file) return;
    var parts = [AA.format.bytes(file.size)];
    if (dims) parts.push(dims.w + '×' + dims.h);
    sizeEl.textContent = parts.join(' · ');
  }

  function setFilled(slot, file, opts) {
    opts = opts || {};
    var root = AA.$('#dz-' + slot);
    if (!root) return;

    AA.revoke(AA.state.previews[slot]);
    AA.state.files[slot] = file;
    var url = URL.createObjectURL(file);
    AA.state.previews[slot] = url;
    AA.state.dims[slot] = null;

    root.classList.add('dz--filled');
    root.classList.remove('dz--error', 'dz--drag');

    var img = AA.$('.dz__preview img', root);
    var preview = AA.$('.dz__preview', root);
    if (img) {
      img.src = url;
      img.alt = 'Preview of ' + (slot === 'asset' ? 'asset' : 'tag') + ' photo: ' + file.name;
    }
    var nameEl = AA.$('.dz__filename', root);
    if (nameEl) nameEl.textContent = file.name;

    var err = AA.$('.dz__error-msg', root);
    if (err) err.textContent = '';

    if (!opts.silent && preview && !AA.prefersReducedMotion()) {
      preview.classList.remove('is-developing');
      void preview.offsetWidth;
      preview.classList.add('is-developing');
      window.setTimeout(function () { preview.classList.remove('is-developing'); }, 700);
    }

    readDims(url, slot);
    checkDup();
    document.dispatchEvent(new CustomEvent('aa:files-changed'));
  }

  function clearSlot(slot) {
    var root = AA.$('#dz-' + slot);
    AA.revoke(AA.state.previews[slot]);
    AA.state.files[slot] = null;
    AA.state.previews[slot] = null;
    AA.state.dims[slot] = null;
    if (!root) return;
    root.classList.remove('dz--filled', 'dz--error', 'dz--drag');
    var img = AA.$('.dz__preview img', root);
    if (img) { img.removeAttribute('src'); img.alt = ''; }
    var input = AA.$('.dz__file', root);
    if (input) input.value = '';
    var err = AA.$('.dz__error-msg', root);
    if (err) err.textContent = '';
    var warn = AA.$('.dz__dup-warn', root);
    if (warn) warn.hidden = true;
    document.dispatchEvent(new CustomEvent('aa:files-changed'));
  }

  function showError(slot, msg) {
    var root = AA.$('#dz-' + slot);
    if (!root) return;
    root.classList.add('dz--error');
    var err = AA.$('.dz__error-msg', root);
    if (err) {
      err.textContent = msg;
      err.setAttribute('role', 'alert');
    }
    window.setTimeout(function () { root.classList.remove('dz--error'); }, 320);
  }

  function acceptFile(slot, file, opts) {
    var check = isAccepted(file);
    if (!check.ok) {
      showError(slot, check.error);
      return false;
    }
    setFilled(slot, file, opts);
    return true;
  }

  function checkDup() {
    var a = AA.state.files.asset;
    var t = AA.state.files.tag;
    var dup = sameFile(a, t);
    ['asset', 'tag'].forEach(function (slot) {
      var warn = AA.$('#dz-' + slot + ' .dz__dup-warn');
      if (warn) {
        warn.hidden = !dup;
        if (dup) warn.textContent = 'This looks like the same photo as the other slot.';
      }
    });
  }

  function wireZone(slot) {
    var root = AA.$('#dz-' + slot);
    if (!root) return;
    var input = AA.$('.dz__file', root);
    var btn = AA.$('.dz__btn', root);

    if (btn && input) {
      btn.addEventListener('click', function () { input.click(); });
    }
    if (input) {
      input.addEventListener('change', function () {
        var file = input.files && input.files[0];
        if (file) acceptFile(slot, file);
      });
    }

    root.addEventListener('dragenter', function (e) {
      e.preventDefault();
      root.classList.add('dz--drag');
    });
    root.addEventListener('dragover', function (e) {
      e.preventDefault();
      root.classList.add('dz--drag');
    });
    root.addEventListener('dragleave', function (e) {
      if (!root.contains(e.relatedTarget)) root.classList.remove('dz--drag');
    });
    root.addEventListener('drop', function (e) {
      e.preventDefault();
      root.classList.remove('dz--drag');
      var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) acceptFile(slot, file);
    });

    var replaceBtn = AA.$('[data-action="replace"]', root);
    var removeBtn = AA.$('[data-action="remove"]', root);
    if (replaceBtn) replaceBtn.addEventListener('click', function () { input && input.click(); });
    if (removeBtn) removeBtn.addEventListener('click', function () { clearSlot(slot); });
  }

  AA.upload = {
    init: function () {
      wireZone('asset');
      wireZone('tag');

      // Prevent browser file-open outside zones
      window.addEventListener('dragover', function (e) { e.preventDefault(); });
      window.addEventListener('drop', function (e) { e.preventDefault(); });

      // Paste into first empty zone
      document.addEventListener('paste', function (e) {
        if (AA.state.view !== 'idle') return;
        var items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        var file = null;
        for (var i = 0; i < items.length; i++) {
          if (items[i].type && items[i].type.indexOf('image/') === 0) {
            file = items[i].getAsFile();
            break;
          }
        }
        if (!file) return;
        e.preventDefault();
        var slot = !AA.state.files.asset ? 'asset' : (!AA.state.files.tag ? 'tag' : null);
        if (!slot) {
          AA.toast('Both photo slots are full — remove one to paste.', { type: 'info' });
          return;
        }
        if (acceptFile(slot, file)) {
          AA.toast('Pasted into ' + (slot === 'asset' ? 'Asset photo' : 'Tag or barcode photo'), { type: 'success' });
        }
      });
    },

    clear: function (keepIds) {
      clearSlot('asset');
      clearSlot('tag');
    },

    clearPhotos: function () {
      clearSlot('asset');
      clearSlot('tag');
    },

    acceptFile: acceptFile,
    getPreviewRect: function (slot) {
      var img = AA.$('#dz-' + slot + ' .dz__preview img');
      return img ? img.getBoundingClientRect() : null;
    }
  };
})(window.AA = window.AA || {});
