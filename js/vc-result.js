/* Validation & Catalogue result — shared cards from result.js plus the validation card. */
(function (AA) {
  'use strict';

  var baseRender = AA.resultView.render;
  var RING_R = 36;
  var RING_C = 2 * Math.PI * RING_R;
  var VERDICT = {
    match: { label: 'Match', icon: 'check', color: 'var(--ok)' },
    mismatch: { label: 'Mismatch', icon: 'x', color: 'var(--bad)' },
    skipped: { label: 'Not checked', icon: 'info', color: 'var(--g-unknown)' }
  };

  function clear(el) {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  }

  function verdictPill(verdict) {
    var meta = VERDICT[verdict] || VERDICT.skipped;
    return AA.el('span', { className: 'verdict verdict--' + verdict },
      AA.icon(meta.icon, { size: 14 }), document.createTextNode(meta.label));
  }

  function ring(percent, verdict) {
    var meta = VERDICT[verdict] || VERDICT.skipped;
    var NS = 'http://www.w3.org/2000/svg';
    var wrap = AA.el('div', {
      className: 'vc-ring',
      attrs: {
        role: 'img',
        'aria-label': percent == null ? 'Match score unavailable' : 'Match score ' + percent + ' percent'
      }
    });
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 84 84');
    svg.setAttribute('aria-hidden', 'true');
    var track = document.createElementNS(NS, 'circle');
    track.setAttribute('class', 'vc-ring__track');
    var value = document.createElementNS(NS, 'circle');
    value.setAttribute('class', 'vc-ring__value');
    [track, value].forEach(function (c) {
      c.setAttribute('cx', '42');
      c.setAttribute('cy', '42');
      c.setAttribute('r', String(RING_R));
    });
    value.setAttribute('stroke', meta.color);
    value.style.strokeDasharray = String(RING_C);
    value.style.strokeDashoffset = String(RING_C);
    svg.appendChild(track);
    svg.appendChild(value);
    wrap.appendChild(svg);

    var center = AA.el('div', { className: 'vc-ring__center' });
    var num = AA.el('span', { className: 'vc-ring__num', text: percent == null ? '—' : '0' });
    center.appendChild(num);
    center.appendChild(AA.el('span', { className: 'vc-ring__cap', text: percent == null ? 'score' : '% match' }));
    wrap.appendChild(center);

    wrap.animateIn = function () {
      if (percent == null) return;
      value.style.strokeDashoffset = String(RING_C * (1 - percent / 100));
      AA.fx.countUp(num, 0, percent, 1000);
    };
    return wrap;
  }

  function compareRow(label, value, opts) {
    opts = opts || {};
    var row = AA.el('div');
    row.appendChild(AA.el('div', { className: 'micro', text: label }));
    if (opts.node) {
      row.appendChild(opts.node);
    } else {
      var empty = value == null || value === '';
      row.appendChild(AA.el('div', {
        className: 'vc-compare__value' + (opts.mono ? ' vc-compare__value--mono' : '') + (empty ? ' vc-compare__value--empty' : ''),
        text: empty ? (opts.emptyText || 'Not provided') : String(value)
      }));
    }
    if (opts.sub) row.appendChild(AA.el('div', { className: 'vc-compare__sub', text: opts.sub }));
    return row;
  }

  /** Tag value with per-character highlighting against the tag read from the photo. */
  function tagDiff(userTag, detected) {
    var node = AA.el('div', { className: 'vc-compare__value vc-compare__value--mono vc-diff' });
    var a = String(userTag);
    var b = String(detected || '');
    for (var i = 0; i < a.length; i++) {
      var same = !!b && a[i] === b[i];
      node.appendChild(AA.el('span', { className: same ? 'is-same' : 'is-diff', text: a[i] }));
    }
    return node;
  }

  function goEditField(inputId) {
    AA.setView('idle');
    window.setTimeout(function () {
      var input = AA.$('#' + inputId);
      if (input) {
        try { input.focus({ preventScroll: false }); } catch (e) { input.focus(); }
      }
    }, AA.prefersReducedMotion() ? 0 : 420);
  }

  function skipBlock(message, inputId, cta) {
    var block = AA.el('div', { className: 'vc-skip' });
    block.appendChild(AA.el('div', { text: message }));
    var btn = AA.el('button', { className: 'btn btn--link', type: 'button', text: cta });
    btn.addEventListener('click', function () { goEditField(inputId); });
    block.appendChild(btn);
    return block;
  }

  function checkPanel(title, verdict, index) {
    var panel = AA.el('section', {
      className: 'vc-check vc-check--' + verdict,
      style: { '--i': String(index) },
      attrs: { 'aria-label': title + ': ' + (VERDICT[verdict] || VERDICT.skipped).label }
    });
    var head = AA.el('div', { className: 'vc-check__head' },
      AA.el('h4', { className: 'vc-check__title', text: title }),
      verdictPill(verdict));
    panel.appendChild(head);
    return panel;
  }

  function nameCheck(vm, rings) {
    var v = vm.validation.name;
    var panel = checkPanel('Name & description', v.verdict, 0);

    if (v.verdict === 'skipped') {
      panel.appendChild(skipBlock('Not checked — no asset name or description was provided.', 'input-assetname', 'Add a name or description'));
      return panel;
    }

    var body = AA.el('div', { className: 'vc-check__body' });
    var r = ring(v.percent, v.verdict);
    rings.push(r);
    body.appendChild(r);

    var compare = AA.el('div', { className: 'vc-compare' });
    if (vm.user.assetName) {
      compare.appendChild(compareRow('You entered', vm.user.assetName, { sub: vm.user.description || null }));
    } else {
      compare.appendChild(compareRow('You entered', vm.user.description));
    }
    compare.appendChild(compareRow('AI detected', vm.asset.name));
    body.appendChild(compare);
    panel.appendChild(body);

    if (v.reasoning) {
      var reason = AA.el('p', { className: 'vc-reason' });
      reason.appendChild(AA.el('span', { className: 'micro', text: 'Why' }));
      reason.appendChild(document.createTextNode(v.reasoning));
      panel.appendChild(reason);
    }
    return panel;
  }

  /** Soft detail box — same treatment as the Name card “Why” note. */
  function detailNote(label, copy) {
    if (!copy) return null;
    var note = AA.el('p', { className: 'vc-reason' });
    note.appendChild(AA.el('span', { className: 'micro', text: label }));
    note.appendChild(document.createTextNode(copy));
    return note;
  }

  function tagCheck(vm, rings) {
    var v = vm.validation.tag;
    var panel = checkPanel('Tag number', v.verdict, 1);
    var position = vm.tag && vm.tag.position ? vm.tag.position : null;

    if (v.verdict === 'skipped') {
      panel.appendChild(skipBlock('Not checked — no tag number was provided.', 'input-tagnumber', 'Add a tag number'));
      var skippedNote = detailNote('Tag location', position);
      if (skippedNote) panel.appendChild(skippedNote);
      return panel;
    }

    var body = AA.el('div', { className: 'vc-check__body' });
    var r = ring(v.percent, v.verdict);
    rings.push(r);
    body.appendChild(r);

    // Same hierarchy as Name & description: two primary rows, long prose in a note below.
    var compare = AA.el('div', { className: 'vc-compare' });
    var userNode = v.verdict === 'mismatch' && vm.user.tagNumber && vm.tag.primary
      ? tagDiff(vm.user.tagNumber, vm.tag.primary)
      : null;
    compare.appendChild(compareRow('You entered', vm.user.tagNumber, { mono: true, node: userNode }));
    compare.appendChild(compareRow('Read from tag', vm.tag.primary, {
      mono: true,
      emptyText: 'No tag number found'
    }));
    body.appendChild(compare);
    panel.appendChild(body);

    var locNote = detailNote('Tag location', position);
    if (locNote) panel.appendChild(locNote);
    return panel;
  }

  function summaryChip(vm) {
    var n = vm.validation.name.verdict;
    var t = vm.validation.tag.verdict;
    if (n === 'skipped' && t === 'skipped') {
      return AA.el('span', { className: 'chip chip--neutral vc-summary', text: 'Nothing to validate' });
    }
    if (n === 'mismatch' || t === 'mismatch') {
      return AA.el('span', { className: 'chip chip--bad vc-summary' }, AA.icon('alert', { size: 14 }), document.createTextNode('Needs review'));
    }
    return AA.el('span', { className: 'chip chip--ok vc-summary' }, AA.icon('check', { size: 14 }), document.createTextNode('Record verified'));
  }

  function idChip(label, value) {
    return AA.el('span', { className: 'chip chip--mono', text: label + ' ' + (value != null ? value : '—') });
  }

  function renderValidation(vm) {
    var card = AA.$('#result-validation');
    if (!card || !vm.validation) return;
    clear(card);
    card.className = 'card result-card-enter';
    card.style.setProperty('--i', '1');

    card.appendChild(AA.el('div', { className: 'card__head' },
      AA.el('span', { className: 'card__icon' }, AA.icon('shield', { size: 16 })),
      AA.el('h3', { className: 'card__title', text: 'Validation against your record' }),
      summaryChip(vm)));

    var rings = [];
    var checks = AA.el('div', { className: 'vc-checks' });
    var panels = [nameCheck(vm, rings), tagCheck(vm, rings)];
    panels.forEach(function (p) { checks.appendChild(p); });
    card.appendChild(checks);

    var ids = AA.el('div', { className: 'vc-submitted' });
    ids.appendChild(AA.el('span', { className: 'micro', text: 'Record IDs' }));
    ids.appendChild(idChip('Customer', vm.ids.customerId));
    ids.appendChild(idChip('Category ID', vm.ids.categoryId));
    ids.appendChild(idChip('Asset class ID', vm.ids.assetClassId));
    card.appendChild(ids);

    requestAnimationFrame(function () {
      card.classList.add('is-in');
      panels.forEach(function (p) { p.classList.add('is-in'); });
      window.setTimeout(function () {
        rings.forEach(function (r) { r.animateIn(); });
      }, AA.prefersReducedMotion() ? 0 : 560);
    });
  }

  function relabelHero() {
    var title = AA.$('#result-hero .card__title');
    if (title) title.textContent = 'Detected by AI';
  }

  /** "Validate another" also clears the registered-record fields; IDs are kept like Additional Asset. */
  function wrapAnother() {
    ['#btn-another', '#sticky-another'].forEach(function (sel) {
      var btn = AA.$(sel);
      if (!btn || typeof btn.onclick !== 'function') return;
      var orig = btn.onclick;
      btn.onclick = function (e) {
        if (AA.vcForm) AA.vcForm.clearRecord();
        return orig.call(btn, e);
      };
    });
  }

  AA.resultView.render = function () {
    baseRender();
    var vm = AA.state.result;
    if (!vm) return;
    relabelHero();
    renderValidation(vm);
    wrapAnother();
  };
})(window.AA = window.AA || {});
