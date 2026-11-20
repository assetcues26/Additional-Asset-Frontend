(function (AA) {
  'use strict';

  var lightboxTrigger = null;

  function clear(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function dash(v) {
    return v == null || v === '' ? '—' : String(v);
  }

  function openLightbox(src, trigger) {
    lightboxTrigger = trigger || document.activeElement;
    var existing = AA.$('#lightbox');
    if (existing) existing.parentNode.removeChild(existing);

    var lb = AA.el('div', {
      id: 'lightbox',
      className: 'lightbox',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Photo preview' }
    });
    var img = AA.el('img', { className: 'lightbox__img', attrs: { src: src, alt: 'Enlarged photo' } });
    var close = AA.el('button', {
      className: 'lightbox__close',
      type: 'button',
      attrs: { 'aria-label': 'Close' }
    }, AA.icon('x'));
    lb.appendChild(img);
    lb.appendChild(close);
    document.body.appendChild(lb);

    function shut() {
      if (lb.parentNode) lb.parentNode.removeChild(lb);
      document.removeEventListener('keydown', onKey);
      if (lightboxTrigger) lightboxTrigger.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); shut(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        close.focus();
      }
    }
    close.addEventListener('click', shut);
    lb.addEventListener('click', function (e) { if (e.target === lb) shut(); });
    document.addEventListener('keydown', onKey);
    close.focus();
  }

  function renderPhotos(vm) {
    var root = AA.$('#result-photos');
    if (!root) return;
    clear(root);

    var main = AA.el('button', {
      className: 'result-photo-main',
      type: 'button',
      attrs: { 'aria-label': 'View asset photo larger' }
    });
    var img = AA.el('img', {
      attrs: {
        src: AA.state.previews.asset || '',
        alt: 'Asset photo'
      }
    });
    main.appendChild(img);
    main.addEventListener('click', function () {
      openLightbox(AA.state.previews.asset, main);
    });
    root.appendChild(main);

    var tagWrap = AA.el('button', {
      className: 'result-photo-tag',
      type: 'button',
      attrs: { 'aria-label': 'View tag photo larger' }
    });
    tagWrap.appendChild(AA.el('img', {
      attrs: { src: AA.state.previews.tag || '', alt: 'Tag photo' }
    }));
    tagWrap.addEventListener('click', function () {
      openLightbox(AA.state.previews.tag, tagWrap);
    });
    root.appendChild(tagWrap);

    var dots = AA.el('div', { className: 'result-carousel-dots', attrs: { 'aria-hidden': 'true' } });
    dots.appendChild(AA.el('span', { className: 'is-on' }));
    dots.appendChild(AA.el('span'));
    root.appendChild(dots);
  }

  function renderHero(vm) {
    var card = AA.$('#result-hero');
    if (!card) return;
    clear(card);
    card.className = 'card hero-asset result-card-enter';
    card.style.setProperty('--i', '0');

    var head = AA.el('div', { className: 'card__head' },
      AA.el('span', { className: 'card__icon' }, AA.icon('sparkle', { size: 16 })),
      AA.el('h3', { className: 'card__title', text: 'Identified asset' })
    );
    if (vm.customerId != null) {
      head.appendChild(AA.el('span', {
        className: 'chip chip--mono card__head-right',
        text: 'Customer #' + vm.customerId
      }));
    }
    card.appendChild(head);

    var name = AA.el('h2', { className: 'hero-asset__name' });
    AA.fx.wordReveal(name, vm.asset.name);
    card.appendChild(name);

    if (vm.asset.description) {
      card.appendChild(AA.el('p', { className: 'hero-asset__desc', text: vm.asset.description }));
    }

    requestAnimationFrame(function () {
      card.classList.add('is-in');
      window.setTimeout(function () { card.classList.add('is-revealed'); }, AA.prefersReducedMotion() ? 0 : 520);
    });
  }

  function nodeEl(label, name, id, fromInput, index, empty) {
    var li = AA.el('li', {
      className: 'breadcrumb__node',
      dataset: { empty: empty ? 'true' : 'false' },
      style: { '--i': String(index) }
    });
    li.appendChild(AA.el('div', { className: 'micro', text: label }));
    li.appendChild(AA.el('div', { className: 'breadcrumb__name', text: empty ? (name || '—') : dash(name) }));
    if (id != null) {
      li.appendChild(AA.el('span', {
        className: 'breadcrumb__id',
        text: '#' + id,
        attrs: { title: 'ID' }
      }));
    } else if (empty) {
      li.appendChild(AA.el('span', { className: 'breadcrumb__id', text: '—' }));
    }
    if (fromInput) {
      var from = AA.el('div', { className: 'breadcrumb__from' }, AA.icon('info', { size: 12 }), document.createTextNode('Provided by you'));
      li.appendChild(from);
    }
    return li;
  }

  function connectorEl(index) {
    return AA.el('li', {
      className: 'breadcrumb__sep',
      style: { '--i': String(index) },
      attrs: { 'aria-hidden': 'true' }
    }, AA.icon('chevron', { size: 16 }));
  }

  function renderClassification(vm) {
    var card = AA.$('#result-class');
    if (!card) return;
    clear(card);
    card.className = 'card result-card-enter';
    card.style.setProperty('--i', '1');

    var head = AA.el('div', { className: 'card__head' },
      AA.el('span', { className: 'card__icon' }, AA.icon('layers', { size: 16 })),
      AA.el('h3', { className: 'card__title', text: 'Classification' })
    );
    card.appendChild(head);

    var c = vm.classification;
    var list = AA.el('ul', { className: 'breadcrumb', attrs: { 'aria-label': 'Master data path' } });

    function appendPath(nodes) {
      nodes.forEach(function (n, i) {
        list.appendChild(n);
        if (i < nodes.length - 1) list.appendChild(connectorEl(i));
      });
    }

    if (vm.matchStatus === 'none') {
      appendPath([
        nodeEl('Asset class', c.assetClass.name, c.assetClass.id, c.assetClass.fromInput, 0, !c.assetClass.name),
        nodeEl('Category', c.category.name, c.category.id, c.category.fromInput, 1, !c.category.name),
        nodeEl('Sub-category', null, null, false, 2, true),
        nodeEl('Make / model', null, null, false, 3, true)
      ]);
    } else if (vm.matchStatus === 'partial') {
      appendPath([
        nodeEl('Asset class', c.assetClass.name, c.assetClass.id, c.assetClass.fromInput, 0, !c.assetClass.name),
        nodeEl('Category', c.category.name, c.category.id, c.category.fromInput, 1, !c.category.name),
        nodeEl('Sub-category', c.subCategory.name, c.subCategory.id, false, 2, false),
        nodeEl('Make / model', 'No make/model match', null, false, 3, true)
      ]);
    } else {
      appendPath([
        nodeEl('Asset class', c.assetClass.name, c.assetClass.id, c.assetClass.fromInput, 0, !c.assetClass.name),
        nodeEl('Category', c.category.name, c.category.id, c.category.fromInput, 1, !c.category.name),
        nodeEl('Sub-category', c.subCategory.name, c.subCategory.id, false, 2, !c.subCategory.name),
        nodeEl('Make / model', c.makeModel.name, c.makeModel.id, false, 3, !c.makeModel.name)
      ]);
    }
    card.appendChild(list);

    if (vm.matchStatus === 'full') {
      var badge = AA.el('div', { className: 'match-badge' }, AA.icon('check', { size: 16 }), document.createTextNode('Matched to master data'));
      card.appendChild(badge);
    } else if (vm.matchStatus === 'partial') {
      card.appendChild(AA.el('p', {
        className: 'small',
        style: { marginTop: '12px' },
        text: 'The category was matched, but this exact make/model isn\'t in your master data.'
      }));
    } else {
      var call = AA.el('div', { className: 'callout', style: { marginTop: '16px' } });
      call.appendChild(AA.icon('info'));
      var body = AA.el('div');
      body.appendChild(AA.el('strong', { text: 'No master-data match found.' }));
      body.appendChild(document.createTextNode(' Try adding a Category or Asset class ID, or retake the photo closer to the asset. '));
      var edit = AA.el('button', { className: 'btn btn--link', type: 'button', text: 'Edit inputs' });
      edit.addEventListener('click', function () { AA.setView('idle'); });
      body.appendChild(edit);
      call.appendChild(body);
      card.appendChild(call);
    }

    requestAnimationFrame(function () {
      card.classList.add('is-in');
      window.setTimeout(function () { list.classList.add('is-drawn'); }, AA.prefersReducedMotion() ? 0 : 520);
    });
  }

  function renderCondition(vm) {
    var card = AA.$('#result-condition');
    if (!card) return;
    clear(card);
    card.className = 'card result-card-enter';
    card.style.setProperty('--i', '2');

    var head = AA.el('div', { className: 'card__head' },
      AA.el('span', { className: 'card__icon' }, AA.icon('shield', { size: 16 })),
      AA.el('h3', { className: 'card__title', text: 'Condition' })
    );
    card.appendChild(head);

    if (!vm.condition) {
      card.appendChild(AA.el('p', { className: 'small', text: 'Condition unavailable for this photo.' }));
      requestAnimationFrame(function () { card.classList.add('is-in'); });
      return;
    }

    var cond = vm.condition;
    var gradeMeta = AA.config.GRADES[cond.tone] || AA.config.GRADES.unknown;
    var layout = AA.el('div', { className: 'condition-layout' });

    // Gauge SVG
    var gaugeWrap = AA.el('div', { className: 'gauge' });
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 200 110');
    var track = document.createElementNS(svgNS, 'path');
    track.setAttribute('class', 'gauge__track');
    track.setAttribute('d', 'M20 100 A80 80 0 0 1 180 100');
    var value = document.createElementNS(svgNS, 'path');
    value.setAttribute('class', 'gauge__value');
    value.setAttribute('d', 'M20 100 A80 80 0 0 1 180 100');
    value.setAttribute('stroke', gradeMeta.color);
    var dot = document.createElementNS(svgNS, 'circle');
    dot.setAttribute('class', 'gauge__dot');
    dot.setAttribute('r', '6');
    dot.style.color = gradeMeta.color;
    dot.style.opacity = '0';
    svg.appendChild(track);
    svg.appendChild(value);
    svg.appendChild(dot);
    gaugeWrap.appendChild(svg);

    var center = AA.el('div', { className: 'gauge__center' });
    var num = AA.el('div', { className: 'gauge__num', text: '0' });
    center.appendChild(num);
    center.appendChild(AA.el('div', { className: 'gauge__cap', text: '/ 100' }));
    gaugeWrap.appendChild(center);
    layout.appendChild(gaugeWrap);

    var right = AA.el('div');
    var pill = AA.el('div', {
      className: 'grade-pill',
      style: { background: gradeMeta.bg, color: gradeMeta.color }
    }, AA.icon(gradeMeta.icon, { size: 16 }), document.createTextNode(cond.grade));
    right.appendChild(pill);

    var pips = AA.el('div', {
      className: 'pips',
      attrs: { role: 'img', 'aria-label': 'Condition score ' + cond.score10 + ' out of 10' },
      style: { '--pip-color': gradeMeta.color }
    });
    for (var k = 0; k < 10; k++) {
      pips.appendChild(AA.el('span', {
        className: k < cond.score10 ? 'on' : '',
        style: { '--k': String(k) }
      }));
    }
    right.appendChild(pips);
    right.appendChild(AA.el('div', { className: 'pips-cap', text: cond.score10 + ' / 10' }));

    if (cond.summary) {
      right.appendChild(AA.el('p', { className: 'condition-summary', text: cond.summary }));
    }

    if (!cond.hasDamage) {
      right.appendChild(AA.el('div', { className: 'damage-ok' },
        AA.icon('check'),
        document.createTextNode('No damage detected')
      ));
    } else {
      right.appendChild(AA.el('div', {
        className: 'h3',
        style: { marginBottom: '8px' },
        text: 'Damage found · ' + cond.damageCount
      }));
      var items = cond.damageItems.slice(0, 10);
      var ul = AA.el('ul', { className: 'damage-list' });
      items.forEach(function (it, idx) {
        var li = AA.el('li', { style: { '--i': String(idx) } });
        var top = AA.el('div', { className: 'damage-list__top' });
        top.appendChild(AA.el('span', { text: [it.location, it.type].filter(Boolean).join(' · ') || 'Damage' }));
        if (it.severity) {
          var sev = String(it.severity).toLowerCase();
          top.appendChild(AA.el('span', { className: 'sev sev--' + sev, text: sev }));
        }
        li.appendChild(top);
        if (it.detail) li.appendChild(AA.el('div', { className: 'small', style: { marginTop: '4px' }, text: it.detail }));
        ul.appendChild(li);
      });
      if (cond.damageItems.length > 10) {
        ul.appendChild(AA.el('li', { text: '+' + (cond.damageItems.length - 10) + ' more' }));
      }
      right.appendChild(ul);
      requestAnimationFrame(function () { ul.classList.add('is-in'); });
    }

    layout.appendChild(right);
    card.appendChild(layout);

    requestAnimationFrame(function () {
      card.classList.add('is-in');
      window.setTimeout(function () {
        AA.fx.gauge(value, cond.score100, dot, 1100);
        AA.fx.countUp(num, 0, cond.score100, 1100);
        if (cond.tone === 'good' || cond.tone === 'excellent') {
          window.setTimeout(function () { AA.fx.sparkle(gaugeWrap); }, 900);
        }
      }, AA.prefersReducedMotion() ? 0 : 520);
    });
  }

  function renderTag(vm) {
    var card = AA.$('#result-tag');
    if (!card) return;
    clear(card);
    card.className = 'tag-label result-card-enter' + (vm.tag.relation === 'none' ? ' tag-label--empty' : '');
    card.style.setProperty('--i', '3');

    var glyph = AA.el('div', { className: 'tag-label__glyph', attrs: { 'aria-hidden': 'true' } }, AA.icon('barcode', { size: 36 }));
    card.appendChild(glyph);
    card.appendChild(AA.el('div', { className: 'micro', text: 'Tag number' }));

    var num = AA.el('div', { className: 'tag-number' });
    card.appendChild(num);

    var source = AA.el('div', { className: 'tag-source' });
    if (vm.tag.source === 'decoded') {
      source.appendChild(AA.el('div', { className: 'tag-source__badge', style: { color: 'var(--ok)' } },
        AA.icon('check', { size: 16 }), document.createTextNode('Decoded from barcode')));
      source.appendChild(AA.el('div', { className: 'tag-source__help', text: 'Read directly from the barcode — exact.' }));
    } else if (vm.tag.source === 'vision') {
      source.appendChild(AA.el('div', { className: 'tag-source__badge', style: { color: 'var(--warn)' } },
        AA.icon('info', { size: 16 }), document.createTextNode('Read from photo')));
      source.appendChild(AA.el('div', { className: 'tag-source__help', text: 'Read by AI from the printed digits — double-check it.' }));
    } else {
      source.appendChild(AA.el('div', { className: 'tag-source__badge', style: { color: 'var(--muted)' } },
        AA.icon('tag', { size: 16 }), document.createTextNode('No tag number found')));
      source.appendChild(AA.el('div', { className: 'tag-source__help', text: 'Retake the tag photo closer, in good light, with the code filling the frame.' }));
    }
    card.appendChild(source);

    if (vm.tag.relation === 'match') {
      card.appendChild(AA.el('div', { className: 'tag-agree', text: 'Barcode and visual read agree ✓' }));
    } else if (vm.tag.relation === 'mismatch') {
      card.appendChild(AA.el('div', { className: 'callout', style: { marginTop: '8px' } },
        AA.icon('alert'),
        AA.el('div', {},
          AA.el('strong', { text: 'The two reads differ — verify manually.' }),
          AA.el('div', { className: 'small', style: { marginTop: '4px' }, text: 'AI read: ' + vm.tag.detected })
        )
      ));
    }

    if (vm.tag.primary) {
      var actions = AA.el('div', { className: 'tag-actions' });
      var copyBtn = AA.el('button', {
        className: 'btn btn--ghost',
        type: 'button',
        attrs: { 'aria-label': 'Copy tag number' }
      }, AA.icon('copy'), document.createTextNode('Copy'));
      copyBtn.addEventListener('click', function () {
        AA.copy(String(vm.tag.primary)).then(function () {
          clear(copyBtn);
          copyBtn.appendChild(AA.icon('check'));
          copyBtn.appendChild(document.createTextNode('Copied'));
          AA.toast('Copied', { type: 'success' });
          window.setTimeout(function () {
            clear(copyBtn);
            copyBtn.appendChild(AA.icon('copy'));
            copyBtn.appendChild(document.createTextNode('Copy'));
          }, 1400);
        });
      });
      actions.appendChild(copyBtn);
      card.appendChild(actions);
    }

    requestAnimationFrame(function () {
      card.classList.add('is-in');
      window.setTimeout(function () {
        if (vm.tag.primary) AA.fx.odometer(num, String(vm.tag.primary));
        else num.appendChild(AA.el('span', { text: '—' }));
      }, AA.prefersReducedMotion() ? 0 : 520);
    });
  }

  function wireActions(vm) {
    var another = AA.$('#btn-another');
    var edit = AA.$('#btn-edit');
    var copyJson = AA.$('#btn-copy-json');
    var stickyAnother = AA.$('#sticky-another');

    function goAnother() {
      AA.upload.clearPhotos();
      AA.state.result = null;
      AA.state.rawResult = null;
      AA.setView('idle');
      AA.form.updateSubmitState();
    }
    function goEdit() {
      AA.setView('idle');
    }

    if (another) { another.onclick = goAnother; }
    if (stickyAnother) { stickyAnother.onclick = goAnother; }
    if (edit) { edit.onclick = goEdit; }
    if (copyJson) {
      copyJson.onclick = function () {
        var payload = vm.copyPayload;
        AA.copy(JSON.stringify(payload, null, 2)).then(function () {
          AA.toast('JSON copied', { type: 'success' });
          var iconSlot = AA.$('svg', copyJson);
          // morph
          clear(copyJson);
          copyJson.appendChild(AA.icon('check'));
          copyJson.appendChild(document.createTextNode('Copied'));
          window.setTimeout(function () {
            clear(copyJson);
            copyJson.appendChild(AA.icon('copy'));
            copyJson.appendChild(document.createTextNode('Copy JSON'));
          }, 1400);
        });
      };
    }

    var sub = AA.$('#result-customer-sub');
    if (sub) {
      sub.textContent = vm.customerId != null ? 'Customer ' + vm.customerId : '';
    }
  }

  AA.resultView = {
    render: function () {
      var vm = AA.state.result;
      if (!vm) return;
      renderPhotos(vm);
      renderHero(vm);
      renderClassification(vm);
      renderCondition(vm);
      renderTag(vm);
      wireActions(vm);
      AA.announce('Analysis complete. ' + vm.asset.name + '. Condition ' + (vm.condition ? vm.condition.grade : 'unavailable') + '.');
    }
  };

  AA.errorView = {
    render: function () {
      var err = AA.state.error;
      if (!err) return;
      var title = AA.$('#error-title');
      var msg = AA.$('#error-msg');
      var hint = AA.$('#error-hint');
      var ref = AA.$('#error-ref');
      var refVal = AA.$('#error-ref-val');
      var btnSettings = AA.$('#btn-error-settings');

      if (title) title.textContent = err.title;
      if (msg) msg.textContent = err.message;
      if (hint) {
        if (err.hint) {
          hint.hidden = false;
          clear(hint);
          hint.className = 'callout error-hint';
          hint.appendChild(AA.icon('info'));
          hint.appendChild(AA.el('div', { text: err.hint }));
        } else {
          hint.hidden = true;
        }
      }
      if (ref && refVal) {
        if (err.requestId) {
          ref.hidden = false;
          refVal.textContent = err.requestId;
        } else {
          ref.hidden = true;
        }
      }
      if (btnSettings) btnSettings.hidden = !err.showSettings;
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var retry = AA.$('#btn-error-retry');
    var edit = AA.$('#btn-error-edit');
    var settings = AA.$('#btn-error-settings');
    var copyRef = AA.$('#btn-copy-ref');

    if (retry) {
      retry.addEventListener('click', function () {
        AA.processing.retry();
      });
    }
    if (edit) {
      edit.addEventListener('click', function () { AA.setView('idle'); });
    }
    if (settings) {
      settings.addEventListener('click', function () {
        AA.setView('idle');
        window.setTimeout(function () { AA.shell.openSettings(); }, 200);
      });
    }
    if (copyRef) {
      copyRef.addEventListener('click', function () {
        var v = AA.$('#error-ref-val');
        if (v && v.textContent) {
          AA.copy(v.textContent).then(function () { AA.toast('Copied', { type: 'success' }); });
        }
      });
    }
  });
})(window.AA = window.AA || {});
